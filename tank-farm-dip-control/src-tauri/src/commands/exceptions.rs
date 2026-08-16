use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::models::UserSession;
use crate::util::{audit_log, require_roles};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionRecord {
    pub id: i64,
    pub dip_record_id: Option<i64>,
    pub tank_id: Option<i64>,
    pub exception_type: String,
    pub severity: String,
    pub actual_value: Option<String>,
    pub expected_tolerance: Option<String>,
    pub status: String,
    pub resolution: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
    // Joined context columns (spec §33): Tank, Product, Date, Time, Action Required.
    pub tank_no: Option<String>,
    pub product_name: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionFilter {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

const EXCEPTION_SQL: &str = "SELECT e.id, e.dip_record_id, e.tank_id, e.exception_type, e.severity,
        e.actual_value, e.expected_tolerance, e.status, e.resolution, e.created_at, e.resolved_at,
        COALESCE(t.tank_no,''), COALESCE(p.name,''), COALESCE(dr.date,''), COALESCE(dr.time,'')
     FROM exceptions e
     LEFT JOIN dip_records dr ON e.dip_record_id=dr.id
     LEFT JOIN tanks t ON dr.tank_id=t.id
     LEFT JOIN products p ON dr.product_id=p.id";

fn query_exception(row: &rusqlite::Row) -> rusqlite::Result<ExceptionRecord> {
    let tank_no: String = row.get(11)?;
    let product_name: String = row.get(12)?;
    let date: String = row.get(13)?;
    let time: String = row.get(14)?;
    Ok(ExceptionRecord {
        id: row.get(0)?,
        dip_record_id: row.get(1)?,
        tank_id: row.get(2)?,
        exception_type: row.get(3)?,
        severity: row.get(4)?,
        actual_value: row.get(5)?,
        expected_tolerance: row.get(6)?,
        status: row.get(7)?,
        resolution: row.get(8)?,
        created_at: row.get(9)?,
        resolved_at: row.get(10)?,
        tank_no: (!tank_no.is_empty()).then_some(tank_no),
        product_name: (!product_name.is_empty()).then_some(product_name),
        date: (!date.is_empty()).then_some(date),
        time: (!time.is_empty()).then_some(time),
    })
}

#[tauri::command]
pub fn list_exceptions(
    filters: ExceptionFilter,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<ExceptionRecord>, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let only_open = filters.status.as_deref().map(|s| s == "open").unwrap_or(true);
    let mut sql = String::from(EXCEPTION_SQL);
    sql.push_str(" WHERE 1=1");
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(status) = filters.status {
        sql.push_str(&format!(" AND e.status=?{}", values.len() + 1));
        values.push(Box::new(status));
    }
    if let Some(severity) = filters.severity {
        sql.push_str(&format!(" AND e.severity=?{}", values.len() + 1));
        values.push(Box::new(severity));
    }
    sql.push_str(" ORDER BY e.created_at DESC, e.id DESC");
    let limit = filters.limit.unwrap_or(100).clamp(1, 1000);
    let offset = filters.offset.unwrap_or(0).max(0);
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", values.len() + 1, values.len() + 2));
    values.push(Box::new(limit));
    values.push(Box::new(offset));
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    let mut stored: Vec<ExceptionRecord> = {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(refs.as_slice(), query_exception)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    // Workflow-level exceptions (spec §33) synthesized from live state, unless the
    // caller filtered to resolved exceptions only.
    if only_open {
        let mut synthesized = synth_workflow_exceptions(&conn)?;
        stored.append(&mut synthesized);
        stored.sort_by(|a, b| b.created_at.cmp(&a.created_at).then(b.id.cmp(&a.id)));
        stored.truncate(limit as usize);
    }

    Ok(stored)
}

fn synth_workflow_exceptions(conn: &rusqlite::Connection) -> Result<Vec<ExceptionRecord>, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let now_ts = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let mut out: Vec<ExceptionRecord> = Vec::new();

    let mut synth = |exception_type: &str,
                     severity: &str,
                     dip_record_id: Option<i64>,
                     tank_id: Option<i64>,
                     tank_no: Option<String>,
                     actual_value: Option<String>,
                     expected_tolerance: Option<String>,
                     created_at: String| {
        // Synthesized rows use unique negative ids so the UI can key and resolve them.
        let id = -(out.len() as i64) - 1;
        out.push(ExceptionRecord {
            id,
            dip_record_id,
            tank_id,
            exception_type: exception_type.to_string(),
            severity: severity.to_string(),
            actual_value,
            expected_tolerance,
            status: "open".to_string(),
            resolution: None,
            created_at,
            resolved_at: None,
            tank_no,
            product_name: None,
            date: Some(today.clone()),
            time: None,
        });
    };

    // 1. Shift Closing pending — open (not closed) shifts today.
    {
        let mut stmt = conn
            .prepare(
                "SELECT s.id, s.name, s.start_time FROM shifts s
                 WHERE s.active=1 AND NOT EXISTS (
                     SELECT 1 FROM shift_closings sc
                     WHERE sc.shift_id=s.id AND sc.date=?1 AND sc.status='closed'
                 )
                 ORDER BY s.id",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![today], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (shift_id, shift_name) in rows {
            synth(
                "Shift Closing pending",
                "info",
                None,
                None,
                None,
                Some(format!("Shift {}", shift_name)),
                Some("Close the Shift after all controls clear".to_string()),
                now_ts.clone(),
            );
            let _ = shift_id;
        }
    }

    // 2. Dip not reviewed / Recheck pending / Correction pending — today's records.
    {
        let mut stmt = conn
            .prepare(
                "SELECT dr.id, dr.record_status, dr.review_status, dr.approval_status,
                        COALESCE(t.tank_no,''), COALESCE(dr.date,''), COALESCE(dr.time,'')
                 FROM dip_records dr
                 LEFT JOIN tanks t ON dr.tank_id=t.id
                 WHERE dr.date=?1
                   AND dr.record_status IN ('submitted','recheck_required','correction_requested','in_review')
                 ORDER BY dr.date DESC, dr.time DESC
                 LIMIT 200",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![today], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (id, record_status, review_status, _approval_status, tank_no, date, time) in rows {
            match record_status.as_str() {
                "recheck_required" => synth(
                    "Recheck pending",
                    "warning",
                    Some(id),
                    None,
                    Some(tank_no.clone()),
                    Some(format!("{} {}", date, time)),
                    Some("Complete the recheck and final review".to_string()),
                    now_ts.clone(),
                ),
                "correction_requested" => synth(
                    "Correction pending",
                    "info",
                    Some(id),
                    None,
                    Some(tank_no.clone()),
                    Some(format!("{} {}", date, time)),
                    Some("Approve or reject the correction request".to_string()),
                    now_ts.clone(),
                ),
                _ if review_status == "pending" => synth(
                    "Dip not reviewed",
                    "warning",
                    Some(id),
                    None,
                    Some(tank_no.clone()),
                    Some(format!("{} {}", date, time)),
                    Some("Shift In-Charge review required".to_string()),
                    now_ts.clone(),
                ),
                _ => {}
            }
        }
    }

    // 3. Tank overdue for gauging — active Tanks with no record today.
    {
        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.tank_no, COALESCE(t.current_product, t.normal_product, '')
                 FROM tanks t
                 WHERE t.active=1
                   AND NOT EXISTS (
                       SELECT 1 FROM dip_records dr
                       WHERE dr.tank_id=t.id AND dr.date=?1
                         AND dr.record_status NOT IN ('draft','rejected')
                   )
                 ORDER BY t.tank_no
                 LIMIT 100",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![today], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        for (tank_id, tank_no, product_name) in rows {
            let rec = ExceptionRecord {
                id: -(out.len() as i64) - 1000,
                dip_record_id: None,
                tank_id: Some(tank_id),
                exception_type: "Tank overdue for gauging".to_string(),
                severity: "warning".to_string(),
                actual_value: Some("No Dip Record today".to_string()),
                expected_tolerance: Some("Record the Tank gauging observation".to_string()),
                status: "open".to_string(),
                resolution: None,
                created_at: now_ts.clone(),
                resolved_at: None,
                tank_no: Some(tank_no),
                product_name: (!product_name.is_empty()).then_some(product_name),
                date: Some(today.clone()),
                time: None,
            };
            out.push(rec);
        }
    }

    Ok(out)
}

#[tauri::command]
pub fn resolve_exception(
    id: i64,
    resolution: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<ExceptionRecord, String> {
    let session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;
    let resolution = resolution.trim().to_string();
    if resolution.is_empty() {
        return Err("Exception resolution remarks are required".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    // Synthesized (negative-id) workflow exceptions resolve without touching the table.
    if id < 0 {
        return Ok(ExceptionRecord {
            id,
            dip_record_id: None,
            tank_id: None,
            exception_type: "Workflow exception".to_string(),
            severity: "info".to_string(),
            actual_value: None,
            expected_tolerance: None,
            status: "resolved".to_string(),
            resolution: Some(resolution),
            created_at: chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            resolved_at: Some(chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string()),
            tank_no: None,
            product_name: None,
            date: None,
            time: None,
        });
    }

    let current: ExceptionRecord = conn
        .query_row(
            "SELECT e.id,e.dip_record_id,e.tank_id,e.exception_type,e.severity,e.actual_value,
                    e.expected_tolerance,e.status,e.resolution,e.created_at,e.resolved_at,
                    COALESCE(t.tank_no,''),COALESCE(p.name,''),COALESCE(dr.date,''),COALESCE(dr.time,'')
             FROM exceptions e
             LEFT JOIN dip_records dr ON e.dip_record_id=dr.id
             LEFT JOIN tanks t ON dr.tank_id=t.id
             LEFT JOIN products p ON dr.product_id=p.id
             WHERE e.id=?1",
            params![id],
            query_exception,
        )
        .map_err(|_| "Exception not found".to_string())?;
    if current.status != "open" {
        return Err("Exception is already resolved".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    conn.execute(
        "UPDATE exceptions SET status='resolved',resolution=?1,resolved_at=?2 WHERE id=?3 AND status='open'",
        params![resolution, now, id],
    )
    .map_err(|e| format!("Failed to resolve exception: {}", e))?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "resolve_exception",
        current.dip_record_id,
        None,
        Some("open"),
        Some("resolved"),
        Some(&resolution),
        Some(&format!("Resolved {} exception", current.exception_type)),
    );

    conn.query_row(
        "SELECT e.id,e.dip_record_id,e.tank_id,e.exception_type,e.severity,e.actual_value,
                e.expected_tolerance,e.status,e.resolution,e.created_at,e.resolved_at,
                COALESCE(t.tank_no,''),COALESCE(p.name,''),COALESCE(dr.date,''),COALESCE(dr.time,'')
         FROM exceptions e
         LEFT JOIN dip_records dr ON e.dip_record_id=dr.id
         LEFT JOIN tanks t ON dr.tank_id=t.id
         LEFT JOIN products p ON dr.product_id=p.id
         WHERE e.id=?1",
        params![id],
        query_exception,
    )
    .map_err(|e| e.to_string())
}
