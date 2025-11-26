// app/poker-demo/[roomId]/page.tsx
import PokerRoomArcade from "@/components/casino/arcade/PokerRoomArcade";

type PokerRoomPageProps = {
  params: { roomId: string };
};

export default function PokerRoomPage({ params }: PokerRoomPageProps) {
  const rawId = params.roomId || "bgld-holdem-demo-room";
  const roomId = decodeURIComponent(rawId);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 text-white">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide mb-4">
        Base Gold Rush • Private Hold&apos;em Room
      </h1>
      <p className="text-sm text-white/60 mb-4">
        Room ID:{" "}
        <span className="font-mono text-[#FFD700] bg-white/5 px-1.5 py-0.5 rounded">
          {roomId}
        </span>{" "}
        — Share this URL with your friends so they sit at the same table.
        Each browser/device = one player, ClubGG-style.
      </p>

      <PokerRoomArcade roomId={roomId} />
    </main>
  );
}
