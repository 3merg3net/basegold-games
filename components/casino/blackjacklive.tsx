// components/casino/blackjacklive.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
  FormEvent,
} from "react";
import React from "react";
import Image from "next/image";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { useBlackjackRoom } from "@/lib/blackjackClient/useBlackjackRoom";

/* ───────────────── Types ───────────────── */

type SeatView = {
  seatIndex: number;
  playerId: string | null;
  name?: string;
  chips?: number; // stack on table
};

type BlackjackPhase =
  | "waiting"
  | "betting"
  | "dealing"
  | "player"
  | "dealer"
  | "settled";

type BlackjackPlayerState = {
  seatIndex: number;
  playerId: string;
  hand: string[]; // card codes, e.g. "As", "Td"
  bet: number;
  isBust: boolean;
  isStanding: boolean;
  hasBlackjack: boolean;
  outcome?: "win" | "lose" | "push" | "blackjack" | "none";
  total?: number;
};

type BlackjackTableState = {
  handId: number;
  phase: BlackjackPhase;
  dealerCards: string[];
  dealerTotal?: number;
  dealerHoleHidden?: boolean;
  shoeSize?: number;
  minBet: number;
  maxBet: number;
  currentSeatIndex: number | null;
  players: BlackjackPlayerState[];
};

type DealerLogEntry = {
  id: number;
  text: string;
};

type BlackjackLiveProps = {
  tableId?: string;
};

type BJCard = string;

type BJCardProps = {
  card: BJCard;
  size?: "normal" | "small";
  faceDown?: boolean;
  delayIndex?: number;
};

/* ───────────────── Chips (reused vibe from poker) ───────────────── */

const CHIP_SOURCES: Record<number, string> = {
  1: "/chips/chip-bgrc-1.png",
  5: "/chips/chip-bgrc-5.png",
  10: "/chips/chip-bgrc-10.png",
  25: "/chips/chip-bgrc-25.png",
  100: "/chips/chip-bgrc-100.png",
  500: "/chips/chip-bgrc-500.png",
  1000: "/chips/chip-bgrc-1000.png",
};

const CHIP_DENOMS = [1000, 500, 100, 25, 10, 5, 1];

function breakdownChips(amount: number): number[] {
  const result: number[] = [];
  let remaining = Math.max(0, Math.floor(amount));

  for (const d of CHIP_DENOMS) {
    while (remaining >= d) {
      result.push(d);
      remaining -= d;
      if (result.length >= 12) return result;
    }
  }
  return result;
}

function ChipStack({ amount, size = 30 }: { amount: number; size?: number }) {
  if (!amount || amount <= 0) return null;
  const chips = breakdownChips(amount);
  if (chips.length === 0) return null;

  return (
    <div className="flex items-end -space-x-2 chip-fly">
      {chips.map((d, i) => {
        const src = CHIP_SOURCES[d];
        if (!src) return null;
        const w = size + i * 1.5;
        const h = size + i * 1.5;
        return (
          <Image
            key={`${d}-${i}`}
            src={src}
            alt={`GLD ${d}`}
            width={w}
            height={h}
            className="rounded-full drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]"
          />
        );
      })}
    </div>
  );
}

function formatChips(n: number | undefined | null) {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

/* ───────────────── Card rendering (matches poker look) ───────────────── */

const RANK_LABELS: Record<string, string> = {
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  T: "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

const SUIT_LABELS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-slate-900",
  c: "text-slate-900",
  h: "text-red-500",
  d: "text-red-500",
};

function parseCard(card: string) {
  if (!card || card.length < 2) {
    return {
      rank: card,
      suit: "",
      rankLabel: card,
      suitLabel: "",
      suitColor: "text-white",
    };
  }
  const rank = card[0].toUpperCase();
  const suitRaw = card[1].toLowerCase();
  const rankLabel = RANK_LABELS[rank] ?? rank;
  const suitLabel = SUIT_LABELS[suitRaw] ?? "";
  const suitColor = SUIT_COLORS[suitRaw] ?? "text-white";
  return { rank, suit: suitRaw, rankLabel, suitLabel, suitColor };
}

function BlackjackCard({
  card,
  size = "normal",
  faceDown = false,
  delayIndex = 0,
}: BJCardProps) {
  const { rankLabel, suitLabel, suitColor } = parseCard(card);

  const baseSize =
    size === "small"
      ? "w-9 h-12 text-[11px] md:w-10 md:h-14 md:text-[12px]"
      : "w-12 h-16 text-sm md:w-14 md:h-20 md:text-base";

  const delay = `${0.05 * delayIndex}s`;

  if (faceDown) {
    return (
      <div
        className={`${baseSize} rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col justify-between px-1.5 py-1 border border-slate-400 relative shadow-[0_4px_10px_rgba(0,0,0,0.7)] card-deal`}
        style={{ animationDelay: delay }}
      >
        <div className="absolute inset-[1px] rounded-[7px] border border-slate-500" />
        <div className="flex-1 flex items-center justify-center">
          <Image
            src="/felt/bgrc-logo.png"
            alt="Base Gold Rush"
            width={32}
            height={32}
            className="opacity-80"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseSize} rounded-lg bg-white flex flex-col justify-between px-1.5 py-1 border relative shadow-[0_4px_10px_rgba(0,0,0,0.7)] card-deal`}
      style={{ animationDelay: delay }}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[7px] border border-slate-200" />
      <div className="relative flex items-start justify-between">
        <span className="font-bold text-slate-900 leading-none">
          {rankLabel}
        </span>
        <span className={`text-[11px] md:text-xs ${suitColor}`}>
          {suitLabel}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <span className={`leading-none ${suitColor} text-xl md:text-2xl`}>
          {suitLabel}
        </span>
      </div>
      <div className="relative flex items-end justify-end">
        <span className={`text-[11px] md:text-xs ${suitColor}`}>
          {suitLabel}
        </span>
      </div>
    </div>
  );
}

/* ───────────────── Seat geometry (7-seat blackjack arc) ───────────────── */

const SEAT_GEOMETRY: CSSProperties[] = [
  // logical 0 = hero bottom-center
  { bottom: "4%", left: "50%", transform: "translate(-50%, 0)" },
  // 1 & 2 to hero's left
  { bottom: "8%", left: "32%", transform: "translate(-50%, 0)" },
  { bottom: "16%", left: "22%", transform: "translate(-50%, 0)" },
  // 3 far left
  { bottom: "26%", left: "16%", transform: "translate(-50%, 0)" },
  // 4 & 5 to hero's right
  { bottom: "16%", right: "22%", transform: "translate(50%, 0)" },
  { bottom: "8%", right: "32%", transform: "translate(50%, 0)" },
  // 6 far right
  { bottom: "26%", right: "16%", transform: "translate(50%, 0)" },
];

/* ───────────────── Audio ───────────────── */

function useSound(url: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio(url);
  }, [url]);

  return () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
    } catch {
      // ignore autoplay errors
    }
  };
}

/* ───────────────── Main component ───────────────── */

export default function BlackjackLive({
  tableId = "bgld-blackjack-live-1",
}: BlackjackLiveProps) {
  const { profile, chips, setChips } = usePlayerProfileContext() as any;

  /* Player identity (per device) */
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let id = window.localStorage.getItem("gld-blackjack-player-id");
      if (!id) {
        const rand =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto.randomUUID() || "").slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
        id = `bj-player-${rand}`;
        window.localStorage.setItem("gld-blackjack-player-id", id);
      }
      setPlayerId(id);
    } catch {
      const fallback = "bj-player-" + Math.random().toString(36).slice(2, 10);
      setPlayerId(fallback);
    }
  }, []);

  const effectivePlayerId = playerId ?? "bj-player-pending";

  /* WebSocket room (similar to poker) */
  const { ready, messages, send } = useBlackjackRoom(tableId, effectivePlayerId);
  const sendMessage = (msg: any) => {
    (send as any)(msg);
  };

  const playDeal = useSound("/sounds/deal-card.mp3");
  const playChip = useSound("/sounds/chip.wav");
  const playWin = useSound("/sounds/win.wav");

  /* Seats & table state from WS messages */
  const seats = useMemo<SeatView[]>(() => {
    const seatMessages = (messages as any[]).filter(
      (m) => m && m.type === "seats-update"
    );
    if (seatMessages.length === 0) return [];
    const last = seatMessages[seatMessages.length - 1];
    return (last.seats || []) as SeatView[];
  }, [messages]);

  const table = useMemo<BlackjackTableState | null>(() => {
    const ts = (messages as any[]).filter(
      (m) => m && m.type === "table-state"
    );
    if (ts.length === 0) return null;
    const last = ts[ts.length - 1];
    return last as BlackjackTableState;
  }, [messages]);

  const heroSeat = useMemo(
    () => seats.find((s) => s.playerId === playerId) || null,
    [seats, playerId]
  );

  const heroPlayer = useMemo(() => {
    if (!table) return null;
    return table.players.find((p) => p.playerId === playerId) ?? null;
  }, [table, playerId]);

  const seatedCount = useMemo(
    () => seats.filter((s) => s.playerId).length,
    [seats]
  );

  const MIN_PLAYERS_TO_START = 1; // can run solo demo

  /* Host = lowest seat index at the table */
  const hostSeatIndex = useMemo(() => {
    let min: number | null = null;
    for (const s of seats) {
      if (!s.playerId) continue;
      if (min === null || s.seatIndex < min) min = s.seatIndex;
    }
    return min;
  }, [seats]);

  const isHostClient =
    !!heroSeat && hostSeatIndex !== null && heroSeat.seatIndex === hostSeatIndex;

  const isHeroTurn =
    !!table &&
    !!heroSeat &&
    table.currentSeatIndex === heroSeat.seatIndex &&
    table.phase === "player";

  const dealerCards = table?.dealerCards ?? [];
  const dealerHoleHidden = table?.dealerHoleHidden ?? false;
  const dealerTotal =
    table && typeof table.dealerTotal === "number"
      ? table.dealerTotal
      : undefined;

  /* Dealer log */
  const [dealerLog, setDealerLog] = useState<DealerLogEntry[]>([]);
  const logIdRef = useRef(0);
  const lastHandIdRef = useRef<number | null>(null);

  const pushLog = (text: string) => {
    setDealerLog((prev) => {
      const id = logIdRef.current++;
      const next = [{ id, text }, ...prev];
      return next.slice(0, 24);
    });
  };

  useEffect(() => {
    if (!table) return;
    if (lastHandIdRef.current == null || table.handId !== lastHandIdRef.current) {
      lastHandIdRef.current = table.handId;
      pushLog(`New blackjack hand #${table.handId} at GLD table.`);
      playDeal();
    }

    // Rough chip / win sounds based on outcomes
    if (table.phase === "settled") {
      const heroOutcome = heroPlayer?.outcome;
      if (heroOutcome === "win" || heroOutcome === "blackjack") {
        playWin();
        pushLog("You win this hand.");
      } else if (heroOutcome === "lose") {
        playChip();
        pushLog("Dealer wins this hand.");
      } else if (heroOutcome === "push") {
        pushLog("Push. Your bet is returned.");
      }
    }
  }, [table, heroPlayer, playDeal, playChip, playWin]);

  /* Invite link + chat (lightweight) */
  const [inviteUrl, setInviteUrl] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteUrl(window.location.href);
    }
  }, []);

  function handleCopyInvite() {
    if (!inviteUrl) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(inviteUrl)
        .then(() => {
          setCopiedInvite(true);
          setTimeout(() => setCopiedInvite(false), 1500);
        })
        .catch(() => {});
    }
  }

  const chatMessages = useMemo(
    () =>
      (messages as any[]).filter(
        (m) => m && m.type === "chat-broadcast"
      ) as Array<{ playerId: string; text: string }>,
    [messages]
  );
  const [chatInput, setChatInput] = useState("");
  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendMessage({ type: "chat", text: trimmed });
    setChatInput("");
  };

  /* Buy-in / sit / stand using demo GLD chips */
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [buyIn, setBuyIn] = useState<number>(500);

  function describeHero() {
    const nm = profile?.name ?? "";
    if (nm.trim().length > 0) return nm.trim();
    if (heroSeat?.name) return heroSeat.name;
    return "You";
  }

  function handleSitOrStand() {
    if (heroSeat) {
      // Standing: cash out stack back to demo bankroll
      const cashOut = heroSeat.chips ?? 0;
      if (cashOut > 0) {
        setChips((c: number) => c + cashOut);
        pushLog(
          `${describeHero()} leaves the blackjack table with ${cashOut} GLD demo chips.`
        );
      } else {
        pushLog(`${describeHero()} leaves the blackjack table.`);
      }
      sendMessage({ type: "stand" });
      return;
    }
    // Not seated yet → show buy-in modal
    setShowBuyIn(true);
  }

  function confirmSit() {
    setShowBuyIn(false);
    const effBuyIn = Math.max(100, Math.floor(buyIn));
    if (effBuyIn > chips) {
      pushLog(
        `Not enough GLD demo chips to sit with ${effBuyIn}. Lower buy-in or reload later.`
      );
      return;
    }
    setChips((c: number) => Math.max(0, c - effBuyIn));
    pushLog(`${describeHero()} sits into blackjack with ${effBuyIn} GLD chips.`);
    sendMessage({
      type: "sit",
      name: profile?.name ?? "",
      buyIn: effBuyIn,
    } as any);
  }

  /* Hero actions: bet / hit / stand / double, server-driven resolution */
  const [heroBetAmount, setHeroBetAmount] = useState<number>(50);

  const tableMinBet = table?.minBet ?? 10;
  const tableMaxBet = table?.maxBet ?? 2000;
  const canPlaceBet =
    !!heroSeat &&
    !!table &&
    table.phase === "betting" &&
    heroPlayer &&
    heroPlayer.bet === 0;

  function handlePlaceBet() {
    if (!canPlaceBet) return;
    const eff = Math.max(tableMinBet, Math.min(tableMaxBet, heroBetAmount));
    if (eff > chips) {
      pushLog("Not enough demo chips to place that bet.");
      return;
    }
    setChips((c: number) => Math.max(0, c - eff));
    setHeroBetAmount(eff);
    playChip();
    sendMessage({ type: "action", action: "bet", amount: eff });
    pushLog(`${describeHero()} bets ${eff} GLD chips.`);
  }

  function handleHit() {
    if (!isHeroTurn || !table || table.phase !== "player") return;
    sendMessage({ type: "action", action: "hit" });
    playDeal();
  }

  function handleStand() {
    if (!isHeroTurn || !table || table.phase !== "player") return;
    sendMessage({ type: "action", action: "stand" });
  }

  function handleDouble() {
    if (!isHeroTurn || !table || table.phase !== "player" || !heroPlayer)
      return;
    const extraNeeded = heroPlayer.bet;
    if (extraNeeded > chips) {
      pushLog("Not enough demo chips to double down.");
      return;
    }
    setChips((c: number) => Math.max(0, c - extraNeeded));
    sendMessage({ type: "action", action: "double" });
    playDeal();
    pushLog(`${describeHero()} doubles down.`);
  }

  /* Manual deal (host only) */
  function handleHostDeal() {
    if (!isHostClient) return;
    if (!table || table.phase !== "waiting") return;
    if (seatedCount < MIN_PLAYERS_TO_START) {
      pushLog("Need at least one seated player to start a blackjack round.");
      return;
    }
    sendMessage({ type: "start-hand" });
    pushLog("Host starts a new blackjack hand.");
  }

  const canHostDeal =
    isHostClient && !!table && table.phase === "waiting" && seatedCount >= 1;

  /* UI helpers */
  const initials =
    profile?.avatarInitials ||
    (profile?.name
      ? profile.name
          .trim()
          .split(/\s+/)
          .map((p: string) => p[0] ?? "")
          .join("")
          .slice(0, 3)
      : "??");

  const heroOutcome = heroPlayer?.outcome ?? "none";

  let heroStatusText = "";
  if (!heroSeat) {
    heroStatusText = "Tap “Sit at table” to join this GLD blackjack table.";
  } else if (!table) {
    heroStatusText = "Waiting for game state…";
  } else if (table.phase === "betting") {
    heroStatusText = heroPlayer?.bet
      ? "Bet locked in – waiting for deal."
      : "Place your GLD bet to enter this hand.";
  } else if (table.phase === "dealing") {
    heroStatusText = "Dealing cards…";
  } else if (table.phase === "player") {
    heroStatusText = isHeroTurn ? "Your turn – Hit, Stand or Double." : "Waiting for other players…";
  } else if (table.phase === "dealer") {
    heroStatusText = "Dealer is resolving the shoe.";
  } else if (table.phase === "settled") {
    if (heroOutcome === "blackjack") heroStatusText = "Blackjack! You crushed it.";
    else if (heroOutcome === "win") heroStatusText = "You beat the dealer.";
    else if (heroOutcome === "lose") heroStatusText = "Dealer wins this round.";
    else if (heroOutcome === "push") heroStatusText = "Push. Your bet comes back.";
    else heroStatusText = "Hand finished.";
  }

  /* JSX */

  return (
    <>
      <div className="space-y-6 pb-16 md:pb-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* TABLE SIDE */}
          <div className="relative rounded-3xl p-4 md:p-6 border border-[#FFD700]/40 bg-gradient-to-b from-black via-[#020617] to-black shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Glow background */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0ea5e9]/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
            </div>

            {/* Header */}
            <div className="relative mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Base Gold Rush • Live Blackjack
                </div>
                <div className="text-sm md:text-base text-white/80">
                  Table ID:{" "}
                  <span className="font-mono text-[#FFD700]/90">
                    {tableId}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-white/50">
                  GLD demo chips • Multiplayer table
                </div>
                {table && (
                  <div className="text-[11px] text-white/50">
                    Hand #{table.handId} • Phase:{" "}
                    <span className="font-mono">{table.phase}</span>
                  </div>
                )}
                {table && (
                  <div className="text-[11px] text-white/50">
                    Min {table.minBet} / Max {table.maxBet} GLD • Shoe size{" "}
                    <span className="font-mono">
                      {table.shoeSize ?? "?"} cards
                    </span>
                  </div>
                )}
              </div>

              <div className="relative space-y-1 text-right text-xs text-white/55">
                {ready ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                    <span className="mr-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Connecting…
                  </span>
                )}
                <div className="text-[10px] text-white/40">
                  Seats:{" "}
                  <span className="font-mono">
                    {seatedCount} / {SEAT_GEOMETRY.length}
                  </span>
                </div>
                {isHostClient && (
                  <div className="text-[10px] text-emerald-300">
                    You are host for this table.
                  </div>
                )}
              </div>
            </div>

            {/* TABLE FELT */}
            <div className="relative mx-auto mt-2 w-full max-w-[980px] aspect-[10/16] md:aspect-[16/9] [perspective:1600px]">
              <div className="absolute inset-0 [transform:rotateX(18deg)] [transform-style:preserve-3d]">
                {/* Outer rail */}
                <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_top,#4b2f1a_0,#2b1a0d_50%,#050509_100%)] shadow-[0_26px_90px_rgba(0,0,0,1)]">
                  <div className="absolute inset-x-[14%] top-[6%] h-5 rounded-full bg-gradient-to-b from-white/18 to-transparent blur-md opacity-80" />
                </div>

                {/* Inner felt */}
                <div className="absolute inset-[7%] md:inset-[6%] origin-center scale-y-[0.96] md:scale-y-[0.9] rounded-[999px] border border-emerald-400/45 bg-[radial-gradient(circle_at_top,#166534_0,#065f46_40%,#022c22_70%,#020617_100%)] shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden">
                  {/* Felt texture */}
                  <div className="pointer-events-none absolute inset-0 bg-[url('/felt/felt-texture.png')] mix-blend-soft-light opacity-[0.16]" />

                  {/* Center logo + rules */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex translate-y-1 flex-col items-center">
                      <Image
                        src="/felt/bgrc-logo.png"
                        alt="Base Gold Rush"
                        width={240}
                        height={240}
                        className="mx-auto object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.6)]"
                      />
                      <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-[#FFD700]/90 md:text-[10px]">
                        BASE GOLD BLACKJACK
                      </div>
                      <div className="mt-1 text-[9px] text-white/60 text-center">
                        Dealer stands on 17 • Blackjack pays 3 : 2
                      </div>
                    </div>
                  </div>

                  {/* Dealer box */}
                  <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 flex flex-col items-center gap-1 md:gap-1.5">
                    <div className="rounded-full bg-black/80 px-3 py-1 text-[10px] md:text-xs text-white/80 shadow shadow-black/80">
                      Dealer
                      {dealerCards.length > 0 && !dealerHoleHidden && dealerTotal !== undefined && (
                        <>
                          {" • "}
                          <span className="font-mono">{dealerTotal}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1.5 md:gap-2">
                      {dealerCards.map((c, i) => (
                        <BlackjackCard
                          key={`dealer-${i}-${c}`}
                          card={c}
                          delayIndex={i}
                          faceDown={dealerHoleHidden && i === 1}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Player betting spots + hands around arc */}
                  <div className="absolute inset-[3%] text-[10px] text-white/80 md:text-[11px]">
                    {seats
                      .filter((s) => s.seatIndex < SEAT_GEOMETRY.length)
                      .map((seat) => {
                        const isHeroSeat = seat.playerId === playerId;
                        const tablePlayer =
                          table?.players.find(
                            (p) => p.seatIndex === seat.seatIndex
                          ) ?? null;

                        const label =
                          seat.playerId && seat.name
                            ? seat.name
                            : seat.playerId
                            ? seat.playerId
                            : `Seat ${seat.seatIndex + 1}`;

                        const stylePos =
                          SEAT_GEOMETRY[seat.seatIndex] ??
                          SEAT_GEOMETRY[SEAT_GEOMETRY.length - 1];

                        const isActing =
                          !!table &&
                          table.phase === "player" &&
                          table.currentSeatIndex === seat.seatIndex;

                        const betAmount = tablePlayer?.bet ?? 0;
                        const hand = tablePlayer?.hand ?? [];
                        const total =
                          tablePlayer && typeof tablePlayer.total === "number"
                            ? tablePlayer.total
                            : undefined;
                        const outcome = tablePlayer?.outcome ?? "none";

                        const isBust = !!tablePlayer?.isBust;
                        const hasBJ = !!tablePlayer?.hasBlackjack;

                        let outcomeLabel = "";
                        if (outcome === "blackjack") outcomeLabel = "Blackjack";
                        else if (outcome === "win") outcomeLabel = "Win";
                        else if (outcome === "lose") outcomeLabel = "Lose";
                        else if (outcome === "push") outcomeLabel = "Push";

                        return (
                          <div
                            key={seat.seatIndex}
                            className="absolute flex flex-col items-center gap-1"
                            style={stylePos}
                          >
                            {/* Felt betting circle */}
                            <div className="relative flex flex-col items-center gap-1 pointer-events-none">
                              <div className="h-16 w-28 rounded-full border border-emerald-400/40 bg-emerald-900/40 shadow-[0_0_16px_rgba(0,0,0,0.8)]" />
                              {/* label inside circle */}
                              <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 flex flex-col items-center">
                                {betAmount > 0 && (
                                  <>
                                    <ChipStack amount={betAmount} size={24} />
                                    <div className="mt-[2px] rounded-full bg-black/80 px-2 py-[1px] text-[9px] text-amber-100 shadow shadow-black/80">
                                      Bet {formatChips(betAmount)} GLD
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Hand cards, if dealt */}
                            <div className="flex flex-col items-center gap-1 pointer-events-none">
                              {hand.length > 0 && (
                                <div className="flex gap-1.5 md:gap-2">
                                  {hand.map((c, i) => (
                                    <BlackjackCard
                                      key={`seat-${seat.seatIndex}-${i}-${c}`}
                                      card={c}
                                      delayIndex={i}
                                      size="small"
                                    />
                                  ))}
                                </div>
                              )}
                              {hand.length > 0 && (
                                <div className="rounded-full bg-black/80 px-2 py-[1px] text-[9px] text-white/80 shadow shadow-black/70">
                                  {total !== undefined && (
                                    <span className="font-mono mr-1">
                                      {total}
                                    </span>
                                  )}
                                  {isBust && <span className="text-red-300">Bust</span>}
                                  {hasBJ && (
                                    <span className="text-emerald-300">
                                      Blackjack
                                    </span>
                                  )}
                                  {!isBust && !hasBJ && !outcomeLabel && isActing && (
                                    <span className="text-emerald-300">
                                      Acting…
                                    </span>
                                  )}
                                  {outcomeLabel && (
                                    <span className="text-amber-300">
                                      {outcomeLabel}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Avatar + name under circle */}
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className={[
                                  "flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 border shadow-[0_0_10px_rgba(0,0,0,0.9)]",
                                  isActing
                                    ? "border-[#FACC15] shadow-[0_0_14px_rgba(250,204,21,0.8)]"
                                    : "border-white/25",
                                  isHeroSeat ? "ring-2 ring-sky-400/80" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {isHeroSeat && (profile as any)?.avatarUrl ? (
                                  <Image
                                    src={(profile as any).avatarUrl}
                                    alt="Avatar"
                                    width={40}
                                    height={40}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src="/felt/bgrc-logo.png"
                                    alt="GLD"
                                    width={26}
                                    height={26}
                                    className="object-contain opacity-90"
                                  />
                                )}
                              </div>
                              <div className="rounded-full bg-black/80 px-2 py-[1px] text-[9px] text-white/80 max-w-[120px] truncate">
                                {label}
                              </div>
                              <div className="rounded-full bg-black/80 px-2 py-[1px] text-[8px] text-[#FACC15] font-mono">
                                Stack {formatChips(seat.chips ?? 0)} GLD
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* HERO ACTION / CONTROL BAR */}
            <div className="relative mt-3 flex w-full justify-center">
              <div className="w-full max-w-[420px] rounded-2xl border border-white/20 bg-black/85 px-3 py-2 text-[10px] text-white/80 font-semibold shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                {/* Top row: hero + bankroll */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate text-white text-[11px] font-bold leading-tight">
                      {describeHero()}
                    </div>
                    <div className="mt-[1px] flex flex-wrap items-center gap-1 text-[9px] text-white/70">
                      <span className="rounded-full bg-black/60 px-2 py-[1px] border border-white/25">
                        Bankroll{" "}
                        <span className="font-mono text-[#FFD700]">
                          {chips.toLocaleString()} GLD demo chips
                        </span>
                      </span>
                      {heroSeat && (
                        <span className="rounded-full bg-black/60 px-2 py-[1px] border border-white/25">
                          Stack{" "}
                          <span className="font-mono text-[#FFD700]">
                            {formatChips(heroSeat.chips ?? 0)} GLD
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[9px] text-white/60">
                    <span className="uppercase tracking-[0.18em] text-white/40">
                      Status
                    </span>
                    <span className="text-right text-[10px] text-white/80">
                      {heroStatusText}
                    </span>
                  </div>
                </div>

                {/* Sit / stand + host start controls */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSitOrStand}
                    disabled={!ready}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {heroSeat ? "Stand up" : "Sit at table"}
                  </button>

                  {canHostDeal && (
                    <button
                      type="button"
                      onClick={handleHostDeal}
                      className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-yellow-400"
                    >
                      Start round
                    </button>
                  )}
                </div>

                {/* Betting controls (only when betting) */}
                {table && table.phase === "betting" && heroSeat && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-white/60">
                      <span>Bet size</span>
                      <span className="font-mono text-[#FFD700]">
                        {heroBetAmount.toLocaleString()} GLD
                      </span>
                    </div>
                    <input
                      type="range"
                      min={tableMinBet}
                      max={Math.max(
                        tableMinBet,
                        Math.min(chips, tableMaxBet)
                      )}
                      step={tableMinBet}
                      value={Math.min(
                        heroBetAmount,
                        Math.max(tableMinBet, chips)
                      )}
                      onChange={(e) =>
                        setHeroBetAmount(Number(e.target.value))
                      }
                      className="w-full accent-[#FFD700]"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[9px]">
                      {[tableMinBet, tableMinBet * 2, tableMinBet * 5].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setHeroBetAmount(preset)}
                            className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
                          >
                            {preset} GLD
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setHeroBetAmount(
                            Math.max(
                              tableMinBet,
                              Math.floor((chips + heroSeat.chips) / 10)
                            )
                          )
                        }
                        className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
                      >
                        Table feel
                      </button>
                    </div>
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handlePlaceBet}
                        disabled={!canPlaceBet}
                        className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-yellow-400 disabled:opacity-40"
                      >
                        Place bet
                      </button>
                    </div>
                  </div>
                )}

                {/* Player actions (only on hero turn) */}
                {table && table.phase === "player" && heroSeat && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleHit}
                        disabled={!isHeroTurn}
                        className="flex-1 min-w-[80px] rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                      >
                        Hit
                      </button>
                      <button
                        type="button"
                        onClick={handleStand}
                        disabled={!isHeroTurn}
                        className="flex-1 min-w-[80px] rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                      >
                        Stand
                      </button>
                      <button
                        type="button"
                        onClick={handleDouble}
                        disabled={!isHeroTurn}
                        className="flex-1 min-w-[80px] rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-amber-400 disabled:opacity-40"
                      >
                        Double
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dealer log */}
            <div className="relative mt-3 max-h-32 overflow-y-auto rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[11px]">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Dealer Log
                </div>
                <div className="text-[9px] text-white/35">
                  Latest events first
                </div>
              </div>
              {dealerLog.length === 0 ? (
                <div className="text-white/35">
                  Waiting for players and bets.
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {dealerLog.map((entry) => (
                    <li key={entry.id} className="text-white/80">
                      <span className="mr-1 text-white/35">•</span>
                      {entry.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* Player profile summary */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    Player Profile
                  </div>
                  <div className="text-[11px] text-white/50">
                    Used across all live tables.
                  </div>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-black shadow-[0_0_20px_rgba(250,204,21,0.7)]"
                  style={{
                    backgroundColor: profile?.avatarColor ?? "#facc15",
                  }}
                >
                  {initials.slice(0, 3).toUpperCase()}
                </div>
              </div>

              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white/90">
                      {profile?.name && profile.name.trim().length > 0
                        ? profile.name
                        : "Unnamed Player"}
                    </div>
                    <div className="text-white/50">
                      Style:{" "}
                      <span className="text-white/80">
                        {profile?.style ?? "balanced"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-1 text-[10px] text-white/45">
                  Edit name & avatar on the main profile page. This will show
                  above your spot at blackjack and poker tables.
                </p>

                {profile?.bio && (
                  <p className="line-clamp-3 text-white/60">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-white/55">
                  {profile?.xHandle && (
                    <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5">
                      X: {profile.xHandle}
                    </span>
                  )}
                  {profile?.telegramHandle && (
                    <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5">
                      TG: {profile.telegramHandle}
                    </span>
                  )}
                </div>
              </div>

              {/* GLD demo chips summary */}
              <div className="mt-2 border-t border-white/10 pt-2">
                <div className="space-y-1.5">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/50">
                    GLD Demo Chips
                  </div>
                  <div className="text-sm font-semibold text-white/80">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} GLD
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45">
                    For now, blackjack + poker share this off-chain GLD demo
                    bankroll. Later this will wire into the on-chain cashier.
                  </p>
                </div>
              </div>
            </div>

            {/* Room & invite */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                Room & Invites
              </div>
              <p className="text-[11px] text-white/60">
                Each browser / device = one seat. Share this link to fill the
                live GLD blackjack table with friends.
              </p>

              <div className="mt-2 space-y-1.5 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    Invite link
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="rounded-full border border-[#FFD700]/60 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700] hover:bg-[#111827]"
                  >
                    {copiedInvite ? "Copied ✓" : "Copy link"}
                  </button>
                </div>
                <div className="max-h-10 break-all overflow-hidden text-[10px] text-white/40">
                  {inviteUrl || "Invite URL loads here in browser."}
                </div>
              </div>
            </div>

            {/* Quick rules */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-[11px]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                Blackjack quick rules
              </div>
              <ul className="space-y-1 text-white/70">
                <li>• Get closer to 21 than the dealer without busting.</li>
                <li>• Face cards = 10, Aces = 1 or 11.</li>
                <li>• Blackjack (Ace + 10) pays 3 : 2.</li>
                <li>• Dealer stands on all 17s.</li>
                <li>• Doubling lets you take one card and stand.</li>
              </ul>
              <p className="mt-1 text-[10px] text-white/45">
                This layout mirrors the poker live room: same profile system,
                same GLD demo chips, just new rules on the felt.
              </p>
            </div>
          </div>
        </section>

        {/* CHAT */}
        <section className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Table Chat • GLD Blackjack Room
            </div>
            <div className="text-[10px] text-white/40">
              Live for all seated players.
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-2 text-[11px] space-y-1">
            {chatMessages.length === 0 && (
              <div className="text-white/40">
                No messages yet. Say hello to the table.
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i}>
                <span className="font-mono text-emerald-300">
                  {(m as any).playerId}
                </span>
                <span className="text-white/60">: </span>
                <span>{(m as any).text}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendChat}
            className="mt-2 flex gap-2 text-[11px]"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg bg-black/70 border border-white/20 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#FFD700]"
            />
            <button
              type="submit"
              disabled={!ready || !chatInput.trim()}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </section>
      </div>

      {/* Local CSS animations */}
      <style jsx>{`
        @keyframes dealIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .card-deal {
          animation: dealIn 0.25s ease-out;
        }

        @keyframes chipFly {
          0% {
            transform: translateY(6px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .chip-fly {
          animation: chipFly 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
