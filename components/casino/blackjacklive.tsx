// components/casino/blackjacklive.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  CSSProperties,
} from "react";
import Image from "next/image";
import {
  useBlackjackRoom,
  type BlackjackTableState,
  type BlackjackSeatState,
  type BlackjackHandResult,
} from "@/lib/blackjackClient/useBlackjackRoom";

const ROOM_ID = "bgld-blackjack-room-1";
const MIN_DEMO_BET = 50;

/**
 * Seat positions (7 seats) for DESKTOP only.
 * 0 = far right, 6 = far left, arcing up toward table edge.
 */
const BJ_SEAT_POSITIONS: CSSProperties[] = [
  { left: "87%", top: "22%" }, // 0 right
  { left: "83%", top: "42%" }, // 1
  { left: "65%", top: "64%" }, // 2 bottom-right
  { left: "45%", top: "70%" }, // 3 center
  { left: "23%", top: "65%" }, // 4 bottom-left
  { left: "6%", top: "42%" },  // 5
  { left: "1%", top: "22%" },  // 6 left
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

  return {
    isBack: false,
    rankLabel,
    suitLabel,
    suitColor,
  };
}

type BJCardProps = {
  card: string;
  small?: boolean;
};

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
      className={`${baseSize} rounded-lg bg-white flex flex-col justify-between px-1.5 py-1 border border-slate-400 relative shadow-[0_4px_10px_rgba(0,0,0,0.55)]`}
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
        <span
          className={`leading-none ${suitColor} text-xl md:text-2xl`}
        >
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

/* ───────────── Main component ───────────── */

export default function BlackjackLive() {
  useEffect(() => {
    console.log("[BJ UI] BlackjackLive mounted");
  }, []);

  // Stable per-device playerId
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let id = window.localStorage.getItem("bj-player-id");
      if (!id) {
        id =
          "bj-" +
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto.randomUUID() || "").slice(0, 8)
            : Math.random().toString(36).slice(2, 10));
        window.localStorage.setItem("bj-player-id", id);
      }
      setPlayerId(id);
    } catch {
      setPlayerId("bj-" + Math.random().toString(36).slice(2, 10));
    }
  }, []);

  const wsUrl = process.env.NEXT_PUBLIC_BLACKJACK_WS || "Local";
  const [betAmount, setBetAmount] = useState<number>(MIN_DEMO_BET);

  const hookOpts =
    playerId && wsUrl
      ? {
          roomId: ROOM_ID,
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
      console.log(
        "[BJ UI] table update",
        JSON.parse(JSON.stringify(table))
      );
    }
  }, [table]);

  /* ───────────── Derived core state ───────────── */

  const heroSeatIndex = useMemo(() => {
    if (!table || !playerId) return null;
    const seat = table.seats.find((s) => s.playerId === playerId);
    return seat ? seat.seatIndex : null;
  }, [table, playerId]);

  const phase: BlackjackTableState["phase"] =
    table?.phase ?? "waiting-bets";

  const [betCountdown, setBetCountdown] = useState<number | null>(null);
  const [autoRebet, setAutoRebet] = useState(false);
  const [lastBet, setLastBet] = useState<number | null>(null);

  // Pull out dealer + active seat
  const dealerCards = table?.dealer.cards ?? [];
  const activeSeatIndex = table?.activeSeatIndex ?? null;
  const activeHandIndex = table?.activeHandIndex ?? null;

  // Dealer visible value
  const dealerValue = useMemo(() => {
    if (!table) return null;
    const cards = table.dealer?.cards ?? [];
    const hideHole = table.dealer?.hideHoleCard;

    const visibleCards =
      hideHole && (phase === "player-action" || phase === "dealing")
        ? cards.filter((c) => c !== "XX")
        : cards;

    if (visibleCards.length === 0) return null;

    const { total, soft } = computeBlackjackValue(visibleCards);
    return { total, soft, hideHole };
  }, [table, phase]);

  // Hero seat + hero hand
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

  const heroBankroll = heroSeat?.bankroll ?? null;
  const DEMO_START = 10_000;
  const heroNet =
    heroBankroll !== null ? heroBankroll - DEMO_START : null;

  const isHeroTurn =
    phase === "player-action" &&
    heroSeatIndex !== null &&
    table?.activeSeatIndex === heroSeatIndex;

  const canDouble =
    isHeroTurn &&
    heroHand &&
    heroHand.cards.length === 2 &&
    heroSeat &&
    heroSeat.bankroll >= heroHand.bet;

  const canSplit =
    isHeroTurn &&
    heroHand &&
    heroHand.cards.length === 2 &&
    heroSeat &&
    heroSeat.bankroll >= heroHand.bet &&
    heroSeat.hands.length < 2 &&
    heroHand.cards[0]?.[0] === heroHand.cards[1]?.[0];

  /* ───────────── Bet countdown from server betDeadlineMs ───────────── */

  useEffect(() => {
    if (!table || !table.betDeadlineMs) {
      setBetCountdown(null);
      return;
    }

    function update() {
      if (!table || !table.betDeadlineMs) {
        setBetCountdown(null);
        return;
      }
      const ms = table.betDeadlineMs - Date.now();
      setBetCountdown(ms > 0 ? Math.ceil(ms / 1000) : 0);
    }

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [table?.betDeadlineMs, table]);

  const showBetTimerOnFelt =
    phase === "waiting-bets" && betCountdown !== null;
  const isBetTimerCritical =
    phase === "waiting-bets" &&
    betCountdown !== null &&
    betCountdown <= 5;

  /* ───────────── Auto re-bet logic ───────────── */

  useEffect(() => {
    if (!table || heroSeatIndex === null) return;

    const phaseNow = table.phase;
    const heroSeatNow = table.seats.find(
      (s) => s.seatIndex === heroSeatIndex
    );

    // capture last bet at round-complete
    if (phaseNow === "round-complete" && heroSeatNow?.hands?.length) {
      const h0 = heroSeatNow.hands[0];
      if (h0.bet > 0) {
        setLastBet(h0.bet);
      }
    }

    // auto re-bet when we re-enter waiting-bets with clear hands
    if (
      autoRebet &&
      phaseNow === "waiting-bets" &&
      (!heroSeatNow?.hands || heroSeatNow.hands.length === 0) &&
      lastBet &&
      lastBet > 0
    ) {
      console.log("[BJ UI] autoRebet placing bet", {
        heroSeatIndex,
        lastBet,
      });
      placeBet(heroSeatIndex, lastBet);
    }
  }, [table, heroSeatIndex, autoRebet, lastBet, placeBet]);

  /* ───────────── Action countdown (global per active hand) ───────────── */

  const ACTION_WINDOW_SECONDS = 30;
  const [actionCountdown, setActionCountdown] = useState<number | null>(
    null
  );

  const actionTimerKey = useMemo(() => {
    if (!table || table.phase !== "player-action") return null;
    if (table.activeSeatIndex === null) return null;

    const seat = table.seats[table.activeSeatIndex];
    if (!seat) return null;

    const hand =
      seat.hands[table.activeHandIndex ?? 0] ?? seat.hands[0] ?? null;

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

    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = ACTION_WINDOW_SECONDS - elapsed;
      setActionCountdown(remaining > 0 ? Math.ceil(remaining) : 0);
    }, 250);

    return () => clearInterval(id);
  }, [actionTimerKey]);

  const showActionTimerOnFelt =
    phase === "player-action" &&
    actionCountdown !== null &&
    activeSeatIndex !== null;

  const isActionTimerCritical =
    phase === "player-action" &&
    actionCountdown !== null &&
    actionCountdown <= 5;

    const showMobileBetControls =
  phase === "waiting-bets" || phase === "round-complete";

  useEffect(() => {
  if (
    actionCountdown !== 0 ||
    phase !== "player-action" ||
    heroSeatIndex === null ||
    activeSeatIndex !== heroSeatIndex ||
    !heroHand ||
    heroHand.result !== "pending"
  ) {
    return;
  }

  console.log("[BJ UI] action timer expired – auto-stand for hero seat");
  handleAction("stand");
}, [
  actionCountdown,
  phase,
  heroSeatIndex,
  activeSeatIndex,
  heroHand,
]);



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

  /* ───────────── Table + seats (desktop seat overlays) ───────────── */

  // 🔥 Fallback seats: always 7 entries so overlays render
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

    const seat = table.seats.find(
      (s) => s.seatIndex === heroSeatIndex
    );
    if (!seat) return false;

    const hasLiveHand = seat.hands.some(
      (h) => h.bet > 0 && h.cards.length > 0 && h.result === "pending"
    );
    if (hasLiveHand) return false;

    return true;
  }, [table, heroSeatIndex]);

  function handleSit(seatIndex: number) {
    console.log("[BJ UI] handleSit", { seatIndex });
    sendSeat("sit", seatIndex);
  }

  function handleLeave(seatIndex: number) {
    console.log("[BJ UI] handleLeave", { seatIndex });
    sendSeat("leave", seatIndex);
  }

  function handlePlaceBet() {
    if (heroSeatIndex === null) return;

    const minBet = table?.minBet ?? 50;
    const amount = betAmount > 0 ? betAmount : minBet;

    console.log("[BJ UI] handlePlaceBet", {
      heroSeatIndex,
      betAmount,
      usedAmount: amount,
      phase: table?.phase,
    });

    placeBet(heroSeatIndex, amount);
    setLastBet(amount);
  }

  function handleAction(
    action: "hit" | "stand" | "double" | "split"
  ) {
    if (!table || heroSeatIndex === null) {
      console.log(
        "[BJ UI] handleAction: missing table or heroSeatIndex"
      );
      return;
    }
    const seat = table.seats.find(
      (s) => s.seatIndex === heroSeatIndex
    );
    if (!seat || !seat.hands || seat.hands.length === 0) {
      console.log(
        "[BJ UI] handleAction: no hands for hero seat",
        { heroSeatIndex, seat }
      );
      return;
    }
    const handIndex = 0;
    console.log("[BJ UI] handleAction", {
      action,
      heroSeatIndex,
      handIndex,
    });
    sendAction(action, heroSeatIndex, handIndex);
  }

  function handleNextHand() {
    if (!table || heroSeatIndex === null) return;
    console.log("[BJ UI] handleNextHand");
    sendAction("next-round", heroSeatIndex, 0);
  }

  function handleReloadDemo() {
    if (heroSeatIndex === null) return;
    console.log("[BJ UI] handleReloadDemo");
    sendAction("reload-demo", heroSeatIndex, 0);
  }

  /* ───────────── Desktop seat renderer (overlays on felt) ───────────── */

  function renderSeat(seat: BlackjackSeatState) {
    const pos =
      BJ_SEAT_POSITIONS[seat.seatIndex] ?? BJ_SEAT_POSITIONS[0];

    const isHero = heroSeatIndex === seat.seatIndex;
    const seatTaken = !!seat.playerId;
    const takenByOther =
      seat.playerId && playerId && seat.playerId !== playerId;

    // Hide empty seats during live rounds to keep felt clean
    const tableInRound = phase !== "waiting-bets";
    if (!seatTaken && tableInRound) return null;

    const primaryHand =
      seat.hands && seat.hands.length > 0 ? seat.hands[0] : null;
    const value =
      primaryHand && primaryHand.cards.length > 0
        ? computeBlackjackValue(primaryHand.cards)
        : null;
    const resultBadge = primaryHand
      ? getResultBadge(primaryHand.result)
      : null;

    const isActive = activeSeatIndex === seat.seatIndex;
    const isMySeat = playerId && seat.playerId === playerId;

    // Show sit only in waiting-bets phase
    const showSitButton =
      !takenByOther && !seatTaken && phase === "waiting-bets";
    

    const layout =
      seat.seatIndex === 0 ||
      seat.seatIndex === 1 ||
      seat.seatIndex === 5 ||
      seat.seatIndex === 6
        ? "side"
        : "bottom";

    const isLeftSideSeat = seat.seatIndex >= 3;

    const cardCount = primaryHand?.cards.length ?? 0;
    const cardScale =
      cardCount >= 5 ? 0.8 : cardCount >= 3 ? 0.9 : 1.0;

    const mobileScale = isHero ? 1.06 : 0.9;
    const mobileOpacity = isHero ? "opacity-100" : "opacity-80";

    const infoBlock = (align: "left" | "center") => {
      const playerInitial =
        seat.name?.trim()?.[0]?.toUpperCase() ?? "P";

      return (
        <div
          className={
            "flex flex-col gap-1 text-[9px] text-white/75 " +
            (align === "center"
              ? "items-center text-center"
              : "items-start text-left")
          }
        >
          {/* Avatar + name */}
          <div className="flex items-center gap-1.5 max-w-[180px]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/35 bg-black/70 text-[10px] font-semibold text-white/85">
              {seatTaken ? playerInitial : "?"}
            </div>
            <div className="truncate text-[9px] text-white/70">
              {seat.name || (seatTaken ? "Player" : "Empty")}
            </div>
          </div>

          {/* Bet chips */}
          {primaryHand && primaryHand.bet > 0 && (
            <div className="mt-1 flex items-center justify-center">
              <div className="flex h-7 items-center justify-center rounded-full border-2 border-white/70 bg-[#FBBF24] px-2 shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                <span className="font-mono text-[10px] text-black">
                  {primaryHand.bet.toLocaleString()} GLD
                </span>
              </div>
            </div>
          )}

          {/* Total + result + turn badge */}
          {primaryHand && primaryHand.cards.length > 0 && value && (
            <div className="flex flex-col gap-0.5 max-w-[180px]">
              <div className="rounded-full bg-black/80 px-2 py-[1px] font-mono border border-white/25">
                Total {value.total}
                {value.soft ? " (soft)" : ""}
              </div>

              {resultBadge && (
                <div
                  className={
                    "rounded-full px-2 py-[1px] font-bold shadow " +
                    resultBadge.className
                  }
                >
                  {resultBadge.label}
                </div>
              )}

              {isActive && isMySeat && (
                <div className="rounded-full bg-emerald-500/90 px-2 py-[1px] text-[9px] font-bold text-black border border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.7)]">
                  Your turn
                </div>
              )}
            </div>
          )}

          {/* Sit button (leave is handled in hero controls now) */}
<div>
  {showSitButton && (
    <button
      type="button"
      onClick={() => handleSit(seat.seatIndex)}
      className="rounded-full bg-[#FFD700] px-3 py-[3px] font-semibold text-black hover:bg-yellow-400"
    >
      Sit here
    </button>
  )}
</div>

        </div>
      );
    };

    // Bottom seats (center row)
    if (layout === "bottom") {
      return (
        <div
          key={seat.seatIndex}
          className="absolute"
          style={pos}
        >
          <div
            className={
              "relative flex flex-col items-center gap-1 transition-transform " +
              (isActive ? "md:scale-[1.03]" : "") +
              " " +
              `scale-[${mobileScale}] md:scale-100 ${mobileOpacity}`
            }
          >
            {isActive && (
              <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-xl" />
            )}

                    <div
          className="relative flex max-w-[130px] justify-center"
          style={{
            transform: `scale(${cardScale})`,
            transformOrigin: "center center",
          }}
        >
          {primaryHand &&
            primaryHand.cards.map((c, i) => {
              const count = primaryHand.cards.length;
              const overlap = count >= 4;
              const style: CSSProperties =
                overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};
              return (
                <div
                  key={`seat-${seat.seatIndex}-bottom-card-${i}`}
                  style={style}
                >
                  <BJCard card={c} small />
                </div>
              );
            })}
        </div>

        {/* BIG player total pill under cards */}
        {primaryHand && value && primaryHand.cards.length > 0 && (
          <div className="mt-1 flex justify-center">
            <div
              className={
                "rounded-full border px-3 py-[3px] text-[10px] md:text-xs font-mono shadow-[0_0_16px_rgba(250,204,21,0.7)] " +
                (isHero
                  ? "bg-black/90 border-[#FFD700]/80 text-[#FFD700]"
                  : "bg-black/80 border-white/40 text-white/90")
              }
            >
              Total {value.total}
              {value.soft ? " (soft)" : ""}
            </div>
          </div>
        )}

        <div className="relative">{infoBlock("center")}</div>

          </div>
        </div>
      );
    }

    // Side seats
return (
  <div
    key={seat.seatIndex}
    className="absolute"
    style={pos}
  >
    <div
      className={
        "relative flex items-center gap-2 transition-transform " +
        (isActive ? "md:scale-[1.03]" : "") +
        " " +
        `scale-[${mobileScale}] md:scale-100 ${mobileOpacity}`
      }
    >
      {/* Glow for active seat */}
      {isActive && (
        <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-xl" />
      )}

      {/* Info block on LEFT side seats */}
      {isLeftSideSeat && (
        <div className="relative z-[1]">{infoBlock("left")}</div>
      )}

      {/* Cards + BIG total pill in the middle */}
      <div className="relative z-[1] flex flex-col items-center justify-center">
        {primaryHand && primaryHand.cards.length > 0 && (
          <>
            <div className="flex">
              {primaryHand.cards.map((c, i) => {
                const count = primaryHand.cards.length;
                const overlap = count >= 4;
                const style: CSSProperties =
                  overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};

                return (
                  <div
                    key={`seat-${seat.seatIndex}-card-${i}`}
                    style={style}
                  >
                    <BJCard card={c} small />
                  </div>
                );
              })}
            </div>

            {/* BIG player total pill under cards (side seats) */}
            {value && (
              <div className="mt-1 flex justify-center">
                <div
                  className={
                    "rounded-full border px-3 py-[3px] text-[10px] md:text-xs font-mono shadow-[0_0_16px_rgba(250,204,21,0.7)] " +
                    (isHero
                      ? "bg-black/90 border-[#FFD700]/80 text-[#FFD700]"
                      : "bg-black/80 border-white/40 text-white/90")
                  }
                >
                  Total {value.total}
                  {value.soft ? " (soft)" : ""}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info block on RIGHT side seats */}
      {!isLeftSideSeat && (
        <div className="relative z-[1]">{infoBlock("left")}</div>
      )}
    </div>
  </div>
);

  }

  /* ───────────── Render ───────────── */

  return (
    <div className="space-y-3 pb-20 md:space-y-4 md:pb-8">
      {/* Header */}
<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
  {/* Left: title */}
  <div>
    <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
      Base Gold Rush • Live Blackjack
    </div>

    {/* Room / phase only on md+ */}
    <div className="hidden md:block">
      <div className="text-sm text-white/80">
        Room ID:{" "}
        <span className="font-mono text-[#FFD700]/90">{ROOM_ID}</span>
      </div>
      <div className="text-[11px] text-white/60">
        Phase: <span className="font-mono">{phase}</span>
      </div>
    </div>
  </div>

  {/* WS / Connected only on md+ */}
  <div className="hidden md:flex items-center gap-3 text-[11px] text-white/60">
    <span className="font-mono text-xs text-white/50">WS: {wsUrl}</span>
    {/* connected pill… */}
  </div>
</div>


      {/* Table container */}
      <div className="relative rounded-3xl border border-[#FFD700]/40 bg-gradient-to-b from-black via-slate-950 to-black p-3 md:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">

        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
        </div>

        {/* Felt */}
        <div className="relative mx-auto w-full max-w-[900px] aspect-[10/11] md:aspect-[16/9]">
  <Image
    src="/felt/bgr-blackjack-table.png"
    alt="Base Gold Rush Live Blackjack Table"
    fill
    className="object-contain pointer-events-none select-none"
    priority
  />

          {/* Dealer cards (top center) */}
          <div className="pointer-events-none absolute left-1/2 top-[16%] flex -translate-x-1/2 flex-col items-center gap-1.5">
            <div className="flex items-center justify-center">
              <div className="flex">
                {dealerCards.map((c: string, i: number) => {
                  const count = dealerCards.length;
                  const overlap = count >= 4;
                  const style: CSSProperties =
                    overlap && i > 0 ? { marginLeft: "-0.6rem" } : {};

                  return (
                    <div key={`dealer-card-${i}`} style={style}>
                      <BJCard card={c} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/70 px-3 py-1 text-[10px] text-white/80 border border-white/20">
                Dealer
              </div>
              {dealerValue && (
                <div className="rounded-full bg-black/75 px-4 py-1.5 text-[12px] font-bold text-[#FFD700] border border-[#FFD700]/70 shadow-[0_0_18px_rgba(250,204,21,0.75)] tracking-wide flex items-center gap-1">
 {dealerValue && (
  <div
    className={[
      "mt-0.5 rounded-full px-4 py-1.5",
      "bg-black/85 border border-[#FFD700]",
      "shadow-[0_0_24px_rgba(250,204,21,0.9)]",
      "flex items-center gap-1.5",
      "text-[#FFD700] font-semibold",
      "text-[13px] md:text-[11px]",
      "animate-pulse"
    ].join(" ")}
  >
    <span className="uppercase tracking-[0.18em] text-[9px] md:text-[8px]">
      {dealerValue.hideHole &&
      (phase === "player-action" || phase === "dealing")
        ? "Total (showing)"
        : "Total"}
      :
    </span>

    <span className="font-mono text-[18px] md:text-[14px] drop-shadow-[0_0_8px_rgba(250,204,21,1)]">
      {dealerValue.total}
    </span>

    {dealerValue.soft && (
      <span className="ml-1 text-[10px] md:text-[9px] text-emerald-300 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,1)]">
        soft
      </span>
    )}
  </div>
)}

</div>

              )}
            </div>
          </div>

          {/* BIG bet countdown on felt near chip rack */}
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

          {/* GLOBAL action countdown for current seat */}
          {showActionTimerOnFelt && (
            <div className="hidden md:flex pointer-events-none absolute left-1/2 bottom-[11%] -translate-x-1/2 flex-col items-center gap-1">
              <div
                className={[
                  "rounded-full px-4 py-1 border text-center font-mono text-[9px] md:text-xs uppercase tracking-[0.18em]",
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

          {/* Seats – overlays on felt (mobile + desktop) */}
<div className="absolute inset-0 z-[40]">
  {seats.map((seat) => renderSeat(seat))}
</div>


        </div>
      </div>

      {/* Table status strip under felt (shared) */}
      <div className="mt-2 rounded-full border border-white/15 bg-gradient-to-r from-black via-slate-900 to-black px-3 py-1.5 text-[11px] text-white/80 shadow-[0_0_25px_rgba(0,0,0,0.7)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          Table Status&nbsp;&nbsp;
        </span>
        <span>{statusMessage}</span>
        {activeSeatIndex !== null && table && (
          <span className="ml-3 text-white/65">
            • Current turn: Seat {activeSeatIndex + 1}
            {table.seats[activeSeatIndex]?.playerId === playerId &&
              " (you)"}
          </span>
        )}
      </div>

      {heroSeat && (
  <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-white/15 bg-gradient-to-b from-black to-slate-950 p-3 text-[11px] text-white/80 md:hidden">
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        Your Hand (Seat {heroSeatIndex! + 1})
      </div>
      {isHeroTurn && (
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-400/60">
          Your turn
        </span>
      )}
    </div>

    {/* Slim stats row (always visible if you have a hand) */}
    {heroHand && heroValue && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-black/70 px-3 py-1 font-semibold text-white border border-white/25">
          Total:{" "}
          <span className="font-mono text-[#FFD700]">
            {heroValue.total}
          </span>
          {heroValue.soft && (
            <span className="ml-1 text-[10px] text-emerald-300">
              soft
            </span>
          )}
        </span>

        {typeof heroHand.bet === "number" && heroHand.bet > 0 && (
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
            Bet: {heroHand.bet.toLocaleString()} GLD
          </span>
        )}

        {heroBankroll !== null && (
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
            Bankroll: {heroBankroll.toLocaleString()} GLD
          </span>
        )}

        {heroNet !== null && (
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white/75 border border-white/15">
            Session:{" "}
            <span
              className={
                heroNet > 0
                  ? "text-emerald-300"
                  : heroNet < 0
                  ? "text-red-300"
                  : "text-white/70"
              }
            >
              {heroNet > 0 && "+"}
              {heroNet.toLocaleString()} GLD
            </span>
          </span>
        )}
      </div>
    )}

    {/* Betting controls – only during betting phases */}
    {showMobileBetControls && (
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <div>
          <div className="text-[10px] text-white/50">
            Demo bet amount
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_DEMO_BET}
              max={5000}
              value={betAmount}
              onChange={(e) =>
                setBetAmount(
                  Number(e.target.value) || MIN_DEMO_BET
                )
              }
              className="w-24 rounded-lg border border-white/25 bg-black/70 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
            />
            <span className="font-mono text-[#FFD700]">GLD</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlaceBet}
          disabled={!canPlaceBet}
          className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
        >
          {phase === "round-complete" ? "Bet next hand" : "Place bet"}
        </button>

        <button
          type="button"
          onClick={handleReloadDemo}
          disabled={heroSeatIndex === null}
          className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
        >
          Reload demo
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

    {/* Auto re-bet toggle – keep small screens clean with sm: */}
    <div className="mt-2 hidden sm:flex flex-wrap items-center gap-3">
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

    {/* Action buttons – ONLY when it’s your turn */}
    {isHeroTurn && (
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
  </div>
)}


      {/* DESKTOP controls row */}
      <div className="mt-3 hidden gap-3 md:grid md:grid-cols-[2fr_1.2fr]">
        {/* Player controls */}
        <div className="space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Your Controls
          </div>

          {/* Bet + main buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-[10px] text-white/50">
                Demo bet amount
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_DEMO_BET}
                  max={5000}
                  value={betAmount}
                  onChange={(e) =>
                    setBetAmount(
                      Number(e.target.value) || MIN_DEMO_BET
                    )
                  }
                  className="w-24 rounded-lg border border-white/25 bg-black/70 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
                />
                <span className="font-mono text-[#FFD700]">
                  GLD
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={!canPlaceBet}
              className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
            >
              {phase === "round-complete"
                ? "Bet for next hand"
                : "Place bet"}
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
              disabled={heroSeatIndex === null}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              Reload demo GLD
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

          {/* Auto rebet + hero action countdown */}
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

            {phase === "player-action" &&
              heroSeatIndex !== null &&
              activeSeatIndex === heroSeatIndex &&
              actionCountdown !== null && (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-[10px] font-mono text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.6)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Your action • {actionCountdown}s</span>
                </div>
              )}
          </div>

          {/* Hero action bar – only when it’s your turn */}
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

          {/* Hero hand info + bankroll/session */}
          {heroHand && heroValue && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-black/70 px-3 py-1 font-semibold text-white border border-white/25">
                Your hand:{" "}
                <span className="font-mono text-[#FFD700]">
                  {heroValue.total}
                </span>
                {heroValue.soft && (
                  <span className="ml-1 text-[10px] text-emerald-300">
                    soft
                  </span>
                )}
              </span>

              {typeof heroHand.bet === "number" &&
                heroHand.bet > 0 && (
                  <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
                    Bet: {heroHand.bet.toLocaleString()} GLD
                  </span>
                )}

              {heroBankroll !== null && (
                <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
                  Bankroll: {heroBankroll.toLocaleString()} GLD
                </span>
              )}

              {heroHand.isBusted && (
                <span className="rounded-full bg-red-500/90 px-3 py-1 text-[10px] font-bold text-black border border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  BUST
                </span>
              )}

              {getResultBadge(heroHand.result) && (
                <span
                  className={
                    "rounded-full px-3 py-1 text-[10px] font-bold " +
                    getResultBadge(heroHand.result)!.className
                  }
                >
                  {getResultBadge(heroHand.result)!.label}
                </span>
              )}

              {typeof heroHand.payout === "number" &&
                phase === "round-complete" && (
                  <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white/80 border border-white/15">
                    {heroHand.payout > 0 && "+"}
                    {heroHand.payout.toLocaleString()} GLD
                  </span>
                )}

              {heroNet !== null && (
                <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white/75 border border-white/15">
                  Session:{" "}
                  <span
                    className={
                      heroNet > 0
                        ? "text-emerald-300"
                        : heroNet < 0
                        ? "text-red-300"
                        : "text-white/70"
                    }
                  >
                    {heroNet > 0 && "+"}
                    {heroNet.toLocaleString()} GLD
                  </span>
                </span>
              )}
            </div>
          )}

          <div className="mt-2 text-[10px] text-white/50">
            Flow: sit at a seat, set your demo bet, press{" "}
            <span className="font-semibold text-[#FFD700]">
              Place bet
            </span>{" "}
            to deal cards, then use{" "}
            <span className="font-semibold">
              Hit / Stand / Double / Split
            </span>{" "}
            on your active hand.
          </div>
        </div>

              {/* Mobile hero action bar (compact, cards + actions) */}
      {heroSeat && heroHand && heroValue && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/15 bg-gradient-to-b from-black to-slate-950 p-3 text-[11px] text-white/80 md:hidden">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Your Hand (Seat {heroSeatIndex! + 1})
            </div>
            {isHeroTurn && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-400/60">
                Your turn
              </span>
            )}
          </div>

          {/* Hero cards, big and centered */}
          <div className="mt-1 flex justify-center">
            <div className="flex gap-1.5">
              {heroHand.cards.map((c, i) => (
                <div key={`mobile-hero-card-${i}`}>
                  <BJCard card={c} />
                </div>
              ))}
            </div>
          </div>

          {/* Totals + bet + session/bankroll row */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {/* Total pill */}
           <span
  className={[
    "rounded-full px-4 py-1.5",
    "bg-black/85 border border-[#FFD700]",
    "shadow-[0_0_22px_rgba(250,204,21,0.85)]",
    "flex items-center gap-1.5",
    "text-[13px] md:text-[11px] text-[#FFD700] font-semibold",
    "animate-pulse"
  ].join(" ")}
>
  <span className="uppercase tracking-[0.18em] text-[9px] md:text-[8px] text-white/70">
    Your hand
  </span>

  <span className="font-mono text-[18px] md:text-[14px] drop-shadow-[0_0_8px_rgba(250,204,21,1)]">
    {heroValue.total}
  </span>

  {heroValue.soft && (
    <span className="ml-1 text-[10px] md:text-[9px] text-emerald-300 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,1)]">
      soft
    </span>
  )}
</span>


            {/* Bet pill */}
            {typeof heroHand.bet === "number" && heroHand.bet > 0 && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
                Bet: {heroHand.bet.toLocaleString()} GLD
              </span>
            )}

            {/* Bankroll pill */}
            {heroBankroll !== null && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
                Bankroll: {heroBankroll.toLocaleString()} GLD
              </span>
            )}

            {/* Session net pill */}
            {heroNet !== null && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white/75 border border-white/15">
                Session:{" "}
                <span
                  className={
                    heroNet > 0
                      ? "text-emerald-300"
                      : heroNet < 0
                      ? "text-red-300"
                      : "text-white/70"
                  }
                >
                  {heroNet > 0 && "+"}
                  {heroNet.toLocaleString()} GLD
                </span>
              </span>
            )}
          </div>

          {/* 👉 Action buttons directly under cards – only when it's your turn */}
          {isHeroTurn && phase === "player-action" && (
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

          {/* Betting controls (kept, but below everything so bar feels lighter) */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div>
              <div className="text-[10px] text-white/50">
                Demo bet amount
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_DEMO_BET}
                  max={5000}
                  value={betAmount}
                  onChange={(e) =>
                    setBetAmount(
                      Number(e.target.value) || MIN_DEMO_BET
                    )
                  }
                  className="w-24 rounded-lg border border-white/25 bg-black/70 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
                />
                <span className="font-mono text-[#FFD700]">
                  GLD
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={!canPlaceBet}
              className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
            >
              {phase === "round-complete"
                ? "Bet next hand"
                : "Place bet"}
            </button>

            <button
              type="button"
              onClick={handleReloadDemo}
              disabled={heroSeatIndex === null}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              Reload demo
            </button>

            {heroSeatIndex !== null && heroSeat && (
              <button
                type="button"
                onClick={() => handleLeave(heroSeatIndex)}
                className="rounded-lg border border-slate-600 bg-black/75 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                Leave seat
              </button>
            )}
          </div>

          {/* Auto re-bet row (still available, but subtle) */}
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


        {/* Status / debug (desktop only) */}
        <div className="hidden md:block space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Table Status
          </div>
          <p>
            Phase: <span className="font-mono">{phase}</span>
          </p>
          <p className="text-[10px] text-white/55">
            {statusMessage}
          </p>
          <div className="mt-2 rounded-lg bg-black/40 p-2 text-[10px] font-mono text-white/60">
            <div>Hero seat: {heroSeatIndex ?? "none"}</div>
            {heroSeatIndex !== null && table && (
              <div>
                Cards in hero first hand:{" "}
                {(
                  table.seats.find(
                    (s) => s.seatIndex === heroSeatIndex
                  )?.hands[0]?.cards.length ?? 0
                ).toString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
