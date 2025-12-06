// app/poker/[roomId]/PokerRoomPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { POKER_ROOMS, PokerRoomConfig } from '@/config/pokerRooms';

// Client-only poker table component
const PokerRoomArcade = dynamic(
  () => import('@/components/casino/arcade/PokerRoomArcade'),
  { ssr: false }
);

type ClientProps = {
  params: {
    roomId: string;
  };
};

export default function PokerRoomPageClient({ params }: ClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roomId = params.roomId;
  const roomMeta: PokerRoomConfig | undefined = POKER_ROOMS[roomId];

  // While not mounted, show a very simple shell (client-only, no SSR)
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white flex items-center justify-center px-4">
        <div className="text-sm text-white/60">
          Loading poker room…
        </div>
      </main>
    );
  }

  // Now we are fully on the client. No SSR, no hydration.

  if (!roomMeta) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
        <p className="text-white/70 text-sm max-w-md text-center">
          This room ID does not exist or hasn&apos;t been approved yet.
          Ask the team to provision a new table if you think this code should be live.
        </p>
      </main>
    );
  }

  if (roomMeta.status !== 'live') {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">{roomMeta.label}</h1>
        <p className="text-white/70 text-sm max-w-md text-center">
          This table is not currently live. Status:&nbsp;
          <span className="font-semibold">{roomMeta.status}</span>.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <PokerRoomArcade roomId={roomId} />
    </main>
  );
}
