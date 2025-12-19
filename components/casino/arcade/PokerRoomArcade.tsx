// components/casino/arcade/PokerRoomArcade.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
  CSSProperties,
} from "react";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePokerRoom } from "@/lib/pokerClient/usePokerRoom";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import { getHandHelper, HandHelper } from '@/lib/poker/handHelper';
import PokerCard from "@/components/poker/PokerCard";








/* ───────────────── Types ───────────────── */

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

  // NEW: server-supplied blind positions
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
  roomId?: string;
};

type PokerCardProps = {
  card: string;
  highlight?: boolean;
  size?: "normal" | "small";
  delayIndex?: number;
  tilt?: number;
  isBack?: boolean;
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

function breakdownChips(amount: number): number[] {
  const chips: number[] = [];
  let remaining = Math.max(0, Math.floor(amount));
  const maxChips = 6; // keep stack short

  for (const d of CHIP_DENOMS) {
    while (remaining >= d && chips.length < maxChips) {
      chips.push(d);
      remaining -= d;
    }
    if (chips.length >= maxChips) break;
  }

  if (chips.length === 0 && amount > 0) {
    chips.push(1);
  }

  return chips;
}

function ChipStack({ amount, size = 32 }: { amount: number; size?: number }) {
  if (!amount || amount <= 0) return null;

  const chips = breakdownChips(amount);
  if (chips.length === 0) return null;

  const scale = 0.9;

  return (
    <div className="flex flex-col-reverse items-center -space-y-1">
      {chips.map((d, i) => {
        const src = CHIP_SOURCES[d];
        if (!src) return null;

        const w = size * scale;
        const h = size * scale;

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




export function formatChips(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";

  // Show 1.2k, 15.4k, 1.3M, etc – but never collapse into a fixed label
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




/* ───────────────── Card rendering ───────────────── */

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








// EVEN SPACING RING (3 bottom, 3 left, 3 right, no top seats)

const SEAT_GEOMETRY_PC: React.CSSProperties[] = [
  // Bottom row (tighter + symmetric)
  { bottom: "6%", left: "50%", transform: "translate(-50%, 0)" }, // 0 HERO
  { bottom: "6%", left: "31%", transform: "translate(-50%, 0)" }, // 1 bottom-left
  { bottom: "6%", left: "67%", transform: "translate(-50%, 0)" }, // 2 bottom-right

  // Left side (uniform Y steps)
  { top: "80%", left: "16%", transform: "translate(-50%, -50%)" }, // 3 left-low
  { top: "49%", left: "7%",  transform: "translate(-50%, -50%)" }, // 4 left-mid
  { top: "20%", left: "16%", transform: "translate(-50%, -50%)" }, // 5 left-high

  // Right side (mirror of left)
  { top: "80%", right: "16%", transform: "translate(50%, -50%)" }, // 6 right-low
  { top: "49%", right: "7%",  transform: "translate(50%, -50%)" }, // 7 right-mid
  { top: "20%", right: "16%", transform: "translate(50%, -50%)" }, // 8 right-high
];

const SEAT_GEOMETRY_MOBILE: React.CSSProperties[] = [
  // Bottom row (slightly wider for thumbs)
  { bottom: "6%", left: "50%", transform: "translate(-50%, 0)" }, // 0 HERO
  { bottom: "12%", left: "20%", transform: "translate(-50%, 0)" }, // 1 bottom-left
  { bottom: "12%", left: "81%", transform: "translate(-50%, 0)" }, // 2 bottom-right

  // Left side (uniform Y steps)
  { top: "63%", left: "10%", transform: "translate(-50%, -50%)" }, // 3 left-low
  { top: "40%", left: "9%",  transform: "translate(-50%, -50%)" }, // 4 left-mid
  { top: "16%", left: "18%", transform: "translate(-50%, -50%)" }, // 5 left-high

  // Right side (mirror)
  { top: "63%", right: "10%", transform: "translate(50%, -50%)" }, // 6 right-low
  { top: "40%", right: "9%",  transform: "translate(50%, -50%)" }, // 7 right-mid
  { top: "16%", right: "18%", transform: "translate(50%, -50%)" }, // 8 right-high
];





// Fill order AFTER hero:
// PC + Mobile: left of hero, right of hero, then alternate outward
// (slot indices based on the geometry arrays above)
const SLOT_FILL_PC = [0, 1, 2, 3, 6, 4, 7, 5, 8];
const SLOT_FILL_MOBILE = [0, 1, 2, 3, 6, 4, 7, 5, 8];





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

/* ───────────────── Main component ───────────────── */

export default function PokerRoomArcade({
  roomId = "bgld-holdem-room-1",
}: PokerRoomArcadeProps) {
  const { profile, chips, setChips } = usePlayerProfileContext() as any;

  // Stable playerId per device
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

  const [joinedMidHand, setJoinedMidHand] = useState(false);


  

  const effectivePlayerId = playerId ?? "player-pending";

  const { ready, messages, send } = usePokerRoom(roomId, effectivePlayerId);
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

  /* ───────────────── Derived state from WS messages ───────────────── */

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

  const MIN_PLAYERS_TO_START = 2;

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

    const handInProgress = !!betting && betting.street !== "done";

  const rawHeroBetting = useMemo(() => {
  if (!betting) return null;
  return betting.players.find((p) => p.playerId === playerId) ?? null;
}, [betting, playerId]);

const heroBetting =
  joinedMidHand && handInProgress ? null : rawHeroBetting;

const heroHand = useMemo(() => {
  if (!table) return null;
  if (joinedMidHand && handInProgress) return null; // hide cards until next hand
  const hero = table.players.find((p) => p.playerId === playerId);
  return hero?.holeCards ?? null;
}, [table, playerId, joinedMidHand, handInProgress]);

const heroHandHelper = useMemo<HandHelper | null>(() => {
  if (!table) return null;
  if (!heroHand || heroHand.length < 2) return null;
  if (!Array.isArray(table.board) || table.board.length < 3) return null; // only from flop
  return getHandHelper(heroHand, table.board);
}, [table, heroHand]);

const heroTurnPrevRef = useRef(false);

// Default buy-in for this room (used for auto top-up + modal default)
const DEFAULT_BUYIN = 500; // or 1000, whatever you prefer





// Is hero actually in this hand (dealt cards and not folded)?
const heroIsInHand =
  !!heroBetting && heroBetting.inHand && !heroBetting.hasFolded;


const isHeroTurn: boolean =
  !!betting &&
  !!heroSeat &&
  !!heroBetting &&
  betting.currentSeatIndex === heroSeat.seatIndex &&
  betting.street !== "done";


  useEffect(() => {
  if (typeof window === 'undefined') return; // SSR guard

  const wasHeroTurn = heroTurnPrevRef.current;

  // only vibrate on the moment it becomes your turn
  if (!wasHeroTurn && isHeroTurn && 'vibrate' in window.navigator) {
    // optional: only vibrate on smaller screens
    if (window.innerWidth <= 768) {
      window.navigator.vibrate(35); // 35ms buzz
    }
  }

  heroTurnPrevRef.current = isHeroTurn;
}, [isHeroTurn]);

const heroHasAction =
  !!heroSeat && !!betting && betting.street !== "done" && !!heroBetting;

    const heroShowdown = useMemo(() => {
    if (!showdown || !table) return null;
    if (showdown.handId !== table.handId) return null;

    return (
      showdown.players.find((p) => p.playerId === playerId) ?? null
    );
  }, [showdown, table, playerId]);




  // Show the hero action bar only when it's actually our turn in an active hand
  const showHeroBar =
    !!heroSeat &&
  heroIsInHand &&
  betting &&
  betting.street !== "done" && isHeroTurn;

  /* ───────────────── Dealer log ───────────────── */

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
      const next: DealerLogEntry[] = [{ id, text, ts: Date.now() }, ...prev];
      return next.slice(0, 24);
    });
  };

  const describeHero = () => {
    const nm = profile?.name ?? "";
    if (nm.trim().length > 0) return nm.trim();
    if (heroSeat?.name) return heroSeat.name;
    return "You";
  };

  /* ───────────────── Blind HUD (static for now) ───────────────── */

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

   /* ───────────────── Table / showdown tracking ───────────────── */
  const [showLeaders, setShowLeaders] = useState(false);
  const [revealHeroHand, setRevealHeroHand] = useState(false);

  // Track table / hand transitions + deal sounds
  useEffect(() => {
    if (!table) return;

    if (handIdRef.current == null || table.handId !== handIdRef.current) {
  handIdRef.current = table.handId;
  streetRef.current = null;
  showdownHandRef.current = null;
  lastBoardCountRef.current = table.board.length;
  setRevealHeroHand(false);

 

  // If you had joined mid-hand before, clear that once the new hand begins
  setJoinedMidHand(false);

  // Clear any manually revealed hole cards from prior hands
  setRevealedHoles({});

  pushLog(`New hand #${table.handId} in the PGLD room.`);
  playDeal();
}


    const count = table.board.length;
    if (count > lastBoardCountRef.current) {
      playDeal();
    }
    lastBoardCountRef.current = count;
  }, [table, playDeal]);

  // Pot change sound + street logging
  useEffect(() => {
    if (!betting) return;

    // 1) Chip sound when pot increases
    if (betting.pot > lastPotRef.current) {
      playChip();
    }
    lastPotRef.current = betting.pot;

    // 2) Street logging
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

  // Showdown tracking
  useEffect(() => {
  if (!showdown || !table) return;
  if (showdown.handId !== table.handId) return;

  // Only process each showdown once
  if (showdownHandRef.current === showdown.handId) return;
  showdownHandRef.current = showdown.handId;

  playWin();
  pushLog("Showdown: revealing hands and sweeping the pot.");

  // GG-style mini leaderboard: track winners for last ~10 hands
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
          name: seatMeta?.name,
          rankName: p.rankName,
          timestamp: now,
        };
      });

    if (additions.length > 0) {
      setWinners((prev) => {
        const merged = [...additions, ...prev];
        return merged.slice(0, 10);
      });
    }
  }

  // 🔥 AUTO-DEAL: host fires next hand 30s after showdown
  if (isHostClient && seatedCount >= MIN_PLAYERS_TO_START) {
    // Clear any previous pending auto-deal
    if (autoDealTimeoutRef.current != null) {
      clearTimeout(autoDealTimeoutRef.current);
      autoDealTimeoutRef.current = null;
    }

    pushLog("Auto-deal armed: next hand will start in 30 seconds.");

    autoDealTimeoutRef.current = window.setTimeout(() => {
      // Safety re-check in case table state changed
      if (isHostClient && seatedCount >= MIN_PLAYERS_TO_START) {
        sendMessage({ type: "start-hand" });
        pushLog("Auto-deal: next hand starting in the PGLD room.");
      }
      autoDealTimeoutRef.current = null;
    }, 10_000);
  }
}, [showdown, table, playWin, seats, isHostClient, seatedCount, sendMessage]);

const gameStarted = !!table; 
// or stricter: !!table && typeof table.handId === "number"


  const boardCards = table?.board ?? [];

  const buttonSeatIndex = betting?.buttonSeatIndex ?? null;
  const currentSeatIndex = betting?.currentSeatIndex ?? null;

  

 
   // -----------------------------
  // Betting display helpers
  // -----------------------------

  // Per-hand total contributed (stays visible the whole hand)
const totalBySeat: Record<number, number> = useMemo(() => {
  const map: Record<number, number> = {};
  if (!betting?.players) return map;

  for (const p of betting.players) {
    // prefer server field; fallback to committed if older server
    const total = Number((p as any).totalContributed ?? 0);
    map[p.seatIndex] = total;
  }
  return map;
}, [betting]);

// Per-street committed (in front on this street)
const committedBySeat: Record<number, number> = useMemo(() => {
  const map: Record<number, number> = {};
  if (!betting?.players) return map;

  for (const p of betting.players) {
    map[p.seatIndex] = Number(p.committed ?? 0);
  }
  return map;
}, [betting]);


  // Single pot source of truth (server pot should already match sum(totalContributed))
  const pot = useMemo(() => {
    const serverPot = typeof betting?.pot === "number" ? betting.pot : 0;
    const handPot = Object.values(totalBySeat).reduce((sum, v) => sum + (v ?? 0), 0);
    if (serverPot > 0 && handPot > 0) return Math.max(serverPot, handPot);
    return serverPot > 0 ? serverPot : handPot;
  }, [betting?.pot, totalBySeat]);

  // Side-pot hint (keep your logic, but use totalContributed instead of committed)
  const hasPotentialSidePot =
    !!betting &&
    betting.players.some(
      (p) =>
        p.inHand &&
        !p.hasFolded &&
        p.stack === 0 &&
        ((p.totalContributed ?? 0) > 0 || (betting.pot ?? 0) > 0)
    );

  // -----------------------------
  // Hand transitions
  // -----------------------------

  // Track previous "hand done" state so we trigger auto-deal exactly once per hand end
  const prevHandDoneRef = useRef<boolean>(false);

  // Keep latest host + seat count in refs to avoid stale closure in setTimeout
  const hostRef = useRef<boolean>(false);
  const seatedCountRef = useRef<number>(0);

  useEffect(() => {
    hostRef.current = isHostClient;
    seatedCountRef.current = seatedCount;
  }, [isHostClient, seatedCount]);

 

  useEffect(() => {
    const isDone = !!betting && betting.street === "done";
    const wasDone = prevHandDoneRef.current;

    // transition: not-done -> done
    if (isDone && !wasDone) {
      // clear any prior timer
      if (autoDealTimeoutRef.current != null) {
        clearTimeout(autoDealTimeoutRef.current);
        autoDealTimeoutRef.current = null;
      }

      // Arm next hand after 10s (you said you want 10s)
      const AUTO_DEAL_DELAY_MS = 10_000;

      // Optional: log once
      pushLog(`Hand complete. Next hand starts in ${Math.floor(AUTO_DEAL_DELAY_MS / 1000)}s.`);

      autoDealTimeoutRef.current = window.setTimeout(() => {
        // re-check with fresh refs (no stale closure)
        if (!hostRef.current) return;
        if (seatedCountRef.current < MIN_PLAYERS_TO_START) return;

        sendMessage({ type: "start-hand" });
        pushLog("Auto-deal: starting next hand.");
        autoDealTimeoutRef.current = null;
      }, AUTO_DEAL_DELAY_MS);
    }

    prevHandDoneRef.current = isDone;
  }, [betting?.street, betting?.handId]); // minimal deps so it doesn't re-arm constantly

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDealTimeoutRef.current != null) {
        clearTimeout(autoDealTimeoutRef.current);
        autoDealTimeoutRef.current = null;
      }
    };
  }, []);

  // NEW: reset per-hand UI-only stuff when a new hand starts
  useEffect(() => {
    if (!betting?.handId) return;

    // hand started or changed
    setRevealHeroHand(false);
    setRevealedHoles({});
    setJoinedMidHand(false);

    // reset pot sound reference etc if you want:
    lastPotRef.current = betting.pot ?? 0;
  }, [betting?.handId]);


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





   

    useEffect(() => {
  const prev = prevSeatsRef.current;
  const next = new Map<number, string | null>();

  seats.forEach((s) => {
    const currentPid = s.playerId ?? null;
    next.set(s.seatIndex, currentPid);

    const prevPid = prev.get(s.seatIndex) ?? null;

    // Seat became occupied during an active hand → mark as NEW PLAYER
    if (handInProgress && currentPid && !prevPid) {
      setNewPlayerSeats((curr) => ({
        ...curr,
        [s.seatIndex]: Date.now(),
      }));
    }

    // Seat emptied → remove tag
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
  const [autoTopUp, setAutoTopUp] = useState<boolean>(true);

  const [showBuyIn, setShowBuyIn] = useState(false);

  

  function handleSitOrStand() {
  // Already seated
  if (heroSeat) {
    if (handInProgress) {
      pushLog(
        `${describeHero()} tries to stand, but a hand is in progress. You can stand up after this hand completes.`
      );
      return;
    }

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

  // Not seated: open buy-in modal, remember if we started while mid-hand
  setJoinModeMidHand(handInProgress);
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

  // Reserve chips immediately (like buying chips from the cage)
  setChips((c: number) => Math.max(0, c - effBuyIn));

  if (joinModeMidHand && handInProgress) {
    // Joining in the middle of a hand: seat now, but only play next hand
    setJoinedMidHand(true);
    pushLog(
      `${describeHero()} joins the table and will be dealt in next hand with ${effBuyIn} PGLD chips.`
    );
  } else {
    pushLog(`${describeHero()} sits down with ${effBuyIn} PGLD chips.`);
  }

  sendMessage({
    type: "sit",
    name: profile?.name ?? "",
    buyIn: effBuyIn,
  } as any);
}


  /* ───────────────── Reload demo bankroll ───────────────── */

function handleReloadDemoBankroll() {
  const TARGET = 5000; // demo top-up target

  setChips((current: number) => {
    const next = Math.max(current, TARGET);
    pushLog(
      `Demo bankroll topped up to ${next.toLocaleString()} PGLD chips.`
    );
    return next;
  });
}

function handleRefillStack(amount: number) {
  if (!heroSeat) return;
  if (handInProgress) {
    pushLog("You can only refill between hands.");
    return;
  }

  const amt = Math.max(0, Math.floor(amount));
  if (amt <= 0) return;

  if (chips < amt) {
    pushLog(`Not enough bankroll to refill ${amt} PGLD.`);
    return;
  }

  // Optimistic: subtract from local bankroll immediately
  setChips((c: number) => Math.max(0, c - amt));

  pushLog(`${describeHero()} refills stack by ${amt} PGLD.`);

  // 🔥 Requires server support in room.ts
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

  const [raiseSize, setRaiseSize] = useState<number>(0);
  const [manualBet, setManualBet] = useState<string>("");

  function handleBet() {
  if (!isHeroTurn || !betting || !heroBetting) return;

  const alreadyCommitted = heroBetting.committed ?? 0;
  const stack = heroBetting.stack ?? 0;

  // No chips to bet
  if (stack <= 0) return;

  const callNeeded = Math.max(0, betting.maxCommitted - alreadyCommitted);
  const minRaise = betting.bigBlind * 2;

  // Pick a base value from manual input or slider
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

  // This is how many chips we want to push into the pot this action
  let totalSpend = callNeeded + raiseDelta;

  // Clamp to hero stack (all-in if needed)
  if (totalSpend > stack) {
    totalSpend = stack;
  }

  if (totalSpend <= 0) return;

  pushLog(
    `${describeHero()} bets ${totalSpend} PGLD (call ${callNeeded}, raise ${raiseDelta}).`
  );

  // 🔥 IMPORTANT: send totalSpend, not just raiseDelta
  sendMessage({
    type: "action",
    action: "bet",
    amount: totalSpend,
  });

  // Clear manualBet so slider rules next time
  // (optional, but usually feels better)
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  setManualBet?.("");
}


  function handleAllIn() {
    if (!isHeroTurn || !betting || !heroBetting) return;
    const allInRaise = heroBetting.stack;
    setRaiseSize(allInRaise);
    setManualBet(String(allInRaise));
    pushLog(`${describeHero()} moves all-in.`);
    sendMessage({ type: "action", action: "bet", amount: allInRaise });
  }

  /* ───────────────── Manual deal safety ───────────────── */

  function handleManualDeal() {
  if (!isHostClient) return;
  pushLog("Host starts the game.");
  sendMessage({ type: "start-hand" });
}



  const canManualDeal =
  isHostClient && seatedCount >= MIN_PLAYERS_TO_START;

  const tableIdle =
  seatedCount >= MIN_PLAYERS_TO_START &&
  !!heroSeat &&
  isHostClient &&
  (!betting || betting.street === "done");




  /* ───────────────── Winner seat set ───────────────── */

  const winnerSeatKeys = useMemo(() => {
  const set = new Set<string>();

  if (!showdown || !table) return set;
  if (showdown.handId !== table.handId) return set;
  if (!Array.isArray(showdown.players)) return set;

  showdown.players.forEach((p) => {
    if (p.isWinner) {
      set.add(`${p.seatIndex}:${p.playerId}`);
    }
  });

  return set;
}, [showdown, table]);


  

 

  /* ───────────────── Avatar initials ───────────────── */

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

   // ───────────────── Game-level timers ─────────────────

  const ACTION_BASE_MS = 30_000; // first 30 seconds
  const ACTION_EXTRA_MS = 30_000; // last-chance 30 seconds

  const [actionPhase, setActionPhase] = useState<ActionPhase>(null);
  const [actionDeadline, setActionDeadline] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const lastActionKeyRef = useRef<string | null>(null);

  // Host-only auto-deal timeout after each hand
  const autoDealTimeoutRef = useRef<number | null>(null);


  // Global ticking clock
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);


   const [revealedHoles, setRevealedHoles] = useState<Record<string, string[]>>(
    {}
  );

  // ───────────────── Time Bank (still 30s if you want to keep it) ─────────────────

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

  // ───────────────── Action timer + auto-fold (base → extra) ─────────────────

  useEffect(() => {
    if (!betting) {
      setActionDeadline(null);
      setActionPhase(null);
      lastActionKeyRef.current = null;
      return;
    }

    const key = `${betting.handId}-${betting.street}-${betting.currentSeatIndex}`;

    // New action turn: start a fresh 30s base window for the *current* seat
    if (lastActionKeyRef.current !== key) {
      lastActionKeyRef.current = key;
      setActionPhase("base");
      setActionDeadline(Date.now() + ACTION_BASE_MS);
    }
  }, [betting]);

  useEffect(() => {
    if (!actionDeadline || !actionPhase) return;

    // Everyone's UI advances the timers…
    const isExpired = now >= actionDeadline;

    // When base window expires → go to LAST CHANCE for the active seat
    if (actionPhase === "base" && isExpired) {
      setActionPhase("extra");
      setActionDeadline(Date.now() + ACTION_EXTRA_MS);

      // If this client *is* the active player, log it
      if (isHeroTurn) {
        pushLog(`${describeHero()} last chance to act!`);
      }
      return;
    }

    // When extra window expires → if it's *our* turn, auto-fold
    if (actionPhase === "extra" && isExpired) {
      if (isHeroTurn) {
        handleFold();
        pushLog(`${describeHero()} auto-folded (timer).`);
      }
      setActionDeadline(null);
      setActionPhase(null);
    }
  }, [now, actionDeadline, actionPhase, isHeroTurn]);

  useEffect(() => {
    if (!isHeroTurn || !actionDeadline) return;

    // Base window ended → go to LAST CHANCE 30s
    if (actionPhase === "base" && now >= actionDeadline) {
      setActionPhase("extra");
      setActionDeadline(Date.now() + ACTION_EXTRA_MS);
      pushLog(`${describeHero()} last chance to act!`);
      return;
    }

    // Extra window ended → auto-fold
    if (actionPhase === "extra" && now >= actionDeadline) {
      handleFold();
      setActionDeadline(null);
      setActionPhase(null);
    }
  }, [now, isHeroTurn, actionDeadline, actionPhase]);

  const actionRemainingMs = useMemo(() => {
    if (!actionDeadline) return null;
    const diff = actionDeadline - now;
    return diff > 0 ? diff : 0;
  }, [actionDeadline, now]);

  const totalWindowMs =
    actionPhase === "extra" ? ACTION_EXTRA_MS : ACTION_BASE_MS;

  const actionSeconds = actionRemainingMs
    ? Math.ceil(actionRemainingMs / 1000)
    : null;

  const actionPct = actionRemainingMs
    ? Math.max(
        0,
        Math.min(100, (actionRemainingMs / totalWindowMs) * 100)
      )
    : 0;

    useEffect(() => {
  const last = (messages as any[]).slice(-1)[0];
  if (!last) return;

  if (last.type === "player-show-cards" && last.playerId && Array.isArray(last.cards)) {
    setRevealedHoles((prev) => ({
      ...prev,
      [String(last.playerId)]: last.cards,
    }));
  }
}, [messages]);

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

    if (autoCheck && diff === 0) {
      handlePrimaryAction();
    }
  }, [isHeroTurn, betting, heroBetting, autoCheck, autoFoldFlag]);

  useEffect(() => {
    if (!isSittingOut || !isHeroTurn) return;
    handleFold();
  }, [isSittingOut, isHeroTurn]);

  /* ───────────────── Primary action label ───────────────── */

  // Primary action label (check/call)
  let primaryActionLabel = "Check";
  if (betting && heroBetting) {
    const diff = betting.maxCommitted - heroBetting.committed;
    if (diff > 0) {
      primaryActionLabel = `Call ${diff}`;
    }
  }

  

 /* ───────────────── Layout helpers for seats ───────────────── */

const [winners, setWinners] = useState<WinnerEntry[]>([]);

// History of winners for the side panel
const [lastWinners, setLastWinners] = useState<WinnerEntry[]>([]);

const [showLastWinners, setShowLastWinners] = useState(false);
const [showDealerLog, setShowDealerLog] = useState(false);

// For JSX – always a WinnerEntry[]
const winnersToShow: WinnerEntry[] = lastWinners;







// Toggle behavior:
// - true  => GG-style: each player sees THEMSELF bottom-center
// - false => casino-style: seatIndex decides position, same on all screens
const HERO_CENTER_VIEW = true;


// Whether the current sit flow started while a hand was in progress
const [joinModeMidHand, setJoinModeMidHand] = useState(false);

// Track "NEW PLAYER" seats (seatIndex → timestamp)
const [newPlayerSeats, setNewPlayerSeats] = useState<Record<number, number>>({});
const prevSeatsRef = useRef<Map<number, string | null>>(new Map());

const [isMobile, setIsMobile] = useState(false);

// PC: after hero -> directly LEFT of hero slot, then directly RIGHT, then far-left, then sides, then top
const SLOT_FILL_PC = [0, 2, 3, 1, 7, 8, 4, 6, 5];

// Mobile: after hero -> bottom-left, bottom-right, then alternate left/right arcs upward
const SLOT_FILL_MOBILE = [0, 1, 2, 3, 6, 4, 7, 5, 8];

const ACTIVE_SLOT_FILL = isMobile ? SLOT_FILL_MOBILE : SLOT_FILL_PC;


useEffect(() => {
  if (typeof window === "undefined") return;

  const mq: MediaQueryList = window.matchMedia("(max-width: 767px)");

  const apply = () => setIsMobile(mq.matches);
  apply(); // initial

  // Modern browsers
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }

  // Safari fallback
  (mq as any).addListener(apply);
  return () => (mq as any).removeListener(apply);
}, []);


const ACTIVE_GEOMETRY = isMobile ? SEAT_GEOMETRY_MOBILE : SEAT_GEOMETRY_PC;



const maxSeats = ACTIVE_GEOMETRY.length;

// Only enable hero-centered layout once heroSeat is known
const heroSeatIndexForLayout = heroSeat?.seatIndex ?? null;
const useHeroCenter = HERO_CENTER_VIEW && heroSeatIndexForLayout !== null;








const [showProfileCard, setShowProfileCard] = useState(false);
const [showChipsCard, setShowChipsCard] = useState(false);


const [openPanels, setOpenPanels] = useState(false);
const [openHeaderPanel, setOpenHeaderPanel] = useState(false);









    /* ───────────────── JSX ───────────────── */

  return (
    <>
      <div
        className={
          isFullscreen ? "space-y-0 pb-0 md:pb-0" : "space-y-6 pb-8 md:pb-4"
        }
      >
        {/* TABLE + SIDEBAR */}
        <section
  className={
    isFullscreen
      ? "space-y-0"
      : "space-y-0"
  }
>

          {/* TABLE */}
          <div
            className={[
              "relative flex flex-col rounded-3xl border border-[#FFD700]/40",
              "bg-gradient-to-b from-black via-[#020617] to-black",
              "shadow-[0_0_50px_rgba(0,0,0,0.9)]",
              "p-4 md:p-6",
              "space-y-3",
              // clamp spill on mobile; allow full glow on larger screens
              "overflow-hidden md:overflow-visible",
            ].join(" ")}
          >
            {/* Exit fullscreen button – floating above table */}
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="absolute right-2 top-2 z-50 rounded-full bg-black/90 border border-[#FFD700] px-3 py-1.5 text-[11px] font-semibold text-[#FFD700] shadow-[0_0_20px_rgba(0,0,0,0.9)]"
              >
                Exit fullscreen ✕
              </button>
            )}

            {/* Glow background behind felt */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0ea5e9]/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFD700]/20 blur-[70px]" />
            </div>

            {/* Header – ONLY in non-fullscreen */}
{!isFullscreen && (
  <>
    <div className="relative mb-3 flex items-start justify-between gap-3">
      {/* Left: minimal identity */}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          Base Gold Rush • Hold&apos;em
        </div>

        {/* Optional: show room label from config if you want */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-sm md:text-base font-semibold text-white/85">
            {roomId}
          </span>

          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard?.writeText(roomId);
              } catch {}
            }}
            className="rounded-full border border-white/15 bg-black/50 px-2 py-[2px] text-[10px] text-white/60 hover:border-[#FFD700]/60 hover:text-white/80"
          >
            Copy ID
          </button>

          <span className="rounded-full border border-white/10 bg-black/40 px-2 py-[2px] text-[10px] text-white/55">
            {seatedCount} / 9 seated
          </span>
        </div>
      </div>

      {/* Right: status + compact controls */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {/* LIVE */}
          {ready ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
              <span className="mr-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Connecting…
            </span>
          )}

          {/* Panels pill */}
          <button
            type="button"
            onClick={() => setOpenPanels((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-semibold text-white/70 hover:border-[#FFD700]/60 hover:text-white/85"
          >
            Profile/Chips <span className="text-white/50">{openPanels ? "▾" : "▸"}</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-semibold text-white/70 hover:border-[#FFD700]/60 hover:text-white/85"
          >
            Fullscreen
          </button>
        </div>
      </div>
    </div>

    {/* Panels drawer (RIGHT-ALIGNED, not inside the header row) */}
    {openPanels && (
  <div className="mt-2 grid gap-3 md:grid-cols-2">
    {/* PLAYER PROFILE (compact) */}
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

    {/* PGLD CHIPS (compact + reload demo) */}
    <div className="rounded-2xl border border-white/15 bg-black/70 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
          PGLD Chips
        </div>
        <div className="text-[12px] font-semibold text-white/80">
          BR{" "}
          <span className="font-mono text-[#FFD700]">
            {chips.toLocaleString()}
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

        {/* NEW: Refill stack from bankroll (between hands) */}
        <button
          type="button"
          onClick={() => handleRefillStack(500)} // pick a default or open a small input later
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


            {/* MAIN FELT + TABLE AREA */}
            <div
              className={
                isFullscreen
                  ? "flex-1 flex w-full items-center justify-center"
                  : ""
              }
            >
              {/* FELT + TABLE wrapper – fullscreen geometry used as default */}
<div
  className={
    isFullscreen
      ? // Fullscreen: same geometry, just more breathing room
        "relative mx-auto mt-1 w-full max-w-[1320px] h-[82vh] [perspective:1800px]"
      : // Normal: big cinematic table even in standard view
        "relative mx-auto mt-2 w-full max-w-[1320px] h-[72vh] [perspective:1800px]"
  }
>



                {/* 3D group */}
                <div className="absolute inset-0 [transform:rotateX(18deg)] [transform-style:preserve-3d]">
                  {/* Outer rail */}
                  <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_top,#4b2f1a_0,#2b1a0d_52%,#050509_100%)] shadow-[0_26px_90px_rgba(0,0,0,1)]">
                    <div className="absolute inset-x-[14%] top-[6%] h-5 rounded-full bg-gradient-to-b from-white/18 to-transparent blur-md opacity-80" />
                  </div>

                  {/* Inner felt – thinner bumper, no weird squash */}
<div className="absolute inset-[4%] md:inset-[5%] origin-center rounded-[999px] border border-emerald-400/45 bg-[radial-gradient(circle_at_top,#15803d_0,#065f46_40%,#022c22_70%,#020617_100%)] shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden">

                    {/* Felt texture */}
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

                    {/* TOTAL POT – always above board cards */}
                    {pot > 0 && (
                      <div className="pointer-events-none absolute left-1/2 top-[3%] -translate-x-1/2 z-[60]">
                        <div className="rounded-full px-7 py-2 ... text-base md:text-lg font-extrabold">

                          Total Pot {pot.toLocaleString()} PGLD
                        </div>
                      </div>
                    )}

                    {/* Board cards – centered on felt */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 z-20">
                      <div className="flex gap-1.5 md:gap-2">
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

                    {/* SHOWDOWN – under total pot */}
                    {showdown &&
                      table &&
                      showdown.handId === table.handId && (
                        <div className="pointer-events-none absolute left-1/2 top-[16%] z-40 flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] md:text-sm">
                          <div
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

                  

                {/* SEATS ON BUMPER – fixed slots (OPEN seats) + deterministic fan-out */}
<div className="absolute inset-[2%] text-[10px] text-white/80 md:text-[11px]">

  {(() => {
    const N = 9;

    // Build a seat map by seatIndex (0..8)
    const seatByIndex = new Map<number, (typeof seats)[number]>();
    seats.forEach((s) => seatByIndex.set(s.seatIndex, s));

    // Hero seatIndex (only when seated)
    const heroSeatIndex = heroSeat?.seatIndex ?? null;

    // Decide which seatIndex goes into each visual slot (0..8)
    // slotToSeatIndex[slot] = seatIndex | null
    const slotToSeatIndex: Array<number | null> = Array(N).fill(null);

    // If hero-centered and hero exists, force hero into slot 0
    if (HERO_CENTER_VIEW && heroSeatIndex !== null) {
      slotToSeatIndex[0] = heroSeatIndex;

      // Fan-out seatIndex order around hero: left, right, left2, right2...
      const order: number[] = [];
      for (let d = 1; d <= 4; d++) {
        const left = (heroSeatIndex - d + N) % N;  // CCW
        const right = (heroSeatIndex + d) % N;     // CW
        order.push(left, right);
      }

      // Take only occupied (playerId) seats in that fan-out order
      const occupied = order.filter((idx) => {
        const s = seatByIndex.get(idx);
        return !!s?.playerId;
      });

      // Fill the visual slots in your desired pattern
      let k = 0;
      for (let fillPos = 1; fillPos < ACTIVE_SLOT_FILL.length; fillPos++) {
        const slot = ACTIVE_SLOT_FILL[fillPos];
        const seatIndex = occupied[k++];
        if (typeof seatIndex === "number") slotToSeatIndex[slot] = seatIndex;
      }
    } else {
      // Casino-style fallback: seatIndex == slot
      for (let i = 0; i < N; i++) slotToSeatIndex[i] = i;
    }

    // Now render 9 fixed slots (OPEN if empty)
    return Array.from({ length: N }).map((_, slotIndex) => {
      const seatIndex = slotToSeatIndex[slotIndex];
      const seat = typeof seatIndex === "number" ? seatByIndex.get(seatIndex) : undefined;

      const isOccupied = !!seat?.playerId;
      const isHeroSeat = isOccupied && seat!.playerId === playerId;

      const seatBetting = isOccupied
        ? betting?.players.find((p) => p.seatIndex === seat!.seatIndex)
        : undefined;

      const committed =
  isOccupied ? (totalBySeat[seat!.seatIndex] ?? 0) : 0;


      const stackAmount =
        isOccupied ? (seatBetting?.stack ?? seat!.chips ?? 0) : 0;

      const isInHand =
        !!seatBetting && seatBetting.inHand && !seatBetting.hasFolded;

      const isOut =
        !!seatBetting && (seatBetting.hasFolded || !(seatBetting.inHand ?? false));

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

      // Winner key / banner (only if occupied)
      const winnerKey = isOccupied ? `${seat!.seatIndex}:${seat!.playerId ?? ""}` : "";
      const rawIsWinnerSeat = isOccupied ? winnerSeatKeys.has(winnerKey) : false;
      const isWinnerSeat =
        rawIsWinnerSeat && !(isHeroSeat && !handInProgress);

      // Visible cards rules (keep your current behavior)
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

      return (
        <div
          key={`slot-${slotIndex}`}
          className="absolute flex flex-col items-center gap-1"
          style={stylePos}
        >
          {/* Position badges: D / SB / BB (only when occupied) */}
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

          {/* BET badge (high visibility, global readability) */}
          {isOccupied && committed > 0 && (
            <div className="pointer-events-none rounded-full bg-black/85 border border-amber-300/60 px-3 py-[2px] text-[11px] md:text-[12px] font-extrabold text-amber-200 shadow shadow-black/80">
              BET {formatChips(committed)}
            </div>
          )}

          {/* Avatar + overlays */}
          <div className="relative flex flex-col items-center">
            {/* Winner banner (fixed: no invalid Tailwind, sits ABOVE cards) */}
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

            {/* Fold banner */}
            {isOccupied && !isWinnerSeat && seatBetting?.hasFolded && betting?.street !== "done" && (
              <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-800/95 px-2 py-[2px] text-[9px] font-bold text-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                FOLDED
              </div>
            )}


            {/* Avatar + countdown ring */}
            <div className="relative">
              {isOccupied && isCurrentTurn && actionSeconds !== null && (
                <div
                  className="hero-timer-ring pointer-events-none absolute inset-[-5px] rounded-full"
                  style={{
                    backgroundImage: `conic-gradient(${
                      actionPhase === "extra" ? "#f97373" : "#FACC15"
                    } ${actionPct}%, transparent 0)`,
                  }}
                >
                  <div className="absolute inset-[4px] rounded-full bg-transparent" />
                </div>
              )}

              <div
                className={[
                  // slightly smaller on mobile so 9 fits cleanly
                  "relative z-0 flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-full overflow-hidden",
                  isOccupied ? "bg-slate-900" : "bg-black/40",
                  isOccupied && isCurrentTurn && !isHeroSeat
                    ? "animate-soft-glow border border-[#FACC15] shadow-[0_0_16px_rgba(250,204,21,0.8)]"
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
                      src="/felt/bgrc-logo.png"
                      alt="PGLD"
                      width={80}
                      height={80}
                      className="object-contain opacity-90"
                    />
                  )
                ) : (
                  <div className="text-[10px] font-bold tracking-widest text-white/70">
                    OPEN
                  </div>
                )}
              </div>
            </div>

            {/* Overlay: cards + stack/name pill (only if occupied) */}
            {isOccupied && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between">
                {/* Cards */}
                <div className="mt-[6px] flex justify-center">
                  {visibleCards && visibleCards.length === 2 ? (
                    <div className="relative flex -space-x-5 md:-space-x-6">
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
                          className={`h-9 w-7 md:h-10 md:w-8 rounded-[4px] border border-white/25 bg-gradient-to-br from-slate-200 to-slate-400 shadow shadow-black/80 ${
                            i === 1 ? "rotate-[10deg]" : "rotate-[-10deg]"
                          } ${isOut ? "opacity-30" : "opacity-90"}`}
                          style={{ transformOrigin: "50% 80%", transform: "translateY(0px)" }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Pill */}
                <div className="mb-[4px] flex w-full justify-center">
                  <div className="pointer-events-auto flex min-w-[112px] max-w-[150px] flex-col items-center rounded-2xl bg-gradient-to-r from-black/85 via-[#111827]/90 to-black/85 border border-[#FACC15]/60 px-2.5 py-[2px] shadow-[0_0_10px_rgba(0,0,0,0.9)]">
                    <div className="rounded-full bg-black/70 px-2.5 py-[1px] text-[14px] md:text-[15px] text-[#FACC15] font-mono leading-tight shadow shadow-black/60">
                      {formatChips(stackAmount)} PGLD
                    </div>

                    <div className="mt-[1px] max-w-[118px] truncate text-[11px] md:text-[12px] text-white/85 leading-tight">
                      {label}
                    </div>
                  </div>
                </div>
              </div>
            )}.

            
{/* Waiting label (occupied, not in hand) */}
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

            {/* HERO ACTION BAR – compact, centered, animated */}
            <div
              className={[
                "mt-3 mb-4 flex w-full justify-center",
                isFullscreen ? "max-w-[1100px] mx-auto" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[
                  "w-full max-w-[660px] rounded-2xl border border-white/20 bg-black/85 px-4 py-2 md:px-5 md:py-2",
"text-[12px] text-white/85 font-semibold shadow-[0_0_20px_rgba(0,0,0,0.8)]",
                  "transition-all duration-300 ease-out transform hero-bar-slide",
                  heroHasAction && isHeroTurn
                    ? "translate-y-0 opacity-100 scale-100"
                    : "translate-y-1 opacity-95 scale-[0.99] md:translate-y-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* TOP ROW: hero label + stack/bankroll + sit out + timer */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate text-white text-[14px] font-extrabold leading-tight"
>
                      {describeHero()}
                    </div>
                    <div className="mt-[1px] flex flex-wrap items-center gap-1 text-[11px] text-white/75">
                      {heroBetting && (
                        <span className="rounded-full bg-black/60 px-2 py-[1px] border border-white/25">
                          Stack{" "}
                          <span className="font-mono text-[#FFD700]">
                            {heroBetting.stack} PGLD
                          </span>
                        </span>
                      )}
                      <span className="rounded-full bg-black/60 px-3 py-[3px] border border-white/25">
                        BR{" "}
                        <span className="font-mono text-[#FFD700]">
                          {chips.toLocaleString()} PGLD
                        </span>
                       
                      </span>
                      {isSittingOut && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-[1px] border border-amber-400/60 text-amber-300">
                          Sitting out
                        </span>
                      )}
                    </div>
                  </div>
                   {/* NEW: Refill stack from bankroll (between hands) */}
        <button
          type="button"
          onClick={() => handleRefillStack(500)} // pick a default or open a small input later
          disabled={!heroSeat || handInProgress}
          className="rounded-full border border-emerald-400/60 bg-black/70 px-3 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-[#111827] disabled:opacity-40"
        >
          Refill stack +500
        </button>

        

                  {/* Timer + time bank */}
                  <div className="flex flex-col items-end gap-1">
                    {isHeroTurn && actionSeconds !== null && (
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-3.5 py-1.5 font-mono text-[12px] font-extrabold tracking-wide",
                          "timer-neon",
                          actionPhase === "extra"
                            ? "border border-red-500/70 text-red-300 bg-red-600/30"
                            : "border border-[#FFD700]/80 text-[#FFD700] bg-[#2a2a2a]/60",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {actionPhase === "extra" ? "LAST" : "ACT"}{" "}
                        {actionSeconds}s
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleUseTimeBank}
                      disabled={!isHeroTurn || !actionDeadline || timeBankUsed}
                      className="rounded-full border border-sky-400/60 bg-black/70 px-2.5 py-0.5 text-[9px] text-sky-300 disabled:opacity-40"
                    >
                      {timeBankUsed
                        ? "Time bank used"
                        : `Time bank +${TIME_BANK_SECONDS}s`}
                    </button>
                  </div>
                </div>

                {/* STATUS LINE + SIT OUT TOGGLE */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="flex-1 text-[11px] text-white/70">
                    {!betting || betting.street === "done" ? (
                      showdown &&
                      table &&
                      showdown.handId === table.handId ? (
                        "Hand complete. Showdown on the felt."
                      ) : (
                        "Waiting for next hand…"
                      )
                    ) : !heroSeat || !heroBetting ? (
                      "Sit to join the action."
                    ) : !heroIsInHand ? (
                      "Seated. Wait for next hand."
                    ) : isSittingOut ? (
                      "You are sitting out."
                    ) : !isHeroTurn ? (
                      "Waiting for other players…"
                    ) : (
                      "Your turn."
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsSittingOut((v) => !v)}
                    disabled={!heroSeat}
                    className="rounded-full border border-white/30 px-3 py-1 text-[10px] hover:border-[#FFD700] disabled:opacity-40"
                  >
                    {isSittingOut ? "Sit in" : "Sit out"}
                  </button>
                </div>

                {/* HERO HAND HELPER */}
                {heroHandHelper &&
                  betting &&
                  betting.street !== "preflop" &&
                  table &&
                  table.board.length >= 3 && (
                    <div className="mt-1 flex items-center justify-between gap-2 text-[16px]">
                      <span
                        className={[
                          "font-semibold",
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

                {/* SLIM PROGRESS BAR – ONLY when it's hero's turn */}
                {isHeroTurn && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
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

                {/* TABLE CONTROLS + ACTION BUTTONS */}
                <div className="mt-2 space-y-1.5">
                  {/* Always-visible controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSitOrStand}
                      disabled={!ready || (!!heroSeat && handInProgress)}
                      className="rounded-xl bg-emerald-500 px-3 py-1 text-[12px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                    >
                      {heroSeat ? "Stand up" : "Sit at table"}
                    </button>

                    {/* HOST START GAME – only before the first hand exists */}
{isHostClient && seatedCount >= MIN_PLAYERS_TO_START && tableIdle && (
  <button
    onClick={handleManualDeal}
    className="rounded-xl bg-[#FFD700] px-3 py-1 text-[12px] font-bold text-black hover:bg-yellow-400"
  >
    Start game
  </button>
)}


                  </div>

                  {/* Main action buttons – ONLY when it's hero's turn */}
                  {isHeroTurn && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleFold}
                          className="min-w-[96px] flex-1 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-bold text-black hover:bg-red-400 hover:shadow-[0_0_10px_rgba(255,80,80,0.6)]"
                        >
                          Fold
                        </button>
                        <button
                          onClick={handlePrimaryAction}
                          className="min-w-[96px] flex-1 rounded-xl bg-slate-800 px-4 py-2 text-[13px] font-bold text-white hover:bg-slate-600 hover:shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                        >
                          {primaryActionLabel}
                        </button>
                        <button
                          onClick={handleBet}
                          disabled={!betting || !heroBetting}
                          className="min-w-[96px] flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-[13px] font-bold text-black hover:bg-emerald-400 hover:shadow-[0_0_10px_rgba(0,255,100,0.45)] disabled:opacity-40"
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

                        {heroSeat && heroHand?.length === 2 && (
  <button
    type="button"
    onClick={() => sendMessage({ type: "show-cards" })}
    disabled={!betting || betting.street !== "done"} // only after showdown
    className="rounded-xl border border-[#FFD700]/50 bg-black/60 px-3 py-2 text-xs font-extrabold text-[#FFD700] hover:bg-black/80 disabled:opacity-40"
  >
    Show cards
  </button>
)}

                      </div>

                      {/* Raise controls */}
                      {betting && (
                        <div className="mt-1 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-white/60">
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

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                setRaiseSize(betting.bigBlind * 2)
                              }
                              className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
                            >
                              2x BB
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRaiseSize(betting.bigBlind * 3)
                              }
                              className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
                            >
                              3x BB
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRaiseSize(betting.bigBlind * 4)
                              }
                              className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
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
                              className="rounded-full border border-white/30 px-2 py-[2px] hover:border-[#FFD700]"
                            >
                              Pot
                            </button>
                            <button
                              type="button"
                              onClick={handleAllIn}
                              disabled={!heroBetting}
                              className="rounded-full border border-red-400/70 px-3 py-[7px] text-red-300 hover:border-red-300 disabled:opacity-40"
                            >
                              All-in
                            </button>

                            <div className="flex items-center gap-1">
                              <span className="text-white/50">Manual</span>
                              <input
                                type="number"
                                min={betting.bigBlind * 2}
                                value={manualBet}
                                onChange={(e) =>
                                  setManualBet(e.target.value)
                                }
                                className="w-24 rounded-full border border-white/25 bg-black/70 px-3 py-1 text-[11px]x] outline-none focus:border-[#FFD700]"
                              />
                              <button
                                type="button"
                                onClick={() => setManualBet("")}
                                className="rounded-full border border-white/30 px-2 py-[2px] text-[9px] hover:border-[#FFD700]"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

           

            {/* Dealer area – HIDDEN in fullscreen */}
            {!isFullscreen && (
              <>
                {/* LAST WINNERS – collapsible */}
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
                      {winnersToShow
                        .slice(0, 5)
                        .map((w: WinnerEntry, idx: number) => (
                          <div
                            key={w.handId ?? idx}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="font-mono text-white/75">
                              Hand #{w.handId ?? "–"}
                            </span>
                            <span className="truncate text-white/65">
                              Seat {(w.seatIndex ?? 0) + 1} •{" "}
                              {w.rankName ?? "Winner"}
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

                {/* DEALER LOG – collapsible */}
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
                      <span className="text-[9px] text-white/50">
                        Latest events first
                      </span>
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
                        .map((entry: DealerLogEntry, idx: number) => {
                          const e = entry as any;
                          const tsLabel = e.timestamp
                            ? new Date(e.timestamp).toLocaleTimeString()
                            : "";
                          const msg =
                            e.message ?? e.text ?? String(e);

                          return (
                            <div key={idx} className="flex gap-2">
                              {tsLabel && (
                                <span className="min-w-[52px] font-mono text-white/40">
                                  {tsLabel}
                                </span>
                              )}
                              <span className="flex-1">{msg}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="relative mt-3 text-[11px] font-semibold text-white/40">
                  Seats, blinds, betting, showdown, and winners are all
                  synced live for every player.
                </div>
              </>
            )}
          </div>

          {/* SIDEBAR – HIDE in fullscreen */}
          {!isFullscreen && (
            <div className="space-y-4">
            </div>
          )}
        </section>

        {/* CHAT – hide in fullscreen */}
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

      {/* BUY-IN MODAL */}
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
        .winner-scroll-fade {
          animation: winner-scroll-fade 0.6s ease-out 0.1s both;
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

        @keyframes winner-scroll-fade {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hero bar subtle slide-in */
        .hero-bar-slide {
          will-change: transform, opacity;
        }

        /* Neon pulse for timer pill */
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

        /* Smooth width animation for the thin timer bar */
        .timer-bar {
          transition: width 0.25s linear;
        }

        /* Circular hero timer ring */
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
      `}</style>
    </>
  );
}

