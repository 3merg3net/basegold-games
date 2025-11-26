// components/casino/arcade/PokerRoomArcade.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePokerRoom } from "@/lib/pokerClient/usePokerRoom";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";

type SeatView = {
  seatIndex: number;
  playerId: string | null;
  name?: string;
  chips?: number;
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
  roomId?: string
}

// ───────────────── Chips ─────────────────

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

function ChipStack({
  amount,
  size = 32,
}: {
  amount: number;
  size?: number;
}) {
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
            alt={`BGRC ${d}`}
            width={w}
            height={h}
            className="rounded-full drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]"
          />
        );
      })}
    </div>
  );
}

// ───────────────── Cards ─────────────────

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

// Deeper, richer suit colors (black suits dark, reds punchy)
const SUIT_COLORS: Record<string, string> = {
  // black suits – crisp + bright on darker bevel
  s: "text-slate-100",
  c: "text-slate-100",
  // red suits – deeper / richer reds
  h: "text-rose-300",
  d: "text-rose-300",
};


function parseCard(card: string) {
  if (!card || card.length < 2) {
    return {
      rank: card,
      suit: "",
      rankLabel: card,
      suitLabel: "",
      suitColor: "text-slate-100",
      isRed: false,
    };
  }
  const rank = card[0].toUpperCase();
  const suitRaw = card[1].toLowerCase();
  const rankLabel = RANK_LABELS[rank] ?? rank;
  const suitLabel = SUIT_LABELS[suitRaw] ?? "";
  const suitColor = SUIT_COLORS[suitRaw] ?? "text-slate-100";
  const isRed = suitRaw === "h" || suitRaw === "d";
  return { rank, suit: suitRaw, rankLabel, suitLabel, suitColor, isRed };
}

function PokerCard({
  card,
  highlight = false,
  size = "normal",
  delayIndex = 0,
}: {
  card: string;
  highlight?: boolean;
  size?: "normal" | "small";
  delayIndex?: number;
}) {
  const { rankLabel, suitLabel, suitColor } = parseCard(card);
  const isSmall = size === "small";

  const baseSize = isSmall
    ? "w-8 h-11 text-[9px]" // compact showdown card
    : "w-11 h-16 text-xs md:w-12 md:h-18 md:text-sm"; // full board / hero card

  const delay = `${0.05 * delayIndex}s`;

  const bevelClasses = highlight
    ? // gold edge bevel when highlighted (hero / winners)
      "border-[#FACC15]/90 shadow-[0_0_16px_rgba(250,204,21,0.75)]"
    : // subtle metallic edge otherwise
      "border-slate-500/70 shadow-[0_4px_10px_rgba(0,0,0,0.75)]";

  const baseClasses = [
    "card-deal",
    baseSize,
    "rounded-xl",
    // darker, beveled card face
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
    "flex flex-col justify-between",
    "px-1.5 py-1",
    "border",
    bevelClasses,
    "relative overflow-hidden",
  ].join(" ");

  // ── COMPACT: showdown / small display (no duplicate rank/suit) ─────────
  if (isSmall) {
    return (
      <div className={baseClasses} style={{ animationDelay: delay }}>
        {/* faint inner bevel */}
        <div className="pointer-events-none absolute inset-[1px] rounded-[0.7rem] border border-black/40" />
        <div className="flex-1 flex flex-col items-center justify-center leading-tight relative z-10">
          <span className={`font-bold ${suitColor}`}>{rankLabel}</span>
          <span className={`text-[10px] ${suitColor}`}>{suitLabel}</span>
        </div>
      </div>
    );
  }

  // ── FULL CARD: board + hero hand ───────────────────────────────────────
  return (
    <div
      className={baseClasses}
      style={{
        animationDelay: delay,
      }}
    >
      {/* faint inner bevel */}
      <div className="pointer-events-none absolute inset-[1px] rounded-[0.7rem] border border-black/40" />

      {/* Rank / suit top-left */}
      <div className="flex items-start justify-between relative z-10">
        <span className="font-bold text-slate-50 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
          {rankLabel}
        </span>
        <span className={`text-[11px] ${suitColor}`}>{suitLabel}</span>
      </div>

      {/* Big center pip */}
      <div className="flex flex-1 items-center justify-center relative z-10">
        <span
          className={`text-xl md:text-2xl leading-none ${suitColor} drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]`}
        >
          {suitLabel}
        </span>
      </div>

      {/* Rank / suit bottom-right */}
      <div className="flex items-end justify-end relative z-10">
        <span className={`text-[11px] ${suitColor}`}>{suitLabel}</span>
      </div>
    </div>
  );
}



// ───────────────── Audio Hook ─────────────────

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
      // autoplay errors ignored
    }
  };
}

// ───────────────── Main Component ─────────────────

export default function PokerRoomArcade({
  roomId = 'bgld-holdem-demo-room',
}: PokerRoomArcadeProps) {
  // Player + chips from profile provider (cast to any to avoid TS friction)
  const { profile, chips, setChips } =
    usePlayerProfileContext() as any

  // Stable playerId for this browser session
  const playerIdRef = useRef<string>()

  if (!playerIdRef.current) {
    const nm = profile?.name ?? ''
    if (nm && nm.trim().length > 0) {
      playerIdRef.current = `player-${nm
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')}`
    } else {
      playerIdRef.current =
        'player-' + Math.random().toString(36).slice(2, 8)
    }
  }

  const playerId = playerIdRef.current!

  const { ready, messages, send } = usePokerRoom(
    roomId,
    playerId
  )

  const sendMessage = (msg: any) => {
    (send as any)(msg);
  };

  const playDeal = useSound("/sounds/deal-card.mp3");
  const playChip = useSound("/sounds/chip.wav");
  const playWin = useSound("/sounds/win.wav");

  // Invite link for sharing table
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
        .catch(() => {
          // ignore clipboard errors
        });
    }
  }

  // --- Derived state from messages ---

  const seats = useMemo<SeatView[]>(() => {
    const seatMessages = (messages as any[]).filter(
      (m) => m && m.type === "seats-update"
    );
    if (seatMessages.length === 0) return [];
    const last = seatMessages[seatMessages.length - 1];
    return (last.seats || []) as SeatView[];
  }, [messages]);

  const table = useMemo<TableState | null>(() => {
    const tableMessages = (messages as any[]).filter(
      (m) => m && m.type === "table-state"
    );
    if (tableMessages.length === 0) return null;
    const last = tableMessages[tableMessages.length - 1];
    return {
      handId: last.handId,
      board: last.board,
      players: last.players,
    } as TableState;
  }, [messages]);

  const betting = useMemo<BettingState | null>(() => {
    const bs = (messages as any[]).filter(
      (m) => m && m.type === "betting-state"
    );
    if (bs.length === 0) return null;
    const last = bs[bs.length - 1];
    return last as BettingState;
  }, [messages]);

  const showdown = useMemo<ShowdownState | null>(() => {
    const sd = (messages as any[]).filter(
      (m) => m && m.type === "showdown"
    );
    if (sd.length === 0) return null;
    const last = sd[sd.length - 1];
    return last as ShowdownState;
  }, [messages]);

  const chatMessages = useMemo(
    () =>
      (messages as any[]).filter(
        (m) => m && m.type === "chat-broadcast"
      ) as Array<{ playerId: string; text: string }>,
    [messages]
  );

  const heroSeat = useMemo(() => {
    if (!seats || seats.length === 0) return null;
    return seats.find((s) => s.playerId === playerId) || null;
  }, [seats, playerId]);

  // How many players are actually seated?
  const seatedCount = useMemo(
    () => seats.filter((s) => s.playerId).length,
    [seats]
  );

  // Host = lowest seatIndex that has a player
  const hostSeatIndex = useMemo(() => {
    let min: number | null = null;
    for (const s of seats) {
      if (!s.playerId) continue;
      if (min === null || s.seatIndex < min) {
        min = s.seatIndex;
      }
    }
    return min;
  }, [seats]);

  const isHostClient =
    !!heroSeat &&
    hostSeatIndex !== null &&
    heroSeat.seatIndex === hostSeatIndex;

  const heroHand = useMemo(() => {
    if (!table) return null;
    const hero = table.players.find((p) => p.playerId === playerId);
    return hero?.holeCards ?? null;
  }, [table, playerId]);

  const heroBetting = useMemo(() => {
    if (!betting) return null;
    return (
      betting.players.find((p) => p.playerId === playerId) ?? null
    );
  }, [betting, playerId]);

  const isHeroTurn: boolean =
    !!betting &&
    !!heroSeat &&
    betting.currentSeatIndex === heroSeat.seatIndex &&
    betting.street !== "done";

  // ───────────────── Dealer logs & state tracking ─────────────────

  const [dealerLog, setDealerLog] = useState<DealerLogEntry[]>([]);
  const logIdRef = useRef(0);
  const handIdRef = useRef<number | null>(null);
  const streetRef = useRef<BettingStreet | null>(null);
  const lastPotRef = useRef<number>(0);
  const lastBoardCountRef = useRef<number>(0);
  const showdownHandRef = useRef<number | null>(null);

  const pushLog = (text: string) => {
    setDealerLog((prev) => {
      const id = logIdRef.current++;
      const next: DealerLogEntry[] = [
        { id, text, ts: Date.now() },
        ...prev,
      ];
      return next.slice(0, 24);
    });
  };

  const describeHero = () => {
    const nm = profile?.name ?? "";
    if (nm.trim().length > 0) return nm.trim();
    if (heroSeat?.name) return heroSeat.name;
    return "You";
  };

  // Fixed blinds HUD (global, cash game style)
  const BLINDS: [number, number] = [25, 50];

  // Track new hands and board cards for logs + sounds
  useEffect(() => {
    if (!table) return;

    if (
      handIdRef.current == null ||
      table.handId !== handIdRef.current
    ) {
      handIdRef.current = table.handId;
      streetRef.current = null;
      showdownHandRef.current = null;
      lastBoardCountRef.current = table.board.length;
      pushLog(`New hand #${table.handId} in the BGRC free play room.`);
      playDeal();
    }

    const count = table.board.length;
    if (count > lastBoardCountRef.current) {
      playDeal();
    }
    lastBoardCountRef.current = count;
  }, [table, playDeal]);

  useEffect(() => {
    if (!betting) return;

    if (betting.pot > lastPotRef.current) {
      playChip();
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
          `Hand #${betting.handId} complete. Pot locked at ${betting.pot} free play chips.`
        );
      } else {
        pushLog(`Street: ${label}. Pot currently ${betting.pot}.`);
      }
    }
  }, [betting, playChip]);

  // Showdown effect – sound + log only
  useEffect(() => {
    if (!showdown || !table) return;
    if (showdown.handId !== table.handId) return;
    if (showdownHandRef.current === showdown.handId) return;

    showdownHandRef.current = showdown.handId;

    playWin();
    pushLog(
      "Showdown: revealing hands and sweeping the pot (raked ~5% when live on-chain)."
    );
  }, [showdown, table, playWin]);

  const boardCards = table?.board ?? [];
  const pot = betting?.pot ?? 0;
  // Simple fake rake in UI only (5% of pot)
  const FAKE_RAKE_PCT = 0.05;
  const rakeAmount = Math.floor(pot * FAKE_RAKE_PCT);
  const mainPot = Math.max(0, pot - rakeAmount);
  const buttonSeatIndex = betting?.buttonSeatIndex ?? null;
  const currentSeatIndex = betting?.currentSeatIndex ?? null;

  const committedBySeat: Record<number, number> = {};
  if (betting) {
    for (const p of betting.players) {
      committedBySeat[p.seatIndex] = p.committed ?? 0;
    }
  }

  const [chatInput, setChatInput] = useState("");
  const [raiseSize, setRaiseSize] = useState<number>(0);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [buyIn, setBuyIn] = useState<number>(500);

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendMessage({ type: "chat", text: trimmed });
    setChatInput("");
  };

  function handleSitOrStand() {
    if (heroSeat) {
      const cashOut = heroSeat.chips ?? 0;
      if (cashOut > 0) {
        setChips((c: number) => c + cashOut);
        pushLog(
          `${describeHero()} stands up and cashes out ${cashOut} free play chips.`
        );
      } else {
        pushLog(`${describeHero()} stands up from the table.`);
      }
      sendMessage({ type: "stand" });
      return;
    }
    setShowBuyIn(true);
  }

  function confirmSit() {
    setShowBuyIn(false);
    const effBuyIn = Math.max(100, Math.floor(buyIn));
    if (effBuyIn > chips) {
      pushLog(
        `Not enough free play credits to sit with ${effBuyIn}. Adjust buy-in or reload.`
      );
      return;
    }
    setChips((c: number) => Math.max(0, c - effBuyIn));
    pushLog(
      `${describeHero()} sits down with a ${effBuyIn} free play chip buy-in.`
    );
    sendMessage({
      type: "sit",
      name: profile?.name ?? "",
      buyIn: effBuyIn,
    } as any);
  }

  function handleFold() {
    if (!isHeroTurn) return;
    pushLog(`${describeHero()} folds (timer expired or manual).`);
    sendMessage({ type: "action", action: "fold" });
  }

  function handlePrimaryAction() {
    if (!isHeroTurn) return;
    // Determine check/call
    let primaryActionMode: "check" | "call" = "check";
    if (betting && heroBetting) {
      const diff = betting.maxCommitted - heroBetting.committed;
      if (diff > 0) {
        primaryActionMode = "call";
      }
    }

    if (primaryActionMode === "call") {
      pushLog(`${describeHero()} calls.`);
    } else {
      pushLog(`${describeHero()} checks.`);
    }
    sendMessage({ type: "action", action: primaryActionMode });
  }

  function handleBet() {
    if (!isHeroTurn || !betting) return;
    const min = betting.bigBlind * 2;
    const amount = raiseSize > 0 ? raiseSize : min;
    pushLog(`${describeHero()} bets ${amount}.`);
    sendMessage({ type: "action", action: "bet", amount });
  }

  // Host manual "Deal Next Hand" fallback
  function handleManualDeal() {
    if (!isHostClient) return;
    const noActiveHand =
      !betting || betting.street === "done" || !table;
    if (seatedCount < 2 || !noActiveHand) return;
    pushLog("Host manually dealt the next hand.");
    sendMessage({ type: "start-hand" });
  }

  const winnerSeatIndexes = useMemo(() => {
    if (!showdown) return new Set<number>();
    const set = new Set<number>();
    if (!Array.isArray(showdown.players)) return set;
    showdown.players.forEach((p) => {
      if (p.isWinner) {
        const s = seats.find((seat) => seat.playerId === p.playerId);
        if (s) set.add(s.seatIndex);
      }
    });
    return set;
  }, [showdown, seats]);

  // Collapsible sections
  const [openHowRoom, setOpenHowRoom] = useState(true);
  const [openHowPlay, setOpenHowPlay] = useState(false);
  const [openFreeOnchain, setOpenFreeOnchain] = useState(false);

  // Avatar initials for display in sidebar
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

  // Dynamic seat positions – only for players actually seated
  const activeSeats = seats.filter((s) => s.playerId);
  const RING_POSITIONS: Array<Partial<React.CSSProperties>> = [
    { top: "6%", left: "50%", transform: "translate(-50%, 0)" }, // top center
    { top: "20%", left: "12%", transform: "translate(0, 0)" }, // upper left
    { top: "20%", right: "12%", transform: "translate(0, 0)" }, // upper right
    { top: "45%", left: "4%", transform: "translate(0, -50%)" }, // mid left
    { top: "45%", right: "4%", transform: "translate(0, -50%)" }, // mid right
    { bottom: "24%", left: "10%", transform: "translate(0, 0)" }, // lower left
    { bottom: "24%", right: "10%", transform: "translate(0, 0)" }, // lower right
    { bottom: "10%", left: "30%", transform: "translate(-50%, 0)" }, // bottom left
    { bottom: "10%", left: "70%", transform: "translate(-50%, 0)" }, // bottom right
  ];

  // ───────────────── Game-level timers ─────────────────

  // Shared "next hand" countdown (seconds)
  const [gameCountdown, setGameCountdown] = useState<number | null>(
    null
  );
  const [now, setNow] = useState<number>(Date.now());
  const [actionDeadline, setActionDeadline] =
    useState<number | null>(null);

  const lastHandKeyRef = useRef<string | null>(null);
  const lastActionKeyRef = useRef<string | null>(null);

  // Global ticking clock
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Start "next hand" countdown whenever:
  // - ≥2 players seated
  // - no active betting (or betting.done)
  useEffect(() => {
    const noActiveHand =
      !betting || betting.street === "done" || !table;

    const handKey = betting
      ? `${betting.handId}-${betting.street}`
      : "none";

    if (seatedCount >= 2 && noActiveHand) {
      if (lastHandKeyRef.current !== handKey) {
        lastHandKeyRef.current = handKey;
        setGameCountdown(5); // 5-second table-wide countdown
      }
    } else {
      setGameCountdown(null);
    }
  }, [seatedCount, betting, table]);

  // Tick down the game countdown + auto deal when it hits 0 (host-only)
  useEffect(() => {
    if (gameCountdown === null) return;

    if (gameCountdown <= 0) {
      setGameCountdown(null);
      // Only the host client fires auto-deal
      if (isHostClient) {
        pushLog("Auto-dealing next hand for the table.");
        sendMessage({ type: "start-hand" });
      }
      return;
    }

    const id = setTimeout(
      () => setGameCountdown((c) => (c === null ? null : c - 1)),
      1000
    );
    return () => clearTimeout(id);
  }, [gameCountdown, isHostClient, sendMessage]);

  // Action timer: 60s per decision, auto-fold at 0
  const ACTION_MS = 60000; // 60 seconds

  useEffect(() => {
    if (!betting || !heroSeat) {
      setActionDeadline(null);
      lastActionKeyRef.current = null;
      return;
    }

    const key = `${betting.handId}-${betting.street}-${betting.currentSeatIndex}`;
    const heroTurnNow = isHeroTurn;

    if (!heroTurnNow) {
      // Not our turn – clear timer so we don't show stale info
      setActionDeadline(null);
      lastActionKeyRef.current = key;
      return;
    }

    // New turn for hero → start/restart timer
    if (lastActionKeyRef.current !== key) {
      lastActionKeyRef.current = key;
      setActionDeadline(Date.now() + ACTION_MS);
    }
  }, [betting, heroSeat, isHeroTurn]);

  // Auto-fold when timer hits 0
  useEffect(() => {
    if (!isHeroTurn || !actionDeadline) return;
    if (now >= actionDeadline) {
      handleFold();
      setActionDeadline(null);
    }
  }, [now, isHeroTurn, actionDeadline]);

  const actionRemainingMs = useMemo(() => {
    if (!actionDeadline) return null;
    const diff = actionDeadline - now;
    return diff > 0 ? diff : 0;
  }, [actionDeadline, now]);

  const actionSeconds = actionRemainingMs
    ? Math.ceil(actionRemainingMs / 1000)
    : null;
  const actionPct = actionRemainingMs
    ? Math.max(
        0,
        Math.min(100, (actionRemainingMs / ACTION_MS) * 100)
      )
    : 0;

  // Primary action label (check/call)
  let primaryActionLabel = "Check";
  if (betting && heroBetting) {
    const diff = betting.maxCommitted - heroBetting.committed;
    if (diff > 0) {
      primaryActionLabel = `Call ${diff}`;
    }
  }

  const canHostManualDeal =
    isHostClient &&
    seatedCount >= 2 &&
    (!betting || betting.street === "done");

  return (
    <>
      <div className="space-y-6 pb-16 md:pb-4">
        {/* TABLE + SIDEBAR */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* TABLE */}
          <div className="relative rounded-3xl border border-[#FFD700]/40 bg-gradient-to-b from-black via-[#020617] to-black p-4 md:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0ea5e9]/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
            </div>

            {/* Header */}
            <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Base Gold Rush • Hold&apos;em Room
                </div>
                <div className="text-sm md:text-base text-white/80">
                  Room ID:{" "}
                  <span className="font-mono text-[#FFD700]/90">
                    bgld-holdem-demo-room
                  </span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  <span className="font-mono text-[#FFD700]">
                    {mainPot}
                  </span>{" "}
                  to players •{" "}
                  <span className="font-mono text-emerald-300">
                    {rakeAmount}
                  </span>{" "}
                  fake rake (5%)
                </div>

                {table && (
                  <div className="text-[11px] text-white/50">
                    Hand #{table.handId}
                  </div>
                )}
                <div className="text-[10px] text-white/50">
                  Pot{" "}
                  <span className="font-mono text-[#FFD700]">
                    {pot}
                  </span>
                </div>

                {betting && (
                  <div className="text-[11px] text-white/50">
                    Street: {betting.street}
                  </div>
                )}
              </div>
              <div className="relative text-xs text-right text-white/55 space-y-1">
                {ready ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40">
                    <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/40">
                    <span className="mr-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Connecting…
                  </span>
                )}
                <div className="text-[10px] text-white/40">
                  WS:{" "}
                  <span className="font-mono">
                    {process.env.NEXT_PUBLIC_POKER_WS ??
                      "ws://localhost:8080"}
                  </span>
                </div>
              </div>
            </div>

            {/* TABLE HUD – fixed blinds */}
            <div className="mb-2 rounded-xl border border-white/10 bg-black/60 px-3 py-2 flex flex-wrap items-center gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#FFD700]/10 border border-[#FFD700]/60 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700]">
                  Free Play • Fixed Blinds
                </span>
                <span className="text-white/70">
                  Blinds{" "}
                  <span className="font-mono">
                    {BLINDS[0]}/{BLINDS[1]}
                  </span>{" "}
                  BGRC
                </span>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-3 justify-end text-white/50">
                <span className="text-[10px]">
                  Blinds stay fixed this session. Hands auto-deal when 2+
                  players are seated.
                </span>
              </div>
            </div>

            {/* FELT – tall on mobile, wide on desktop */}
            <div className="relative mt-2 mx-auto w-full max-w-[760px] aspect-[9/16] md:aspect-[16/9] rounded-[999px] bg-[radial-gradient(circle_at_top,#157256_0,#032018_45%,#020617_70%,#000_100%)] border border-[#FFD700]/40 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light bg-[url('/felt/felt-texture.png')]" />

              {/* Game countdown banner */}
              {gameCountdown !== null && (
                <div className="absolute top-[6%] left-1/2 -translate-x-1/2 z-20">
                  <div className="rounded-full bg-black/80 border border-[#FFD700]/80 px-4 py-1.5 flex items-center gap-2 shadow-[0_0_25px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                      Next hand starts in
                    </span>
                    <span className="text-xl font-extrabold text-[#FFD700] tabular-nums">
                      {gameCountdown}
                    </span>
                    <span className="text-[10px] text-white/40">
                      Sit now to join
                    </span>
                  </div>
                </div>
              )}

              {/* Center logo */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center translate-y-2 md:translate-y-0">
                  <div className="mb-1 opacity-85">
                    <Image
                      src="/felt/bgrc-logo.png"
                      alt="Base Gold Rush"
                      width={200}
                      height={200}
                      className="object-contain mx-auto drop-shadow-[0_0_18px_rgba(250,204,21,0.6)]"
                    />
                  </div>
                  <div className="text-[10px] md:text-xs tracking-[0.35em] text-[#FFD700]/90 uppercase text-center">
                    Base Gold Rush
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-[6%] md:inset-[8%] rounded-[999px] border border-[#FFD700]/25 shadow-[0_0_40px_rgba(250,204,21,0.35)]" />

              {/* Center content: pot + board */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Pot, above board */}
                {pot > 0 && (
                  <div className="mb-2 relative -translate-y-6 md:-translate-y-4">
                    <div className="pot-animate flex flex-col items-center">
                      <ChipStack amount={pot} size={26} />
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-black/80 border border-[#FFD700]/70 text-[10px] font-mono">
                        <span className="text-[#FFD700]">
                          Pot {pot}
                        </span>
                        <span className="text-white/60">
                          {" "}
                          • Rake {rakeAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Board cards */}
                <div className="flex gap-1.5 mb-2 z-10 px-2 -translate-y-2 md:-translate-y-1">
                  {boardCards.length === 0 ? (
                    <div className="text-[11px] text-white/40 text-center max-w-xs">
                      When 2+ players are seated, the next hand auto-deals
                      after the countdown. Each browser/device is its own
                      player.
                    </div>
                    ) : (
    boardCards.map((c, i) => {
  const tilts = [-8, -4, 0, 4, 8]; // nice fan for up to 5 cards
  const tilt = tilts[i] ?? 0;

  return (
    <div
      key={`${table?.handId ?? 0}-board-${i}-${c}`}
      style={{
        transform: `translateY(${Math.abs(tilt) / 3}px) rotate(${tilt}deg)`,
        transformOrigin: "50% 80%",
      }}
    >
      <PokerCard card={c} delayIndex={i} />
    </div>
  );
})

  )}

                </div>
              </div>

              {/* Hero hand anchored near bottom, fanned like a real app */}
              {heroHand && (
                <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="relative h-20 w-[120px] md:w-[140px]">
                    {heroHand.map((c, i) => {
                      const offsets = [
                        { rotate: -10, translateX: -14, z: 10 },
                        { rotate: 10, translateX: 14, z: 20 },
                      ];
                      const cfg = offsets[i] ?? offsets[1];

                      return (
                        <div
                          key={`${table?.handId ?? 0}-hero-${i}-${c}`}
                          className="absolute top-0 left-1/2"
                          style={{
                            transform: `translateX(${cfg.translateX}px) rotate(${cfg.rotate}deg)`,
                            transformOrigin: "50% 80%",
                            zIndex: cfg.z,
                          }}
                        >
                          <PokerCard card={c} highlight delayIndex={i} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seats */}
              <div className="absolute inset-0 text-[11px] text-white/80">
                {activeSeats.map((seat, idx) => {
                  const label =
                    seat.playerId && seat.name
                      ? seat.name
                      : seat.playerId
                      ? seat.playerId
                      : `Seat ${seat.seatIndex + 1}`;

                  const isHeroSeat = seat.playerId === playerId;
                  const isButton =
                    buttonSeatIndex !== null &&
                    buttonSeatIndex === seat.seatIndex;
                  const isActiveTurn =
                    currentSeatIndex !== null &&
                    currentSeatIndex === seat.seatIndex;
                  const isWinnerSeat = winnerSeatIndexes.has(
                    seat.seatIndex
                  );

                  const pos =
                    RING_POSITIONS[idx] ?? RING_POSITIONS[0];

                  const committed =
                    committedBySeat[seat.seatIndex] ?? 0;

                  return (
                    <div
                      key={seat.seatIndex}
                      className="absolute flex flex-col items-center gap-1"
                      style={pos as any}
                    >
                      {/* Dealer button */}
                      {isButton && (
                        <div className="px-1.5 py-0.5 rounded-full bg-[#FFD700] text-black text-[9px] font-bold shadow">
                          D
                        </div>
                      )}

                      {/* Player pill */}
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border text-[10px] bg-black/80 shadow-[0_0_10px_rgba(0,0,0,0.7)] ${
                          isHeroSeat
                            ? "border-[#FFD700]/80 text-[#FFD700]"
                            : seat.playerId
                            ? "border-white/60 text-white"
                            : "border-white/20 text-white/50"
                        } ${isActiveTurn ? "seat-active-ring" : ""} ${
                          isWinnerSeat ? "winner-glow" : ""
                        }`}
                      >
                        {/* Avatar circle – default to BGLD chip / logo */}
                        <div className="h-7 w-7 rounded-full bg-slate-900 border border-white/25 flex items-center justify-center overflow-hidden">
                          {isHeroSeat && (profile as any)?.avatarUrl ? (
                            <Image
                              src={(profile as any).avatarUrl}
                              alt="Avatar"
                              width={28}
                              height={28}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Image
                              src="/felt/bgrc-logo.png"
                              alt="BGLD"
                              width={22}
                              height={22}
                              className="object-contain"
                            />
                          )}
                        </div>

                        {/* Name + stack */}
                        <div className="flex flex-col">
                          <span className="max-w-[110px] truncate leading-tight">
                            {label}
                          </span>
                          {seat.playerId && (
                            <span className="font-mono text-[10px] text-[#5eead4] leading-tight">
                              {(seat.chips ?? 1000).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Committed chips under the pill */}
                      {committed > 0 && (
                        <div className="-mt-1">
                          <ChipStack amount={committed} size={18} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Under-table ACTION BAR (ClubGG style) */}
            <div className="mt-3 rounded-2xl bg-black/80 border border-white/20 px-3 py-2 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {describeHero()}
                  </span>
                  {heroBetting && (
                    <span className="rounded-full bg-black/70 border border-white/25 px-2 py-0.5 text-[10px]">
                      Stack:{" "}
                      <span className="font-mono text-[#FFD700]">
                        {heroBetting.stack}
                      </span>
                    </span>
                  )}
                  <span className="rounded-full bg-black/70 border border-white/25 px-2 py-0.5 text-[10px]">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} BGRC
                    </span>
                  </span>
                </div>

                <div className="text-[10px] text-white/50">
                  Pot{" "}
                  <span className="font-mono text-[#FFD700]">
                    {pot}
                  </span>
                </div>
              </div>

              {/* Status + timer bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">
                    {!betting || betting.street === "done" ? (
                      showdown &&
                      table &&
                      showdown.handId === table.handId ? (
                        "Hand complete. Showdown above. Next hand auto-starts once players are seated."
                      ) : (
                        "Waiting for next hand. When 2+ players are seated, the next hand auto-deals."
                      )
                    ) : !heroSeat || !heroBetting ? (
                      "Sit at the table to join the action."
                    ) : !isHeroTurn ? (
                      "Waiting for other players to act…"
                    ) : (
                      "Your turn to act"
                    )}
                  </span>
                  {isHeroTurn && actionSeconds !== null && (
                    <span className="text-[10px] font-mono text-[#FFD700]">
                      Action time: {actionSeconds}s
                    </span>
                  )}
                </div>
                {isHeroTurn && (
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 transition-[width] duration-250"
                      style={{ width: `${actionPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Buttons + raise controls – ClubGG layout */}
              <div className="mt-1 space-y-3">
                {/* Seat / host controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSitOrStand}
                    disabled={!ready}
                    className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {heroSeat ? "Stand Up" : "Sit at Table"}
                  </button>

                  {canHostManualDeal && (
                    <button
                      onClick={handleManualDeal}
                      className="rounded-full bg-[#FFD700] px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-yellow-400"
                    >
                      Deal Next Hand
                    </button>
                  )}
                </div>

                {/* Primary action rail (centered, 3 big buttons) */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleFold}
                    disabled={!isHeroTurn}
                    className="flex-1 max-w-[140px] rounded-full bg-red-500 px-3 py-2 text-xs md:text-sm font-semibold text-black shadow-[0_0_16px_rgba(239,68,68,0.8)] hover:bg-red-400 disabled:opacity-40"
                  >
                    Fold
                  </button>
                  <button
                    onClick={handlePrimaryAction}
                    disabled={!isHeroTurn}
                    className="flex-1 max-w-[160px] rounded-full bg-slate-800 px-3 py-2 text-xs md:text-sm font-semibold text-white shadow-[0_0_16px_rgba(15,23,42,0.9)] hover:bg-slate-600 disabled:opacity-40"
                  >
                    {primaryActionLabel}
                  </button>
                  <button
                    onClick={handleBet}
                    disabled={!isHeroTurn || !betting}
                    className="flex-1 max-w-[140px] rounded-full bg-emerald-500 px-3 py-2 text-xs md:text-sm font-semibold text-black shadow-[0_0_16px_rgba(16,185,129,0.8)] hover:bg-emerald-400 disabled:opacity-40"
                  >
                    Bet{" "}
                    {betting
                      ? raiseSize > 0
                        ? raiseSize
                        : betting.bigBlind * 2
                      : 0}
                  </button>
                </div>

                {betting && (
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-white/45">
                      <span>Raise amount</span>
                      <span className="font-mono text-[#FFD700]">
                        {raiseSize > 0
                          ? raiseSize
                          : betting.bigBlind * 2}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={betting.bigBlind * 2}
                      max={Math.max(
                        betting.bigBlind * 8,
                        betting.pot || betting.bigBlind * 4
                      )}
                      step={betting.bigBlind}
                      value={raiseSize || betting.bigBlind * 2}
                      onChange={(e) =>
                        setRaiseSize(Number(e.target.value))
                      }
                      className="w-full accent-[#FFD700]"
                    />
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setRaiseSize(betting.bigBlind * 2)
                        }
                        className="rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                      >
                        2x BB
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRaiseSize(betting.bigBlind * 3)
                        }
                        className="rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                      >
                        3x BB
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRaiseSize(betting.bigBlind * 4)
                        }
                        className="rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                      >
                        4x BB
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRaiseSize(
                            betting.pot || betting.bigBlind * 6
                          )
                        }
                        className="rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                      >
                        Pot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dealer log */}
            <div className="mt-3 rounded-xl bg-black/55 border border-white/15 px-3 py-2 max-h-32 overflow-y-auto text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Dealer Log
                </div>
                <div className="text-[9px] text-white/35">
                  Latest events first
                </div>
              </div>
              {dealerLog.length === 0 ? (
                <div className="text-white/35">
                  Waiting for action. Sit at the table and watch the
                  countdown for the next hand.
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {dealerLog.map((entry) => (
                    <li key={entry.id} className="text-white/80">
                      <span className="text-white/35 mr-1">•</span>
                      {entry.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Showdown */}
            {showdown && table && showdown.handId === table.handId && (
  <div className="mt-3 rounded-xl bg-black/40 border border-[#FFD700]/40 px-3 py-2 text-[11px] text-white/80">
    <div className="font-semibold text-[#FFD700] mb-1">
      Showdown
    </div>
    <div className="text-[10px] text-white/50 mb-1">
      House rake (live mode):{" "}
      <span className="font-mono text-[#FFD700]">5%</span> of pot, routing
      to the Base Gold Rush vault + house wallet. Free play doesn&apos;t
      move real value yet.
    </div>

    {Array.isArray(showdown.players) &&
      showdown.players.map((p) => {
        const seat = seats.find((s) => s.seatIndex === p.seatIndex);
        const label = seat?.name || p.playerId;

        return (
          <div
            key={p.playerId}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-1"
          >
            {/* Text summary */}
            <div>
              <span
                className={
                  p.isWinner
                    ? "font-semibold text-[#FFD700]"
                    : ""
                }
              >
                {label}
              </span>{" "}
              <span className="text-white/60">— {p.rankName}</span>
              {p.isWinner && (
                <span className="ml-1 text-emerald-300 font-semibold">
                  (Winner)
                </span>
              )}
            </div>

            {/* Fanned mini hand */}
            {p.bestHand && p.bestHand.length > 0 && (
              <div className="relative flex gap-1 pr-2">
                {p.bestHand.map((c, i) => {
                  // Fan angles around center of the hand
                  const center =
                    (p.bestHand.length - 1) / 2;
                  const tilt = (i - center) * 6; // degrees

                  return (
                    <div
                      key={c + i}
                      className="relative"
                      style={{
                        transform: `translateY(${Math.abs(
                          tilt
                        ) / 4}px) rotate(${tilt}deg)`,
                        transformOrigin: "50% 80%",
                      }}
                    >
                      <PokerCard
                        card={c}
                        size="small"
                        highlight={p.isWinner}
                        delayIndex={i}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
  </div>
)}


            <div className="mt-3 text-[11px] text-white/40 relative z-10">
              Seats, blinds, betting, showdown, and chat are all synced
              through the coordinator. When we flip to on-chain, BGRC /
              BGLD balances and rake accounting plug directly into this
              flow.
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* Player profile summary */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    Player Profile
                  </div>
                  <div className="text-[11px] text-white/40">
                    Edit from the profile page. This persona is shown at
                    the table.
                  </div>
                </div>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-black shadow-[0_0_20px_rgba(250,204,21,0.7)]"
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
                    <div className="text-white/80 font-semibold">
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
                  <Link
                    href="/profile"
                    className="rounded-full border border-[#FFD700]/70 bg-black/70 px-3 py-1 text-[11px] font-semibold text-[#FFD700] hover:bg-[#111827]"
                  >
                    Edit full profile →
                  </Link>
                </div>

                {profile?.bio && (
                  <p className="text-white/60">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 text-[10px] text-white/55 pt-1">
                  {profile?.xHandle && (
                    <span className="rounded-full bg-black/60 border border-white/20 px-2 py-0.5">
                      X: {profile.xHandle}
                    </span>
                  )}
                  {profile?.telegramHandle && (
                    <span className="rounded-full bg-black/60 border border-white/20 px-2 py-0.5">
                      TG: {profile.telegramHandle}
                    </span>
                  )}
                </div>
              </div>

              {/* Free play credits */}
              <div className="pt-2 border-t border-white/10 mt-2">
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
                    Free Play Credits
                  </div>
                  <div className="text-sm text-white/80">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} BGRC
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">
                    Sitting deducts a buy-in from this wallet; standing up
                    adds your stack back. In real BGLD mode this maps 1:1
                    to live house chips on Base.
                  </p>
                </div>
              </div>
            </div>

            {/* Room controls + invite */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 space-y-3 text-xs">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                Room Info & Invites
              </div>
              <p className="text-white/60 text-[11px]">
                Each person connects from their own browser or device. Sit,
                watch the countdown, and play through full hands —
                betting, turns, and showdown are synced via WebSocket.
              </p>

              {/* Invite link */}
              <div className="pt-3 border-t border-white/10 mt-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    Invite friends
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="rounded-full border border-[#FFD700]/60 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700] hover:bg-[#111827]"
                  >
                    {copiedInvite ? "Copied ✓" : "Copy link"}
                  </button>
                </div>
                <div className="text-[10px] text-white/40 break-all max-h-10 overflow-hidden">
                  {inviteUrl || "Invite URL loads here in browser."}
                </div>
              </div>
            </div>

            {/* Collapsible info blocks */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 space-y-3 text-[11px]">
              {/* How this room works */}
              <button
                type="button"
                onClick={() => setOpenHowRoom((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  How this room works
                </span>
                <span className="text-white/60 text-xs">
                  {openHowRoom ? "−" : "+"}
                </span>
              </button>
              {openHowRoom && (
                <div className="px-1 space-y-1 text-white/70">
                  <p>
                    This is a 6–9 seat Hold&apos;em cash-game style table
                    running on a multiplayer coordinator. Each browser /
                    device is a unique player with their own free play BGRC
                    stack.
                  </p>
                  <p>
                    The coordinator tracks seats, blinds, betting order,
                    streets, and showdown. When we hook in on-chain BGLD /
                    BGRC balances, this same flow powers live pots on Base.
                  </p>
                </div>
              )}

              {/* How to play Hold'em */}
              <button
                type="button"
                onClick={() => setOpenHowPlay((v) => !v)}
                className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  How to play Texas Hold&apos;em
                </span>
                <span className="text-white/60 text-xs">
                  {openHowPlay ? "−" : "+"}
                </span>
              </button>
              {openHowPlay && (
                <div className="px-1 space-y-1 text-white/70">
                  <p>
                    Each player gets 2 private cards. The table reveals up
                    to 5 shared community cards (flop, turn, river). You
                    build your best 5-card hand from any combo of your 2 +
                    the board.
                  </p>
                  <p>
                    Betting happens preflop, on the flop, turn, and river.
                    You can fold, call, or bet/raise when it&apos;s your
                    turn. If you make it to showdown, the best hand takes
                    the pot.
                  </p>
                </div>
              )}

              {/* Free play vs on-chain */}
              <button
                type="button"
                onClick={() => setOpenFreeOnchain((v) => !v)}
                className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  Free play vs on-chain
                </span>
                <span className="text-white/60 text-xs">
                  {openFreeOnchain ? "−" : "+"}
                </span>
              </button>
              {openFreeOnchain && (
                <div className="px-1 space-y-1 text-white/70">
                  <p>
                    Right now you&apos;re playing with{" "}
                    <span className="font-semibold">
                      free play BGRC chips
                    </span>
                    . Hands, pots, and rake are for fun and testing only.
                  </p>
                  <p>
                    When we go live, these same flows route real BGRC /
                    BGLD chips on Base, with a 5% capped rake feeding the
                    Base Gold Rush vault, jackpots, and community promos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CHAT */}
        <section className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Table Chat • BGRC Free Play Room
            </div>
            <div className="text-[10px] text-white/40">
              Messages are live across all connected players.
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-2 text-[11px] space-y-1">
            {chatMessages.length === 0 && (
              <div className="text-white/40">
                No messages yet. Type a message below and hit send to
                chat at the table.
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
              placeholder="Send a message to the table…"
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

      {/* BUY-IN MODAL */}
      {showBuyIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-[#FFD700]/50 bg-gradient-to-b from-black via-[#020617] to-black p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#FFD700]/80 mb-1">
              Buy-in
            </div>
            <h2 className="text-lg font-bold mb-1">
              Sit at the Base Gold Rush table
            </h2>
            <p className="text-[11px] text-white/60 mb-3">
              Choose a free play buy-in amount for this session. In live
              mode this will map to your BGRC / BGLD stack on Base.
            </p>

            <div className="space-y-2 mb-3">
              <label className="block text-xs text-white/60">
                Buy-in (free play credits)
              </label>
              <input
                type="number"
                min={100}
                max={chips}
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
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/45">
                Free play credits available:{" "}
                <span className="font-mono text-[#FFD700]">
                  {chips.toLocaleString()}
                </span>
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
                Sit with {Math.max(100, Math.floor(buyIn))}
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

        @keyframes glowPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        .seat-active-ring {
          animation: glowPulse 1.2s ease-out infinite;
        }

        @keyframes potPulse {
          0% {
            transform: translate(-50%, 0) scale(0.96);
          }
          50% {
            transform: translate(-50%, 0) scale(1.05);
          }
          100% {
            transform: translate(-50%, 0) scale(0.96);
          }
        }
        .pot-animate {
          animation: potPulse 1s ease-in-out infinite;
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

        /* Cleaner active seat ring */
        .seat-active-ring {
          box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.9);
          animation: seatPulse 1.4s ease-out infinite;
        }

        @keyframes seatPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.9);
            transform: translateY(0);
          }
          70% {
            box-shadow: 0 0 18px 4px rgba(56, 189, 248, 0);
            transform: translateY(-1px);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0);
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
