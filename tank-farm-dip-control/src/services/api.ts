import { invoke } from '@tauri-apps/api/core';
import type {
  UserSession,
  User,
  DashboardStats,
  AttentionItem,
  DipRecord,
  DipRecordWithRelations,
  DipCorrection,
  DipRecheck,
  Tank,
  Product,
  Operator,
  TankStatus,
  AuditLog,
  ShiftClosing,
  ShiftStatus,
  ToleranceSetting,
  Exception,
  BackupInfo,
} from '../types';

export interface CreateDipPayload {
  date: string;
  time: string;
  shift_id: number;
  tank_id: number;
  product_id: number;
  reference_point_snapshot?: string | null;
  gross_dip_mm: number;
  auto_dip_mm?: number | null;
  radar_dip_mm?: number | null;
  water_dip_mm: number;
  sludge_dip_mm: number;
  temperature: number;
  temperature_unit: 'C' | 'F';
  density: number;
  tank_status_id: number;
  custom_tank_status?: string;
  operator_id: number;
  remarks?: string;
}

// ── Bootstrap / Auth ──

export async function isBootstrapRequired(): Promise<boolean> {
  return invoke('is_bootstrap_required');
}

export async function bootstrapAdmin(data: {
  username: string;
  fullName: string;
  password: string;
}): Promise<UserSession> {
  return invoke('bootstrap_admin', data);
}

export async function login(username: string, password: string): Promise<UserSession> {
  return invoke('login', { username, password });
}

export async function logout(): Promise<void> {
  return invoke('logout');
}

export async function getCurrentUser(): Promise<UserSession | null> {
  return invoke('get_current_user');
}

export async function createUser(data: {
  username: string;
  full_name: string;
  password: string;
  role: string;
}): Promise<User> {
  return invoke('create_user', { data });
}

export async function listUsers(): Promise<User[]> {
  return invoke('list_users');
}

export async function toggleUserActive(userId: number): Promise<User> {
  return invoke('toggle_user_active', { userId });
}

// ── Dashboard ──

export async function getDashboardStats(): Promise<DashboardStats> {
  return invoke('get_dashboard_stats');
}

export async function getAttentionList(): Promise<AttentionItem[]> {
  return invoke('get_attention_list');
}

// ── Dip Records ──

export async function createDipRecord(data: CreateDipPayload): Promise<DipRecord> {
  return invoke('create_dip_record', { data });
}

export async function getDipRecord(id: number): Promise<DipRecord> {
  return invoke('get_dip_record', { id });
}

export async function submitDipRecord(id: number): Promise<DipRecord> {
  return invoke('submit_dip_record', { id });
}

export async function checkDuplicateDip(
  tankId: number,
  date: string,
  time: string,
  shiftId: number,
): Promise<string> {
  return invoke('check_duplicate_dip', { tankId, date, time, shiftId });
}

export async function listDipRecords(filters?: {
  date_from?: string;
  date_to?: string;
  shift_id?: number;
  tank_id?: number;
  review_status?: string;
  approval_status?: string;
  record_status?: string;
  operator_id?: number;
  limit?: number;
  offset?: number;
}): Promise<DipRecordWithRelations[]> {
  return invoke('list_dip_records_with_relations', { filters: filters ?? {} });
}

export async function requestCorrection(
  id: number,
  fields: Array<{ field_name: string; old_value?: string | null; new_value: string }>,
  reason: string,
): Promise<DipCorrection> {
  return invoke('request_correction', { id, fields, reason });
}

export async function listDipCorrections(dipId: number): Promise<DipCorrection[]> {
  return invoke('list_dip_corrections', { dipId });
}

// ── Verification / Recheck ──

export async function reviewDip(dipId: number, action: string, remarks?: string): Promise<unknown> {
  return invoke('review_dip', { dipId, action, remarks });
}

export async function getPendingReviews(): Promise<DipRecordWithRelations[]> {
  return invoke('get_pending_reviews');
}

export async function recheckDip(
  originalId: number,
  newReadings: CreateDipPayload,
  operatorId: number,
  remarks?: string,
): Promise<DipRecheck> {
  return invoke('recheck_dip', { originalId, newReadings, operatorId, remarks });
}

export async function approveRecheck(dipId: number): Promise<DipRecheck> {
  return invoke('approve_recheck', { dipId });
}

export async function approveCorrection(correctionId: number): Promise<DipCorrection> {
  return invoke('approve_correction', { correctionId });
}

// ── Tank Master ──

export async function createTank(data: Partial<Tank>): Promise<Tank> {
  return invoke('create_tank', { data });
}

export async function updateTank(id: number, data: Partial<Tank>): Promise<Tank> {
  return invoke('update_tank', { id, data });
}

export async function deleteTank(id: number): Promise<void> {
  return invoke('deactivate_tank', { id });
}

export async function getTank(id: number): Promise<Tank> {
  return invoke('get_tank', { id });
}

export async function listTanks(): Promise<Tank[]> {
  return invoke('list_tanks');
}

export async function listActiveTanks(): Promise<Tank[]> {
  const all = await listTanks();
  return all.filter((t) => Boolean(t.active));
}

// ── Product Master ──

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return invoke('create_product', { data });
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  return invoke('update_product', { id, data });
}

export async function deleteProduct(id: number): Promise<void> {
  return invoke('deactivate_product', { id });
}

export async function listProducts(): Promise<Product[]> {
  return invoke('list_products');
}

export async function listActiveProducts(): Promise<Product[]> {
  const all = await listProducts();
  return all.filter((p) => Boolean(p.active));
}

// ── Operator Master ──

export async function createOperator(data: Partial<Operator>): Promise<Operator> {
  return invoke('create_operator', { data });
}

export async function updateOperator(id: number, data: Partial<Operator>): Promise<Operator> {
  return invoke('update_operator', { id, data });
}

export async function deleteOperator(id: number): Promise<void> {
  return invoke('deactivate_operator', { id });
}

export async function listOperators(): Promise<Operator[]> {
  return invoke('list_operators');
}

export async function listActiveOperators(): Promise<Operator[]> {
  const all = await listOperators();
  return all.filter((o) => Boolean(o.active));
}

// ── Tank Status Master ──

export async function createTankStatus(name: string, displayOrder: number, allowCustom: number): Promise<TankStatus> {
  return invoke('create_tank_status', { name, displayOrder, allowCustom });
}

export async function updateTankStatus(id: number, name: string, displayOrder: number, allowCustom: number): Promise<TankStatus> {
  return invoke('update_tank_status', { id, name, displayOrder, allowCustom });
}

export async function deleteTankStatus(id: number): Promise<void> {
  return invoke('deactivate_tank_status', { id });
}

export async function listTankStatuses(): Promise<TankStatus[]> {
  return invoke('list_tank_statuses');
}

// ── Shift Closing ──

export async function getShiftStatus(): Promise<ShiftStatus[]> {
  return invoke('get_shift_status');
}

export async function closeShift(shiftId: number, remarks?: string): Promise<ShiftClosing> {
  return invoke('close_shift', { shiftId, remarks });
}

export async function getShiftClosingHistory(): Promise<ShiftClosing[]> {
  return invoke('get_shift_closing_history');
}

// ── Audit ──

export async function getAuditLogs(filters?: {
  date_from?: string;
  date_to?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  return invoke('get_audit_logs', { filters: filters ?? {} });
}

// ── Backup ──

export async function createBackup(): Promise<string> {
  return invoke('create_backup');
}

export async function restoreBackup(filename: string): Promise<void> {
  return invoke('restore_backup', { filename });
}

export async function getBackupInfo(): Promise<BackupInfo[]> {
  return invoke('get_backup_info');
}

export async function exportReportCsv(filename: string, content: string): Promise<string> {
  return invoke('export_report_csv', { filename, content });
}

// ── Settings / Tolerances ──

export async function getTolerances(): Promise<ToleranceSetting[]> {
  return invoke('get_tolerances');
}

export async function saveTolerance(data: Partial<ToleranceSetting> & {
  comparison_type?: string;
  normal_limit?: number;
  attention_limit?: number;
  recheck_limit?: number;
}): Promise<ToleranceSetting> {
  return invoke('update_tolerance', { data });
}

export async function getAppSettings(): Promise<Record<string, string>> {
  const rows = await invoke<Array<{ key: string; value: string | null }>>('get_app_settings');
  const record: Record<string, string> = {};
  for (const row of rows) {
    record[row.key] = row.value ?? '';
  }
  return record;
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
  await invoke('update_app_setting', { key, value });
}

export async function seedSampleData(): Promise<string> {
  return invoke('seed_sample_data');
}

// ── Exceptions ──

export async function listExceptions(filters?: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<Exception[]> {
  return invoke('list_exceptions', { filters: filters ?? {} });
}

export async function resolveException(id: number, resolution: string): Promise<Exception> {
  return invoke('resolve_exception', { id, resolution });
}
