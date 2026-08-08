use rusqlite::params;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

use crate::models::UserSession;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionRecord {
    pub id: i64,
    pub dip_record_id: i64,
    pub tank_id: i64,
    pub exception_type: String,
    pub severity: String,
    pub actual_value: Option<String>,
    pub expected_tolerance: Option<String>,
    pub status: String,
    pub resolution: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionFilter {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub fn list_exceptions(
    filters: ExceptionFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<ExceptionRecord>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT id, dip_record_id, tank_id, exception_type, severity,
                actual_value, expected_tolerance, status, resolution, created_at, resolved_at
         FROM exceptions WHERE 1=1"
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref status) = filters.status {
        sql.push_str(&format!(" AND status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(status.clone()));
    }
    if let Some(ref severity) = filters.severity {
        sql.push_str(&format!(" AND severity = ?{}", param_values.len() + 1));
        param_values.push(Box::new(severity.clone()));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let limit = filters.limit.unwrap_or(100);
    let offset = filters.offset.unwrap_or(0);
    sql.push_str(&format!(
        " LIMIT {} OFFSET {}",
        param_values.len() + 1,
        param_values.len() + 2
    ));
    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let records = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(ExceptionRecord {
                id: row.get(0)?,
                dip_record_id: row.get(1)?,
                tank_id: row.get(2)?,
                exception_type: row.get(3)?,
                severity: row.get(4)?,
                actual_value: row.get(5)?,
                expected_tolerance: row.get(6)?,
                status: row.get(7)?,
                resolution: row.get(8)?,
                created_at: row.get(9)?,
                resolved_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    Ok(records)
}

#[tauri::command]
pub fn resolve_exception(
    id: i64,
    resolution: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    _current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ExceptionRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    conn.execute(
        "UPDATE exceptions SET status = 'resolved', resolution = ?1, resolved_at = ?2 WHERE id = ?3",
        params![resolution, now, id],
    )
    .map_err(|e| format!("Failed to resolve exception: {}", e))?;

    conn.query_row(
        "SELECT id, dip_record_id, tank_id, exception_type, severity,
                actual_value, expected_tolerance, status, resolution, created_at, resolved_at
         FROM exceptions WHERE id = ?1",
        params![id],
        |row| {
            Ok(ExceptionRecord {
                id: row.get(0)?,
                dip_record_id: row.get(1)?,
                tank_id: row.get(2)?,
                exception_type: row.get(3)?,
                severity: row.get(4)?,
                actual_value: row.get(5)?,
                expected_tolerance: row.get(6)?,
                status: row.get(7)?,
                resolution: row.get(8)?,
                created_at: row.get(9)?,
                resolved_at: row.get(10)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
