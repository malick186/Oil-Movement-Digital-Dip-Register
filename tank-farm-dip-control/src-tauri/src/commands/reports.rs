use std::fs;
use std::path::Path;
use std::sync::Mutex;

use crate::models::UserSession;
use crate::storage::PortablePaths;
use crate::util::require_roles;

#[tauri::command]
pub fn export_report_csv(
    filename: String,
    content: String,
    paths: tauri::State<'_, PortablePaths>,
    current_session: tauri::State<'_, Mutex<Option<UserSession>>>,
) -> Result<String, String> {
    let _session = require_roles(&current_session, &["Shift In-Charge", "Administrator"])?;

    if content.len() > 50 * 1024 * 1024 {
        return Err("Report is too large to export".to_string());
    }

    let requested = Path::new(filename.trim());
    let safe_name = requested
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| name.eq_ignore_ascii_case(filename.trim()))
        .filter(|name| name.to_ascii_lowercase().ends_with(".csv"))
        .ok_or_else(|| "Invalid report filename".to_string())?;

    fs::create_dir_all(&paths.reports)
        .map_err(|error| format!("Failed to access Reports folder: {error}"))?;

    let stem = safe_name.strip_suffix(".csv").unwrap_or(safe_name);
    let mut output = paths.reports.join(safe_name);
    if output.exists() {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        output = paths.reports.join(format!("{stem}_{timestamp}.csv"));
    }

    fs::write(&output, content.as_bytes())
        .map_err(|error| format!("Failed to write report: {error}"))?;

    Ok(output.to_string_lossy().to_string())
}
