use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::models::UserSession;
use crate::util::{audit_log, require_roles};

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

fn query_exception(row: &rusqlite::Row) -> rusqlite::Result<ExceptionRecord> {
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
}

#[tauri::command]
pub fn list_exceptions(
    filters: ExceptionFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ExceptionRecord>, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sql = String::from(
        "SELECT id,dip_record_id,tank_id,exception_type,severity,actual_value,expected_tolerance,status,resolution,created_at,resolved_at
         FROM exceptions WHERE 1=1",
    );
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(status) = filters.status {
        sql.push_str(&format!(" AND status=?{}", values.len() + 1));
        values.push(Box::new(status));
    }
    if let Some(severity) = filters.severity {
        sql.push_str(&format!(" AND severity=?{}", values.len() + 1));
        values.push(Box::new(severity));
    }
    sql.push_str(" ORDER BY created_at DESC,id DESC");
    let limit = filters.limit.unwrap_or(100).clamp(1, 1000);
    let offset = filters.offset.unwrap_or(0).max(0);
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", values.len() + 1, values.len() + 2));
    values.push(Box::new(limit));
    values.push(Box::new(offset));
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(refs.as_slice(), query_exception)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn resolve_exception(
    id: i64,
    resolution: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ExceptionRecord, String> {
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let resolution = resolution.trim().to_string();
    if resolution.is_empty() {
        return Err("Exception resolution remarks are required".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    let current: ExceptionRecord = conn
        .query_row(
            "SELECT id,dip_record_id,tank_id,exception_type,severity,actual_value,expected_tolerance,status,resolution,created_at,resolved_at
             FROM exceptions WHERE id=?1",
            params![id],
            query_exception,
        )
        .map_err(|_| "Exception not found".to_string())?;
    if current.status != "open" {
        return Err("Exception is already resolved".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    conn.execute(
        "UPDATE exceptions SET status='resolved',resolution=?1,resolved_at=?2 WHERE id=?3 AND status='open'",
        params![resolution, now, id],
    )
    .map_err(|e| format!("Failed to resolve exception: {}", e))?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "resolve_exception",
        Some(current.dip_record_id),
        None,
        Some("open"),
        Some("resolved"),
        Some(&resolution),
        Some(&format!("Resolved {} exception", current.exception_type)),
    );

    conn.query_row(
        "SELECT id,dip_record_id,tank_id,exception_type,severity,actual_value,expected_tolerance,status,resolution,created_at,resolved_at
         FROM exceptions WHERE id=?1",
        params![id],
        query_exception,
    )
    .map_err(|e| e.to_string())
}
