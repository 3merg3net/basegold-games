// app/poker/page.tsx
import Link from "next/link";
import Image from "next/image";

import CasinoLiveStats from "@/components/casino/layout/CasinoLiveStats";
import { ArcadeWalletProvider } from "@/lib/useArcadeWallet";
import { POKER_ROOMS, PokerRoomConfig } from "@/config/pokerRooms";

const MAIN_ROOM_ID = "BGRC-holdem-room";

export default function PokerHubPage() {
  const liveRooms: PokerRoomConfig[] = Object.values(POKER_ROOMS).filter(
    (r) => r.status === "live"
  );

  // Optional: low / medium / high tiers (set tier in POKER_ROOMS)
  const lowRoom = liveRooms.find((r) => r.tier === "low") ?? liveRooms[0];
  const midRoom = liveRooms.find((r) => r.tier === "medium");
  const highRoom = liveRooms.find((r) => r.tier === "high");

  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        {/* HERO LOBBY HEADER */}
        <section className="relative border-b border-white/10">
          {/* Background wash */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/live-poker-hero.png"
              alt="Base Gold Rush poker felt"
              fill
              sizes="100vw"
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc15_0,transparent_40%),linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
            {/* Top pill */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#FFD700]/70 px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Base Gold Rush • Poker Tables
              </div>
            </div>

            {/* Lobby heading + description */}
            <div className="space-y-2 text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                Choose your <span className="text-[#FFD700]">live</span> table.
              </h1>
              <p className="text-xs sm:text-sm text-white/80 max-w-2xl mx-auto">
                Low, medium, and high PGLD blinds. All tables share the same
                live spine: synced seats, shared board, action timers, and
                Base-native rails.
              </p>
            </div>

            {/* Quick-seat row: Low / Medium / High */}
            <div className="grid gap-3 md:grid-cols-3">
              {/* LOW STAKES */}
              <RoomQuickCard
                label="Low Blinds"
                badge="Most Popular"
                room={lowRoom}
                fallbackId={MAIN_ROOM_ID}
              />

              {/* MEDIUM STAKES */}
              <RoomQuickCard
                label="Medium Blinds"
                badge="Action"
                room={midRoom}
              />

              {/* HIGH STAKES */}
              <RoomQuickCard
                label="High Blinds"
                badge="High Roller"
                room={highRoom}
              />
            </div>

            {/* GOLDEN STACK SUMMARY CARD */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-[#FFD700]/70 bg-black/85 shadow-[0_24px_70px_rgba(0,0,0,1)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.26em] text-[#FFD700]/90">
                      Live cash game spine
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      Seats, boards, betting — all synced.
                    </div>
                  </div>
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                    <Image
                      src="/felt/bgrc-logo.png"
                      alt="BGRC chip"
                      fill
                      sizes="48px"
                      className="object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.7)]"
                    />
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-white/70 mb-3">
                  A multiplayer Live Game keeps seats, dealer button, action
                  order, pots, and showdown in sync — no matter how many friends
                  join from different devices.
                </p>

                <ul className="space-y-1.5 text-[11px] sm:text-xs text-white/75">
                  <li>• 2–9 seat Hold’em cash game with live board + hole cards</li>
                  <li>• Action bar with Fold / Check / Call / Bet and timers</li>
                  <li>• Rails quietly map into BGLD / BGRC when the cashier is live</li>
                </ul>

                <div className="mt-3 rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-[10px] text-white/55 space-y-1.5">
                  <div className="font-semibold text-[#FFD700]">
                    Same table, upgraded rails
                  </div>
                  <p>
                    Today: PGLD chip stacks and real flow. As the cashier and
                    vault hooks plug in, the same tables route BGLD/BGRC chips,
                    vault rake, and jackpots back to the community.
                  </p>
                  <p className="text-white/60">
                    Private / club tables use the same spine, but only run with
                    team-approved room IDs like{" "}
                    <code className="font-mono bg-white/5 px-1 py-0.5 rounded">
                      /poker/club-arkhe
                    </code>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Live stats tucked into hero footer */}
            <div className="w-full max-w-[260px] mx-auto">
              <CasinoLiveStats variant="live" />
            </div>
          </div>
        </section>

        {/* POKER APP GRID: ROOMS + PROFILE TILE */}
        <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              All live rooms run on the{" "}
              <span className="text-[#FFD700]">Base Gold Rush Poker</span>{" "}
              spine.
            </h2>
            <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
              Cash games first. Club lobbies, sit &amp; go queues, and full
              tournament flows plug into the same multiplayer engine.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* LIVE CASH TABLES GRID (GG / Stars style) */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
                <span className="uppercase tracking-[0.22em] text-white/70">
                  Live Cash Tables
                </span>
                <span className="text-white/40">
                  {liveRooms.length} room{liveRooms.length === 1 ? "" : "s"} live
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {liveRooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/poker/${room.id}`}
                    className="group rounded-2xl border border-[#FFD700]/60 bg-gradient-to-b from-black/80 via-[#111827] to-black/90 p-4 flex flex-col justify-between shadow-[0_16px_45px_rgba(0,0,0,0.9)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/70 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700]">
                          Live
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {room.private && (
                            <span className="ml-1 rounded-full border border-white/40 px-1.5 py-0.5 text-[9px] text-white/80">
                              Private
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold">
                          {room.label}
                        </h3>
                        {room.stakes && (
                          <p className="text-[11px] text-[#FFD700]/90">
                            Stakes:{" "}
                            <span className="font-mono">
                              {room.stakes}
                            </span>
                          </p>
                        )}
                        {room.description && (
                          <p className="text-[11px] sm:text-xs text-white/70">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <div className="relative h-12 w-16 sm:h-14 sm:w-20 rounded-xl overflow-hidden border border-white/20 bg-black/70">
                        <Image
                          src={
                            room.heroImage ?? "/images/poker-hero-enter.png"
                          }
                          alt={room.label}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-black/40" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#FFD700]/90">
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        Enter table →
                      </span>
                      <span className="font-mono text-white/70">
                        {room.id}
                      </span>
                    </div>
                  </Link>
                ))}

                {/* If no live rooms for some reason */}
                {liveRooms.length === 0 && (
                  <div className="rounded-2xl border border-white/20 bg-black/70 p-4 text-[11px] text-white/65">
                    No live rooms are configured yet. Ask the team to light up
                    <code className="ml-1 font-mono bg-white/5 px-1 py-0.5 rounded">
                      {MAIN_ROOM_ID}
                    </code>{" "}
                    in the pokerRooms config.
                  </div>
                )}
              </div>
            </div>

            {/* Profile / Identity tile */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/20 bg-gradient-to-b from-[#020617] to-black p-4 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                    Rail Identity
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Player Profile &amp; Rail Presence
                  </h3>
                  <p className="text-[11px] sm:text-xs text-white/70">
                    Lock in your handle, avatar, and bio. The same persona shows
                    up at every table, every time you sit.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                  <Link
                    href="/profile"
                    className="rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1.5 font-semibold text-[#FFD700] hover:bg-[#111827]"
                  >
                    Edit poker profile →
                  </Link>
                  <span className="text-white/45">
                    X / Telegram handles optional but welcome.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOWER COPY STRIP */}
        <section className="mx-auto max-w-6xl px-4 pb-8 md:pb-10 text-[11px] md:text-sm text-white/65 space-y-3">
          <p>
            <span className="font-semibold text-[#FFD700]">
              Base Gold Rush Poker
            </span>{" "}
            is the live heart of the project — a place where chips, vaults, and
            vibes all converge at the same tables.
          </p>
          <p>
            Cash games are live. As we bring in the cashier and vault hooks, this
            hub becomes a full poker app: lobbies, queues, leaderboards, and
            golden marquee events for Base.
          </p>
          <p>
            Public access flows through{" "}
            <code className="font-mono bg-white/5 px-1 py-0.5 rounded">
              /poker/{MAIN_ROOM_ID}
            </code>
            . Private club codes like{" "}
            <code className="font-mono bg-white/5 px-1 py-0.5 rounded">
              /poker/club-yourname
            </code>{" "}
            only go live once they&apos;re approved in the backend config and
            wired into the coordinator.
          </p>
          <p>
            For now: grab a seat, invite a few friends, and help us stress test
            the golden pit before the rest of Base even realizes there&apos;s a
            live room running.
          </p>
        </section>
      </main>
    </ArcadeWalletProvider>
  );
}

/**
 * Small helper card for Low / Medium / High quick-seat
 */
type RoomQuickCardProps = {
  label: string;
  badge: string;
  room?: PokerRoomConfig;
  fallbackId?: string;
};

function RoomQuickCard({ label, badge, room, fallbackId }: RoomQuickCardProps) {
  const href = room
    ? `/poker/${room.id}`
    : fallbackId
    ? `/poker/${fallbackId}`
    : undefined;

  const content = (
    <div className="rounded-2xl border border-[#FFD700]/70 bg-black/80 p-4 flex flex-col justify-between shadow-[0_16px_45px_rgba(0,0,0,0.9)]">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/70 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700]">
          Live
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="ml-1 rounded-full border border-white/30 px-1.5 py-0.5 text-[9px] text-white/80">
            {badge}
          </span>
        </div>
        <h3 className="text-sm sm:text-base font-bold">{label}</h3>
        <p className="text-[11px] sm:text-xs text-white/70">
          {room?.stakes ? (
            <>
              Stakes:{" "}
              <span className="font-mono text-[#FFD700]">
                {room.stakes}
              </span>
            </>
          ) : (
            "Seat in with smaller stacks and get a feel for the flow."
          )}
        </p>
      </div>
      <div className="mt-3 text-[11px] text-[#FFD700]/90">
        {href ? "Tap to enter table →" : "Coming soon"}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="group">
      {content}
    </Link>
  );
}
