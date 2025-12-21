// app/poker/[roomId]/PokerRoomPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { POKER_ROOMS, PokerRoomConfig } from '@/config/pokerRooms';

const PokerRoomArcade = dynamic(
  () => import('@/components/casino/arcade/PokerRoomArcade'),
  { ssr: false }
);

type ClientProps = {
  params: {
    roomId: string;
  };
};

function makeFallbackRoom(roomId: string): PokerRoomConfig {
  // Minimal “public table” meta when the ID is not in config.
  // This removes gating and lets anyone create tables by sharing a link.
  return {
    id: roomId,
    label: "No Limit Texas Gold Hold’em",
    status: 'live',
    tier: 'low' as any,
    stakes: '50/100',
    description: 'Public table • share the link • sit and play.',
    private: false,
  } as PokerRoomConfig;
}

export default function PokerRoomPageClient({ params }: ClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const roomId = params.roomId;
  const roomMeta: PokerRoomConfig =
    POKER_ROOMS[roomId] ?? makeFallbackRoom(roomId);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white flex items-center justify-center px-4">
        <div className="text-sm text-white/60">Loading poker room…</div>
      </main>
    );
  }

  // If a configured room is not live, still respect that
  // (but all unknown rooms are treated as live public tables)
  const configured = Boolean(POKER_ROOMS[roomId]);
  if (configured && roomMeta.status !== 'live') {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">{roomMeta.label}</h1>
        <p className="text-white/70 text-sm max-w-md text-center">
          This table is not currently live. Status:&nbsp;
          <span className="font-semibold">{roomMeta.status}</span>.
        </p>
        <Link
          href="/poker"
          className="mt-4 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          ← Back to Lobby
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* Tiny back pill overlay (clean exit without footer/header dependency) */}
      <div className="fixed left-3 top-[72px] z-[60]">
        <Link
          href="/poker"
          className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/10"
        >
          ← Lobby
        </Link>
      </div>

      <PokerRoomArcade roomId={roomId} />
    </main>
  );
}
