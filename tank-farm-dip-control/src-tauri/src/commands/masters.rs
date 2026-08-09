use rusqlite::params;
use std::sync::Mutex;

use crate::models::{
    CreateOperatorRequest, CreateProductRequest, CreateTankRequest, Operator, Product, Tank,
    TankStatus, UpdateTankRequest, UserSession,
};
use crate::util::{audit_log, require_roles};

const OPERATIONAL_ROLES: &[&str] = &["Shift Supervisor", "Shift In-Charge", "Administrator"];
const ADMIN_ONLY: &[&str] = &["Administrator"];

fn require_text(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{} is required", label))
    } else {
        Ok(())
    }
}

fn require_optional_text(value: &Option<String>, label: &str) -> Result<(), String> {
    match value.as_deref().map(str::trim) {
        Some(v) if !v.is_empty() => Ok(()),
        _ => Err(format!("{} is required", label)),
    }
}

fn query_tank(row: &rusqlite::Row) -> rusqlite::Result<Tank> {
    Ok(Tank {
        id: row.get(0)?,
        tank_no: row.get(1)?,
        location: row.get(2)?,
        tank_farm: row.get(3)?,
        normal_product: row.get(4)?,
        current_product: row.get(5)?,
        reference_point: row.get(6)?,
        tank_type: row.get(7)?,
        roof_type: row.get(8)?,
        safe_fill_height: row.get(9)?,
        min_operating_level: row.get(10)?,
        ref_gauge_height: row.get(11)?,
        datum_height: row.get(12)?,
        working_capacity: row.get(13)?,
        radar_available: row.get(14)?,
        auto_dip_available: row.get(15)?,
        water_dip_applicable: row.get(16)?,
        sludge_dip_applicable: row.get(17)?,
        active: row.get(18)?,
        remarks: row.get(19)?,
        created_at: row.get(20)?,
        updated_at: row.get(21)?,
    })
}

fn get_tank_raw(conn: &rusqlite::Connection, id: i64) -> Result<Tank, String> {
    conn.query_row(
        "SELECT id, tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, active,
         remarks, created_at, updated_at FROM tanks WHERE id=?1",
        params![id],
        query_tank,
    )
    .map_err(|e| format!("Tank not found: {}", e))
}

#[tauri::command]
pub fn list_tanks(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<Tank>, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, tank_no, location, tank_farm, normal_product, current_product,
             reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
             ref_gauge_height, datum_height, working_capacity, radar_available,
             auto_dip_available, water_dip_applicable, sludge_dip_applicable, active,
             remarks, created_at, updated_at FROM tanks ORDER BY tank_no",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], query_tank)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_tank(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Tank, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_tank_raw(&conn, id)
}

#[tauri::command]
pub fn create_tank(
    data: CreateTankRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Tank, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&data.tank_no, "Tank No.")?;
    require_optional_text(&data.location, "Location")?;
    require_optional_text(&data.tank_farm, "Tank Farm / Terminal")?;
    require_optional_text(&data.reference_point, "Reference Point")?;

    let tank_no = data.tank_no.trim().to_string();
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tanks (tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, remarks)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![
            tank_no,
            data.location,
            data.tank_farm,
            data.normal_product,
            data.current_product,
            data.reference_point,
            data.tank_type,
            data.roof_type,
            data.safe_fill_height,
            data.min_operating_level,
            data.ref_gauge_height,
            data.datum_height,
            data.working_capacity,
            data.radar_available.unwrap_or(0),
            data.auto_dip_available.unwrap_or(0),
            data.water_dip_applicable.unwrap_or(1),
            data.sludge_dip_applicable.unwrap_or(1),
            data.remarks,
        ],
    )
    .map_err(|e| format!("Failed to create Tank: {}", e))?;
    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "create_tank",
        None,
        Some(&tank_no),
        None,
        Some(&tank_no),
        None,
        Some("Tank Master record created"),
    );
    get_tank_raw(&conn, id)
}

#[tauri::command]
pub fn update_tank(
    id: i64,
    data: UpdateTankRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Tank, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let existing = get_tank_raw(&conn, id)?;

    if let Some(ref value) = data.tank_no { require_text(value, "Tank No.")?; }
    if let Some(ref value) = data.location { require_text(value, "Location")?; }
    if let Some(ref value) = data.tank_farm { require_text(value, "Tank Farm / Terminal")?; }
    if let Some(ref value) = data.reference_point { require_text(value, "Reference Point")?; }

    conn.execute(
        "UPDATE tanks SET
         tank_no=COALESCE(?1,tank_no), location=COALESCE(?2,location), tank_farm=COALESCE(?3,tank_farm),
         normal_product=COALESCE(?4,normal_product), current_product=COALESCE(?5,current_product),
         reference_point=COALESCE(?6,reference_point), tank_type=COALESCE(?7,tank_type), roof_type=COALESCE(?8,roof_type),
         safe_fill_height=COALESCE(?9,safe_fill_height), min_operating_level=COALESCE(?10,min_operating_level),
         ref_gauge_height=COALESCE(?11,ref_gauge_height), datum_height=COALESCE(?12,datum_height),
         working_capacity=COALESCE(?13,working_capacity), radar_available=COALESCE(?14,radar_available),
         auto_dip_available=COALESCE(?15,auto_dip_available), water_dip_applicable=COALESCE(?16,water_dip_applicable),
         sludge_dip_applicable=COALESCE(?17,sludge_dip_applicable), active=COALESCE(?18,active),
         remarks=COALESCE(?19,remarks), updated_at=datetime('now') WHERE id=?20",
        params![
            data.tank_no,
            data.location,
            data.tank_farm,
            data.normal_product,
            data.current_product,
            data.reference_point,
            data.tank_type,
            data.roof_type,
            data.safe_fill_height,
            data.min_operating_level,
            data.ref_gauge_height,
            data.datum_height,
            data.working_capacity,
            data.radar_available,
            data.auto_dip_available,
            data.water_dip_applicable,
            data.sludge_dip_applicable,
            data.active,
            data.remarks,
            id,
        ],
    )
    .map_err(|e| format!("Failed to update Tank: {}", e))?;

    let updated = get_tank_raw(&conn, id)?;
    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "update_tank",
        None,
        Some(&updated.tank_no),
        Some(&existing.tank_no),
        Some(&updated.tank_no),
        None,
        Some("Tank Master record updated"),
    );
    Ok(updated)
}

fn query_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        code: row.get(2)?,
        category: row.get(3)?,
        active: row.get(4)?,
        remarks: row.get(5)?,
    })
}

fn get_product_raw(conn: &rusqlite::Connection, id: i64) -> Result<Product, String> {
    conn.query_row(
        "SELECT id,name,code,category,active,remarks FROM products WHERE id=?1",
        params![id],
        query_product,
    )
    .map_err(|e| format!("Product not found: {}", e))
}

#[tauri::command]
pub fn list_products(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<Product>, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,name,code,category,active,remarks FROM products ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], query_product).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_product(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Product, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_product_raw(&conn, id)
}

#[tauri::command]
pub fn create_product(
    data: CreateProductRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Product, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&data.name, "Product Name")?;
    if let Some(ref code) = data.code { require_text(code, "Product Code")?; }
    let name = data.name.trim().to_string();
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO products (name,code,category,active,remarks) VALUES (?1,?2,?3,?4,?5)",
        params![name, data.code, data.category, data.active.unwrap_or(1), data.remarks],
    )
    .map_err(|e| format!("Failed to create Product: {}", e))?;
    let id = conn.last_insert_rowid();
    audit_log(&conn, session.user_id, &session.role, "create_product", None, None, None, Some(&name), None, Some("Product Master record created"));
    get_product_raw(&conn, id)
}

#[tauri::command]
pub fn update_product(
    id: i64,
    data: CreateProductRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Product, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&data.name, "Product Name")?;
    if let Some(ref code) = data.code { require_text(code, "Product Code")?; }
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_product_raw(&conn, id)?;
    conn.execute(
        "UPDATE products SET name=?1,code=?2,category=?3,active=COALESCE(?4,active),remarks=?5 WHERE id=?6",
        params![data.name, data.code, data.category, data.active, data.remarks, id],
    )
    .map_err(|e| format!("Failed to update Product: {}", e))?;
    let updated = get_product_raw(&conn, id)?;
    audit_log(&conn, session.user_id, &session.role, "update_product", None, None, Some(&old.name), Some(&updated.name), None, Some("Product Master record updated"));
    Ok(updated)
}

fn query_operator(row: &rusqlite::Row) -> rusqlite::Result<Operator> {
    Ok(Operator {
        id: row.get(0)?,
        employee_id: row.get(1)?,
        name: row.get(2)?,
        designation: row.get(3)?,
        location: row.get(4)?,
        shift_group: row.get(5)?,
        active: row.get(6)?,
        remarks: row.get(7)?,
    })
}

fn get_operator_raw(conn: &rusqlite::Connection, id: i64) -> Result<Operator, String> {
    conn.query_row(
        "SELECT id,employee_id,name,designation,location,shift_group,active,remarks FROM operators WHERE id=?1",
        params![id],
        query_operator,
    )
    .map_err(|e| format!("Operator not found: {}", e))
}

#[tauri::command]
pub fn list_operators(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<Operator>, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,employee_id,name,designation,location,shift_group,active,remarks FROM operators ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], query_operator).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_operator(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Operator, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_operator_raw(&conn, id)
}

#[tauri::command]
pub fn create_operator(
    data: CreateOperatorRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Operator, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&data.employee_id, "Employee ID")?;
    require_text(&data.name, "Operator Name")?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO operators (employee_id,name,designation,location,shift_group,active,remarks) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![data.employee_id, data.name, data.designation, data.location, data.shift_group, data.active.unwrap_or(1), data.remarks],
    )
    .map_err(|e| format!("Failed to create Operator: {}", e))?;
    let id = conn.last_insert_rowid();
    let operator = get_operator_raw(&conn, id)?;
    audit_log(&conn, session.user_id, &session.role, "create_operator", None, None, None, Some(&operator.name), None, Some("Operator Master record created"));
    Ok(operator)
}

#[tauri::command]
pub fn update_operator(
    id: i64,
    data: CreateOperatorRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Operator, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&data.employee_id, "Employee ID")?;
    require_text(&data.name, "Operator Name")?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_operator_raw(&conn, id)?;
    conn.execute(
        "UPDATE operators SET employee_id=?1,name=?2,designation=?3,location=?4,shift_group=?5,active=COALESCE(?6,active),remarks=?7 WHERE id=?8",
        params![data.employee_id, data.name, data.designation, data.location, data.shift_group, data.active, data.remarks, id],
    )
    .map_err(|e| format!("Failed to update Operator: {}", e))?;
    let updated = get_operator_raw(&conn, id)?;
    audit_log(&conn, session.user_id, &session.role, "update_operator", None, None, Some(&old.name), Some(&updated.name), None, Some("Operator Master record updated"));
    Ok(updated)
}

fn query_status(row: &rusqlite::Row) -> rusqlite::Result<TankStatus> {
    Ok(TankStatus {
        id: row.get(0)?,
        name: row.get(1)?,
        display_order: row.get(2)?,
        active: row.get(3)?,
        allow_custom: row.get(4)?,
    })
}

fn get_status_raw(conn: &rusqlite::Connection, id: i64) -> Result<TankStatus, String> {
    conn.query_row(
        "SELECT id,name,display_order,active,allow_custom FROM tank_statuses WHERE id=?1",
        params![id],
        query_status,
    )
    .map_err(|e| format!("Tank Status not found: {}", e))
}

#[tauri::command]
pub fn list_tank_statuses(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<TankStatus>, String> {
    let _session = require_roles(&current_session, OPERATIONAL_ROLES)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,name,display_order,active,allow_custom FROM tank_statuses ORDER BY display_order,name")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], query_status).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_tank_status(
    name: String,
    display_order: i64,
    allow_custom: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<TankStatus, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&name, "Tank Status Name")?;
    let allow_custom = if allow_custom == 0 { 0 } else { 1 };
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tank_statuses (name,display_order,allow_custom,active) VALUES (?1,?2,?3,1)",
        params![name.trim(), display_order, allow_custom],
    )
    .map_err(|e| format!("Failed to create Tank Status: {}", e))?;
    let id = conn.last_insert_rowid();
    let status = get_status_raw(&conn, id)?;
    audit_log(&conn, session.user_id, &session.role, "create_tank_status", None, None, None, Some(&status.name), None, Some("Tank Status Master record created"));
    Ok(status)
}

#[tauri::command]
pub fn update_tank_status(
    id: i64,
    name: String,
    display_order: i64,
    allow_custom: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<TankStatus, String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    require_text(&name, "Tank Status Name")?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_status_raw(&conn, id)?;
    conn.execute(
        "UPDATE tank_statuses SET name=?1,display_order=?2,allow_custom=?3 WHERE id=?4",
        params![name.trim(), display_order, if allow_custom == 0 { 0 } else { 1 }, id],
    )
    .map_err(|e| format!("Failed to update Tank Status: {}", e))?;
    let updated = get_status_raw(&conn, id)?;
    audit_log(&conn, session.user_id, &session.role, "update_tank_status", None, None, Some(&old.name), Some(&updated.name), None, Some("Tank Status Master record updated"));
    Ok(updated)
}

fn deactivate_entity(
    conn: &rusqlite::Connection,
    table: &str,
    id: i64,
) -> Result<(), String> {
    let sql = match table {
        "tanks" => "UPDATE tanks SET active=0,updated_at=datetime('now') WHERE id=?1",
        "products" => "UPDATE products SET active=0 WHERE id=?1",
        "operators" => "UPDATE operators SET active=0 WHERE id=?1",
        "tank_statuses" => "UPDATE tank_statuses SET active=0 WHERE id=?1",
        _ => return Err("Invalid Master Data entity".to_string()),
    };
    let changed = conn.execute(sql, params![id]).map_err(|e| e.to_string())?;
    if changed == 0 { return Err("Master Data record not found".to_string()); }
    Ok(())
}

#[tauri::command]
pub fn deactivate_tank_status(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<(), String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_status_raw(&conn, id)?;
    deactivate_entity(&conn, "tank_statuses", id)?;
    audit_log(&conn, session.user_id, &session.role, "deactivate_tank_status", None, None, Some(&old.name), Some("inactive"), None, Some("Tank Status deactivated"));
    Ok(())
}

#[tauri::command]
pub fn deactivate_tank(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<(), String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_tank_raw(&conn, id)?;
    deactivate_entity(&conn, "tanks", id)?;
    audit_log(&conn, session.user_id, &session.role, "deactivate_tank", None, Some(&old.tank_no), Some("active"), Some("inactive"), None, Some("Tank deactivated"));
    Ok(())
}

#[tauri::command]
pub fn deactivate_product(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<(), String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_product_raw(&conn, id)?;
    deactivate_entity(&conn, "products", id)?;
    audit_log(&conn, session.user_id, &session.role, "deactivate_product", None, None, Some(&old.name), Some("inactive"), None, Some("Product deactivated"));
    Ok(())
}

#[tauri::command]
pub fn deactivate_operator(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<(), String> {
    let session = require_roles(&current_session, ADMIN_ONLY)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let old = get_operator_raw(&conn, id)?;
    deactivate_entity(&conn, "operators", id)?;
    audit_log(&conn, session.user_id, &session.role, "deactivate_operator", None, None, Some(&old.name), Some("inactive"), None, Some("Operator deactivated"));
    Ok(())
}
