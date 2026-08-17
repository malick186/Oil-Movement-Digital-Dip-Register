use rusqlite::params;
use std::sync::Mutex;

use crate::models::{MonthlyShiftSummary, ShiftClosing, ShiftStatus, UserSession};
use crate::util::{audit_log, require_roles};

fn today_string() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn unresolved_count(conn: &rusqlite::Connection, shift_id: i64, date: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM dip_records
         WHERE shift_id=?1 AND date=?2
           AND record_status NOT IN ('approved','rejected','superseded')",
        params![shift_id, date],
        |row| row.get(0),
    )
    .unwrap_or(0)
}

fn open_exception_count(conn: &rusqlite::Connection, shift_id: i64, date: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM exceptions e
         INNER JOIN dip_records d ON e.dip_record_id=d.id
         WHERE d.shift_id=?1 AND d.date=?2 AND e.status='open'",
        params![shift_id, date],
        |row| row.get(0),
    )
    .unwrap_or(0)
}

#[tauri::command]
pub fn get_shift_status(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ShiftStatus>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let today = today_string();

    let mut stmt = conn
        .prepare("SELECT id, name FROM shifts WHERE active=1 ORDER BY id")
        .map_err(|e| e.to_string())?;
    let shifts = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let mut statuses = Vec::new();
    for (shift_id, shift_name) in shifts {
        let total_dips: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id=?1 AND date=?2",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let pending_review: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id=?1 AND date=?2
                 AND (record_status IN ('draft','submitted','recheck_required','in_review')
                      OR review_status IN ('pending','recheck','recheck_pending','recheck_recorded'))",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let pending_approval: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM dip_records WHERE shift_id=?1 AND date=?2
                 AND (approval_status='correction_pending' OR record_status='correction_requested')",
                params![shift_id, today],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let exceptions = open_exception_count(&conn, shift_id, &today);
        let is_closed: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM shift_closings WHERE shift_id=?1 AND date=?2 AND status='closed'",
                params![shift_id, today],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .unwrap_or(false);

        statuses.push(ShiftStatus {
            shift_id,
            shift_name,
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
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let today = today_string();

    let shift_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM shifts WHERE id=?1 AND active=1",
            params![shift_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if shift_exists == 0 {
        return Err("Selected Shift is invalid or inactive".to_string());
    }

    let already_closed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM shift_closings WHERE shift_id=?1 AND date=?2 AND status='closed'",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if already_closed > 0 {
        return Err("Shift is already closed for today".to_string());
    }

    let total_dips: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE shift_id=?1 AND date=?2",
            params![shift_id, today],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if total_dips == 0 {
        return Err("Shift cannot be closed because no Dip Records have been recorded".to_string());
    }

    let pending_items = unresolved_count(&conn, shift_id, &today);
    let total_exceptions = open_exception_count(&conn, shift_id, &today);
    if pending_items > 0 || total_exceptions > 0 {
        return Err(format!(
            "Shift cannot be closed: {} unresolved Dip Record(s) and {} open exception(s) remain.",
            pending_items, total_exceptions
        ));
    }

    // Spec §28: a shift cannot close while an expected Tank has not been gauged.
    // Administrator can relax this via the 'shift_close_block_missing_tanks' setting.
    let block_missing: bool = conn
        .query_row(
            "SELECT COALESCE(value,'1') FROM application_settings WHERE key='shift_close_block_missing_tanks'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(|v| v != "0")
        .unwrap_or(true);

    if block_missing {
        let missing: Vec<String> = {
            let mut stmt = conn
                .prepare(
                    "SELECT t.tank_no FROM tanks t
                     WHERE t.active=1
                       AND NOT EXISTS (
                           SELECT 1 FROM dip_records d
                           WHERE d.tank_id=t.id AND d.shift_id=?1 AND d.date=?2
                             AND d.record_status NOT IN ('draft','rejected')
                       )
                     ORDER BY t.tank_no",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![shift_id, today], |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            rows
        };

        if !missing.is_empty() {
            let mut list = missing.join(", ");
            if list.len() > 300 {
                list.truncate(300);
                list.push_str("...");
            }
            return Err(format!(
                "Shift cannot be closed: {} expected Tank(s) have not been gauged: {}",
                missing.len(),
                list
            ));
        }
    }

    conn.execute(
        "INSERT INTO shift_closings (date, shift_id, closed_by, closing_remarks, total_dips, total_exceptions, pending_items, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 'closed')",
        params![today, shift_id, session.user_id, remarks, total_dips],
    )
    .map_err(|e| format!("Failed to close Shift: {}", e))?;
    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "close_shift",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Shift {} closed for {} after all controls cleared", shift_id, today)),
    );

    conn.query_row(
        "SELECT id, date, shift_id, closed_by, closed_at, closing_remarks, total_dips, total_exceptions, pending_items, status
         FROM shift_closings WHERE id=?1",
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
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ShiftClosing>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, date, shift_id, closed_by, closed_at, closing_remarks, total_dips, total_exceptions, pending_items, status
             FROM shift_closings ORDER BY date DESC, shift_id DESC LIMIT 100",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
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
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

/// Date-wise Shift Closing summary for the current month: one row per
/// (date, shift) that has Dip Records, with totals, approvals, pending items,
/// open exceptions and closing status.
#[tauri::command]
pub fn get_monthly_shift_summary(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<MonthlyShiftSummary>, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let month = chrono::Local::now().format("%Y-%m").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT d.date, d.shift_id, COALESCE(s.name,''), COUNT(*),
                    SUM(CASE WHEN d.record_status='approved' AND d.approval_status='approved' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN d.record_status NOT IN ('approved','rejected','superseded') THEN 1 ELSE 0 END),
                    SUM(CASE WHEN EXISTS (
                        SELECT 1 FROM exceptions e WHERE e.dip_record_id=d.id AND e.status='open'
                    ) THEN 1 ELSE 0 END),
                    EXISTS (
                        SELECT 1 FROM shift_closings sc
                        WHERE sc.date=d.date AND sc.shift_id=d.shift_id AND sc.status='closed'
                    )
             FROM dip_records d
             LEFT JOIN shifts s ON d.shift_id=s.id
             WHERE d.date LIKE ?1 || '-%'
             GROUP BY d.date, d.shift_id
             ORDER BY d.date, d.shift_id",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![month], |row| {
            Ok(MonthlyShiftSummary {
                date: row.get(0)?,
                shift_id: row.get(1)?,
                shift_name: row.get(2)?,
                total_dips: row.get(3)?,
                approved: row.get(4)?,
                pending_review: row.get(5)?,
                exceptions: row.get(6)?,
                is_closed: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}
