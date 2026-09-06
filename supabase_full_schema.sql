-- ==============================================================================
-- SHYAM TEXTILE — COMPLETE CLEAN DATABASE SCHEMA
-- Purpose: 
--   1. Drops all old/legacy tables, views, and triggers (Clean Reset).
--   2. Creates the optimized production schema for meters-only textile operations.
--   3. Sets up constraints, foreign keys, performance indexes, and RLS policies.
--   4. Syncs existing Supabase Auth users to public.users as Admin.
--
-- Instructions:
--   Open Supabase -> SQL Editor -> Click "New query" -> Paste everything -> Run (Cmd/Ctrl + Enter).
-- ==============================================================================

-- ==============================================================================
-- STEP 1: CLEAN SLATE (DROP EXISTING OBJECTS)
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- Drop all tables in dependency order (CASCADE handles any straggling foreign keys)
DROP TABLE IF EXISTS backup_log CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS payment_adjustments CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS worker_advances CASCADE;
DROP TABLE IF EXISTS payroll_record_lines CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS production_entries CASCADE;
DROP TABLE IF EXISTS machine_rates CASCADE;
DROP TABLE IF EXISTS worker_machine_assignments CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- ==============================================================================
-- STEP 2: UTILITY FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Automatically updates updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- STEP 3: CORE TABLES
-- ==============================================================================

-- 1. USERS (Profiles linked to Supabase auth.users)
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT DEFAULT 'managed-by-supabase-auth',
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner', 'supervisor')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. WORKERS (Loom operators & factory workers)
CREATE TABLE workers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. MACHINES (Looms identified by machine_number)
CREATE TABLE machines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_number TEXT NOT NULL UNIQUE,
  name           TEXT DEFAULT '',
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 4. WORKER MACHINE ASSIGNMENTS (Maps which worker operates which machine)
CREATE TABLE worker_machine_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  machine_id  UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  CONSTRAINT uq_worker_machine_assignment UNIQUE (worker_id, machine_id)
);


-- 5. MACHINE RATES (Historical & current rate per meter for machines)
CREATE TABLE machine_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id     UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  rate_per_meter NUMERIC(10, 4) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 6. PRODUCTION ENTRIES (Daily meter logs with Shift tracking)
CREATE TABLE production_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  meters_produced NUMERIC(12, 2) NOT NULL CHECK (meters_produced > 0),
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift           TEXT NOT NULL DEFAULT 'day' CHECK (shift IN ('day', 'night')),
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  rate_applied    NUMERIC(10, 4) NOT NULL DEFAULT 0,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  entered_by      UUID CONSTRAINT production_entries_entered_by_fkey REFERENCES users(id),
  notes           TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_production_entries_updated_at
  BEFORE UPDATE ON production_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 7. PAYROLL PERIODS (Optional tracking periods)
CREATE TABLE payroll_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  payment_due_date DATE,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'finalized', 'paid', 'reopened')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 8. PAYROLL RECORDS (Worker summaries for a period)
CREATE TABLE payroll_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  total_meters      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status    TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid')),
  paid_on           TIMESTAMPTZ,
  paid_by           UUID REFERENCES users(id),
  finalized_at      TIMESTAMPTZ,
  finalized_by      UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payroll_period_worker UNIQUE (payroll_period_id, worker_id)
);

CREATE TRIGGER trg_payroll_records_updated_at
  BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 9. PAYROLL RECORD LINES (Detailed breakdown per machine per period)
CREATE TABLE payroll_record_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id   UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  meters_produced     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rate_per_meter      NUMERIC(10, 4) NOT NULL DEFAULT 0,
  amount              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  production_entry_id UUID REFERENCES production_entries(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 10. WORKER ADVANCES (Tracks advances given to workers)
CREATE TABLE worker_advances (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id                     UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount                        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  reason                        TEXT,
  given_by                      UUID CONSTRAINT worker_advances_given_by_fkey REFERENCES users(id),
  deducted_in_payroll_record_id UUID REFERENCES payroll_records(id) ON DELETE SET NULL,
  status                        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deducted', 'cancelled')),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_worker_advances_updated_at
  BEFORE UPDATE ON worker_advances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 11. PAYMENT HISTORY (Audit log of payments made)
CREATE TABLE payment_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount_paid       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by           UUID CONSTRAINT payment_history_paid_by_fkey REFERENCES users(id),
  payment_method    TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'upi')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 12. PAYMENT ADJUSTMENTS
CREATE TABLE payment_adjustments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_history_id UUID NOT NULL REFERENCES payment_history(id) ON DELETE CASCADE,
  worker_id          UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  adjustment_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reason             TEXT NOT NULL,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 13. AUDIT LOG (Tracks all changes for traceability)
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 14. BACKUP LOG
CREATE TABLE backup_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type             TEXT NOT NULL DEFAULT 'daily',
  status           TEXT NOT NULL DEFAULT 'success',
  storage_location TEXT,
  encrypted        BOOLEAN NOT NULL DEFAULT false,
  size_bytes       BIGINT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- STEP 4: PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX idx_production_entries_date_machine_shift 
  ON production_entries(production_date, machine_id, shift);

CREATE INDEX idx_production_entries_worker_date 
  ON production_entries(worker_id, production_date);

CREATE INDEX idx_production_entries_shift 
  ON production_entries(shift);

CREATE INDEX idx_production_entries_is_deleted 
  ON production_entries(is_deleted);

CREATE INDEX idx_wma_worker_id 
  ON worker_machine_assignments(worker_id);

CREATE INDEX idx_wma_machine_id 
  ON worker_machine_assignments(machine_id);

CREATE INDEX idx_machine_rates_lookup 
  ON machine_rates(machine_id, effective_from, effective_to);

CREATE INDEX idx_payroll_records_period 
  ON payroll_records(payroll_period_id);

CREATE INDEX idx_payroll_records_worker 
  ON payroll_records(worker_id);

CREATE INDEX idx_worker_advances_worker_status 
  ON worker_advances(worker_id, status);

CREATE INDEX idx_payment_history_payroll 
  ON payment_history(payroll_record_id);

CREATE INDEX idx_audit_log_created_at 
  ON audit_log(created_at DESC);


-- ==============================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_machine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_record_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (App server actions handle role-based permissions)
CREATE POLICY "authenticated_full_access_users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_workers" ON workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_machines" ON machines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_assignments" ON worker_machine_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_rates" ON machine_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_production" ON production_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_payroll_periods" ON payroll_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_payroll_records" ON payroll_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_payroll_lines" ON payroll_record_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_advances" ON worker_advances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_payments" ON payment_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_adjustments" ON payment_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_audit" ON audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access_backup" ON backup_log FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- STEP 6: AUTH USER SYNC (AUTO-PROFILE CREATION)
-- ==============================================================================

-- Trigger function: When a user is created in auth.users, create their public.users row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Sync any existing auth.users directly into public.users as Admin
INSERT INTO public.users (id, name, email, role, active)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  COALESCE(raw_user_meta_data->>'role', 'admin'),
  true
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Verification notice
SELECT count(*) AS total_synced_users FROM public.users;
