use rusqlite::params;
use std::sync::Mutex;

use crate::models::UserSession;
use crate::util::audit_log;

#[tauri::command]
pub fn is_bootstrap_required(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count == 0)
}

#[tauri::command]
pub fn bootstrap_admin(
    username: String,
    full_name: String,
    password: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<UserSession, String> {
    let username = username.trim().to_string();
    let full_name = full_name.trim().to_string();

    if username.is_empty() || full_name.is_empty() {
        return Err("Username and full name are required".to_string());
    }
    if password.len() < 8 {
        return Err("Administrator password must be at least 8 characters".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if count != 0 {
        return Err("First-run setup has already been completed".to_string());
    }

    let password_hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to secure administrator password: {}", e))?;

    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role, active)
         VALUES (?1, ?2, ?3, 'Administrator', 1)",
        params![username, password_hash, full_name],
    )
    .map_err(|e| format!("Failed to create administrator: {}", e))?;

    let user_id = conn.last_insert_rowid();

    // Seed only minimum reference data required to start the application.
    // All operational master data remains editable by the Administrator.
    conn.execute_batch(
        "INSERT OR IGNORE INTO shifts (name, start_time, end_time, active) VALUES
         ('Morning', '06:00', '14:00', 1),
         ('Night', '22:00', '06:00', 1);

         INSERT OR IGNORE INTO products (name, code, category, active) VALUES
         ('Crude', 'CRUDE', 'Crude', 1),
         ('HSFO', 'HSFO', 'Fuel Oil', 1),
         ('HSD', 'HSD', 'Diesel', 1),
         ('MS', 'MS', 'Motor Spirit', 1),
         ('Naphtha', 'NAP', 'Naphtha', 1);

         INSERT OR IGNORE INTO tank_statuses (name, display_order, active, allow_custom) VALUES
         ('Static', 1, 1, 0),
         ('Receiving', 2, 1, 0),
         ('Delivering', 3, 1, 0),
         ('Settling', 4, 1, 0),
         ('Inter Tank Transfer', 5, 1, 0),
         ('Export', 6, 1, 0),
         ('Import', 7, 1, 0),
         ('Under Maintenance', 8, 1, 0),
         ('Isolated', 9, 1, 0),
         ('Out of Service', 10, 1, 0),
         ('Circulation', 11, 1, 0),
         ('Mixing', 12, 1, 0),
         ('Other', 99, 1, 1);"
    )
    .map_err(|e| format!("Failed to create initial reference data: {}", e))?;

    audit_log(
        &conn,
        user_id,
        "Administrator",
        "bootstrap_admin",
        None,
        None,
        None,
        None,
        None,
        Some("First-run administrator created"),
    );

    let session = UserSession {
        user_id,
        username,
        full_name,
        role: "Administrator".to_string(),
    };

    let mut sess = current_session.lock().map_err(|e| e.to_string())?;
    *sess = Some(session.clone());

    Ok(session)
}
