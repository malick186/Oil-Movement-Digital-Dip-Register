use chrono::{NaiveDate, NaiveTime};
use rusqlite::params;
use std::sync::Mutex;

use crate::models::{CorrectionField, CreateDipRequest, DipCorrection, DipRecord, DipRecordFilter, UpdateDipRequest};
use crate::util::{audit_log, require_roles};

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

fn valid_non_negative(value: Option<f64>) -> bool {
    value.map(|v| v.is_finite() && v >= 0.0).unwrap_or(false)
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

    let next_num = max_num
        .as_deref()
        .and_then(|rn| rn.split('-').last())
        .and_then(|s| s.parse::<i64>().ok())
        .map(|n| n + 1)
        .unwrap_or(1);

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

fn validate_create_request(conn: &rusqlite::Connection, data: &CreateDipRequest) -> Result<(), String> {
    NaiveDate::parse_from_str(&data.date, "%Y-%m-%d")
        .map_err(|_| "Date must use YYYY-MM-DD format".to_string())?;
    NaiveTime::parse_from_str(&data.time, "%H:%M")
        .map_err(|_| "Time must use 24-hour HH:MM format".to_string())?;

    if !valid_non_negative(data.gross_dip_mm) {
        return Err("Gross Dip is required and must be non-negative".to_string());
    }
    if !valid_non_negative(data.water_dip_mm) {
        return Err("Water Dip is required and must be non-negative".to_string());
    }
    if !valid_non_negative(data.sludge_dip_mm) {
        return Err("Sludge Dip is required and must be non-negative".to_string());
    }
    if data.temperature.map(|v| v.is_finite()).unwrap_or(false) == false {
        return Err("Temperature is required".to_string());
    }
    match data.temperature_unit.as_deref() {
        Some("C") | Some("F") => {}
        _ => return Err("Temperature unit must be C or F".to_string()),
    }
    if data.density.map(|v| v.is_finite() && v > 0.0).unwrap_or(false) == false {
        return Err("Density is required and must be greater than zero".to_string());
    }
    if data.tank_status_id.is_none() {
        return Err("Tank Status is required".to_string());
    }

    let (reference_point, radar_available, auto_available, active): (Option<String>, i64, i64, i64) = conn
        .query_row(
            "SELECT reference_point, radar_available, auto_dip_available, active FROM tanks WHERE id = ?1",
            params![data.tank_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| "Selected Tank does not exist".to_string())?;

    if active != 1 {
        return Err("Selected Tank is inactive".to_string());
    }
    if reference_point.as_deref().map(str::trim).unwrap_or("").is_empty() {
        return Err("Selected Tank has no Reference Point configured in Tank Master".to_string());
    }
    if auto_available == 1 && !valid_non_negative(data.auto_dip_mm) {
        return Err("Auto Dip is required for this Tank".to_string());
    }
    if radar_available == 1 && !valid_non_negative(data.radar_dip_mm) {
        return Err("Radar Dip is required for this Tank".to_string());
    }

    let product_active: i64 = conn
        .query_row("SELECT active FROM products WHERE id = ?1", params![data.product_id], |row| row.get(0))
        .map_err(|_| "Selected Product does not exist".to_string())?;
    if product_active != 1 {
        return Err("Selected Product is inactive".to_string());
    }

    let operator_active: i64 = conn
        .query_row("SELECT active FROM operators WHERE id = ?1", params![data.operator_id], |row| row.get(0))
        .map_err(|_| "Dip Performed By Operator does not exist".to_string())?;
    if operator_active != 1 {
        return Err("Selected Operator is inactive".to_string());
    }

    let shift_active: i64 = conn
        .query_row("SELECT active FROM shifts WHERE id = ?1", params![data.shift_id], |row| row.get(0))
        .map_err(|_| "Selected Shift does not exist".to_string())?;
    if shift_active != 1 {
        return Err("Selected Shift is inactive".to_string());
    }

    let allow_custom: i64 = conn
        .query_row(
            "SELECT allow_custom FROM tank_statuses WHERE id = ?1 AND active = 1",
            params![data.tank_status_id],
            |row| row.get(0),
        )
        .map_err(|_| "Selected Tank Status is invalid or inactive".to_string())?;
    if allow_custom == 1 && data.custom_tank_status.as_deref().map(str::trim).unwrap_or("").is_empty() {
        return Err("Custom Tank Status details are required for the selected status".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn create_dip_record(
    data: CreateDipRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    validate_create_request(&conn, &data)?;

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
            session.user_id,
        ],
    )
    .map_err(|e| format!("Failed to create Dip Record: {}", e))?;

    let id = conn.last_insert_rowid();
    let tank_no: String = conn
        .query_row("SELECT tank_no FROM tanks WHERE id = ?1", params![data.tank_id], |row| row.get(0))
        .unwrap_or_default();

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "create_dip_record",
        Some(id),
        Some(&tank_no),
        None,
        None,
        None,
        Some(&format!("Dip Record {} created as draft", record_number)),
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
    let session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let existing = get_dip_record_by_id_raw(&conn, id)?;

    if existing.record_status != "draft" {
        return Err("Only draft Dip Records can be edited directly. Use the correction workflow after submission/approval.".to_string());
    }

    let merged = CreateDipRequest {
        date: data.date.clone().unwrap_or(existing.date.clone()),
        time: data.time.clone().unwrap_or(existing.time.clone()),
        shift_id: data.shift_id.unwrap_or(existing.shift_id),
        tank_id: data.tank_id.unwrap_or(existing.tank_id),
        product_id: data.product_id.unwrap_or(existing.product_id),
        reference_point_snapshot: data.reference_point_snapshot.clone().or(existing.reference_point_snapshot.clone()),
        gross_dip_mm: data.gross_dip_mm.or(existing.gross_dip_mm),
        auto_dip_mm: data.auto_dip_mm.or(existing.auto_dip_mm),
        radar_dip_mm: data.radar_dip_mm.or(existing.radar_dip_mm),
        water_dip_mm: data.water_dip_mm.or(existing.water_dip_mm),
        sludge_dip_mm: data.sludge_dip_mm.or(existing.sludge_dip_mm),
        temperature: data.temperature.or(existing.temperature),
        temperature_unit: data.temperature_unit.clone().or(existing.temperature_unit.clone()),
        density: data.density.or(existing.density),
        tank_status_id: data.tank_status_id.or(existing.tank_status_id),
        custom_tank_status: data.custom_tank_status.clone().or(existing.custom_tank_status.clone()),
        operator_id: data.operator_id.unwrap_or(existing.operator_id),
        remarks: data.remarks.clone().or(existing.remarks.clone()),
    };
    validate_create_request(&conn, &merged)?;

    let gross_auto = calc_diff(merged.gross_dip_mm, merged.auto_dip_mm);
    let gross_radar = calc_diff(merged.gross_dip_mm, merged.radar_dip_mm);
    let auto_radar = calc_diff(merged.auto_dip_mm, merged.radar_dip_mm);

    conn.execute(
        "UPDATE dip_records SET date=?1, time=?2, shift_id=?3, tank_id=?4, product_id=?5,
         reference_point_snapshot=?6, gross_dip_mm=?7, auto_dip_mm=?8, radar_dip_mm=?9,
         water_dip_mm=?10, sludge_dip_mm=?11, temperature=?12, temperature_unit=?13,
         density=?14, tank_status_id=?15, custom_tank_status=?16, operator_id=?17,
         remarks=?18, gross_auto_difference=?19, gross_radar_difference=?20,
         auto_radar_difference=?21 WHERE id=?22",
        params![
            merged.date,
            merged.time,
            merged.shift_id,
            merged.tank_id,
            merged.product_id,
            merged.reference_point_snapshot,
            merged.gross_dip_mm,
            merged.auto_dip_mm,
            merged.radar_dip_mm,
            merged.water_dip_mm,
            merged.sludge_dip_mm,
            merged.temperature,
            merged.temperature_unit,
            merged.density,
            merged.tank_status_id,
            merged.custom_tank_status,
            merged.operator_id,
            merged.remarks,
            gross_auto,
            gross_radar,
            auto_radar,
            id,
        ],
    )
    .map_err(|e| format!("Failed to update Dip Record: {}", e))?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "update_dip_record",
        Some(id),
        None,
        None,
        None,
        None,
        Some("Draft Dip Record updated"),
    );

    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn submit_dip_record(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let existing = get_dip_record_by_id_raw(&conn, id)?;
    if existing.record_status != "draft" {
        return Err("Only draft Dip Records can be submitted".to_string());
    }

    let request = CreateDipRequest {
        date: existing.date.clone(),
        time: existing.time.clone(),
        shift_id: existing.shift_id,
        tank_id: existing.tank_id,
        product_id: existing.product_id,
        reference_point_snapshot: existing.reference_point_snapshot.clone(),
        gross_dip_mm: existing.gross_dip_mm,
        auto_dip_mm: existing.auto_dip_mm,
        radar_dip_mm: existing.radar_dip_mm,
        water_dip_mm: existing.water_dip_mm,
        sludge_dip_mm: existing.sludge_dip_mm,
        temperature: existing.temperature,
        temperature_unit: existing.temperature_unit.clone(),
        density: existing.density,
        tank_status_id: existing.tank_status_id,
        custom_tank_status: existing.custom_tank_status.clone(),
        operator_id: existing.operator_id,
        remarks: existing.remarks.clone(),
    };
    validate_create_request(&conn, &request)?;

    conn.execute(
        "UPDATE dip_records SET record_status='submitted', review_status='pending', approval_status='pending' WHERE id=?1",
        params![id],
    )
    .map_err(|e| format!("Failed to submit Dip Record: {}", e))?;

    rebuild_exceptions_for_record(&conn, id)?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "submit_dip_record",
        Some(id),
        None,
        None,
        None,
        None,
        Some(&format!("Dip Record {} submitted for Shift In-Charge review", existing.record_number)),
    );

    get_dip_record_by_id_raw(&conn, id)
}

#[tauri::command]
pub fn get_dip_record(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipRecord, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
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
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<String, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM dip_records WHERE tank_id=?1 AND date=?2 AND time=?3 AND shift_id=?4 AND record_status <> 'rejected'",
            params![tank_id, date, time, shift_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        Ok(format!(
            "A Dip Record for this Tank already exists on {} at {} in the selected Shift.",
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
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<Vec<DipRecord>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
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
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    macro_rules! push_filter {
        ($value:expr, $field:expr) => {
            if let Some(value) = $value {
                sql.push_str(&format!(" AND {} = ?{}", $field, values.len() + 1));
                values.push(Box::new(value));
            }
        };
    }

    if let Some(value) = filters.date_from.clone() {
        sql.push_str(&format!(" AND date >= ?{}", values.len() + 1));
        values.push(Box::new(value));
    }
    if let Some(value) = filters.date_to.clone() {
        sql.push_str(&format!(" AND date <= ?{}", values.len() + 1));
        values.push(Box::new(value));
    }
    push_filter!(filters.shift_id, "shift_id");
    push_filter!(filters.tank_id, "tank_id");
    push_filter!(filters.review_status.clone(), "review_status");
    push_filter!(filters.approval_status.clone(), "approval_status");
    push_filter!(filters.record_status.clone(), "record_status");
    push_filter!(filters.operator_id, "operator_id");

    sql.push_str(" ORDER BY date DESC, time DESC");
    let limit = filters.limit.unwrap_or(100).clamp(1, 1000);
    let offset = filters.offset.unwrap_or(0).max(0);
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", values.len() + 1, values.len() + 2));
    values.push(Box::new(limit));
    values.push(Box::new(offset));
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let records = stmt
        .query_map(refs.as_slice(), query_dip_record)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(records)
}

fn allowed_correction_field(field: &str) -> bool {
    matches!(
        field,
        "gross_dip_mm"
            | "auto_dip_mm"
            | "radar_dip_mm"
            | "water_dip_mm"
            | "sludge_dip_mm"
            | "temperature"
            | "temperature_unit"
            | "density"
            | "tank_status_id"
            | "custom_tank_status"
            | "operator_id"
            | "product_id"
            | "remarks"
    )
}

#[tauri::command]
pub fn request_correction(
    id: i64,
    fields: Vec<CorrectionField>,
    reason: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<DipCorrection, String> {
    let session = require_roles(&current_session, &["Shift Supervisor", "Administrator"])?;
    if reason.trim().is_empty() {
        return Err("Correction reason is mandatory".to_string());
    }
    if fields.is_empty() {
        return Err("At least one corrected field is required".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    let existing = get_dip_record_by_id_raw(&conn, id)?;
    if existing.approval_status != "approved" || existing.record_status != "approved" {
        return Err("Corrections can only be requested against a finalized approved Dip Record".to_string());
    }

    let mut last_id = 0;
    for field in fields {
        if !allowed_correction_field(&field.field_name) {
            return Err(format!("Field {} cannot be corrected through this workflow", field.field_name));
        }
        if field.new_value.trim().is_empty() && field.field_name != "remarks" && field.field_name != "custom_tank_status" {
            return Err(format!("New value is required for {}", field.field_name));
        }

        let sql = format!("SELECT CAST({} AS TEXT) FROM dip_records WHERE id = ?1", field.field_name);
        let old_value: Option<String> = conn.query_row(&sql, params![id], |row| row.get(0)).unwrap_or(None);

        conn.execute(
            "INSERT INTO dip_corrections (dip_record_id, field_name, old_value, new_value, reason, requested_by, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
            params![id, field.field_name, old_value, field.new_value, reason.trim(), session.user_id],
        )
        .map_err(|e| format!("Failed to create correction request: {}", e))?;
        last_id = conn.last_insert_rowid();
    }

    conn.execute(
        "UPDATE dip_records SET record_status='correction_requested', approval_status='correction_pending' WHERE id=?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "request_correction",
        Some(id),
        None,
        None,
        None,
        Some(reason.trim()),
        Some(&format!("Correction requested for {}", existing.record_number)),
    );

    get_correction_by_id(&conn, last_id)
}

fn get_correction_by_id(conn: &rusqlite::Connection, id: i64) -> Result<DipCorrection, String> {
    conn.query_row(
        "SELECT id, dip_record_id, field_name, old_value, new_value, reason, requested_by, approved_by, status, created_at
         FROM dip_corrections WHERE id=?1",
        params![id],
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

#[tauri::command]
pub fn list_dip_corrections(
    dip_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<crate::models::UserSession>>>,
) -> Result<Vec<DipCorrection>, String> {
    let _session = require_roles(&current_session, &["Shift Supervisor", "Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, dip_record_id, field_name, old_value, new_value, reason, requested_by, approved_by, status, created_at
             FROM dip_corrections WHERE dip_record_id=?1 ORDER BY created_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![dip_id], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

pub(crate) fn rebuild_exceptions_for_record(conn: &rusqlite::Connection, dip_id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM exceptions WHERE dip_record_id=?1", params![dip_id])
        .map_err(|e| format!("Failed to refresh exceptions: {}", e))?;

    let record = get_dip_record_by_id_raw(conn, dip_id)?;
    if let Some(value) = record.gross_auto_difference {
        check_single_tolerance(conn, &record, "gross_auto", "Gross vs Auto", value)?;
    }
    if let Some(value) = record.gross_radar_difference {
        check_single_tolerance(conn, &record, "gross_radar", "Gross vs Radar", value)?;
    }
    if let Some(value) = record.auto_radar_difference {
        check_single_tolerance(conn, &record, "auto_radar", "Auto vs Radar", value)?;
    }
    Ok(())
}

fn check_single_tolerance(
    conn: &rusqlite::Connection,
    record: &DipRecord,
    comp_type: &str,
    label: &str,
    value: f64,
) -> Result<(), String> {
    let location: Option<String> = conn
        .query_row("SELECT location FROM tanks WHERE id=?1", params![record.tank_id], |row| row.get(0))
        .ok()
        .flatten();

    let tolerance: Option<(f64, f64, f64)> = conn
        .query_row(
            "SELECT normal_limit, attention_limit, recheck_limit
             FROM tolerance_settings
             WHERE comparison_type=?1
               AND (tank_id IS NULL OR tank_id=?2)
               AND (product_id IS NULL OR product_id=?3)
               AND (location IS NULL OR location=?4)
             ORDER BY
               (CASE WHEN tank_id IS NOT NULL THEN 4 ELSE 0 END) +
               (CASE WHEN product_id IS NOT NULL THEN 2 ELSE 0 END) +
               (CASE WHEN location IS NOT NULL THEN 1 ELSE 0 END) DESC,
               id DESC
             LIMIT 1",
            params![comp_type, record.tank_id, record.product_id, location],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .ok();

    if let Some((normal, attention, recheck)) = tolerance {
        let abs = value.abs();
        let severity = if abs > recheck {
            "critical"
        } else if abs > attention {
            "warning"
        } else if abs > normal {
            "info"
        } else {
            return Ok(());
        };

        conn.execute(
            "INSERT INTO exceptions (dip_record_id, tank_id, exception_type, severity, actual_value, expected_tolerance, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'open')",
            params![
                record.id,
                record.tank_id,
                label,
                severity,
                format!("{:.3}", value),
                format!("Normal <= {}, Attention <= {}, Recheck <= {}", normal, attention, recheck),
            ],
        )
        .map_err(|e| format!("Failed to create tolerance exception: {}", e))?;
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
        assert_eq!(calc_diff(Some(100.12345), Some(100.0)), Some(0.123));
    }
}
