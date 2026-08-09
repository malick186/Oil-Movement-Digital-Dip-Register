use chrono::Local;
use rusqlite::params;
use serde::Serialize;
use std::sync::Mutex;

use crate::models::{CreateDipRequest, DipCorrection, DipRecheck, DipRecordFilter, DipReview, UserSession};
use crate::util::{audit_log, require_roles};

#[derive(Debug, Clone, Serialize)]
pub struct DipRecordWithRelations {
    pub id: i64,
    pub record_number: String,
    pub date: String,
    pub time: String,
    pub shift_id: i64,
    pub tank_id: i64,
    pub product_id: i64,
    pub reference_point_snapshot: Option<String>,
    pub gross_dip_mm: Option<f64>,
    pub auto_dip_mm: Option<f64>,
    pub radar_dip_mm: Option<f64>,
    pub water_dip_mm: Option<f64>,
    pub sludge_dip_mm: Option<f64>,
    pub temperature: Option<f64>,
    pub temperature_unit: Option<String>,
    pub density: Option<f64>,
    pub tank_status_id: Option<i64>,
    pub custom_tank_status: Option<String>,
    pub operator_id: i64,
    pub remarks: Option<String>,
    pub gross_auto_difference: Option<f64>,
    pub gross_radar_difference: Option<f64>,
    pub auto_radar_difference: Option<f64>,
    pub entered_by: i64,
    pub entered_at: String,
    pub review_status: String,
    pub reviewed_by: Option<i64>,
    pub reviewed_at: Option<String>,
    pub approval_status: String,
    pub approved_by: Option<i64>,
    pub approved_at: Option<String>,
    pub record_status: String,
    pub tank_no: String,
    pub product_name: String,
    pub tank_status_name: String,
    pub operator_name: String,
    pub entered_by_name: String,
    pub location: String,
}

fn now_string() -> String {
    Local::now().format("%Y-%m-%dT%H:%M:%S").to_string()
}

fn query_related(row: &rusqlite::Row) -> rusqlite::Result<DipRecordWithRelations> {
    Ok(DipRecordWithRelations {
        id: row.get(0)?,
        record_number: row.get(1)?,
        date: row.get(2)?,
        time: row.get(3)?,
        shift_id: row.get(4)?,
        tank_id: row.get(5)?,
        product_id: row.get(6)?,
        reference_point_snapshot: row.get(7)?,
        gross_dip_mm: row.get(8)?,
        auto_dip_mm: row.get(9)?,
        radar_dip_mm: row.get(10)?,
        water_dip_mm: row.get(11)?,
        sludge_dip_mm: row.get(12)?,
        temperature: row.get(13)?,
        temperature_unit: row.get(14)?,
        density: row.get(15)?,
        tank_status_id: row.get(16)?,
        custom_tank_status: row.get(17)?,
        operator_id: row.get(18)?,
        remarks: row.get(19)?,
        gross_auto_difference: row.get(20)?,
        gross_radar_difference: row.get(21)?,
        auto_radar_difference: row.get(22)?,
        entered_by: row.get(23)?,
        entered_at: row.get(24)?,
        review_status: row.get(25)?,
        reviewed_by: row.get(26)?,
        reviewed_at: row.get(27)?,
        approval_status: row.get(28)?,
        approved_by: row.get(29)?,
        approved_at: row.get(30)?,
        record_status: row.get(31)?,
        tank_no: row.get(32)?,
        product_name: row.get(33)?,
        tank_status_name: row.get(34)?,
        operator_name: row.get(35)?,
        entered_by_name: row.get(36)?,
        location: row.get(37)?,
    })
}

fn open_exception_count(conn: &rusqlite::Connection, dip_id: i64) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM exceptions WHERE dip_record_id=?1 AND status='open'",
        params![dip_id],
        |row| row.get(0),
    )
    .unwrap_or(0)
}

fn critical_exception_count(conn: &rusqlite::Connection, dip_id: i64) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM exceptions WHERE dip_record_id=?1 AND status='open' AND severity='critical'",
        params![dip_id],
        |row| row.get(0),
    )
    .unwrap_or(0)
}

fn resolve_exceptions(conn: &rusqlite::Connection, dip_id: i64, resolution: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE exceptions SET status='resolved',resolution=?1,resolved_at=datetime('now')
         WHERE dip_record_id=?2 AND status='open'",
        params![resolution, dip_id],
    )
    .map_err(|e| format!("Failed to resolve Dip exceptions: {}", e))?;
    Ok(())
}

fn pending_recheck_relation(conn: &rusqlite::Connection, recheck_dip_id: i64) -> Option<(i64, i64)> {
    conn.query_row(
        "SELECT id,original_dip_id FROM dip_rechecks
         WHERE recheck_dip_id=?1 AND COALESCE(final_decision,'pending')='pending'
         ORDER BY id DESC LIMIT 1",
        params![recheck_dip_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .ok()
}

fn finalize_recheck_relation(
    conn: &rusqlite::Connection,
    recheck_dip_id: i64,
    reviewer_id: i64,
    now: &str,
) -> Result<Option<i64>, String> {
    if let Some((relation_id, original_id)) = pending_recheck_relation(conn, recheck_dip_id) {
        conn.execute(
            "UPDATE dip_rechecks SET final_decision='approved',reviewer_id=?1 WHERE id=?2",
            params![reviewer_id, relation_id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE dip_records SET review_status='rechecked',approval_status='superseded',record_status='superseded',
             reviewed_by=?1,reviewed_at=?2 WHERE id=?3",
            params![reviewer_id, now, original_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(Some(original_id))
    } else {
        Ok(None)
    }
}

fn require_review_remarks(action: &str, remarks: &Option<String>) -> Result<(), String> {
    if ["recheck", "reject"].contains(&action)
        && remarks.as_deref().map(str::trim).unwrap_or("").is_empty()
    {
        return Err(format!("Review remarks are required for {} action", action));
    }
    Ok(())
}

#[tauri::command]
pub fn review_dip(
    dip_id: i64,
    action: String,
    remarks: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipReview, String> {
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    if !["approve", "recheck", "reject"].contains(&action.as_str()) {
        return Err("Invalid review action. Must be approve, recheck, or reject".to_string());
    }
    require_review_remarks(&action, &remarks)?;

    let conn = db.lock().map_err(|e| e.to_string())?;
    let record = crate::commands::dips::get_dip_record_by_id_raw(&conn, dip_id)?;
    if !["submitted", "in_review", "recheck_required"].contains(&record.record_status.as_str()) {
        return Err(format!("Dip Record is not reviewable in status {}", record.record_status));
    }
    if record.approval_status == "approved" && record.record_status == "approved" {
        return Err("Dip Record has already been finally approved".to_string());
    }

    let now = now_string();
    match action.as_str() {
        "approve" => {
            let critical = critical_exception_count(&conn, dip_id);
            if critical > 0 {
                return Err(format!(
                    "This Dip has {} recheck-level tolerance exception(s). A physical recheck is required before approval.",
                    critical
                ));
            }
            let exceptions = open_exception_count(&conn, dip_id);
            if exceptions > 0 && remarks.as_deref().map(str::trim).unwrap_or("").is_empty() {
                return Err("Approval remarks are required when non-critical tolerance exceptions are open".to_string());
            }

            conn.execute(
                "UPDATE dip_records SET review_status='approved',approval_status='approved',record_status='approved',
                 reviewed_by=?1,reviewed_at=?2,approved_by=?1,approved_at=?2 WHERE id=?3",
                params![session.user_id, now, dip_id],
            )
            .map_err(|e| format!("Failed to approve Dip Record: {}", e))?;

            if exceptions > 0 {
                resolve_exceptions(
                    &conn,
                    dip_id,
                    &format!("Accepted by Shift In-Charge: {}", remarks.clone().unwrap_or_default()),
                )?;
            }
            finalize_recheck_relation(&conn, dip_id, session.user_id, &now)?;
        }
        "recheck" => {
            if let Some((relation_id, original_id)) = pending_recheck_relation(&conn, dip_id) {
                conn.execute(
                    "UPDATE dip_rechecks SET final_decision='recheck_again',reviewer_id=?1 WHERE id=?2",
                    params![session.user_id, relation_id],
                )
                .map_err(|e| e.to_string())?;
                conn.execute(
                    "UPDATE dip_records SET review_status='recheck_again',approval_status='superseded',record_status='superseded',
                     reviewed_by=?1,reviewed_at=?2 WHERE id=?3",
                    params![session.user_id, now, dip_id],
                )
                .map_err(|e| e.to_string())?;
                conn.execute(
                    "UPDATE dip_records SET review_status='recheck',approval_status='pending',record_status='recheck_required',
                     reviewed_by=?1,reviewed_at=?2 WHERE id=?3",
                    params![session.user_id, now, original_id],
                )
                .map_err(|e| e.to_string())?;
                resolve_exceptions(&conn, dip_id, "Recheck result not accepted; another physical recheck requested")?;
            } else {
                conn.execute(
                    "UPDATE dip_records SET review_status='recheck',approval_status='pending',record_status='recheck_required',
                     reviewed_by=?1,reviewed_at=?2 WHERE id=?3",
                    params![session.user_id, now, dip_id],
                )
                .map_err(|e| format!("Failed to mark Dip for recheck: {}", e))?;
            }
        }
        "reject" => {
            conn.execute(
                "UPDATE dip_records SET review_status='rejected',approval_status='rejected',record_status='rejected',
                 reviewed_by=?1,reviewed_at=?2,approved_by=?1,approved_at=?2 WHERE id=?3",
                params![session.user_id, now, dip_id],
            )
            .map_err(|e| format!("Failed to reject Dip Record: {}", e))?;
            resolve_exceptions(&conn, dip_id, "Dip Record rejected by Shift In-Charge")?;

            if let Some((relation_id, original_id)) = pending_recheck_relation(&conn, dip_id) {
                conn.execute(
                    "UPDATE dip_rechecks SET final_decision='rejected',reviewer_id=?1 WHERE id=?2",
                    params![session.user_id, relation_id],
                )
                .map_err(|e| e.to_string())?;
                conn.execute(
                    "UPDATE dip_records SET review_status='rejected',approval_status='rejected',record_status='rejected',
                     reviewed_by=?1,reviewed_at=?2,approved_by=?1,approved_at=?2 WHERE id=?3",
                    params![session.user_id, now, original_id],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        _ => return Err("Invalid review action".to_string()),
    }

    conn.execute(
        "INSERT INTO dip_reviews (dip_record_id,reviewer_id,review_action,review_remarks,reviewed_at)
         VALUES (?1,?2,?3,?4,?5)",
        params![dip_id, session.user_id, action, remarks, now],
    )
    .map_err(|e| format!("Failed to record Dip review: {}", e))?;
    let review_id = conn.last_insert_rowid();

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "review_dip",
        Some(dip_id),
        None,
        None,
        Some(&action),
        remarks.as_deref(),
        Some(&format!("Review action {} applied to {}", action, record.record_number)),
    );

    conn.query_row(
        "SELECT id,dip_record_id,reviewer_id,review_action,review_remarks,reviewed_at FROM dip_reviews WHERE id=?1",
        params![review_id],
        |row| {
            Ok(DipReview {
                id: row.get(0)?,
                dip_record_id: row.get(1)?,
                reviewer_id: row.get(2)?,
                review_action: row.get(3)?,
                review_remarks: row.get(4)?,
                reviewed_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

fn validate_recheck(conn: &rusqlite::Connection, original_id: i64, data: &CreateDipRequest) -> Result<(), String> {
    let original = crate::commands::dips::get_dip_record_by_id_raw(conn, original_id)?;
    if original.review_status != "recheck" || original.record_status != "recheck_required" {
        return Err("Selected Dip Record is not awaiting a physical recheck".to_string());
    }
    if data.tank_id != original.tank_id || data.product_id != original.product_id {
        return Err("Recheck must use the same Tank and Product as the original Dip".to_string());
    }
    if data.gross_dip_mm.map(|v| v.is_finite() && v >= 0.0).unwrap_or(false) == false
        || data.water_dip_mm.map(|v| v.is_finite() && v >= 0.0).unwrap_or(false) == false
        || data.sludge_dip_mm.map(|v| v.is_finite() && v >= 0.0).unwrap_or(false) == false
        || data.temperature.map(|v| v.is_finite()).unwrap_or(false) == false
        || data.density.map(|v| v.is_finite() && v > 0.0).unwrap_or(false) == false
        || data.tank_status_id.is_none()
    {
        return Err("Recheck requires complete Gross/Water/Sludge/Temperature/Density/Tank Status observations".to_string());
    }
    let (radar, auto): (i64, i64) = conn
        .query_row(
            "SELECT radar_available,auto_dip_available FROM tanks WHERE id=?1",
            params![data.tank_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Tank not found".to_string())?;
    if radar == 1 && data.radar_dip_mm.is_none() {
        return Err("Radar Dip is required for this Tank".to_string());
    }
    if auto == 1 && data.auto_dip_mm.is_none() {
        return Err("Auto Dip is required for this Tank".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn recheck_dip(
    original_id: i64,
    new_readings: CreateDipRequest,
    operator_id: i64,
    remarks: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipRecheck, String> {
    let session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    validate_recheck(&conn, original_id, &new_readings)?;
    if operator_id != new_readings.operator_id {
        return Err("Recheck Operator must match Dip Performed By".to_string());
    }

    let record_number = crate::commands::dips::generate_record_number(&conn, &new_readings.date)?;
    let gross_auto = crate::commands::dips::calc_diff(new_readings.gross_dip_mm, new_readings.auto_dip_mm);
    let gross_radar = crate::commands::dips::calc_diff(new_readings.gross_dip_mm, new_readings.radar_dip_mm);
    let auto_radar = crate::commands::dips::calc_diff(new_readings.auto_dip_mm, new_readings.radar_dip_mm);
    let reference_point_snapshot = new_readings.reference_point_snapshot.clone().or_else(|| {
        conn.query_row("SELECT reference_point FROM tanks WHERE id=?1", params![new_readings.tank_id], |row| row.get(0)).ok().flatten()
    });

    conn.execute(
        "INSERT INTO dip_records (record_number,date,time,shift_id,tank_id,product_id,
         reference_point_snapshot,gross_dip_mm,auto_dip_mm,radar_dip_mm,water_dip_mm,
         sludge_dip_mm,temperature,temperature_unit,density,tank_status_id,
         custom_tank_status,operator_id,remarks,gross_auto_difference,
         gross_radar_difference,auto_radar_difference,entered_by,review_status,
         approval_status,record_status)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,'recheck_pending','pending','submitted')",
        params![
            record_number,new_readings.date,new_readings.time,new_readings.shift_id,new_readings.tank_id,
            new_readings.product_id,reference_point_snapshot,new_readings.gross_dip_mm,new_readings.auto_dip_mm,
            new_readings.radar_dip_mm,new_readings.water_dip_mm,new_readings.sludge_dip_mm,new_readings.temperature,
            new_readings.temperature_unit,new_readings.density,new_readings.tank_status_id,new_readings.custom_tank_status,
            new_readings.operator_id,new_readings.remarks,gross_auto,gross_radar,auto_radar,session.user_id,
        ],
    )
    .map_err(|e| format!("Failed to create recheck Dip Record: {}", e))?;
    let recheck_dip_id = conn.last_insert_rowid();
    crate::commands::dips::rebuild_exceptions_for_record(&conn, recheck_dip_id)?;

    conn.execute(
        "INSERT INTO dip_rechecks (original_dip_id,recheck_dip_id,recheck_operator_id,recheck_remarks,reviewer_id,final_decision)
         VALUES (?1,?2,?3,?4,NULL,'pending')",
        params![original_id, recheck_dip_id, operator_id, remarks],
    )
    .map_err(|e| format!("Failed to link recheck Dip: {}", e))?;
    let relation_id = conn.last_insert_rowid();

    conn.execute(
        "UPDATE dip_records SET review_status='recheck_recorded',record_status='in_review' WHERE id=?1",
        params![original_id],
    )
    .map_err(|e| e.to_string())?;

    audit_log(&conn, session.user_id, &session.role, "recheck_dip", Some(original_id), None, None, Some(&record_number), remarks.as_deref(), Some("Physical recheck Dip recorded and submitted for final review"));

    conn.query_row(
        "SELECT id,original_dip_id,recheck_dip_id,recheck_operator_id,recheck_remarks,reviewer_id,final_decision,created_at FROM dip_rechecks WHERE id=?1",
        params![relation_id],
        |row| Ok(DipRecheck { id: row.get(0)?, original_dip_id: row.get(1)?, recheck_dip_id: row.get(2)?, recheck_operator_id: row.get(3)?, recheck_remarks: row.get(4)?, reviewer_id: row.get(5)?, final_decision: row.get(6)?, created_at: row.get(7)? }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn approve_recheck(
    dip_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipRecheck, String> {
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    if open_exception_count(&conn, dip_id) > 0 {
        return Err("This recheck has open exceptions. Review it through Dip Verification.".to_string());
    }
    let (relation_id, _) = pending_recheck_relation(&conn, dip_id).ok_or("Pending recheck relation not found".to_string())?;
    let now = now_string();
    conn.execute(
        "UPDATE dip_records SET review_status='approved',approval_status='approved',record_status='approved',reviewed_by=?1,reviewed_at=?2,approved_by=?1,approved_at=?2 WHERE id=?3",
        params![session.user_id, now, dip_id],
    ).map_err(|e| e.to_string())?;
    finalize_recheck_relation(&conn, dip_id, session.user_id, &now)?;
    audit_log(&conn, session.user_id, &session.role, "approve_recheck", Some(dip_id), None, None, None, None, Some("Recheck Dip approved; original Dip superseded"));
    conn.query_row(
        "SELECT id,original_dip_id,recheck_dip_id,recheck_operator_id,recheck_remarks,reviewer_id,final_decision,created_at FROM dip_rechecks WHERE id=?1",
        params![relation_id],
        |row| Ok(DipRecheck { id: row.get(0)?, original_dip_id: row.get(1)?, recheck_dip_id: row.get(2)?, recheck_operator_id: row.get(3)?, recheck_remarks: row.get(4)?, reviewer_id: row.get(5)?, final_decision: row.get(6)?, created_at: row.get(7)? }),
    ).map_err(|e| e.to_string())
}

fn apply_correction(conn: &rusqlite::Connection, correction: &DipCorrection) -> Result<(), String> {
    let id = correction.dip_record_id;
    let value = correction.new_value.trim();
    match correction.field_name.as_str() {
        "date" => {
            chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
                .map_err(|_| "Date correction must use YYYY-MM-DD format".to_string())?;
            conn.execute("UPDATE dip_records SET date=?1 WHERE id=?2", params![value, id]).map_err(|e| e.to_string())?;
        }
        "time" => {
            chrono::NaiveTime::parse_from_str(value, "%H:%M")
                .map_err(|_| "Time correction must use HH:MM 24-hour format".to_string())?;
            conn.execute("UPDATE dip_records SET time=?1 WHERE id=?2", params![value, id]).map_err(|e| e.to_string())?;
        }
        "tank_id" => {
            let parsed: i64 = value.parse().map_err(|_| "Invalid Tank correction".to_string())?;
            let (active, reference_point): (i64, Option<String>) = conn
                .query_row("SELECT active,reference_point FROM tanks WHERE id=?1", params![parsed], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|_| "Tank not found".to_string())?;
            if active != 1 { return Err("Corrected Tank is inactive".to_string()); }
            conn.execute(
                "UPDATE dip_records SET tank_id=?1,reference_point_snapshot=?2 WHERE id=?3",
                params![parsed, reference_point, id],
            ).map_err(|e| e.to_string())?;
        }
        "gross_dip_mm" | "auto_dip_mm" | "radar_dip_mm" | "water_dip_mm" | "sludge_dip_mm" => {
            let parsed: f64 = value.parse().map_err(|_| format!("Invalid numeric correction value for {}", correction.field_name))?;
            if !parsed.is_finite() || parsed < 0.0 { return Err(format!("{} must be a non-negative number", correction.field_name)); }
            let sql = format!("UPDATE dip_records SET {}=?1 WHERE id=?2", correction.field_name);
            conn.execute(&sql, params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "temperature" => {
            let parsed: f64 = value.parse().map_err(|_| "Invalid Temperature correction".to_string())?;
            if !parsed.is_finite() { return Err("Temperature must be a finite number".to_string()); }
            conn.execute("UPDATE dip_records SET temperature=?1 WHERE id=?2", params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "density" => {
            let parsed: f64 = value.parse().map_err(|_| "Invalid Density correction".to_string())?;
            if !parsed.is_finite() || parsed <= 0.0 { return Err("Density must be greater than zero".to_string()); }
            conn.execute("UPDATE dip_records SET density=?1 WHERE id=?2", params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "operator_id" => {
            let parsed: i64 = value.parse().map_err(|_| "Invalid Operator correction".to_string())?;
            let active: i64 = conn.query_row("SELECT active FROM operators WHERE id=?1", params![parsed], |row| row.get(0)).map_err(|_| "Operator not found".to_string())?;
            if active != 1 { return Err("Corrected Operator is inactive".to_string()); }
            conn.execute("UPDATE dip_records SET operator_id=?1 WHERE id=?2", params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "product_id" => {
            let parsed: i64 = value.parse().map_err(|_| "Invalid Product correction".to_string())?;
            let active: i64 = conn.query_row("SELECT active FROM products WHERE id=?1", params![parsed], |row| row.get(0)).map_err(|_| "Product not found".to_string())?;
            if active != 1 { return Err("Corrected Product is inactive".to_string()); }
            conn.execute("UPDATE dip_records SET product_id=?1 WHERE id=?2", params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "tank_status_id" => {
            let parsed: i64 = value.parse().map_err(|_| "Invalid Tank Status correction".to_string())?;
            let active: i64 = conn.query_row("SELECT active FROM tank_statuses WHERE id=?1", params![parsed], |row| row.get(0)).map_err(|_| "Tank Status not found".to_string())?;
            if active != 1 { return Err("Corrected Tank Status is inactive".to_string()); }
            conn.execute("UPDATE dip_records SET tank_status_id=?1 WHERE id=?2", params![parsed, id]).map_err(|e| e.to_string())?;
        }
        "temperature_unit" => {
            if value != "C" && value != "F" { return Err("Temperature unit correction must be C or F".to_string()); }
            conn.execute("UPDATE dip_records SET temperature_unit=?1 WHERE id=?2", params![value, id]).map_err(|e| e.to_string())?;
        }
        "remarks" | "custom_tank_status" => {
            let sql = format!("UPDATE dip_records SET {}=?1 WHERE id=?2", correction.field_name);
            conn.execute(&sql, params![value, id]).map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Unsupported correction field {}", correction.field_name)),
    }
    Ok(())
}

#[tauri::command]
pub fn approve_correction(
    correction_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipCorrection, String> {
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let correction: DipCorrection = conn.query_row(
        "SELECT id,dip_record_id,field_name,old_value,new_value,reason,requested_by,approved_by,status,created_at FROM dip_corrections WHERE id=?1",
        params![correction_id],
        |row| Ok(DipCorrection { id: row.get(0)?, dip_record_id: row.get(1)?, field_name: row.get(2)?, old_value: row.get(3)?, new_value: row.get(4)?, reason: row.get(5)?, requested_by: row.get(6)?, approved_by: row.get(7)?, status: row.get(8)?, created_at: row.get(9)? }),
    ).map_err(|_| "Correction request not found".to_string())?;
    if correction.status != "pending" { return Err("Correction request is not pending".to_string()); }
    let record = crate::commands::dips::get_dip_record_by_id_raw(&conn, correction.dip_record_id)?;
    if record.record_status != "correction_requested" || record.approval_status != "correction_pending" { return Err("Dip Record is not in correction approval workflow".to_string()); }

    apply_correction(&conn, &correction)?;
    conn.execute("UPDATE dip_corrections SET approved_by=?1,status='approved' WHERE id=?2", params![session.user_id, correction_id]).map_err(|e| e.to_string())?;
    let updated = crate::commands::dips::get_dip_record_by_id_raw(&conn, correction.dip_record_id)?;
    let gross_auto = crate::commands::dips::calc_diff(updated.gross_dip_mm, updated.auto_dip_mm);
    let gross_radar = crate::commands::dips::calc_diff(updated.gross_dip_mm, updated.radar_dip_mm);
    let auto_radar = crate::commands::dips::calc_diff(updated.auto_dip_mm, updated.radar_dip_mm);
    conn.execute("UPDATE dip_records SET gross_auto_difference=?1,gross_radar_difference=?2,auto_radar_difference=?3 WHERE id=?4", params![gross_auto, gross_radar, auto_radar, correction.dip_record_id]).map_err(|e| e.to_string())?;
    crate::commands::dips::rebuild_exceptions_for_record(&conn, correction.dip_record_id)?;

    let pending: i64 = conn.query_row("SELECT COUNT(*) FROM dip_corrections WHERE dip_record_id=?1 AND status='pending'", params![correction.dip_record_id], |row| row.get(0)).unwrap_or(0);
    if pending == 0 {
        let now = now_string();
        if critical_exception_count(&conn, correction.dip_record_id) > 0 {
            conn.execute("UPDATE dip_records SET review_status='recheck',approval_status='pending',record_status='recheck_required',reviewed_by=?1,reviewed_at=?2 WHERE id=?3", params![session.user_id, now, correction.dip_record_id]).map_err(|e| e.to_string())?;
        } else {
            resolve_exceptions(
                &conn,
                correction.dip_record_id,
                &format!("Correction reviewed and accepted: {}", correction.reason.clone().unwrap_or_default()),
            )?;
            conn.execute("UPDATE dip_records SET review_status='approved',approval_status='approved',record_status='approved',approved_by=?1,approved_at=?2 WHERE id=?3", params![session.user_id, now, correction.dip_record_id]).map_err(|e| e.to_string())?;
        }
    }

    audit_log(&conn, session.user_id, &session.role, "approve_correction", Some(correction.dip_record_id), None, correction.old_value.as_deref(), Some(&correction.new_value), correction.reason.as_deref(), Some(&format!("Correction approved for {}", correction.field_name)));
    conn.query_row(
        "SELECT id,dip_record_id,field_name,old_value,new_value,reason,requested_by,approved_by,status,created_at FROM dip_corrections WHERE id=?1",
        params![correction_id],
        |row| Ok(DipCorrection { id: row.get(0)?, dip_record_id: row.get(1)?, field_name: row.get(2)?, old_value: row.get(3)?, new_value: row.get(4)?, reason: row.get(5)?, requested_by: row.get(6)?, approved_by: row.get(7)?, status: row.get(8)?, created_at: row.get(9)? }),
    ).map_err(|e| e.to_string())
}

fn base_related_sql() -> &'static str {
    "SELECT dr.id,dr.record_number,dr.date,dr.time,dr.shift_id,dr.tank_id,dr.product_id,
            dr.reference_point_snapshot,dr.gross_dip_mm,dr.auto_dip_mm,dr.radar_dip_mm,
            dr.water_dip_mm,dr.sludge_dip_mm,dr.temperature,dr.temperature_unit,
            dr.density,dr.tank_status_id,dr.custom_tank_status,dr.operator_id,
            dr.remarks,dr.gross_auto_difference,dr.gross_radar_difference,
            dr.auto_radar_difference,dr.entered_by,dr.entered_at,dr.review_status,
            dr.reviewed_by,dr.reviewed_at,dr.approval_status,dr.approved_by,
            dr.approved_at,dr.record_status,
            COALESCE(t.tank_no,''),COALESCE(p.name,''),COALESCE(ts.name,''),
            COALESCE(op.name,''),COALESCE(u.full_name,''),COALESCE(t.location,'')
     FROM dip_records dr
     LEFT JOIN tanks t ON dr.tank_id=t.id
     LEFT JOIN products p ON dr.product_id=p.id
     LEFT JOIN tank_statuses ts ON dr.tank_status_id=ts.id
     LEFT JOIN operators op ON dr.operator_id=op.id
     LEFT JOIN users u ON dr.entered_by=u.id"
}

#[tauri::command]
pub fn get_pending_reviews(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<DipRecordWithRelations>, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let sql = format!("{} WHERE dr.record_status='submitted' AND dr.review_status IN ('pending','recheck_pending') ORDER BY dr.date DESC,dr.time DESC", base_related_sql());
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], query_related).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn list_dip_records_with_relations(
    filters: DipRecordFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<DipRecordWithRelations>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sql = format!("{} WHERE 1=1", base_related_sql());
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(value) = filters.date_from { sql.push_str(&format!(" AND dr.date>=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.date_to { sql.push_str(&format!(" AND dr.date<=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.shift_id { sql.push_str(&format!(" AND dr.shift_id=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.tank_id { sql.push_str(&format!(" AND dr.tank_id=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.review_status { sql.push_str(&format!(" AND dr.review_status=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.approval_status { sql.push_str(&format!(" AND dr.approval_status=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.record_status { sql.push_str(&format!(" AND dr.record_status=?{}", values.len()+1)); values.push(Box::new(value)); }
    if let Some(value) = filters.operator_id { sql.push_str(&format!(" AND dr.operator_id=?{}", values.len()+1)); values.push(Box::new(value)); }
    sql.push_str(" ORDER BY dr.date DESC,dr.time DESC");
    let limit = filters.limit.unwrap_or(100).clamp(1,1000);
    let offset = filters.offset.unwrap_or(0).max(0);
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", values.len()+1, values.len()+2));
    values.push(Box::new(limit)); values.push(Box::new(offset));
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(refs.as_slice(), query_related).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}
