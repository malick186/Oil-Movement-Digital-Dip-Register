use rusqlite::params;
use std::sync::Mutex;

use crate::models::{
    DipRecord, DipRecordFilter, CreateDipRequest, UpdateDipRequest, CorrectionField, DipCorrection,
};
use crate::util::{audit_log, get_current_user_id};

pub(crate) fn calc_diff(a: Option<f64>, b: Option<f64>) -> Option<f64> {
    match (a, b) {
        (Some(x), Some(y)) => Some(round_eps(x - y, 3)),
        _ => None,
    }
}

fn round_eps(val: f64, decimals: i32) -> f64 {
    let factor = 10_f64.powi(decimals);
    (val * factor).round() / factor
}

pub(crate) fn generate_record_number(conn: &rusqlite::Connection, date: &str) -> Result<String, String> {
    let date_part = date.replace('-', "");
    let prefix = format!("DIP-{}", date_part);

    let max_num: Option<String> = conn
        .query_row(
            "SELECT MAX(record_number) FROM dip_records WHERE record_number LIKE ?1",
            params![format!("{}%", prefix)],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    let next_num = match max_num {
        Some(ref rn) => {
            rn.split('-')
                .last()
                .and_then(|s| s.parse::<i64>().ok())
                .map(|n| n + 1)
                .unwrap_or(1)
        }
        None => 1,
    };

    Ok(format!("{}-{:04}", prefix, next_num))
}

fn query_dip_record(row: &rusqlite::Row) -> rusqlite::Result<DipRecord> {
    Ok(DipRecord {
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
    })
}

pub(crate) fn get_dip_record_by_id_raw(conn: &rusqlite::Connection, id: i64) -> Result<DipRecord, String> {
    conn.query_row(
        "SELECT id, record_number, date, time, shift_id, tank_id, product_id,
         reference_point_snapshot, gross_dip_mm, auto_dip_mm, radar_dip_mm, water_dip_mm,
         sludge_dip_mm, temperature, temperature_unit, density, tank_status_id,
         custom_tank_status, operator_id, remarks, gross_auto_difference,
         gross_radar_difference, auto_radar_difference, entered_by, entered_at,
         review_status, reviewed_by, reviewed_at, approval_status, approved_by,
         approved_at, record_status FROM dip_records WHERE id = ?1",
        params![id],
        query_dip_record,
    )
    .map_err(|e| format!("Dip record not found: {}", e))
}

#[tauri::command]
pub fn create_dip_record(
    data: CreateDipRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let record_number = generate_record_number(&conn, &data.date)?;

    let gross_auto = calc_diff(data.gross_dip_mm, data.auto_dip_mm);
    let gross_radar = calc_diff(data.gross_dip_mm, data.radar_dip_mm);
    let auto_radar = calc_diff(data.auto_dip_mm, data.radar_dip_mm);

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
            user_id,
        ],
    )
    .map_err(|e| format!("Failed to create dip record: {}", e))?;

    let id = conn.last_insert_rowid();

    check_tolerances_and_create_exceptions(&conn, id)?;

    let tank_no: String = conn
        .query_row(
            "SELECT tank_no FROM tanks WHERE id = ?1",
            params![data.tank_id],
            |row| row.get(0),
        )
        .unwrap_or_default();

    audit_log(
        &conn,
        user_id,
        &user_role,
        "create_dip_record",
        Some(id),
        Some(&tank_no),
        None,
        None,
        None,
        Some(&format!("Dip record {} created", record_number)),
    );

    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn update_dip_record(
    id: i64,
    data: UpdateDipRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let existing = get_dip_record_by_id_raw(&conn, id)?;
    if existing.approval_status == "approved" {
        return Err("Cannot update an approved dip record".to_string());
    }

    let gross = data.gross_dip_mm.or(existing.gross_dip_mm);
    let auto = data.auto_dip_mm.or(existing.auto_dip_mm);
    let radar = data.radar_dip_mm.or(existing.radar_dip_mm);

    let gross_auto = calc_diff(gross, auto);
    let gross_radar = calc_diff(gross, radar);
    let auto_radar = calc_diff(auto, radar);

    conn.execute(
        "UPDATE dip_records SET date=?1, time=?2, shift_id=?3, tank_id=?4, product_id=?5,
         reference_point_snapshot=COALESCE(?6, reference_point_snapshot),
         gross_dip_mm=COALESCE(?7, gross_dip_mm),
         auto_dip_mm=COALESCE(?8, auto_dip_mm),
         radar_dip_mm=COALESCE(?9, radar_dip_mm),
         water_dip_mm=COALESCE(?10, water_dip_mm),
         sludge_dip_mm=COALESCE(?11, sludge_dip_mm),
         temperature=COALESCE(?12, temperature),
         temperature_unit=COALESCE(?13, temperature_unit),
         density=COALESCE(?14, density),
         tank_status_id=COALESCE(?15, tank_status_id),
         custom_tank_status=COALESCE(?16, custom_tank_status),
         operator_id=COALESCE(?17, operator_id),
         remarks=COALESCE(?18, remarks),
         gross_auto_difference=?19,
         gross_radar_difference=?20,
         auto_radar_difference=?21
         WHERE id=?22",
        params![
            data.date.unwrap_or(existing.date),
            data.time.unwrap_or(existing.time),
            data.shift_id.unwrap_or(existing.shift_id),
            data.tank_id.unwrap_or(existing.tank_id),
            data.product_id.unwrap_or(existing.product_id),
            data.reference_point_snapshot,
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
            id,
        ],
    )
    .map_err(|e| format!("Failed to update dip record: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_dip_record",
        Some(id),
        None,
        None,
        None,
        None,
        Some("Dip record updated"),
    );

    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn submit_dip_record(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let existing = get_dip_record_by_id_raw(&conn, id)?;
    if existing.record_status != "draft" {
        return Err("Only draft records can be submitted".to_string());
    }

    conn.execute(
        "UPDATE dip_records SET record_status = 'submitted' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to submit dip record: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "submit_dip_record",
        Some(id),
        None,
        None,
        None,
        None,
        Some(&format!("Dip record {} submitted for review", existing.record_number)),
    );

    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn get_dip_record(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<DipRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn check_duplicate_dip(
    tank_id: i64,
    date: String,
    time: String,
    shift_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE tank_id = ?1 AND date = ?2 AND time = ?3 AND shift_id = ?4",
            params![tank_id, date, time, shift_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if count > 0 {
        Ok(format!(
            "A dip record for this tank on {} at {} already exists. This may be a duplicate.",
            date, time
        ))
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn list_dip_records(
    filters: DipRecordFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<DipRecord>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT id, record_number, date, time, shift_id, tank_id, product_id,
         reference_point_snapshot, gross_dip_mm, auto_dip_mm, radar_dip_mm, water_dip_mm,
         sludge_dip_mm, temperature, temperature_unit, density, tank_status_id,
         custom_tank_status, operator_id, remarks, gross_auto_difference,
         gross_radar_difference, auto_radar_difference, entered_by, entered_at,
         review_status, reviewed_by, reviewed_at, approval_status, approved_by,
         approved_at, record_status FROM dip_records WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref date_from) = filters.date_from {
        sql.push_str(&format!(" AND date >= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_from.clone()));
    }
    if let Some(ref date_to) = filters.date_to {
        sql.push_str(&format!(" AND date <= ?{}", param_values.len() + 1));
        param_values.push(Box::new(date_to.clone()));
    }
    if let Some(shift_id) = filters.shift_id {
        sql.push_str(&format!(" AND shift_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(shift_id));
    }
    if let Some(tank_id) = filters.tank_id {
        sql.push_str(&format!(" AND tank_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(tank_id));
    }
    if let Some(ref review_status) = filters.review_status {
        sql.push_str(&format!(" AND review_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(review_status.clone()));
    }
    if let Some(ref approval_status) = filters.approval_status {
        sql.push_str(&format!(" AND approval_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(approval_status.clone()));
    }
    if let Some(ref record_status) = filters.record_status {
        sql.push_str(&format!(" AND record_status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(record_status.clone()));
    }
    if let Some(operator_id) = filters.operator_id {
        sql.push_str(&format!(" AND operator_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(operator_id));
    }

    sql.push_str(" ORDER BY date DESC, time DESC");

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
        .query_map(param_refs.as_slice(), query_dip_record)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    Ok(records)
}

#[tauri::command]
pub fn request_correction(
    id: i64,
    fields: Vec<CorrectionField>,
    reason: Option<String>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipCorrection, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    let existing = get_dip_record_by_id_raw(&conn, id)?;

    let mut last_corr_id = 0i64;
    for field in &fields {
        conn.execute(
            "INSERT INTO dip_corrections (dip_record_id, field_name, old_value, new_value, reason, requested_by, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
            params![id, field.field_name, field.old_value, field.new_value, reason, user_id],
        )
        .map_err(|e| format!("Failed to create correction: {}", e))?;
        last_corr_id = conn.last_insert_rowid();
    }

    audit_log(
        &conn,
        user_id,
        &user_role,
        "request_correction",
        Some(id),
        None,
        None,
        None,
        reason.as_deref(),
        Some(&format!(
            "Correction requested for dip record {}",
            existing.record_number
        )),
    );

    conn.query_row(
        "SELECT id, dip_record_id, field_name, old_value, new_value, reason, requested_by, approved_by, status, created_at
         FROM dip_corrections WHERE id = ?1",
        params![last_corr_id],
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

fn check_tolerances_and_create_exceptions(conn: &rusqlite::Connection, dip_id: i64) -> Result<(), String> {
    let record = get_dip_record_by_id_raw(conn, dip_id)?;
    let tank_id = record.tank_id;

    if let Some(gross_auto) = record.gross_auto_difference {
        check_single_tolerance(conn, dip_id, tank_id, "gross_auto", "Gross vs Auto", gross_auto)?;
    }
    if let Some(gross_radar) = record.gross_radar_difference {
        check_single_tolerance(conn, dip_id, tank_id, "gross_radar", "Gross vs Radar", gross_radar)?;
    }
    if let Some(auto_radar) = record.auto_radar_difference {
        check_single_tolerance(conn, dip_id, tank_id, "auto_radar", "Auto vs Radar", auto_radar)?;
    }

    Ok(())
}

fn check_single_tolerance(
    conn: &rusqlite::Connection,
    dip_id: i64,
    tank_id: i64,
    comp_type: &str,
    label: &str,
    value: f64,
) -> Result<(), String> {
    let tolerance: Option<(f64, f64, f64)> = conn
        .query_row(
            "SELECT normal_limit, attention_limit, recheck_limit FROM tolerance_settings
             WHERE (tank_id = ?1 OR tank_id IS NULL) AND comparison_type = ?2
             ORDER BY tank_id DESC LIMIT 1",
            params![tank_id, comp_type],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .ok();

    if let Some((normal, attention, recheck)) = tolerance {
        let abs_val = value.abs();
        let (severity, _status) = if abs_val > recheck {
            ("critical", "open")
        } else if abs_val > attention {
            ("warning", "open")
        } else if abs_val > normal {
            ("info", "open")
        } else {
            return Ok(());
        };

        conn.execute(
            "INSERT INTO exceptions (dip_record_id, tank_id, exception_type, severity, actual_value, expected_tolerance, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                dip_id,
                tank_id,
                label,
                severity,
                format!("{:.3}", value),
                format!("Normal: {}, Attention: {}, Recheck: {}", normal, attention, recheck),
                "open",
            ],
        )
        .map_err(|e| format!("Failed to create exception: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calc_diff_basic() {
        assert_eq!(calc_diff(Some(100.0), Some(98.0)), Some(2.0));
        assert_eq!(calc_diff(Some(98.0), Some(100.0)), Some(-2.0));
    }

    #[test]
    fn test_calc_diff_with_none() {
        assert_eq!(calc_diff(None, Some(100.0)), None);
        assert_eq!(calc_diff(Some(100.0), None), None);
        assert_eq!(calc_diff(None, None), None);
    }

    #[test]
    fn test_calc_diff_rounding() {
        let result = calc_diff(Some(100.12345), Some(100.0));
        assert!((result.unwrap() - 0.123).abs() < 0.001);
    }
}
