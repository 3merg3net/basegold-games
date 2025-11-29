// app/arcade/poker/page.tsx
import Link from "next/link";

const DEMO_TABLES = [
  {
    id: "bgld-holdem-demo-room",
    name: "BGRC Free Play • 0.25 / 0.50",
    desc: "Base Gold Rush test table with synced betting + showdown.",
    players: "2–9",
  },
  {
    id: "bgld-deepstack-main",
    name: "Deepstack Main • 1 / 2",
    desc: "Long-session cash game layout for team testing.",
    players: "3–9",
  },
  {
    id: "bgld-homegame-friends",
    name: "Home Game • 0.10 / 0.20",
    desc: "Bring your friends and play a soft-stakes ring game.",
    players: "2–8",
  },
];

export default function PokerLobbyPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 text-white">
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
          Base Gold Rush
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">
          Live Poker Lobby (Alpha)
        </h1>
        <p className="text-sm text-white/60 mt-2 max-w-2xl">
          Pick a table, grab a free-play PGLD stack, and run full hands
          through the coordinator. Each browser / device = one unique player.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {DEMO_TABLES.map((t) => (
          <Link
            key={t.id}
            href={`/arcade/poker/${t.id}`}
            className="group rounded-2xl border border-white/10 bg-black/70 px-4 py-3 hover:border-[#FFD700]/70 hover:bg-black/90 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-[#FFD700]">
                  {t.name}
                </div>
                <p className="text-[11px] text-white/60 mt-1">
                  {t.desc}
                </p>
              </div>
              <div className="text-right text-[10px] text-white/45">
                <div>Players: {t.players}</div>
                <div className="mt-1 inline-flex items-center rounded-full border border-white/25 px-2 py-0.5 group-hover:border-[#FFD700]">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Join table
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
