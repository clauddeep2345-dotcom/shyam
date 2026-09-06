import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptatdmcgwfltrjgzlfhm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXRkbWNnd2ZsdHJqZ3psZmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzI0ODUsImV4cCI6MjEwMjA0ODQ4NX0.Wrzvjwr9ajdF03IdOfz8MGYqs0UOovn2F5fjsvQR394';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXRkbWNnd2ZsdHJqZ3psZmhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ3MjQ4NSwiZXhwIjoyMTAyMDQ4NDg1fQ.gNhE7rUr1WmtwnZeFl_Y6N9vrH4tokItnYEbXHWu7MU';
const BASE_URL = 'http://localhost:3000';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const authSupabase = createClient(SUPABASE_URL, ANON_KEY);

const results = [];
function record(testName, passed, details = '') {
  results.push({ testName, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 SHYAM TEXTILE — FULL COMPREHENSIVE E2E TEST SUITE');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Supabase Authentication
  // ---------------------------------------------------------
  let session = null;
  try {
    const { data, error } = await authSupabase.auth.signInWithPassword({
      email: 'admin@shyamtextile.com',
      password: 'Admin@3604',
    });
    if (error || !data.session) {
      record('1. Authentication via Supabase Auth', false, error?.message);
    } else {
      session = data.session;
      record('1. Authentication via Supabase Auth', true, `User: ${data.user.email} (ID: ${data.user.id})`);
    }
  } catch (e) {
    record('1. Authentication via Supabase Auth', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 2-5: HTTP Route Availability on localhost:3000
  // ---------------------------------------------------------
  try {
    const resLogin = await fetch(`${BASE_URL}/login`);
    const loginHtml = await resLogin.text();
    const hasBrand = loginHtml.includes('SHYAM TEXTILE');
    record('2. Login Page Availability (/login)', resLogin.status === 200 && hasBrand, `Status: ${resLogin.status}, Brand Verified: ${hasBrand}`);

    const resManifest = await fetch(`${BASE_URL}/manifest.webmanifest`);
    const manifestJson = await resManifest.json();
    record('3. PWA Web Manifest (/manifest.webmanifest)', resManifest.status === 200 && manifestJson.name.includes('Shyam Textile'), `Name: ${manifestJson.name}, Display: ${manifestJson.display}`);

    // Check legacy redirects
    const resOwner = await fetch(`${BASE_URL}/owner`, { redirect: 'manual' });
    record('4. Legacy /owner Redirect', resOwner.status === 307 || resOwner.status === 308 || resOwner.status === 302, `Redirect Status: ${resOwner.status} -> ${resOwner.headers.get('location')}`);

    const resSupervisor = await fetch(`${BASE_URL}/supervisor`, { redirect: 'manual' });
    record('5. Legacy /supervisor Redirect', resSupervisor.status === 307 || resSupervisor.status === 308 || resSupervisor.status === 302, `Redirect Status: ${resSupervisor.status} -> ${resSupervisor.headers.get('location')}`);
  } catch (e) {
    record('2-5. HTTP Route Checks', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 6: Machine Fleet Count & Natural Alphanumeric Ordering
  // ---------------------------------------------------------
  let machines = [];
  try {
    const { data, error } = await adminSupabase
      .from('machines')
      .select('id, machine_number, active')
      .eq('active', true);

    if (error) throw error;
    machines = data;

    // Alphanumeric sorting logic
    machines.sort((a, b) => {
      const aNum = parseInt(a.machine_number, 10);
      const bNum = parseInt(b.machine_number, 10);
      if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
      if (!isNaN(aNum) && isNaN(bNum)) return -1;
      if (isNaN(aNum) && !isNaN(bNum)) return 1;
      return a.machine_number.localeCompare(b.machine_number);
    });

    const hasAll68 = machines.length === 68;
    const firstMachine = machines[0]?.machine_number;
    const machine64 = machines[63]?.machine_number;
    const machineA = machines[64]?.machine_number;
    const machineD = machines[67]?.machine_number;

    const correctOrder = firstMachine === '1' && machine64 === '64' && machineA === 'A' && machineD === 'D';
    record('6. Machine Fleet (1-64 & A-D)', hasAll68 && correctOrder, `Total: ${machines.length}, Order: [${firstMachine} ... ${machine64}, ${machineA} ... ${machineD}]`);
  } catch (e) {
    record('6. Machine Fleet Check', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 7: Worker Creation & Machine Assignment
  // ---------------------------------------------------------
  let testWorker = null;
  const testWorkerName = `E2E Tester ${Date.now().toString().slice(-4)}`;
  try {
    const { data: worker, error: workerErr } = await adminSupabase
      .from('workers')
      .insert({
        name: testWorkerName,
        phone: '9876543210',
        active: true,
      })
      .select('id, name')
      .single();

    if (workerErr) throw workerErr;
    testWorker = worker;

    // Assign machine 2 and machine 3
    const mach2 = machines.find(m => m.machine_number === '2');
    const mach3 = machines.find(m => m.machine_number === '3');

    if (mach2 && mach3) {
      const { error: assignErr } = await adminSupabase
        .from('worker_machine_assignments')
        .insert([
          { worker_id: testWorker.id, machine_id: mach2.id },
          { worker_id: testWorker.id, machine_id: mach3.id },
        ]);
      if (assignErr) throw assignErr;
    }

    const { data: assignments } = await adminSupabase
      .from('worker_machine_assignments')
      .select('machine_id')
      .eq('worker_id', testWorker.id);

    record('7. Worker Creation & Machine Assignment', testWorker && assignments?.length === 2, `Worker: ${testWorker.name}, Assigned Machines: ${assignments?.length}`);
  } catch (e) {
    record('7. Worker Creation & Machine Assignment', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 8: Single Production Entry (Day Shift & Night Shift)
  // ---------------------------------------------------------
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  let dayEntryId = null;
  let nightEntryId = null;
  const mach2 = machines.find(m => m.machine_number === '2');

  try {
    if (testWorker && mach2 && session) {
      // Create Day Shift Entry
      const { data: dayData, error: dayErr } = await adminSupabase
        .from('production_entries')
        .insert({
          worker_id: testWorker.id,
          machine_id: mach2.id,
          meters_produced: 520.50,
          production_date: todayStr,
          shift: 'day',
          entry_date: todayStr,
          entered_by: session.user.id,
          rate_applied: 0,
          amount: 0,
        })
        .select('id')
        .single();
      if (dayErr) throw dayErr;
      dayEntryId = dayData.id;

      // Create Night Shift Entry
      const { data: nightData, error: nightErr } = await adminSupabase
        .from('production_entries')
        .insert({
          worker_id: testWorker.id,
          machine_id: mach2.id,
          meters_produced: 480.00,
          production_date: todayStr,
          shift: 'night',
          entry_date: todayStr,
          entered_by: session.user.id,
          rate_applied: 0,
          amount: 0,
        })
        .select('id')
        .single();
      if (nightErr) throw nightErr;
      nightEntryId = nightData.id;

      record('8. Day & Night Shift Production Logging', Boolean(dayEntryId && nightEntryId), `Day: 520.50m (ID: ${dayEntryId?.slice(0, 8)}), Night: 480.00m (ID: ${nightEntryId?.slice(0, 8)})`);
    }
  } catch (e) {
    record('8. Day & Night Shift Production Logging', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 9: Duplicate Entry Detection Query
  // ---------------------------------------------------------
  try {
    if (mach2) {
      const { data: duplicateCheck } = await adminSupabase
        .from('production_entries')
        .select(`
          id,
          meters_produced,
          workers (id, name)
        `)
        .eq('machine_id', mach2.id)
        .eq('production_date', todayStr)
        .eq('shift', 'day')
        .eq('is_deleted', false)
        .limit(1);

      const exists = duplicateCheck && duplicateCheck.length > 0;
      const meters = exists ? Number(duplicateCheck[0].meters_produced) : 0;
      const worker = exists ? duplicateCheck[0].workers?.name : '';

      record('9. Duplicate Entry Detection', exists && meters === 520.50, `Detected Existing Day Entry on Machine 2: ${meters}m by ${worker}`);
    }
  } catch (e) {
    record('9. Duplicate Entry Detection', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 10: Live Dashboard Stats Calculation
  // ---------------------------------------------------------
  try {
    const { data: todayEntries } = await adminSupabase
      .from('production_entries')
      .select('meters_produced, shift, machine_id, worker_id, is_deleted')
      .eq('production_date', todayStr)
      .eq('is_deleted', false);

    let daySum = 0;
    let nightSum = 0;
    for (const e of todayEntries || []) {
      const m = Number(e.meters_produced);
      if (e.shift === 'night') nightSum += m;
      else daySum += m;
    }

    const totalToday = daySum + nightSum;
    const containsOurEntries = daySum >= 520.50 && nightSum >= 480.00;

    record('10. Live Shift Metrics Aggregation', containsOurEntries, `Today Total: ${totalToday.toFixed(2)}m (Day: ${daySum.toFixed(2)}m, Night: ${nightSum.toFixed(2)}m)`);
  } catch (e) {
    record('10. Live Shift Metrics Aggregation', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 11: Production Logs Query & Relations
  // ---------------------------------------------------------
  try {
    const { data: logs } = await adminSupabase
      .from('production_entries')
      .select(`
        id,
        production_date,
        shift,
        meters_produced,
        workers (id, name),
        machines (id, machine_number)
      `)
      .eq('production_date', todayStr)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const foundDay = logs?.some(l => l.id === dayEntryId && l.shift === 'day');
    const foundNight = logs?.some(l => l.id === nightEntryId && l.shift === 'night');

    record('11. Production Log Retrieval & Relations', foundDay && foundNight, `Retrieved ${logs?.length} entries with worker and machine relation joins`);
  } catch (e) {
    record('11. Production Log Retrieval & Relations', false, e.message);
  }

  // ---------------------------------------------------------
  // TEST 12: Soft-Delete Verification
  // ---------------------------------------------------------
  try {
    if (nightEntryId) {
      const { error: delErr } = await adminSupabase
        .from('production_entries')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: session?.user?.id,
        })
        .eq('id', nightEntryId);

      if (delErr) throw delErr;

      // Verify it is excluded from active query
      const { data: activeAfterDel } = await adminSupabase
        .from('production_entries')
        .select('id')
        .eq('id', nightEntryId)
        .eq('is_deleted', false);

      record('12. Soft-Delete Entry Lifecycle', activeAfterDel?.length === 0, `Deleted Entry ${nightEntryId.slice(0, 8)} successfully excluded from active queries`);
    }
  } catch (e) {
    record('12. Soft-Delete Entry Lifecycle', false, e.message);
  }

  // ---------------------------------------------------------
  // CLEANUP: Remove test entries and test worker
  // ---------------------------------------------------------
  try {
    if (dayEntryId) {
      await adminSupabase.from('production_entries').delete().eq('id', dayEntryId);
    }
    if (nightEntryId) {
      await adminSupabase.from('production_entries').delete().eq('id', nightEntryId);
    }
    if (testWorker) {
      await adminSupabase.from('worker_machine_assignments').delete().eq('worker_id', testWorker.id);
      await adminSupabase.from('workers').delete().eq('id', testWorker.id);
    }
    console.log('\n🧹 Cleanup completed: Temporary test records removed.');
  } catch (e) {
    console.error('Cleanup warning:', e.message);
  }

  // ---------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------
  console.log('\n======================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`📊 FINAL RESULT: ${passedCount}/${results.length} TESTS PASSED`);
  if (failedCount === 0) {
    console.log('🎉 ALL SYSTEMS FULLY OPERATIONAL & VERIFIED!');
  } else {
    console.log(`⚠️ ${failedCount} tests failed. See details above.`);
  }
  console.log('======================================================\n');
}

runTests();
