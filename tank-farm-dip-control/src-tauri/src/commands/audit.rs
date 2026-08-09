use std::sync::Mutex;

use crate::models::{AuditLog, AuditLogFilter, UserSession};
use crate::util::require_roles;

#[tauri::command]
pub fn get_audit_logs(
    filters: AuditLogFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<AuditLog>, String> {
    let _session = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT id,timestamp,user_id,role,action,record_id,tank_no,old_value,new_value,reason,remarks
         FROM audit_logs WHERE 1=1",
    );
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(user_id) = filters.user_id {
        sql.push_str(&format!(" AND user_id=?{}", values.len() + 1));
        values.push(Box::new(user_id));
    }
    if let Some(action) = filters.action {
        sql.push_str(&format!(" AND action=?{}", values.len() + 1));
        values.push(Box::new(action));
    }
    if let Some(date_from) = filters.date_from {
        sql.push_str(&format!(" AND timestamp>=?{}", values.len() + 1));
        values.push(Box::new(date_from));
    }
    if let Some(date_to) = filters.date_to {
        sql.push_str(&format!(" AND timestamp<=?{}", values.len() + 1));
        values.push(Box::new(date_to));
    }
    if let Some(record_id) = filters.record_id {
        sql.push_str(&format!(" AND record_id=?{}", values.len() + 1));
        values.push(Box::new(record_id));
    }

    sql.push_str(" ORDER BY timestamp DESC,id DESC");
    let limit = filters.limit.unwrap_or(100).clamp(1, 1000);
    let offset = filters.offset.unwrap_or(0).max(0);
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", values.len() + 1, values.len() + 2));
    values.push(Box::new(limit));
    values.push(Box::new(offset));
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let logs = stmt
        .query_map(refs.as_slice(), |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                user_id: row.get(2)?,
                role: row.get(3)?,
                action: row.get(4)?,
                record_id: row.get(5)?,
                tank_no: row.get(6)?,
                old_value: row.get(7)?,
                new_value: row.get(8)?,
                reason: row.get(9)?,
                remarks: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(logs)
}
