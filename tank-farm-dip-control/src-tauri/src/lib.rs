mod commands;
mod db;
mod models;
mod storage;
mod util;

use crate::models::UserSession;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let portable_paths = storage::PortablePaths::discover()
        .expect("unable to determine the portable application folder");
    portable_paths
        .ensure_directories()
        .expect("unable to create portable application folders beside the executable");
    portable_paths.configure_process_environment();
    let log_directory = portable_paths.logs.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .targets([Target::new(TargetKind::Folder {
                    path: log_directory,
                    file_name: Some("tank-farm-dip-control".to_string()),
                })])
                .build(),
        )
        .setup(move |app| {
            let instance_lock = match acquire_with_notification(app, &portable_paths) {
                Ok(lock) => lock,
                Err(error) => return Err(error.into()),
            };

            // Notify the current user (via the frontend) when another PC requests access.
            spawn_access_request_watcher(app.handle().clone(), portable_paths.clone());

            let conn = db::init_db(&portable_paths)?;
            app.manage(portable_paths.clone());
            app.manage(instance_lock);
            app.manage(Mutex::new(conn));
            app.manage(Mutex::new(None::<UserSession>));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap::is_bootstrap_required,
            commands::bootstrap::bootstrap_admin,
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::create_user,
            commands::auth::update_user,
            commands::auth::delete_user,
            commands::auth::list_users,
            commands::auth::toggle_user_active,
            commands::auth::acknowledge_access_request,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_attention_list,
            commands::dashboard::get_shift_gauging_status,
            commands::dips::create_dip_record,
            commands::dips::update_dip_record,
            commands::dips::submit_dip_record,
            commands::dips::get_dip_record,
            commands::dips::list_dip_records,
            commands::dips::request_correction,
            commands::dips::list_dip_corrections,
            commands::dips::check_duplicate_dip,
            commands::verification::review_dip,
            commands::verification::recheck_dip,
            commands::verification::approve_recheck,
            commands::verification::approve_correction,
            commands::verification::get_pending_reviews,
            commands::verification::list_dip_records_with_relations,
            commands::masters::list_tanks,
            commands::masters::get_tank,
            commands::masters::create_tank,
            commands::masters::update_tank,
            commands::masters::list_products,
            commands::masters::get_product,
            commands::masters::create_product,
            commands::masters::update_product,
            commands::masters::list_operators,
            commands::masters::get_operator,
            commands::masters::create_operator,
            commands::masters::update_operator,
            commands::masters::list_tank_statuses,
            commands::masters::create_tank_status,
            commands::masters::update_tank_status,
            commands::masters::deactivate_tank_status,
            commands::masters::deactivate_tank,
            commands::masters::deactivate_product,
            commands::masters::deactivate_operator,
            commands::shift_closing::get_shift_status,
            commands::shift_closing::close_shift,
            commands::shift_closing::get_shift_closing_history,
            commands::shift_closing::get_monthly_shift_summary,
            commands::audit::get_audit_logs,
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::get_backup_info,
            commands::settings::get_tolerances,
            commands::settings::update_tolerance,
            commands::settings::get_app_settings,
            commands::settings::update_app_setting,
            commands::settings::seed_sample_data,
            commands::exceptions::list_exceptions,
            commands::exceptions::resolve_exception,
            commands::reports::export_report_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Tries to acquire the shared-folder instance lock. When another user holds it,
/// notifies that user and asks whether to retry (instead of silently exiting).
fn acquire_with_notification(
    app: &tauri::App,
    paths: &storage::PortablePaths,
) -> Result<storage::InstanceLock, Box<dyn std::error::Error>> {
    loop {
        match storage::InstanceLock::acquire(paths) {
            Ok(lock) => {
                storage::write_session_identity(paths);
                return Ok(lock);
            }
            Err(error) => {
                let identity = storage::read_session_identity(paths)
                    .unwrap_or_else(|| "another user".to_string());
                storage::write_access_request(paths);
                let retry = app
                    .dialog()
                    .message(format!(
                        "The application is currently in use by {identity}.\n\n\
                         That user has been notified that you are trying to open it.\n\n\
                         Retry now?"
                    ))
                    .title("Tank Farm Dip Control - In Use")
                    .kind(MessageDialogKind::Warning)
                    .buttons(MessageDialogButtons::OkCancelCustom(
                        "Retry".to_string(),
                        "Exit".to_string(),
                    ))
                    .blocking_show();
                if !retry {
                    return Err(error.into());
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        }
    }
}

/// Background watcher: emits an event to the frontend when another PC requests access.
fn spawn_access_request_watcher(app: tauri::AppHandle, paths: storage::PortablePaths) {
    std::thread::spawn(move || loop {
        if let Some(identity) = storage::read_access_request(&paths) {
            let _ = app.emit("access-request", serde_json::json!({ "identity": identity }));
        }
        std::thread::sleep(std::time::Duration::from_secs(2));
    });
}
