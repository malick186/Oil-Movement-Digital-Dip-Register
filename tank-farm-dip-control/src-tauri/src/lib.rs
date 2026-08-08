mod commands;
mod db;
mod models;
mod util;

use crate::models::UserSession;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let conn = db::init_db(app.handle())?;
            app.manage(Mutex::new(conn));
            app.manage(Mutex::new(None::<UserSession>));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::create_user,
            commands::auth::list_users,
            commands::auth::toggle_user_active,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_attention_list,
            commands::dips::create_dip_record,
            commands::dips::update_dip_record,
            commands::dips::submit_dip_record,
            commands::dips::get_dip_record,
            commands::dips::list_dip_records,
            commands::dips::request_correction,
            commands::verification::review_dip,
            commands::verification::recheck_dip,
            commands::verification::approve_recheck,
            commands::verification::approve_correction,
            commands::verification::get_pending_reviews,
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
            commands::shift_closing::get_shift_status,
            commands::shift_closing::close_shift,
            commands::shift_closing::get_shift_closing_history,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
