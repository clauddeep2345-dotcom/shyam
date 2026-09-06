import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptatdmcgwfltrjgzlfhm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXRkbWNnd2ZsdHJqZ3psZmhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ3MjQ4NSwiZXhwIjoyMTAyMDQ4NDg1fQ.gNhE7rUr1WmtwnZeFl_Y6N9vrH4tokItnYEbXHWu7MU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const WORKER_NAMES = [
  'Ramesh Patel',
  'Mukesh Kumar',
  'Bharat Prajapati',
  'Suresh Yadav',
  'Nareshbhai',
  'Kamlesh Rajput',
  'Rajesh Sharma',
  'Sanjay Solanki',
  'Hasmukhbhai',
  'Jignesh Varma',
  'Pareshbhai',
];

async function seed() {
  console.log('🚀 Starting 2-Month Realistic Production Data Seeding...\n');

  // 1. Fetch admin user
  const { data: adminUser } = await supabase.from('users').select('id').eq('email', 'admin@shyamtextile.com').single();
  const adminId = adminUser?.id || null;

  // 2. Insert/Ensure Workers
  const { data: existingWorkers } = await supabase.from('workers').select('id, name');
  const existingMap = new Map((existingWorkers || []).map(w => [w.name.toLowerCase(), w.id]));

  const workersToInsert = [];
  WORKER_NAMES.forEach((name, idx) => {
    if (!existingMap.has(name.toLowerCase())) {
      workersToInsert.push({
        name,
        phone: `98765${String(10000 + idx).slice(-5)}`,
        joining_date: '2026-01-15',
        active: true,
      });
    }
  });

  if (workersToInsert.length > 0) {
    const { data: inserted, error: wErr } = await supabase.from('workers').insert(workersToInsert).select('id, name');
    if (wErr) console.error('Error adding workers:', wErr.message);
    else console.log(`✅ Added ${inserted.length} new workers.`);
  }

  // Reload all workers
  const { data: allWorkers } = await supabase.from('workers').select('id, name').eq('active', true).order('name');
  console.log(`📋 Total active workers available: ${allWorkers.length}`);

  // 3. Fetch all 68 machines
  const { data: allMachines } = await supabase.from('machines').select('id, machine_number').eq('active', true);
  
  // Sort naturally 1..64, then A..D
  allMachines.sort((a, b) => {
    const aNum = parseInt(a.machine_number, 10);
    const bNum = parseInt(b.machine_number, 10);
    if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    if (!isNaN(aNum) && isNaN(bNum)) return -1;
    if (isNaN(aNum) && !isNaN(bNum)) return 1;
    return a.machine_number.localeCompare(b.machine_number);
  });
  console.log(`⚙️ Total active machines available: ${allMachines.length}`);

  // 4. Assign machines across workers
  // Distribute machines evenly (each worker gets 5-6 machines)
  const assignments = [];
  allMachines.forEach((mach, idx) => {
    const worker = allWorkers[idx % allWorkers.length];
    assignments.push({
      worker_id: worker.id,
      machine_id: mach.id,
      assigned_by: adminId,
    });
  });

  await supabase.from('worker_machine_assignments').upsert(assignments, { onConflict: 'worker_id,machine_id' });
  console.log(`🔗 Created ${assignments.length} worker-machine assignments.`);

  // 5. Generate Dates: 2026-07-01 to 2026-09-06 (~68 days)
  const startDate = new Date(2026, 6, 1); // July 1, 2026
  const endDate = new Date(2026, 8, 6);   // September 6, 2026

  const dateList = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    dateList.push(`${yyyy}-${mm}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  console.log(`📅 Generated date range: ${dateList[0]} to ${dateList[dateList.length - 1]} (${dateList.length} days)`);

  // 6. Generate Realistic Production Entries
  // A consistent factory operates machines on Day Shift and a subset on Night Shift.
  // Each machine has consistent worker assignments.
  const entries = [];
  
  // Seeded pseudorandom generator for consistent realistic numbers
  let seedVal = 42;
  function random() {
    seedVal = (seedVal * 16807) % 2147483647;
    return (seedVal - 1) / 2147483646;
  }

  for (const dateStr of dateList) {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday

    // Sunday has lower machine operations (maintenance day)
    const isSunday = dayOfWeek === 0;

    for (let mIdx = 0; mIdx < allMachines.length; mIdx++) {
      const mach = allMachines[mIdx];
      const assignedWorker = allWorkers[mIdx % allWorkers.length];

      // On Sunday, only 40% of machines run; on weekdays 85% run
      const runProbability = isSunday ? 0.40 : 0.88;
      if (random() > runProbability) continue;

      // Day Shift Entry
      // Meters between 380 and 560
      const dayMeters = Math.round((400 + random() * 150) * 100) / 100;
      entries.push({
        worker_id: assignedWorker.id,
        machine_id: mach.id,
        meters_produced: dayMeters,
        production_date: dateStr,
        shift: 'day',
        entry_date: dateStr,
        entered_by: adminId,
        rate_applied: 0,
        amount: 0,
      });

      // Night Shift Entry (approx 65% of running machines have night shift)
      if (random() < 0.65) {
        // Alternate worker or same worker's night shift colleague
        const nightWorkerIdx = (mIdx + 1) % allWorkers.length;
        const nightWorker = allWorkers[nightWorkerIdx];
        const nightMeters = Math.round((360 + random() * 140) * 100) / 100;

        entries.push({
          worker_id: nightWorker.id,
          machine_id: mach.id,
          meters_produced: nightMeters,
          production_date: dateStr,
          shift: 'night',
          entry_date: dateStr,
          entered_by: adminId,
          rate_applied: 0,
          amount: 0,
        });
      }
    }
  }

  console.log(`📦 Total entries prepared: ${entries.length}`);

  // Insert in batches of 400 to ensure fast network transmission
  const BATCH_SIZE = 400;
  let totalInserted = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('production_entries').insert(chunk);
    if (insErr) {
      console.error(`Batch insert error at ${i}:`, insErr.message);
      break;
    }
    totalInserted += chunk.length;
    process.stdout.write(`\r⏳ Inserted ${totalInserted} / ${entries.length} entries...`);
  }

  console.log(`\n\n🎉 Successfully inserted ${totalInserted} production entries over 2 months!`);

  // Verification stats
  const { count: finalCount } = await supabase.from('production_entries').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
  const { data: meterSumData } = await supabase.from('production_entries').select('meters_produced').eq('is_deleted', false);
  const totalMeters = (meterSumData || []).reduce((s, e) => s + Number(e.meters_produced), 0);

  console.log('\n📊 SEEDING SUMMARY:');
  console.log(`- Active Workers: ${allWorkers.length}`);
  console.log(`- Active Machines: ${allMachines.length}`);
  console.log(`- Total Production Entries: ${finalCount}`);
  console.log(`- Total Fabric Produced: ${totalMeters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} meters`);
  console.log('- Date Range: July 1, 2026 to September 6, 2026 (July, August, September covered)');
}

seed();
