// components/casino/arcade/PokerRoomArcade.tsx
"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { usePokerRoom } from "@/lib/pokerClient/usePokerRoom";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { getHandHelper, HandHelper } from "@/lib/poker/handHelper";
import PokerCard from "@/components/poker/PokerCard";
import ConfettiBurst from "@/components/general/ConfettiBurst";
import { IS_DEMO } from "@/config/env";




/* ───────────────── Types ───────────────── */

type SeatView = {
  seatIndex: number;
  playerId: string | null;
  handle?: string; // ✅ add
  name?: string;
  chips?: number;
};



type SeatsUpdateMessage = {
  type: "seats-update";
  seats: SeatView[];
  bankrolls?: Record<string, number>;
};


type TableState = {
  handId: number;
  board: string[];
  players: {
    seatIndex: number;
    playerId: string;
    holeCards: string[];
  }[];
};

type BettingPlayerState = {
  seatIndex: number;
  playerId: string;
  stack: number;
  inHand: boolean;
  hasFolded: boolean;
  hasActed: boolean;
  committed: number;
  totalContributed: number;
};

type BettingStreet = "preflop" | "flop" | "turn" | "river" | "done";

type BettingState = {
  handId: number;
  street: BettingStreet;
  pot: number;
  buttonSeatIndex: number;
  currentSeatIndex: number | null;
  bigBlind: number;
  smallBlind: number;
  maxCommitted: number;
  players: BettingPlayerState[];

  // server-supplied blind positions
  smallBlindSeatIndex?: number | null;
  bigBlindSeatIndex?: number | null;
};

type ShowdownPlayer = {
  seatIndex: number;
  playerId: string;
  holeCards: string[];
  bestHand: string[];
  rankName: string;
  isWinner: boolean;
};

type ShowdownState = {
  handId: number;
  board: string[];
  players: ShowdownPlayer[];
};

type DealerLogEntry = {
  id: number;
  text: string;
  ts: number;
};

type PokerRoomArcadeProps = {
  roomId: string;
  tableName?: string;
};



type WinnerEntry = {
  handId: number;
  seatIndex: number;
  playerId: string;
  name?: string;
  rankName: string;
  timestamp: number;
};

type ActionPhase = "base" | "extra" | null;

type PauseStateMessage =
  | { type: "game-paused"; until: number; by?: string }
  | { type: "game-resumed" };


/* ───────────────── Chips ───────────────── */

const CHIP_SOURCES: Record<number, string> = {
  1: "/chips/chip-bgrc-1.png",
  5: "/chips/chip-bgrc-5.png",
  10: "/chips/chip-bgrc-10.png",
  25: "/chips/chip-bgrc-25.png",
  100: "/chips/chip-bgrc-100.png",
  500: "/chips/chip-bgrc-500.png",
  1000: "/chips/chip-bgrc-1000.png",
};

const CHIP_DENOMS = [500, 100, 25, 5, 1] as const;

// Turn an amount into a list of chip denominations (largest → smallest)
function makeChipList(amount: number, maxChips = 14): number[] {
  let remaining = Math.max(0, Math.floor(amount || 0));
  const out: number[] = [];

  for (const d of CHIP_DENOMS) {
    while (remaining >= d && out.length < maxChips) {
      out.push(d);
      remaining -= d;
    }
    if (out.length >= maxChips) break;
  }

  // If we hit maxChips but still have remainder, cap it with one top chip
  // (keeps stack readable instead of generating 80 chips)
  if (remaining > 0 && out.length > 0) {
    // keep as-is; badge shows exact number anyway
  } else if (remaining > 0 && out.length === 0) {
    // amount was tiny but >0; show at least one chip
    out.push(1);
  }

  return out;
}

type LocalChipStackProps = {
  amount: number;
  size?: number; // px width/height per chip image
  maxChips?: number;
  // stacked look tuning
  stepY?: number; // px offset per chip
  blurTailFrom?: number; // chips deeper in stack can be slightly faded
};

function ChipStack({
  amount,
  size = 28,
  maxChips = 14,
  stepY,
  blurTailFrom = 9,
}: LocalChipStackProps) {
  const chips = useMemo(() => makeChipList(amount, maxChips), [amount, maxChips]);

  // Default vertical spacing based on chip size (smaller chips = tighter stack)
  const dy = stepY ?? Math.max(3, Math.round(size * 0.18)); // e.g. 28px -> ~5px

  if (!chips.length) return null;

  // Total height so container fits the absolute-positioned stack
  const height = size + (chips.length - 1) * dy;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height,
        // keep it crisp and centered
        transform: "translateZ(0)",
      }}
    >
      {chips.map((denom, i) => {
        const src = CHIP_SOURCES[denom] ?? CHIP_SOURCES[1];

        // Stack bottom-up: last chip sits on top visually
        // We render in order and use zIndex to ensure top chips are above.
        const y = (chips.length - 1 - i) * dy;

        // Slight fade/blur for deep chips so it reads like a stack
        const tailIndex = chips.length - 1 - i; // 0 = top chip
        const isTail = tailIndex >= blurTailFrom;
        const opacity = isTail ? 0.75 : 1;

        return (
          <Image
            key={`${denom}-${i}`}
            src={src}
            alt={`${denom} chip`}
            width={size}
            height={size}
            draggable={false}
            className="absolute left-0 select-none"
            style={{
              top: y,
              zIndex: i + 1,
              opacity,
              // NO rotate / fan
              transform: "translateZ(0)",
              // tiny shadow for separation
              filter: isTail ? "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" : "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
            }}
          />
        );
      })}
    </div>
  );
}




export function formatChips(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";

  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return `${v.toFixed(v >= 10 ? 1 : 2).replace(/\.0+$/, "")}M`;
  }
  if (amount >= 1_000) {
    const v = amount / 1_000;
    return `${v.toFixed(v >= 10 ? 1 : 2).replace(/\.0+$/, "")}k`;
  }

  return Math.floor(amount).toString();
}

// --- PGLD → USD display helpers ---
// For now this is a single configurable rate. Later you can hydrate it from
// your cashier endpoint, supabase, or an oracle-backed API route.
const PGLD_USD =
  Number(process.env.NEXT_PUBLIC_PGLD_USD ?? "") || 0.01; // default: $0.01 / PGLD

function formatUsdFromPgld(pgld: number, rate = PGLD_USD) {
  if (!Number.isFinite(pgld) || pgld <= 0 || !Number.isFinite(rate) || rate <= 0) return "$0.00";
  const usd = pgld * rate;

  // Keep it readable: small amounts show cents, big amounts show commas.
  if (usd < 1) return `$${usd.toFixed(2)}`;
  if (usd < 10_000) return `$${usd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return `$${Math.round(usd).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function PgldWithUsd({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-[#FFD700]">{formatChips(amount)}</span>
      <span className="text-white/55">PGLD</span>
      <span className="text-white/35">•</span>
      <span className="font-mono text-emerald-200/90">{formatUsdFromPgld(amount)}</span>
    </span>
  );
}

/* ───────────────── Seat geometry ───────────────── */

const SEAT_GEOMETRY_PC: React.CSSProperties[] = [
  { bottom: "6%", left: "50%", transform: "translate(-50%, 0)" }, // 0
  { bottom: "6%", left: "31%", transform: "translate(-50%, 0)" }, // 1
  { bottom: "6%", left: "67%", transform: "translate(-50%, 0)" }, // 2

  { top: "80%", left: "16%", transform: "translate(-50%, -50%)" }, // 3
  { top: "49%", left: "7%", transform: "translate(-50%, -50%)" }, // 4
  { top: "20%", left: "16%", transform: "translate(-50%, -50%)" }, // 5

  { top: "80%", right: "16%", transform: "translate(50%, -50%)" }, // 6
  { top: "49%", right: "7%", transform: "translate(50%, -50%)" }, // 7
  { top: "20%", right: "16%", transform: "translate(50%, -50%)" }, // 8
];

const SEAT_GEOMETRY_MOBILE: React.CSSProperties[] = [
  { bottom: "6%", left: "51%", transform: "translate(-50%, 0)" }, // 0
  { bottom: "12%", left: "20%", transform: "translate(-50%, 0)" }, // 1
  { bottom: "12%", left: "81%", transform: "translate(-50%, 0)" }, // 2

  { top: "63%", left: "10%", transform: "translate(-50%, -50%)" }, // 3
  { top: "40%", left: "9%", transform: "translate(-50%, -50%)" }, // 4
  { top: "16%", left: "15%", transform: "translate(-50%, -50%)" }, // 5

  { top: "63%", right: "10%", transform: "translate(50%, -50%)" }, // 6
  { top: "40%", right: "9%", transform: "translate(50%, -50%)" }, // 7
  { top: "16%", right: "15%", transform: "translate(50%, -50%)" }, // 8
];


const DEFAULT_AVATARS = [
  "/avatars/av-1.png",
  "/avatars/av-2.png",
  "/avatars/av-3.png",
  "/avatars/av-4.png",
  "/avatars/av-5.png",
  "/avatars/av-6.png",
];

/* ───────────────── Audio hook ───────────────── */

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

/* ───────────────── Main component (CLEANED + HANDLE-FIRST IDENTITY) ───────────────── */

export default function PokerRoomArcade({
  roomId,
  tableName,
}: PokerRoomArcadeProps) {
  const { profile } = usePlayerProfileContext() as any

  // ───────────────── Demo bankroll config ─────────────────
  const DEMO_TARGET = 5000

  const DEMO_ENABLED =
    (process.env.NEXT_PUBLIC_DEMO_BANKROLL ?? "") === "1" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.startsWith("127.") ||
        window.location.hostname.startsWith("192.") ||
        window.location.hostname.startsWith("10.")))

  const demoRequestedRef = useRef(false)

  // ───────────────── Stable playerId per device (fallback only) ─────────────────
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      let id = window.localStorage.getItem("pgld-poker-player-id")
      if (!id) {
        const rand =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (((crypto as any).randomUUID?.() || "") as string).slice(0, 8)
            : Math.random().toString(36).slice(2, 10)

        id = `player-${rand}`
        window.localStorage.setItem("pgld-poker-player-id", id)
      }
      setPlayerId(id)
    } catch {
      const fallback = "player-" + Math.random().toString(36).slice(2, 10)
      setPlayerId(fallback)
    }
  }, [])

  // ───────────────── Identity helpers (HANDLE FIRST) ─────────────────

  function normHandle(raw?: string | null) {
    const h = (raw ?? "").trim()
    if (!h) return ""
    return h.startsWith("@") ? h : `@${h}`
  }

  // NOTE: this is only a UI fallback; never show raw ids to players
  function seatLabel(seatIndex?: number | null) {
    if (seatIndex == null) return "Seat"
    return `Seat ${seatIndex + 1}`
  }

  /**
   * Decide what to show on the pill for a given seat.
   * Priority:
   *  1) seat.handle (authoritative for ALL players if coordinator broadcasts it)
   *  2) hero profile.handle (for hero seat, in case seat data lags)
   *  3) seat.name (optional nickname)
   *  4) Seat X
   */
  function displayNameForSeat(args: {
    seatIndex: number
    seatHandle?: string | null
    seatName?: string | null
    isHero: boolean
    profileHandle?: string | null
  }) {
    const h = normHandle(args.seatHandle)
    if (h) return h

    if (args.isHero) {
      const heroH = normHandle(args.profileHandle)
      if (heroH) return heroH
    }

    const n = (args.seatName ?? "").trim()
    if (n) return n

    return seatLabel(args.seatIndex)
  }

  // ───────────────── Canonical player id (profile.id) ─────────────────

  // Use profile.id as canonical WS player id when available (chips/account tied to it).
  const effectivePlayerId = profile?.id || (playerId ?? "player-pending")
  const myId = String(effectivePlayerId)

  const { ready, messages, send } = usePokerRoom({
    roomId,
    playerId: effectivePlayerId,
    tableName: tableName || undefined,
    isPrivate:
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("private") === "1"
        : false,
  })

  // Once profile.id exists, pin localStorage + state to it (prevents id drift across reloads)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!profile?.id) return

    try {
      window.localStorage.setItem("pgld-poker-player-id", String(profile.id))
      setPlayerId(String(profile.id))
    } catch {}
  }, [profile?.id])

  const sendMessage = (msg: any) => (send as any)(msg)

  // ───────────────── Sounds ─────────────────
  const playDeal = useSound("/sounds/deal-card.mp3")
  const playChip = useSound("/sounds/chip.wav")
  const playWin = useSound("/sounds/win.wav")

  // ───────────────── Invite link ─────────────────
  const [inviteUrl, setInviteUrl] = useState("")
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") setInviteUrl(window.location.href)
  }, [])

  function handleCopyInvite() {
    if (!inviteUrl) return
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(inviteUrl)
        .then(() => {
          setCopiedInvite(true)
          setTimeout(() => setCopiedInvite(false), 1500)
        })
        .catch(() => {})
    }
  }

  /* ───────────────── Dealer log ───────────────── */

  const [dealerLog, setDealerLog] = useState<DealerLogEntry[]>([])
  const logIdRef = useRef(0)

  const pushLog = useCallback((text: string) => {
    setDealerLog((prev) => {
      const id = logIdRef.current++
      const next: DealerLogEntry[] = [{ id, text, ts: Date.now() }, ...prev]
      return next.slice(0, 24)
    })
  }, [])

  /* ───────────────── WS derived state ───────────────── */

  const seatsUpdate = useMemo<SeatsUpdateMessage | null>(() => {
    const seatMessages = (messages as any[]).filter(
      (m) => m && m.type === "seats-update"
    )
    if (seatMessages.length === 0) return null
    return seatMessages[seatMessages.length - 1] as SeatsUpdateMessage
  }, [messages])

  const seats = useMemo<SeatView[]>(() => seatsUpdate?.seats ?? [], [seatsUpdate])

  const bankrolls = useMemo<Record<string, number>>(
    () => seatsUpdate?.bankrolls ?? {},
    [seatsUpdate]
  )

  const heroBankroll = useMemo(() => {
    if (!myId) return 0
    return Number(bankrolls[myId] ?? 0)
  }, [bankrolls, myId])

  // Auto-topup demo bankroll once on connect (dev/demo mode)
  useEffect(() => {
    if (!DEMO_ENABLED) return
    if (!ready) return
    if (!myId) return

    const current = Number(bankrolls[myId] ?? 0)
    if (current > 0) return

    if (demoRequestedRef.current) return
    demoRequestedRef.current = true

    sendMessage({ type: "demo-topup", target: DEMO_TARGET })
    pushLog(`Demo mode: requesting ${DEMO_TARGET.toLocaleString()} PGLD bankroll…`)
  }, [DEMO_ENABLED, ready, myId, bankrolls, pushLog])

  const table = useMemo<TableState | null>(() => {
    const tableMessages = (messages as any[]).filter(
      (m) => m && m.type === "table-state"
    )
    if (tableMessages.length === 0) return null
    const last = tableMessages[tableMessages.length - 1]
    return {
      handId: last.handId,
      board: last.board,
      players: last.players,
    } as TableState
  }, [messages])

  const betting = useMemo<BettingState | null>(() => {
    const bs = (messages as any[]).filter((m) => m && m.type === "betting-state")
    if (bs.length === 0) return null
    const last = bs[bs.length - 1]
    return last as BettingState
  }, [messages])

  const showdown = useMemo<ShowdownState | null>(() => {
    const sd = (messages as any[]).filter((m) => m && m.type === "showdown")
    if (sd.length === 0) return null
    const last = sd[sd.length - 1]
    return last as ShowdownState
  }, [messages])

  const chatMessages = useMemo(
    () =>
      (messages as any[]).filter(
        (m) => m && m.type === "chat-broadcast"
      ) as Array<{ playerId: string; text: string }>,
    [messages]
  )

  const heroSeat = useMemo(() => {
    if (!seats || seats.length === 0) return null
    return seats.find((s) => String(s.playerId) === myId) || null
  }, [seats, myId])

  const seatedCount = useMemo(
    () => seats.filter((s) => s.playerId).length,
    [seats]
  )

  const MIN_PLAYERS_TO_START = 2

  const hostSeatIndex = useMemo(() => {
    let min: number | null = null
    for (const s of seats) {
      if (!s.playerId) continue
      if (min === null || s.seatIndex < min) min = s.seatIndex
    }
    return min
  }, [seats])

  const isHostClient =
    !!heroSeat && hostSeatIndex !== null && heroSeat.seatIndex === hostSeatIndex

  const handInProgress = !!betting && betting.street !== "done"

  const rawHeroBetting = useMemo(() => {
    if (!betting) return null
    return betting.players.find((p) => String(p.playerId) === myId) ?? null
  }, [betting, myId])

  const [joinedMidHand, setJoinedMidHand] = useState(false)
  const heroBetting = joinedMidHand && handInProgress ? null : rawHeroBetting

  const heroHand = useMemo(() => {
    if (!table) return null
    if (joinedMidHand && handInProgress) return null
    const hero = table.players.find((p) => String(p.playerId) === myId)
    return hero?.holeCards ?? null
  }, [table, myId, joinedMidHand, handInProgress])

  const heroHandHelper = useMemo<HandHelper | null>(() => {
    if (!table) return null
    if (!heroHand || heroHand.length < 2) return null
    if (!Array.isArray(table.board) || table.board.length < 3) return null
    return getHandHelper(heroHand, table.board)
  }, [table, heroHand])

  const DEFAULT_BUYIN = 1000

  const heroIsInHand = !!heroBetting && heroBetting.inHand && !heroBetting.hasFolded

  const isHeroTurn: boolean =
    !!betting &&
    !!heroSeat &&
    !!heroBetting &&
    betting.currentSeatIndex === heroSeat.seatIndex &&
    betting.street !== "done"

  const heroTurnPrevRef = useRef(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const wasHeroTurn = heroTurnPrevRef.current

    if (!wasHeroTurn && isHeroTurn && "vibrate" in window.navigator) {
      if (window.innerWidth <= 768) window.navigator.vibrate([35, 40, 35])
    }
    heroTurnPrevRef.current = isHeroTurn
  }, [isHeroTurn])

  const heroHasAction = !!heroSeat && !!betting && betting.street !== "done" && !!heroBetting

  const showHeroBar = !!heroSeat && heroIsInHand && betting && betting.street !== "done" && isHeroTurn

  const describeHero = useCallback(() => {
    const h = normHandle(profile?.handle)
    if (h) return h
    const nm = (profile?.name ?? "").trim()
    if (nm.length > 0) return nm
    const seatNm = (heroSeat?.name ?? "").trim()
    if (seatNm.length > 0) return seatNm
    return "You"
  }, [profile?.handle, profile?.name, heroSeat?.name])


  

  /* ───────────────── Winners / revealed cards / seat tags (declare BEFORE effects) ───────────────── */

  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const winnersToShow: WinnerEntry[] = winners;

  const [revealedHoles, setRevealedHoles] = useState<Record<string, string[]>>(
    {}
  );

  const [newPlayerSeats, setNewPlayerSeats] = useState<Record<number, number>>(
    {}
  );
  const prevSeatsRef = useRef<Map<number, string | null>>(new Map());

  const [confettiKey, setConfettiKey] = useState<string | number | null>(null);


  /* ───────────────── Table tracking refs ───────────────── */

  const handIdRef = useRef<number | null>(null);
  const streetRef = useRef<BettingStreet | null>(null);
  const lastPotRef = useRef<number>(0);
  const lastBoardCountRef = useRef<number>(0);
  const showdownHandRef = useRef<number | null>(null);

  /* ───────────────── Misc UI state ───────────────── */

const [showLastWinners, setShowLastWinners] = useState(false);
const [showDealerLog, setShowDealerLog] = useState(false);
const [showHostPanel, setShowHostPanel] = useState(false);
const [isFullscreen, setIsFullscreen] = useState(false);
const [openPanels, setOpenPanels] = useState(false);

// Mobile-only hero panel toggles (keeps the bottom bar clean)
const [showMobileTools, setShowMobileTools] = useState(false);
const [showMobileAdvanced, setShowMobileAdvanced] = useState(false);


  
  /* ───────────────── Reset nonce (UI refresh helper) ───────────────── */

  const [resetNonce, setResetNonce] = useState(0);

  const [potPulse, setPotPulse] = useState(false);
const potPulseTimerRef = useRef<number | null>(null);


  /* ───────────────── Table transitions + deal sound ───────────────── */

  useEffect(() => {
    if (!table) return;

    if (handIdRef.current == null || table.handId !== handIdRef.current) {
      handIdRef.current = table.handId;
      streetRef.current = null;
      showdownHandRef.current = null;
      lastBoardCountRef.current = table.board.length;

      setJoinedMidHand(false);
      setRevealedHoles({});

      setRecentActions([]);
      setSeatActionMap({});


      pushLog(`New hand #${table.handId} in the PGLD room.`);
      playDeal();
      return;
    }

    const count = table.board.length;
    if (count > lastBoardCountRef.current) playDeal();
    lastBoardCountRef.current = count;
  }, [table, playDeal, pushLog]);

  /* ───────────────── Handle table-reset message ───────────────── */

  useEffect(() => {
    const sawReset = (messages as any[]).some((m) => m && m.type === "table-reset");
    if (!sawReset) return;

    setJoinedMidHand(false);
    setRevealedHoles({});
    showdownHandRef.current = null;
    streetRef.current = null;
    handIdRef.current = null;
    lastPotRef.current = 0;

    setResetNonce((n) => n + 1);
    setRecentActions([]);
    setSeatActionMap({});
    pushLog("Table was reset by host.");
  }, [messages, pushLog]);

  const [paused, setPaused] = useState(false)

  

  /* ───────────────── Pot change sound + street logging ───────────────── */

  useEffect(() => {
    if (!betting) return;

      if (betting.pot > lastPotRef.current) {
    playChip();

    // pulse the pot badge
    setPotPulse(true);
    if (potPulseTimerRef.current) window.clearTimeout(potPulseTimerRef.current);
    potPulseTimerRef.current = window.setTimeout(() => setPotPulse(false), 260);
  }

  lastPotRef.current = betting.pot;


    if (streetRef.current !== betting.street) {
      streetRef.current = betting.street;
      const labelMap: Record<BettingStreet, string> = {
        preflop: "Preflop",
        flop: "Flop",
        turn: "Turn",
        river: "River",
        done: "Hand complete",
      };
      const label = labelMap[betting.street] ?? betting.street;

      if (betting.street === "done") {
        pushLog(
          `Hand #${betting.handId} complete. Pot locked at ${betting.pot} PGLD chips.`
        );
      } else {
        pushLog(`Street: ${label}. Pot currently ${betting.pot}.`);
      }
    }
  }, [betting, playChip, pushLog]);

  function getActionPillClasses(labelRaw: string) {
  const s = (labelRaw || "").toLowerCase();

  const isFold = s.includes("fold");
  const isCheck = s.includes("check");
  const isCall = s.includes("call");
  const isBet = s.includes("bet");
  const isRaise = s.includes("raise");
  const isAllIn = s.includes("all-in") || s.includes("all in");

  // default: gold
  let border = "border-[#FFD700]/70";
  let text = "text-[#FFD700]/95";
  let glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_28px_rgba(250,204,21,0.22)]";
  let bg = "bg-gradient-to-b from-black/92 via-[#0b0f1a]/92 to-black/92";

  if (isFold) {
    border = "border-red-400/70";
    text = "text-red-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_26px_rgba(248,113,113,0.22)]";
    bg = "bg-gradient-to-b from-black/92 via-[#1a0b0b]/92 to-black/92";
  } else if (isAllIn) {
    border = "border-fuchsia-400/70";
    text = "text-fuchsia-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_28px_rgba(232,121,249,0.22)]";
    bg = "bg-gradient-to-b from-black/92 via-[#170a1a]/92 to-black/92";
  } else if (isRaise) {
    border = "border-amber-300/80";
    text = "text-amber-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_28px_rgba(251,191,36,0.22)]";
    bg = "bg-gradient-to-b from-black/92 via-[#1a1305]/92 to-black/92";
  } else if (isBet) {
    border = "border-emerald-400/70";
    text = "text-emerald-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_26px_rgba(52,211,153,0.20)]";
    bg = "bg-gradient-to-b from-black/92 via-[#061a12]/92 to-black/92";
  } else if (isCall) {
    border = "border-sky-400/70";
    text = "text-sky-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_26px_rgba(56,189,248,0.20)]";
    bg = "bg-gradient-to-b from-black/92 via-[#06131a]/92 to-black/92";
  } else if (isCheck) {
    border = "border-slate-300/35";
    text = "text-slate-200";
    glow = "shadow-[0_0_18px_rgba(0,0,0,0.95),0_0_18px_rgba(148,163,184,0.16)]";
    bg = "bg-gradient-to-b from-black/92 via-[#0b1220]/92 to-black/92";
  }

  return { border, text, glow, bg };
}


  /* ───────────────── Showdown tracking (deduped) ───────────────── */

  useEffect(() => {
    if (!showdown || !table) return;
    if (showdown.handId !== table.handId) return;

    if (showdownHandRef.current === showdown.handId) return;
    showdownHandRef.current = showdown.handId;

    playWin();
    pushLog("Showdown: revealing hands and sweeping the pot.");

    // Confetti when HERO wins
try {
  const heroWon =
    !!heroSeat &&
    Array.isArray(showdown.players) &&
    showdown.players.some(
      (p) => p.isWinner && p.playerId === playerId && p.seatIndex === heroSeat.seatIndex
    );

  if (heroWon) {
    setConfettiKey(`${showdown.handId}-${playerId}`);
  }
} catch {
  // ignore
}


    const now = Date.now();
if (Array.isArray(showdown.players)) {
  const additions: WinnerEntry[] = showdown.players
    .filter((p) => p.isWinner)
    .map((p) => {
      const seatMeta = seats.find(
        (s) => s.seatIndex === p.seatIndex && s.playerId === p.playerId
      );

      return {
        handId: showdown.handId,
        seatIndex: p.seatIndex,
        playerId: p.playerId,
        name: seatMeta?.name ?? undefined, // ✅ fix
        rankName: p.rankName,
        timestamp: now,
      };
    });

  if (additions.length > 0) {
    setWinners((prev) => [...additions, ...prev].slice(0, 10));
  }
}

  }, [showdown, table, playWin, pushLog, seats]);

  
  const boardCards = table?.board ?? [];
  const buttonSeatIndex = betting?.buttonSeatIndex ?? null;
  const currentSeatIndex = betting?.currentSeatIndex ?? null;

  /* ───────────────── Betting display helpers ───────────────── */

  const totalBySeat: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {};
    if (!betting?.players) return map;

    for (const p of betting.players) {
      const total = Number((p as any).totalContributed ?? 0);
      map[p.seatIndex] = total;
    }
    return map;
  }, [betting]);

  const committedBySeat: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {};
    if (!betting?.players) return map;

    for (const p of betting.players) {
      map[p.seatIndex] = Number(p.committed ?? 0);
    }
    return map;
  }, [betting]);

  const pot = useMemo(() => {
    const serverPot = typeof betting?.pot === "number" ? betting.pot : 0;
    const handPot = Object.values(totalBySeat).reduce((sum, v) => sum + (v ?? 0), 0);
    if (serverPot > 0 && handPot > 0) return Math.max(serverPot, handPot);
    return serverPot > 0 ? serverPot : handPot;
  }, [betting?.pot, totalBySeat]);

  const hasPotentialSidePot =
    !!betting &&
    betting.players.some(
      (p) =>
        p.inHand &&
        !p.hasFolded &&
        p.stack === 0 &&
        ((p.totalContributed ?? 0) > 0 || (betting.pot ?? 0) > 0)
    );


    
 
  /* ───────────────── player-show-cards (single effect) ───────────────── */

  useEffect(() => {
    const m = (messages as any[]).slice(-1)[0];
    if (!m) return;

    if (m.type === "player-show-cards" && m.playerId && Array.isArray(m.cards)) {
      setRevealedHoles((prev) => ({
        ...prev,
        [String(m.playerId)]: m.cards.slice(0, 2),
      }));
    }
  }, [messages]);



  
  /* ───────────────── NEW PLAYER seat tagging ───────────────── */

  useEffect(() => {
    const prev = prevSeatsRef.current;
    const next = new Map<number, string | null>();

    seats.forEach((s) => {
      const currentPid = s.playerId ?? null;
      next.set(s.seatIndex, currentPid);

      const prevPid = prev.get(s.seatIndex) ?? null;

      if (handInProgress && currentPid && !prevPid) {
        setNewPlayerSeats((curr) => ({
          ...curr,
          [s.seatIndex]: Date.now(),
        }));
      }

      if (!currentPid && prevPid) {
        setNewPlayerSeats((curr) => {
          const copy = { ...curr };
          delete copy[s.seatIndex];
          return copy;
        });
      }
    });

    prevSeatsRef.current = next;
  }, [seats, handInProgress]);

  /* ───────────────── Cleanup seat action pills when seats empty ───────────────── */
useEffect(() => {
  // Build a set of currently occupied seatIndexes
  const occupied = new Set<number>();
  for (const s of seats) {
    if (s.playerId) occupied.add(s.seatIndex);
  }

  // Remove any lingering per-seat action badges for empty seats
  setSeatActionMap((prev) => {
    let changed = false;
    const next: Record<number, TableAction> = { ...prev };

    for (const k of Object.keys(next)) {
      const seatIdx = Number(k);
      if (!occupied.has(seatIdx)) {
        delete next[seatIdx];
        changed = true;
      }
    }

    return changed ? next : prev;
  });
}, [seats]);


  /* ───────────────── Chat ───────────────── */

  const [chatInput, setChatInput] = useState("");
  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendMessage({ type: "chat", text: trimmed });
    setChatInput("");
  };

  /* ───────────────── Buy-in / sit / stand ───────────────── */

  const [buyIn, setBuyIn] = useState<number>(DEFAULT_BUYIN);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [joinModeMidHand, setJoinModeMidHand] = useState(false);

  function handleSitOrStand() {
    if (heroSeat) {
      if (handInProgress) {
        pushLog(
          `${describeHero()} tries to stand, but a hand is in progress. You can stand up after this hand completes.`
        );
        return;
      }

      sendMessage({ type: "stand" });
pushLog(`${describeHero()} stands up.`);
// server returns stack to bankroll; seats-update will reflect it
return;

    }

    setJoinModeMidHand(handInProgress);
    setShowBuyIn(true);
  }

  function confirmSit() {
  const effBuyIn = Math.max(100, Math.floor(buyIn));

  // If bankroll is insufficient, in demo mode auto-topup then sit
  if (effBuyIn > heroBankroll) {
    if (!DEMO_ENABLED) {
      pushLog(`Not enough bankroll for ${effBuyIn.toLocaleString()} PGLD buy-in.`);
      return;
    }

    const TARGET = Math.max(DEMO_TARGET, effBuyIn);

    pushLog(
      `Bankroll is low. Topping up demo bankroll to ${TARGET.toLocaleString()} PGLD...`
    );

    // IMPORTANT: demo-topup should be { target } (no playerId) to match coordinator handler
    sendMessage({ type: "demo-topup", target: TARGET });

    // Give the coordinator a moment to broadcast updated bankrolls, then sit
    setTimeout(() => {
      setShowBuyIn(false);

      if (joinModeMidHand && handInProgress) {
        setJoinedMidHand(true);
        pushLog(
          `${describeHero()} joins the table and will be dealt in next hand with ${effBuyIn} PGLD chips.`
        );
      } else {
        pushLog(`${describeHero()} sits down with ${effBuyIn} PGLD chips.`);
      }

      // keep sit payload consistent with your current server contract
      sendMessage({
  type: "sit",
  handle: (profile?.handle ?? "").trim(), // ✅ REQUIRED identity
  name: (profile?.name ?? "").trim(),     // optional, can be blank
  buyIn: effBuyIn,
} as any);

    }, 450);

    return;
  }

  // Normal sit path
  setShowBuyIn(false);

  if (joinModeMidHand && handInProgress) {
    setJoinedMidHand(true);
    pushLog(
      `${describeHero()} joins the table and will be dealt in next hand with ${effBuyIn} PGLD chips.`
    );
  } else {
    pushLog(`${describeHero()} sits down with ${effBuyIn} PGLD chips.`);
  }

  sendMessage({
  type: "sit",
  handle: (profile?.handle ?? "").trim(),
  name: (profile?.name ?? "").trim(),
  buyIn: effBuyIn,
} as any);


}


  

  /* ───────────────── Demo bankroll / refill ───────────────── */

function handleReloadDemoBankroll() {
  const TARGET = 5000;

  // DEMO mode: keep existing WS top-up behavior
  if (IS_DEMO) {
    sendMessage({ type: "demo-topup", target: TARGET });
    pushLog(`Requested demo bankroll top-up to ${TARGET.toLocaleString()} PGLD.`);
    return;
  }

  // LIVE: until poker bankroll is fully wired to Supabase, keep this as a no-op
  // (prevents confusing "nothing happened" logs / wrong local state).
  pushLog("Demo top-up is disabled in live mode (bankroll is server-backed).");
}

function handleRefillStack(amount: number) {
  if (!heroSeat) return;

  if (handInProgress) {
    pushLog("You can only refill between hands.");
    return;
  }

  const amt = Math.max(0, Math.floor(amount));
  if (amt <= 0) return;

  // DEMO: enforce bankroll check locally
  if (IS_DEMO) {
    if (heroBankroll < amt) {
      pushLog(`Not enough bankroll to refill ${amt} PGLD.`);
      return;
    }

    pushLog(`${describeHero()} refills stack by ${amt} PGLD.`);
    sendMessage({ type: "refill-stack", amount: amt });
    return;
  }

  // LIVE: don't block on heroBankroll until it's synced to Supabase/WS
  // Let the server/coordinator validate.
  pushLog(`${describeHero()} requests refill stack by ${amt} PGLD.`);
  sendMessage({ type: "refill-stack", amount: amt });
}


  /* ───────────────── Hero actions ───────────────── */

  function handleFold() {
    if (!isHeroTurn) return;
    pushLog(`${describeHero()} folds.`);
    sendMessage({ type: "action", action: "fold" });
  }

  function handlePrimaryAction() {
    if (!isHeroTurn) return;
    let primaryActionMode: "check" | "call" = "check";
    if (betting && heroBetting) {
      const diff = betting.maxCommitted - heroBetting.committed;
      if (diff > 0) primaryActionMode = "call";
    }
    pushLog(`${describeHero()} ${primaryActionMode === "call" ? "calls" : "checks"}.`);
    sendMessage({ type: "action", action: primaryActionMode });
  }

  const [raiseSize, setRaiseSize] = useState<number>(0);
  const [manualBet, setManualBet] = useState<string>("");

  function handleBet() {
    if (!isHeroTurn || !betting || !heroBetting) return;

    const alreadyCommitted = heroBetting.committed ?? 0;
    const stack = heroBetting.stack ?? 0;
    if (stack <= 0) return;

    const callNeeded = Math.max(0, betting.maxCommitted - alreadyCommitted);
    const minRaise = betting.bigBlind * 2;

    let raiseDelta =
      manualBet.trim().length > 0
        ? Number(manualBet)
        : raiseSize > 0
        ? raiseSize
        : minRaise;

    if (!Number.isFinite(raiseDelta) || raiseDelta <= 0) raiseDelta = minRaise;
    raiseDelta = Math.max(minRaise, Math.floor(raiseDelta));

    let totalSpend = callNeeded + raiseDelta;
    if (totalSpend > stack) totalSpend = stack;
    if (totalSpend <= 0) return;

    pushLog(`${describeHero()} bets ${totalSpend} PGLD (call ${callNeeded}, raise ${raiseDelta}).`);
    sendMessage({ type: "action", action: "bet", amount: totalSpend });
    setManualBet("");
  }

  function handleAllIn() {
    if (!isHeroTurn || !betting || !heroBetting) return;
    const allInRaise = heroBetting.stack;
    setRaiseSize(allInRaise);
    setManualBet(String(allInRaise));
    pushLog(`${describeHero()} moves all-in.`);
    sendMessage({ type: "action", action: "bet", amount: allInRaise });
  }

  function handleManualDeal() {
    if (!isHostClient) return;
    pushLog("Host starts the game.");
    sendMessage({ type: "start-hand" });
  }

  /* ───────────────── Timer system ───────────────── */

  const ACTION_BASE_MS = 30_000;
  const ACTION_EXTRA_MS = 20_000;
  const PAUSE_MS = 60_000; // pick 10s / 15s / 60s
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  

  const [actionPhase, setActionPhase] = useState<ActionPhase>(null);
  const [actionDeadline, setActionDeadline] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const lastActionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const TIME_BANK_SECONDS = 30;
  const [timeBankUsed, setTimeBankUsed] = useState(false);

  function handleUseTimeBank() {
    if (!isHeroTurn || !actionDeadline || timeBankUsed) return;
    const extended = actionDeadline + TIME_BANK_SECONDS * 1000;
    setTimeBankUsed(true);
    setActionDeadline(extended);
    pushLog(`${describeHero()} uses time bank (+${TIME_BANK_SECONDS}s).`);
  }

  useEffect(() => {
    if (!betting) return;
    setTimeBankUsed(false);
  }, [betting?.handId, betting?.street, betting?.currentSeatIndex]);

  useEffect(() => {
  if (!betting || betting.street === "done" || betting.currentSeatIndex == null) {
    setActionDeadline(null);
    setActionPhase(null);
    lastActionKeyRef.current = null;
    return;
  }

  const key = `${betting.handId}-${betting.street}-${betting.currentSeatIndex}`;
  if (lastActionKeyRef.current !== key) {
    lastActionKeyRef.current = key;
    setActionPhase("base");
    setActionDeadline(Date.now() + ACTION_BASE_MS);
  }
}, [betting?.handId, betting?.street, betting?.currentSeatIndex]);


  useEffect(() => {
    if (!actionDeadline || !actionPhase) return;

    const isExpired = now >= actionDeadline;

    if (actionPhase === "base" && isExpired) {
      setActionPhase("extra");
      setActionDeadline(Date.now() + ACTION_EXTRA_MS);
      if (isHeroTurn) pushLog(`${describeHero()} last chance to act!`);
      return;
    }

    if (actionPhase === "extra" && isExpired) {
      if (isHeroTurn) {
        handleFold();
        pushLog(`${describeHero()} auto-folded (timer).`);
      }
      setActionDeadline(null);
      setActionPhase(null);
    }
  }, [now, actionDeadline, actionPhase, isHeroTurn, pushLog]);

  const actionRemainingMs = useMemo(() => {
    if (!actionDeadline) return null;
    const diff = actionDeadline - now;
    return diff > 0 ? diff : 0;
  }, [actionDeadline, now]);

  const totalWindowMs = actionPhase === "extra" ? ACTION_EXTRA_MS : ACTION_BASE_MS;

  const actionSeconds = actionRemainingMs ? Math.ceil(actionRemainingMs / 1000) : null;

  const actionPct = actionRemainingMs
    ? Math.max(0, Math.min(100, (actionRemainingMs / totalWindowMs) * 100))
    : 0;

const [pauseUntil, setPauseUntil] = useState<number | null>(null);
const isPaused = pauseUntil != null && now < pauseUntil;
const pauseRemainingSec = isPaused ? Math.max(0, Math.ceil((pauseUntil! - now) / 1000)) : 0;

useEffect(() => {
  const m = (messages as any[]).slice(-1)[0];
  if (!m) return;

  if (m.type === "game-paused" && typeof m.until === "number") {
    setPauseUntil(m.until);
  }
  if (m.type === "game-resumed") {
    setPauseUntil(null);
  }
}, [messages]);

const [dealHeld, setDealHeld] = useState(false)
const [dealHeldBy, setDealHeldBy] = useState<string | null>(null)



    // ───────────────── Action display state ─────────────────

type ActionKind = "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN" | "FOLD";

type TableAction = {
  id: string;
  seatIndex: number;
  label: string;
  kind: ActionKind;
  ts: number;
};


const [recentActions, setRecentActions] = useState<TableAction[]>([]);
const [seatActionMap, setSeatActionMap] = useState<Record<number, TableAction>>(
  {}
);

const ACTION_TICKER_MS = 3800; // top-center ticker
const ACTION_SEAT_MS = 3800;   // per-seat badge lifespan

useEffect(() => {
  const last = messages[messages.length - 1]
  if (!last) return

  if (last?.type === "deal-hold-state") {
    setDealHeld(Boolean(last.dealHeld))
    setDealHeldBy(typeof last.dealHeldBy === "string" ? last.dealHeldBy : null)
  }
}, [messages])



// Track previous betting to infer actions when turn advances
const prevBettingRef = useRef<BettingState | null>(null);

useEffect(() => {
  if (!betting) {
    prevBettingRef.current = null;
    return;
  }

  // baseline
  if (!prevBettingRef.current) {
    prevBettingRef.current = betting;
    return;
  }

  const prev = prevBettingRef.current;
  prevBettingRef.current = betting;

  // if the acting seat didn't change, no completed action to announce
  if (prev.currentSeatIndex === betting.currentSeatIndex) return;

  const actedSeatIndex = prev.currentSeatIndex;
  if (actedSeatIndex == null) return;

  const prevP = prev.players.find((p) => p.seatIndex === actedSeatIndex);
  const nextP = betting.players.find((p) => p.seatIndex === actedSeatIndex);
  if (!prevP || !nextP) return;

    let label: string | null = null;
  let kind: ActionKind | null = null;

  // FOLD
  if (!prevP.hasFolded && nextP.hasFolded) {
    label = "folds";
    kind = "FOLD";
  } else {
    const prevCommitted = prevP.committed ?? 0;
    const nextCommitted = nextP.committed ?? 0;
    const delta = nextCommitted - prevCommitted;

    const prevMax = prev.maxCommitted ?? 0;
    const nextMax = betting.maxCommitted ?? 0;

    if (delta === 0) {
      label = "checks";
      kind = "CHECK";
    } else if (nextMax > prevMax) {
      // bet or raise
      if (prevMax === 0) {
        label = `bets ${nextMax}`;
        kind = "BET";
      } else {
        label = `raises to ${nextMax}`;
        kind = "RAISE";
      }
    } else {
      label = `calls ${delta}`;
      kind = "CALL";
    }
  }

  // Optional: detect all-in (if your server sets stack to 0 after action)
  if (kind && nextP.stack === 0 && (kind === "BET" || kind === "RAISE" || kind === "CALL")) {
    // only if they actually put money in
    if ((nextP.committed ?? 0) > (prevP.committed ?? 0)) {
      kind = "ALL_IN";
      // keep label readable
      if (!label?.toLowerCase().includes("all")) label = `${label} (all-in)`;
    }
  }

  if (!label || !kind) return;

  const action: TableAction = {
    id: `${actedSeatIndex}-${Date.now()}`,
    seatIndex: actedSeatIndex,
    label,
    kind,
    ts: Date.now(),
  };


  // GLOBAL ticker (keep last 3 visible)
  setRecentActions((arr) => [...arr.slice(-2), action]);

  // PER-SEAT badge
  setSeatActionMap((map) => ({
    ...map,
    [actedSeatIndex]: action,
  }));

  const t1 = window.setTimeout(() => {
  setRecentActions((arr) => arr.filter((a) => a.id !== action.id));
}, ACTION_TICKER_MS);

const t2 = window.setTimeout(() => {
  setSeatActionMap((map) => {
    const copy = { ...map };
    if (copy[actedSeatIndex]?.id === action.id) delete copy[actedSeatIndex];
    return copy;
  });
}, ACTION_SEAT_MS);

return () => {
  window.clearTimeout(t1);
  window.clearTimeout(t2);
};

}, [betting]);


  /* ───────────────── Auto-check / auto-fold / sit-out ───────────────── */

  const [autoCheck, setAutoCheck] = useState(false);
  const [autoFoldFlag, setAutoFoldFlag] = useState(false);
  const [isSittingOut, setIsSittingOut] = useState(false);

  useEffect(() => {
    if (!isHeroTurn || !betting || !heroBetting) return;

    const diff = betting.maxCommitted - heroBetting.committed;

    if (autoFoldFlag && diff > 0) {
      handleFold();
      setAutoFoldFlag(false);
      return;
    }

    if (autoCheck && diff === 0) handlePrimaryAction();
  }, [isHeroTurn, betting, heroBetting, autoCheck, autoFoldFlag]);

  useEffect(() => {
    if (!isSittingOut || !isHeroTurn) return;
    handleFold();
  }, [isSittingOut, isHeroTurn]);

  /* ───────────────── Primary action label ───────────────── */

  let primaryActionLabel = "Check";
  if (betting && heroBetting) {
    const diff = betting.maxCommitted - heroBetting.committed;
    if (diff > 0) primaryActionLabel = `Call ${diff}`;
  }

  const heroCallDiff =
  betting && heroBetting ? Math.max(0, betting.maxCommitted - heroBetting.committed) : 0;

const quickPrimaryLabel = heroCallDiff > 0 ? `Call ${heroCallDiff}` : "Check";


  /* ───────────────── Layout helpers ───────────────── */

  const HERO_CENTER_VIEW = true;

  const [isMobile, setIsMobile] = useState(false);

  // PC: after hero -> directly LEFT of hero slot, then directly RIGHT, then far-left, then sides, then top
  const SLOT_FILL_PC = [0, 2, 3, 1, 7, 8, 4, 6, 5];

  // Mobile: after hero -> bottom-left, bottom-right, then alternate left/right arcs upward
  const SLOT_FILL_MOBILE = [0, 1, 2, 3, 6, 4, 7, 5, 8];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq: MediaQueryList = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }

    (mq as any).addListener(apply);
    return () => (mq as any).removeListener(apply);
  }, []);

  const ACTIVE_SLOT_FILL = isMobile ? SLOT_FILL_MOBILE : SLOT_FILL_PC;
  const ACTIVE_GEOMETRY = isMobile ? SEAT_GEOMETRY_MOBILE : SEAT_GEOMETRY_PC;

  const winnerSeatKeys = useMemo(() => {
    const set = new Set<string>();
    if (!showdown || !table) return set;
    if (showdown.handId !== table.handId) return set;
    if (!Array.isArray(showdown.players)) return set;

    showdown.players.forEach((p) => {
      if (p.isWinner) set.add(`${p.seatIndex}:${p.playerId}`);
    });
    return set;
  }, [showdown, table]);


  useEffect(() => {
  if (!isMobile) return;
  if (!isHeroTurn) {
    setShowMobileTools(false);
    setShowMobileAdvanced(false);
  }
}, [isMobile, isHeroTurn]);

  

  /* ───────────────── Header / panels ───────────────── */

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

  const tableIdle =
    seatedCount >= MIN_PLAYERS_TO_START &&
    !!heroSeat &&
    isHostClient &&
    (!betting || betting.street === "done");

  /* ───────────────── JSX ───────────────── */

  return (
    <>
      <div className={isFullscreen ? "space-y-0 pb-0 md:pb-0" : "space-y-6 pb-8 md:pb-4"}>
        <section className={"space-y-0"}>
          <div
            className={[
              "relative flex flex-col rounded-3xl border border-[#FFD700]/40",
              "bg-gradient-to-b from-black via-[#020617] to-black",
              "shadow-[0_0_50px_rgba(0,0,0,0.9)]",
              "p-4 md:p-6",
              "space-y-3",
              "overflow-hidden md:overflow-visible",
            ].join(" ")}
          >
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="absolute right-2 top-2 z-50 rounded-full bg-black/90 border border-[#FFD700] px-3 py-1.5 text-[11px] font-semibold text-[#FFD700] shadow-[0_0_20px_rgba(0,0,0,0.9)]"
              >
                Exit fullscreen ✕
              </button>
            )}

            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0ea5e9]/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
            </div>

            {!isFullscreen && (
              <>
                <div className="mb-2 md:mb-3">
                  <div
                    className={[
                      "rounded-2xl border border-white/15 bg-black/55 backdrop-blur",
                      "px-3 py-2 md:px-5 md:py-3",
                      "shadow-[0_0_18px_rgba(0,0,0,0.65)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-white/55 leading-tight">
                          Base Gold Rush • Hold’em
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 min-w-0">
                          <div className="truncate text-[12px] md:text-base font-extrabold text-white/90">
  {tableName || roomId}
</div>


                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-[1px] text-[10px] md:text-[11px] font-bold text-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            LIVE
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="rounded-xl border border-white/15 bg-black/50 px-2 py-[5px] text-[10px] md:text-[11px] font-bold text-white/80 hover:bg-black/70"
                        >
                          Copy ID
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFullscreen((v) => !v)}
                          className="rounded-xl border border-[#FFD700]/25 bg-black/50 px-2 py-[5px] text-[10px] md:text-[11px] font-bold text-[#FFD700]/90 hover:bg-black/70"
                        >
                          Fullscreen
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-black/50 px-2.5 py-[6px] text-[10px] md:text-[11px] font-semibold text-white/75">
                        {seatedCount}/9 seated
                      </span>

                      <button
                        type="button"
                        onClick={() => setOpenPanels((v) => !v)}
                        className="inline-flex items-center rounded-full border border-white/15 bg-black/50 px-2.5 py-[6px] text-[10px] md:text-[11px] font-semibold text-white/80 hover:bg-black/70"
                      >
                        {openPanels ? "Hide Load" : "Load"}
                      </button>

                      <span className="inline-flex items-center rounded-full border border-[#FFD700]/25 bg-black/50 px-2.5 py-[6px] text-[10px] md:text-[11px] font-semibold text-white/75">
                        BR
                        <span className="ml-2 font-mono font-extrabold text-[#FFD700]">
  {heroBankroll.toLocaleString()}
</span>
<span className="ml-1 text-white/55">PGLD</span>

                      </span>
                    </div>
                  </div>
                </div>

                {openPanels && (
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-black/70 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                            Player Profile
                          </div>
                          <div className="text-[11px] text-white/50">
                            Name + avatar at table
                          </div>
                        </div>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-black shadow-[0_0_16px_rgba(250,204,21,0.7)]"
                          style={{ backgroundColor: profile?.avatarColor ?? "#facc15" }}
                        >
                          {initials.slice(0, 3).toUpperCase()}
                        </div>
                      </div>

                      <div className="mt-2 text-[12px] font-semibold text-white/80">
                        {profile?.name?.trim()?.length ? profile.name : "Unnamed Player"}
                      </div>

                      <div className="mt-1 text-[10px] text-white/45">
                        Edit your name & avatar on the profile page before joining.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-black/70 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                          PGLD Chips
                        </div>
                        <div className="text-[12px] font-semibold text-white/80">
                          BR{" "}
                          <span className="font-mono text-[#FFD700]">
  {heroBankroll.toLocaleString()}
</span>

                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleReloadDemoBankroll}
                          className="rounded-full border border-[#FFD700]/70 bg-black/70 px-3 py-1 text-[10px] font-semibold text-[#FFD700] hover:bg-[#111827]"
                        >
                          Reload demo bankroll (5,000)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRefillStack(500)}
                          disabled={!heroSeat || handInProgress}
                          className="rounded-full border border-emerald-400/60 bg-black/70 px-3 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-[#111827] disabled:opacity-40"
                        >
                          Refill stack +500
                        </button>
                      </div>

                      <div className="mt-1 text-[10px] text-white/45">
                        Refill only works between hands.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className={isFullscreen ? "flex-1 flex w-full items-center justify-center" : ""}>
              <div
                className={
                  isFullscreen
                    ? "relative mx-auto mt-1 w-full max-w-[1320px] h-[82vh] [perspective:1800px]"
                    : "relative mx-auto mt-2 w-full max-w-[1320px] h-[72vh] [perspective:1800px]"
                }
              >
                <div className="absolute inset-0 [transform:rotateX(18deg)] [transform-style:preserve-3d]">
                  <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_top,#4b2f1a_0,#2b1a0d_52%,#050509_100%)] shadow-[0_26px_90px_rgba(0,0,0,1)]">
                    <div className="absolute inset-x-[14%] top-[6%] h-5 rounded-full bg-gradient-to-b from-white/18 to-transparent blur-md opacity-80" />
                  </div>

                 <div
  className={[
    "absolute inset-[4%] md:inset-[5%] origin-center rounded-[999px]",
   // Gold bumper + emerald inner border
"border border-[#FFD700]/55",
"shadow-[0_0_40px_rgba(250,204,21,0.14),0_0_90px_rgba(0,0,0,0.9)]",
"bg-[radial-gradient(circle_at_top,#15803d_0,#065f46_40%,#022c22_70%,#020617_100%)]",
"overflow-hidden",
].join(" ")}
>
  {/* (removed rail shimmer + inner rail edge) */}

  {/* Felt texture stays (static, subtle) */}
  <div className="pointer-events-none absolute inset-0 bg-[url('/felt/felt-texture.png')] mix-blend-soft-light opacity-[0.16]" />

  {/* Center logo */}
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="flex translate-y-1 flex-col items-center md:translate-y-0">
      <div className="mb-1 opacity-85">
        <Image
          src="/felt/bgrc-logo.png"
          alt="Base Gold Rush"
          width={160}
          height={160}
          className="mx-auto object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.6)]"
        />
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#FFD700]/90 md:text-[10px]">
        BASE GOLD POKER
      </div>
    </div>
  </div>

  {pot > 0 && (
    <div className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2 z-[60] flex flex-col items-center">
      {/* chips */}
      <div className="mb-2">
        <ChipStack amount={pot} size={34} maxChips={16} />
      </div>

      {isPaused && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl border border-red-400/40 bg-black/70 px-4 py-3 backdrop-blur shadow-[0_0_30px_rgba(0,0,0,0.85)]">
            <div className="text-[12px] md:text-[14px] font-black tracking-[0.22em] uppercase text-red-200 text-center">
              GAME PAUSED
            </div>
            <div className="mt-1 text-center font-mono text-[18px] md:text-[22px] font-extrabold text-white/90">
              {pauseRemainingSec}s
            </div>
            <div className="mt-1 text-center text-[10px] md:text-[11px] text-white/60">
              Resuming automatically…
            </div>
          </div>
        </div>
      )}



    {/* badge */}
    <div
      className={[
        "rounded-full bg-black/85 border border-[#FFD700]/50 px-5 py-1.5",
        "text-[12px] md:text-base font-extrabold text-[#FFD700]",
        "shadow-[0_0_18px_rgba(0,0,0,0.9)]",
        potPulse ? "pot-pulse" : "",
      ].join(" ")}
    >
      Pot {formatChips(pot)} <span className="opacity-70">PGLD</span>
    </div>
  </div>
)}



{/* GLOBAL ACTION TICKER (last 3) */}
{recentActions.length > 0 && (
  <div className="pointer-events-none absolute left-1/2 top-[5%] z-[65] w-[92%] max-w-[520px] -translate-x-1/2">
    <div className="flex flex-col items-center gap-1">
      {recentActions.map((a) => {
        const seatMeta = seats.find((s) => s.seatIndex === a.seatIndex);
        const name =
          seatMeta?.name?.trim() ||
          (seatMeta?.playerId ? `Seat ${a.seatIndex + 1}` : `Seat ${a.seatIndex + 1}`);

        const pill = getActionPillClasses(a.label);

        return (
          <div
            key={a.id}
            className={[
              "action-pill",
              "inline-flex items-center justify-center gap-2",
              "rounded-full border backdrop-blur",
              pill.bg,
              pill.border,
              pill.glow,
              // ✅ match pot class density (small + bold, mobile friendly)
              "px-3 py-[4px] md:px-4 md:py-[5px]",
              "text-[10px] md:text-[11px]",
              "font-black tracking-[0.08em] uppercase leading-none",
              "whitespace-nowrap",
              "max-w-full",
            ].join(" ")}
          >
            <span className="text-white/65 truncate max-w-[220px]">{name}</span>
            <span className={[pill.text, "truncate max-w-[240px]"].join(" ")}>
              {a.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
)}




                   <div className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 px-2 z-[40]">                      <div className="flex gap-1.5 md:gap-2">
                        {boardCards.map((c, i) => {
                          const tilts = [-3, 0, 0, 0, 3];
                          return (
                            <PokerCard
                              key={`${table?.handId ?? 0}-board-${i}-${c}`}
                              card={c}
                              delayIndex={i}
                              tilt={tilts[i]}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Confetti (hero wins) */}
{confettiKey != null && (
  <div className="pointer-events-none absolute inset-0 z-[80]">
    <ConfettiBurst triggerKey={confettiKey} durationMs={1400} />
  </div>
)}


                    {showdown && table && showdown.handId === table.handId && (
                     <div className="pointer-events-none absolute left-1/2 top-[3%] z-[75] flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] md:text-sm">                <div
                          className={[
                            "rounded-full bg-black/90 px-4 py-1.5 font-semibold",
                            "text-emerald-300 shadow-[0_0_18px_rgba(0,0,0,0.9)]",
                            "border border-emerald-400/70",
                          ].join(" ")}
                        >
                          Showdown • Pot {pot.toLocaleString()} PGLD
                        </div>

                        

                        {Array.isArray(showdown.players) &&
                          showdown.players
                            .filter((p) => p.isWinner)
                            .map((p) => (
                              <div
                                key={p.playerId + p.seatIndex}
                                className="rounded-full bg-black/85 px-3.5 py-1 text-[10px] md:text-[11px] text-amber-100 shadow shadow-black/80 border border-[#FFD700]/60"
                              >
                                Seat {p.seatIndex + 1} wins — {p.rankName}
                              </div>
                              
                            ))}
                      </div>
                    )}
                  </div>

                  

                 {/* SEATS */}
<div className="absolute inset-[2%] text-[10px] text-white/80 md:text-[11px]">
  {(() => {
    const N = 9;
    const seatByIndex = new Map<number, (typeof seats)[number]>();
    seats.forEach((s) => seatByIndex.set(s.seatIndex, s));

    const heroSeatIndex = heroSeat?.seatIndex ?? null;
    const slotToSeatIndex: Array<number | null> = Array(N).fill(null);

    if (HERO_CENTER_VIEW && heroSeatIndex !== null) {
      slotToSeatIndex[0] = heroSeatIndex;

      const order: number[] = [];
      for (let d = 1; d <= 4; d++) {
        const left = (heroSeatIndex - d + N) % N;
        const right = (heroSeatIndex + d) % N;
        order.push(left, right);
      }

      const occupied = order.filter((idx) => !!seatByIndex.get(idx)?.playerId);

      let k = 0;
      for (let fillPos = 1; fillPos < ACTIVE_SLOT_FILL.length; fillPos++) {
        const slot = ACTIVE_SLOT_FILL[fillPos];
        const seatIndex = occupied[k++];
        if (typeof seatIndex === "number") slotToSeatIndex[slot] = seatIndex;
      }
    } else {
      for (let i = 0; i < N; i++) slotToSeatIndex[i] = i;
    }

    return Array.from({ length: N }).map((_, slotIndex) => {
      const seatIndex = slotToSeatIndex[slotIndex];
      const seat =
        typeof seatIndex === "number" ? seatByIndex.get(seatIndex) : undefined;

      const isOccupied = !!seat?.playerId;
      const isHeroSeat = isOccupied && seat!.playerId === myId;


      const seatBetting = isOccupied
        ? betting?.players.find((p) => p.seatIndex === seat!.seatIndex)
        : undefined;

      const committed = isOccupied ? totalBySeat[seat!.seatIndex] ?? 0 : 0;

const seatAction = typeof seatIndex === "number" ? seatActionMap[seatIndex] : undefined;


      const stackAmount = isOccupied
        ? seatBetting?.stack ?? seat!.chips ?? 0
        : 0;

      const isInHand = !!seatBetting && seatBetting.inHand && !seatBetting.hasFolded;

      const isOut =
        !!seatBetting &&
        (seatBetting.hasFolded || !(seatBetting.inHand ?? false));

      const isCurrentTurn =
        isOccupied &&
        currentSeatIndex !== null &&
        betting?.street !== "done" &&
        currentSeatIndex === seat!.seatIndex;

      const isButton =
        isOccupied &&
        buttonSeatIndex !== null &&
        buttonSeatIndex === seat!.seatIndex;

      const sbSeatIndex =
        betting && typeof betting.smallBlindSeatIndex === "number"
          ? betting.smallBlindSeatIndex
          : null;

      const bbSeatIndex =
        betting && typeof betting.bigBlindSeatIndex === "number"
          ? betting.bigBlindSeatIndex
          : null;

      const isSmallBlindSeat =
        isOccupied &&
        sbSeatIndex !== null &&
        betting?.street === "preflop" &&
        sbSeatIndex === seat!.seatIndex;

      const isBigBlindSeat =
        isOccupied &&
        bbSeatIndex !== null &&
        betting?.street === "preflop" &&
        bbSeatIndex === seat!.seatIndex;

      const label = !isOccupied
        ? `Seat ${slotIndex + 1}`
        : seat!.name
        ? seat!.name
        : seat!.playerId
        ? seat!.playerId
        : `Seat ${seat!.seatIndex + 1}`;

        const fallbackAvatar =
  DEFAULT_AVATARS[(seat?.seatIndex ?? slotIndex) % DEFAULT_AVATARS.length];

      const winnerKey = isOccupied ? `${seat!.seatIndex}:${seat!.playerId ?? ""}` : "";
      const rawIsWinnerSeat = isOccupied ? winnerSeatKeys.has(winnerKey) : false;
      const isWinnerSeat = rawIsWinnerSeat && !(isHeroSeat && !handInProgress);

      let visibleCards: string[] | null = null;

      if (isHeroSeat && !handInProgress) {
        visibleCards = null;
      } else if (handInProgress && isHeroSeat && isInHand && heroHand?.length === 2) {
        visibleCards = heroHand;
      } else if (isOccupied) {
        const manual = revealedHoles[seat!.playerId!];
        if (betting?.street === "done" && manual?.length === 2 && !isHeroSeat) {
          visibleCards = manual;
        } else if (
          betting?.street === "done" &&
          showdown &&
          table &&
          showdown.handId === table.handId &&
          !isHeroSeat
        ) {
          const sdPlayer = showdown.players.find(
            (p) => p.seatIndex === seat!.seatIndex && p.playerId === seat!.playerId
          );
          if (sdPlayer?.holeCards?.length === 2) visibleCards = sdPlayer.holeCards;
        }
      }

      const stylePos: React.CSSProperties =
        ACTIVE_GEOMETRY[slotIndex] ?? ACTIVE_GEOMETRY[ACTIVE_GEOMETRY.length - 1];

      // MOBILE quick menu (hero seat only)
      const heroCallDiff =
        betting && heroBetting ? Math.max(0, betting.maxCommitted - heroBetting.committed) : 0;
      const quickPrimaryLabel = heroCallDiff > 0 ? `Call ${heroCallDiff}` : "Check";

      return (
        <div
          key={`slot-${slotIndex}`}
          className="absolute flex flex-col items-center gap-1"
          style={stylePos}
        >
          <div className="mb-0.5 flex gap-1">
            {isOccupied && isButton && (
              <div className="rounded-full bg-[#FFD700] px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                D
              </div>
            )}
            {isOccupied && isSmallBlindSeat && (
              <div className="rounded-full bg-sky-400 px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                SB
              </div>
            )}
            {isOccupied && isBigBlindSeat && (
              <div className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                BB
              </div>
            )}
          </div>

          {isOccupied && committed > 0 && (
  <div className="pointer-events-none flex flex-col items-center gap-1">
    <ChipStack amount={committed} size={30} maxChips={12} />
    <div className="rounded-full bg-black/85 border border-amber-300/60 px-3 py-[2px] text-[11px] md:text-[12px] font-extrabold text-amber-200 shadow shadow-black/80">
      BET {formatChips(committed)}
    </div>
  </div>
)}


          <div className="relative z-[10] flex flex-col items-center">
            {isOccupied && isWinnerSeat && (
              <div
                className="pointer-events-none absolute left-1/2 z-50 flex -translate-x-1/2 flex-col items-center winner-anim"
                style={{ top: -62 }}
              >
                <div className="winner-emoji-pop mb-1 text-[28px] md:text-[36px] drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]">
                  🏆
                </div>
                <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-[#F59E0B]/90 via-[#FCD34D]/95 to-[#F59E0B]/90 border border-[#7C2D12]/60 shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-[9px] md:text-[10px] font-bold text-black tracking-wide uppercase leading-none">
                  Winner
                </div>
              </div>
            )}

            {isOccupied &&
              !isWinnerSeat &&
              seatBetting?.hasFolded &&
              betting?.street !== "done" && (
                <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-800/95 px-2 py-[2px] text-[9px] font-bold text-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                  FOLDED
                </div>
              )}

             {/* PER-SEAT ACTION BADGE */}
{isOccupied && seatAction && (
  <div
    className={[
      "pointer-events-none absolute left-1/2 z-[80] -translate-x-1/2",
      "rounded-full border backdrop-blur",
      "shadow-[0_0_18px_rgba(0,0,0,0.92)]",
      // ✅ bigger pill sizing (mobile -> desktop)
      "px-3.5 py-[4px] sm:px-4 sm:py-[5px] md:px-5 md:py-[6px]",
      "text-[12px] sm:text-[13px] md:text-[15px]",
      "font-black tracking-[0.10em] uppercase leading-none whitespace-nowrap",
      // ✅ fancy pill feel
      "action-badge",
      // ✅ transition for action changes
      "transition-colors duration-150",
      // ✅ ACTION COLOR MAP (no crazy neon, readable)
      seatAction?.kind === "CHECK"
        ? "bg-emerald-500/15 border-emerald-300/50 text-emerald-100"
        : seatAction?.kind === "CALL"
        ? "bg-sky-500/15 border-sky-300/50 text-sky-100"
        : seatAction?.kind === "BET"
        ? "bg-amber-500/15 border-amber-300/55 text-amber-100"
        : seatAction?.kind === "RAISE"
        ? "bg-fuchsia-500/15 border-fuchsia-300/50 text-fuchsia-100"
        : seatAction?.kind === "ALL_IN"
        ? "bg-red-500/15 border-red-300/55 text-red-100"
        : seatAction?.kind === "FOLD"
        ? "bg-slate-600/30 border-white/20 text-white/80"
        : "bg-white/10 border-white/25 text-white",
    ].join(" ")}
    style={{ top: -30 }}
  >
    {/* ✅ subtle inner glow / shine */}
    <span
      className="absolute inset-0 rounded-full opacity-60"
      style={{
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.20), rgba(255,255,255,0.04) 45%, rgba(0,0,0,0) 70%)",
      }}
    />
    {/* ✅ thin inner ring */}
    <span className="absolute inset-0 rounded-full ring-1 ring-white/10" />

    {/* ✅ content */}
    <span className="relative">{seatAction.label}</span>
  </div>
)}



            {/* AVATAR (ring ONLY for non-hero seats so hero cards never get covered) */}
<div className="relative">
  {isOccupied && isCurrentTurn && actionSeconds !== null && !isHeroSeat && (
  <div className="pointer-events-none absolute inset-[-7px] z-[90]">
    {/* OUTER SPICED DONUT RING */}
    <div
      className="absolute inset-0 rounded-full hero-timer-ring hero-timer-ring-spice"
      style={{
        backgroundImage: `conic-gradient(${
          actionPhase === "extra"
            ? "rgba(248,113,113,0.95)"
            : "rgba(250,204,21,0.95)"
        } ${actionPct}%, rgba(255,255,255,0) 0)`,

        // donut thickness (bigger than before)
        WebkitMask:
          "radial-gradient(closest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))",
        mask:
          "radial-gradient(closest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))",

        filter:
          actionPhase === "extra"
            ? "drop-shadow(0 0 10px rgba(248,113,113,0.55)) drop-shadow(0 0 20px rgba(0,0,0,0.9))"
            : "drop-shadow(0 0 10px rgba(250,204,21,0.55)) drop-shadow(0 0 20px rgba(0,0,0,0.9))",
      }}
    />

    {/* INNER RAIL */}
    <div
      className="absolute inset-[6px] rounded-full hero-timer-ring-spice-inner"
      style={{
        WebkitMask:
          "radial-gradient(closest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
        mask:
          "radial-gradient(closest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
      }}
    />

    {/* ACT PILL INSIDE RING (bottom so it never covers cards) */}
    <div className="absolute left-1/2 bottom-[1px] -translate-x-1/2">
      <div
        className={[
          "rounded-full border px-2.5 py-[2px]",
          "text-[9px] md:text-[10px] font-black tracking-[0.18em] uppercase leading-none",
          "bg-black/75 backdrop-blur",
          actionPhase === "extra"
            ? "border-red-400/65 text-red-200"
            : "border-[#FACC15]/65 text-[#FACC15]",
          "shadow-[0_0_16px_rgba(0,0,0,0.9)]",
        ].join(" ")}
      >
        {actionPhase === "extra" ? "LAST" : "ACT"} {actionSeconds}s
      </div>
    </div>
  </div>
)}


  <button
    type="button"
    disabled
    className={[
      "relative z-0 flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-full overflow-hidden transition",
      isOccupied ? "bg-slate-900" : "bg-black/40",
      isOccupied && isCurrentTurn
        ? "seat-turn-glow border border-[#FACC15] shadow-[0_0_22px_rgba(250,204,21,0.85)]"
        : "border border-white/25 shadow-[0_0_10px_rgba(0,0,0,0.9)]",
      isWinnerSeat ? "winner-glow" : "",
      isOccupied && isOut ? "opacity-40" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {isOccupied ? (
      isHeroSeat && (profile as any)?.avatarUrl ? (
        <Image
          src={(profile as any).avatarUrl}
          alt="Avatar"
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={fallbackAvatar}
          alt="Avatar"
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
      )
    ) : (
      <div className="text-[10px] font-bold tracking-widest text-white/70">
        OPEN
      </div>
    )}
  </button>
</div>



           {isOccupied && (
  <div className="pointer-events-none absolute inset-0 z-20">
    {/* HOLE CARDS (top) */}
    <div className="absolute left-1/2 top-[6px] -translate-x-1/2 flex justify-center">
      {visibleCards && visibleCards.length === 2 ? (
        <div className="relative flex -space-x-4 md:-space-x-6">
          {visibleCards.map((c, i) => (
            <div
              key={`${table?.handId ?? 0}-seat-${seat!.seatIndex}-card-${i}-${c}`}
              className="relative"
              style={{
                transform: `translateY(0px) rotate(${i === 0 ? -10 : 10}deg)`,
                transformOrigin: "50% 80%",
              }}
            >
              <PokerCard card={c} highlight={isWinnerSeat} />
            </div>
          ))}
        </div>
      ) : isInHand && handInProgress ? (
        <div className="relative flex -space-x-5 md:-space-x-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="relative"
              style={{
                transform: `translateY(0px) rotate(${i === 0 ? -10 : 10}deg)`,
                transformOrigin: "50% 80%",
              }}
            >
              <PokerCard
  card={"As"}
  isBack={true}
  highlight={false}
  size={!isHeroSeat && isMobile ? "small" : "normal"}
  tilt={0}
/>

            </div>
          ))}
        </div>
      ) : null}
    </div>

   {/* STACK + NAME PILL (bottom) — mobile-safe: smaller + BELOW cards */}
<div className="absolute left-1/2 bottom-[-10px] md:bottom-[3px] -translate-x-1/2 flex justify-center">
  <div
    className={[
      "pointer-events-auto flex flex-col items-center",
      "rounded-lg md:rounded-2xl",
      "bg-gradient-to-r from-black/82 via-[#0b1220]/88 to-black/82",
      "border border-[#FACC15]/45 md:border-[#FACC15]/55",
      "shadow-[0_0_10px_rgba(0,0,0,0.9)]",
      // tighter mobile sizing
      "px-1.5 py-[2px] md:px-2 md:py-[2px]",
      "w-[80px] md:w-auto md:min-w-[108px] md:max-w-[140px]",
    ].join(" ")}
  >
    <div className="rounded-full bg-black/65 px-1.5 md:px-2 py-[1px] text-[10px] md:text-[13px] text-[#FACC15] font-mono leading-tight shadow shadow-black/60">
      {formatChips(stackAmount)} PGLD
    </div>

    <div className="mt-[1px] max-w-[76px] md:max-w-[112px] truncate text-[9px] md:text-[11px] text-white/85 leading-tight">
  {(() => {
    const seatHandle = ((seat as any)?.handle ?? "").trim()
    const heroHandle = (profile?.handle ?? "").trim()
    const nick = (seat?.name ?? "").trim()

    // ✅ Global rule:
    // 1) seat.handle (everyone)
    // 2) hero profile.handle (if seat not yet populated)
    // 3) optional nick
    // 4) Seat N
    return (
      seatHandle ||
      (isHeroSeat ? (heroHandle ? (heroHandle.startsWith("@") ? heroHandle : `@${heroHandle}`) : "") : "") ||
      nick ||
      `Seat ${seat?.seatIndex != null ? seat.seatIndex + 1 : ""}`
    )
  })()}
</div>

  </div>
</div>


  </div>
)}


            {isOccupied &&
              !isInHand &&
              !seatBetting?.hasFolded &&
              betting &&
              betting.street !== "done" && (
                <div className="mt-1 rounded-full bg-black/80 px-2 py-[1px] text-[9px] text-white/75 border border-white/25 shadow shadow-black/60">
                  Waiting for next hand
                </div>
              )}
          </div>
        </div>
      );
    });
  })()}
</div>

                </div>
              </div>
            </div>
{/* HERO ACTION BAR */}
<div
  className={[
    "mt-2 mb-2 flex w-full justify-center",
    isFullscreen ? "max-w-[1100px] mx-auto" : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
  <div
    className={[
     "antialiased w-full max-w-[660px] rounded-2xl border border-white/15 bg-black/85 px-4 py-2 md:px-5 md:py-2",
      "text-[12px] text-white/85 font-semibold shadow-[0_0_18px_rgba(0,0,0,0.75)]",
      "transition-all duration-300 ease-out transform hero-bar-slide",
      heroHasAction && isHeroTurn
        ? "translate-y-0 opacity-100 scale-100"
        : "translate-y-1 opacity-95 scale-[0.99] md:translate-y-0",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {/* ───────────────── TOP ACTIONS (closest to table) ───────────────── */}
    {isHeroTurn && betting && heroBetting && (
      <div className="mt-0 mb-1.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePrimaryAction}
            disabled={!isHeroTurn}
            className="rounded-xl bg-slate-800 px-4 py-2.5 md:py-3 text-[13px] font-semibold text-white hover:bg-slate-600 hover:shadow-[0_0_10px_rgba(255,255,255,0.25)] disabled:opacity-40"
          >
            {primaryActionLabel}
          </button>

          <button
            onClick={handleBet}
            disabled={!isHeroTurn || !betting || !heroBetting}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 md:py-3 text-[13px] font-semibold text-black hover:bg-emerald-400 hover:shadow-[0_0_10px_rgba(0,255,100,0.35)] disabled:opacity-40"
          >
            {(() => {
              if (!betting || !heroBetting) return "Bet";
              const callNeeded = Math.max(0, betting.maxCommitted - heroBetting.committed);
              const minRaise = betting.bigBlind * 2;
              const rawRaise =
                manualBet.trim().length > 0
                  ? Number(manualBet)
                  : raiseSize > 0
                  ? raiseSize
                  : minRaise;

              const raiseDelta = Math.max(
                minRaise,
                Number.isFinite(rawRaise) && rawRaise > 0 ? Math.floor(rawRaise) : minRaise
              );

              const total = callNeeded + raiseDelta;
              return `Bet ${total}`;
            })()}{" "}
            <span className="opacity-70">PGLD</span>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={handleFold}
            disabled={!isHeroTurn}
            className="rounded-lg bg-red-500/75 px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-red-400 hover:shadow-[0_0_10px_rgba(255,80,80,0.35)] disabled:opacity-40"
          >
            Fold
          </button>

          <button
            type="button"
            onClick={handleAllIn}
            disabled={!isHeroTurn || !heroBetting}
            className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-[12px] font-semibold text-red-200 border border-red-400/40 hover:bg-slate-800 disabled:opacity-40"
          >
            All-in
          </button>
        </div>
      </div>
    )}

    {/* ──────────────── QUICK ROW (sit/stand + show cards) ─────────────── */}
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <button
        onClick={handleSitOrStand}
        disabled={!ready || (!!heroSeat && handInProgress)}
        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
      >
        {heroSeat ? "Stand up" : "Sit at table"}
      </button>

      {(() => {
        const canShowCards =
          !!heroSeat &&
          !!heroHand &&
          heroHand.length === 2 &&
          !!betting &&
          betting.street === "done" &&
          !!showdown &&
          !!table &&
          showdown.handId === table.handId;

        if (!canShowCards) return null;

        return (
          <button
            type="button"
            onClick={() => sendMessage({ type: "show-cards" })}
            className="rounded-xl border border-[#FFD700]/45 bg-black/55 px-3 py-2 text-[12px] font-semibold text-[#FFD700] hover:bg-black/70"
          >
            Show cards
          </button>
        );
      })()}
    </div>

    {/* ───────────────── EXISTING TOP ROW (name/bankroll/tools) ───────────────── */}
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1 truncate">
  <div className="truncate text-white text-[14px] font-semibold leading-tight">
    {describeHero()}
  </div>

  {/* Hand helper ABOVE bankroll (desktop only; keeps mobile tight) */}
  {heroHandHelper &&
  betting &&
  betting.street !== "preflop" &&
  table &&
  table.board.length >= 3 && (
    <div className="mt-1 flex items-center gap-2">
      <span
        className={[
          "truncate font-semibold",
          isMobile ? "text-[11px]" : "text-[13px] md:text-[14px]",
          heroHandHelper.category >= 6
            ? "text-emerald-300"
            : heroHandHelper.category >= 4
            ? "text-sky-300"
            : heroHandHelper.category >= 2
            ? "text-amber-200"
            : "text-white/70",
        ].join(" ")}
      >
        {heroHandHelper.label}
      </span>
    </div>
  )}


  {/* Bankroll row */}
  <div className="mt-[2px] flex flex-wrap items-center gap-1 text-[11px] text-white/75">
    {heroBetting && (
      <span className="rounded-full bg-black/50 px-2 py-[1px] border border-white/15">
        Stack{" "}
        <span className="font-mono text-[#FFD700]">
          {heroBetting.stack} PGLD
        </span>
      </span>
    )}

    <span className="ml-2 font-mono font-extrabold text-[#FFD700]">
      {heroBankroll.toLocaleString()}
    </span>
    <span className="ml-1 text-white/55">PGLD</span>
    <span className="ml-2 text-emerald-200/90 font-mono">
      {formatUsdFromPgld(heroBankroll)}
    </span>

    {isSittingOut && (
      <span className="rounded-full bg-amber-500/10 px-2 py-[1px] border border-amber-400/50 text-amber-200">
        Sitting out
      </span>
    )}
  </div>
</div>


      {/* Right side */}
      {isMobile ? (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {isHeroTurn && actionSeconds !== null && (
              <span
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 font-mono text-[12px] font-extrabold tracking-wide",
                  "timer-neon",
                  actionPhase === "extra"
                    ? "border border-red-500/60 text-red-200 bg-red-600/25"
                    : "border border-[#FFD700]/70 text-[#FFD700] bg-[#2a2a2a]/55",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {actionPhase === "extra" ? "LAST" : "ACT"} {actionSeconds}s
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowMobileTools((v) => !v)}
              className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-semibold text-white/85 hover:bg-black/75"
            >
              {showMobileTools ? "Close" : "Tools"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1.5 max-w-[190px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRefillStack(500)}
              disabled={!heroSeat || handInProgress}
              className="rounded-full border border-emerald-400/50 bg-black/60 px-3 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-black/75 disabled:opacity-40"
            >
              Refill +500
            </button>

            {isHostClient && (
              <button
                type="button"
                onClick={() => setShowHostPanel((v: boolean) => !v)}
                className="rounded-full border border-amber-300/40 bg-black/60 px-3 py-1 text-[10px] font-semibold text-amber-200 hover:bg-black/75"
              >
                Host {showHostPanel ? "▾" : "▸"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isHeroTurn && actionSeconds !== null && (
              <span
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 font-mono text-[12px] font-extrabold tracking-wide",
                  "timer-neon",
                  actionPhase === "extra"
                    ? "border border-red-500/60 text-red-200 bg-red-600/25"
                    : "border border-[#FFD700]/70 text-[#FFD700] bg-[#2a2a2a]/55",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {actionPhase === "extra" ? "LAST" : "ACT"} {actionSeconds}s
              </span>
            )}

            <button
              type="button"
              onClick={handleUseTimeBank}
              disabled={!isHeroTurn || !actionDeadline || timeBankUsed}
              className="rounded-full border border-sky-400/45 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-sky-200 hover:bg-black/75 disabled:opacity-40"
            >
              {timeBankUsed ? "Used" : `+${TIME_BANK_SECONDS}s`}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Status row */}
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="flex-1 text-[11px] text-white/65">
        {!betting || betting.street === "done"
          ? showdown && table && showdown.handId === table.handId
            ? "Hand complete. Showdown on the felt."
            : "Waiting for next hand…"
          : !heroSeat || !heroBetting
          ? "Sit to join the action."
          : !heroIsInHand
          ? "Seated. Wait for next hand."
          : isSittingOut
          ? "You are sitting out."
          : !isHeroTurn
          ? "Waiting for other players…"
          : "Your turn."}
      </span>

      {!isMobile && (
        <button
          type="button"
          onClick={() => setIsSittingOut((v: boolean) => !v)}
          disabled={!heroSeat}
          className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-semibold text-white/80 hover:border-[#FFD700]/60 disabled:opacity-40"
        >
          {isSittingOut ? "Sit in" : "Sit out"}
        </button>
      )}
    </div>

    {/* Mobile Tools drawer */}
    {isMobile && showMobileTools && (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleRefillStack(500)}
          disabled={!heroSeat || handInProgress}
          className="rounded-xl border border-emerald-400/40 bg-black/60 px-3 py-2 text-[11px] font-semibold text-emerald-200 disabled:opacity-40"
        >
          Refill +500
        </button>

        <button
          type="button"
          onClick={handleUseTimeBank}
          disabled={!isHeroTurn || !actionDeadline || timeBankUsed}
          className="rounded-xl border border-sky-400/40 bg-black/60 px-3 py-2 text-[11px] font-semibold text-sky-200 disabled:opacity-40"
        >
          {timeBankUsed ? "Time Used" : `+${TIME_BANK_SECONDS}s`}
        </button>

        <button
          type="button"
          onClick={() => setIsSittingOut((v: boolean) => !v)}
          disabled={!heroSeat}
          className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-semibold text-white/85 disabled:opacity-40"
        >
          {isSittingOut ? "Sit in" : "Sit out"}
        </button>

        {isHostClient ? (
          <button
            type="button"
            onClick={() => setShowHostPanel((v: boolean) => !v)}
            className="rounded-xl border border-amber-300/35 bg-black/60 px-3 py-2 text-[11px] font-semibold text-amber-200"
          >
            Host {showHostPanel ? "▾" : "▸"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowMobileAdvanced((v) => !v)}
            className="rounded-xl border border-[#FFD700]/30 bg-black/60 px-3 py-2 text-[11px] font-semibold text-[#FFD700]"
          >
            {showMobileAdvanced ? "Hide" : "Advanced"}
          </button>
        )}
      </div>
    )}

    {/* Raise controls: desktop always; mobile only when Advanced */}
    {isHeroTurn && betting && heroBetting && (!isMobile || showMobileAdvanced) && (
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            Raise
          </span>
          <span className="rounded-full border border-white/15 bg-black/55 px-2 py-[2px] text-[11px] font-mono text-[#FFD700]">
            {manualBet.trim() !== ""
              ? manualBet
              : raiseSize > 0
              ? raiseSize
              : betting.bigBlind * 2}{" "}
            PGLD
          </span>
        </div>

        <div className="flex-1">
          <input
            type="range"
            min={betting.bigBlind * 2}
            max={Math.max(betting.bigBlind * 8, betting.pot || betting.bigBlind * 4)}
            step={betting.bigBlind}
            value={raiseSize || betting.bigBlind * 2}
            onChange={(e) => {
              const v = Number(e.target.value)
              setRaiseSize(v)
              setManualBet("")
            }}
            className="w-full accent-[#FFD700]"
          />
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <input
            type="number"
            min={betting.bigBlind * 2}
            value={manualBet}
            onChange={(e) => setManualBet(e.target.value)}
            placeholder="Manual"
            className="w-20 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[11px] text-white/85 outline-none focus:border-[#FFD700]"
          />
          <button
            type="button"
            onClick={() => setManualBet("")}
            className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:border-[#FFD700]/60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              setRaiseSize(betting.bigBlind * 2)
              setManualBet("")
            }}
            className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:border-[#FFD700]/60"
          >
            Min
          </button>
        </div>
      </div>
    )}

   

    {/* Timer bar stays (thin) */}
    {isHeroTurn && (
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={
            actionPhase === "extra"
              ? "h-full rounded-full bg-gradient-to-r from-red-400 via-red-500 to-red-700 timer-bar"
              : "h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 timer-bar"
          }
          style={{ width: `${actionPct}%` }}
        />
      </div>
    )}

    
    {/* ───────────────── HOST TOOLS (WSOP-style) ───────────────── */}
{isHostClient && (
  <div className="mt-2 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5">
    {/* Header */}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => setShowHostPanel((v: boolean) => !v)}
        className="rounded-lg border border-amber-300/35 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-amber-200 hover:bg-black/70"
      >
        Host tools {showHostPanel ? "▾" : "▸"}
      </button>

      <span className="text-[10px] text-white/45">
        Host-only controls
      </span>
    </div>

    {/* Body */}
    {showHostPanel && (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* HOLD / RESUME NEXT DEAL */}
        <button
          type="button"
          onClick={() => {
            if (dealHeld) {
              sendMessage({ type: "host-resume-deal" });
            } else {
              sendMessage({ type: "host-hold-deal" });
            }
          }}
          className={[
            "rounded-lg px-2.5 py-1 text-[10px] font-semibold",
            dealHeld
              ? "bg-emerald-500/85 text-black hover:bg-emerald-400"
              : "bg-red-500/80 text-black hover:bg-red-400",
          ].join(" ")}
        >
          {dealHeld ? "Resume dealing" : "Hold next deal"}
        </button>

        {/* MANUAL DEAL (only when idle + allowed) */}
        {tableIdle && seatedCount >= MIN_PLAYERS_TO_START && !dealHeld && (
          <button
            type="button"
            onClick={handleManualDeal}
            className="rounded-lg bg-[#FFD700] px-2.5 py-1 text-[10px] font-semibold text-black hover:bg-yellow-400"
          >
            Deal hand
          </button>
        )}

        {/* RESET TABLE (guarded on server) */}
        <button
          type="button"
          onClick={() => setConfirmResetOpen(true)}
          className="rounded-lg border border-red-400/45 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-red-200 hover:bg-black/70"
        >
          Reset table
        </button>

        {/* STATUS READOUT */}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-white/55">
          <span className="font-mono">
            hand {table?.handId ?? "-"}
          </span>

          <span className="opacity-50">•</span>

          <span className="font-mono">
            {betting?.street ?? "idle"}
          </span>

          {dealHeld && (
            <>
              <span className="opacity-50">•</span>
              <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-[1px] font-bold text-amber-200">
                DEAL HELD
              </span>
            </>
          )}
        </div>
      </div>
    )}
  </div>
)}


  </div>
</div>



            {/* Dealer area – hidden in fullscreen */}
            {!isFullscreen && (
              <>
                <div className="mt-3 rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-[11px] text-white/80 shadow-[0_0_20px_rgba(0,0,0,0.85)]">
                  <button
                    type="button"
                    onClick={() => setShowLastWinners((v) => !v)}
                    className="flex w-full items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                        Last winners
                      </span>
                      {winnersToShow.length > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-[1px] text-[9px] text-emerald-300 border border-emerald-500/40">
                          Last {Math.min(winnersToShow.length, 5)} hands
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-white/60">
                      {showLastWinners ? "▾" : "▸"}
                    </span>
                  </button>

                  {showLastWinners && winnersToShow.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2 space-y-1.5">
                      {winnersToShow.slice(0, 5).map((w: WinnerEntry, idx: number) => (
                        <div key={`${w.handId}-${w.playerId}-${idx}`} className="flex items-center justify-between gap-2">
                          <span className="font-mono text-white/75">Hand #{w.handId ?? "–"}</span>
                          <span className="truncate text-white/65">
                            Seat {(w.seatIndex ?? 0) + 1} • {w.rankName ?? "Winner"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showLastWinners && winnersToShow.length === 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/55">
                      No completed hands yet.
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-white/15 bg-black/75 px-3 py-2 text-[11px] text-white/80 shadow-[0_0_20px_rgba(0,0,0,0.85)]">
                  <button
                    type="button"
                    onClick={() => setShowDealerLog((v) => !v)}
                    className="flex w-full items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                        Dealer log
                      </span>
                      <span className="text-[9px] text-white/50">Latest events first</span>
                    </div>
                    <span className="text-[11px] text-white/60">
                      {showDealerLog ? "▾" : "▸"}
                    </span>
                  </button>

                  {showDealerLog && dealerLog.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2 space-y-1.5 text-[10px] text-white/75">
                      {dealerLog
                        .slice()
                        .reverse()
                        .slice(0, 15)
                        .map((entry: DealerLogEntry) => (
                          <div key={entry.id} className="flex gap-2">
                            <span className="min-w-[52px] font-mono text-white/40">
                              {new Date(entry.ts).toLocaleTimeString()}
                            </span>
                            <span className="flex-1">{entry.text}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="relative mt-3 text-[11px] font-semibold text-white/40">
                  Seats, blinds, betting, showdown, and winners are all synced live for every
                  player.
                </div>
              </>
            )}
          </div>

          {/* CHAT – hide in fullscreen */}
          {!isFullscreen && (
            <section className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Table Chat • PGLD Poker Room
                </div>
                <div className="text-[10px] text-white/40">Live for all seated players.</div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-2 text-[11px] space-y-1">
                {chatMessages.length === 0 && (
                  <div className="text-white/40">No messages yet. Say hello to the table.</div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i}>
                    <span className="font-mono text-emerald-300">{(m as any).playerId}</span>
                    <span className="text-white/60">: </span>
                    <span>{(m as any).text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="mt-2 flex gap-2 text-[11px]">
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
          )}
        </section>
      </div>

      {confirmResetOpen && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70">
    <div className="w-full max-w-sm rounded-2xl border border-red-400/40 bg-gradient-to-b from-black via-[#020617] to-black p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
      <div className="text-[10px] uppercase tracking-[0.25em] text-red-200/80">
        Host action
      </div>
      <div className="mt-1 text-lg font-extrabold text-white/90">Reset table?</div>
      <div className="mt-1 text-[11px] text-white/60">
        Use only if the game freezes. This will clear the current hand state for everyone.
      </div>

      <div className="mt-4 flex justify-end gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => setConfirmResetOpen(false)}
          className="rounded-lg border border-white/25 px-3 py-1.5 text-white/80 hover:border-white/50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmResetOpen(false);
            sendMessage({ type: "reset-table" });
            pushLog("Host requested a table reset.");
          }}
          className="rounded-lg bg-red-500/85 px-3 py-1.5 font-semibold text-black hover:bg-red-400"
        >
          Yes, reset
        </button>
      </div>
    </div>
  </div>
)}


      {/* BUY-IN MODAL */}
      {showBuyIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-[#FFD700]/50 bg-gradient-to-b from-black via-[#020617] to-black p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
            <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[#FFD700]/80">
              Buy-in
            </div>
            <h2 className="mb-1 text-lg font-bold">Sit at the Base Gold Rush table</h2>
            <p className="mb-3 text-[11px] text-white/60">
              Choose your PGLD chip buy-in amount for this session.
            </p>

            <div className="mb-3 space-y-2">
              <label className="block text-xs text-white/60">Buy-in (PGLD chips)</label>
              <input
                type="number"
                min={100}
                max={DEMO_ENABLED ? Math.max(heroBankroll, DEMO_TARGET) : heroBankroll}

                value={buyIn}
                onChange={(e) => setBuyIn(Number(e.target.value))}
                className="w-full rounded-lg bg-black/70 border border-white/25 px-3 py-2 text-sm outline-none focus:border-[#FFD700]"
              />
              <div className="flex flex-wrap gap-2 text-[10px]">
                {[250, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBuyIn(preset)}
                    className="rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                  >
                    {preset.toLocaleString()} PGLD
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/45">
                PGLD chips available:{" "}
{heroBankroll.toLocaleString()} PGLD
{DEMO_ENABLED && heroBankroll <= 0 ? (
  <span className="ml-2 text-amber-200/80">(demo top-up will auto-load)</span>
) : null}


              </div>
            </div>

            <div className="flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setShowBuyIn(false)}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-white/80 hover:border-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSit}
                className="rounded-lg bg-[#FFD700] px-3 py-1.5 font-semibold text-black hover:bg-yellow-400"
              >
                Sit with {Math.max(100, Math.floor(buyIn))} PGLD
              </button>
            </div>
          </div>
        </div>
      )}

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

        @keyframes winnerGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 0 24px 4px rgba(250, 204, 21, 0.9);
            transform: translateY(-2px);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(250, 204, 21, 0);
            transform: translateY(0);
          }
        }
        .winner-glow {
          animation: winnerGlow 1.3s ease-in-out infinite;
        }

        .winner-anim {
          animation: winner-fade-in 0.4s ease-out;
        }
        .winner-emoji-pop {
          animation: winner-emoji-pop 0.6s ease-out;
        }

        @keyframes winner-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes winner-emoji-pop {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.6);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hero-bar-slide {
          will-change: transform, opacity;
        }

        @keyframes neonPulse {
          0% {
            box-shadow: 0 0 4px rgba(255, 215, 0, 0.4);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 0 12px rgba(255, 215, 0, 0.9);
            transform: translateY(-1px);
          }
          100% {
            box-shadow: 0 0 4px rgba(255, 215, 0, 0.4);
            transform: translateY(0);
          }
        }

        .timer-neon {
          animation: neonPulse 1.05s ease-in-out infinite;
        }

        .timer-bar {
          transition: width 0.25s linear;
        }

        @keyframes heroRingPulse {
          0% {
            box-shadow: 0 0 4px rgba(250, 204, 21, 0.3);
            opacity: 0.9;
          }
          50% {
            box-shadow: 0 0 10px rgba(250, 204, 21, 0.9);
            opacity: 1;
          }
          100% {
            box-shadow: 0 0 4px rgba(250, 204, 21, 0.3);
            opacity: 0.9;
          }
        }

        .hero-timer-ring {
          animation: heroRingPulse 1s ease-in-out infinite;
        }
          .hero-timer-ring-spice {
  opacity: 0.98;
}

.hero-timer-ring-spice-inner {
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: inset 0 0 10px rgba(0,0,0,0.65);
  opacity: 0.75;
}

@keyframes ringFlicker {
  0% { opacity: 0.92; }
  50% { opacity: 1; }
  100% { opacity: 0.92; }
}
.hero-timer-ring-spice {
  animation: ringFlicker 1.05s ease-in-out infinite;
}


  

@keyframes potPulse {
  0% { transform: translateZ(0) scale(1); box-shadow: 0 0 18px rgba(0,0,0,0.9); }
  45% { transform: translateZ(0) scale(1.06); box-shadow: 0 0 24px rgba(250,204,21,0.55), 0 0 18px rgba(0,0,0,0.9); }
  100% { transform: translateZ(0) scale(1); box-shadow: 0 0 18px rgba(0,0,0,0.9); }
}

.pot-pulse {
  animation: potPulse 0.26s ease-out;
}

@keyframes seatTurnGlow {
  0% { box-shadow: 0 0 10px rgba(250,204,21,0.35), 0 0 10px rgba(0,0,0,0.9); transform: translateY(0); }
  50% { box-shadow: 0 0 26px rgba(250,204,21,0.95), 0 0 12px rgba(0,0,0,0.9); transform: translateY(-1px); }
  100% { box-shadow: 0 0 10px rgba(250,204,21,0.35), 0 0 10px rgba(0,0,0,0.9); transform: translateY(0); }
}

.seat-turn-glow {
  animation: seatTurnGlow 0.95s ease-in-out infinite;
}

@keyframes tapHint {
  0% { transform: translateX(-50%) translateY(0); opacity: 0.55; }
  50% { transform: translateX(-50%) translateY(-2px); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0); opacity: 0.55; }
}
.animate-tap-hint {
  animation: tapHint 0.9s ease-in-out infinite;
}


@keyframes actionBadgePop {
  0%   { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.96); }
  10%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  85%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-2px) scale(0.995); }
}

.action-badge { animation: actionBadgePop 3.8s ease-out both; }




      `}</style>
    </>
  );
}
