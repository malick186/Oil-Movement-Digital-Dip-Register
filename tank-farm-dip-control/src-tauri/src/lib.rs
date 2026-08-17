mod commands;
mod db;
mod models;
mod storage;
mod util;

use crate::models::UserSession;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
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
            let instance_lock = match storage::InstanceLock::acquire(&portable_paths) {
                Ok(lock) => lock,
                Err(error) => {
                    app.dialog()
                        .message(error.to_string())
                        .title("Tank Farm Dip Control - Shared Folder In Use")
                        .blocking_show();
                    return Err(error.into());
                }
            };

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
            commands::auth::list_users,
            commands::auth::toggle_user_active,
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
