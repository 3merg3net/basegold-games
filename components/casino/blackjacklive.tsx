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
 * Seat positions (7 seats).
 * 0 = far right, 6 = far left, arcing up toward table edge.
 */
// 7 seats, indexed 0–6, from RIGHT to LEFT, aligned to the 7 logos on the felt
// 7 seats, indexed 0–6, from RIGHT to LEFT
const BJ_SEAT_POSITIONS: CSSProperties[] = [
  // Seat 0 – far right
  { left: "77%", top: "22%" },
  // Seat 1
  { left: "75%", top: "38%" },
  // Seat 2
  { left: "62%", top: "64%" },
  // Seat 3 – center
  { left: "45%", top: "59%" },
  // Seat 4
  { left: "15%", top: "55%" },
  // Seat 5
  { left: "4%", top: "40%" },
  // Seat 6 – far left
  { left: "2%", top: "22%" },
];





// --- Card rendering helper ---
// Used for dealer + player cards on the felt PNG
function renderCard(code: string, index: number, size: "sm" | "md" = "md") {
  const isHidden = code === "XX";

  const base =
    "relative flex items-center justify-center rounded-lg border border-black/60 shadow-[0_4px_12px_rgba(0,0,0,0.9)] bg-white";
  const sizeClasses =
    size === "sm"
      ? "w-11 h-16 text-[11px] md:w-12 md:h-[70px]"
      : "w-12 h-[74px] text-[12px] md:w-[52px] md:h-[80px]";

  if (isHidden) {
    return (
      <div
        key={`card-${index}-back`}
        className={`${base} ${sizeClasses} bg-[#0b295a]`}
      >
        <div className="h-[72%] w-[72%] rounded-md border border-sky-200/80 bg-[radial-gradient(circle_at_top,#38bdf8_0,#020617_70%)]" />
      </div>
    );
  }

  const rank = code[0];
  const suit = code[1];
  const isRed = suit === "h" || suit === "d";

  const rankLabel = rank === "T" ? "10" : rank;
  const suitSymbol =
    suit === "h" ? "♥" :
    suit === "d" ? "♦" :
    suit === "s" ? "♠" :
    "♣";

  return (
    <div
      key={`card-${index}-${code}`}
      className={`${base} ${sizeClasses}`}
    >
      <div
        className={`flex flex-col items-center leading-tight ${
          isRed ? "text-red-600" : "text-slate-900"
        }`}
      >
        <span className="font-extrabold text-[15px] md:text-[16px]">
          {rankLabel}
        </span>
        <span className="text-[11px] md:text-[12px]">
          {suitSymbol}
        </span>
      </div>
    </div>
  );
}



/* ───────────── Extra card helpers (for BJCard) ───────────── */

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

/**
 * Compute blackjack hand value from card codes like "Ah", "Td", "9c".
 * Ignores "XX" (hidden dealer card).
 */
function computeBlackjackValue(cards: string[]) {
  let total = 0;
  let aces = 0;

  for (const c of cards) {
    const rank = c[0]; // "A", "K", "Q", "J", "T", ...
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

// Not currently used in layout, but kept for future polish
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

  const wsUrl =
    process.env.NEXT_PUBLIC_BLACKJACK_WS || "Local";

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

  // Log full table on each update so we can confirm hands/cards
  useEffect(() => {
    if (table) {
      console.log(
        "[BJ UI] table update",
        JSON.parse(JSON.stringify(table))
      );
    }
  }, [table]);

  const heroSeatIndex = useMemo(() => {
    if (!table || !playerId) return null;
    const seat = table.seats.find((s) => s.playerId === playerId);
    return seat ? seat.seatIndex : null;
  }, [table, playerId]);
  const phase: BlackjackTableState["phase"] =
    table?.phase ?? "waiting-bets";

     // ── Betting countdown (uses betDeadlineMs from server) ──
const [betCountdown, setBetCountdown] = useState<number | null>(null);

const [autoRebet, setAutoRebet] = useState(false);
const [lastBet, setLastBet] = useState<number | null>(null)

  useEffect(() => {
  if (!table || heroSeatIndex === null) return;

  

  const phaseNow = table.phase;
  const heroSeatNow = table.seats.find(
    (s) => s.seatIndex === heroSeatIndex
  );

  // 1) Capture the last bet amount when a round completes
  if (phaseNow === "round-complete" && heroSeatNow?.hands?.length) {
    const h0 = heroSeatNow.hands[0];
    if (h0.bet > 0) {
      setLastBet(h0.bet);
    }
  }

  // 2) Auto re-bet when we enter waiting-bets and the seat is clear
  if (
    autoRebet &&
    phaseNow === "waiting-bets" &&
    (!heroSeatNow?.hands || heroSeatNow.hands.length === 0) &&
    lastBet && lastBet > 0
  ) {
    console.log("[BJ UI] autoRebet placing bet", {
      heroSeatIndex,
      lastBet,
    });
    placeBet(heroSeatIndex, lastBet);
  }
}, [table, heroSeatIndex, autoRebet, lastBet, placeBet]);


  

  

useEffect(() => {
  // If no table or no deadline → clear countdown
  if (!table || !table.betDeadlineMs) {
    setBetCountdown(null);
    return;
  }

  function update() {
    // Protect against null table or deadline
    if (!table || !table.betDeadlineMs) {
      setBetCountdown(null);
      return;
    }

    const ms = table.betDeadlineMs - Date.now();
    setBetCountdown(ms > 0 ? Math.ceil(ms / 1000) : 0);
  }

  update(); // initial run

  const id = setInterval(update, 250);
  return () => clearInterval(id);
}, [table?.betDeadlineMs, table]);

 

  const tablePhase = table?.phase ?? "waiting-bets";

    const canPlaceBet = useMemo(() => {
    if (heroSeatIndex === null) return false;
    if (!table) return true; // allow; server will normalize phase

    const seat = table.seats.find(
      (s) => s.seatIndex === heroSeatIndex
    );
    if (!seat) return false;

    // If this seat already has a hand with a bet and any cards,
    // don’t let them place another bet mid-hand.
    const hasLiveHand = seat.hands.some(
      (h) => h.bet > 0 && h.cards.length > 0 && h.result === "pending"
    );
    if (hasLiveHand) return false;

    return true;
  }, [table, heroSeatIndex]);


  const activeHandIndex = table?.activeHandIndex ?? null;

  // Dealer totals (only visible cards while hole is hidden)
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

  // Hero seat + active hand
  const heroSeat =
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
  const DEMO_START = 10_000; // matches START_BANKROLL on server
  const heroNet =
    heroBankroll !== null ? heroBankroll - DEMO_START : null;


    const activeSeatLabel =
    table && typeof table.activeSeatIndex === "number" && table.activeSeatIndex >= 0
      ? `Seat ${table.activeSeatIndex + 1}`
      : null;

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



  const dealerCards = table?.dealer.cards ?? [];

    const activeSeatIndex = table?.activeSeatIndex ?? null;


  // 🔥 Fallback seats: show 7 circles even before WS state arrives
  const seats: BlackjackSeatState[] =
    table && table.seats && table.seats.length > 0
      ? table.seats
      : Array.from({ length: 7 }, (_, i) => ({
          seatIndex: i,
          playerId: null,
          bankroll: 10_000,
          hands: [],
        }));

  /* ───────────── Send helpers ───────────── */

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
    setLastBet(amount); // 🔥 remember last manual bet
  }


  

  function handleAction(action: "hit" | "stand" | "double" | "split") {
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

  /* ───────────── Seat rendering ───────────── */

    function renderSeat(seat: BlackjackSeatState) {
    const pos = BJ_SEAT_POSITIONS[seat.seatIndex] ?? BJ_SEAT_POSITIONS[0];

    const isHero = heroSeatIndex === seat.seatIndex;
    const seatTaken = !!seat.playerId;
    const takenByOther =
      seat.playerId && playerId && seat.playerId !== playerId;

    const primaryHand =
      seat.hands && seat.hands.length > 0 ? seat.hands[0] : null;
    const value =
      primaryHand && primaryHand.cards.length > 0
        ? computeBlackjackValue(primaryHand.cards)
        : null;
    const resultBadge = primaryHand ? getResultBadge(primaryHand.result) : null;

    const isActive = activeSeatIndex === seat.seatIndex;
    const isMySeat = playerId && seat.playerId === playerId;

    // Show “Sit here” only if the seat is empty (or reclaimed after leave)
    const showSitButton = !takenByOther && !seatTaken;
    const showLeaveButton = isHero && seatTaken;

    // Layout:
    // - "side" for outer seats (0,1,5,6)
    // - "bottom" for center/bottom seats (2,3,4)
    const layout =
      seat.seatIndex === 0 ||
      seat.seatIndex === 1 ||
      seat.seatIndex === 5 ||
      seat.seatIndex === 6
        ? "side"
        : "bottom";

    const isLeftSideSeat = seat.seatIndex >= 3; // used only for side-layout

    // Card tilt (only for side-layout outer seats)
    const cardRotate =
      layout === "side"
        ? seat.seatIndex === 0 || seat.seatIndex === 1
          ? "rotate(-55deg)" // right side, tilt toward dealer
          : seat.seatIndex === 5 || seat.seatIndex === 6
          ? "rotate(55deg)" // left side, tilt toward dealer
          : "rotate(0deg)"
        : "rotate(0deg)";

    // Scale down when lots of cards so we don’t overlap neighbors
    const cardCount = primaryHand?.cards.length ?? 0;
    const cardScale =
      cardCount >= 5 ? 0.75 : cardCount >= 3 ? 0.85 : 1.0;

    const infoBlock = (align: "left" | "center") => (
      <div
        className={
          "flex flex-col gap-1 text-[9px] text-white/75 " +
          (align === "center"
            ? "items-center text-center"
            : "items-start text-left")
        }
      >
        {/* Seat label + bankroll */}
        <div className="rounded-full bg-black/70 px-2 py-[2px] border border-white/20 max-w-[180px]">
          <span className="font-semibold">
            Seat {seat.seatIndex + 1}
          </span>
          {typeof seat.bankroll === "number" && (
            <span className="ml-1 font-mono text-[#FFD700]">
              {seat.bankroll.toLocaleString()} GLD
            </span>
          )}
        </div>

                {/* Bet chips on felt */}
        {primaryHand && primaryHand.bet > 0 && (
          <div className="mt-1 flex items-center justify-center">
            <div className="flex h-7 items-center justify-center rounded-full border-2 border-white/70 bg-[#FBBF24] px-2 shadow-[0_0_10px_rgba(250,204,21,0.6)]">
              <span className="font-mono text-[10px] text-black">
                {primaryHand.bet.toLocaleString()} GLD
              </span>
            </div>
          </div>
        )}



        {/* Total + result */}
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

        {/* Player name */}
        <div className="max-w-[160px] truncate">
          {seat.name || (seatTaken ? "Player" : "Empty")}
        </div>

        {/* Sit / Leave button */}
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
          {showLeaveButton && (
            <button
              type="button"
              onClick={() => handleLeave(seat.seatIndex)}
              className="rounded-full bg-slate-700 px-3 py-[3px] font-semibold text-white hover:bg-slate-600"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    );

    // Center/bottom seats: cards on top, info below
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
              (isActive ? "scale-[1.03]" : "")
            }
          >
            {/* Glow for active seat */}
            {isActive && (
              <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-xl" />
            )}

            {/* Cards */}
            <div
              className="relative flex gap-1.5 max-w-[120px] justify-center"
              style={{
                transform: `scale(${cardScale})`,
                transformOrigin: "center center",
              }}
            >
              {primaryHand &&
                primaryHand.cards.map((c, i) =>
                  renderCard(c, i, "sm")
                )}
            </div>

            {/* Info + buttons centered below */}
            <div className="relative">{infoBlock("center")}</div>
          </div>
        </div>
      );
    }

    // Side seats: cards in middle, info on the side
    return (
      <div
        key={seat.seatIndex}
        className="absolute"
        style={pos}
      >
        <div
          className={
            "relative flex items-center gap-2 transition-transform " +
            (isActive ? "scale-[1.03]" : "")
          }
        >
          {/* Glow for active seat */}
          {isActive && (
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-xl" />
          )}

          {/* Left side seats: info on left, cards on right.
              Right side seats: cards on left, info on right. */}
          {isLeftSideSeat && (
            <div className="relative z-[1]">{infoBlock("left")}</div>
          )}

                  {/* Player cards */}
        <div className="flex items-center justify-center">
          {primaryHand && primaryHand.cards.length > 0 && (
            <div className="flex">
              {primaryHand.cards.map((c, i) => {
                const count = primaryHand.cards.length;
                // Only overlap when 4+ cards
                const overlap = count >= 4;
                const style: React.CSSProperties = overlap && i > 0
                  ? { marginLeft: "-0.6rem" }
                  : {};

                return (
                  <div key={`seat-${seat.seatIndex}-card-${i}`} style={style}>
                    <BJCard card={c} small />
                  </div>
                );
              })}
            </div>
          )}
        </div>




          {!isLeftSideSeat && (
            <div className="relative z-[1]">{infoBlock("left")}</div>
          )}
        </div>
      </div>
    );
  }





  /* ───────────── Render ───────────── */

  return (
    <div className="space-y-4 pb-16 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Base Gold Rush • Live Blackjack
          </div>
          <div className="text-sm text-white/80">
            Room ID:{" "}
            <span className="font-mono text-[#FFD700]/90">
              {ROOM_ID}
            </span>
          </div>
          <div className="text-[11px] text-white/60">
            Phase: <span className="font-mono">{phase}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/60">
          <span className="font-mono text-xs text-white/50">
            WS: {wsUrl}
          </span>
          {connected ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">
              <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
              <span className="mr-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Connecting…
            </span>
          )}
        </div>
      </div>

      {/* Table container */}
      <div className="relative rounded-3xl border border-[#FFD700]/40 bg-gradient-to-b from-black via-slate-950 to-black p-4 md:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[900px] aspect-[16/9]">
          {/* Table PNG */}
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
                  const style: React.CSSProperties = overlap && i > 0
                    ? { marginLeft: "-0.6rem" }
                    : {};

                  return (
                    <div key={`dealer-card-${i}`} style={style}>
                      <BJCard card={c} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dealer label + total */}
            <div className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/70 px-3 py-1 text-[10px] text-white/80 border border-white/20">
                Dealer
              </div>
              {dealerValue && (
                <div className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold text-[#FFD700] border border-[#FFD700]/40 shadow-[0_0_12px_rgba(250,204,21,0.45)]">
                  {dealerValue.hideHole &&
                  (phase === "player-action" ||
                    phase === "dealing")
                    ? `Total (showing): ${dealerValue.total}${
                        dealerValue.soft ? " (soft)" : ""
                      }`
                    : `Total: ${dealerValue.total}${
                        dealerValue.soft ? " (soft)" : ""
                      }`}
                </div>
              )}
            </div>
          </div>

          {/* Seats */}
          {seats.map((seat) => renderSeat(seat))}
        </div>
      </div>

           {/* Table status strip under felt */}
<div className="mt-3 rounded-full border border-white/15 bg-gradient-to-r from-black via-slate-900 to-black px-4 py-2 text-[11px] text-white/80 shadow-[0_0_25px_rgba(0,0,0,0.7)]">
  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
    Table Status&nbsp;&nbsp;
  </span>

  {/* Core status message (what you already had) */}
  <span>{statusMessage}</span>

{phase === "waiting-bets" && betCountdown !== null && (
  <span className="ml-3 inline-flex items-center rounded-full border border-[#FFD700]/50 bg-black/70 px-3 py-1 text-[10px] font-mono text-[#FFD700] shadow-[0_0_15px_rgba(250,204,21,0.5)]">
    PLACE YOUR BETS • {betCountdown}s
  </span>
)}


  {/* Current turn indicator */}
  {activeSeatIndex !== null && table && (
    <span className="ml-3 text-white/65">
      • Current turn: Seat {activeSeatIndex + 1}
      {table.seats[activeSeatIndex]?.playerId === playerId && " (you)"}
    </span>
  )}
</div>



      {/* Controls row */}
      <div className="grid gap-3 md:grid-cols-[2fr_1.2fr]">
        {/* Player controls */}
        <div className="space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Your Controls
          </div>

          {/* Bet + main action buttons */}
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
              disabled={heroSeatIndex === null}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              Reload demo GLD
            </button>
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


          {/* Hit / Stand / Double / Split */}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAction("hit")}
              disabled={phase !== "player-action"}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
            >
              Hit
            </button>
            <button
              type="button"
              onClick={() => handleAction("stand")}
              disabled={phase !== "player-action"}
              className="rounded-lg bg-slate-700 px-3 py-1.5 font-semibold text-white hover:bg-slate-600 disabled:opacity-40"
            >
              Stand
            </button>
            <button
              type="button"
              onClick={() => handleAction("double")}
              disabled={phase !== "player-action"}
              className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
            >
              Double
            </button>
            <button
              type="button"
              onClick={() => handleAction("split")}
              disabled={phase !== "player-action"}
              className="rounded-lg bg-purple-500 px-3 py-1.5 font-semibold text-black hover:bg-purple-400 disabled:opacity-40"
            >
              Split
            </button>
          </div>

           {/* Your hand info + result pill */}
  {heroHand && heroValue && (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
      {/* Current hand total */}
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

      {/* Current hand bet */}
      {typeof heroHand.bet === "number" && heroHand.bet > 0 && (
        <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-[#FFD700] border border-[#FFD700]/40">
          Bet: {heroHand.bet.toLocaleString()} GLD
        </span>
      )}

      {/* Last hand result pill */}
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

      {/* Last hand payout */}
      {typeof heroHand.payout === "number" &&
        phase === "round-complete" && (
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white/80 border border-white/15">
            {heroHand.payout > 0 && "+"}
            {heroHand.payout.toLocaleString()} GLD
          </span>
        )}

      {/* Session net vs starting 10,000 demo GLD */}
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

        {/* Status / debug */}
        <div className="space-y-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 to-black p-4 text-[11px] text-white/80">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            Table Status
          </div>
          <p>
            Phase: <span className="font-mono">{phase}</span>
          </p>
                    <p className="text-[10px] text-white/55">
            {statusMessage}
          </p>


          {/* Tiny debug for hero seat */}
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
