// app/api/debug-ws/route.ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_POKER_WS: process.env.NEXT_PUBLIC_POKER_WS || null,
  });
}
