use rusqlite::params;
use std::sync::Mutex;

use crate::models::{CreateUserRequest, User, UserSession};
use crate::util::{audit_log, get_current_user_id};

#[tauri::command]
pub fn login(
    username: String,
    password: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<UserSession, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let user = conn
        .query_row(
            "SELECT id, username, password_hash, full_name, role, active, created_at FROM users WHERE username = ?1 AND active = 1",
            params![username],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    password_hash: row.get(2)?,
                    full_name: row.get(3)?,
                    role: row.get(4)?,
                    active: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    bcrypt::verify(&password, &user.password_hash)
        .map_err(|_| "Invalid username or password".to_string())?
        .then_some(())
        .ok_or("Invalid username or password".to_string())?;

    let session = UserSession {
        user_id: user.id,
        username: user.username.clone(),
        full_name: user.full_name.clone(),
        role: user.role.clone(),
    };

    audit_log(
        &conn,
        user.id,
        &user.role,
        "login",
        None,
        None,
        None,
        None,
        None,
        Some("User logged in"),
    );

    let mut sess = current_session.lock().map_err(|e| e.to_string())?;
    *sess = Some(session.clone());

    Ok(session)
}

#[tauri::command]
pub fn logout(
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let mut sess = current_session.lock().map_err(|e| e.to_string())?;
    if let Some(ref s) = *sess {
        let conn = db.lock().map_err(|e| e.to_string())?;
        audit_log(
            &conn,
            s.user_id,
            &s.role,
            "logout",
            None,
            None,
            None,
            None,
            None,
            Some("User logged out"),
        );
    }
    *sess = None;
    Ok(())
}

#[tauri::command]
pub fn get_current_user(
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Option<UserSession>, String> {
    let sess = current_session.lock().map_err(|e| e.to_string())?;
    Ok(sess.clone())
}

#[tauri::command]
pub fn create_user(
    data: CreateUserRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let user_id = get_current_user_id(&current_session)?;

    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref()
            .map(|s| s.role.clone())
            .unwrap_or_default()
    };
    if user_role != "Administrator" {
        return Err("Only Administrator can create users".to_string());
    }

    let password_hash = bcrypt::hash(&data.password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES (?1, ?2, ?3, ?4)",
        params![data.username, password_hash, data.full_name, data.role],
    )
    .map_err(|e| format!("Failed to create user: {}", e))?;

    let id = conn.last_insert_rowid();

    let user = conn
        .query_row(
            "SELECT id, username, password_hash, full_name, role, active, created_at FROM users WHERE id = ?1",
            params![id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    password_hash: row.get(2)?,
                    full_name: row.get(3)?,
                    role: row.get(4)?,
                    active: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| format!("Failed to fetch created user: {}", e))?;

    audit_log(
        &conn,
        user_id,
        &user_role,
        "create_user",
        None,
        None,
        None,
        Some(&format!("Created user: {}", user.username)),
        None,
        Some("User account created"),
    );

    Ok(user)
}

#[tauri::command]
pub fn list_users(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<Vec<User>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, username, password_hash, full_name, role, active, created_at FROM users ORDER BY id")
        .map_err(|e| e.to_string())?;

    let users = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                password_hash: row.get(2)?,
                full_name: row.get(3)?,
                role: row.get(4)?,
                active: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    Ok(users)
}

#[tauri::command]
pub fn toggle_user_active(
    user_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let actor_id = get_current_user_id(&current_session)?;

    let actor_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref()
            .map(|s| s.role.clone())
            .unwrap_or_default()
    };
    if actor_role != "Administrator" {
        return Err("Only Administrator can toggle user active status".to_string());
    }

    let current_active: i64 = conn
        .query_row(
            "SELECT active FROM users WHERE id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("User not found: {}", e))?;

    let new_active = if current_active == 1 { 0 } else { 1 };

    conn.execute(
        "UPDATE users SET active = ?1 WHERE id = ?2",
        params![new_active, user_id],
    )
    .map_err(|e| format!("Failed to update user: {}", e))?;

    let user = conn
        .query_row(
            "SELECT id, username, password_hash, full_name, role, active, created_at FROM users WHERE id = ?1",
            params![user_id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    password_hash: row.get(2)?,
                    full_name: row.get(3)?,
                    role: row.get(4)?,
                    active: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        actor_id,
        &actor_role,
        "toggle_user_active",
        None,
        None,
        Some(&current_active.to_string()),
        Some(&new_active.to_string()),
        None,
        Some(&format!("Toggled user {} active status", user.username)),
    );

    Ok(user)
}
