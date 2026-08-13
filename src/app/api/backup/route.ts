import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/actions/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createClient();

  const tables = [
    'workers', 
    'machines', 
    'production_entries', 
    'payroll_periods', 
    'payroll_records', 
    'payroll_record_lines', 
    'worker_advances', 
    'payment_history', 
    'payment_adjustments', 
    'machine_rates'
  ];

  const backupData: Record<string, any> = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      return new NextResponse(`Error fetching ${table}: ${error.message}`, { status: 500 });
    }
    backupData[table] = data;
  }

  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  
  return new NextResponse(JSON.stringify(backupData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="sachu-db-backup-${dateStr}.json"`,
    },
  });
}
