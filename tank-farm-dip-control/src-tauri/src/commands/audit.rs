use std::sync::Mutex;

use crate::models::{AuditLog, AuditLogFilter};

#[tauri::command]
pub fn get_audit_logs(
    filters: AuditLogFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<AuditLog>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT id, timestamp, user_id, role, action, record_id, tank_no, old_value, new_value, reason, remarks
         FROM audit_logs WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(user_id) = filters.user_id {
        sql.push_str(&format!(" AND user_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(user_id));
    }
    if let Some(ref action) = filters.action {
        sql.push_str(&format!(" AND action = ?{}", param_values.len() + 1));
        param_values.push(Box::new(action.clone()));
    }
    if let Some(ref date_from) = filters.date_from {
        sql.push_str(&format!(" AND timestamp >= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_from.clone()));
    }
    if let Some(ref date_to) = filters.date_to {
        sql.push_str(&format!(" AND timestamp <= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_to.clone()));
    }
    if let Some(record_id) = filters.record_id {
        sql.push_str(&format!(" AND record_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(record_id));
    }

    sql.push_str(" ORDER BY timestamp DESC");

    let limit = filters.limit.unwrap_or(100);
    let offset = filters.offset.unwrap_or(0);
    sql.push_str(&format!(
        " LIMIT {} OFFSET {}",
        param_values.len() + 1,
        param_values.len() + 2
    ));
    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let logs = stmt
        .query_map(param_refs.as_slice(), |row| {
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

    drop(stmt);
    Ok(logs)
}
