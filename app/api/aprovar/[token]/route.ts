import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;

  if (action !== 'aprovar' && action !== 'reprovar') {
    return NextResponse.redirect(new URL(`/aprovar/${token}`, request.url));
  }

  const supabase = createServiceClient();

  await supabase
    .from('editorial_posts')
    .update({
      status: action === 'aprovar' ? 'aprovado' : 'rascunho',
      approved_at: new Date().toISOString(),
      approval_note: action === 'reprovar' ? note : null,
    })
    .eq('approval_token', token);

  return NextResponse.redirect(new URL(`/aprovar/${token}`, request.url));
}
