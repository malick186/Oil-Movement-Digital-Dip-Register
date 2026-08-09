use rusqlite::params;
use std::sync::Mutex;

use crate::models::{CreateUserRequest, User, UserSession};
use crate::util::{audit_log, require_roles};

const ALLOWED_ROLES: &[&str] = &["Shift Supervisor", "Shift In-Charge", "Administrator"];

fn public_user(row: &rusqlite::Row) -> rusqlite::Result<User> {
    Ok(User {
        id: row.get(0)?,
        username: row.get(1)?,
        password_hash: "[REDACTED]".to_string(),
        full_name: row.get(3)?,
        role: row.get(4)?,
        active: row.get(5)?,
        created_at: row.get(6)?,
    })
}

#[tauri::command]
pub fn login(
    username: String,
    password: String,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<UserSession, String> {
    let username = username.trim();
    if username.is_empty() || password.is_empty() {
        return Err("Invalid username or password".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    let (id, stored_username, password_hash, full_name, role): (i64, String, String, String, String) = conn
        .query_row(
            "SELECT id, username, password_hash, full_name, role FROM users WHERE username=?1 AND active=1",
            params![username],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    if !bcrypt::verify(&password, &password_hash).unwrap_or(false) {
        return Err("Invalid username or password".to_string());
    }

    let session = UserSession {
        user_id: id,
        username: stored_username,
        full_name,
        role,
    };

    audit_log(
        &conn,
        session.user_id,
        &session.role,
        "login",
        None,
        None,
        None,
        None,
        None,
        Some("User logged in"),
    );

    let mut state = current_session.lock().map_err(|e| e.to_string())?;
    *state = Some(session.clone());
    Ok(session)
}

#[tauri::command]
pub fn logout(
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let mut state = current_session.lock().map_err(|e| e.to_string())?;
    if let Some(ref session) = *state {
        let conn = db.lock().map_err(|e| e.to_string())?;
        audit_log(
            &conn,
            session.user_id,
            &session.role,
            "logout",
            None,
            None,
            None,
            None,
            None,
            Some("User logged out"),
        );
    }
    *state = None;
    Ok(())
}

#[tauri::command]
pub fn get_current_user(
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Option<UserSession>, String> {
    let state = current_session.lock().map_err(|e| e.to_string())?;
    Ok(state.clone())
}

#[tauri::command]
pub fn create_user(
    data: CreateUserRequest,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<User, String> {
    let actor = require_roles(&current_session, &["Administrator"])?;
    let username = data.username.trim().to_string();
    let full_name = data.full_name.trim().to_string();
    if username.is_empty() || full_name.is_empty() {
        return Err("Username and Full Name are required".to_string());
    }
    if data.password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }
    if !ALLOWED_ROLES.contains(&data.role.as_str()) {
        return Err("Invalid application role".to_string());
    }

    let password_hash = bcrypt::hash(&data.password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to secure password: {}", e))?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (username,password_hash,full_name,role,active) VALUES (?1,?2,?3,?4,1)",
        params![username, password_hash, full_name, data.role],
    )
    .map_err(|e| format!("Failed to create user: {}", e))?;
    let id = conn.last_insert_rowid();

    let user = conn
        .query_row(
            "SELECT id,username,password_hash,full_name,role,active,created_at FROM users WHERE id=?1",
            params![id],
            public_user,
        )
        .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        actor.user_id,
        &actor.role,
        "create_user",
        None,
        None,
        None,
        Some(&format!("{} / {}", user.username, user.role)),
        None,
        Some("Application user created"),
    );
    Ok(user)
}

#[tauri::command]
pub fn list_users(
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<User>, String> {
    let _actor = require_roles(&current_session, &["Administrator"])?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,username,password_hash,full_name,role,active,created_at FROM users ORDER BY full_name,username")
        .map_err(|e| e.to_string())?;
    let users = stmt
        .query_map([], public_user)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(users)
}

#[tauri::command]
pub fn toggle_user_active(
    user_id: i64,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<User, String> {
    let actor = require_roles(&current_session, &["Administrator"])?;
    if actor.user_id == user_id {
        return Err("You cannot deactivate your own active Administrator session".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    let (current_active, target_role): (i64, String) = conn
        .query_row(
            "SELECT active,role FROM users WHERE id=?1",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "User not found".to_string())?;

    if current_active == 1 && target_role == "Administrator" {
        let active_admins: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role='Administrator' AND active=1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if active_admins <= 1 {
            return Err("At least one active Administrator must remain".to_string());
        }
    }

    let new_active = if current_active == 1 { 0 } else { 1 };
    conn.execute("UPDATE users SET active=?1 WHERE id=?2", params![new_active, user_id])
        .map_err(|e| format!("Failed to update user: {}", e))?;

    let user = conn
        .query_row(
            "SELECT id,username,password_hash,full_name,role,active,created_at FROM users WHERE id=?1",
            params![user_id],
            public_user,
        )
        .map_err(|e| e.to_string())?;

    audit_log(
        &conn,
        actor.user_id,
        &actor.role,
        "toggle_user_active",
        None,
        None,
        Some(&current_active.to_string()),
        Some(&new_active.to_string()),
        None,
        Some(&format!("User {} active status changed", user.username)),
    );
    Ok(user)
}
