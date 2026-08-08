use rusqlite::params;
use std::sync::Mutex;

use crate::models::{ApplicationSetting, ToleranceSetting, UpdateToleranceRequest, UserSession};
use crate::util::{audit_log, get_current_user_id};

#[tauri::command]
pub fn get_tolerances(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<ToleranceSetting>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit
             FROM tolerance_settings ORDER BY comparison_type, id",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(ToleranceSetting {
                id: row.get(0)?,
                tank_id: row.get(1)?,
                product_id: row.get(2)?,
                location: row.get(3)?,
                comparison_type: row.get(4)?,
                normal_limit: row.get(5)?,
                attention_limit: row.get(6)?,
                recheck_limit: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn update_tolerance(
    data: UpdateToleranceRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ToleranceSetting, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let tolerance_id = if let Some(id) = data.id {
        conn.execute(
            "UPDATE tolerance_settings SET tank_id=?1, product_id=?2, location=?3, comparison_type=?4,
             normal_limit=?5, attention_limit=?6, recheck_limit=?7 WHERE id=?8",
            params![
                data.tank_id,
                data.product_id,
                data.location,
                data.comparison_type,
                data.normal_limit,
                data.attention_limit,
                data.recheck_limit,
                id,
            ],
        )
        .map_err(|e| format!("Failed to update tolerance: {}", e))?;
        id
    } else {
        conn.execute(
            "INSERT INTO tolerance_settings (tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                data.tank_id,
                data.product_id,
                data.location,
                data.comparison_type,
                data.normal_limit,
                data.attention_limit,
                data.recheck_limit,
            ],
        )
        .map_err(|e| format!("Failed to create tolerance: {}", e))?;
        conn.last_insert_rowid()
    };

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_tolerance",
        None,
        None,
        None,
        None,
        None,
        Some(&format!(
            "Tolerance updated: {} (normal: {}, attention: {}, recheck: {})",
            data.comparison_type, data.normal_limit, data.attention_limit, data.recheck_limit
        )),
    );

    conn.query_row(
        "SELECT id, tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit
         FROM tolerance_settings WHERE id = ?1",
        params![tolerance_id],
        |row| {
            Ok(ToleranceSetting {
                id: row.get(0)?,
                tank_id: row.get(1)?,
                product_id: row.get(2)?,
                location: row.get(3)?,
                comparison_type: row.get(4)?,
                normal_limit: row.get(5)?,
                attention_limit: row.get(6)?,
                recheck_limit: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_settings(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<ApplicationSetting>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM application_settings ORDER BY key")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(ApplicationSetting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn update_app_setting(
    key: String,
    value: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ApplicationSetting, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "INSERT OR REPLACE INTO application_settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("Failed to update setting: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_setting",
        None,
        None,
        None,
        Some(&value),
        None,
        Some(&format!("Setting updated: {}", key)),
    );

    Ok(ApplicationSetting {
        key,
        value: Some(value),
    })
}

#[tauri::command]
pub fn seed_sample_data(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .unwrap_or(0);

    if user_count > 0 {
        return Err("Database already has data. Seed aborted.".to_string());
    }

    let admin_hash =
        bcrypt::hash("admin123", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    let supervisor_hash =
        bcrypt::hash("super123", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    let operator_hash =
        bcrypt::hash("oper123", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES
         ('admin', ?1, 'Administrator', 'Administrator'),
         ('supervisor', ?2, 'Shift Supervisor', 'Shift Supervisor'),
         ('incharge', ?2, 'Shift In-Charge', 'Shift In-Charge'),
         ('operator1', ?3, 'Field Operator One', 'Field Operator'),
         ('operator2', ?3, 'Field Operator Two', 'Field Operator')",
        params![admin_hash, supervisor_hash, operator_hash],
    )
    .map_err(|e| e.to_string())?;

    conn.execute_batch(
        "INSERT INTO locations (name) VALUES ('Main Terminal'), ('North Farm'), ('South Farm'), ('Jetty Area');

         INSERT INTO shifts (name, start_time, end_time) VALUES
         ('Morning', '06:00', '14:00'),
         ('Afternoon', '14:00', '22:00'),
         ('Night', '22:00', '06:00');

         INSERT INTO products (name, code, category) VALUES
         ('Gasoline 91', 'G91', 'Gasoline'),
         ('Gasoline 95', 'G95', 'Gasoline'),
         ('Diesel', 'DSL', 'Diesel'),
         ('Jet A-1', 'JET', 'Jet Fuel'),
         ('Crude Oil', 'CRD', 'Crude'),
         ('Naphtha', 'NAP', 'Naphtha');

         INSERT INTO tank_statuses (name, display_order, allow_custom) VALUES
         ('Operating', 1, 0),
         ('Standby', 2, 0),
         ('Under Maintenance', 3, 0),
         ('Cleaning', 4, 0),
         ('Receiving', 5, 0),
         ('Delivering', 6, 0),
         ('Idle', 7, 0),
         ('Custom', 8, 1);

         INSERT INTO operators (employee_id, name, designation, location, shift_group) VALUES
         ('EMP001', 'John Smith', 'Senior Operator', 'Main Terminal', 'Morning'),
         ('EMP002', 'Mike Johnson', 'Operator', 'Main Terminal', 'Morning'),
         ('EMP003', 'David Wilson', 'Senior Operator', 'North Farm', 'Afternoon'),
         ('EMP004', 'Robert Brown', 'Operator', 'South Farm', 'Night'),
         ('EMP005', 'James Davis', 'Operator', 'Jetty Area', 'Morning');
         ",
    )
    .map_err(|e| e.to_string())?;

    conn.execute_batch(
        "INSERT INTO tanks (tank_no, location, tank_farm, normal_product, current_product, reference_point, tank_type, roof_type,
         safe_fill_height, min_operating_level, ref_gauge_height, datum_height, working_capacity,
         radar_available, auto_dip_available, water_dip_applicable, sludge_dip_applicable) VALUES
         ('T-101', 'Main Terminal', 'Farm A', 'Gasoline 91', 'Gasoline 91', 'RP-A1', 'Fixed Roof', 'Cone Roof', 12.5, 0.5, 13.0, 0.2, 5000.0, 1, 1, 1, 0),
         ('T-102', 'Main Terminal', 'Farm A', 'Gasoline 95', 'Gasoline 95', 'RP-A2', 'Fixed Roof', 'Dome Roof', 12.5, 0.5, 13.0, 0.2, 5000.0, 1, 1, 1, 0),
         ('T-103', 'Main Terminal', 'Farm A', 'Diesel', 'Diesel', 'RP-A3', 'Fixed Roof', 'Cone Roof', 12.5, 0.5, 13.0, 0.2, 5000.0, 1, 0, 1, 1),
         ('T-201', 'North Farm', 'Farm B', 'Jet A-1', 'Jet A-1', 'RP-B1', 'Floating Roof', 'External', 15.0, 0.8, 15.8, 0.3, 10000.0, 1, 1, 0, 0),
         ('T-202', 'North Farm', 'Farm B', 'Crude Oil', 'Crude Oil', 'RP-B2', 'Floating Roof', 'Internal', 15.0, 1.0, 16.0, 0.5, 10000.0, 0, 0, 0, 1),
         ('T-301', 'South Farm', 'Farm C', 'Naphtha', 'Naphtha', 'RP-C1', 'Fixed Roof', 'Cone Roof', 10.0, 0.4, 10.5, 0.15, 3000.0, 0, 0, 0, 0),
         ('T-302', 'South Farm', 'Farm C', 'Diesel', 'Diesel', 'RP-C2', 'Fixed Roof', 'Dome Roof', 10.0, 0.4, 10.5, 0.15, 3000.0, 1, 1, 1, 0),
         ('T-401', 'Jetty Area', 'Farm D', 'Gasoline 91', 'Gasoline 91', 'RP-D1', 'Floating Roof', 'External', 18.0, 1.2, 19.0, 0.4, 15000.0, 1, 1, 1, 0),
         ('T-402', 'Jetty Area', 'Farm D', 'Diesel', 'Diesel', 'RP-D2', 'Floating Roof', 'External', 18.0, 1.2, 19.0, 0.4, 15000.0, 1, 0, 1, 1),
         ('T-403', 'Jetty Area', 'Farm D', 'Crude Oil', 'Crude Oil', 'RP-D3', 'Floating Roof', 'Internal', 18.0, 1.5, 19.5, 0.6, 15000.0, 0, 0, 0, 1);
         ",
    )
    .map_err(|e| e.to_string())?;

    conn.execute_batch(
        "INSERT INTO tolerance_settings (comparison_type, normal_limit, attention_limit, recheck_limit) VALUES
         ('gross_auto', 3.0, 5.0, 10.0),
         ('gross_radar', 3.0, 5.0, 10.0),
         ('auto_radar', 2.0, 4.0, 8.0);
         ",
    )
    .map_err(|e| e.to_string())?;

    Ok("Sample data seeded successfully".to_string())
}
