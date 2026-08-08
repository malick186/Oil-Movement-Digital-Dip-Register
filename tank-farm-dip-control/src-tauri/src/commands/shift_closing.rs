use rusqlite::params;
use std::sync::Mutex;

use crate::models::{ShiftClosing, ShiftStatus, UserSession};
use crate::util::{audit_log, get_current_user_id};

#[tauri::command]
pub fn get_shift_status(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<ShiftStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT id, name, start_time, end_time, active FROM shifts WHERE active = 1 ORDER BY id",
        )
        .map_err(|e| e.to_string())?;

    let shifts: Vec<(i64, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);

    let mut statuses = Vec::new();
    for (shift_id, shift_name) in &shifts {
        let total_dips: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id = ?1 AND date = ?2",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let pending_review: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id = ?1 AND date = ?2 AND review_status = 'pending' AND record_status IN ('submitted', 'in_review')",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let pending_approval: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id = ?1 AND date = ?2 AND approval_status = 'pending' AND review_status = 'approved'",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let exceptions: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM exceptions e INNER JOIN dip_records d ON e.dip_record_id = d.id
                 WHERE d.shift_id = ?1 AND d.date = ?2 AND e.status = 'open'",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let is_closed: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM shift_closings WHERE shift_id = ?1 AND date = ?2 AND status = 'closed'",
                params![shift_id, today],
                |row| row.get::<_, i64>(0),
            )
            .map(|c| c > 0)
            .unwrap_or(false);

        statuses.push(ShiftStatus {
            shift_id: *shift_id,
            shift_name: shift_name.clone(),
            total_dips,
            pending_review,
            pending_approval,
            exceptions,
            is_closed,
        });
    }

    Ok(statuses)
}

#[tauri::command]
pub fn close_shift(
    shift_id: i64,
    remarks: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ShiftClosing, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let already_closed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM shift_closings WHERE shift_id = ?1 AND date = ?2 AND status = 'closed'",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if already_closed > 0 {
        return Err("Shift already closed for today".to_string());
    }

    let total_dips: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE shift_id = ?1 AND date = ?2",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_exceptions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM exceptions e INNER JOIN dip_records d ON e.dip_record_id = d.id
             WHERE d.shift_id = ?1 AND d.date = ?2 AND e.status = 'open'",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let pending_items: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE shift_id = ?1 AND date = ?2 AND record_status NOT IN ('approved', 'rejected')",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO shift_closings (date, shift_id, closed_by, closing_remarks, total_dips, total_exceptions, pending_items, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'closed')",
        params![today, shift_id, user_id, remarks, total_dips, total_exceptions, pending_items],
    )
    .map_err(|e| format!("Failed to close shift: {}", e))?;

    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        user_id,
        &user_role,
        "close_shift",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Shift {} closed for {}", shift_id, today)),
    );

    conn.query_row(
        "SELECT id, date, shift_id, closed_by, closed_at, closing_remarks, total_dips, total_exceptions, pending_items, status
         FROM shift_closings WHERE id = ?1",
        params![id],
        |row| {
            Ok(ShiftClosing {
                id: row.get(0)?,
                date: row.get(1)?,
                shift_id: row.get(2)?,
                closed_by: row.get(3)?,
                closed_at: row.get(4)?,
                closing_remarks: row.get(5)?,
                total_dips: row.get(6)?,
                total_exceptions: row.get(7)?,
                pending_items: row.get(8)?,
                status: row.get(9)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_shift_closing_history(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<ShiftClosing>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, date, shift_id, closed_by, closed_at, closing_remarks, total_dips, total_exceptions, pending_items, status
             FROM shift_closings ORDER BY date DESC, shift_id DESC LIMIT 100",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(ShiftClosing {
                id: row.get(0)?,
                date: row.get(1)?,
                shift_id: row.get(2)?,
                closed_by: row.get(3)?,
                closed_at: row.get(4)?,
                closing_remarks: row.get(5)?,
                total_dips: row.get(6)?,
                total_exceptions: row.get(7)?,
                pending_items: row.get(8)?,
                status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}
