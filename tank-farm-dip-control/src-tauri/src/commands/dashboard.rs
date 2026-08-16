use rusqlite::params;
use serde::Serialize;
use std::sync::Mutex;

use crate::models::{DashboardStats, TankGaugingStatus, UserSession};
use crate::util::require_roles;

fn today_string() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn now_hm() -> String {
    chrono::Local::now().format("%H:%M").to_string()
}

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
    let today = today_string();

    let active_tanks: i64 = conn.query_row("SELECT COUNT(*) FROM tanks WHERE active=1", [], |row| row.get(0)).unwrap_or(0);
    // Every active Tank is expected to be gauged once per shift (spec §28).
    let tanks_expected: i64 = active_tanks;
    let tanks_gauged_today: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT tank_id) FROM dip_records WHERE date=?1 AND record_status NOT IN ('draft','rejected')",
        params![today], |row| row.get(0)
    ).unwrap_or(0);
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

    // Current Shift: the active shift whose window contains now, else the first active shift.
    let current_shift = current_shift_info(&conn, &now_hm()).unwrap_or_else(|_| None);

    let shift_closing_status: String = if let Some(info) = &current_shift {
        conn.query_row(
            "SELECT COALESCE(status,'open') FROM shift_closings WHERE date=?1 AND shift_id=?2 ORDER BY id DESC LIMIT 1",
            params![today, info.shift_id], |row| row.get(0)
        ).unwrap_or_else(|_| "open".to_string())
    } else {
        conn.query_row(
            "SELECT COALESCE(status,'open') FROM shift_closings WHERE date=?1 ORDER BY id DESC LIMIT 1",
            params![today], |row| row.get(0)
        ).unwrap_or_else(|_| "open".to_string())
    };

    Ok(DashboardStats {
        active_tanks,
        tanks_expected,
        tanks_gauged_today,
        dips_completed,
        dips_pending,
        awaiting_review,
        recheck_required,
        abnormal_diff,
        approved,
        shift_closing_status,
        current_shift,
    })
}

fn current_shift_info(
    conn: &rusqlite::Connection,
    now: &str,
) -> Result<Option<crate::models::CurrentShiftInfo>, String> {
    let row: Option<(i64, String, String, String)> = conn
        .query_row(
            "SELECT id, name, start_time, end_time FROM shifts
             WHERE active=1 AND start_time <= ?1 AND end_time > ?1
             ORDER BY id LIMIT 1",
            params![now],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok()
        .or_else(|| {
            conn.query_row(
                "SELECT id, name, start_time, end_time FROM shifts WHERE active=1 ORDER BY id LIMIT 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .ok()
        });

    let Some((shift_id, shift_name, start_time, end_time)) = row else {
        return Ok(None);
    };

    let today = today_string();
    // Most recent acting supervisor (entered a dip today) and Shift In-Charge (reviewed today).
    let mut supervisor: Option<String> = conn
        .query_row(
            "SELECT u.full_name FROM dip_records d
             INNER JOIN users u ON d.entered_by=u.id
             WHERE d.date=?1 AND u.role='Shift Supervisor'
             ORDER BY d.entered_at DESC, d.id DESC LIMIT 1",
            params![today],
            |row| row.get(0),
        )
        .ok()
        .flatten();
    let mut in_charge: Option<String> = conn
        .query_row(
            "SELECT u.full_name FROM dip_reviews r
             INNER JOIN users u ON r.reviewer_id=u.id
             WHERE date(r.reviewed_at)=date('now','localtime') AND u.role='Shift In-Charge'
             ORDER BY r.reviewed_at DESC, r.id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    if supervisor.is_none() {
        supervisor = conn
            .query_row(
                "SELECT full_name FROM users WHERE role='Shift Supervisor' AND active=1 ORDER BY id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok()
            .flatten();
    }
    if in_charge.is_none() {
        in_charge = conn
            .query_row(
                "SELECT full_name FROM users WHERE role='Shift In-Charge' AND active=1 ORDER BY id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok()
            .flatten();
    }

    Ok(Some(crate::models::CurrentShiftInfo {
        shift_id,
        shift_name,
        start_time,
        end_time,
        supervisor,
        in_charge,
    }))
}

/// Per-Tank gauging status for the given Shift for today: every active Tank with
/// its latest record (or 'missing' / 'draft' markers). Used by the Shift Closing
/// Review and by the Dashboard "Tanks Expected for Gauging" detail.
#[tauri::command]
pub fn get_shift_gauging_status(
    shift_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<TankGaugingStatus>, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let today = today_string();

    let mut stmt = conn
        .prepare(
            "SELECT id, tank_no, COALESCE(current_product, normal_product, ''), location
             FROM tanks WHERE active=1 ORDER BY tank_no",
        )
        .map_err(|e| e.to_string())?;
    let tanks = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let mut result = Vec::new();
    for (tank_id, tank_no, product_name, location) in tanks {
        let latest: Option<(i64, Option<String>, Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<String>, Option<String>, Option<String>, Option<String>)> = conn
            .query_row(
                "SELECT dr.id, dr.record_number, dr.gross_dip_mm, dr.auto_dip_mm, dr.radar_dip_mm,
                        dr.water_dip_mm, dr.sludge_dip_mm, dr.gross_auto_difference,
                        dr.gross_radar_difference, COALESCE(ts.name,''), COALESCE(op.name,''),
                        dr.review_status, dr.record_status
                 FROM dip_records dr
                 LEFT JOIN tank_statuses ts ON dr.tank_status_id=ts.id
                 LEFT JOIN operators op ON dr.operator_id=op.id
                 WHERE dr.tank_id=?1 AND dr.shift_id=?2 AND dr.date=?3
                 ORDER BY dr.id DESC LIMIT 1",
                params![tank_id, shift_id, today],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                        row.get(6)?,
                        row.get(7)?,
                        row.get(8)?,
                        row.get(9)?,
                        row.get(10)?,
                        row.get(11)?,
                        row.get(12)?,
                    ))
                },
            )
            .ok();

        let (status, dip_id, record_number, gross, auto, radar, water, sludge, ga_diff, gr_diff, tank_status_name, operator_name, review_status, record_status) =
            if let Some((dip_id, record_number, gross, auto, radar, water, sludge, ga, gr, tstatus, op, rv, rs)) = latest {
                let st = if rs.as_deref() == Some("draft") { "draft" } else { "gauged" };
                (
                    st.to_string(),
                    Some(dip_id),
                    record_number,
                    gross,
                    auto,
                    radar,
                    water,
                    sludge,
                    ga,
                    gr,
                    tstatus,
                    op,
                    rv,
                    rs,
                )
            } else {
                (
                    "missing".to_string(),
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                )
            };

        result.push(TankGaugingStatus {
            tank_id,
            tank_no,
            product_name,
            location,
            tank_status_name: tank_status_name.unwrap_or_default(),
            status,
            dip_id,
            record_number,
            gross_dip_mm: gross,
            auto_dip_mm: auto,
            radar_dip_mm: radar,
            water_dip_mm: water,
            sludge_dip_mm: sludge,
            gross_auto_difference: ga_diff,
            gross_radar_difference: gr_diff,
            operator_name,
            review_status,
            record_status,
        });
    }

    Ok(result)
}
