use rusqlite::backup::Backup;
use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;
use std::time::Duration;

use crate::db::get_db_path;
use crate::models::{BackupInfo, UserSession};
use crate::util::{audit_log, require_roles};

fn backup_dir(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    get_db_path(app_handle)
        .parent()
        .map(|p| p.join("backups"))
        .unwrap_or_else(|| std::path::PathBuf::from("backups"))
}

fn make_snapshot(
    conn: &rusqlite::Connection,
    directory: &std::path::Path,
    prefix: &str,
) -> Result<std::path::PathBuf, String> {
    fs::create_dir_all(directory).map_err(|e| format!("Failed to create backup directory: {}", e))?;
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S_%3f").to_string();
    let path = directory.join(format!("{}_{}.db", prefix, timestamp));
    conn.execute(
        "VACUUM INTO ?1",
        rusqlite::params![path.to_string_lossy().to_string()],
    )
    .map_err(|e| format!("Failed to create database snapshot: {}", e))?;
    Ok(path)
}

#[tauri::command]
pub fn create_backup(
    app_handle: tauri::AppHandle,
    db: tauri::State<'_, Mutex<rusqlite::Connection>>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<String, String> {
    let session = require_roles(&current_session, &["Administrator"])?;
    let directory = backup_dir(&app_handle);
    let conn = db.lock().map_err(|e| e.to_string())?;
    let path = make_snapshot(&conn, &directory, "tank_farm_backup")?;
    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .ok_or("Failed to determine backup filename")?;

    audit_log(
        &conn,
        session.user_id,
        &session.role,
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
    let session = require_roles(&current_session, &["Administrator"])?;
    if filename.trim().is_empty() || std::path::Path::new(&filename).file_name().and_then(|n| n.to_str()) != Some(filename.as_str()) {
        return Err("Invalid backup filename".to_string());
    }
    if !filename.to_ascii_lowercase().ends_with(".db") {
        return Err("Only .db backup files can be restored".to_string());
    }

    let directory = backup_dir(&app_handle);
    fs::create_dir_all(&directory).map_err(|e| format!("Failed to access backup directory: {}", e))?;
    let path = directory.join(&filename);
    if !path.exists() {
        return Err(format!("Backup file not found: {}", filename));
    }

    let canonical_dir = directory
        .canonicalize()
        .map_err(|e| format!("Failed to resolve backup directory: {}", e))?;
    let canonical_path = path
        .canonicalize()
        .map_err(|_| "Invalid backup filename".to_string())?;
    if !canonical_path.starts_with(&canonical_dir) {
        return Err("Backup path is outside the approved backup directory".to_string());
    }

    let source = Connection::open_with_flags(
        &canonical_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(|e| format!("Failed to open backup: {}", e))?;
    let quick_check: String = source
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|e| format!("Failed to validate backup: {}", e))?;
    if quick_check.to_ascii_lowercase() != "ok" {
        return Err(format!("Backup failed integrity check: {}", quick_check));
    }

    let mut destination = db.lock().map_err(|e| e.to_string())?;
    let safety_path = make_snapshot(&destination, &directory, "pre_restore_safety")?;

    {
        let backup = Backup::new(&source, &mut destination)
            .map_err(|e| format!("Failed to initialize restore: {}", e))?;
        backup
            .run_to_completion(100, Duration::from_millis(25), None)
            .map_err(|e| format!("Failed to restore database: {}", e))?;
    }

    destination
        .execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")
        .map_err(|e| format!("Failed to reinitialize database after restore: {}", e))?;

    audit_log(
        &destination,
        session.user_id,
        &session.role,
        "restore_backup",
        None,
        None,
        None,
        None,
        None,
        Some(&format!(
            "Restored backup {}. Safety snapshot: {}",
            filename,
            safety_path.file_name().unwrap_or_default().to_string_lossy()
        )),
    );

    Ok(())
}

#[tauri::command]
pub fn get_backup_info(
    app_handle: tauri::AppHandle,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<Vec<BackupInfo>, String> {
    let _session = require_roles(&current_session, &["Administrator"])?;
    let directory = backup_dir(&app_handle);
    if !directory.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&directory).map_err(|e| format!("Failed to read backup directory: {}", e))?;
    let mut backups = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|ext| ext.eq_ignore_ascii_case("db")).unwrap_or(false) {
            let metadata = match fs::metadata(&path) {
                Ok(value) => value,
                Err(_) => continue,
            };
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .and_then(|duration| chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0))
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .unwrap_or_default();
            backups.push(BackupInfo {
                filename: path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
                created_at: modified,
                file_size: metadata.len(),
            });
        }
    }
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}
