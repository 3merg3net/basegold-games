// components/casino/blackjacklive.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
} from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

import {
  useBlackjackRoom,
  type BlackjackTableState,
  type BlackjackSeatState,
  type BlackjackHandResult,
} from "@/lib/blackjackClient/useBlackjackRoom";
import { useArcadeWallet } from "@/lib/useArcadeWallet";



import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { usePlayerChips } from "@/lib/chips/usePlayerChips";


/** Fallbacks (server/table values override these once connected) */
const DEFAULT_ROOM_ID = "bgld-blackjack-room-1";
const FALLBACK_MIN_BET = 50;
const FALLBACK_MAX_BET = 5000;

const BET_STEP = 50;

/**
 * Seat positions (7 seats) for DESKTOP only.
 * 0 = far right, 6 = far left, arcing up toward table edge.
 */
const BJ_SEAT_POSITIONS: CSSProperties[] = [
  { left: "74%", top: "28%" }, // 0 right
  { left: "72%", top: "44%" }, // 1
  { left: "65%", top: "51%" }, // 2 bottom-right
  { left: "46%", top: "57%" }, // 3 center
  { left: "29%", top: "51%" }, // 4 bottom-left
  { left: "29%", top: "44%" }, // 5
  { left: "27%", top: "28%" }, // 6 left
];

/**
 * Seat positions tuned for MOBILE (taller aspect, narrower width).
 * 0 = far right, 6 = far left.
 */
const BJ_SEAT_POSITIONS_MOBILE: CSSProperties[] = [
  { left: "80%", top: "40%" }, // 0 right
  { left: "78%", top: "45%" }, // 1
  { left: "67%", top: "40%" }, // 2 bottom-right
  { left: "38%", top: "48%" }, // 3 bottom-center
  { left: "18%", top: "44%" }, // 4 bottom-left
  { left: "20%", top: "45%" }, // 5
  { left: "19%", top: "34%" }, // 6 left
];

/* ───────────── Card helpers ───────────── */

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

function computeBlackjackValue(cards: string[]) {
  let total = 0;
  let aces = 0;

  for (const c of cards) {
    if (!c || c === "XX") continue;
    const rank = c[0];
    if (rank === "A") {
      aces += 1;
      total += 11;
    } else if ("KQJT".includes(rank)) {
      total += 10;
    } else {
      total += Number(rank);
    }
  }

  let soft = false;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  if (aces > 0 && total <= 21) {
    soft = true;
  }

  return { total, soft };
}

function getResultBadge(
  result: BlackjackHandResult | undefined
): { label: string; className: string } | null {
  if (!result || result === "pending") return null;

  switch (result) {
    case "blackjack":
      return {
        label: "BLACKJACK",
        className:
          "bg-emerald-500/90 text-black border border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]",
      };
    case "win":
      return {
        label: "WIN",
        className:
          "bg-emerald-500/90 text-black border border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.6)]",
      };
    case "lose":
      return {
        label: "LOSE",
        className:
          "bg-red-500/90 text-black border border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.6)]",
      };
    case "push":
      return {
        label: "PUSH",
        className:
          "bg-slate-500/90 text-white border border-slate-200 shadow-[0_0_10px_rgba(148,163,184,0.6)]",
      };
    default:
      return null;
  }
}

function ResultPill({ result }: { result: BlackjackHandResult | undefined }) {
  const badge = getResultBadge(result);
  if (!badge) return null;

  const isWin = result === "win" || result === "blackjack";
  const isLose = result === "lose";

  


  return (
    <div
      className={[
        "pointer-events-none absolute left-1/2 -top-6 -translate-x-1/2",
        "rounded-full px-4 py-1.5 md:px-5 md:py-2",
        "text-[12px] md:text-[13px] font-extrabold tracking-[0.12em] uppercase",
        "shadow-[0_0_18px_rgba(0,0,0,0.65)]",
        isWin
          ? "animate-[bjWinPop_700ms_ease-out_1] shadow-[0_0_28px_rgba(250,204,21,0.95)]"
          : isLose
          ? "animate-[bjLoseSink_600ms_ease-out_1]"
          : "",
        badge.className,
      ].join(" ")}
    >
      {badge.label}
    </div>
  );
}

function parseCard(card: string) {
  if (!card || card === "XX") {
    return {
      isBack: true,
      rankLabel: "",
      suitLabel: "",
      suitColor: "text-white",
    };
  }

  const rank = card[0]?.toUpperCase?.() ?? "";
  const suitRaw = card[1]?.toLowerCase?.() ?? "";
  const rankLabel = RANK_LABELS[rank] ?? rank;
  const suitLabel = SUIT_LABELS[suitRaw] ?? "";
  const suitColor = SUIT_COLORS[suitRaw] ?? "text-white";

  return { isBack: false, rankLabel, suitLabel, suitColor };
}

type BJCardProps = { card: string; small?: boolean };

function BJCard({ card, small = false }: BJCardProps) {
  const { isBack, rankLabel, suitLabel, suitColor } = parseCard(card);

  const baseSize = small
    ? "w-9 h-12 text-[11px] md:w-10 md:h-14 md:text-[12px]"
    : "w-11 h-16 text-sm md:w-12 md:h-[72px] md:text-base";

  if (isBack) {
    return (
      <div
        className={`${baseSize} rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-slate-900 border border-white/40 shadow-[0_4px_10px_rgba(0,0,0,0.75)] flex items-center justify-center`}
      >
        <div className="w-[80%] h-[80%] rounded-md border border-white/40 bg-[radial-gradient(circle_at_top,#38bdf8_0,#0f172a_70%)]" />
      </div>
    );
  }

  return (
    <div
      className={`${baseSize} relative rounded-lg bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.45)] flex flex-col justify-between px-1 py-0.5`}
    >
      <div className="flex items-start justify-between">
        <span className="font-bold text-slate-900 leading-none">
          {rankLabel}
        </span>
        <span
          className={`${
            small ? "text-[10px]" : "text-[11px] md:text-xs"
          } ${suitColor} leading-none`}
        >
          {suitLabel}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <span
          className={`leading-none ${suitColor} ${
            small ? "text-lg" : "text-xl md:text-2xl"
          }`}
        >
          {suitLabel}
        </span>
      </div>

      <div className="flex items-end justify-end">
        <span className={`text-[11px] md:text-xs ${suitColor}`}>
          {suitLabel}
        </span>
      </div>
    </div>
  );
}

/* ───────────── Main component ───────────── */

export default function BlackjackLive() {
  useEffect(() => {
    console.log("[BJ UI] BlackjackLive mounted");
  }, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // derive roomId from /blackjack-live/[roomId] when present
  const derivedRoomId = useMemo(() => {
    if (!pathname) return DEFAULT_ROOM_ID;
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "blackjack-live");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return DEFAULT_ROOM_ID;
  }, [pathname]);

  // query fallback for tiers (used before server table arrives)
  const queryMin = Number(searchParams?.get("min") ?? "");
  const queryMax = Number(searchParams?.get("max") ?? "");
  const fallbackMinBet =
    Number.isFinite(queryMin) && queryMin > 0 ? queryMin : FALLBACK_MIN_BET;
  const fallbackMaxBet =
    Number.isFinite(queryMax) && queryMax > 0 ? queryMax : FALLBACK_MAX_BET;

  // Detect mobile viewport (reactive + safe)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fullscreen + refs
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const heroSeatRef = useRef<HTMLDivElement | null>(null);
  const heroPanelRef = useRef<HTMLDivElement | null>(null);
  const lastScrollKeyRef = useRef<string | null>(null);
// Optimistic bet adds so bet total updates instantly on double/split
const optimisticExtraRef = useRef<Map<string, number>>(new Map());

// UI-only: temporary CTA flash (win/lose/push) per seat/round
const ctaFlashRef = useRef<Map<string, { label: string; tone: "win" | "lose" | "push"; until: number }>>(
  new Map()
);


  // Dealer suspense (client-only reveal pacing)
  const dealerNewCardIndex = useRef<number>(-1);
  const [dealerNewCardTick, setDealerNewCardTick] = useState(0);

  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const enterPseudoFullscreen = () => {
    setIsFullscreen(true);
    document.documentElement.classList.add("overflow-hidden");
    document.body.classList.add("overflow-hidden");
  };

  const exitPseudoFullscreen = () => {
    setIsFullscreen(false);
    document.documentElement.classList.remove("overflow-hidden");
    document.body.classList.remove("overflow-hidden");
  };

  const toggleFullscreen = async () => {
    if (typeof window === "undefined") return;

    // iOS Safari: use CSS fullscreen only
    if (isIOS) {
      if (!isFullscreen) enterPseudoFullscreen();
      else exitPseudoFullscreen();
      return;
    }

    const el = tableWrapRef.current as any;
    const d = document as any;

    const request =
      el?.requestFullscreen || el?.webkitRequestFullscreen || el?.msRequestFullscreen;

    const exit = d?.exitFullscreen || d?.webkitExitFullscreen || d?.msExitFullscreen;

    const active = !!(d?.fullscreenElement || d?.webkitFullscreenElement);

    try {
      if (!active && typeof request === "function") {
        await request.bind(el)();
        return;
      }
      if (active && typeof exit === "function") {
        await exit.bind(d)();
        return;
      }
    } catch {
      // fall through
    }

    // fallback to CSS fullscreen
    if (!isFullscreen) enterPseudoFullscreen();
    else exitPseudoFullscreen();
  };

  const { profile, loading: profileLoading } = usePlayerProfileContext() as any;

  // ---- stable local id (fallback)
  const [fallbackLocalId, setFallbackLocalId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let id = window.localStorage.getItem("player-id"); // <-- ONE key across games
      if (!id) {
        id =
          "p-" +
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto.randomUUID() || "").slice(0, 10)
            : Math.random().toString(36).slice(2, 12));
        window.localStorage.setItem("player-id", id);
      }
      setFallbackLocalId(id);
    } catch {
      setFallbackLocalId("p-" + Math.random().toString(36).slice(2, 12));
    }
  }, []);

  // ---- IMPORTANT: stablePlayerId prevents profile load flip causing double settle
  const [stablePlayerId, setStablePlayerId] = useState<string | null>(null);
  useEffect(() => {
    if (stablePlayerId) return;
    const id = (profile?.id as string | undefined) ?? fallbackLocalId;
    if (id) setStablePlayerId(id);
  }, [profile?.id, fallbackLocalId, stablePlayerId]);

  const playerId = stablePlayerId;

  // ---- chips (truth)
  const {
    chips: chipState,
    loading: chipsLoading,
    error: chipsError,
    refresh: refreshChips,
  } = usePlayerChips();

  const balanceGld = Number(chipState?.balance_gld ?? 0);
  const reservedGld = Number(chipState?.reserved_gld ?? 0);
  const playableGld = Math.max(0, balanceGld - reservedGld);
  const credits = playableGld;

  const wsUrl = process.env.NEXT_PUBLIC_BLACKJACK_WS || "Local";

  // UI bet state (wallet-aware clamp will keep it sane)
  const [betAmount, setBetAmount] = useState<number>(fallbackMinBet);
  const [betInput, setBetInput] = useState<string>(String(fallbackMinBet));

  // IMPORTANT: always call the hook; pass null opts to disable internally
  const hookOpts =
    playerId && wsUrl
      ? {
          roomId: derivedRoomId,
          playerId,
          name: "Blackjack Player",
          wsUrl,
        }
      : null;

  const { connected, table, sendSeat, placeBet, sendAction } =
    useBlackjackRoom(hookOpts);

  // Log table updates for debugging
  useEffect(() => {
    if (table) {
      console.log("[BJ UI] table update", JSON.parse(JSON.stringify(table)));
    }
  }, [table]);

  /* ───────────── Derived core state ───────────── */

  const phase: BlackjackTableState["phase"] = table?.phase ?? "waiting-bets";

  const heroSeatIndex = useMemo(() => {
    if (!table || !playerId) return null;
    const seat = table.seats.find((s) => s.playerId === playerId);
    return seat ? seat.seatIndex : null;
  }, [table, playerId]);

  const activeSeatIndex = table?.activeSeatIndex ?? null;
  const activeHandIndex = table?.activeHandIndex ?? null;

  // Dealer cards (raw from server)
  const dealerCardsRaw = table?.dealer.cards ?? [];

  // Dealer suspense (animate reveals during dealer-turn)
  const [dealerCardsAnimated, setDealerCardsAnimated] = useState<string[]>([]);
  const dealerCardsToRender = phase === "dealer-turn" ? dealerCardsAnimated : dealerCardsRaw;

  useEffect(() => {
    if (phase !== "dealer-turn") {
      setDealerCardsAnimated([]);
      dealerNewCardIndex.current = -1;
      return;
    }

    const full = dealerCardsRaw ?? [];
    if (full.length === 0) {
      setDealerCardsAnimated([]);
      dealerNewCardIndex.current = -1;
      return;
    }

    let cancelled = false;
    setDealerCardsAnimated([]);
    dealerNewCardIndex.current = -1;

    const timeouts: number[] = [];
    full.forEach((_, i) => {
      const t = window.setTimeout(() => {
        if (cancelled) return;
        dealerNewCardIndex.current = i;
        setDealerCardsAnimated(full.slice(0, i + 1));
        setDealerNewCardTick((x) => x + 1);
      }, 350 + i * 420);
      timeouts.push(t as unknown as number);
    });

    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, dealerCardsRaw]);

  // Dealer value follows rendered cards
  const dealerValue = useMemo(() => {
    if (!table) return null;

    const cards = dealerCardsToRender ?? [];
    const visibleCount = cards.filter((c) => c && c !== "XX").length;
    if (visibleCount < 2) return null;

    const hideHole = table.dealer?.hideHoleCard;

    const visibleCards =
      hideHole && (phase === "player-action" || phase === "dealing")
        ? cards.filter((c) => c !== "XX")
        : cards;

    if (visibleCards.length === 0) return null;

    const { total, soft } = computeBlackjackValue(visibleCards);
    return { total, soft, hideHole };
  }, [table, phase, dealerCardsToRender]);

  const heroSeat: BlackjackSeatState | null =
    table && heroSeatIndex !== null
      ? table.seats.find((s) => s.seatIndex === heroSeatIndex) ?? null
      : null;

  const heroHand =
    heroSeat && heroSeat.hands && heroSeat.hands.length > 0
      ? heroSeat.hands[activeHandIndex ?? 0] ?? heroSeat.hands[0]
      : null;

  const heroValue = useMemo(() => {
    if (!heroHand) return null;
    const { total, soft } = computeBlackjackValue(heroHand.cards);
    return { total, soft };
  }, [heroHand]);

  const isHeroTurn =
    phase === "player-action" &&
    heroSeatIndex !== null &&
    table?.activeSeatIndex === heroSeatIndex;

  // focus felt on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (!table) return;
    if (heroSeatIndex === null) return;

    const shouldFocusSeat =
      phase === "waiting-bets" ||
      phase === "round-complete" ||
      (phase === "player-action" && isHeroTurn);

    if (!shouldFocusSeat) return;

    const key = `${table.roundId}|${phase}|${heroSeatIndex}|${isHeroTurn ? "hero" : "no"}`;

    if (lastScrollKeyRef.current === key) return;
    lastScrollKeyRef.current = key;

    const t = window.setTimeout(() => {
      heroSeatRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }, 220);

    return () => window.clearTimeout(t);
  }, [isMobile, table?.roundId, phase, heroSeatIndex, isHeroTurn, table]);

  useEffect(() => {
    if (!isMobile) return;
    if (!isHeroTurn) return;

    const t = window.setTimeout(() => {
      heroPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 350);

    return () => window.clearTimeout(t);
  }, [isMobile, isHeroTurn]);

  const canDouble =
    isHeroTurn &&
    heroHand &&
    heroHand.cards.length === 2 &&
    heroHand.bet > 0 &&
    credits >= heroHand.bet;

  const canSplit =
    isHeroTurn &&
    heroHand &&
    heroHand.cards.length === 2 &&
    heroHand.bet > 0 &&
    credits >= heroHand.bet &&
    heroSeat &&
    heroSeat.hands.length < 2 &&
    heroHand.cards[0]?.[0] === heroHand.cards[1]?.[0];

  /* ───────────── Bet countdown ───────────── */

  const [betCountdown, setBetCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!table || !table.betDeadlineMs) {
      setBetCountdown(null);
      return;
    }

    const update = () => {
      const ms = table.betDeadlineMs! - Date.now();
      setBetCountdown(ms > 0 ? Math.ceil(ms / 1000) : 0);
    };

    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [table?.betDeadlineMs]);

  const showBetTimerOnFelt = phase === "waiting-bets" && betCountdown !== null;
  const isBetTimerCritical =
    phase === "waiting-bets" && betCountdown !== null && betCountdown <= 5;

  /* ───────────── Auto re-bet ───────────── */

  const [autoRebet, setAutoRebet] = useState(false);
  const [lastBet, setLastBet] = useState<number | null>(null);

  useEffect(() => {
    if (!table || heroSeatIndex === null) return;

    const phaseNow = table.phase;
    const heroSeatNow = table.seats.find((s) => s.seatIndex === heroSeatIndex);

    if (phaseNow === "round-complete" && heroSeatNow?.hands?.length) {
      const h0 = heroSeatNow.hands[0];
      if (h0.bet > 0) setLastBet(h0.bet);
    }

    if (
      autoRebet &&
      phaseNow === "waiting-bets" &&
      (!heroSeatNow?.hands || heroSeatNow.hands.length === 0) &&
      lastBet &&
      lastBet > 0
    ) {
      handlePlaceBetWithAmount(lastBet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, heroSeatIndex, autoRebet, lastBet]);

  /* ───────────── Action countdown ───────────── */

  const ACTION_WINDOW_SECONDS = 20;
  const [actionCountdown, setActionCountdown] = useState<number | null>(null);
  const autoStandKeyRef = useRef<string | null>(null);

  const actionTimerKey = useMemo(() => {
    if (!table || table.phase !== "player-action") return null;
    if (table.activeSeatIndex === null) return null;

    const seat = table.seats[table.activeSeatIndex];
    if (!seat) return null;

    const hand = seat.hands[table.activeHandIndex ?? 0] ?? seat.hands[0] ?? null;
    const cardsKey = hand?.cards.join(",") ?? "";
    return `${table.roundId}-${table.activeSeatIndex}-${table.activeHandIndex}-${cardsKey}`;
  }, [table]);

  useEffect(() => {
    if (!actionTimerKey) {
      setActionCountdown(null);
      return;
    }

    const startedAt = Date.now();
    setActionCountdown(ACTION_WINDOW_SECONDS);

    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = ACTION_WINDOW_SECONDS - elapsed;
      setActionCountdown(remaining > 0 ? Math.ceil(remaining) : 0);
    }, 250);

    return () => window.clearInterval(id);
  }, [actionTimerKey]);

  useEffect(() => {
    if (!table) return;
    if (!actionTimerKey) return;
    if (!isHeroTurn) return;
    if (heroSeatIndex === null) return;
    if (actionCountdown !== 0) return;

    if (autoStandKeyRef.current === actionTimerKey) return;
    autoStandKeyRef.current = actionTimerKey;

    const hi = table.activeHandIndex ?? 0;
    sendAction("stand", heroSeatIndex, hi);
  }, [table, actionTimerKey, isHeroTurn, heroSeatIndex, actionCountdown, sendAction]);

  const showActionTimerOnFelt =
    phase === "player-action" && actionCountdown !== null && activeSeatIndex !== null;

  const isActionTimerCritical =
    phase === "player-action" && actionCountdown !== null && actionCountdown <= 5;

  const showMobileBetControls = phase === "waiting-bets" || phase === "round-complete";

  /* ───────────── Status message ───────────── */

  const statusMessage =
    phase === "waiting-bets"
      ? betCountdown !== null
        ? `Place your bets — dealing in ${betCountdown}s…`
        : "Waiting for players to place initial bets."
      : phase === "dealing"
      ? "Dealing initial cards to players and dealer."
      : phase === "player-action"
      ? "Players act in turn: hit, stand, double, or split."
      : phase === "dealer-turn"
      ? "Dealer is drawing out their hand."
      : "Round complete. Place a new bet for the next hand.";

  /* ───────────── Table + seats ───────────── */

  const seats: BlackjackSeatState[] =
    table && Array.isArray(table.seats) && table.seats.length > 0
      ? table.seats
      : Array.from({ length: 7 }, (_, i) => ({
          seatIndex: i,
          playerId: null,
          bankroll: 10_000,
          hands: [],
        }));

  const canPlaceBet = useMemo(() => {
    if (heroSeatIndex === null) return false;
    if (!table) return true;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    if (!seat) return false;

    const hasLiveHand = seat.hands.some(
      (h) => h.bet > 0 && h.cards.length > 0 && String(h.result) === "pending"
    );

    return !hasLiveHand;
  }, [table, heroSeatIndex]);

  const playersIn = useMemo(() => {
    if (!table) return 0;
    return table.seats.filter(
      (s) => s.playerId && s.hands && s.hands.some((h) => h.bet > 0 && h.cards.length > 0)
    ).length;
  }, [table]);

  function handleSit(seatIndex: number) {
    sendSeat("sit", seatIndex);
  }

  function handleLeave(seatIndex: number) {
    sendSeat("leave", seatIndex);
  }

  const uiMinBet = table?.minBet ?? fallbackMinBet;
  const uiMaxBet = table?.maxBet ?? fallbackMaxBet;

  function clampBet(n: number) {
    const minBet = uiMinBet;
    const maxBet = uiMaxBet;
    if (!Number.isFinite(n)) return minBet;

    const cappedToWallet = Math.min(n, credits);
    return Math.max(minBet, Math.min(maxBet, Math.floor(cappedToWallet)));
  }

  function commitBetInput() {
    const parsed = Number(betInput);
    const clamped = clampBet(parsed);
    setBetAmount(clamped);
    setBetInput(String(clamped));
    return clamped;
  }

  function bumpBet(delta: number) {
    setBetAmount((prev) => {
      const next = prev + delta;
      const clamped = clampBet(next);
      setBetInput(String(clamped));
      return clamped;
    });
  }

  // ✅ set this to your actual enum accepted value (NOT "PAYOUT")
  const PAYOUT_TXTYPE = "WIN"; // <--- change if needed

  async function applyGld(deltaBalance: number, txType: string, meta?: any) {
    if (!playerId) throw new Error("Missing playerId");

    // ✅ ref must be unique per logical operation (except settlement, which should be idempotent)
    const ref =
      meta?.ref ??
      `bj:${txType}:${derivedRoomId}:${playerId}:${table?.roundId ?? "pre"}:${Date.now()}`;

    const payload = {
      playerId,
      kind: "gld",
      txType,
      deltaBalance,
      deltaReserved: 0,
      ref,
      meta: meta ?? null,
    };

    console.log("[BJ applyGld] request", payload);

    const res = await fetch("/api/chips/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[BJ applyGld] FAILED", { status: res.status, j });
      throw new Error(j?.error || "Chip update failed");
    }

    console.log("[BJ applyGld] OK", j);
    return j;
  }

  async function handlePlaceBetWithAmount(rawAmount: number) {
    if (!table) return;
    if (!playerId) return;
    if (heroSeatIndex === null) return;
    if (!canPlaceBet) return;

    const amount = clampBet(rawAmount);
    if (amount <= 0) return;

    if (credits < amount) return;

    try {
      const betRef = `bj:bet:${derivedRoomId}:${playerId}:${table.roundId}:${heroSeatIndex}`;

      await applyGld(-amount, "BET", {
        ref: betRef,
        bet: amount,
        roomId: derivedRoomId,
        roundId: table.roundId,
        seatIndex: heroSeatIndex,
      });

      placeBet(heroSeatIndex, amount);
      setLastBet(amount);

      await refreshChips?.();
    } catch (e) {
      console.error("[BJ] bet debit failed", e);
    }
  }

  function handlePlaceBet() {
    const amount = commitBetInput();
    handlePlaceBetWithAmount(amount);
  }


  
  async function handleAction(action: "hit" | "stand" | "double" | "split") {
    if (!table) return;
    if (!playerId) return;
    if (heroSeatIndex === null) return;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    if (!seat?.hands?.length) return;

    const handIndex = table.activeHandIndex ?? 0;
    const hand = seat.hands[handIndex];
    if (!hand) return;

    const baseBet = Number(hand.bet ?? 0);
    const extraWager = action === "double" ? baseBet : action === "split" ? baseBet : 0;

    if (extraWager > 0) {
      if (credits < extraWager) return;

      try {
        const extraRef = `bj:extra:${action}:${derivedRoomId}:${playerId}:${table.roundId}:${heroSeatIndex}:${handIndex}`;

        await applyGld(-extraWager, "BET", {
          ref: extraRef,
          roomId: derivedRoomId,
          roundId: table.roundId,
          action,
          extraWager,
          seatIndex: heroSeatIndex,
          handIndex,
        });
        // after successful applyGld debit:
const optKey = `${derivedRoomId}:${playerId}:${table.roundId}:${heroSeatIndex}:${handIndex}`;
optimisticExtraRef.current.set(optKey, (optimisticExtraRef.current.get(optKey) ?? 0) + extraWager);


        await refreshChips?.();
      } catch (e) {
        console.error("[BJ] extra wager debit failed", e);
        return; // do NOT send action if debit failed
      }
    }

    sendAction(action, heroSeatIndex, handIndex);
  }

  function handleNextHand() {
    if (!table || heroSeatIndex === null) return;
    sendAction("next-round", heroSeatIndex, 0);
  }

  async function handleReloadDemo() {
    try {
      await applyGld(+10_000, "BONUS", {
        ref: `bj:bonus:${derivedRoomId}:${playerId ?? "noid"}:${Date.now()}`,
        reason: "dev mint",
      });
      await refreshChips?.();
    } catch (e) {
      console.error(e);
    }
  }

  // ✅ settle payouts (single deduped effect)
  const settleInFlightRef = useRef<string | null>(null);
  const lastSettledKeyRef = useRef<string | null>(null);

  function normalizeResult(
    r: any
  ): "blackjack" | "win" | "push" | "lose" | "pending" {
    const s = String(r ?? "").toLowerCase();
    if (!s) return "pending";
    if (s.includes("pending")) return "pending";
    if (s.includes("push") || s.includes("tie")) return "push";
    if (s.includes("blackjack") || s === "bj") return "blackjack";
    if (
      s === "win" ||
      s.includes("won") ||
      s.includes("dealer-bust") ||
      s.includes("dealer_bust") ||
      s.includes("player-win")
    )
      return "win";
    if (
      s === "lose" ||
      s.includes("lost") ||
      s.includes("bust") ||
      s.includes("player-bust") ||
      s.includes("dealer-win")
    )
      return "lose";
    return "pending";
  }

  function roundChip(n: number) {
    return Math.round(n);
  }

  // TOTAL RETURN (bet already deducted earlier)
  // win => 2x bet returned
  // blackjack => 2.5x bet returned (3:2)
  // push => 1x bet returned
  // lose => 0
  function computeTotalReturnForHand(hand: any) {
    const bet = Number(hand?.bet ?? 0);
    if (!Number.isFinite(bet) || bet <= 0) return 0;

    const result = normalizeResult(hand?.result);

    if (result === "blackjack") return roundChip(bet * 2.5);
    if (result === "win") return roundChip(bet * 2.0);
    if (result === "push") return roundChip(bet * 1.0);
    return 0;
  }

  useEffect(() => {
    if (!table) return;
    if (!playerId) return;
    if (heroSeatIndex === null) return;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    if (!seat?.hands?.length) return;

    // wait until ALL hands resolved
    const allResolved = seat.hands.every((h) => normalizeResult(h?.result) !== "pending");
    if (!allResolved) return;

    const settleKey = `bj:settle:${derivedRoomId}:${playerId}:${table.roundId}`;

    if (lastSettledKeyRef.current === settleKey) return;
    if (settleInFlightRef.current === settleKey) return;

    let totalReturn = 0;
    for (const hand of seat.hands) totalReturn += computeTotalReturnForHand(hand);

    console.log("[BJ settle] running", { settleKey, totalReturn, hands: seat.hands });

    settleInFlightRef.current = settleKey;

    (async () => {
      try {
        if (totalReturn > 0) {
          const r = await applyGld(+totalReturn, PAYOUT_TXTYPE, {
            ref: settleKey, // ✅ idempotent per round
            roomId: derivedRoomId,
            roundId: table.roundId,
            seatIndex: heroSeatIndex,
            totalReturn,
            hands: seat.hands,
          });

          console.log("[BJ settle] apply OK", r);
        } else {
          console.log("[BJ settle] no return (losses only)", settleKey);
        }

        await refreshChips?.();

        lastSettledKeyRef.current = settleKey;
        console.log("[BJ settle] settled OK", settleKey);
      } catch (e) {
        console.error("[BJ settle] FAILED", e);
        // do not mark settled so it can retry
      } finally {
        if (settleInFlightRef.current === settleKey) settleInFlightRef.current = null;
      }
    })();
  }, [table, heroSeatIndex, derivedRoomId, playerId, refreshChips]);

  







 /* ───────────── Seat renderer ───────────── */

function renderSeat(seat: BlackjackSeatState) {
  const pos =
    (isMobile ? BJ_SEAT_POSITIONS_MOBILE : BJ_SEAT_POSITIONS)[seat.seatIndex] ??
    (isMobile ? BJ_SEAT_POSITIONS_MOBILE : BJ_SEAT_POSITIONS)[0];

    const liftedPos = useMemo(() => {
  // push bottom seats up on desktop a bit
  if (!isMobile && (seat.seatIndex === 2 || seat.seatIndex === 3 || seat.seatIndex === 4)) {
    return { ...pos, top: `calc(${pos.top} - 4%)` };
  }
  return pos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isMobile, seat.seatIndex, pos.left, pos.top]);


  const isHero = heroSeatIndex === seat.seatIndex;
  const seatTaken = !!seat.playerId;
  const takenByOther = seat.playerId && playerId && seat.playerId !== playerId;

  const tableInRound = phase !== "waiting-bets";
  if (!seatTaken && tableInRound) return null;

  const rawHands = seat.hands ?? [];

  // Dedupe hands (WS duplication guard)
  const handsToRender = rawHands.filter((h, idx, arr) => {
    const key = `${h.bet}|${h.result}|${(h.cards ?? []).join(",")}`;
    return idx === arr.findIndex((x) => `${x.bet}|${x.result}|${(x.cards ?? []).join(",")}` === key);
  });

  const primaryHand = handsToRender.length > 0 ? handsToRender[0] : null;

  const isActive = activeSeatIndex === seat.seatIndex;
  const isMySeat = !!playerId && seat.playerId === playerId;

  const showBetUI =
    isMySeat && (phase === "waiting-bets" || phase === "round-complete") && canPlaceBet;

  const showActions = isMySeat && phase === "player-action" && isActive;
  const showSit = !takenByOther && !seatTaken && phase === "waiting-bets";

  const layout =
    seat.seatIndex === 0 ||
    seat.seatIndex === 1 ||
    seat.seatIndex === 5 ||
    seat.seatIndex === 6
      ? "side"
      : "bottom";

  const isLeftSideSeat = seat.seatIndex >= 3;

  const mobileScale = isMobile ? (isActive ? 1.06 : 0.90) : isHero ? 1.03 : 1.0;

  const mobileOpacity = (() => {
    if (!isMobile) return "";
    if (isHero) return "opacity-100";
    if (phase === "player-action") return isActive ? "opacity-100" : "opacity-70";
    return "opacity-100";
  })();

  const value =
    primaryHand && (primaryHand.cards?.length ?? 0) > 0
      ? computeBlackjackValue(primaryHand.cards)
      : null;

  // ---- totals ----
  const baseTotalBet = handsToRender.reduce((sum, h) => sum + Number(h?.bet ?? 0), 0);
  const totalReturn = handsToRender.reduce((sum, h) => sum + computeTotalReturnForHand(h), 0);

  const allResolved =
    handsToRender.length > 0 &&
    handsToRender.every((h) => {
      const r = String(h?.result ?? "").toLowerCase();
      return r && r !== "pending";
    });

  const pnl = allResolved ? (totalReturn - baseTotalBet) : 0;

  // optimistic extra for THIS seat/round/player
  const optimisticExtra = (() => {
    if (!table || !playerId) return 0;
    const keyPrefix = `${derivedRoomId}:${playerId}:${table.roundId}:${seat.seatIndex}:`;
    let sum = 0;
    for (const [key, v] of optimisticExtraRef.current.entries()) {
      if (key.startsWith(keyPrefix)) sum += Number(v ?? 0);
    }
    return sum;
  })();

  const displayedTotalBet = showBetUI ? betAmount : Math.max(0, baseTotalBet + optimisticExtra);

  const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString();

  // tight sizes
  const boxW = isMobile ? "w-[112px]" : "w-[128px]";
  const pad = isMobile ? "p-2" : "p-2.5";
  const btnH = isMobile ? "h-9" : "h-10";

  const toneBorder =
    allResolved && displayedTotalBet > 0
      ? pnl > 0
        ? "border-emerald-300/60"
        : pnl < 0
        ? "border-red-300/60"
        : "border-white/20"
      : "border-white/20";

 const BetBox = (align: "left" | "center") => {
  // ----- derive small state flags -----
  const hasAnyBet = displayedTotalBet > 0;

  const inHand =
    hasAnyBet &&
    (phase === "dealing" || phase === "player-action" || phase === "dealer-turn");

  const canPlaceNow = showBetUI; // you already computed this

  // Round result flash setup (WIN/LOSE/PUSH) – UI only
  const flashKey = table && playerId ? `${derivedRoomId}:${playerId}:${table.roundId}:${seat.seatIndex}` : "";
  const now = Date.now();
  const existingFlash = flashKey ? ctaFlashRef.current.get(flashKey) : null;

  // If round resolved and we have a bet, set/refresh a flash for 1.2s
  if (flashKey && allResolved && hasAnyBet) {
    const tone: "win" | "lose" | "push" = pnl > 0 ? "win" : pnl < 0 ? "lose" : "push";
    const label =
      tone === "win" ? `WIN +${fmt(Math.abs(pnl))}` : tone === "lose" ? `LOSE -${fmt(Math.abs(pnl))}` : "PUSH 0";

    // only set if missing/expired or different round result
    if (!existingFlash || existingFlash.until < now) {
      ctaFlashRef.current.set(flashKey, { label, tone, until: now + 1200 });
    }
  }

  const flash = existingFlash && existingFlash.until > now ? existingFlash : null;

  // Main CTA label + styling
  const cta = (() => {
    if (flash) return { label: flash.label, mode: "flash" as const, tone: flash.tone };
    if (inHand) return { label: `BET IN • ${fmt(displayedTotalBet)}`, mode: "locked" as const, tone: "push" as const };
    return { label: "PLACE BET", mode: "bet" as const, tone: "push" as const };
  })();

  const ctaClass = (() => {
    if (cta.mode === "flash") {
      if (cta.tone === "win")
        return "bg-emerald-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.55)]";
      if (cta.tone === "lose")
        return "bg-red-500 text-black shadow-[0_0_16px_rgba(239,68,68,0.55)]";
      return "bg-slate-300 text-black shadow-[0_0_14px_rgba(148,163,184,0.45)]";
    }
    if (cta.mode === "locked") {
      return "bg-white/10 text-white/80 border border-white/15";
    }
    return "bg-emerald-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.55)]";
  })();

  // tighter sizes
  const boxW = isMobile ? "w-[112px]" : "w-[128px]";
  const pad = isMobile ? "p-2" : "p-2.5";
  const btnH = isMobile ? "h-8" : "h-9"; // tighter than before
  const smallBtnH = isMobile ? "h-8" : "h-9";

  return (
    <div className={align === "center" ? "flex flex-col items-center" : "flex flex-col items-start"}>
      <div
  className={[
    "rounded-xl bg-black/80 border",
    toneBorder,
    "shadow-[0_0_16px_rgba(0,0,0,0.55)]",
    boxW,
    pad,
    "min-h-[142px] md:min-h-[150px]",
  ].join(" ")}
>
        {/* TOP: Total bet + +/- */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-emerald-200/90">
              Bet Total
            </div>
            <div className="font-mono text-[15px] font-extrabold text-white leading-none truncate">
              {fmt(displayedTotalBet)}
            </div>

            {/* Resolved summary line (tight) */}
            {hasAnyBet && allResolved ? (
              <div className="mt-1 flex items-center gap-2">
                <div className="text-[9px] font-bold text-white/55">Return</div>
                <div className="font-mono text-[11px] font-extrabold text-white">{fmt(totalReturn)}</div>
                <div
                  className={[
                    "ml-auto rounded-md px-2 py-[2px]",
                    "font-mono text-[11px] font-extrabold",
                    pnl > 0
                      ? "bg-emerald-400/90 text-black"
                      : pnl < 0
                      ? "bg-red-500/85 text-black"
                      : "bg-white/10 text-white",
                  ].join(" ")}
                >
                  {pnl >= 0 ? "+" : "-"}
                  {fmt(Math.abs(pnl))}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[9px] text-white/45">{hasAnyBet ? "In hand" : "—"}</div>
            )}
          </div>

          {/* +/- only when placing bet */}
          {canPlaceNow ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  bumpBet(+BET_STEP);
                }}
                className={[
                  "w-8 h-8 rounded-lg",
                  "bg-emerald-400 text-black",
                  "font-extrabold text-[18px] leading-none",
                  "shadow-[0_0_10px_rgba(16,185,129,0.40)]",
                  "active:scale-95",
                ].join(" ")}
                aria-label="Increase bet"
              >
                +
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  bumpBet(-BET_STEP);
                }}
                className={[
                  "w-8 h-8 rounded-lg",
                  "bg-white/10 text-white",
                  "border border-white/15",
                  "font-extrabold text-[18px] leading-none",
                  "active:scale-95",
                ].join(" ")}
                aria-label="Decrease bet"
              >
                −
              </button>
            </div>
          ) : null}
        </div>

       {/* FIXED CONTROL AREA: either CTA or ACTION GRID (no extra height) */}
<div className="mt-2">
  {seatTaken && showActions ? (
    // ACTION MODE: uses the same vertical space as the CTA button
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={() => handleAction("hit")}
        className={[
          "h-9 rounded-lg bg-emerald-500/90 text-black",
          "font-extrabold text-[11px] tracking-[0.12em] uppercase",
          "shadow-[0_0_10px_rgba(16,185,129,0.30)] active:scale-95",
        ].join(" ")}
      >
        Hit
      </button>

      <button
        type="button"
        onClick={() => handleAction("stand")}
        className={[
          "h-9 rounded-lg bg-slate-950/90 text-white border border-white/15",
          "font-extrabold text-[11px] tracking-[0.12em] uppercase active:scale-95",
        ].join(" ")}
      >
        Stand
      </button>

      <button
        type="button"
        onClick={() => handleAction("double")}
        disabled={!canDouble}
        className={[
          "h-9 rounded-lg",
          canDouble
            ? "bg-emerald-200 text-black border border-emerald-50"
            : "bg-white/5 text-white/35 border border-white/10 cursor-not-allowed",
          "font-extrabold text-[11px] tracking-[0.12em] uppercase active:scale-95",
        ].join(" ")}
      >
        Double
      </button>

      <button
        type="button"
        onClick={() => handleAction("split")}
        disabled={!canSplit}
        className={[
          "h-9 rounded-lg",
          canSplit
            ? "bg-emerald-700 text-white border border-emerald-300/30"
            : "bg-white/5 text-white/35 border border-white/10 cursor-not-allowed",
          "font-extrabold text-[11px] tracking-[0.12em] uppercase active:scale-95",
        ].join(" ")}
      >
        Split
      </button>
    </div>
  ) : (
    // CTA MODE: exactly one row height
    (!seatTaken && showSit ? (
      <button
        type="button"
        onClick={() => handleSit(seat.seatIndex)}
        className={[
          "w-full h-9 rounded-lg bg-emerald-400 text-black",
          "font-extrabold text-[12px] tracking-[0.14em] uppercase",
          "shadow-[0_0_14px_rgba(16,185,129,0.45)] active:scale-95",
        ].join(" ")}
      >
        Sit
      </button>
    ) : (
      <button
        type="button"
        onClick={cta.mode === "bet" ? handlePlaceBet : undefined}
        disabled={cta.mode !== "bet"}
        className={[
          "w-full h-9 rounded-lg",
          ctaClass,
          "font-extrabold text-[11px] tracking-[0.14em] uppercase",
          "active:scale-95",
          cta.mode !== "bet" ? "cursor-default" : "",
        ].join(" ")}
      >
        {cta.label}
      </button>
    ))
  )}
</div>

      </div>
    </div>
  );
};


  const seatWrapperProps = isHero ? { ref: heroSeatRef } : {};

  // Bottom seats
  if (layout === "bottom") {
    return (
      <div key={seat.seatIndex} {...seatWrapperProps} className="absolute" style={pos}>
        <div
          className={[
            "relative flex flex-col items-center justify-center",
            "transition-transform transition-opacity duration-300 ease-out md:scale-100",
            mobileOpacity,
          ].join(" ")}
          style={{ transform: isMobile ? `scale(${mobileScale})` : undefined }}
        >
          {isActive && (
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/16 blur-xl" />
          )}

          {isActive && isMySeat && (
            <div className="mb-1 rounded-full bg-emerald-400/90 px-2 py-[2px] text-[10px] font-extrabold text-black border border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.6)]">
              Your turn
            </div>
          )}

          {/* Cards */}
          <div className="relative z-[1] flex flex-col items-center justify-center">
            {primaryHand && (primaryHand.cards?.length ?? 0) > 0 && (
              <>
                <div className="flex flex-col items-center justify-center gap-1">
                  {handsToRender.map((hand, handIndex) => (
                    <div key={`seat-${seat.seatIndex}-hand-${handIndex}`} className="relative flex">
                      <ResultPill result={hand.result} />
                      {hand.cards.map((c, i) => {
                        const overlap = hand.cards.length >= 4;
                        const style: CSSProperties = overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};
                        return (
                          <div key={`seat-${seat.seatIndex}-hand-${handIndex}-card-${i}`} style={style}>
                            <BJCard card={c} small />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Hand total pill (kept clean, never covered) */}
                {value && (
                  <div className="mt-1 flex justify-center">
                    <div
                      className={[
                        "rounded-full border px-3 py-[3px]",
                        "text-[11px] md:text-xs font-mono font-bold",
                        "shadow-[0_0_14px_rgba(16,185,129,0.25)]",
                        isHero
                          ? "bg-black/90 border-emerald-300/45 text-emerald-100"
                          : "bg-black/80 border-white/25 text-white/90",
                      ].join(" ")}
                    >
                      Total {value.total}
                      {value.soft ? " (soft)" : ""}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tight bet box under cards */}
          <div className="relative z-[2] mt-2">{BetBox("center")}</div>
        </div>
      </div>
    );
  }

  // Side seats
  return (
    <div key={seat.seatIndex} {...seatWrapperProps} className="absolute" style={pos}>
      <div
        className={[
          "relative transition-transform transition-opacity duration-300 ease-out md:scale-100",
          mobileOpacity,
        ].join(" ")}
        style={{
          transform: isMobile ? `scale(${mobileScale})` : undefined,
          transformOrigin: "center center",
        }}
      >
        {isActive && (
          <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/16 blur-xl" />
        )}

        {/* Tight bet box beside cards */}
        {isLeftSideSeat ? (
          <div className={["absolute right-full top-1/2 z-[2] -translate-y-1/2", isMobile ? "pr-1" : "pr-2"].join(" ")}>
            {BetBox("left")}
          </div>
        ) : (
          <div className={["absolute left-full top-1/2 z-[2] -translate-y-1/2", isMobile ? "pl-1" : "pl-2"].join(" ")}>
            {BetBox("left")}
          </div>
        )}

        {/* Cards */}
        <div className="relative z-[1] flex flex-col items-center justify-center">
          {primaryHand && (primaryHand.cards?.length ?? 0) > 0 && (
            <>
              <div className="flex flex-col items-center justify-center gap-1">
                {handsToRender.map((hand, handIndex) => (
                  <div key={`seat-${seat.seatIndex}-hand-${handIndex}`} className="relative flex">
                    <ResultPill result={hand.result} />
                    {hand.cards.map((c, i) => {
                      const overlap = hand.cards.length >= 4;
                      const style: CSSProperties = overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};
                      return (
                        <div key={`seat-${seat.seatIndex}-hand-${handIndex}-card-${i}`} style={style}>
                          <BJCard card={c} small />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {value && (
                <div className="mt-1 flex justify-center">
                  <div
                    className={[
                      "rounded-full border px-3 py-[3px]",
                      "text-[11px] md:text-xs font-mono font-bold",
                      "shadow-[0_0_14px_rgba(16,185,129,0.25)]",
                      isHero
                        ? "bg-black/90 border-emerald-300/45 text-emerald-100"
                        : "bg-black/80 border-white/25 text-white/90",
                    ].join(" ")}
                  >
                    Total {value.total}
                    {value.soft ? " (soft)" : ""}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}




  /* ───────────── Render ───────────── */

  return (
    <div className="space-y-3 pb-20 md:space-y-4 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Base Gold Rush • Live Blackjack
          </div>

          <div className="hidden md:block">
            <div className="text-sm text-white/80">
              Room ID:{" "}
              <span className="font-mono text-[#FFD700]/90">{derivedRoomId}</span>
            </div>
            <div className="text-[11px] text-white/60">
              Phase: <span className="font-mono">{phase}</span>
            </div>
          </div>
        </div>

        {/* Wallet + WS (desktop) */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-white/60">
          <span className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[#FFD700]">
            GLD: {credits.toLocaleString()}
          </span>

          <span className="font-mono text-xs text-white/50">WS: {wsUrl}</span>
          <span
            className={
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] " +
              (connected
                ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-200"
                : "border-red-400/70 bg-red-500/15 text-red-200")
            }
          >
            <span
              className={
                "h-2 w-2 rounded-full " +
                (connected ? "bg-emerald-400" : "bg-red-400")
              }
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Table container */}
      <div
        ref={tableWrapRef}
        className={[
          "relative rounded-3xl border border-[#FFD700]/40 bg-gradient-to-b from-black via-slate-950 to-black shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden",
          isFullscreen
            ? "fixed inset-0 z-[9999] rounded-none border-0 p-2 md:p-4 overflow-y-auto"
            : "p-3 md:p-6",
        ].join(" ")}
      >
        <style jsx>{`
          @keyframes dealerIn {
            0% {
              opacity: 0;
              transform: translateY(10px) scale(0.96);
              filter: blur(0.6px);
            }
            100% {
              opacity: 1;
              transform: translateY(0px) scale(1);
              filter: blur(0px);
            }
          }
        `}</style>

        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
        </div>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-3 top-3 z-[80] rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] text-white/80 hover:bg-black/75"
        >
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>

        {/* Felt stage */}
        <div
          className={[
            "relative z-[1] mx-auto flex w-full items-center justify-center",
            isFullscreen ? "h-full" : "",
          ].join(" ")}
        >
          <div
            className={[
              "relative",
              isFullscreen ? "w-full h-full max-w-none" : "w-full max-w-[900px]",
              "aspect-[9/10] sm:aspect-[10/11] md:aspect-[16/9]",
              "-translate-x-[1%]",
            ].join(" ")}
          >
            <Image
              src="/felt/bgr-blackjack-table.png"
              alt="Base Gold Rush Live Blackjack Table"
              fill
              priority
              className="object-contain object-center pointer-events-none select-none"
            />

            {/* Dealer (top center) */}
            <div className="pointer-events-none absolute left-1/2 top-[26%] md:top-[18%] -translate-x-1/2 z-[40] flex flex-col items-center gap-1.5">
              <div className="flex items-center justify-center">
                <div className="flex">
                  {dealerCardsToRender.map((c: string, i: number) => {
                    const overlap = dealerCardsToRender.length >= 4;
                    const style: CSSProperties =
                      overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};
                    const isNewest = i === dealerNewCardIndex.current;

                    return (
                      <div
                        key={`dealer-card-${i}-${dealerNewCardTick}`}
                        style={style}
                        className="transition-all duration-500 ease-out"
                      >
                        <div className={isNewest ? "animate-[dealerIn_0.55s_ease-out_forwards]" : ""}>
                          <BJCard card={c} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-full bg-black/70 px-3 py-1 text-[10px] text-white/80 border border-white/20">
                Dealer
              </div>

              {dealerValue && (
                <div
                  className={[
                    "rounded-full",
                    "px-3 py-1.5 md:px-5 md:py-2",
                    "bg-black/90 border border-[#FFD700]",
                    "shadow-[0_0_18px_rgba(250,204,21,0.75)] md:shadow-[0_0_26px_rgba(250,204,21,0.9)]",
                    "flex items-center gap-2",
                    "text-[#FFEFA3] font-semibold",
                    "text-[12px] md:text-[13px]",
                  ].join(" ")}
                >
                  <span className="uppercase tracking-[0.18em] text-[9px] md:text-[8px] text-white/75">
                    {dealerValue.hideHole && (phase === "player-action" || phase === "dealing")
                      ? "Total (showing):"
                      : "Total:"}
                  </span>

                  <span className="font-mono text-[16px] md:text-[20px] drop-shadow-[0_0_10px_rgba(250,204,21,1)]">
                    {dealerValue.total}
                  </span>

                  {dealerValue.soft && (
                    <span className="ml-1 text-[11px] md:text-[10px] text-emerald-300 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,1)]">
                      soft
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bet countdown on felt */}
            {showBetTimerOnFelt && (
              <div className="pointer-events-none absolute left-1/2 top-[9%] -translate-x-1/2 z-[45] flex flex-col items-center gap-1">
                <div
                  className={[
                    "rounded-full px-5 py-2 shadow-[0_0_25px_rgba(0,0,0,0.9)] border text-center",
                    "font-mono text-[9px] md:text-xs tracking-[0.18em] uppercase",
                    isBetTimerCritical
                      ? "bg-red-600 border-red-300 text-black animate-pulse"
                      : "bg-black/85 border-[#FFD700]/70 text-[#FFD700]",
                  ].join(" ")}
                >
                  Place your bets
                </div>
                <div
                  className={[
                    "flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2 font-mono text-lg md:text-2xl",
                    isBetTimerCritical
                      ? "border-red-300 bg-red-700 text-black shadow-[0_0_24px_rgba(248,113,113,0.9)]"
                      : "border-[#FFD700] bg-black/80 text-[#FFD700] shadow-[0_0_24px_rgba(250,204,21,0.8)]",
                  ].join(" ")}
                >
                  {betCountdown}
                </div>
              </div>
            )}

            {/* Action timer on felt */}
            {showActionTimerOnFelt && (
              <div className="pointer-events-none absolute left-1/2 top-[0%] -translate-x-1/2 z-[60] flex flex-col items-center gap-1">
                <div
                  className={[
                    "rounded-full px-4 py-1 border text-center font-mono text-[8px] md:text-xs uppercase tracking-[0.18em]",
                    isActionTimerCritical
                      ? "bg-red-600 border-red-300 text-black animate-pulse"
                      : "bg-black/85 border-emerald-300/70 text-emerald-200",
                  ].join(" ")}
                >
                  Player {activeSeatIndex! + 1} to act
                </div>
                <div
                  className={[
                    "flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border-2 font-mono text-lg md:text-2xl",
                    isActionTimerCritical
                      ? "border-red-300 bg-red-700 text-black shadow-[0_0_22px_rgba(248,113,113,0.9)]"
                      : "border-emerald-300 bg-black/80 text-emerald-200 shadow-[0_0_22px_rgba(16,185,129,0.8)]",
                  ].join(" ")}
                >
                  {actionCountdown}
                </div>
              </div>
            )}

            {/* Seats */}
            <div className="absolute inset-0 z-[40]">{seats.map((s) => renderSeat(s))}</div>
          </div>
        </div>

        {/* Status strip under felt */}
        <div className="mt-2 rounded-full border border-white/15 bg-gradient-to-r from-black via-slate-900 to-black px-3 py-1 text-[10px] md:text-[11px] text-white/80 shadow-[0_0_25px_rgba(0,0,0,0.7)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
            Table Status&nbsp;&nbsp;
          </span>
          <span>{statusMessage}</span>
          {activeSeatIndex !== null && table && (
            <span className="ml-2 text-white/65">
              • Current turn: Seat {activeSeatIndex + 1}
              {table.seats[activeSeatIndex]?.playerId === playerId && " (you)"}
            </span>
          )}
          {playersIn > 0 && (
            <span className="ml-2 font-mono text-[9px] text-white/60">
              • Players in: {playersIn}/{seats.length}
            </span>
          )}
        </div>
      </div>

      {/* MOBILE hero panel */}
      {heroSeat && (
        <div
          ref={heroPanelRef}
          className="mt-2 flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/40 p-2 md:hidden"
        >
          {/* Wallet strip */}
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full border border-[#FFD700]/40 bg-black/70 px-3 py-1 text-[11px] font-mono text-[#FFD700]">
              GLD: {credits.toLocaleString()}
            </div>
            <div className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] text-white/70">
              Limits: {uiMinBet.toLocaleString()}–{uiMaxBet.toLocaleString()}
            </div>
          </div>

          {heroHand && heroValue && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={[
                  "rounded-full px-4 py-1.5",
                  "bg-black/85 border border-[#FFD700]",
                  "shadow-[0_0_22px_rgba(250,204,21,0.85)]",
                  "flex items-center gap-1.5",
                  "text-[13px] text-[#FFD700] font-semibold",
                ].join(" ")}
              >
                <span className="uppercase tracking-[0.18em] text-[9px] text-white/70">
                  Total
                </span>
                <span className="font-mono text-[18px] drop-shadow-[0_0_8px_rgba(250,204,21,1)]">
                  {heroValue.total}
                </span>
                {heroValue.soft && (
                  <span className="ml-1 text-[10px] text-emerald-300 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,1)]">
                    soft
                  </span>
                )}
              </span>

              {typeof heroHand.bet === "number" && heroHand.bet > 0 && (
                <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
                  Bet: {heroHand.bet.toLocaleString()} GLD
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {isHeroTurn && heroHand && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAction("hit")}
                className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-center font-semibold text-black hover:bg-emerald-400"
              >
                Hit
              </button>
              <button
                type="button"
                onClick={() => handleAction("stand")}
                className="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-center font-semibold text-white hover:bg-slate-600"
              >
                Stand
              </button>
              {canDouble && (
                <button
                  type="button"
                  onClick={() => handleAction("double")}
                  className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-center font-semibold text-black hover:bg-amber-400"
                >
                  Double
                </button>
              )}
              {canSplit && (
                <button
                  type="button"
                  onClick={() => handleAction("split")}
                  className="flex-1 rounded-lg bg-purple-500 px-3 py-1.5 text-center font-semibold text-black hover:bg-purple-400"
                >
                  Split
                </button>
              )}
            </div>
          )}

          {/* Betting controls */}
          {showMobileBetControls && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div>
                <div className="text-[10px] text-white/50">Bet amount</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={uiMinBet}
                    max={Math.min(uiMaxBet, credits)}
                    value={betInput}
                    onChange={(e) => setBetInput(e.target.value)}
                    onBlur={() => commitBetInput()}
                    className="w-24 rounded-lg border border-white/25 bg-black/70 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
                  />
                  <span className="font-mono text-[#FFD700]">GLD</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceBet}
                disabled={!canPlaceBet || credits < uiMinBet}
                className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
              >
                {phase === "round-complete" ? "Bet next hand" : "Place bet"}
              </button>

              <button
                type="button"
                onClick={handleReloadDemo}
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700"
              >
                Mint 10,000 GLD
              </button>

              {heroSeatIndex !== null && (
                <button
                  type="button"
                  onClick={() => handleLeave(heroSeatIndex)}
                  className="rounded-lg border border-slate-600 bg-black/75 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
                >
                  Leave seat
                </button>
              )}
            </div>
          )}

          {/* Auto re-bet toggle */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] text-white/60">
              <input
                type="checkbox"
                checked={autoRebet}
                onChange={(e) => setAutoRebet(e.target.checked)}
                className="h-3 w-3 rounded border-white/40 bg-black/60"
              />
              <span>Auto re-bet last amount</span>
            </label>

            {lastBet !== null && (
              <span className="text-[10px] text-white/45">
                Last bet:{" "}
                <span className="font-mono text-[#FFD700]">
                  {lastBet.toLocaleString()} GLD
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* DESKTOP controls row */}
      <div className="mt-3 hidden gap-3 md:grid md:grid-cols-[2fr_1.2fr]">
        <div className="space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Your Controls
          </div>

          {/* Wallet + limits */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[#FFD700]">
              GLD: {credits.toLocaleString()}
            </span>
            <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] text-white/70">
              Limits: {uiMinBet.toLocaleString()}–{uiMaxBet.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-[10px] text-white/50">Bet amount</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={uiMinBet}
                  max={Math.min(uiMaxBet, credits)}
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  onBlur={() => commitBetInput()}
                  className="w-24 rounded-lg border border-white/25 bg-black/70 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
                />
                <span className="font-mono text-[#FFD700]">GLD</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={!canPlaceBet || credits < uiMinBet}
              className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
            >
              {phase === "round-complete" ? "Bet for next hand" : "Place bet"}
            </button>

            {phase === "round-complete" && (
              <button
                type="button"
                onClick={handleNextHand}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-black hover:bg-emerald-400"
              >
                Next hand
              </button>
            )}

            <button
              type="button"
              onClick={handleReloadDemo}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700"
            >
              Mint 10,000 GLD
            </button>

            {heroSeatIndex !== null && (
              <button
                type="button"
                onClick={() => handleLeave(heroSeatIndex)}
                className="rounded-lg border border-slate-600 bg-black/75 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                Leave seat
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] text-white/60">
              <input
                type="checkbox"
                checked={autoRebet}
                onChange={(e) => setAutoRebet(e.target.checked)}
                className="h-3 w-3 rounded border-white/40 bg-black/60"
              />
              <span>Auto re-bet last amount</span>
            </label>

            {lastBet !== null && (
              <span className="text-[10px] text-white/45">
                Last bet:{" "}
                <span className="font-mono text-[#FFD700]">
                  {lastBet.toLocaleString()} GLD
                </span>
              </span>
            )}
          </div>

          {isHeroTurn && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction("hit")}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-black hover:bg-emerald-400"
              >
                Hit
              </button>

              <button
                type="button"
                onClick={() => handleAction("stand")}
                className="rounded-lg bg-slate-700 px-3 py-1.5 font-semibold text-white hover:bg-slate-600"
              >
                Stand
              </button>

              {canDouble && (
                <button
                  type="button"
                  onClick={() => handleAction("double")}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black hover:bg-amber-400"
                >
                  Double
                </button>
              )}

              {canSplit && (
                <button
                  type="button"
                  onClick={() => handleAction("split")}
                  className="rounded-lg bg-purple-500 px-3 py-1.5 font-semibold text-black hover:bg-purple-400"
                >
                  Split
                </button>
              )}
            </div>
          )}

          <div className="mt-2 text-[10px] text-white/50">
            Flow: sit at a seat, set your bet, press{" "}
            <span className="font-semibold text-[#FFD700]">Place bet</span> to
            deal cards, then use{" "}
            <span className="font-semibold">Hit / Stand / Double / Split</span>.
          </div>
        </div>

        {/* Status / debug (desktop only) */}
        <div className="hidden md:block space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Table Status
          </div>
          <p>
            Phase: <span className="font-mono">{phase}</span>
          </p>
          <p className="text-[10px] text-white/55">{statusMessage}</p>
          <div className="mt-2 rounded-lg bg-black/40 p-2 text-[10px] font-mono text-white/60">
            <div>Hero seat: {heroSeatIndex ?? "none"}</div>
            <div>Room: {derivedRoomId}</div>
            <div>
              Limits: {uiMinBet}–{uiMaxBet} • Wallet: {credits}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
