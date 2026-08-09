use rusqlite::params;
use std::sync::Mutex;
use serde::Serialize;

use crate::models::DashboardStats;

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
) -> Result<Vec<AttentionItem>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let max_attention: f64 = conn
        .query_row(
            "SELECT COALESCE(MIN(attention_limit), 5.0) FROM tolerance_settings",
            [],
            |row| row.get(0),
        )
        .unwrap_or(5.0);

    let mut stmt = conn.prepare(
        "SELECT dr.id, COALESCE(dr.tank_id, 0), dr.record_number, COALESCE(t.tank_no, ''), COALESCE(p.name, ''),
                dr.gross_dip_mm, dr.auto_dip_mm, dr.radar_dip_mm,
                dr.gross_auto_difference, dr.gross_radar_difference,
                COALESCE(ts.name, ''), dr.review_status,
                COALESCE(dr.date || ' ' || dr.time, '')
         FROM dip_records dr
         LEFT JOIN tanks t ON dr.tank_id = t.id
         LEFT JOIN products p ON dr.product_id = p.id
         LEFT JOIN tank_statuses ts ON dr.tank_status_id = ts.id
         WHERE dr.record_status IN ('submitted', 'in_review')
            OR ABS(COALESCE(dr.gross_auto_difference, 0)) > ?1
            OR ABS(COALESCE(dr.gross_radar_difference, 0)) > ?1
         ORDER BY dr.date DESC, dr.time DESC
         LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map(params![max_attention], |row| {
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

    drop(stmt);
    Ok(items)
}

#[tauri::command]
pub fn get_dashboard_stats(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<DashboardStats, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let active_tanks: i64 = conn
        .query_row("SELECT COUNT(*) FROM tanks WHERE active = 1", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    let dips_completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE record_status = 'submitted' OR record_status = 'approved'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let dips_pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE record_status = 'draft'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let awaiting_review: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE review_status = 'pending' AND record_status IN ('submitted', 'in_review')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let recheck_required: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE review_status = 'recheck'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let max_tolerance: f64 = conn
        .query_row(
            "SELECT COALESCE(MIN(normal_limit), 10.0) FROM tolerance_settings",
            [],
            |row| row.get(0),
        )
        .unwrap_or(10.0);

    let abnormal_diff: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE (gross_auto_difference IS NOT NULL AND ABS(gross_auto_difference) > ?1) OR (gross_radar_difference IS NOT NULL AND ABS(gross_radar_difference) > ?1) OR (auto_radar_difference IS NOT NULL AND ABS(auto_radar_difference) > ?1)",
            params![max_tolerance],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let approved: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE approval_status = 'approved'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let shift_closing_status: String = conn
        .query_row(
            "SELECT COALESCE(status, 'open') FROM shift_closings WHERE date = ?1 ORDER BY id DESC LIMIT 1",
            params![today],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "open".to_string());

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
