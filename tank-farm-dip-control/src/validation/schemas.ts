import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const dipEntrySchema = z.object({
  tank_id: z.number().min(1, 'Tank is required'),
  product_id: z.number().min(1, 'Product is required'),
  shift_id: z.number().min(1, 'Shift is required'),
  gross_dip_mm: z.number().min(0, 'Gross dip must be positive'),
  auto_dip_mm: z.number().nullable().optional(),
  radar_dip_mm: z.number().nullable().optional(),
  water_dip_mm: z.number().min(0, 'Water dip must be non-negative'),
  sludge_dip_mm: z.number().min(0, 'Sludge dip must be non-negative'),
  temperature: z.number().nullable().optional(),
  temperature_unit: z.string(),
  density: z.number().nullable().optional(),
  tank_status_id: z.number().nullable().optional(),
  custom_tank_status: z.string().optional(),
  operator_id: z.number().nullable().optional(),
  remarks: z.string().optional(),
});

export type DipEntryFormData = z.infer<typeof dipEntrySchema>;

export const tankSchema = z.object({
  tank_no: z.string().min(1, 'Tank number is required'),
  location: z.string().min(1, 'Location is required'),
  tank_farm: z.string().min(1, 'Tank farm is required'),
  normal_product: z.string().optional(),
  current_product: z.string().optional(),
  reference_point: z.string().optional(),
  tank_type: z.string().optional(),
  roof_type: z.string().optional(),
  safe_fill_height: z.number().nullable().optional(),
  min_operating_level: z.number().nullable().optional(),
  ref_gauge_height: z.number().nullable().optional(),
  datum_height: z.number().nullable().optional(),
  working_capacity: z.number().nullable().optional(),
  radar_available: z.boolean(),
  auto_dip_available: z.boolean(),
  water_dip_applicable: z.boolean(),
  sludge_dip_applicable: z.boolean(),
  active: z.boolean(),
  remarks: z.string().optional(),
});

export type TankFormData = z.infer<typeof tankSchema>;

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  code: z.string().min(1, 'Product code is required'),
  category: z.string().optional(),
  active: z.boolean(),
  remarks: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const operatorSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  location: z.string().optional(),
  shift_group: z.string().optional(),
  active: z.boolean(),
  remarks: z.string().optional(),
});

export type OperatorFormData = z.infer<typeof operatorSchema>;

export const tankStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required'),
  display_order: z.number().int(),
  active: z.boolean(),
  allow_custom: z.boolean(),
});

export type TankStatusFormData = z.infer<typeof tankStatusSchema>;

export const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Shift Supervisor', 'Shift In-Charge', 'Administrator']),
});

export type UserFormData = z.infer<typeof userSchema>;
