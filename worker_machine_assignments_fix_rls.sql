-- ============================================================
-- FIX: Drop old broken RLS policies and replace with simple ones
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the old restrictive policies that caused the error
DROP POLICY IF EXISTS "Admins can insert assignments" ON worker_machine_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON worker_machine_assignments;
DROP POLICY IF EXISTS "Authenticated users can read assignments" ON worker_machine_assignments;

-- Re-create simple policies:
-- Allow ALL authenticated users full access.
-- Role checks (admin-only) are enforced in the application code, not here.

CREATE POLICY "Allow authenticated full access"
  ON worker_machine_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
