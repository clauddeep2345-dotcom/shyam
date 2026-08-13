// ============================================================
// Shyam Textile — TypeScript Database Types
// ============================================================

// ---- Enums ----

export type UserRole = 'admin' | 'owner' | 'supervisor';
export type PayrollPeriodStatus = 'open' | 'finalized' | 'paid' | 'reopened';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi';
export type AdvanceStatus = 'pending' | 'deducted' | 'cancelled';
export type BackupType = 'daily' | 'weekly' | 'monthly';
export type BackupStatusType = 'success' | 'failed' | 'in_progress';
export type AuditAction = 'create' | 'update' | 'delete' | 'finalize' | 'reopen' | 'pay' | 'adjust';
export type EntityType = 'user' | 'worker' | 'machine' | 'rate' | 'entry' | 'payroll' | 'payment' | 'advance';

// ---- Table Row Types ----

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string | null;
  joining_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  machine_number: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MachineRate {
  id: string;
  machine_id: string;
  rate_per_meter: number;
  effective_from: string;
  effective_to: string | null;
  created_by: string;
  created_at: string;
}

export interface ProductionEntry {
  id: string;
  worker_id: string;
  machine_id: string;
  meters_produced: number;
  production_date: string;
  entry_date: string;
  rate_applied: number;
  amount: number;
  entered_by: string;
  notes: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  period_start: string;
  period_end: string;
  payment_due_date: string;
  status: PayrollPeriodStatus;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  payroll_period_id: string;
  worker_id: string;
  total_meters: number;
  total_amount: number;
  advance_deduction: number;
  net_amount: number;
  payment_status: PaymentStatus;
  paid_on: string | null;
  paid_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecordLine {
  id: string;
  payroll_record_id: string;
  worker_id: string;
  machine_id: string;
  meters_produced: number;
  rate_per_meter: number;
  amount: number;
  production_entry_id: string;
  created_at: string;
}

export interface PaymentHistoryRow {
  id: string;
  payroll_record_id: string;
  worker_id: string;
  amount_paid: number;
  payment_date: string;
  paid_by: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
}

export interface PaymentAdjustment {
  id: string;
  payment_history_id: string;
  worker_id: string;
  adjustment_amount: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface WorkerAdvance {
  id: string;
  worker_id: string;
  amount: number;
  advance_date: string;
  reason: string | null;
  given_by: string;
  deducted_in_payroll_record_id: string | null;
  status: AdvanceStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface BackupLogRow {
  id: string;
  backup_date: string;
  type: BackupType;
  status: BackupStatusType;
  storage_location: string | null;
  encrypted: boolean;
  size_bytes: number | null;
  error_message: string | null;
  created_at: string;
}

// ---- Insert Types (omitting server-generated fields) ----

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type WorkerInsert = Omit<Worker, 'id' | 'created_at' | 'updated_at'>;
export type MachineInsert = Omit<Machine, 'id' | 'created_at' | 'updated_at'>;
export type MachineRateInsert = Omit<MachineRate, 'id' | 'created_at'>;
export type ProductionEntryInsert = Omit<ProductionEntry, 'id' | 'entry_date' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_by' | 'deleted_at'>;
export type PayrollPeriodInsert = Omit<PayrollPeriod, 'id' | 'created_at'>;
export type PayrollRecordInsert = Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>;
export type PaymentHistoryInsert = Omit<PaymentHistoryRow, 'id' | 'created_at'>;
export type PaymentAdjustmentInsert = Omit<PaymentAdjustment, 'id' | 'created_at'>;
export type WorkerAdvanceInsert = Omit<WorkerAdvance, 'id' | 'created_at' | 'updated_at' | 'deducted_in_payroll_record_id' | 'status'>;

// ---- Update Types (all fields optional except id) ----

export type WorkerUpdate = Partial<Omit<Worker, 'id' | 'created_at' | 'updated_at'>>;
export type MachineUpdate = Partial<Omit<Machine, 'id' | 'created_at' | 'updated_at'>>;
export type ProductionEntryUpdate = Partial<Pick<ProductionEntry, 'worker_id' | 'machine_id' | 'meters_produced' | 'production_date' | 'rate_applied' | 'amount' | 'notes'>>;

// ---- Joined / View Types ----

export interface ProductionEntryWithDetails extends ProductionEntry {
  worker: Pick<Worker, 'id' | 'name'>;
  machine: Pick<Machine, 'id' | 'machine_number' | 'name'>;
  entered_by_user: Pick<User, 'id' | 'name'>;
}

export interface PayrollRecordWithDetails extends PayrollRecord {
  worker: Pick<Worker, 'id' | 'name' | 'phone'>;
  payroll_period: PayrollPeriod;
  lines: PayrollRecordLineWithMachine[];
  payments: PaymentHistoryRow[];
  adjustments: PaymentAdjustment[];
}

export interface PayrollRecordLineWithMachine extends PayrollRecordLine {
  machine: Pick<Machine, 'id' | 'machine_number' | 'name'>;
}

export interface MachineWithCurrentRate extends Machine {
  current_rate: number | null;
  rate_history: MachineRate[];
}

export interface WorkerWithStats extends Worker {
  total_meters: number;
  pending_advances: number;
  total_earnings: number;
}

// ---- Payroll Calculation Types ----

export interface PayrollCalculationLine {
  worker_id: string;
  worker_name: string;
  machine_id: string;
  machine_name: string;
  total_meters: number;
  rate_per_meter: number;
  total_amount: number;
  entry_count: number;
}

export interface PayrollWorkerSummary {
  worker_id: string;
  worker_name: string;
  lines: PayrollCalculationLine[];
  total_meters: number;
  total_amount: number;
  advance_deduction: number;
  net_amount: number;
}

// ---- Dashboard Stats Types ----

export interface DashboardStats {
  total_meters_today: number;
  total_meters_period: number;
  active_workers: number;
  active_machines: number;
  pending_payroll_amount: number;
  entries_today: number;
}

export interface ProductionTrendPoint {
  production_date: string;
  total_meters: number;
  entry_count: number;
  worker_count: number;
  machine_count: number;
}

// ---- Export Types ----

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  title: string;
  dateRange?: { from: string; to: string };
  filters?: Record<string, string>;
}
