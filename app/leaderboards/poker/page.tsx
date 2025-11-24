// app/leaderboards/poker/page.tsx
import Link from "next/link";
import Image from "next/image";

type LeaderRow = {
  rank: number;
  nickname: string;
  avatarColor: string;
  avatarInitials: string;
  hometown: string;
  handsPlayed: number;
  bbWonPer100: number;
  biggestPot: number;
  sessions: number;
};

const demoLeaders: LeaderRow[] = [
  {
    rank: 1,
    nickname: "GoldenRail",
    avatarColor: "#facc15",
    avatarInitials: "GR",
    hometown: "Denver, CO",
    handsPlayed: 812,
    bbWonPer100: 22.4,
    biggestPot: 1280,
    sessions: 14,
  },
  {
    rank: 2,
    nickname: "BaseBandit",
    avatarColor: "#22c55e",
    avatarInitials: "BB",
    hometown: "Austin, TX",
    handsPlayed: 640,
    bbWonPer100: 15.7,
    biggestPot: 880,
    sessions: 11,
  },
  {
    rank: 3,
    nickname: "RailwayRacer",
    avatarColor: "#38bdf8",
    avatarInitials: "RR",
    hometown: "Portland, OR",
    handsPlayed: 505,
    bbWonPer100: 11.3,
    biggestPot: 720,
    sessions: 9,
  },
];

export default function PokerLeaderboardsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        {/* Hero header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              Base Gold Rush • Live Tables
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
              Hold&apos;em Leaderboards (Demo)
            </h1>
            <p className="mt-1 text-sm md:text-base text-white/70 max-w-xl">
              Early snapshot of the Base Gold Rush poker room rankings. For
              now these are demo stats — once live BGLD pots are wired,
              these boards will track real performance, badges, and streaks.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
              <span className="rounded-full border border-amber-300/70 bg-amber-900/40 px-2 py-0.5">
                Demo-only metrics
              </span>
              <span className="rounded-full border border-emerald-300/70 bg-emerald-900/40 px-2 py-0.5">
                Cash games first • Tournaments later
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-[11px] text-white/60">
            <div className="rounded-2xl border border-white/15 bg-black/60 px-4 py-3 space-y-1">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                Quick Links
              </div>
              <div className="space-y-1">
                <Link
                  href="/poker-demo"
                  className="block text-emerald-300 hover:text-emerald-200"
                >
                  → Jump into the Hold&apos;em room
                </Link>
                <Link
                  href="/live-tables"
                  className="block text-amber-300 hover:text-amber-200"
                >
                  → View Live Tables hub
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Leaderboard table */}
        <section className="rounded-2xl border border-white/15 bg-black/70 p-4 md:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm md:text-base font-semibold">
                Cash Game Rankings (BGRC demo)
              </h2>
              <p className="text-[11px] text-white/50">
                Sorted by bb/100 over at least 250 hands. In live mode this
                will pull directly from on-chain hands and coordinator logs.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-white/45">
              <span>Planned filters:</span>
              <span className="rounded-full border border-white/25 px-2 py-0.5">
                Timeframe
              </span>
              <span className="rounded-full border border-white/25 px-2 py-0.5">
                Stakes
              </span>
              <span className="rounded-full border border-white/25 px-2 py-0.5">
                Game type
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] md:text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="py-2 pr-3 text-left font-normal">Rank</th>
                  <th className="py-2 pr-3 text-left font-normal">
                    Player
                  </th>
                  <th className="py-2 pr-3 text-left font-normal">
                    Hands
                  </th>
                  <th className="py-2 pr-3 text-left font-normal">
                    bb / 100
                  </th>
                  <th className="py-2 pr-3 text-left font-normal">
                    Biggest pot
                  </th>
                  <th className="py-2 pr-3 text-left font-normal">
                    Sessions
                  </th>
                  <th className="py-2 pl-3 text-left font-normal">
                    Badges (planned)
                  </th>
                </tr>
              </thead>
              <tbody>
                {demoLeaders.map((row) => (
                  <tr
                    key={row.rank}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="py-2 pr-3 align-middle text-white/70">
                      #{row.rank}
                    </td>
                    <td className="py-2 pr-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-[0_0_14px_rgba(250,204,21,0.6)]"
                          style={{ backgroundColor: row.avatarColor }}
                        >
                          {row.avatarInitials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {row.nickname}
                          </span>
                          <span className="text-[10px] text-white/45">
                            {row.hometown}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-middle text-white/80 font-mono">
                      {row.handsPlayed.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 align-middle font-mono">
                      <span
                        className={
                          row.bbWonPer100 >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }
                      >
                        {row.bbWonPer100.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 align-middle font-mono text-amber-200">
                      {row.biggestPot.toLocaleString()} BB
                    </td>
                    <td className="py-2 pr-3 align-middle text-white/80 font-mono">
                      {row.sessions}
                    </td>
                    <td className="py-2 pl-3 align-middle">
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full border border-emerald-400/60 bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-200">
                          Winrate+
                        </span>
                        {row.biggestPot >= 1000 && (
                          <span className="rounded-full border border-[#FFD700]/70 bg-amber-900/40 px-2 py-0.5 text-[10px] text-[#FFD700]">
                            Deep stack crusher
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-white/45">
            In the live BGLD version, this page will pull from a proper
            stats indexer: winrate, showdown %, aggression frequency,
            tournament ITM, streaks, and achievement badges that can sync to
            Farcaster / X / Lens.
          </p>
        </section>

        {/* Small CTA back to tables */}
        <section className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/60">
          <p>
            Want to climb the board?{" "}
            <span className="text-white/80">
              Hit the demo room, dial your lines, then graduate to real
              BGLD pots.
            </span>
          </p>
          <Link
            href="/poker-demo"
            className="inline-flex items-center rounded-full border border-emerald-400/70 bg-emerald-900/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:border-emerald-300 hover:bg-emerald-800/50"
          >
            Jump into Hold&apos;em →
          </Link>
        </section>
      </section>
    </main>
  );
}
