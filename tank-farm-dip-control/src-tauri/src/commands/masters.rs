use rusqlite::params;
use std::sync::Mutex;

use crate::models::{
    CreateOperatorRequest, CreateProductRequest, CreateTankRequest, Operator, Product, Tank,
    TankStatus, UserSession,
};
use crate::util::{audit_log, get_current_user_id};

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

#[tauri::command]
pub fn list_tanks(db: tauri::State<'_, Mutex<rusqlite::Connection>>) -> Result<Vec<Tank>, String> {
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

    let result = stmt
        .query_map([], query_tank)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn get_tank(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Tank, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, active,
         remarks, created_at, updated_at FROM tanks WHERE id = ?1",
        params![id],
        query_tank,
    )
    .map_err(|e| format!("Tank not found: {}", e))
}

#[tauri::command]
pub fn create_tank(
    data: CreateTankRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Tank, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "INSERT INTO tanks (tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
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
            data.radar_available.unwrap_or(0),
            data.auto_dip_available.unwrap_or(0),
            data.water_dip_applicable.unwrap_or(0),
            data.sludge_dip_applicable.unwrap_or(0),
            data.remarks,
        ],
    )
    .map_err(|e| format!("Failed to create tank: {}", e))?;

    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        user_id,
        &user_role,
        "create_tank",
        None,
        Some(&data.tank_no),
        None,
        None,
        None,
        Some(&format!("Tank {} created", data.tank_no)),
    );

    conn.query_row(
        "SELECT id, tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, active,
         remarks, created_at, updated_at FROM tanks WHERE id = ?1",
        params![id],
        query_tank,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tank(
    id: i64,
    data: CreateTankRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Tank, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "UPDATE tanks SET tank_no=?1, location=?2, tank_farm=?3, normal_product=?4,
         current_product=?5, reference_point=?6, tank_type=?7, roof_type=?8,
         safe_fill_height=?9, min_operating_level=?10, ref_gauge_height=?11,
         datum_height=?12, working_capacity=?13, radar_available=?14,
         auto_dip_available=?15, water_dip_applicable=?16, sludge_dip_applicable=?17,
         remarks=?18, updated_at=datetime('now')
         WHERE id=?19",
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
            data.radar_available.unwrap_or(0),
            data.auto_dip_available.unwrap_or(0),
            data.water_dip_applicable.unwrap_or(0),
            data.sludge_dip_applicable.unwrap_or(0),
            data.remarks,
            id,
        ],
    )
    .map_err(|e| format!("Failed to update tank: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_tank",
        None,
        Some(&data.tank_no),
        None,
        None,
        None,
        Some(&format!("Tank {} updated", data.tank_no)),
    );

    conn.query_row(
        "SELECT id, tank_no, location, tank_farm, normal_product, current_product,
         reference_point, tank_type, roof_type, safe_fill_height, min_operating_level,
         ref_gauge_height, datum_height, working_capacity, radar_available,
         auto_dip_available, water_dip_applicable, sludge_dip_applicable, active,
         remarks, created_at, updated_at FROM tanks WHERE id = ?1",
        params![id],
        query_tank,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_products(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<Product>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, code, category, active, remarks FROM products ORDER BY name")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                category: row.get(3)?,
                active: row.get(4)?,
                remarks: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn get_product(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Product, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, code, category, active, remarks FROM products WHERE id = ?1",
        params![id],
        |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                category: row.get(3)?,
                active: row.get(4)?,
                remarks: row.get(5)?,
            })
        },
    )
    .map_err(|e| format!("Product not found: {}", e))
}

#[tauri::command]
pub fn create_product(
    data: CreateProductRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Product, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "INSERT INTO products (name, code, category, remarks) VALUES (?1, ?2, ?3, ?4)",
        params![data.name, data.code, data.category, data.remarks],
    )
    .map_err(|e| format!("Failed to create product: {}", e))?;

    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        user_id,
        &user_role,
        "create_product",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Product {} created", data.name)),
    );

    conn.query_row(
        "SELECT id, name, code, category, active, remarks FROM products WHERE id = ?1",
        params![id],
        |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                category: row.get(3)?,
                active: row.get(4)?,
                remarks: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_product(
    id: i64,
    data: CreateProductRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Product, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "UPDATE products SET name=?1, code=?2, category=?3, remarks=?4 WHERE id=?5",
        params![data.name, data.code, data.category, data.remarks, id],
    )
    .map_err(|e| format!("Failed to update product: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_product",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Product {} updated", data.name)),
    );

    conn.query_row(
        "SELECT id, name, code, category, active, remarks FROM products WHERE id = ?1",
        params![id],
        |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                category: row.get(3)?,
                active: row.get(4)?,
                remarks: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_operators(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<Operator>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, employee_id, name, designation, location, shift_group, active, remarks
             FROM operators ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn get_operator(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Operator, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, employee_id, name, designation, location, shift_group, active, remarks
         FROM operators WHERE id = ?1",
        params![id],
        |row| {
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
        },
    )
    .map_err(|e| format!("Operator not found: {}", e))
}

#[tauri::command]
pub fn create_operator(
    data: CreateOperatorRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Operator, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "INSERT INTO operators (employee_id, name, designation, location, shift_group, remarks)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            data.employee_id,
            data.name,
            data.designation,
            data.location,
            data.shift_group,
            data.remarks,
        ],
    )
    .map_err(|e| format!("Failed to create operator: {}", e))?;

    let id = conn.last_insert_rowid();

    audit_log(
        &conn,
        user_id,
        &user_role,
        "create_operator",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Operator {} created", data.name)),
    );

    conn.query_row(
        "SELECT id, employee_id, name, designation, location, shift_group, active, remarks
         FROM operators WHERE id = ?1",
        params![id],
        |row| {
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
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_operator(
    id: i64,
    data: CreateOperatorRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Operator, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };

    conn.execute(
        "UPDATE operators SET employee_id=?1, name=?2, designation=?3, location=?4, shift_group=?5, remarks=?6 WHERE id=?7",
        params![data.employee_id, data.name, data.designation, data.location, data.shift_group, data.remarks, id],
    )
    .map_err(|e| format!("Failed to update operator: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "update_operator",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Operator {} updated", data.name)),
    );

    conn.query_row(
        "SELECT id, employee_id, name, designation, location, shift_group, active, remarks
         FROM operators WHERE id = ?1",
        params![id],
        |row| {
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
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_tank_statuses(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<TankStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_order, active, allow_custom FROM tank_statuses ORDER BY display_order",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(TankStatus {
                id: row.get(0)?,
                name: row.get(1)?,
                display_order: row.get(2)?,
                active: row.get(3)?,
                allow_custom: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());

    drop(stmt);
    result
}

#[tauri::command]
pub fn create_tank_status(
    name: String,
    display_order: i64,
    allow_custom: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<TankStatus, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tank_statuses (name, display_order, allow_custom) VALUES (?1, ?2, ?3)",
        params![name, display_order, allow_custom],
    )
    .map_err(|e| format!("Failed to create tank status: {}", e))?;

    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, name, display_order, active, allow_custom FROM tank_statuses WHERE id = ?1",
        params![id],
        |row| {
            Ok(TankStatus {
                id: row.get(0)?,
                name: row.get(1)?,
                display_order: row.get(2)?,
                active: row.get(3)?,
                allow_custom: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tank_status(
    id: i64,
    name: String,
    display_order: i64,
    allow_custom: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<TankStatus, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tank_statuses SET name=?1, display_order=?2, allow_custom=?3 WHERE id=?4",
        params![name, display_order, allow_custom, id],
    )
    .map_err(|e| format!("Failed to update tank status: {}", e))?;

    conn.query_row(
        "SELECT id, name, display_order, active, allow_custom FROM tank_statuses WHERE id = ?1",
        params![id],
        |row| {
            Ok(TankStatus {
                id: row.get(0)?,
                name: row.get(1)?,
                display_order: row.get(2)?,
                active: row.get(3)?,
                allow_custom: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn deactivate_tank_status(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tank_statuses SET active = 0 WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to deactivate tank status: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn deactivate_tank(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tanks SET active = 0 WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to deactivate tank: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn deactivate_product(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE products SET active = 0 WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to deactivate product: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn deactivate_operator(
    id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE operators SET active = 0 WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to deactivate operator: {}", e))?;
    Ok(())
}
