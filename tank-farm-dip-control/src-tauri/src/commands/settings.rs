use rusqlite::params;
use std::sync::Mutex;

use crate::models::{ApplicationSetting, ToleranceSetting, UpdateToleranceRequest, UserSession};
use crate::util::{audit_log, require_roles};

fn load_tolerance(conn: &rusqlite::Connection, id: i64) -> Result<ToleranceSetting, String> {
    conn.query_row(
        "SELECT id, tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit
         FROM tolerance_settings WHERE id=?1",
        params![id],
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
    .map_err(|e| format!("Tolerance not found: {}", e))
}

fn validate_tolerance(
    comparison_type: &str,
    normal: f64,
    attention: f64,
    recheck: f64,
) -> Result<(), String> {
    if !["gross_auto", "gross_radar", "auto_radar"].contains(&comparison_type) {
        return Err("Comparison type must be gross_auto, gross_radar, or auto_radar".to_string());
    }
    if !normal.is_finite() || !attention.is_finite() || !recheck.is_finite() || normal < 0.0 {
        return Err("Tolerance values must be finite non-negative numbers".to_string());
    }
    if normal > attention || attention > recheck {
        return Err("Tolerance limits must follow Normal <= Attention <= Recheck".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn get_tolerances(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ToleranceSetting>, String> {
    let _session = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit
             FROM tolerance_settings ORDER BY comparison_type, tank_id, product_id, location, id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
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
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn update_tolerance(
    data: UpdateToleranceRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ToleranceSetting, String> {
    let session = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;

    let (tank_id, product_id, location, comparison_type, normal, attention, recheck) = if let Some(id) = data.id {
        let existing = load_tolerance(&conn, id)?;
        (
            data.tank_id.or(existing.tank_id),
            data.product_id.or(existing.product_id),
            data.location.or(existing.location),
            data.comparison_type.unwrap_or(existing.comparison_type),
            data.normal_limit.unwrap_or(existing.normal_limit),
            data.attention_limit.unwrap_or(existing.attention_limit),
            data.recheck_limit.unwrap_or(existing.recheck_limit),
        )
    } else {
        (
            data.tank_id,
            data.product_id,
            data.location,
            data.comparison_type.ok_or("Comparison type is required")?,
            data.normal_limit.ok_or("Normal limit is required")?,
            data.attention_limit.ok_or("Attention limit is required")?,
            data.recheck_limit.ok_or("Recheck limit is required")?,
        )
    };

    validate_tolerance(&comparison_type, normal, attention, recheck)?;
    let location = location.and_then(|v| {
        let trimmed = v.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });

    if let Some(tank) = tank_id {
        let exists: i64 = conn
            .query_row("SELECT COUNT(*) FROM tanks WHERE id=?1", params![tank], |row| row.get(0))
            .unwrap_or(0);
        if exists == 0 {
            return Err("Selected Tank for tolerance does not exist".to_string());
        }
    }
    if let Some(product) = product_id {
        let exists: i64 = conn
            .query_row("SELECT COUNT(*) FROM products WHERE id=?1", params![product], |row| row.get(0))
            .unwrap_or(0);
        if exists == 0 {
            return Err("Selected Product for tolerance does not exist".to_string());
        }
    }

    let id = if let Some(id) = data.id {
        conn.execute(
            "UPDATE tolerance_settings SET tank_id=?1, product_id=?2, location=?3, comparison_type=?4,
             normal_limit=?5, attention_limit=?6, recheck_limit=?7 WHERE id=?8",
            params![tank_id, product_id, location, comparison_type, normal, attention, recheck, id],
        )
        .map_err(|e| format!("Failed to update tolerance: {}", e))?;
        id
    } else {
        conn.execute(
            "INSERT INTO tolerance_settings (tank_id, product_id, location, comparison_type, normal_limit, attention_limit, recheck_limit)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![tank_id, product_id, location, comparison_type, normal, attention, recheck],
        )
        .map_err(|e| format!("Failed to create tolerance: {}", e))?;
        conn.last_insert_rowid()
    };

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "update_tolerance",
        None,
        None,
        None,
        Some(&format!("{} / {} / {}", normal, attention, recheck)),
        None,
        Some(&format!("Tolerance {} saved", comparison_type)),
    );

    load_tolerance(&conn, id)
}

#[tauri::command]
pub fn get_app_settings(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ApplicationSetting>, String> {
    let _session = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM application_settings ORDER BY key")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok(ApplicationSetting { key: row.get(0)?, value: row.get(1)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn update_app_setting(
    key: String,
    value: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ApplicationSetting, String> {
    let session = require_roles(&current_session, &["Administrator"])?;
    let key = key.trim().to_string();
    if key.is_empty() || key == "schema_version" {
        return Err("This application setting cannot be modified".to_string());
    }
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO application_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )
    .map_err(|e| format!("Failed to update setting: {}", e))?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "update_setting",
        None,
        None,
        None,
        Some(&value),
        None,
        Some(&format!("Setting updated: {}", key)),
    );
    Ok(ApplicationSetting { key, value: Some(value) })
}

#[tauri::command]
pub fn seed_sample_data(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<String, String> {
    let session = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;

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
    .map_err(|e| format!("Failed to seed reference data: {}", e))?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "seed_reference_data",
        None,
        None,
        None,
        None,
        None,
        Some("Default shifts, products and tank statuses ensured. No users, tanks, operators or tolerance limits were created."),
    );

    Ok("Default reference data ensured. Configure Tank Master, Operators and approved SOP tolerances before operational use.".to_string())
}
