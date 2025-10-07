import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  const { data, error, count } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact' })
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count, sampleId: data?.[0]?.id ?? null });
}