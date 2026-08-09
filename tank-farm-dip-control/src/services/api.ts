import { invoke } from '@tauri-apps/api/core';
import type {
  UserSession,
  User,
  DashboardStats,
  AttentionItem,
  DipRecord,
  DipRecordWithRelations,
  Tank,
  Product,
  Operator,
  TankStatus,
  AuditLog,
  ShiftClosing,
  ShiftStatus,
  ToleranceSetting,
  Exception,
} from '../types';

// ── Auth ──

export async function login(username: string, password: string): Promise<UserSession> {
  return invoke('login', { username, password });
}

export async function logout(): Promise<void> {
  return invoke('logout');
}

export async function getCurrentUser(): Promise<UserSession> {
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

export async function createDipRecord(data: {
  date: string;
  time: string;
  shift_id: number;
  tank_id: number;
  product_id: number;
  reference_point_snapshot?: string;
  gross_dip_mm: number;
  auto_dip_mm?: number | null;
  radar_dip_mm?: number | null;
  water_dip_mm: number;
  sludge_dip_mm: number;
  temperature?: number | null;
  temperature_unit: string;
  density?: number | null;
  tank_status_id?: number | null;
  custom_tank_status?: string;
  operator_id: number;
  remarks?: string;
}): Promise<DipRecord> {
  return invoke('create_dip_record', { data });
}

export async function listDipRecords(filters?: {
  date_from?: string;
  date_to?: string;
  tank_id?: number;
  review_status?: string;
  approval_status?: string;
  limit?: number;
  offset?: number;
}): Promise<DipRecordWithRelations[]> {
  return invoke('list_dip_records_with_relations', { filters });
}

// ── Verification ──

export async function reviewDip(dipId: number, action: string, remarks?: string): Promise<DipRecord> {
  return invoke('review_dip', { dipId, action, remarks });
}

export async function getPendingReviews(): Promise<DipRecordWithRelations[]> {
  return invoke('get_pending_reviews');
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
  return all.filter((t) => t.active);
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
  return all.filter((p) => p.active);
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
  return all.filter((o) => o.active);
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
  return invoke('get_audit_logs', { filters });
}

// ── Backup ──

export async function createBackup(): Promise<{ path: string; timestamp: string; size: number }> {
  return invoke('create_backup');
}

export async function restoreBackup(path: string): Promise<void> {
  return invoke('restore_backup', { path });
}

export async function getBackupInfo(): Promise<{ path: string; timestamp: string; size: number }[]> {
  return invoke('get_backup_info');
}

// ── Settings / Tolerances ──

export async function getTolerances(): Promise<ToleranceSetting[]> {
  return invoke('get_tolerances');
}

export async function updateTolerance(id: number, data: Partial<ToleranceSetting>): Promise<ToleranceSetting> {
  return invoke('update_tolerance', { id, data });
}

export async function getAppSettings(): Promise<Record<string, string>> {
  const rows = await invoke<Array<{ key: string; value: string | null }>>('get_app_settings');
  const record: Record<string, string> = {};
  for (const row of rows) {
    record[row.key] = row.value ?? '';
  }
  return record;
}

export async function seedSampleData(): Promise<void> {
  return invoke('seed_sample_data');
}

// ── Exceptions ──

export async function listExceptions(filters?: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<Exception[]> {
  return invoke('list_exceptions', { filters });
}

export async function resolveException(id: number, resolution: string): Promise<Exception> {
  return invoke('resolve_exception', { id, resolution });
}
