// app/api/chips/grant-demo/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ ok: true, message: 'grant-demo route is alive' });
}
