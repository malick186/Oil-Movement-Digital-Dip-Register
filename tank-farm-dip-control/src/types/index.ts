export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'Shift Supervisor' | 'Shift In-Charge' | 'Administrator';
  active: boolean;
}

export interface UserSession {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
}

export interface Tank {
  id: number;
  tank_no: string;
  location: string;
  tank_farm: string;
  normal_product: string;
  current_product: string;
  reference_point: string;
  tank_type: string;
  roof_type: string;
  safe_fill_height: number | null;
  min_operating_level: number | null;
  ref_gauge_height: number | null;
  datum_height: number | null;
  working_capacity: number | null;
  radar_available: boolean;
  auto_dip_available: boolean;
  water_dip_applicable: boolean;
  sludge_dip_applicable: boolean;
  active: boolean;
  remarks: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  category: string;
  active: boolean;
  remarks: string;
}

export interface Operator {
  id: number;
  employee_id: string;
  name: string;
  designation: string;
  location: string;
  shift_group: string;
  active: boolean;
  remarks: string;
}

export interface TankStatus {
  id: number;
  name: string;
  display_order: number;
  active: boolean;
  allow_custom: boolean;
}

export interface DipRecord {
  id: number;
  record_number: string;
  date: string;
  time: string;
  shift_id: number;
  tank_id: number;
  product_id: number;
  reference_point_snapshot: string | null;
  gross_dip_mm: number | null;
  auto_dip_mm: number | null;
  radar_dip_mm: number | null;
  water_dip_mm: number | null;
  sludge_dip_mm: number | null;
  temperature: number | null;
  temperature_unit: string | null;
  density: number | null;
  tank_status_id: number | null;
  custom_tank_status: string | null;
  operator_id: number;
  remarks: string | null;
  gross_auto_difference: number | null;
  gross_radar_difference: number | null;
  auto_radar_difference: number | null;
  entered_by: number;
  entered_at: string;
  review_status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  approval_status: string;
  approved_by: number | null;
  approved_at: string | null;
  record_status: string;
}

export interface DipRecordWithRelations extends DipRecord {
  tank_no: string;
  product_name: string;
  tank_status_name: string;
  operator_name: string;
  entered_by_name: string;
  location: string;
}

export interface DipRecheck {
  id: number;
  original_dip_id: number;
  recheck_dip_id: number | null;
  recheck_operator_id: number;
  recheck_remarks: string | null;
  reviewer_id: number | null;
  final_decision: string | null;
  created_at: string;
}

export interface DipCorrection {
  id: number;
  dip_record_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string;
  reason: string | null;
  requested_by: number;
  approved_by: number | null;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  active_tanks: number;
  dips_completed: number;
  dips_pending: number;
  awaiting_review: number;
  recheck_required: number;
  abnormal_diff: number;
  approved: number;
  shift_closing_status: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  role: string;
  action: string;
  record_id: number | null;
  tank_no: string;
  old_value: string;
  new_value: string;
  reason: string;
  remarks: string;
}

export interface ShiftClosing {
  id: number;
  date: string;
  shift_id: number;
  closed_by: number;
  closed_at: string;
  closing_remarks: string;
  total_dips: number;
  total_exceptions: number;
  pending_items: number;
  status: string;
}

export interface ToleranceSetting {
  id: number;
  tank_id: number | null;
  product_id: number | null;
  location: string | null;
  comparison_type: string;
  normal_limit: number;
  attention_limit: number;
  recheck_limit: number;
}

export interface Exception {
  id: number;
  dip_record_id: number | null;
  tank_id: number | null;
  exception_type: string;
  severity: string;
  actual_value: string;
  expected_tolerance: string;
  status: string;
  resolution: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ShiftStatus {
  shift_id: number;
  shift_name: string;
  total_dips: number;
  pending_review: number;
  pending_approval: number;
  exceptions: number;
  is_closed: boolean;
}

export interface BackupInfo {
  filename: string;
  created_at: string;
  file_size: number;
}

export interface AttentionItem {
  dip_id: number;
  tank_id: number;
  record_number: string;
  tank_no: string;
  product_name: string;
  gross_dip_mm: number | null;
  auto_dip_mm: number | null;
  radar_dip_mm: number | null;
  gross_auto_difference: number | null;
  gross_radar_difference: number | null;
  tank_status_name: string;
  review_status: string;
  last_gauged: string;
}

export type Page =
  | 'dashboard'
  | 'new-dip'
  | 'dip-verification'
  | 'shift-closing'
  | 'tank-status'
  | 'exceptions'
  | 'dip-history'
  | 'tank-trends'
  | 'reports'
  | 'tank-master'
  | 'product-master'
  | 'operator-master'
  | 'tank-status-master'
  | 'users'
  | 'settings'
  | 'backup-restore'
  | 'audit-log';
