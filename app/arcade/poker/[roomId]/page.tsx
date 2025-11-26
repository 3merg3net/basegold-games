// app/arcade/poker/[roomId]/page.tsx
import PokerRoomArcade from "@/components/casino/arcade/PokerRoomArcade";

type PageProps = {
  params: { roomId: string };
};

export default function PokerRoomPage({ params }: PageProps) {
  const { roomId } = params;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 text-white">
      <PokerRoomArcade roomId={roomId} />
    </main>
  );
}
