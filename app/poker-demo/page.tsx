// app/poker-demo/page.tsx
import PokerRoomArcade from "@/components/casino/arcade/PokerRoomArcade";

export default function PokerDemoDefaultPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 text-white">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide mb-4">
        Base Gold Rush • Hold&apos;em Demo Room
      </h1>
      <p className="text-sm text-white/60 mb-4">
        This is the default public PGLD free play room. To spin up private community custom
        tables, use a custom URL such as{" "}
        <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded">
          /poker-demo/your-club-code
        </code>{" "}
        and share that link with friends.
      </p>

      <PokerRoomArcade roomId="BGRC-holdem-room" />
    </main>
  );
}
