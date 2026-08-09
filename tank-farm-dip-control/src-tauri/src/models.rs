use serde::{Deserialize, Deserializer, Serialize};

fn bool_int<'de, D: Deserializer<'de>>(d: D) -> Result<Option<i64>, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum BoolOrInt {
        Bool(bool),
        Int(i64),
    }
    match Option::<BoolOrInt>::deserialize(d)? {
        None => Ok(None),
        Some(BoolOrInt::Bool(b)) => Ok(Some(b as i64)),
        Some(BoolOrInt::Int(n)) => Ok(Some(n)),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: String,
    pub active: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub user_id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub id: i64,
    pub name: String,
    pub active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shift {
    pub id: i64,
    pub name: String,
    pub start_time: String,
    pub end_time: String,
    pub active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tank {
    pub id: i64,
    pub tank_no: String,
    pub location: Option<String>,
    pub tank_farm: Option<String>,
    pub normal_product: Option<String>,
    pub current_product: Option<String>,
    pub reference_point: Option<String>,
    pub tank_type: Option<String>,
    pub roof_type: Option<String>,
    pub safe_fill_height: Option<f64>,
    pub min_operating_level: Option<f64>,
    pub ref_gauge_height: Option<f64>,
    pub datum_height: Option<f64>,
    pub working_capacity: Option<f64>,
    pub radar_available: i64,
    pub auto_dip_available: i64,
    pub water_dip_applicable: i64,
    pub sludge_dip_applicable: i64,
    pub active: i64,
    pub remarks: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTankRequest {
    pub tank_no: String,
    pub location: Option<String>,
    pub tank_farm: Option<String>,
    pub normal_product: Option<String>,
    pub current_product: Option<String>,
    pub reference_point: Option<String>,
    pub tank_type: Option<String>,
    pub roof_type: Option<String>,
    pub safe_fill_height: Option<f64>,
    pub min_operating_level: Option<f64>,
    pub ref_gauge_height: Option<f64>,
    pub datum_height: Option<f64>,
    pub working_capacity: Option<f64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub radar_available: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub auto_dip_available: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub water_dip_applicable: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub sludge_dip_applicable: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTankRequest {
    pub tank_no: Option<String>,
    pub location: Option<String>,
    pub tank_farm: Option<String>,
    pub normal_product: Option<String>,
    pub current_product: Option<String>,
    pub reference_point: Option<String>,
    pub tank_type: Option<String>,
    pub roof_type: Option<String>,
    pub safe_fill_height: Option<f64>,
    pub min_operating_level: Option<f64>,
    pub ref_gauge_height: Option<f64>,
    pub datum_height: Option<f64>,
    pub working_capacity: Option<f64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub radar_available: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub auto_dip_available: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub water_dip_applicable: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub sludge_dip_applicable: Option<i64>,
    #[serde(default, deserialize_with = "bool_int")]
    pub active: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub category: Option<String>,
    pub active: i64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub code: Option<String>,
    pub category: Option<String>,
    #[serde(default, deserialize_with = "bool_int")]
    pub active: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operator {
    pub id: i64,
    pub employee_id: String,
    pub name: String,
    pub designation: Option<String>,
    pub location: Option<String>,
    pub shift_group: Option<String>,
    pub active: i64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOperatorRequest {
    pub employee_id: String,
    pub name: String,
    pub designation: Option<String>,
    pub location: Option<String>,
    pub shift_group: Option<String>,
    #[serde(default, deserialize_with = "bool_int")]
    pub active: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TankStatus {
    pub id: i64,
    pub name: String,
    pub display_order: i64,
    pub active: i64,
    pub allow_custom: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DipRecord {
    pub id: i64,
    pub record_number: String,
    pub date: String,
    pub time: String,
    pub shift_id: i64,
    pub tank_id: i64,
    pub product_id: i64,
    pub reference_point_snapshot: Option<String>,
    pub gross_dip_mm: Option<f64>,
    pub auto_dip_mm: Option<f64>,
    pub radar_dip_mm: Option<f64>,
    pub water_dip_mm: Option<f64>,
    pub sludge_dip_mm: Option<f64>,
    pub temperature: Option<f64>,
    pub temperature_unit: Option<String>,
    pub density: Option<f64>,
    pub tank_status_id: Option<i64>,
    pub custom_tank_status: Option<String>,
    pub operator_id: i64,
    pub remarks: Option<String>,
    pub gross_auto_difference: Option<f64>,
    pub gross_radar_difference: Option<f64>,
    pub auto_radar_difference: Option<f64>,
    pub entered_by: i64,
    pub entered_at: String,
    pub review_status: String,
    pub reviewed_by: Option<i64>,
    pub reviewed_at: Option<String>,
    pub approval_status: String,
    pub approved_by: Option<i64>,
    pub approved_at: Option<String>,
    pub record_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDipRequest {
    pub date: String,
    pub time: String,
    pub shift_id: i64,
    pub tank_id: i64,
    pub product_id: i64,
    pub reference_point_snapshot: Option<String>,
    pub gross_dip_mm: Option<f64>,
    pub auto_dip_mm: Option<f64>,
    pub radar_dip_mm: Option<f64>,
    pub water_dip_mm: Option<f64>,
    pub sludge_dip_mm: Option<f64>,
    pub temperature: Option<f64>,
    pub temperature_unit: Option<String>,
    pub density: Option<f64>,
    pub tank_status_id: Option<i64>,
    pub custom_tank_status: Option<String>,
    pub operator_id: i64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDipRequest {
    pub date: Option<String>,
    pub time: Option<String>,
    pub shift_id: Option<i64>,
    pub tank_id: Option<i64>,
    pub product_id: Option<i64>,
    pub reference_point_snapshot: Option<String>,
    pub gross_dip_mm: Option<f64>,
    pub auto_dip_mm: Option<f64>,
    pub radar_dip_mm: Option<f64>,
    pub water_dip_mm: Option<f64>,
    pub sludge_dip_mm: Option<f64>,
    pub temperature: Option<f64>,
    pub temperature_unit: Option<String>,
    pub density: Option<f64>,
    pub tank_status_id: Option<i64>,
    pub custom_tank_status: Option<String>,
    pub operator_id: Option<i64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DipRecordFilter {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub shift_id: Option<i64>,
    pub tank_id: Option<i64>,
    pub review_status: Option<String>,
    pub approval_status: Option<String>,
    pub record_status: Option<String>,
    pub operator_id: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DipReview {
    pub id: i64,
    pub dip_record_id: i64,
    pub reviewer_id: i64,
    pub review_action: String,
    pub review_remarks: Option<String>,
    pub reviewed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewDipRequest {
    pub dip_id: i64,
    pub action: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DipRecheck {
    pub id: i64,
    pub original_dip_id: i64,
    pub recheck_dip_id: Option<i64>,
    pub recheck_operator_id: i64,
    pub recheck_remarks: Option<String>,
    pub reviewer_id: Option<i64>,
    pub final_decision: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecheckDipRequest {
    pub original_id: i64,
    pub new_readings: CreateDipRequest,
    pub operator_id: i64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DipCorrection {
    pub id: i64,
    pub dip_record_id: i64,
    pub field_name: String,
    pub old_value: Option<String>,
    pub new_value: String,
    pub reason: Option<String>,
    pub requested_by: i64,
    pub approved_by: Option<i64>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionRequest {
    pub dip_record_id: i64,
    pub fields: Vec<CorrectionField>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionField {
    pub field_name: String,
    pub old_value: Option<String>,
    pub new_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftClosing {
    pub id: i64,
    pub date: String,
    pub shift_id: i64,
    pub closed_by: i64,
    pub closed_at: String,
    pub closing_remarks: Option<String>,
    pub total_dips: i64,
    pub total_exceptions: i64,
    pub pending_items: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftStatus {
    pub shift_id: i64,
    pub shift_name: String,
    pub total_dips: i64,
    pub pending_review: i64,
    pub pending_approval: i64,
    pub exceptions: i64,
    pub is_closed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToleranceSetting {
    pub id: i64,
    pub tank_id: Option<i64>,
    pub product_id: Option<i64>,
    pub location: Option<String>,
    pub comparison_type: String,
    pub normal_limit: f64,
    pub attention_limit: f64,
    pub recheck_limit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateToleranceRequest {
    pub id: Option<i64>,
    pub tank_id: Option<i64>,
    pub product_id: Option<i64>,
    pub location: Option<String>,
    pub comparison_type: Option<String>,
    pub normal_limit: Option<f64>,
    pub attention_limit: Option<f64>,
    pub recheck_limit: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionRecord {
    pub id: i64,
    pub dip_record_id: i64,
    pub tank_id: i64,
    pub exception_type: String,
    pub severity: String,
    pub actual_value: Option<String>,
    pub expected_tolerance: Option<String>,
    pub status: String,
    pub resolution: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: i64,
    pub timestamp: String,
    pub user_id: Option<i64>,
    pub role: Option<String>,
    pub action: String,
    pub record_id: Option<i64>,
    pub tank_no: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub reason: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogFilter {
    pub user_id: Option<i64>,
    pub action: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub record_id: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationSetting {
    pub key: String,
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub active_tanks: i64,
    pub dips_completed: i64,
    pub dips_pending: i64,
    pub awaiting_review: i64,
    pub recheck_required: i64,
    pub abnormal_diff: i64,
    pub approved: i64,
    pub shift_closing_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub created_at: String,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}
