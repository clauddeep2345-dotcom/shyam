-- ============================================================
-- Migration: Add Shift (Day / Night) to Production Entries
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add shift column to production_entries (defaults to 'day')
ALTER TABLE production_entries 
ADD COLUMN IF NOT EXISTS shift TEXT NOT NULL DEFAULT 'day';

-- 2. Add check constraint to ensure only 'day' or 'night' are allowed
ALTER TABLE production_entries
DROP CONSTRAINT IF EXISTS production_entries_shift_check;

ALTER TABLE production_entries 
ADD CONSTRAINT production_entries_shift_check CHECK (shift IN ('day', 'night'));

-- 3. Create index for fast shift filtering and reporting
CREATE INDEX IF NOT EXISTS idx_production_entries_shift ON production_entries(shift);
