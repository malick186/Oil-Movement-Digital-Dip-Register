use rusqlite::Connection;
use std::path::PathBuf;

const SCHEMA_VERSION: i64 = 1;

pub fn get_db_path(_app_handle: &tauri::AppHandle) -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let data_dir = exe_dir.join("data");
    std::fs::create_dir_all(&data_dir).expect("failed to create data dir");
    data_dir.join("tank_farm_dip.db")
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app_handle);
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    run_migrations(&conn)?;

    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS application_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT
        )",
        [],
    )
    .map_err(|e| format!("Migration error: {}", e))?;

    let current_version: i64 = conn
        .query_row(
            "SELECT COALESCE(CAST(value AS INTEGER), 0) FROM application_settings WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if current_version < SCHEMA_VERSION {
        apply_migration_v1(conn)?;
    }

    Ok(())
}

fn apply_migration_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'operator',
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            code TEXT,
            category TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS tank_statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            allow_custom INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tanks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_no TEXT UNIQUE NOT NULL,
            location TEXT,
            tank_farm TEXT,
            normal_product TEXT,
            current_product TEXT,
            reference_point TEXT,
            tank_type TEXT,
            roof_type TEXT,
            safe_fill_height REAL,
            min_operating_level REAL,
            ref_gauge_height REAL,
            datum_height REAL,
            working_capacity REAL,
            radar_available INTEGER NOT NULL DEFAULT 0,
            auto_dip_available INTEGER NOT NULL DEFAULT 0,
            water_dip_applicable INTEGER NOT NULL DEFAULT 0,
            sludge_dip_applicable INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            remarks TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            designation TEXT,
            location TEXT,
            shift_group TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS dip_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_number TEXT UNIQUE NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            shift_id INTEGER NOT NULL REFERENCES shifts(id),
            tank_id INTEGER NOT NULL REFERENCES tanks(id),
            product_id INTEGER NOT NULL REFERENCES products(id),
            reference_point_snapshot TEXT,
            gross_dip_mm REAL,
            auto_dip_mm REAL,
            radar_dip_mm REAL,
            water_dip_mm REAL,
            sludge_dip_mm REAL,
            temperature REAL,
            temperature_unit TEXT DEFAULT 'C',
            density REAL,
            tank_status_id INTEGER REFERENCES tank_statuses(id),
            custom_tank_status TEXT,
            operator_id INTEGER NOT NULL REFERENCES operators(id),
            remarks TEXT,
            gross_auto_difference REAL,
            gross_radar_difference REAL,
            auto_radar_difference REAL,
            entered_by INTEGER NOT NULL REFERENCES users(id),
            entered_at TEXT NOT NULL DEFAULT (datetime('now')),
            review_status TEXT NOT NULL DEFAULT 'pending',
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at TEXT,
            approval_status TEXT NOT NULL DEFAULT 'pending',
            approved_by INTEGER REFERENCES users(id),
            approved_at TEXT,
            record_status TEXT NOT NULL DEFAULT 'draft'
        );

        CREATE TABLE IF NOT EXISTS dip_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dip_record_id INTEGER NOT NULL REFERENCES dip_records(id),
            reviewer_id INTEGER NOT NULL REFERENCES users(id),
            review_action TEXT NOT NULL,
            review_remarks TEXT,
            reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS dip_rechecks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_dip_id INTEGER NOT NULL REFERENCES dip_records(id),
            recheck_dip_id INTEGER REFERENCES dip_records(id),
            recheck_operator_id INTEGER NOT NULL REFERENCES operators(id),
            recheck_remarks TEXT,
            reviewer_id INTEGER REFERENCES users(id),
            final_decision TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS dip_corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dip_record_id INTEGER NOT NULL REFERENCES dip_records(id),
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT NOT NULL,
            reason TEXT,
            requested_by INTEGER NOT NULL REFERENCES users(id),
            approved_by INTEGER REFERENCES users(id),
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS shift_closings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            shift_id INTEGER NOT NULL REFERENCES shifts(id),
            closed_by INTEGER NOT NULL REFERENCES users(id),
            closed_at TEXT NOT NULL DEFAULT (datetime('now')),
            closing_remarks TEXT,
            total_dips INTEGER NOT NULL DEFAULT 0,
            total_exceptions INTEGER NOT NULL DEFAULT 0,
            pending_items INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'closed'
        );

        CREATE TABLE IF NOT EXISTS tolerance_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER REFERENCES tanks(id),
            product_id INTEGER REFERENCES products(id),
            location TEXT,
            comparison_type TEXT NOT NULL,
            normal_limit REAL NOT NULL,
            attention_limit REAL NOT NULL,
            recheck_limit REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exceptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dip_record_id INTEGER NOT NULL REFERENCES dip_records(id),
            tank_id INTEGER NOT NULL REFERENCES tanks(id),
            exception_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'info',
            actual_value TEXT,
            expected_tolerance TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            resolution TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            user_id INTEGER REFERENCES users(id),
            role TEXT,
            action TEXT NOT NULL,
            record_id INTEGER REFERENCES dip_records(id),
            tank_no TEXT,
            old_value TEXT,
            new_value TEXT,
            reason TEXT,
            remarks TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_dip_records_date ON dip_records(date);
        CREATE INDEX IF NOT EXISTS idx_dip_records_tank_id ON dip_records(tank_id);
        CREATE INDEX IF NOT EXISTS idx_dip_records_shift_id ON dip_records(shift_id);
        CREATE INDEX IF NOT EXISTS idx_dip_records_review_status ON dip_records(review_status);
        CREATE INDEX IF NOT EXISTS idx_dip_records_approval_status ON dip_records(approval_status);
        CREATE INDEX IF NOT EXISTS idx_dip_records_record_status ON dip_records(record_status);
        CREATE INDEX IF NOT EXISTS idx_dip_records_operator_id ON dip_records(operator_id);
        CREATE INDEX IF NOT EXISTS idx_dip_reviews_dip_record_id ON dip_reviews(dip_record_id);
        CREATE INDEX IF NOT EXISTS idx_dip_rechecks_original_dip_id ON dip_rechecks(original_dip_id);
        CREATE INDEX IF NOT EXISTS idx_dip_corrections_dip_record_id ON dip_corrections(dip_record_id);
        CREATE INDEX IF NOT EXISTS idx_exceptions_dip_record_id ON exceptions(dip_record_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
        CREATE INDEX IF NOT EXISTS idx_tanks_tank_no ON tanks(tank_no);
        CREATE INDEX IF NOT EXISTS idx_tanks_location ON tanks(location);
        CREATE INDEX IF NOT EXISTS idx_operators_employee_id ON operators(employee_id);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        ",
    )
    .map_err(|e| format!("Migration V1 error: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value) VALUES ('schema_version', ?1)",
        [SCHEMA_VERSION.to_string()],
    )
    .map_err(|e| format!("Failed to set schema version: {}", e))?;

    Ok(())
}
