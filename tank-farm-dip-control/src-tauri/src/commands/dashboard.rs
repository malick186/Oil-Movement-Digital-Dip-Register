use rusqlite::params;
use serde::Serialize;
use std::sync::Mutex;

use crate::models::{DashboardStats, UserSession};
use crate::util::require_roles;

#[derive(Debug, Clone, Serialize)]
pub struct AttentionItem {
    pub dip_id: i64,
    pub tank_id: i64,
    pub record_number: String,
    pub tank_no: String,
    pub product_name: String,
    pub gross_dip_mm: Option<f64>,
    pub auto_dip_mm: Option<f64>,
    pub radar_dip_mm: Option<f64>,
    pub gross_auto_difference: Option<f64>,
    pub gross_radar_difference: Option<f64>,
    pub tank_status_name: String,
    pub review_status: String,
    pub last_gauged: String,
}

#[tauri::command]
pub fn get_attention_list(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<AttentionItem>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT dr.id, dr.tank_id, dr.record_number, COALESCE(t.tank_no,''), COALESCE(p.name,''),
                dr.gross_dip_mm, dr.auto_dip_mm, dr.radar_dip_mm,
                dr.gross_auto_difference, dr.gross_radar_difference,
                COALESCE(ts.name,''), dr.review_status,
                COALESCE(dr.date || ' ' || dr.time,'')
         FROM dip_records dr
         LEFT JOIN tanks t ON dr.tank_id=t.id
         LEFT JOIN products p ON dr.product_id=p.id
         LEFT JOIN tank_statuses ts ON dr.tank_status_id=ts.id
         WHERE dr.record_status IN ('submitted','in_review','recheck_required','correction_requested')
            OR EXISTS (SELECT 1 FROM exceptions e WHERE e.dip_record_id=dr.id AND e.status='open')
         ORDER BY dr.date DESC,dr.time DESC
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(AttentionItem {
            dip_id: row.get(0)?,
            tank_id: row.get(1)?,
            record_number: row.get(2)?,
            tank_no: row.get(3)?,
            product_name: row.get(4)?,
            gross_dip_mm: row.get(5)?,
            auto_dip_mm: row.get(6)?,
            radar_dip_mm: row.get(7)?,
            gross_auto_difference: row.get(8)?,
            gross_radar_difference: row.get(9)?,
            tank_status_name: row.get(10)?,
            review_status: row.get(11)?,
            last_gauged: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn get_dashboard_stats(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DashboardStats, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let active_tanks: i64 = conn.query_row("SELECT COUNT(*) FROM tanks WHERE active=1", [], |row| row.get(0)).unwrap_or(0);
    let dips_completed: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dip_records WHERE date=?1 AND record_status IN ('submitted','approved','rejected','superseded','in_review','recheck_required','correction_requested')",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let dips_pending: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dip_records WHERE date=?1 AND record_status='draft'",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let awaiting_review: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dip_records WHERE date=?1 AND record_status='submitted' AND review_status IN ('pending','recheck_pending')",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let recheck_required: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dip_records WHERE date=?1 AND record_status='recheck_required'",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let abnormal_diff: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT e.dip_record_id) FROM exceptions e INNER JOIN dip_records d ON e.dip_record_id=d.id WHERE d.date=?1 AND e.status='open'",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let approved: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dip_records WHERE date=?1 AND approval_status='approved' AND record_status='approved'",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
    let shift_closing_status: String = conn.query_row(
        "SELECT COALESCE(status,'open') FROM shift_closings WHERE date=?1 ORDER BY id DESC LIMIT 1",
        params![today], |row| row.get(0)
    ).unwrap_or_else(|_| "open".to_string());

    Ok(DashboardStats {
        active_tanks,
        dips_completed,
        dips_pending,
        awaiting_review,
        recheck_required,
        abnormal_diff,
        approved,
        shift_closing_status,
    })
}
