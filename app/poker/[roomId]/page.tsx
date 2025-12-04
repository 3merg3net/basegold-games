// app/poker/[roomId]/page.tsx
import PokerRoomArcade from "@/components/casino/arcade/PokerRoomArcade";
import { POKER_ROOMS, PokerRoomConfig } from "@/config/pokerRooms";

export default function PokerRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;

  // TS now knows this is PokerRoomConfig | undefined
  const roomMeta: PokerRoomConfig | undefined = POKER_ROOMS[roomId];

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

  if (roomMeta.status !== "live") {
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
