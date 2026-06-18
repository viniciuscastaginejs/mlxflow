import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';

// GET /api/dashboard -> mesma agregação usada pela página, em JSON.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await getDashboardData(supabase);
  return NextResponse.json(data);
}
