use rusqlite::params;
use std::sync::Mutex;
use serde::Serialize;

use crate::models::{DipRecheck, DipReview, DipCorrection, CreateDipRequest, DipRecordFilter, UserSession};
use crate::util::{audit_log, get_current_user_id};

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

#[tauri::command]
pub fn review_dip(
    dip_id: i64,
    action: String,
    remarks: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipReview, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let reviewer_id = get_current_user_id(&current_session)?;
    let reviewer_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    if !["approve", "recheck", "reject"].contains(&action.as_str()) {
        return Err("Invalid review action. Must be: approve, recheck, or reject".to_string());
    }

    let record_number: String = conn
        .query_row(
            "SELECT record_number FROM dip_records WHERE id = ?1",
            params![dip_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Dip record not found: {}", e))?;

    let current_status: String = conn
        .query_row(
            "SELECT review_status FROM dip_records WHERE id = ?1",
            params![dip_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Dip record not found: {}", e))?;

    if current_status == "approved" {
        return Err("Already reviewed".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    match action.as_str() {
        "approve" => {
            conn.execute(
                "UPDATE dip_records SET review_status = 'approved', reviewed_by = ?1, reviewed_at = ?2, record_status = 'in_review' WHERE id = ?3",
                params![reviewer_id, now, dip_id],
            )
            .map_err(|e| format!("Failed to update review: {}", e))?;
        }
        "recheck" => {
            conn.execute(
                "UPDATE dip_records SET review_status = 'recheck', reviewed_by = ?1, reviewed_at = ?2, record_status = 'in_review' WHERE id = ?3",
                params![reviewer_id, now, dip_id],
            )
            .map_err(|e| format!("Failed to update review: {}", e))?;
        }
        "reject" => {
            conn.execute(
                "UPDATE dip_records SET review_status = 'rejected', reviewed_by = ?1, reviewed_at = ?2, record_status = 'rejected' WHERE id = ?3",
                params![reviewer_id, now, dip_id],
            )
            .map_err(|e| format!("Failed to update review: {}", e))?;
        }
        _ => unreachable!(),
    }

    conn.execute(
        "INSERT INTO dip_reviews (dip_record_id, reviewer_id, review_action, review_remarks)
         VALUES (?1, ?2, ?3, ?4)",
        params![dip_id, reviewer_id, action, remarks],
    )
    .map_err(|e| format!("Failed to insert review: {}", e))?;

    let review_id = conn.last_insert_rowid();

    audit_log(
        &conn,
        reviewer_id,
        &reviewer_role,
        "review_dip",
        Some(dip_id),
        None,
        None,
        None,
        None,
        Some(&format!("Dip review {}: {}", action, record_number)),
    );

    conn.query_row(
        "SELECT id, dip_record_id, reviewer_id, review_action, review_remarks, reviewed_at FROM dip_reviews WHERE id = ?1",
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

#[tauri::command]
pub fn recheck_dip(
    original_id: i64,
    new_readings: CreateDipRequest,
    operator_id: i64,
    remarks: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipRecheck, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let reviewer_id = get_current_user_id(&current_session)?;
    let reviewer_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let original_status: String = conn
        .query_row(
            "SELECT review_status FROM dip_records WHERE id = ?1",
            params![original_id],
            |row| row.get(0),
        )
        .map_err(|_| "Original dip record not found".to_string())?;

    if original_status != "recheck" {
        return Err("Only records marked for recheck can be rechecked".to_string());
    }

    let record_number = create_dip_record_internal(&conn, &new_readings, reviewer_id)?;

    let recheck_dip_id: i64 = conn
        .query_row(
            "SELECT id FROM dip_records WHERE record_number = ?1",
            params![record_number],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE dip_records SET record_status = 'in_review', review_status = 'recheck' WHERE id = ?1",
        params![recheck_dip_id],
    )
    .map_err(|e| format!("Failed to update recheck record: {}", e))?;

    conn.execute(
        "INSERT INTO dip_rechecks (original_dip_id, recheck_dip_id, recheck_operator_id, recheck_remarks, reviewer_id, final_decision)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending')",
        params![original_id, recheck_dip_id, operator_id, remarks, reviewer_id],
    )
    .map_err(|e| format!("Failed to insert recheck: {}", e))?;

    let recheck_id = conn.last_insert_rowid();

    audit_log(
        &conn,
        reviewer_id,
        &reviewer_role,
        "recheck_dip",
        Some(original_id),
        None,
        None,
        None,
        None,
        Some("Recheck dip record created"),
    );

    conn.query_row(
        "SELECT id, original_dip_id, recheck_dip_id, recheck_operator_id, recheck_remarks, reviewer_id, final_decision, created_at
         FROM dip_rechecks WHERE id = ?1",
        params![recheck_id],
        |row| {
            Ok(DipRecheck {
                id: row.get(0)?,
                original_dip_id: row.get(1)?,
                recheck_dip_id: row.get(2)?,
                recheck_operator_id: row.get(3)?,
                recheck_remarks: row.get(4)?,
                reviewer_id: row.get(5)?,
                final_decision: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn approve_recheck(
    recheck_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipRecheck, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let reviewer_id = get_current_user_id(&current_session)?;
    let reviewer_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let recheck: DipRecheck = conn
        .query_row(
            "SELECT id, original_dip_id, recheck_dip_id, recheck_operator_id, recheck_remarks, reviewer_id, final_decision, created_at
             FROM dip_rechecks WHERE id = ?1",
            params![recheck_id],
            |row| {
                Ok(DipRecheck {
                    id: row.get(0)?,
                    original_dip_id: row.get(1)?,
                    recheck_dip_id: row.get(2)?,
                    recheck_operator_id: row.get(3)?,
                    recheck_remarks: row.get(4)?,
                    reviewer_id: row.get(5)?,
                    final_decision: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        )
        .map_err(|_| "Recheck record not found".to_string())?;

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    conn.execute(
        "UPDATE dip_rechecks SET final_decision = 'approved', reviewer_id = ?1 WHERE id = ?2",
        params![reviewer_id, recheck_id],
    )
    .map_err(|e| e.to_string())?;

    if let Some(recheck_dip_id) = recheck.recheck_dip_id {
        conn.execute(
            "UPDATE dip_records SET review_status = 'approved', record_status = 'in_review', reviewed_by = ?1, reviewed_at = ?2 WHERE id = ?3",
            params![reviewer_id, now, recheck_dip_id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE dip_records SET review_status = 'approved', record_status = 'in_review', reviewed_by = ?1, reviewed_at = ?2 WHERE id = ?3",
        params![reviewer_id, now, recheck.original_dip_id],
    )
    .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        reviewer_id,
        &reviewer_role,
        "approve_recheck",
        Some(recheck.original_dip_id),
        None,
        None,
        None,
        None,
        Some("Recheck approved"),
    );

    conn.query_row(
        "SELECT id, original_dip_id, recheck_dip_id, recheck_operator_id, recheck_remarks, reviewer_id, final_decision, created_at
         FROM dip_rechecks WHERE id = ?1",
        params![recheck_id],
        |row| {
            Ok(DipRecheck {
                id: row.get(0)?,
                original_dip_id: row.get(1)?,
                recheck_dip_id: row.get(2)?,
                recheck_operator_id: row.get(3)?,
                recheck_remarks: row.get(4)?,
                reviewer_id: row.get(5)?,
                final_decision: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn approve_correction(
    correction_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<DipCorrection, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let approver_id = get_current_user_id(&current_session)?;
    let approver_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let correction: DipCorrection = conn
        .query_row(
            "SELECT id, dip_record_id, field_name, old_value, new_value, reason, requested_by, approved_by, status, created_at
             FROM dip_corrections WHERE id = ?1",
            params![correction_id],
            |row| {
                Ok(DipCorrection {
                    id: row.get(0)?,
                    dip_record_id: row.get(1)?,
                    field_name: row.get(2)?,
                    old_value: row.get(3)?,
                    new_value: row.get(4)?,
                    reason: row.get(5)?,
                    requested_by: row.get(6)?,
                    approved_by: row.get(7)?,
                    status: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .map_err(|_| "Correction not found".to_string())?;

    if correction.status != "pending" {
        return Err("Correction is not pending".to_string());
    }

    let existing =
        crate::commands::dips::get_dip_record_by_id_raw(&conn, correction.dip_record_id)?;
    if existing.approval_status == "approved" {
        return Err("Cannot correct an approved record".to_string());
    }

    let sql = format!(
        "UPDATE dip_records SET {} = ?1 WHERE id = ?2",
        correction.field_name
    );
    conn.execute(
        &sql,
        params![correction.new_value, correction.dip_record_id],
    )
    .map_err(|e| format!("Failed to apply correction: {}", e))?;

    conn.execute(
        "UPDATE dip_corrections SET approved_by = ?1, status = 'approved' WHERE id = ?2",
        params![approver_id, correction_id],
    )
    .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        approver_id,
        &approver_role,
        "approve_correction",
        Some(correction.dip_record_id),
        None,
        correction.old_value.as_deref(),
        Some(&correction.new_value),
        correction.reason.as_deref(),
        Some(&format!(
            "Correction approved for field: {}",
            correction.field_name
        )),
    );

    conn.query_row(
        "SELECT id, dip_record_id, field_name, old_value, new_value, reason, requested_by, approved_by, status, created_at
         FROM dip_corrections WHERE id = ?1",
        params![correction_id],
        |row| {
            Ok(DipCorrection {
                id: row.get(0)?,
                dip_record_id: row.get(1)?,
                field_name: row.get(2)?,
                old_value: row.get(3)?,
                new_value: row.get(4)?,
                reason: row.get(5)?,
                requested_by: row.get(6)?,
                approved_by: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub(crate) fn create_dip_record_internal(
    conn: &rusqlite::Connection,
    data: &CreateDipRequest,
    entered_by: i64,
) -> Result<String, String> {
    let record_number =
        crate::commands::dips::generate_record_number(conn, &data.date)?;

    let gross_auto = crate::commands::dips::calc_diff(data.gross_dip_mm, data.auto_dip_mm);
    let gross_radar = crate::commands::dips::calc_diff(data.gross_dip_mm, data.radar_dip_mm);
    let auto_radar = crate::commands::dips::calc_diff(data.auto_dip_mm, data.radar_dip_mm);

    let reference_point_snapshot = data.reference_point_snapshot.clone().or_else(|| {
        conn.query_row(
            "SELECT reference_point FROM tanks WHERE id = ?1",
            params![data.tank_id],
            |row| row.get(0),
        )
        .ok()
        .flatten()
    });

    conn.execute(
        "INSERT INTO dip_records (record_number, date, time, shift_id, tank_id, product_id,
         reference_point_snapshot, gross_dip_mm, auto_dip_mm, radar_dip_mm, water_dip_mm,
         sludge_dip_mm, temperature, temperature_unit, density, tank_status_id,
         custom_tank_status, operator_id, remarks, gross_auto_difference,
         gross_radar_difference, auto_radar_difference, entered_by, review_status,
         approval_status, record_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
                 ?17, ?18, ?19, ?20, ?21, ?22, ?23, 'pending', 'pending', 'draft')",
        params![
            record_number,
            data.date,
            data.time,
            data.shift_id,
            data.tank_id,
            data.product_id,
            reference_point_snapshot,
            data.gross_dip_mm,
            data.auto_dip_mm,
            data.radar_dip_mm,
            data.water_dip_mm,
            data.sludge_dip_mm,
            data.temperature,
            data.temperature_unit,
            data.density,
            data.tank_status_id,
            data.custom_tank_status,
            data.operator_id,
            data.remarks,
            gross_auto,
            gross_radar,
            auto_radar,
            entered_by,
        ],
    )
    .map_err(|e| format!("Failed to create recheck dip record: {}", e))?;

    Ok(record_number)
}

#[tauri::command]
pub fn get_pending_reviews(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<DipRecordWithRelations>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT dr.id, dr.record_number, dr.date, dr.time, dr.shift_id, dr.tank_id, dr.product_id,
                dr.reference_point_snapshot, dr.gross_dip_mm, dr.auto_dip_mm, dr.radar_dip_mm,
                dr.water_dip_mm, dr.sludge_dip_mm, dr.temperature, dr.temperature_unit,
                dr.density, dr.tank_status_id, dr.custom_tank_status, dr.operator_id,
                dr.remarks, dr.gross_auto_difference, dr.gross_radar_difference,
                dr.auto_radar_difference, dr.entered_by, dr.entered_at, dr.review_status,
                dr.reviewed_by, dr.reviewed_at, dr.approval_status, dr.approved_by,
                dr.approved_at, dr.record_status,
                COALESCE(t.tank_no, ''), COALESCE(p.name, ''),
                COALESCE(ts.name, ''), COALESCE(op.name, ''),
                COALESCE(u.full_name, ''), COALESCE(t.location, '')
         FROM dip_records dr
         LEFT JOIN tanks t ON dr.tank_id = t.id
         LEFT JOIN products p ON dr.product_id = p.id
         LEFT JOIN tank_statuses ts ON dr.tank_status_id = ts.id
         LEFT JOIN operators op ON dr.operator_id = op.id
         LEFT JOIN users u ON dr.entered_by = u.id
         WHERE dr.record_status = 'submitted' AND dr.review_status = 'pending'
         ORDER BY dr.date DESC, dr.time DESC"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    drop(stmt);
    Ok(records)
}

#[tauri::command]
pub fn list_dip_records_with_relations(
    filters: DipRecordFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<DipRecordWithRelations>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT dr.id, dr.record_number, dr.date, dr.time, dr.shift_id, dr.tank_id, dr.product_id,
                dr.reference_point_snapshot, dr.gross_dip_mm, dr.auto_dip_mm, dr.radar_dip_mm,
                dr.water_dip_mm, dr.sludge_dip_mm, dr.temperature, dr.temperature_unit,
                dr.density, dr.tank_status_id, dr.custom_tank_status, dr.operator_id,
                dr.remarks, dr.gross_auto_difference, dr.gross_radar_difference,
                dr.auto_radar_difference, dr.entered_by, dr.entered_at, dr.review_status,
                dr.reviewed_by, dr.reviewed_at, dr.approval_status, dr.approved_by,
                dr.approved_at, dr.record_status,
                COALESCE(t.tank_no, ''), COALESCE(p.name, ''),
                COALESCE(ts.name, ''), COALESCE(op.name, ''),
                COALESCE(u.full_name, ''), COALESCE(t.location, '')
         FROM dip_records dr
         LEFT JOIN tanks t ON dr.tank_id = t.id
         LEFT JOIN products p ON dr.product_id = p.id
         LEFT JOIN tank_statuses ts ON dr.tank_status_id = ts.id
         LEFT JOIN operators op ON dr.operator_id = op.id
         LEFT JOIN users u ON dr.entered_by = u.id
         WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref date_from) = filters.date_from {
        sql.push_str(&format!(" AND dr.date >= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_from.clone()));
    }
    if let Some(ref date_to) = filters.date_to {
        sql.push_str(&format!(" AND dr.date <= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_to.clone()));
    }
    if let Some(tank_id) = filters.tank_id {
        sql.push_str(&format!(" AND dr.tank_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(tank_id));
    }
    if let Some(ref review_status) = filters.review_status {
        sql.push_str(&format!(" AND dr.review_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(review_status.clone()));
    }
    if let Some(ref approval_status) = filters.approval_status {
        sql.push_str(&format!(" AND dr.approval_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(approval_status.clone()));
    }
    if let Some(ref record_status) = filters.record_status {
        sql.push_str(&format!(" AND dr.record_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(record_status.clone()));
    }
    if let Some(operator_id) = filters.operator_id {
        sql.push_str(&format!(" AND dr.operator_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(operator_id));
    }

    sql.push_str(" ORDER BY dr.date DESC, dr.time DESC");

    let limit = filters.limit.unwrap_or(100);
    let offset = filters.offset.unwrap_or(0);
    sql.push_str(&format!(
        " LIMIT {} OFFSET {}",
        param_values.len() + 1,
        param_values.len() + 2
    ));
    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let records = stmt
        .query_map(param_refs.as_slice(), |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    Ok(records)
}
