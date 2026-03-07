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
} from "@/lib/blackjackClient/useBlackjackRoom";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { usePlayerChips } from "@/lib/chips/usePlayerChips";

/** Fallbacks (server/table values override these once connected) */
const DEFAULT_ROOM_ID = "bgld-blackjack-room-1";
const FALLBACK_MIN_BET = 50;
const FALLBACK_MAX_BET = 5000;

const BET_STEP = 50;
const GLD_PER_USD = 100;

/**
 * Seat positions (7 seats) for DESKTOP only.
 * 0 = far right, 6 = far left, arcing up toward table edge.
 */
const BJ_SEAT_POSITIONS: CSSProperties[] = [
  { left: "76%", top: "24%" },
  { left: "74%", top: "40%" },
  { left: "64%", top: "53%" },
  { left: "44%", top: "59%" },
  { left: "24%", top: "53%" },
  { left: "14%", top: "40%" },
  { left: "12%", top: "24%" },
];

/**
 * Mobile positions tightened upward to reduce overlap with bottom controls.
 */
const BJ_SEAT_POSITIONS_MOBILE: CSSProperties[] = [
  { left: "83%", top: "29%" },
  { left: "77%", top: "38%" },
  { left: "66%", top: "46%" },
  { left: "50%", top: "50%" },
  { left: "34%", top: "46%" },
  { left: "23%", top: "38%" },
  { left: "17%", top: "29%" },
];

/* ───────────── Helpers ───────────── */

function gldToUsd(gld: number) {
  return (Number(gld || 0) / GLD_PER_USD).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

type BJCardProps = {
  card: string;
  small?: boolean;
  animateFlip?: boolean;
  animatePop?: boolean;
};

function BJCard({
  card,
  small = false,
  animateFlip = false,
  animatePop = false,
}: BJCardProps) {
  const { isBack, rankLabel, suitLabel, suitColor } = parseCard(card);

  const baseSize = small
    ? "w-9 h-12 text-[11px] md:w-10 md:h-14 md:text-[12px]"
    : "w-11 h-16 text-sm md:w-[66px] md:h-[96px] md:text-[18px]";

  const backFace = (
    <div className="h-full w-full rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-slate-900 border border-white/40 shadow-[0_4px_10px_rgba(0,0,0,0.75)] flex items-center justify-center">
      <div className="w-[80%] h-[80%] rounded-md border border-white/40 bg-[radial-gradient(circle_at_top,#38bdf8_0,#0f172a_70%)]" />
    </div>
  );

  const frontFace = (
    <div className="h-full w-full relative rounded-lg bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.45)] flex flex-col justify-between px-1 py-0.5">
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

  // simple back card
  if (isBack) {
    return (
      <div
        className={[
          "relative",
          baseSize,
          animatePop ? "animate-[bjCardPop_320ms_ease-out]" : "",
        ].join(" ")}
      >
        {backFace}
      </div>
    );
  }

  // normal visible face card
  if (!animateFlip) {
    return (
      <div
        className={[
          "relative",
          baseSize,
          animatePop ? "animate-[bjCardPop_320ms_ease-out]" : "",
        ].join(" ")}
      >
        {frontFace}
      </div>
    );
  }

  // animated flip from back -> front
  return (
    <div
      className={[
        "relative",
        baseSize,
        animatePop ? "animate-[bjCardPop_320ms_ease-out]" : "",
      ].join(" ")}
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative h-full w-full animate-[bjCardFlip_520ms_ease-out_forwards]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {backFace}
        </div>

        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {frontFace}
        </div>
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

  const derivedRoomId = useMemo(() => {
    if (!pathname) return DEFAULT_ROOM_ID;
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "blackjack-live");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return DEFAULT_ROOM_ID;
  }, [pathname]);

  const queryMin = Number(searchParams?.get("min") ?? "");
  const queryMax = Number(searchParams?.get("max") ?? "");
  const fallbackMinBet =
    Number.isFinite(queryMin) && queryMin > 0 ? queryMin : FALLBACK_MIN_BET;
  const fallbackMaxBet =
    Number.isFinite(queryMax) && queryMax > 0 ? queryMax : FALLBACK_MAX_BET;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const queryName = (searchParams?.get("name") ?? "").trim();
  const displayTableName = queryName || "Big Nugget 21";

  const [isFullscreen, setIsFullscreen] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const heroSeatRef = useRef<HTMLDivElement | null>(null);
  const heroPanelRef = useRef<HTMLDivElement | null>(null);
  const lastScrollKeyRef = useRef<string | null>(null);

  const optimisticExtraRef = useRef<Map<string, number>>(new Map());
  const seenDealerCardsRef = useRef<Set<string>>(new Set());
  const seenPlayerCardsRef = useRef<Set<string>>(new Set());
  const [dealerTotalPulseTick, setDealerTotalPulseTick] = useState(0);
  const lastDealerTotalRef = useRef<number | null>(null);

  type SeatOutcome = {
    key: string;
    label: "WIN" | "LOSE" | "PUSH" | "BJ";
    pnl: number;
    until: number;
  };

  type BetFlash = {
    key: string;
    amount: number;
    until: number;
  };

  const seatOutcomeFlashRef = useRef<Map<string, SeatOutcome>>(new Map());
  const betFlashRef = useRef<Map<string, BetFlash>>(new Map());
  const [, forceSeatFlashRerender] = useState(0);

  const dealerNewCardIndex = useRef<number>(-1);
  const [dealerNewCardTick, setDealerNewCardTick] = useState(0);

  const isIOS =
    typeof window !== "undefined" &&
    (() => {
      const ua = navigator.userAgent || "";
      const iOSUA = /iPad|iPhone|iPod/.test(ua);
      const iPadOS13Plus =
        navigator.platform === "MacIntel" &&
        (navigator as any).maxTouchPoints > 1;
      return iOSUA || iPadOS13Plus;
    })();

  const enterPseudoFullscreen = () => {
    setIsFullscreen(true);
    document.documentElement.classList.add("overflow-hidden");
    document.body.classList.add("overflow-hidden");
    window.scrollTo({ top: 0, behavior: "instant" as any });
  };

  const exitPseudoFullscreen = () => {
    setIsFullscreen(false);
    document.documentElement.classList.remove("overflow-hidden");
    document.body.classList.remove("overflow-hidden");
  };

  const toggleFullscreen = async () => {
    if (typeof window === "undefined") return;

    if (isIOS) {
      if (!isFullscreen) enterPseudoFullscreen();
      else exitPseudoFullscreen();
      return;
    }

    const el = tableWrapRef.current as any;
    const d = document as any;

    const request =
      el?.requestFullscreen ||
      el?.webkitRequestFullscreen ||
      el?.msRequestFullscreen;

    const exit =
      d?.exitFullscreen || d?.webkitExitFullscreen || d?.msExitFullscreen;

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
    } catch {}

    if (!isFullscreen) enterPseudoFullscreen();
    else exitPseudoFullscreen();
  };

  const { profile } = usePlayerProfileContext() as any;

  const [fallbackLocalId, setFallbackLocalId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let id = window.localStorage.getItem("player-id");
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

  const [stablePlayerId, setStablePlayerId] = useState<string | null>(null);
  useEffect(() => {
    if (stablePlayerId) return;
    const id = (profile?.id as string | undefined) ?? fallbackLocalId;
    if (id) setStablePlayerId(id);
  }, [profile?.id, fallbackLocalId, stablePlayerId]);

  const playerId = stablePlayerId;

  const {
    playerId: chipsPlayerId,
    chips: chipState,
    refresh: refreshChips,
  } = usePlayerChips();

  const effectivePlayerId = playerId || chipsPlayerId || null;

  const balanceGld = Number(chipState?.balance_gld ?? 0);
  const reservedGld = Number(chipState?.reserved_gld ?? 0);
  const playableGld = Math.max(0, balanceGld - reservedGld);
  const credits = playableGld;
  const creditsUsd = gldToUsd(credits);

  const wsUrl = process.env.NEXT_PUBLIC_BLACKJACK_WS || "";

  const [betAmount, setBetAmount] = useState<number>(fallbackMinBet);
  const [betInput, setBetInput] = useState<string>(String(fallbackMinBet));

  const hookOpts =
    effectivePlayerId && wsUrl
      ? {
          roomId: derivedRoomId,
          playerId: effectivePlayerId,
          name: "Blackjack Player",
          wsUrl,
        }
      : null;

  const { connected, table, sendSeat, placeBet, sendAction } =
    useBlackjackRoom(hookOpts);

  useEffect(() => {
    if (table) {
      console.log("[BJ UI] table update", JSON.parse(JSON.stringify(table)));
    }
  }, [table]);

  const phase: BlackjackTableState["phase"] = table?.phase ?? "waiting-bets";

  const heroSeatIndex = useMemo(() => {
    if (!table || !effectivePlayerId) return null;
    const seat = table.seats.find((s) => s.playerId === effectivePlayerId);
    return seat ? seat.seatIndex : null;
  }, [table, effectivePlayerId]);

  const activeSeatIndex = table?.activeSeatIndex ?? null;
  const activeHandIndex = table?.activeHandIndex ?? null;

  const dealerCardsRaw = table?.dealer.cards ?? [];
  const [dealerCardsAnimated, setDealerCardsAnimated] = useState<string[]>([]);
  const dealerCardsToRender =
    phase === "dealer-turn" ? dealerCardsAnimated : dealerCardsRaw;

  useEffect(() => {
    if (phase === "waiting-bets" || phase === "round-complete") {
      seenDealerCardsRef.current.clear();
      seenPlayerCardsRef.current.clear();
      dealerNewCardIndex.current = -1;
      lastDealerTotalRef.current = null;
    }
  }, [table?.roundId, phase]);

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
    const timeouts: number[] = [];

    setDealerCardsAnimated((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const prevLen = prevArr.length;
      const already = full.slice(0, Math.min(prevLen, full.length));

      for (let i = prevLen; i < full.length; i++) {
        const delay = 260 + (i - prevLen) * 380;
        const t = window.setTimeout(() => {
          if (cancelled) return;
          dealerNewCardIndex.current = i;
          setDealerCardsAnimated(full.slice(0, i + 1));
          setDealerNewCardTick((x) => x + 1);
        }, delay);
        timeouts.push(t as unknown as number);
      }

      return already;
    });

    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, dealerCardsRaw]);

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

  useEffect(() => {
    const total = dealerValue?.total ?? null;
    if (total === null) return;

    if (lastDealerTotalRef.current !== null && lastDealerTotalRef.current !== total) {
      setDealerTotalPulseTick((x) => x + 1);
    }
    lastDealerTotalRef.current = total;
  }, [dealerValue?.total]);

  const heroSeat: BlackjackSeatState | null =
    table && heroSeatIndex !== null
      ? table.seats.find((s) => s.seatIndex === heroSeatIndex) ?? null
      : null;

  const heroHand =
    heroSeat && heroSeat.hands && heroSeat.hands.length > 0
      ? heroSeat.hands[activeHandIndex ?? 0] ?? heroSeat.hands[0]
      : null;

  const isHeroTurn =
    phase === "player-action" &&
    heroSeatIndex !== null &&
    table?.activeSeatIndex === heroSeatIndex;

  useEffect(() => {
    if (!isMobile) return;
    if (!table) return;
    if (heroSeatIndex === null) return;

    const shouldFocusSeat =
      phase === "waiting-bets" ||
      phase === "round-complete" ||
      (phase === "player-action" && isHeroTurn);

    if (!shouldFocusSeat) return;

    const key = `${table.roundId}|${phase}|${heroSeatIndex}|${
      isHeroTurn ? "hero" : "no"
    }`;

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

  const autoNextRoundKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!table) return;
    if (!effectivePlayerId) return;
    if (heroSeatIndex === null) return;
    if (phase !== "round-complete") return;

    const key = `bj:auto-next:${derivedRoomId}:${effectivePlayerId}:${table.roundId}`;
    if (autoNextRoundKeyRef.current === key) return;
    autoNextRoundKeyRef.current = key;

    const t = window.setTimeout(() => {
      sendAction("next-round", heroSeatIndex, 0);
    }, 450);

    return () => window.clearTimeout(t);
  }, [table, phase, heroSeatIndex, derivedRoomId, effectivePlayerId, sendAction]);

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
  }, [table, heroSeatIndex, autoRebet, lastBet]);

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

  const readySeats = useMemo(() => {
    if (!table) return [];
    return table.seats
      .filter((s) => !!s.playerId)
      .map((s) => {
        const pendingBet = (s.hands ?? []).find(
          (h) => Number(h?.bet ?? 0) > 0 && (h.cards?.length ?? 0) === 0
        );
        return {
          seatIndex: s.seatIndex,
          playerId: s.playerId,
          name: s.name,
          bet: pendingBet ? Number(pendingBet.bet ?? 0) : 0,
          ready: !!pendingBet,
        };
      });
  }, [table]);

  const readyCount = useMemo(
    () => readySeats.filter((x) => x.ready).length,
    [readySeats]
  );
  const seatedCount = useMemo(() => readySeats.length, [readySeats]);

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

  const PAYOUT_TXTYPE = "WIN";

  async function applyGld(deltaBalance: number, txType: string, meta?: any) {
    if (!effectivePlayerId) throw new Error("Missing playerId");

    const ref =
      meta?.ref ??
      `bj:${txType}:${derivedRoomId}:${effectivePlayerId}:${
        table?.roundId ?? "pre"
      }:${Date.now()}`;

    const payload = {
      playerId: effectivePlayerId,
      kind: "gld",
      txType,
      deltaBalance,
      deltaReserved: 0,
      ref,
      meta: meta ?? null,
    };

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

    return j;
  }

  const betInFlightRef = useRef<string | null>(null);

  async function handlePlaceBetWithAmount(rawAmount: number) {
    if (!table) return;
    if (!effectivePlayerId) return;
    if (heroSeatIndex === null) return;
    if (!(phase === "waiting-bets" || phase === "round-complete")) return;
    if (!canPlaceBet) return;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    const hasPendingBet = !!(seat?.hands ?? []).some(
      (h) => Number(h?.bet ?? 0) > 0 && (h.cards?.length ?? 0) === 0
    );
    if (hasPendingBet) return;

    const amount = clampBet(rawAmount);
    if (amount <= 0) return;
    if (credits < amount) return;

    const betRef = `bj:bet:${derivedRoomId}:${effectivePlayerId}:${table.roundId}:${heroSeatIndex}`;

    if (betInFlightRef.current === betRef) return;
    betInFlightRef.current = betRef;

    try {
      await applyGld(-amount, "BET", {
        ref: betRef,
        bet: amount,
        roomId: derivedRoomId,
        roundId: table.roundId,
        seatIndex: heroSeatIndex,
      });

      placeBet(heroSeatIndex, amount);
      setLastBet(amount);

      const flashKey = `${derivedRoomId}:${effectivePlayerId}:${table.roundId}:${heroSeatIndex}`;
      betFlashRef.current.set(flashKey, {
        key: flashKey,
        amount,
        until: Date.now() + 650,
      });
      forceSeatFlashRerender((x) => x + 1);

      window.setTimeout(() => {
        const cur = betFlashRef.current.get(flashKey);
        if (cur && Date.now() > cur.until) {
          betFlashRef.current.delete(flashKey);
          forceSeatFlashRerender((x) => x + 1);
        }
      }, 700);

      await refreshChips?.();
    } catch (e) {
      console.error("[BJ] bet debit failed", e);
    } finally {
      if (betInFlightRef.current === betRef) betInFlightRef.current = null;
    }
  }

  function handlePlaceBet() {
    const amount = commitBetInput();
    handlePlaceBetWithAmount(amount);
  }

  async function handleAction(action: "hit" | "stand" | "double" | "split") {
    if (!table) return;
    if (!effectivePlayerId) return;
    if (heroSeatIndex === null) return;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    if (!seat?.hands?.length) return;

    const handIndex = table.activeHandIndex ?? 0;
    const hand = seat.hands[handIndex];
    if (!hand) return;

    const baseBet = Number(hand.bet ?? 0);
    const extraWager =
      action === "double" ? baseBet : action === "split" ? baseBet : 0;

    if (extraWager > 0) {
      if (credits < extraWager) return;

      try {
        const extraRef = `bj:extra:${action}:${derivedRoomId}:${effectivePlayerId}:${table.roundId}:${heroSeatIndex}:${handIndex}`;

        await applyGld(-extraWager, "BET", {
          ref: extraRef,
          roomId: derivedRoomId,
          roundId: table.roundId,
          action,
          extraWager,
          seatIndex: heroSeatIndex,
          handIndex,
        });

        const optKey = `${derivedRoomId}:${effectivePlayerId}:${table.roundId}:${heroSeatIndex}:${handIndex}`;
        optimisticExtraRef.current.set(
          optKey,
          (optimisticExtraRef.current.get(optKey) ?? 0) + extraWager
        );

        const flashKey = `${derivedRoomId}:${effectivePlayerId}:${table.roundId}:${heroSeatIndex}`;
        betFlashRef.current.set(flashKey, {
          key: flashKey,
          amount: extraWager,
          until: Date.now() + 650,
        });
        forceSeatFlashRerender((x) => x + 1);

        window.setTimeout(() => {
          const cur = betFlashRef.current.get(flashKey);
          if (cur && Date.now() > cur.until) {
            betFlashRef.current.delete(flashKey);
            forceSeatFlashRerender((x) => x + 1);
          }
        }, 700);

        await refreshChips?.();
      } catch (e) {
        console.error("[BJ] extra wager debit failed", e);
        return;
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
        ref: `bj:bonus:${derivedRoomId}:${effectivePlayerId ?? "noid"}:${Date.now()}`,
        reason: "dev mint",
      });
      await refreshChips?.();
    } catch (e) {
      console.error(e);
    }
  }

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
    ) {
      return "win";
    }
    if (
      s === "lose" ||
      s.includes("lost") ||
      s.includes("bust") ||
      s.includes("player-bust") ||
      s.includes("dealer-win")
    ) {
      return "lose";
    }
    return "pending";
  }

  function roundChip(n: number) {
    return Math.round(n);
  }

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
    if (!effectivePlayerId) return;
    if (heroSeatIndex === null) return;

    const seat = table.seats.find((s) => s.seatIndex === heroSeatIndex);
    if (!seat?.hands?.length) return;

    const allResolved = seat.hands.every(
      (h) => normalizeResult(h?.result) !== "pending"
    );
    if (!allResolved) return;

    const settleKey = `bj:settle:${derivedRoomId}:${effectivePlayerId}:${table.roundId}`;

    if (lastSettledKeyRef.current === settleKey) return;
    if (settleInFlightRef.current === settleKey) return;

    let totalReturn = 0;
    for (const hand of seat.hands) totalReturn += computeTotalReturnForHand(hand);

    settleInFlightRef.current = settleKey;

    (async () => {
      try {
        if (totalReturn > 0) {
          await applyGld(+totalReturn, PAYOUT_TXTYPE, {
            ref: settleKey,
            roomId: derivedRoomId,
            roundId: table.roundId,
            seatIndex: heroSeatIndex,
            totalReturn,
            hands: seat.hands,
          });
        }

        await refreshChips?.();
        lastSettledKeyRef.current = settleKey;
      } catch (e) {
        console.error("[BJ settle] FAILED", e);
      } finally {
        if (settleInFlightRef.current === settleKey) {
          settleInFlightRef.current = null;
        }
      }
    })();
  }, [table, heroSeatIndex, derivedRoomId, effectivePlayerId, refreshChips]);

  function renderSeat(seat: BlackjackSeatState) {
    const seatMap = isMobile ? BJ_SEAT_POSITIONS_MOBILE : BJ_SEAT_POSITIONS;
    const pos = seatMap[seat.seatIndex] ?? seatMap[0];

    const isHero = heroSeatIndex === seat.seatIndex;
    const seatTaken = !!seat.playerId;
    const takenByOther =
      seat.playerId && effectivePlayerId && seat.playerId !== effectivePlayerId;

    const tableInRound = phase !== "waiting-bets";
    if (!seatTaken && tableInRound) return null;

    const primaryHand = seat.hands && seat.hands.length > 0 ? seat.hands[0] : null;
    const rawHands = seat.hands ?? [];

    const handsToRender = rawHands.filter((h, idx, arr) => {
      const key = `${h.bet}|${h.result}|${(h.cards ?? []).join(",")}`;
      return (
        idx ===
        arr.findIndex(
          (x) => `${x.bet}|${x.result}|${(x.cards ?? []).join(",")}` === key
        )
      );
    });

    const value =
      primaryHand && (primaryHand.cards?.length ?? 0) > 0
        ? computeBlackjackValue(primaryHand.cards)
        : null;

    const isActive = activeSeatIndex === seat.seatIndex;
    const isMySeat = !!effectivePlayerId && seat.playerId === effectivePlayerId;

    const showSitButton = !takenByOther && !seatTaken && phase === "waiting-bets";
    const isSitOnly = showSitButton && !seatTaken;

    const isBetPhase = phase === "waiting-bets" || phase === "round-complete";
    const canShowBetControls = isMySeat && isBetPhase && canPlaceBet;
    const showActionButtons = isMySeat && phase === "player-action" && isActive;

    const seatWrapperProps = isHero ? { ref: heroSeatRef } : {};

    const mobileScale = isMobile
      ? isHero
        ? 0.92
        : seatTaken
        ? 0.72
        : 0.8
      : 1;

    const mobileOpacity = (() => {
      if (!isMobile) return "";
      if (isHero) return "opacity-100";
      if (phase === "player-action") return isActive ? "opacity-95" : "opacity-75";
      return "opacity-90";
    })();

    const baseTotalBet = handsToRender.reduce(
      (sum, h) => sum + Number(h?.bet ?? 0),
      0
    );

    const allResolved =
      handsToRender.length > 0 &&
      handsToRender.every((h) => normalizeResult(h?.result) !== "pending");

    function computePnlForHand(hand: any) {
      const bet = Number(hand?.bet ?? 0);
      if (!Number.isFinite(bet) || bet <= 0) return 0;

      const r = normalizeResult(hand?.result);
      if (r === "blackjack") return roundChip(bet * 1.5);
      if (r === "win") return roundChip(bet * 1.0);
      if (r === "push") return 0;
      if (r === "lose") return -bet;
      return 0;
    }

    function computeLabelForSeat(hands: any[]): "WIN" | "LOSE" | "PUSH" | "BJ" {
      const results = hands.map((h) => normalizeResult(h?.result));
      if (results.some((r) => r === "blackjack")) return "BJ";
      if (results.every((r) => r === "push")) return "PUSH";
      if (results.some((r) => r === "win")) return "WIN";
      return "LOSE";
    }

    const occupantId = seat.playerId ?? "empty";

    const outcomeKey =
      table && seat.playerId
        ? `${derivedRoomId}:${occupantId}:${table.roundId}:${seat.seatIndex}`
        : null;

    const betFlashKey =
      table && seat.playerId
        ? `${derivedRoomId}:${occupantId}:${table.roundId}:${seat.seatIndex}`
        : null;

    let flashedOutcome: SeatOutcome | null = null;
    let betFlash: BetFlash | null = null;

    const flashMap = seatOutcomeFlashRef.current;

    if (outcomeKey) {
      const existing = flashMap.get(outcomeKey);
      if (existing && Date.now() > existing.until) {
        flashMap.delete(outcomeKey);
        forceSeatFlashRerender((x) => x + 1);
      }

      if (table && isMySeat && allResolved) {
        const existingNow = flashMap.get(outcomeKey);
        if (!existingNow) {
          const pnl = handsToRender.reduce(
            (sum, h) => sum + computePnlForHand(h),
            0
          );
          const label = computeLabelForSeat(handsToRender);
          const until = Date.now() + 1600;

          flashMap.set(outcomeKey, { key: outcomeKey, pnl, label, until });
          forceSeatFlashRerender((x) => x + 1);

          const key = outcomeKey;
          window.setTimeout(() => {
            const cur = flashMap.get(key);
            if (cur && Date.now() > cur.until) {
              flashMap.delete(key);
              forceSeatFlashRerender((x) => x + 1);
            }
          }, 1650);
        }
      }

      flashedOutcome = flashMap.get(outcomeKey) ?? null;
    }

    if (betFlashKey) {
      const existingBetFlash = betFlashRef.current.get(betFlashKey);
      if (existingBetFlash && Date.now() > existingBetFlash.until) {
        betFlashRef.current.delete(betFlashKey);
        forceSeatFlashRerender((x) => x + 1);
      }
      betFlash = betFlashRef.current.get(betFlashKey) ?? null;
    }

    const layout =
      seat.seatIndex === 0 ||
      seat.seatIndex === 1 ||
      seat.seatIndex === 5 ||
      seat.seatIndex === 6
        ? "side"
        : "bottom";

    const hideSeatBoxOnMobile =
      isMobile &&
      seatTaken &&
      !isHero &&
      !showSitButton &&
      !flashedOutcome;

    const showWinSweep =
      !!flashedOutcome &&
      (flashedOutcome.label === "WIN" || flashedOutcome.label === "BJ");

    const SeatBox = () => {
      let mainLabel = "—";
      let mainSub: string | null = null;
      let mainTertiary: string | null = null;
      let mainOnClick: (() => void) | null = null;

      let mainClass =
        "bg-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.30)]";

      if (seatTaken && isMySeat && flashedOutcome) {
        const pnl = flashedOutcome.pnl ?? 0;
        const sign = pnl > 0 ? "+" : pnl < 0 ? "-" : "";
        const amt = pnl === 0 ? "0" : `${sign}${Math.abs(pnl).toLocaleString()}`;
        const lbl = flashedOutcome.label === "BJ" ? "BJ" : flashedOutcome.label;

        mainLabel = lbl;
        mainSub = amt;
        mainTertiary = pnl !== 0 ? gldToUsd(Math.abs(pnl)) : gldToUsd(0);
        mainOnClick = null;

        mainClass =
          flashedOutcome.label === "LOSE"
            ? "bg-red-500 text-slate-950 shadow-[0_0_20px_rgba(239,68,68,0.45)]"
            : flashedOutcome.label === "PUSH"
            ? "bg-slate-600 text-white shadow-[0_0_18px_rgba(148,163,184,0.35)]"
            : "bg-emerald-500 text-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.55)]";
      } else if (showSitButton) {
        mainLabel = "SIT";
        mainOnClick = () => handleSit(seat.seatIndex);
      } else if (seatTaken && canShowBetControls) {
  if (baseTotalBet > 0) {
    mainLabel = "BET PLACED";
    mainSub = baseTotalBet.toLocaleString();
    mainTertiary = gldToUsd(baseTotalBet);
    mainOnClick = null;
    mainClass =
      "bg-[#FFD700] text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.45)]";
  } else {
    mainLabel = "BET";
    mainSub = betAmount.toLocaleString();
    mainTertiary = gldToUsd(betAmount);
    mainOnClick = () => handlePlaceBet();
  }
} else if (seatTaken && showActionButtons) {
        mainLabel = "HIT";
        mainOnClick = () => handleAction("hit");
      } else {
        mainLabel = seatTaken ? "IN" : "—";
        mainOnClick = null;
        mainClass =
          "bg-black/55 text-white/80 border border-white/15 shadow-[0_0_14px_rgba(0,0,0,0.45)]";
      }

      const boxW = isMobile ? "w-[86px]" : "w-[108px]";
      const pad = isMobile ? "p-[5px]" : "p-[6px]";
      const rounding = isSitOnly ? "rounded-full" : "rounded-xl";

      const shell = isSitOnly
        ? "bg-transparent border border-transparent shadow-none"
        : "bg-black/55 backdrop-blur-md border border-white/15 shadow-[0_0_18px_rgba(0,0,0,0.55)]";

      const showTopBetStrip =
        !isSitOnly &&
        !isMobile &&
        !isMySeat &&
        !flashedOutcome &&
        baseTotalBet > 0;

      return (
        <div className={`${boxW} ${rounding} ${shell} ${pad}`}>
          {showTopBetStrip && (
            <div className="w-full rounded-lg px-2 py-2 bg-black/35 border border-white/10">
              <div className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-emerald-300/90">
                BET
              </div>
              <div className="mt-[1px] text-[13px] font-extrabold text-white leading-none">
                {Math.max(0, baseTotalBet).toLocaleString()}
              </div>
              <div className="mt-[1px] text-[9px] font-bold text-white/55 leading-none">
                {gldToUsd(Math.max(0, baseTotalBet))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!mainOnClick}
            onClick={(e) => {
              e.stopPropagation();
              if (!mainOnClick) return;
              mainOnClick();
            }}
            className={[
              isSitOnly
                ? [
                    "mt-0 w-full rounded-full px-2 py-[10px]",
                    "bg-transparent",
                    "border-2 border-sky-300/80",
                    "text-sky-300",
                    "shadow-[0_0_18px_rgba(56,189,248,0.35)]",
                    "hover:border-sky-200 hover:shadow-[0_0_26px_rgba(56,189,248,0.55)]",
                  ].join(" ")
                : `${showTopBetStrip ? "mt-2" : "mt-0"} w-full rounded-lg px-2 ${
                    isMobile ? "py-[7px]" : "py-[8px]"
                  }`,
              "text-[13px] font-extrabold tracking-[0.14em] uppercase",
"active:scale-[0.99] transition-all duration-200",
              !isSitOnly ? mainClass : "",
              !mainOnClick ? "opacity-90 cursor-default" : "",
            ].join(" ")}
          >
            <div className="leading-none">{mainLabel}</div>
            {mainSub && (
              <div className="mt-1 text-[11px] font-mono font-extrabold tracking-normal leading-none opacity-90">
                {mainSub}
              </div>
            )}
            {mainTertiary && (
              <div className="mt-1 text-[9px] font-bold tracking-normal leading-none opacity-80">
                {mainTertiary}
              </div>
            )}
          </button>

          {seatTaken && showActionButtons && !isSitOnly && !isMobile && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleAction("stand")}
                className="col-span-2 h-8 rounded-lg bg-slate-900 text-white font-extrabold text-[11px] border border-white/15 active:scale-95"
              >
                STAND
              </button>

              <button
                type="button"
                disabled={!canDouble}
                onClick={() => handleAction("double")}
                className={[
                  "h-8 rounded-lg font-extrabold text-[11px] active:scale-95",
                  canDouble
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed",
                ].join(" ")}
              >
                DD
              </button>

              <button
                type="button"
                disabled={!canSplit}
                onClick={() => handleAction("split")}
                className={[
                  "h-8 rounded-lg font-extrabold text-[11px] active:scale-95",
                  canSplit
                    ? "bg-purple-400 text-slate-950"
                    : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed",
                ].join(" ")}
              >
                SPLIT
              </button>
            </div>
          )}
        </div>
      );
    };

    const CardsBlock = () => (
      <div className="relative z-[1] flex flex-col items-center justify-center">
        {betFlash && (
          <div className="pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 z-[5] animate-[bjChipSlide_650ms_ease-out_forwards]">
            <div className="rounded-full border border-[#FFD700]/55 bg-black/80 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.14em] text-[#FFE58A] shadow-[0_0_18px_rgba(250,204,21,0.35)]">
              + BET {betFlash.amount.toLocaleString()}
            </div>
          </div>
        )}

        {primaryHand && (primaryHand.cards?.length ?? 0) > 0 && (
          <>
            <div className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl">
              {showWinSweep && (
                <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden rounded-xl">
                  <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] animate-[bjWinSweep_900ms_ease-out_1]" />
                </div>
              )}

              {handsToRender.map((hand, handIndex) => (
                <div
                  key={`seat-${seat.seatIndex}-hand-${handIndex}`}
                  className="relative flex"
                >
                  {(hand.cards ?? []).map((c, i) => {
                    const overlap = (hand.cards?.length ?? 0) >= 4;
                    const style: CSSProperties =
                      overlap && i > 0
                        ? { marginLeft: isMobile ? "-0.45rem" : "-0.6rem" }
                        : {};

                    const playerCardKey = `player:${table?.roundId ?? "r0"}:${seat.seatIndex}:${handIndex}:${i}:${c}`;
                    const shouldAnimateFlip =
                      c !== "XX" && !seenPlayerCardsRef.current.has(playerCardKey);

                    if (c !== "XX") {
                      seenPlayerCardsRef.current.add(playerCardKey);
                    }

                    return (
                      <div
                        key={`seat-${seat.seatIndex}-hand-${handIndex}-card-${i}`}
                        style={style}
                      >
                        <BJCard
                          card={c}
                          small
                          animateFlip={shouldAnimateFlip}
                          animatePop={shouldAnimateFlip}
                        />
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
                    isMobile ? "text-[10px]" : "text-[11px] md:text-xs",
                    "font-mono font-bold",
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
    );

    const wrap = (
      <div
        className={`relative transition-transform transition-opacity duration-300 ease-out md:scale-100 ${mobileOpacity}`}
        style={{
          transform: isMobile ? `scale(${mobileScale})` : undefined,
          transformOrigin: "center center",
        }}
      >
        {isActive && (
          <>
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/20 blur-xl" />
            <div className="pointer-events-none absolute -inset-2 rounded-[28px] border border-emerald-300/35 shadow-[0_0_24px_rgba(16,185,129,0.25)] animate-pulse" />
          </>
        )}

        <div className="relative z-[1] flex flex-col items-center justify-center gap-2">
          <CardsBlock />
          {!hideSeatBoxOnMobile && <SeatBox />}
        </div>
      </div>
    );

    const mobileAnchorStyle: CSSProperties | undefined = isMobile
      ? { transform: "translateX(-50%)" }
      : undefined;

    return (
      <div
        key={seat.seatIndex}
        {...seatWrapperProps}
        className="absolute"
        style={{ ...pos, ...(mobileAnchorStyle ?? {}) }}
      >
        {wrap}
      </div>
    );
  }

  const mobileShowUtilityStrip = !heroSeat;

  return (
    <div className="flex flex-col gap-3 pb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Base Gold Rush • {displayTableName}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[11px] text-white/60">
          <span className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[#FFD700]">
            GLD: {credits.toLocaleString()}
            <span className="ml-2 text-emerald-200/90">{creditsUsd}</span>
          </span>

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

      <div
        ref={tableWrapRef}
        className={[
          "relative overflow-hidden rounded-3xl border border-[#FFD700]/40",
          "bg-gradient-to-b from-black via-slate-950 to-black",
          "shadow-[0_0_50px_rgba(0,0,0,0.9)]",
          "flex flex-col",
          isFullscreen
            ? "fixed inset-0 z-[9999] rounded-none border-0 p-2 md:p-4"
            : "p-2 md:p-4",
          isFullscreen
            ? "h-[100dvh] w-[100vw]"
            : "h-[calc(100dvh-160px)] min-h-[540px] md:min-h-[680px]",
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

          @keyframes bjCardFlip {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(180deg);
  }
}

          @keyframes bjCardPop {
            0% {
              opacity: 0;
              transform: translateY(8px) scale(0.94);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes bjChipSlide {
            0% {
              opacity: 0;
              transform: translate(-50%, 10px) scale(0.92);
            }
            35% {
              opacity: 1;
              transform: translate(-50%, 0px) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -8px) scale(0.98);
            }
          }

          @keyframes bjDealerPulse {
            0% {
              transform: scale(0.96);
              box-shadow: 0 0 0 rgba(250, 204, 21, 0);
            }
            50% {
              transform: scale(1.03);
              box-shadow: 0 0 24px rgba(250, 204, 21, 0.55);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 rgba(250, 204, 21, 0);
            }
          }

          @keyframes bjWinSweep {
            0% {
              transform: translateX(0%);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            100% {
              transform: translateX(320%);
              opacity: 0;
            }
          }
        `}</style>

        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className={[
            "z-[10050] rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] text-white/85 backdrop-blur",
            "hover:bg-black/80 active:scale-[0.99] transition",
            isFullscreen
              ? "fixed right-3 top-[calc(env(safe-area-inset-top)+12px)]"
              : "absolute right-3 top-3",
          ].join(" ")}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>

        <div className="relative z-[1] flex-1 min-h-0 w-full flex items-center justify-center">
          <div
            className={[
              "relative w-full h-full",
              isFullscreen ? "max-w-[1400px]" : "max-w-[1200px]",
            ].join(" ")}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src="/felt/bgr-blackjack-table.png"
                  alt="Base Gold Rush Live Blackjack Table"
                  fill
                  priority
                  className="object-contain object-center pointer-events-none select-none"
                />

                {phase === "waiting-bets" && seatedCount > 0 && !isMobile && (
                  <div className="pointer-events-none absolute right-3 top-3 z-[80]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-black/65 px-3 py-1.5 text-[11px] font-extrabold text-emerald-200 backdrop-blur">
                      <span className="uppercase tracking-[0.18em]">BETS</span>
                      <span className="font-mono">
                        {readyCount}/{seatedCount || 7}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute left-1/2 top-[23%] md:top-[18%] -translate-x-1/2 z-[40] flex flex-col items-center gap-1.5">
                  <div className="flex items-center justify-center">
                    <div className="flex scale-[1.06] md:scale-[1.10]">
                      {dealerCardsToRender.map((c: string, i: number) => {
                        const overlap = dealerCardsToRender.length >= 4;
                        const style: CSSProperties =
                          overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};
                        const isNewest = i === dealerNewCardIndex.current;

                        const dealerCardKey = `dealer:${table?.roundId ?? "r0"}:${i}:${c}`;
                        const shouldAnimateFlip =
                          c !== "XX" &&
                          !seenDealerCardsRef.current.has(dealerCardKey);

                        if (c !== "XX") {
                          seenDealerCardsRef.current.add(dealerCardKey);
                        }

                        return (
                          <div
                            key={`dealer-card-${i}-${dealerNewCardTick}`}
                            style={style}
                            className="transition-all duration-500 ease-out"
                          >
                            <div
                              className={
                                isNewest
                                  ? "animate-[dealerIn_0.55s_ease-out_forwards]"
                                  : ""
                              }
                            >
                              <BJCard
                                card={c}
                                animateFlip={shouldAnimateFlip}
                                animatePop={isNewest}
                              />
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
                      key={`dealer-total-${dealerTotalPulseTick}`}
                      className={[
                        "rounded-full",
                        "px-3 py-1.5 md:px-5 md:py-2",
                        "bg-black/90 border border-[#FFD700]",
                        "shadow-[0_0_18px_rgba(250,204,21,0.75)] md:shadow-[0_0_26px_rgba(250,204,21,0.9)]",
                        "flex items-center gap-2",
                        "text-[#FFEFA3] font-semibold",
                        "text-[12px] md:text-[13px]",
                        dealerTotalPulseTick > 0
                          ? "animate-[bjDealerPulse_380ms_ease-out]"
                          : "",
                      ].join(" ")}
                    >
                      <span className="uppercase tracking-[0.18em] text-[9px] md:text-[8px] text-white/75">
                        {dealerValue.hideHole &&
                        (phase === "player-action" || phase === "dealing")
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

                {showBetTimerOnFelt && (
                  <div className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 z-[45] flex flex-col items-center gap-1">
                    <div
                      className={[
                        "rounded-full px-4 md:px-5 py-2 shadow-[0_0_25px_rgba(0,0,0,0.9)] border text-center",
                        "font-mono text-[8px] md:text-xs tracking-[0.18em] uppercase",
                        isBetTimerCritical
                          ? "bg-red-600 border-red-300 text-black animate-pulse"
                          : "bg-black/85 border-[#FFD700]/70 text-[#FFD700]",
                      ].join(" ")}
                    >
                      PLACE BETS
                    </div>
                    <div
                      className={[
                        "flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-full border-2 font-mono text-base md:text-2xl",
                        isBetTimerCritical
                          ? "border-red-300 bg-red-700 text-black shadow-[0_0_24px_rgba(248,113,113,0.9)]"
                          : "border-[#FFD700] bg-black/80 text-[#FFD700] shadow-[0_0_24px_rgba(250,204,21,0.8)]",
                      ].join(" ")}
                    >
                      {betCountdown}
                    </div>
                  </div>
                )}

                {showActionTimerOnFelt && !isMobile && (
                  <div className="pointer-events-none absolute left-1/2 top-[0%] -translate-x-1/2 z-[60] flex flex-col items-center gap-1">
                    <div
                      className={[
                        "rounded-full px-4 py-1 border text-center font-mono text-[8px] md:text-xs uppercase tracking-[0.18em]",
                        actionCountdown !== null && actionCountdown <= 5
                          ? "bg-red-600 border-red-300 text-black animate-pulse"
                          : "bg-black/85 border-emerald-300/70 text-emerald-200",
                      ].join(" ")}
                    >
                      Player {activeSeatIndex! + 1} to act
                    </div>
                    <div
                      className={[
                        "flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border-2 font-mono text-lg md:text-2xl",
                        actionCountdown !== null && actionCountdown <= 5
                          ? "border-red-300 bg-red-700 text-black shadow-[0_0_22px_rgba(248,113,113,0.9)]"
                          : "border-emerald-300 bg-black/80 text-emerald-200 shadow-[0_0_22px_rgba(16,185,129,0.8)]",
                      ].join(" ")}
                    >
                      {actionCountdown}
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 z-[40]">
                  {seats.map((s) => renderSeat(s))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2 rounded-full border border-white/15 bg-gradient-to-r from-black via-slate-900 to-black px-3 py-1 text-[10px] md:text-[11px] text-white/80 shadow-[0_0_25px_rgba(0,0,0,0.7)]">
          <div className="min-w-0 truncate">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
              Table Status&nbsp;&nbsp;
            </span>
            <span className="whitespace-nowrap">{statusMessage}</span>

            {!isMobile && activeSeatIndex !== null && table && (
              <span className="ml-2 text-white/65 whitespace-nowrap">
                • Current turn: Seat {activeSeatIndex + 1}
                {table.seats[activeSeatIndex]?.playerId === effectivePlayerId &&
                  " (you)"}
              </span>
            )}
          </div>

          {!isMobile && phase === "waiting-bets" && readyCount > 0 && (
            <div className="shrink-0 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-[10px] md:text-[11px] font-extrabold text-emerald-200 backdrop-blur-md">
              BETS PLACED {readyCount}/{seatedCount || 7}
            </div>
          )}
        </div>
      </div>

      {mobileShowUtilityStrip && (
        <div className="md:hidden mt-2 flex items-center justify-between gap-2">
          <div className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[10px] text-[#FFD700]">
            GLD: {credits.toLocaleString()}
            <span className="ml-2 text-emerald-200/90">{creditsUsd}</span>
          </div>

          <button
            type="button"
            onClick={handleReloadDemo}
            className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-extrabold text-white hover:bg-slate-700 touch-manipulation"
          >
            Mint 10K
          </button>
        </div>
      )}

      <div className="hidden md:block rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
        <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
          Your Controls
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[#FFD700]">
            GLD: {credits.toLocaleString()}
            <span className="ml-2 text-emerald-200/90">{creditsUsd}</span>
          </span>

          <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] text-white/70">
            Limits: {uiMinBet.toLocaleString()}–{uiMaxBet.toLocaleString()}
            <span className="ml-2 text-emerald-200/90">
              {gldToUsd(uiMinBet)}–{gldToUsd(uiMaxBet)}
            </span>
          </span>

          <div className="flex items-center gap-2 ml-2">
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
            <span className="font-mono text-[#FFD700]">
              GLD
              <span className="ml-2 text-emerald-200/90">
                {gldToUsd(Number(betInput || betAmount))}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={handlePlaceBet}
            disabled={
              !canPlaceBet ||
              credits < uiMinBet ||
              !(phase === "waiting-bets" || phase === "round-complete")
            }
            className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
          >
            Place bet
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

          <label className="flex items-center gap-2 text-[10px] text-white/60 ml-2">
            <input
              type="checkbox"
              checked={autoRebet}
              onChange={(e) => setAutoRebet(e.target.checked)}
              className="h-3 w-3 rounded border-white/40 bg-black/60"
            />
            <span>Auto re-bet last amount</span>
          </label>

          {lastBet !== null && (
            <span className="text-[10px] text-white/45 ml-2">
              Last bet:{" "}
              <span className="font-mono text-[#FFD700]">
                {lastBet.toLocaleString()} GLD
              </span>
              <span className="ml-2 text-emerald-200/90">
                {gldToUsd(lastBet)}
              </span>
            </span>
          )}
        </div>
      </div>

      {heroSeat && (
        <div
          ref={heroPanelRef}
          className={[
            "flex flex-col gap-2 rounded-2xl border border-white/15 backdrop-blur md:hidden",
            isFullscreen
              ? "fixed left-2 right-2 bottom-2 z-[10001] bg-black/85 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)]"
              : "bg-black/55 p-2",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 font-mono text-[10px] text-[#FFD700]">
              GLD: {credits.toLocaleString()}
              <span className="ml-2 text-emerald-200/90">{creditsUsd}</span>
            </div>

            <div className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] text-white/70">
              Limits: {uiMinBet.toLocaleString()}–{uiMaxBet.toLocaleString()}
            </div>
          </div>

          {(phase === "waiting-bets" || phase === "round-complete") && (
            <div className="rounded-2xl border border-white/15 bg-black/55 p-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                Bet Controls
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bumpBet(-BET_STEP)}
                  className="h-10 w-10 rounded-xl border border-white/15 bg-black/70 text-sm font-extrabold text-white active:scale-95"
                >
                  −
                </button>

                <div className="flex-1 rounded-xl border border-[#FFD700]/30 bg-black/70 px-3 py-2 text-center">
                  <div className="text-[14px] font-extrabold text-[#FFD700]">
                    {betAmount.toLocaleString()} GLD
                  </div>
                  <div className="text-[10px] text-emerald-200/90">
                    {gldToUsd(betAmount)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => bumpBet(+BET_STEP)}
                  className="h-10 w-10 rounded-xl border border-white/15 bg-black/70 text-sm font-extrabold text-white active:scale-95"
                >
                  +
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={
                    !canPlaceBet ||
                    credits < uiMinBet ||
                    !(phase === "waiting-bets" || phase === "round-complete")
                  }
                  className="rounded-xl bg-[#FFD700] px-3 py-2 text-[12px] font-extrabold text-black disabled:opacity-40"
                >
                  Place Bet
                </button>

                <button
                  type="button"
                  onClick={handleReloadDemo}
                  className="rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-[12px] font-extrabold text-white"
                >
                  Mint 10K
                </button>
              </div>

              {lastBet !== null && (
                <div className="mt-2 text-[10px] text-white/55">
                  Last bet: {lastBet.toLocaleString()} GLD • {gldToUsd(lastBet)}
                </div>
              )}
            </div>
          )}

          {phase === "player-action" && (
            <div className="rounded-2xl border border-white/15 bg-black/55 p-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                Your Turn
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAction("hit")}
                  disabled={!isHeroTurn}
                  className="rounded-xl bg-emerald-400 px-3 py-2 text-[12px] font-extrabold text-slate-950 disabled:opacity-40"
                >
                  HIT
                </button>

                <button
                  type="button"
                  onClick={() => handleAction("stand")}
                  disabled={!isHeroTurn}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-white border border-white/15 disabled:opacity-40"
                >
                  STAND
                </button>

                <button
                  type="button"
                  onClick={() => handleAction("double")}
                  disabled={!canDouble}
                  className="rounded-xl bg-amber-400 px-3 py-2 text-[12px] font-extrabold text-slate-950 disabled:opacity-40"
                >
                  DOUBLE
                </button>

                <button
                  type="button"
                  onClick={() => handleAction("split")}
                  disabled={!canSplit}
                  className="rounded-xl bg-purple-400 px-3 py-2 text-[12px] font-extrabold text-slate-950 disabled:opacity-40"
                >
                  SPLIT
                </button>
              </div>

              {heroHand && (
                <div className="mt-2 text-[10px] text-white/55">
                  Current bet: {Number(heroHand.bet ?? 0).toLocaleString()} GLD •{" "}
                  {gldToUsd(Number(heroHand.bet ?? 0))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[10px] text-white/60">
              <input
                type="checkbox"
                checked={autoRebet}
                onChange={(e) => setAutoRebet(e.target.checked)}
                className="h-3 w-3 rounded border-white/40 bg-black/60"
              />
              <span>Auto re-bet last amount</span>
            </label>

            {heroSeatIndex !== null && (
              <button
                type="button"
                onClick={() => handleLeave(heroSeatIndex)}
                className="rounded-xl border border-slate-600 bg-black/75 px-3 py-2 text-[11px] font-extrabold text-white"
              >
                Leave seat
              </button>
            )}
          </div>
        </div>
      )}
    </div>

    
  );
}