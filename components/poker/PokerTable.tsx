// components/casino/arcade/PokerRoomArcade.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
import React from "react";
import type { CSSProperties } from "react";
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
  roomId?: string;
};

type PokerCardProps = {
  card: string;
  highlight?: boolean;
  size?: "normal" | "small";
  delayIndex?: number;
  tilt?: number;
};

type SeatPosition = React.CSSProperties;
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
            alt={`PGLD ${d}`}
            width={w}
            height={h}
            className="rounded-full drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]"
          />
        );
      })}
    </div>
  );
}

// Small helper to format chip amounts
function formatChips(n: number | undefined | null) {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}



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



function PokerCard({
  card,
  highlight = false,
  size = "normal",
  delayIndex = 0,
  tilt = 0,
}: PokerCardProps) {
  const { rankLabel, suitLabel, suitColor } = parseCard(card);

  // Bigger, clean sizes – no weird h-18
  const baseSize =
    size === "small"
      ? "w-9 h-12 text-[10px] md:w-10 md:h-14 md:text-xs"
      : "w-12 h-16 text-sm md:w-14 md:h-20 md:text-base";

  const delay = `${0.05 * delayIndex}s`;

  return (
    <div
      className={`card-deal ${baseSize} rounded-xl bg-white flex flex-col justify-between px-1.5 py-1 border relative shadow-[0_6px_14px_rgba(0,0,0,0.55)] ${
        highlight
          ? "border-[#FFD700] shadow-[0_0_22px_rgba(250,204,21,0.9)]"
          : "border-slate-300"
      }`}
      style={{
        animationDelay: delay,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "50% 60%",
      }}
    >
      {/* subtle inner border for a clean edge */}
      <div className="pointer-events-none absolute inset-[1px] rounded-[10px] border border-slate-200/80" />

      {/* top rank / suit */}
      <div className="relative flex items-start justify-between">
        <span className="font-extrabold text-slate-900 leading-none">
          {rankLabel}
        </span>
        <span className={`text-[11px] md:text-xs ${suitColor}`}>
          {suitLabel}
        </span>
      </div>

      {/* big center pip */}
      <div className="relative flex flex-1 items-center justify-center">
        <span
          className={`leading-none ${suitColor} drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] text-xl md:text-2xl`}
        >
          {suitLabel}
        </span>
      </div>

      {/* bottom suit */}
      <div className="relative flex items-end justify-end">
        <span className={`text-[11px] md:text-xs ${suitColor}`}>
          {suitLabel}
        </span>
      </div>
    </div>
  );
}



// ───────────────── Seat ring positions ─────────────────

const RING_POSITIONS: CSSProperties[] = [
  // Seat 0 – top center
  { top: "3%", left: "50%", transform: "translate(-50%, 0)" },

  // Seat 1 – top-left
  { top: "14%", left: "11%" },

  // Seat 2 – top-right
  { top: "14%", right: "11%" },

  // Seat 3 – mid-left
  { top: "50%", left: "4%", transform: "translate(0,-50%)" },

  // Seat 4 – mid-right
  { top: "50%", right: "4%", transform: "translate(0,-50%)" },

  // Seat 5 – bottom-left
  { bottom: "16%", left: "11%" },

  // Seat 6 – bottom-right
  { bottom: "16%", right: "11%" },

  // Seat 7 – bottom inner-left
  { bottom: "4%", left: "34%" },

  // Seat 8 – bottom inner-right
  { bottom: "4%", right: "34%" },
];


const SEAT_RING_POSITIONS: CSSProperties[] = [
  // 0 – top center
  { top: "2%", left: "50%", transform: "translate(-50%, -40%)" },

  // 1 – top-left
  { top: "16%", left: "15%", transform: "translate(-50%, -50%)" },

  // 2 – top-right
  { top: "16%", right: "15%", transform: "translate(50%, -50%)" },

  // 3 – mid-left
  { top: "45%", left: "4%", transform: "translate(-50%, -50%)" },

  // 4 – mid-right
  { top: "45%", right: "4%", transform: "translate(50%, -50%)" },

  // 5 – bottom-left
  { bottom: "18%", left: "12%", transform: "translate(-50%, 50%)" },

  // 6 – bottom-right
  { bottom: "18%", right: "12%", transform: "translate(50%, 50%)" },

  // 7 – bottom mid-left
  { bottom: "3%", left: "30%", transform: "translate(-50%, 40%)" },

  // 8 – bottom mid-right
  { bottom: "3%", right: "30%", transform: "translate(50%, 40%)" },
];


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
      // ignore autoplay errors
    }
  };
}

// ───────────────── Main Component ─────────────────

export default function PokerRoomArcade({
  roomId = "bgld-holdem-room-1",
}: PokerRoomArcadeProps) {
  const { profile, chips, setChips } =
    usePlayerProfileContext() as any;

  // ───────────────── Stable playerId per device ─────────────────
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      let id = window.localStorage.getItem("pgld-poker-player-id");
      if (!id) {
        const rand =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto.randomUUID() || "").slice(0, 8)
            : Math.random().toString(36).slice(2, 10);

        id = `player-${rand}`;
        window.localStorage.setItem("pgld-poker-player-id", id);
      }
      setPlayerId(id);
    } catch {
      const fallback = "player-" + Math.random().toString(36).slice(2, 10);
      setPlayerId(fallback);
    }
  }, []);

  const effectivePlayerId = playerId ?? "player-pending";

  const { ready, messages, send } = usePokerRoom(
    roomId,
    effectivePlayerId
  );

  const sendMessage = (msg: any) => {
    (send as any)(msg);
  };

  const playDeal = useSound("/sounds/deal-card.mp3");
  const playChip = useSound("/sounds/chip.wav");
  const playWin = useSound("/sounds/win.wav");

  // Invite link
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

  // Derived state from messages
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

  const seatedCount = useMemo(
    () => seats.filter((s) => s.playerId).length,
    [seats]
  );
  // REAL MODE: Require 2+ players to start a hand
const MIN_PLAYERS_TO_START = 2;


  

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

  // Dealer logs
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

  // Simple blind level HUD
  const [tLevel] = useState(1);
  const [tBlinds] = useState<[number, number]>([25, 50]);
  const [tNextIn, setTNextIn] = useState<number>(180);

  useEffect(() => {
    const id = setInterval(() => {
      setTNextIn((prev) => {
        if (prev <= 1) return 180;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Track new hands + board for sounds/logs
  useEffect(() => {
    if (!table) return;

    if (handIdRef.current == null || table.handId !== handIdRef.current) {
      handIdRef.current = table.handId;
      streetRef.current = null;
      showdownHandRef.current = null;
      lastBoardCountRef.current = table.board.length;
      pushLog(`New hand #${table.handId} in the PGLD room.`);
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
          `Hand #${betting.handId} complete. Pot locked at ${betting.pot} PGLD chips.`
        );
      } else {
        pushLog(`Street: ${label}. Pot currently ${betting.pot}.`);
      }
    }
  }, [betting, playChip]);

  useEffect(() => {
    if (!showdown || !table) return;
    if (showdown.handId !== table.handId) return;
    if (showdownHandRef.current === showdown.handId) return;

    showdownHandRef.current = showdown.handId;
    playWin();
    pushLog("Showdown: revealing hands and sweeping the pot.");
  }, [showdown, table, playWin]);

  const boardCards = table?.board ?? [];
  const pot = betting?.pot ?? 0;
  const buttonSeatIndex = betting?.buttonSeatIndex ?? null;
  const currentSeatIndex = betting?.currentSeatIndex ?? null;

  const committedBySeat: Record<number, number> = {};
  if (betting) {
    for (const p of betting.players) {
      committedBySeat[p.seatIndex] = p.committed ?? 0;
    }
  }

  // Simple “side pot active” indicator
  const hasPotentialSidePot =
    !!betting &&
    betting.players.some(
      (p) =>
        p.inHand &&
        !p.hasFolded &&
        p.stack === 0 &&
        (p.committed > 0 || betting.pot > 0)
    );

  const [chatInput, setChatInput] = useState("");
  const [raiseSize, setRaiseSize] = useState<number>(0);
  const [manualBet, setManualBet] = useState<string>("");

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
          `${describeHero()} stands up and cashes out ${cashOut} PGLD chips.`
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
        `Not enough PGLD chips to sit with ${effBuyIn}. Adjust buy-in or reload.`
      );
      return;
    }
    setChips((c: number) => Math.max(0, c - effBuyIn));
    pushLog(`${describeHero()} sits down with ${effBuyIn} PGLD chips.`);
    sendMessage({
      type: "sit",
      name: profile?.name ?? "",
      buyIn: effBuyIn,
    } as any);
  }

  // Hero actions
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
    if (!isHeroTurn || !betting || !heroBetting) return;

    const callNeeded = Math.max(
      0,
      betting.maxCommitted - heroBetting.committed
    );

    const minRaise = betting.bigBlind * 2;

    let raiseDelta =
      manualBet.trim().length > 0
        ? Number(manualBet)
        : raiseSize > 0
        ? raiseSize
        : minRaise;

    if (!Number.isFinite(raiseDelta) || raiseDelta <= 0) {
      raiseDelta = minRaise;
    }

    raiseDelta = Math.max(minRaise, Math.floor(raiseDelta));

    const totalSpend = Math.min(
      heroBetting.stack,
      callNeeded + raiseDelta
    );

    pushLog(
      `${describeHero()} bets ${totalSpend} PGLD ` +
        `(call ${callNeeded}, raise ${raiseDelta}).`
    );

    sendMessage({
      type: "action",
      action: "bet",
      amount: raiseDelta,
    });
  }

  function handleAllIn() {
    if (!isHeroTurn || !betting || !heroBetting) return;
    const allInRaise = heroBetting.stack;
    setRaiseSize(allInRaise);
    setManualBet(String(allInRaise));
    pushLog(`${describeHero()} moves all-in.`);
    sendMessage({ type: "action", action: "bet", amount: allInRaise });
  }

  // Host manual deal (safety)
  function handleManualDeal() {
    if (!isHostClient) return;
    const noActiveHand =
      !betting || betting.street === "done" || !table;
    if (seatedCount < 2 || !noActiveHand) return;
    pushLog("Host deals the next hand.");
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

  // Collapsibles – start closed for mobile
  const [openHowRoom, setOpenHowRoom] = useState(false);
  const [openHowPlay, setOpenHowPlay] = useState(false);

  // Avatar initials
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

      const [isFullscreen, setIsFullscreen] = useState(false);

      // Lock body scroll when fullscreen
useEffect(() => {
  if (typeof document === "undefined") return;
  const original = document.body.style.overflow;
  if (isFullscreen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = original || "";
  }
  return () => {
    document.body.style.overflow = original || "";
  };
}, [isFullscreen]);



  // ───────────────── Game-level timers ─────────────────

  const [gameCountdown, setGameCountdown] = useState<number | null>(null);

  const ACTION_MS = 60000; // 60 seconds per decision
  const [actionDeadline, setActionDeadline] = useState<number | null>(
    null
  );
  const [now, setNow] = useState<number>(Date.now());

  const lastHandKeyRef = useRef<string | null>(null);
  const lastActionKeyRef = useRef<string | null>(null);

  // Global ticking clock
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Shared pre-hand countdown on all clients
  useEffect(() => {
    const noActiveHand =
      !betting || betting.street === "done" || !table;

    const handKey = betting
      ? `${betting.handId}-${betting.street}`
      : "none";

    if (seatedCount >= 2 && noActiveHand) {
      if (lastHandKeyRef.current !== handKey && gameCountdown === null) {
        lastHandKeyRef.current = handKey;
        setGameCountdown(60);
      }
    } else {
      if (gameCountdown !== null) {
        setGameCountdown(null);
      }
    }
  }, [seatedCount, betting, table, gameCountdown]);

  // Tick countdown locally on all clients
  useEffect(() => {
  if (gameCountdown === null) return;

  if (gameCountdown <= 0) {
    setGameCountdown(null);

    // ✅ Only auto-deal when:
    // - we have enough players
    // - no active hand (or finished)
    if (
      seatedCount >= MIN_PLAYERS_TO_START &&
      (!betting || betting.street === "done")
    ) {
      pushLog("Auto-dealing next hand for the table.");
      // Any seated client can safely fire this; server enforces handInProgress
      sendMessage({ type: "start-hand" });
    }

    return;
  }

  const id = setTimeout(
    () => setGameCountdown((c) => (c === null ? null : c - 1)),
    1000
  );
  return () => clearTimeout(id);
}, [gameCountdown, seatedCount, betting, sendMessage]);


  // Host auto-deals when countdown hits 0
  useEffect(() => {
  if (gameCountdown === null) return;

  if (gameCountdown <= 0) {
    setGameCountdown(null);

    // ✅ Only auto-deal when:
    // - we have enough players
    // - no active hand (or finished)
    if (
      seatedCount >= MIN_PLAYERS_TO_START &&
      (!betting || betting.street === "done")
    ) {
      pushLog("Auto-dealing next hand for the table.");
      // Any seated client can safely fire this; server enforces handInProgress
      sendMessage({ type: "start-hand" });
    }

    return;
  }

  const id = setTimeout(
    () => setGameCountdown((c) => (c === null ? null : c - 1)),
    1000
  );
  return () => clearTimeout(id);
}, [gameCountdown, seatedCount, betting, sendMessage]);


  // ───────────────── Time Bank ─────────────────

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
  }, [betting]);

  // Action timer + auto-fold
  useEffect(() => {
    if (!betting || !heroSeat) {
      setActionDeadline(null);
      lastActionKeyRef.current = null;
      return;
    }

    const key = `${betting.handId}-${betting.street}-${betting.currentSeatIndex}`;
    const heroTurnNow = isHeroTurn;

    if (!heroTurnNow) {
      setActionDeadline(null);
      lastActionKeyRef.current = key;
      return;
    }

    if (lastActionKeyRef.current !== key) {
      lastActionKeyRef.current = key;
      setActionDeadline(Date.now() + ACTION_MS);
    }
  }, [betting, heroSeat, isHeroTurn]);

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
    ? Math.max(0, Math.min(100, (actionRemainingMs / ACTION_MS) * 100))
    : 0;

  // Primary action label (check/call)
  let primaryActionLabel = "Check";
  if (betting && heroBetting) {
    const diff = betting.maxCommitted - heroBetting.committed;
    if (diff > 0) {
      primaryActionLabel = `Call ${diff}`;
    }
  }

  const canManualDeal =
  isHostClient &&
  seatedCount >= MIN_PLAYERS_TO_START &&
  (!betting || betting.street === "done");



  // ───────────────── Auto-check / Auto-fold / Sit-out ─────────────────

  const [autoCheck, setAutoCheck] = useState(false);
  const [autoFold, setAutoFold] = useState(false);
  const [isSittingOut, setIsSittingOut] = useState(false);

  useEffect(() => {
    if (!isHeroTurn || !betting || !heroBetting) return;

    const diff = betting.maxCommitted - heroBetting.committed;

    if (autoFold && diff > 0) {
      handleFold();
      setAutoFold(false);
      return;
    }

    if (autoCheck && diff === 0) {
      handlePrimaryAction();
    }
  }, [isHeroTurn, betting, heroBetting, autoCheck, autoFold]);

  useEffect(() => {
    if (!isSittingOut || !isHeroTurn) return;
    handleFold();
  }, [isSittingOut, isHeroTurn]);

   return (
  <>
    <div
      className={
        isFullscreen
          ? "space-y-0 pb-0 md:pb-0"
          : "space-y-6 pb-16 md:pb-4"
      }
    >
      {/* TABLE + SIDEBAR */}
      <section
        className={
          isFullscreen
            ? "grid gap-0 grid-cols-1"
            : "grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
        }
      >
        {/* TABLE */}
        <div
          className={`relative border border-[#FFD700]/40 bg-gradient-to-b from-black via-[#020617] to-black shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden ${
            isFullscreen
              ? // FULLSCREEN: cover viewport, sit above site header
                "fixed inset-0 z-[60] !rounded-none border-0 bg-black flex flex-col items-center justify-start px-2 md:px-4 py-10 md:py-14"
              : // NORMAL: card-style table container
                "rounded-3xl p-4 md:p-6"
          }`}
        >
          {/* Inner layout wrapper – keep table centered and wide in fullscreen */}
          <div
            className={
              isFullscreen
                ? "relative mx-auto flex h-full w-full max-w-[1120px] flex-col gap-3"
                : "relative"
            }
          >
            {/* Exit fullscreen button – floating above table, not over players */}
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="absolute right-0 top-[-2.5rem] md:top-[-3rem] z-50 rounded-full bg-black/90 border border-[#FFD700] px-4 py-1.5 text-[11px] font-semibold text-[#FFD700] shadow-[0_0_20px_rgba(0,0,0,0.9)]"
              >
                Exit fullscreen ✕
              </button>
            )}

            {/* Glow background */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0ea5e9]/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
            </div>

            {/* Header + Blind HUD – ONLY in non-fullscreen so they don't steal height */}
            {!isFullscreen && (
              <>
                {/* Header */}
                <div className="relative mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                      Base Gold Rush • Hold&apos;em Room
                    </div>
                    <div className="text-sm md:text-base text-white/80">
                      Room ID:{" "}
                      <span className="font-mono text-[#FFD700]/90">
                        {roomId}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-white/50">
                      Pot{" "}
                      <span className="font-mono text-[#FFD700]">
                        {pot.toLocaleString()}
                      </span>{" "}
                      •{" "}
                      <span className="font-mono">
                        {seatedCount}
                      </span>{" "}
                      {seatedCount === 1 ? "player" : "players"} at table
                    </div>

                    {table && (
                      <div className="text-[11px] text-white/50">
                        Hand #{table.handId}
                      </div>
                    )}

                    {betting && (
                      <div className="text-[11px] text-white/50">
                        Street: {betting.street}
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
                      WS:{" "}
                      <span className="font-mono">
                        {process.env.NEXT_PUBLIC_POKER_WS ??
                          "ws://localhost:8080"}
                      </span>
                    </div>

                    {/* Fullscreen toggle – only in non-fullscreen */}
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((v) => !v)}
                      className="mt-1 inline-flex items-center justify-end gap-1 rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px] text-white/70 hover:border-[#FFD700]"
                    >
                      Fullscreen table
                    </button>
                  </div>
                </div>

                {/* Blind HUD */}
                <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700]">
                      PGLD Cash Game
                    </span>
                    <span className="font-semibold text-white/70">
                      Blinds {tBlinds[0]}/{tBlinds[1]} PGLD
                    </span>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-3 text-white/50">
                    <span>
                      Blind timer{" "}
                      <span className="font-mono text-white/80">
                        {Math.floor(tNextIn / 60)}:
                        {(tNextIn % 60).toString().padStart(2, "0")}
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* MAIN FELT + TABLE AREA */}
            <div
              className={
                isFullscreen
                  ? "flex-1 flex w-full items-center justify-center"
                  : ""
              }
            >
              {/* FELT + TABLE wrapper */}
              <div
                className={
                  isFullscreen
                    ? "relative mx-auto mt-1 w-full max-w-[1100px] h-[62vh] [perspective:1600px]"
                    : "relative mx-auto mt-2 w-full max-w-[980px] aspect-[10/16] md:aspect-[16/9] [perspective:1600px]"
                }
              >
                {/* Countdown pill (if you want it) */}
                {gameCountdown !== null && (
                  <div className="absolute -top-3 right-4 z-40 md:-top-4">
                    <div className="flex items-center gap-1 rounded-full border border-[#FFD700]/70 bg-black/90 px-2.5 py-0.5 text-[9px] shadow-[0_0_18px_rgba(0,0,0,0.9)]">
                      <span className="uppercase tracking-[0.16em] text-white/55">
                        Next
                      </span>
                      <span className="text-sm font-extrabold tabular-nums text-[#FFD700] leading-none">
                        {gameCountdown}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3D group */}
                <div className="absolute inset-0 [transform:rotateX(18deg)] [transform-style:preserve-3d]">
                  {/* Outer rail */}
                  <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_top,#4b2f1a_0,#2b1a0d_50%,#050509_100%)] shadow-[0_26px_90px_rgba(0,0,0,1)]">
                    <div className="absolute inset-x-[14%] top-[6%] h-5 rounded-full bg-gradient-to-b from-white/18 to-transparent blur-md opacity-80" />
                  </div>

                  {/* Inner felt */}
                  <div className="absolute inset-[7%] md:inset-[6%] origin-center scale-y-[0.96] md:scale-y-[0.9] rounded-[999px] border border-emerald-400/45 bg-[radial-gradient(circle_at_top,#15803d_0,#065f46_40%,#022c22_70%,#020617_100%)] shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden">
                    {/* Felt texture */}
                    <div className="pointer-events-none absolute inset-0 bg-[url('/felt/felt-texture.png')] mix-blend-soft-light opacity-[0.16]" />

                    {/* Center logo */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="flex translate-y-2 flex-col items-center md:translate-y-1">
                        <div className="mb-1 opacity-85">
                          <Image
                            src="/felt/bgrc-logo.png"
                            alt="Base Gold Rush"
                            width={260}
                            height={260}
                            className="mx-auto object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.6)]"
                          />
                        </div>
                        <div className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#FFD700]/90 md:text-[10px]">
                          PGLD POKER ROOM
                        </div>
                      </div>
                    </div>

                    {/* TOTAL POT */}
                    {(pot > 0 || betting?.street === "done") && (
                      <div className="pointer-events-none absolute left-1/2 top-[26%] flex -translate-x-1/2 flex-col items-center gap-1">
                        {pot > 0 && (
                          <div className="flex items-center gap-2 rounded-full border border-[#FFD700]/80 bg-black/85 px-3 py-1 text-[11px] font-mono shadow-[0_0_22px_rgba(0,0,0,0.9)]">
                            <span className="font-semibold text-[#FFD700]">
                              Total Pot {pot.toLocaleString()} PGLD
                            </span>
                            {hasPotentialSidePot && (
                              <span className="text-[10px] text-amber-300">
                                • Side pots active
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Board cards */}
                    <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-2 px-2 md:-translate-y-1">
                      <div className="flex gap-1.5">
                        {boardCards.map((c, i) => {
                          const tilts = [-6, -3, 0, 3, 6];
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

                    {/* SHOWDOWN */}
                    {showdown &&
                      table &&
                      showdown.handId === table.handId && (
                        <div className="pointer-events-none absolute left-1/2 top-[16%] flex -translate-x-1/2 flex-col items-center gap-0.5 text-[9px] md:text-[10px]">
                          <div className="rounded-full bg-black/80 px-2.5 py-0.5 font-semibold text-emerald-300 shadow-md shadow-black/80">
                            Showdown • Pot {pot.toLocaleString()} PGLD
                          </div>
                          {Array.isArray(showdown.players) &&
                            showdown.players
                              .filter((p) => p.isWinner)
                              .map((p) => (
                                <div
                                  key={p.playerId + p.seatIndex}
                                  className="rounded-full bg-black/65 px-2.5 py-0.5 text-amber-100 shadow shadow-black/70"
                                >
                                  Seat {p.seatIndex + 1} wins — {p.rankName}
                                </div>
                              ))}
                        </div>
                      )}
                  </div>

                  {/* SEATS ON BUMPER – hero anchored bottom-center */}
                  <div className="absolute inset-[1.5%] text-[10px] text-white/80 md:text-[11px]">
                    {seats
                      .filter((s) => s.playerId)
                      .map((seat) => {
                        const label =
                          seat.playerId && seat.name
                            ? seat.name
                            : seat.playerId
                            ? seat.playerId
                            : `Seat ${seat.seatIndex + 1}`;

                        const isHeroSeat = seat.playerId === playerId;
                        const isWinnerSeat =
                          !!showdown &&
                          !!table &&
                          showdown.handId === table.handId &&
                          showdown.players.some(
                            (p) =>
                              p.isWinner && p.seatIndex === seat.seatIndex
                          );
                        const isButton =
                          buttonSeatIndex === seat.seatIndex;

                        const committed =
                          betting?.players.find(
                            (p) => p.seatIndex === seat.seatIndex
                          )?.committed ??
                          committedBySeat[seat.seatIndex] ??
                          0;

                        const isCurrentTurn =
                          currentSeatIndex === seat.seatIndex &&
                          betting?.street !== "done";

                        const basePos =
                          SEAT_RING_POSITIONS[seat.seatIndex] ??
                          SEAT_RING_POSITIONS[
                            SEAT_RING_POSITIONS.length - 1
                          ];

                        const heroPos: React.CSSProperties = {
                          left: "50%",
                          bottom: "-10%",
                          transform: "translate(-50%, 0)",
                        };

                        const stylePos: React.CSSProperties = isHeroSeat
                          ? heroPos
                          : basePos;

                        const ringAngle =
                          isCurrentTurn && actionRemainingMs != null
                            ? 360 * (1 - actionPct / 100)
                            : 0;

                        const isOut =
                          betting?.players.some(
                            (p) =>
                              p.seatIndex === seat.seatIndex &&
                              (!p.inHand || p.hasFolded)
                          ) ?? false;

                        const showHeroCards =
                          isHeroSeat && heroHand && heroHand.length > 0;

                        return (
                          <div
                            key={seat.seatIndex}
                            className={`absolute flex flex-col items-center gap-1 ${
                              isHeroSeat
                                ? "origin-bottom scale-[0.9] md:scale-100"
                                : ""
                            }`}
                            style={stylePos}
                          >
                            {isButton && (
                              <div className="rounded-full bg-[#FFD700] px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                                D
                              </div>
                            )}

                            {/* Card fan – smaller and visually attached to avatar, not on main felt */}
<div className="mb-0 flex justify-center gap-[3px] -translate-y-[2px]">
  {showHeroCards ? (
    <div className="flex gap-[3px] origin-bottom scale-[0.75] md:scale-[0.8]">
      {heroHand!.map((c, i) => {
        const tilts = [-10, 10];       // softer fan
        const offset = i === 0 ? -6 : 6;
        return (
          <div
            key={`${table?.handId ?? 0}-hero-seat-${i}-${c}`}
            className="relative"
            style={{
              transform: `translateX(${offset}px) rotate(${tilts[i] ?? 0}deg)`,
              transformOrigin: "50% 85%",
            }}
          >
            <PokerCard card={c} highlight delayIndex={i} />
          </div>
        );
      })}
    </div>
  ) : (
    // Non-hero seats: tiny backs so it's clear they’re private, not board
    [0, 1].map((i) => (
      <div
        key={i}
        className={`h-4 w-2.5 rounded-[3px] border border-white/20 bg-gradient-to-br from-slate-200 to-slate-400 shadow shadow-black/80 ${
          i === 1
            ? "-translate-x-[3px] rotate-[6deg]"
            : "rotate-[-6deg]"
        } ${isOut ? "opacity-30" : "opacity-90"}`}
      />
    ))
  )}
</div>


                            {/* Avatar + timer ring */}
                            <div className="relative flex h-10 w-10 items-center justify-center md:h-11 md:w-11">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  padding: "2px",
                                  background: isCurrentTurn
                                    ? `conic-gradient(
                                        #22c55e 0deg,
                                        #22c55e ${ringAngle * 0.4}deg,
                                        #eab308 ${ringAngle * 0.7}deg,
                                        #ef4444 ${ringAngle}deg,
                                        rgba(15,23,42,0.9) ${ringAngle}deg 360deg
                                      )`
                                    : "radial-gradient(circle, rgba(148,163,184,0.4), rgba(15,23,42,0.9))",
                                }}
                              >
                                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/25 bg-slate-900 shadow-[0_0_8px_rgba(0,0,0,0.9)]">
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
                                      alt="PGLD"
                                      width={22}
                                      height={22}
                                      className="object-contain"
                                    />
                                  )}
                                </div>
                              </div>

                              {isWinnerSeat && (
                                <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-emerald-500 px-2 py-[1px] text-[8px] font-bold text-black shadow shadow-black/70">
                                  WINNER
                                </div>
                              )}
                            </div>

                            {/* Per-seat committed chips */}
                            {committed > 0 && (
                              <div className="-mt-1 flex flex-col items-center gap-[2px]">
                                <ChipStack amount={committed} size={18} />
                                <div className="rounded-full bg-black/75 px-2 py-[1px] text-[9px] text-amber-100 shadow shadow-black/80">
                                  {formatChips(committed)}
                                </div>
                              </div>
                            )}

                            {/* Stack + name */}
                            <div className="mt-[2px] rounded-full bg-black/70 px-2 py-[1px] text-[9px] text-sky-100 shadow shadow-black/60">
                              {formatChips(
                                betting?.players.find(
                                  (p) =>
                                    p.seatIndex === seat.seatIndex
                                )?.stack ?? seat.chips
                              )}{" "}
                              PGLD
                            </div>

                            <div className="text-[9px] text-white/70">
                              {label}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero action bar – thin + wide */}
            <div
              className={`mt-3 rounded-2xl border border-white/20 bg-black/80 px-3 py-2 text-[11px] text-white/70 ${
                isFullscreen ? "w-full max-w-[980px] mx-auto" : ""
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">
                    {describeHero()}
                  </span>
                  {heroBetting && (
                    <span className="rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px]">
                      Stack:{" "}
                      <span className="font-mono text-[#FFD700]">
                        {heroBetting.stack} PGLD
                      </span>
                    </span>
                  )}
                  <span className="rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px]">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} PGLD
                    </span>
                  </span>
                  {isSittingOut && (
                    <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                      Sitting out (auto-fold)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  {isHeroTurn && actionSeconds !== null && (
                    <span className="font-mono text-[#FFD700]">
                      Action: {actionSeconds}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleUseTimeBank}
                    disabled={
                      !isHeroTurn || !actionDeadline || timeBankUsed
                    }
                    className="rounded-full border border-sky-400/60 bg-black/70 px-2.5 py-1 text-[10px] text-sky-300 disabled:opacity-40"
                  >
                    {timeBankUsed
                      ? "Time bank used"
                      : `Time bank +${TIME_BANK_SECONDS}s`}
                  </button>
                </div>
              </div>

              {/* Status + action timer bar */}
              <div className="mt-1 space-y-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <span className="font-semibold text-white/60">
                    {!betting || betting.street === "done" ? (
                      showdown &&
                      table &&
                      showdown.handId === table.handId ? (
                        "Hand complete. Showdown above."
                      ) : (
                        "Waiting for next hand. Sit and watch the countdown."
                      )
                    ) : !heroSeat || !heroBetting ? (
                      "Sit to join the action."
                    ) : isSittingOut ? (
                      "You are sitting out."
                    ) : !isHeroTurn ? (
                      "Waiting for other players…"
                    ) : (
                      "Your turn."
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                    <label className="inline-flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={autoCheck}
                        onChange={(e) =>
                          setAutoCheck(e.target.checked)
                        }
                        className="h-3 w-3"
                      />
                      <span>Auto-check</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={autoFold}
                        onChange={(e) =>
                          setAutoFold(e.target.checked)
                        }
                        className="h-3 w-3"
                      />
                      <span>Auto-fold</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSittingOut((v) => !v)}
                      disabled={!heroSeat}
                      className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] hover:border-[#FFD700] disabled:opacity-40"
                    >
                      {isSittingOut ? "Sit in" : "Sit out"}
                    </button>
                  </div>
                </div>
                {isHeroTurn && (
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 transition-[width] duration-250"
                      style={{ width: `${actionPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Buttons + raise controls – compact, GG style */}
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSitOrStand}
                    disabled={!ready}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {heroSeat ? "Stand Up" : "Sit at Table"}
                  </button>

                  {/* Deal Next Hand – only host, only when allowed */}
                  {canManualDeal && isHostClient && (
                    <button
                      onClick={handleManualDeal}
                      className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-400"
                    >
                      Deal Next Hand
                    </button>
                  )}

                  <button
                    onClick={handleFold}
                    disabled={!isHeroTurn}
                    className="min-w-[80px] flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-red-400 disabled:opacity-40"
                  >
                    Fold
                  </button>
                  <button
                    onClick={handlePrimaryAction}
                    disabled={!isHeroTurn}
                    className="min-w-[80px] flex-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-40"
                  >
                    {primaryActionLabel}
                  </button>
                  <button
                    onClick={handleBet}
                    disabled={!isHeroTurn || !betting || !heroBetting}
                    className="min-w-[80px] flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {(() => {
                      if (!betting || !heroBetting) return "Bet";
                      const callNeeded = Math.max(
                        0,
                        betting.maxCommitted - heroBetting.committed
                      );
                      const minRaise = betting.bigBlind * 2;
                      const rawRaise =
                        manualBet.trim().length > 0
                          ? Number(manualBet)
                          : raiseSize > 0
                          ? raiseSize
                          : minRaise;
                      const raiseDelta = Math.max(
                        minRaise,
                        Number.isFinite(rawRaise) && rawRaise > 0
                          ? Math.floor(rawRaise)
                          : minRaise
                      );
                      const total = callNeeded + raiseDelta;
                      return `Bet ${total} PGLD`;
                    })()}
                  </button>
                </div>

                {betting && (
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-white/45">
                      <span>Raise amount</span>
                      <span className="font-mono text-[#FFD700]">
                        {manualBet.trim() !== ""
                          ? manualBet
                          : raiseSize > 0
                          ? raiseSize
                          : betting.bigBlind * 2}{" "}
                        PGLD
                      </span>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={betting.bigBlind * 2}
                      max={Math.max(
                        betting.bigBlind * 8,
                        betting.pot || betting.bigBlind * 4
                      )}
                      step={betting.bigBlind}
                      value={raiseSize || betting.bigBlind * 2}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRaiseSize(v);
                        setManualBet("");
                      }}
                      className="w-full accent-[#FFD700]"
                    />

                    {/* Presets + all-in + manual pill */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
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
                      <button
                        type="button"
                        onClick={handleAllIn}
                        disabled={!isHeroTurn || !heroBetting}
                        className="rounded-full border border-red-400/70 px-2 py-0.5 text-red-300 hover:border-red-300 disabled:opacity-40"
                      >
                        All-in
                      </button>

                      {/* Compact manual amount pill */}
                      <div className="flex items-center gap-1">
                        <span className="text-white/50">Manual</span>
                        <input
                          type="number"
                          min={betting.bigBlind * 2}
                          value={manualBet}
                          onChange={(e) =>
                            setManualBet(e.target.value)
                          }
                          className="w-20 rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px] outline-none focus:border-[#FFD700]"
                        />
                        <button
                          type="button"
                          onClick={() => setManualBet("")}
                          className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] hover:border-[#FFD700]"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dealer log + tagline – HIDDEN in fullscreen */}
            {!isFullscreen && (
              <>
                <div className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[11px]">
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
                      Waiting for players. Sit, watch the countdown, and play.
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

                <div className="relative mt-3 text-[11px] font-semibold text-white/40">
                  Seats, blinds, betting, showdown, and chat are all synced live
                  for every player.
                </div>
              </>
            )}
          </div>
        </div>

        {/* SIDEBAR – HIDE in fullscreen */}
        {!isFullscreen && (
          <div className="space-y-4">
            {/* Player profile summary */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    Player Profile
                  </div>
                  <div className="text-[11px] text-white/50">
                    This name & avatar show at the table.
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
                  <Link
                    href="/profile"
                    className="rounded-full border border-[#FFD700]/70 bg-black/70 px-3 py-1 text-[11px] font-semibold text-[#FFD700] hover:bg-[#111827]"
                  >
                    Edit profile →
                  </Link>
                </div>

                {profile?.bio && (
                  <p className="line-clamp-3 text-white/60">
                    {profile.bio}
                  </p>
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

              {/* PGLD credits */}
              <div className="mt-2 border-t border-white/10 pt-2">
                <div className="space-y-1.5">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/50">
                    PGLD Chips
                  </div>
                  <div className="text-sm font-semibold text-white/80">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} PGLD
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45">
                    Sitting takes a PGLD chip buy-in from this bankroll; standing
                    adds your stack back.
                  </p>
                </div>
              </div>
            </div>

            {/* Room controls + invite */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                Room & Invites
              </div>
              <p className="text-[11px] text-white/60">
                Each device or browser = one seat. Share this link and play live
                together.
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

            {/* Info blocks */}
            <div className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-[11px]">
              {/* Table basics */}
              <button
                type="button"
                onClick={() => setOpenHowRoom((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  Table basics
                </span>
                <span className="text-xs text-white/60">
                  {openHowRoom ? "−" : "+"}
                </span>
              </button>
              {openHowRoom && (
                <div className="px-1 space-y-1 text-white/70">
                  <p>
                    6–9 seat PGLD Hold&apos;em cash game. Chips, action order, and
                    hands are synced for every player.
                  </p>
                  <p>
                    Each browser connects as a unique player with their own stack
                    and bankroll.
                  </p>
                </div>
              )}

              {/* Hold'em quick rules */}
              <button
                type="button"
                onClick={() => setOpenHowPlay((v) => !v)}
                className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  Hold&apos;em quick rules
                </span>
                <span className="text-xs text-white/60">
                  {openHowPlay ? "−" : "+"}
                </span>
              </button>
              {openHowPlay && (
                <div className="px-1 space-y-1 text-white/70">
                  <p>
                    You get 2 hole cards. Up to 5 community cards hit the board
                    (flop, turn, river). Best 5-card hand wins.
                  </p>
                  <p>
                    Bet preflop, on the flop, turn, and river. You can fold, call,
                    or bet/raise when it&apos;s your turn.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CHAT – hide in fullscreen to maximize felt */}
      {!isFullscreen && (
        <section className="rounded-2xl border border-white/15 bg-gradient-to-b from-[#020617] to-black p-4 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Table Chat • PGLD Poker Room
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
      )}
    </div>

    {/* BUY-IN MODAL (unchanged) */}
    {showBuyIn && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="w-full max-w-sm rounded-2xl border border-[#FFD700]/50 bg-gradient-to-b from-black via-[#020617] to-black p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-[#FFD700]/80">
            Buy-in
          </div>
          <h2 className="mb-1 text-lg font-bold">
            Sit at the Base Gold Rush table
          </h2>
          <p className="mb-3 text-[11px] text-white/60">
            Choose your PGLD chip buy-in amount for this session.
          </p>

          <div className="mb-3 space-y-2">
            <label className="block text-xs text-white/60">
              Buy-in (PGLD chips)
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
                  {preset.toLocaleString()} PGLD
                </button>
              ))}
            </div>
            <div className="text-[11px] text-white/45">
              PGLD chips available:{" "}
              <span className="font-mono text-[#FFD700]">
                {chips.toLocaleString()} PGLD
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
              Sit with {Math.max(100, Math.floor(buyIn))} PGLD
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);



    
  


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
      `}</style>
  
}
