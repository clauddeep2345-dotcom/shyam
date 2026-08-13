// seed-data.mjs
// Run with: node seed-data.mjs
//
// This script:
// 1. Clears all existing sample transactional data
// 2. Fetches real workers and machines from the DB
// 3. Fetches machine rates from the DB (uses real rates)
// 4. Inserts 2 months of realistic daily production entries
//
// Requirements: npm install @supabase/supabase-js (already installed in project)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptatdmcgwfltrjgzlfhm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXRkbWNnd2ZsdHJqZ3psZmhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ3MjQ4NSwiZXhwIjoyMTAyMDQ4NDg1fQ.gNhE7rUr1WmtwnZeFl_Y6N9vrH4tokItnYEbXHWu7MU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: random float between min and max, rounded to 2 decimals
function randFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Helper: add days to a date string (YYYY-MM-DD) — UTC-safe
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split('T')[0];
}

// Helper: subtract days from today — UTC-safe
function subDays(days) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  return date.toISOString().split('T')[0];
}

// Look up the rate for a machine on a given date from a rates array
function lookupRate(rates, machineId, dateStr) {
  // Find the most recently effective rate on or before dateStr
  const applicable = rates
    .filter(r => r.machine_id === machineId && r.effective_from <= dateStr)
    .filter(r => !r.effective_to || r.effective_to >= dateStr)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return applicable[0]?.rate_per_meter ?? null;
}

async function main() {
  console.log('🚀 Starting seed process...\n');

  // ── Step 1: Fetch real workers and machines ──────────────────────────────
  const { data: workers, error: wErr } = await supabase
    .from('workers')
    .select('id, name, active')
    .eq('active', true);
  if (wErr) throw new Error('Could not fetch workers: ' + wErr.message);
  if (!workers || workers.length === 0) throw new Error('No active workers found. Please add workers first.');

  const { data: machines, error: mErr } = await supabase
    .from('machines')
    .select('id, machine_number, active')
    .eq('active', true);
  if (mErr) throw new Error('Could not fetch machines: ' + mErr.message);
  if (!machines || machines.length === 0) throw new Error('No active machines found. Please add machines first.');

  const { data: rates, error: rErr } = await supabase
    .from('machine_rates')
    .select('machine_id, rate_per_meter, effective_from, effective_to');
  if (rErr) throw new Error('Could not fetch rates: ' + rErr.message);
  if (!rates || rates.length === 0) throw new Error('No machine rates found. Please add rates first.');

  // Fetch one admin user to use as entered_by
  const { data: adminUser, error: uErr } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();
  if (uErr || !adminUser) throw new Error('No admin user found.');

  console.log(`✅ Found ${workers.length} workers, ${machines.length} machines, ${rates.length} rate records`);
  console.log(`✅ Using admin user ID: ${adminUser.id}\n`);

  // ── Step 2: Clear existing transactional data ────────────────────────────
  console.log('🗑  Clearing existing transactional data...');

  // Order matters due to foreign key constraints
  const tablesToClear = [
    'payment_adjustments',
    'payment_history',
    'payroll_record_lines',
    'payroll_records',
    'payroll_periods',
    'worker_advances',
  ];

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  ⚠ Could not clear ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ Cleared ${table}`);
    }
  }

  // production_entries uses soft-delete (DB trigger prevents hard delete)
  const { error: peErr } = await supabase
    .from('production_entries')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('is_deleted', false);
  if (peErr) {
    console.warn(`  ⚠ Could not soft-delete production_entries: ${peErr.message}`);
  } else {
    console.log(`  ✓ Soft-deleted all production_entries`);
  }
  console.log('');

  // ── Step 3: Generate 2 months of production entries ──────────────────────
  const today = new Date().toISOString().split('T')[0];
  const startDate = subDays(60); // 60 days ago (UTC)

  console.log(`📅 Generating production entries from ${startDate} to ${today}...\n`);

  const entries = [];
  let currentDate = startDate;

  while (currentDate <= today) {
    const dayOfWeek = new Date(currentDate + 'T00:00:00').getDay();

    // Skip Sundays (day 0) about 80% of the time (some workers still work)
    if (dayOfWeek === 0 && Math.random() < 0.8) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Each day: random subset of workers (70-100% attendance)
    const shuffledWorkers = [...workers].sort(() => Math.random() - 0.5);
    const attendanceCount = Math.ceil(workers.length * (0.7 + Math.random() * 0.3));
    const presentWorkers = shuffledWorkers.slice(0, attendanceCount);

    for (const worker of presentWorkers) {
      // Assign a machine (round-robin style with some randomness)
      const machineIndex = (workers.indexOf(worker) + Math.floor(Math.random() * 2)) % machines.length;
      const machine = machines[machineIndex];

      const rate = lookupRate(rates, machine.id, currentDate);
      if (!rate) continue; // skip if no rate for this machine on this date

      // Realistic meters: 50–250 meters per day per worker
      // Use whole numbers to avoid floating point mismatch with Postgres NUMERIC constraint
      const meters = Math.floor(randFloat(50, 250));
      // amount = ROUND(meters * rate, 2) matching Postgres constraint exactly
      const amount = parseFloat((meters * rate).toFixed(2));

      entries.push({
        worker_id: worker.id,
        machine_id: machine.id,
        meters_produced: meters,
        production_date: currentDate,
        entry_date: currentDate,
        rate_applied: rate,
        amount,
        entered_by: adminUser.id,
        notes: null,
        is_deleted: false,
        deleted_by: null,
        deleted_at: null,
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  console.log(`📊 Generated ${entries.length} production entries`);

  // ── Step 4: Insert in batches of 200 ────────────────────────────────────
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('production_entries').insert(batch);
    if (insErr) {
      console.error(`  ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${insErr.message}`);
    } else {
      inserted += batch.length;
      console.log(`  ✓ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${inserted}/${entries.length})`);
    }
  }

  // ── Step 5: Summary ──────────────────────────────────────────────────────
  const totalMeters = entries.reduce((s, e) => s + e.meters_produced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  console.log('\n✅ Seed complete!');
  console.log(`   📊 Total entries: ${inserted}`);
  console.log(`   📏 Total meters: ${totalMeters.toFixed(2)} m`);
  console.log(`   💰 Total value: ₹${totalAmount.toFixed(2)}`);
  console.log(`   📅 Date range: ${startDate} → ${today}`);
  console.log('\n🎉 Done! Refresh the admin dashboard to see the data.\n');
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
