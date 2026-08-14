-- ============================================================
-- Migration: Worker Machine Assignments
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the worker_machine_assignments table
CREATE TABLE IF NOT EXISTS worker_machine_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  machine_id  UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE (worker_id, machine_id)   -- prevent duplicates
);

-- 2. Index for fast lookup by worker
CREATE INDEX IF NOT EXISTS idx_wma_worker_id ON worker_machine_assignments(worker_id);

-- 3. Enable Row Level Security (match your existing pattern)
ALTER TABLE worker_machine_assignments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — allow all authenticated users to read, only admins to write
CREATE POLICY "Authenticated users can read assignments"
  ON worker_machine_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert assignments"
  ON worker_machine_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete assignments"
  ON worker_machine_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
