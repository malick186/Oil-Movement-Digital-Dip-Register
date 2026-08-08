use crate::models::UserSession;
use std::sync::Mutex;

pub fn get_current_user_id(
    current_session: &tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<i64, String> {
    let sess = current_session.lock().map_err(|e| e.to_string())?;
    sess.as_ref()
        .map(|s| s.user_id)
        .ok_or("Not authenticated".to_string())
}

pub fn audit_log(
    conn: &rusqlite::Connection,
    user_id: i64,
    role: &str,
    action: &str,
    record_id: Option<i64>,
    tank_no: Option<&str>,
    old_value: Option<&str>,
    new_value: Option<&str>,
    reason: Option<&str>,
    remarks: Option<&str>,
) {
    if let Err(e) = conn.execute(
        "INSERT INTO audit_logs (user_id, role, action, record_id, tank_no, old_value, new_value, reason, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![user_id, role, action, record_id, tank_no, old_value, new_value, reason, remarks],
    ) {
        log::error!("Audit log insertion failed: {}", e);
    }
}
