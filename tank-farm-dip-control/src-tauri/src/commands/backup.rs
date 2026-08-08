use std::fs;
use std::sync::Mutex;

use crate::db::get_db_path;
use crate::models::{BackupInfo, UserSession};
use crate::util::get_current_user_id;

#[tauri::command]
pub fn create_backup(
    app_handle: tauri::AppHandle,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<String, String> {
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };
    if user_role != "Administrator" {
        return Err("Only admin can create backups".to_string());
    }

    let backup_dir = get_db_path(&app_handle)
        .parent()
        .map(|p| p.join("backups"))
        .unwrap_or_else(|| std::path::PathBuf::from("backups"));

    fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backup dir: {}", e))?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("tank_farm_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&filename);

    {
        let conn_guard = db.lock().map_err(|e| e.to_string())?;
        conn_guard
            .execute(
                "VACUUM INTO ?1",
                rusqlite::params![backup_path.to_string_lossy().to_string()],
            )
            .map_err(|e| format!("Failed to create backup: {}", e))?;
    }

    let conn = db.lock().map_err(|e| e.to_string())?;
    crate::util::audit_log(
        &conn,
        user_id,
        &user_role,
        "create_backup",
        None,
        None,
        None,
        None,
        None,
        Some(&format!("Backup created: {}", filename)),
    );

    Ok(filename)
}

#[tauri::command]
pub fn restore_backup(
    filename: String,
    app_handle: tauri::AppHandle,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<(), String> {
    let user_id = get_current_user_id(&current_session)?;
    let user_role = {
        let sess = current_session.lock().map_err(|e| e.to_string())?;
        sess.as_ref().map(|s| s.role.clone()).unwrap_or_default()
    };
    if user_role != "Administrator" {
        return Err("Only admin can restore backups".to_string());
    }

    let backup_dir = get_db_path(&app_handle)
        .parent()
        .map(|p| p.join("backups"))
        .unwrap_or_else(|| std::path::PathBuf::from("backups"));

    let backup_path = backup_dir.join(&filename);

    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", filename));
    }

    let db_path = get_db_path(&app_handle);

    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        crate::util::audit_log(
            &conn,
            user_id,
            &user_role,
            "restore_backup",
            None,
            None,
            None,
            None,
            None,
            Some(&format!("Restoring backup: {}", filename)),
        );
    }

    fs::copy(&backup_path, &db_path)
        .map_err(|e| format!("Failed to restore backup: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_backup_info(app_handle: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_db_path(&app_handle)
        .parent()
        .map(|p| p.join("backups"))
        .unwrap_or_else(|| std::path::PathBuf::from("backups"));

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    let entries =
        fs::read_dir(&backup_dir).map_err(|e| format!("Failed to read backup dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "db") {
            let file_size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            let modified = fs::metadata(&path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| {
                    let secs = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
                    chrono::DateTime::from_timestamp(secs, 0)
                        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                })
                .unwrap_or_default();

            backups.push(BackupInfo {
                filename: path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
                created_at: modified,
                file_size,
            });
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}
