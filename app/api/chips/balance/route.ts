// app/api/chips/balance/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/serviceClient';
import { getChipBalance } from '@/lib/chips/chipService';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    const balance = await getChipBalance(supabaseService, playerId);
    return NextResponse.json(balance);
  } catch (err: any) {
    console.error('[chips/balance] error', err);
    return NextResponse.json(
      { error: err.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
