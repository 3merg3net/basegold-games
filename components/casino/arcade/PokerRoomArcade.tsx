// components/casino/arcade/PokerRoomArcade.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
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
}: {
  card: string;
  highlight?: boolean;
  size?: "normal" | "small";
  delayIndex?: number;
  tilt?: number;
}) {
  const { rankLabel, suitLabel, suitColor } = parseCard(card);
  const baseSize =
    size === "small"
      ? "w-9 h-12 text-[10px]"
      : "w-11 h-16 text-xs md:w-12 md:h-18 md:text-sm";

  const delay = `${0.05 * delayIndex}s`;

  return (
    <div
      className={`card-deal ${baseSize} rounded-xl bg-gradient-to-br from-slate-50 via-slate-200 to-slate-100 flex flex-col justify-between px-1.5 py-1 shadow-[0_10px_20px_rgba(0,0,0,0.65)] border relative ${
        highlight
          ? "border-[#FFD700] shadow-[0_0_22px_rgba(250,204,21,0.9)]"
          : "border-slate-400/70"
      }`}
      style={{
        animationDelay: delay,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "50% 60%",
      }}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[10px] border border-white/70 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.2)]" />

      <div className="relative flex items-start justify-between">
        <span className="font-extrabold text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
          {rankLabel}
        </span>
        <span className={`text-[11px] ${suitColor}`}>{suitLabel}</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <span
          className={`text-xl md:text-2xl leading-none ${suitColor} drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]`}
        >
          {suitLabel}
        </span>
      </div>

      <div className="relative flex items-end justify-end">
        <span className={`text-[11px] ${suitColor}`}>{suitLabel}</span>
      </div>
    </div>
  );
}

// ───────────────── Seat ring positions ─────────────────

const RING_POSITIONS: Array<Partial<CSSProperties>> = [
  { top: "3%", left: "50%", transform: "translate(-50%, 0)" },
  { top: "18%", left: "8%", transform: "translate(0, 0)" },
  { top: "18%", right: "8%", transform: "translate(0, 0)" },
  { top: "45%", left: "0%", transform: "translate(0, -50%)" },
  { top: "45%", right: "0%", transform: "translate(0, -50%)" },
  { bottom: "22%", left: "6%", transform: "translate(0, 0)" },
  { bottom: "22%", right: "6%", transform: "translate(0, 0)" },
  { bottom: "8%", left: "28%", transform: "translate(-50%, 0)" },
  { bottom: "8%", left: "72%", transform: "translate(-50%, 0)" },
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

export default function PokerRoomArcade() {
  const { profile, chips, setChips } =
    usePlayerProfileContext() as any;

  // Stable playerId for this browser session
  const playerIdRef = useRef<string>();
  if (!playerIdRef.current) {
    const nm = profile?.name ?? "";
    if (nm && nm.trim().length > 0) {
      playerIdRef.current = `player-${nm
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
    } else {
      playerIdRef.current =
        "player-" + Math.random().toString(36).slice(2, 8);
    }
  }
  const playerId = playerIdRef.current;

  const { ready, messages, send } = usePokerRoom(
    "bgld-holdem-demo-room",
    playerId
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

  // Tournament HUD stub
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

    if (
      handIdRef.current == null ||
      table.handId !== handIdRef.current
    ) {
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

  // Side-pot indicator (simple: just show if there are all-ins + pot)
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
    pushLog(
      `${describeHero()} sits down with a ${effBuyIn} PGLD chip buy-in.`
    );
    sendMessage({
      type: "sit",
      name: profile?.name ?? "",
      buyIn: effBuyIn,
    } as any);
  }

  // Hero actions
  function handleFold() {
    if (!isHeroTurn) return;
    pushLog(`${describeHero()} folds (timer or manual).`);
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

    // Manual bet box (raise amount), fallback to slider, fallback to min
    let raiseDelta =
      manualBet.trim().length > 0
        ? Number(manualBet)
        : raiseSize > 0
        ? raiseSize
        : minRaise;

    if (!Number.isFinite(raiseDelta) || raiseDelta <= 0) {
      raiseDelta = minRaise;
    }

    // Enforce a minimum raise
    raiseDelta = Math.max(minRaise, Math.floor(raiseDelta));

    // Total chips that will actually leave hero's stack this action
    const totalSpend = Math.min(
      heroBetting.stack,
      callNeeded + raiseDelta
    );

    pushLog(
      `${describeHero()} bets ${totalSpend} PGLD ` +
        `(call ${callNeeded}, raise ${raiseDelta}).`
    );

    // Server expects just the raise amount; it will add callNeeded internally.
    sendMessage({
      type: "action",
      action: "bet",
      amount: raiseDelta,
    });
  }


  function handleAllIn() {
    if (!isHeroTurn || !betting || !heroBetting) return;
    const allInRaise = heroBetting.stack; // raise portion
    setRaiseSize(allInRaise);
    setManualBet(String(allInRaise));
    pushLog(`${describeHero()} moves all-in.`);
    sendMessage({ type: "action", action: "bet", amount: allInRaise });
  }

  // Host manual deal (still allowed, acts as safety)
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

  // Collapsibles
  const [openHowRoom, setOpenHowRoom] = useState(true);
  const [openHowPlay, setOpenHowPlay] = useState(false);
  const [openFreeOnchain, setOpenFreeOnchain] = useState(false);

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

    // ───────────────── Game-level timers ─────────────────

  // Shared "next hand" countdown (seconds) — host-only for now
  const [gameCountdown, setGameCountdown] = useState<number | null>(null);

  // Per-decision action timer (hero only)
  const ACTION_MS = 60000; // 60 seconds
  const [actionDeadline, setActionDeadline] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const lastHandKeyRef = useRef<string | null>(null);
  const lastActionKeyRef = useRef<string | null>(null);

  // Global ticking clock for action timers
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Host-only table countdown: when 2+ players & no active hand
  useEffect(() => {
    if (!isHostClient) {
      // Non-hosts don't own the countdown; just clear any local state
      if (gameCountdown !== null) setGameCountdown(null);
      return;
    }

    const noActiveHand =
      !betting || betting.street === "done" || !table;

    const handKey = betting
      ? `${betting.handId}-${betting.street}`
      : "none";

    if (seatedCount >= 2 && noActiveHand) {
      // Only start once per "noActiveHand" phase
      if (lastHandKeyRef.current !== handKey && gameCountdown === null) {
        lastHandKeyRef.current = handKey;
        setGameCountdown(60); // 60s pre-hand countdown
      }
    } else {
      if (gameCountdown !== null) {
        setGameCountdown(null);
      }
    }
  }, [isHostClient, seatedCount, betting, table, gameCountdown]);

  // Tick down host countdown; auto-deal when it hits 0
  useEffect(() => {
    if (!isHostClient) return;
    if (gameCountdown === null) return;

    if (gameCountdown <= 0) {
      setGameCountdown(null);
      if (seatedCount >= 2) {
        pushLog("Auto-dealing next hand for the table.");
        sendMessage({ type: "start-hand" });
      }
      return;
    }

    const id = setInterval(() => {
      setGameCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [isHostClient, gameCountdown, seatedCount]);

    // ───────────────── Time Bank ─────────────────
  // How many seconds does the time bank add?
  const TIME_BANK_SECONDS = 30;

  // Whether the hero has used time bank this hand
  const [timeBankUsed, setTimeBankUsed] = useState(false);

  // Trigger adding time to the current actionDeadline
  function handleUseTimeBank() {
    if (!isHeroTurn || !actionDeadline || timeBankUsed) return;

    const extended = actionDeadline + TIME_BANK_SECONDS * 1000;

    setTimeBankUsed(true);
    setActionDeadline(extended);

    pushLog(`${describeHero()} uses time bank (+${TIME_BANK_SECONDS}s).`);
  }

  // Reset time-bank each new hand or new street/action
  useEffect(() => {
    if (!betting) return;

    const key = `${betting.handId}-${betting.street}`;
    // Whenever hand or street changes, reset the flag
    setTimeBankUsed(false);
  }, [betting]);


  // Action timer: 60s per decision, then auto-fold
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

  const canHostManualDeal =
    isHostClient &&
    seatedCount >= 2 &&
    (!betting || betting.street === "done");


  // ───────────────── Auto-check / Auto-fold / Sit-out ─────────────────

  const [autoCheck, setAutoCheck] = useState(false);
  const [autoFold, setAutoFold] = useState(false);
  const [isSittingOut, setIsSittingOut] = useState(false);

  // Apply auto actions when it becomes hero's turn
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
      // keep autoCheck if you want it sticky; or clear:
      // setAutoCheck(false);
    }
  }, [isHeroTurn, betting, heroBetting, autoCheck, autoFold]);

  // "Sit out" = auto-fold every time hero is involved in a hand
  useEffect(() => {
    if (!isSittingOut || !isHeroTurn) return;
    // simple: if sitting out and it's our turn, fold immediately
    handleFold();
  }, [isSittingOut, isHeroTurn]);

  // Winner glow + timer ring per seat are done in JSX

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
                <div className="text-[10px] text-white/50">
                  Pot{" "}
                  <span className="font-mono text-[#FFD700]">
                    {pot}
                  </span>{" "}
                  • {seatedCount}{" "}
                  {seatedCount === 1 ? "player" : "players"} seated
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

            {/* TOURNAMENT HUD (stub) */}
            <div className="mb-2 rounded-xl border border-white/10 bg-black/60 px-3 py-2 flex flex-wrap items-center gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#FFD700]/10 border border-[#FFD700]/60 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700]">
                  PGLD Demo Cash Game
                </span>
                <span className="text-white/70">
                  Level {tLevel} • Blinds {tBlinds[0]}/{tBlinds[1]} PGLD
                </span>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-3 justify-end text-white/50">
                <span>
                  Next level in{" "}
                  <span className="font-mono text-white/80">
                    {Math.floor(tNextIn / 60)}:
                    {(tNextIn % 60).toString().padStart(2, "0")}
                  </span>
                </span>
                <span className="hidden md:inline-block">
                  In full tournaments this timer drives blind increases.
                </span>
              </div>
            </div>

            {/* FELT */}
            <div className="relative mt-2 mx-auto w-full max-w-[760px] aspect-[9/16] md:aspect-[16/9] rounded-[999px] bg-[radial-gradient(circle_at_top,#157256_0,#032018_45%,#020617_70%,#000_100%)] border border-[#FFD700]/40 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light bg-[url('/felt/felt-texture.png')]" />

                            {/* Game countdown banner (host only for now) */}
              {isHostClient && gameCountdown !== null && (
                <div className="absolute top-[6%] left-1/2 -translate-x-1/2 z-20">
                  <div className="rounded-full px-4 py-1.5 flex items-center gap-2 shadow-[0_0_25px_rgba(0,0,0,0.9)] border bg-black/80 border-[#FFD700]/80">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                      Next hand starts in
                    </span>
                    <span className="text-xl font-extrabold tabular-nums text-[#FFD700]">
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
                      width={300}
                      height={300}
                      className="object-contain mx-auto drop-shadow-[0_0_18px_rgba(250,204,21,0.6)]"
                    />
                  </div>
                  <div className="text-[10px] md:text-xs tracking-[0.35em] text-[#FFD700]/90 uppercase text-center">
                    PGLD Poker Room
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-[6%] md:inset-[8%] rounded-[999px] border border-[#FFD700]/25 shadow-[0_0_40px_rgba(250,204,21,0.35)]" />

              {/* Center content: pot + board */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Pot */}
                {pot > 0 && (
                  <div className="mb-2 relative -translate-y-6 md:-translate-y-4">
                    <div className="pot-animate flex flex-col items-center">
                      <ChipStack amount={pot} size={32} />
                      <div className="mt-1 px-3 py-1 rounded-full bg-black/85 border border-[#FFD700]/80 text-[11px] font-mono flex items-center gap-2">
                        <span className="text-[#FFD700] font-semibold">
                          Pot {pot.toLocaleString()} PGLD
                        </span>
                        {hasPotentialSidePot && (
                          <span className="text-amber-300 text-[10px] ml-1">
                            • Side pots active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Board cards */}
                <div className="flex gap-1.5 mb-2 z-10 px-2 -translate-y-2 md:-translate-y-1">
                  {boardCards.length > 0 &&
  boardCards.map((c, i) => {
    const tilts = [-8, -4, 0, 4, 8];
    const tilt = tilts[i] ?? 0;
    return (
      <PokerCard
        key={`${table?.handId ?? 0}-board-${i}-${c}`}
        card={c}
        delayIndex={i}
        tilt={tilt}
      />
    );
  })}

                </div>
              </div>

              {/* Hero hand */}
              {heroHand && (
                <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="relative h-20 w-[120px] md:w-[140px]">
                    {heroHand.map((c, i) => {
                      const offsets = [
                        { rotate: -12, translateX: -18, z: 10 },
                        { rotate: 12, translateX: 18, z: 20 },
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
                          <PokerCard
                            card={c}
                            highlight
                            delayIndex={i}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seats */}
              <div className="absolute inset-0 text-[11px] text-white/80">
                {seats
                  .filter((s) => s.playerId)
                  .map((seat, idx) => {
                    const label =
                      seat.playerId && seat.name
                        ? seat.name
                        : seat.playerId
                        ? seat.playerId
                        : `Seat ${seat.seatIndex + 1}`;

                    const isHeroSeat =
                      seat.playerId === playerId;
                    const isButton =
                      buttonSeatIndex !== null &&
                      buttonSeatIndex === seat.seatIndex;
                    const isWinnerSeat =
                      winnerSeatIndexes.has(seat.seatIndex);

                    const pos =
                      RING_POSITIONS[idx] ?? RING_POSITIONS[0];

                    const committed =
                      committedBySeat[seat.seatIndex] ?? 0;

                    const isCurrentTurn =
                      currentSeatIndex !== null &&
                      currentSeatIndex === seat.seatIndex &&
                      betting?.street !== "done";

                    const timeFracUsed =
                      isCurrentTurn && actionRemainingMs != null
                        ? 1 - actionPct / 100
                        : 0;
                    const ringAngle = 360 * timeFracUsed;

                    return (
                      <div
                        key={seat.seatIndex}
                        className="absolute flex flex-col items-center gap-1"
                        style={pos as CSSProperties}
                      >
                        {isButton && (
                          <div className="px-1.5 py-0.5 rounded-full bg-[#FFD700] text-black text-[9px] font-bold shadow">
                            D
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border text-[10px] bg-black/80 shadow-[0_0_10px_rgba(0,0,0,0.7)] ${
                            isHeroSeat
                              ? "border-[#FFD700]/80 text-[#FFD700]"
                              : seat.playerId
                              ? "border-white/60 text-white"
                              : "border-white/20 text-white/50"
                          } ${isWinnerSeat ? "winner-glow" : ""}`}
                        >
                          {/* Avatar + timer ring */}
                          <div className="relative h-9 w-9 flex items-center justify-center">
                            <div
                              className="absolute inset-0 rounded-full"
                              style={
                                isCurrentTurn &&
                                actionRemainingMs != null
                                  ? {
                                      padding: "2px",
                                      background: `conic-gradient(
                                        #22c55e 0deg,
                                        #22c55e ${Math.max(
                                          ringAngle * 0.4,
                                          0
                                        )}deg,
                                        #eab308 ${Math.max(
                                          ringAngle * 0.7,
                                          0
                                        )}deg,
                                        #ef4444 ${Math.max(
                                          ringAngle,
                                          0
                                        )}deg,
                                        rgba(15,23,42,0.9) ${Math.max(
                                          ringAngle,
                                          0
                                        )}deg 360deg
                                      )`,
                                    }
                                  : {
                                      padding: "2px",
                                      background:
                                        "radial-gradient(circle, rgba(148,163,184,0.4), rgba(15,23,42,0.9))",
                                    }
                              }
                            >
                              <div className="h-full w-full rounded-full bg-slate-900 border border-white/25 flex items-center justify-center overflow-hidden">
                                {isHeroSeat &&
                                (profile as any)?.avatarUrl ? (
                                  <Image
                                    src={
                                      (profile as any).avatarUrl
                                    }
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
                          </div>

                          {/* Name + stack */}
                          <div className="flex flex-col">
                            <span className="max-w-[110px] truncate leading-tight">
                              {label}
                            </span>
                            {seat.playerId && (
                              <span className="font-mono text-[10px] text-[#5eead4] leading-tight">
                                {(seat.chips ?? 1000).toLocaleString()}{" "}
                                PGLD
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Committed chips */}
                        {committed > 0 && (
                          <div className="-mt-1">
                            <ChipStack
                              amount={committed}
                              size={18}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Hero action bar */}
            <div className="mt-3 rounded-2xl bg-black/80 border border-white/20 px-3 py-2 space-y-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px] text-white/70">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {describeHero()}
                  </span>
                  {heroBetting && (
                    <span className="rounded-full bg-black/70 border border-white/25 px-2 py-0.5 text-[10px]">
                      Stack:{" "}
                      <span className="font-mono text-[#FFD700]">
                        {heroBetting.stack} PGLD
                      </span>
                    </span>
                  )}
                  <span className="rounded-full bg-black/70 border border-white/25 px-2 py-0.5 text-[10px]">
                    PGLD Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} PGLD
                    </span>
                  </span>
                  {isSittingOut && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-400/60 px-2 py-0.5 text-[10px] text-amber-300">
                      Sitting out (auto-fold)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  {isHeroTurn && actionSeconds !== null && (
                    <span className="font-mono text-[#FFD700]">
                      Action time: {actionSeconds}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleUseTimeBank}
                    disabled={
                      !isHeroTurn ||
                      !actionDeadline ||
                      timeBankUsed
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
              <div className="space-y-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-[11px]">
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
                    ) : isSittingOut ? (
                      "You are sitting out. Click Sit in to rejoin the game."
                    ) : !isHeroTurn ? (
                      "Waiting for other players to act…"
                    ) : (
                      "Your turn to act"
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
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
                    <label className="inline-flex items-center gap-1 cursor-pointer">
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
                      onClick={() =>
                        setIsSittingOut((v) => !v)
                      }
                      disabled={!heroSeat}
                      className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] hover:border-[#FFD700] disabled:opacity-40"
                    >
                      {isSittingOut ? "Sit in" : "Sit out"}
                    </button>
                  </div>
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

              {/* Buttons + raise controls */}
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSitOrStand}
                    disabled={!ready}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {heroSeat ? "Stand Up" : "Sit at Table"}
                  </button>

                  {canHostManualDeal && (
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
                    className="flex-1 min-w-[80px] rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-red-400 disabled:opacity-40"
                  >
                    Fold
                  </button>
                  <button
                    onClick={handlePrimaryAction}
                    disabled={!isHeroTurn}
                    className="flex-1 min-w-[80px] rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-40"
                  >
                    {primaryActionLabel}
                  </button>
                                    <button
                    onClick={handleBet}
                    disabled={!isHeroTurn || !betting || !heroBetting}
                    className="flex-1 min-w-[80px] rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
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
                    <div className="flex items-center justify-between text-[10px] text-white/45">
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
                      value={
                        raiseSize ||
                        betting.bigBlind * 2
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRaiseSize(v);
                        setManualBet("");
                      }}
                      className="w-full accent-[#FFD700]"
                    />

                    {/* Preset buttons + all-in */}
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
                      <button
                        type="button"
                        onClick={handleAllIn}
                        disabled={!isHeroTurn || !heroBetting}
                        className="rounded-full border border-red-400/70 px-2 py-0.5 text-red-300 hover:border-red-300 disabled:opacity-40"
                      >
                        All-in
                      </button>
                    </div>

                    {/* Manual bet box */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="flex-1">
                        <label className="block mb-0.5 text-white/60">
                          Manual bet (PGLD)
                        </label>
                        <input
                          type="number"
                          min={betting.bigBlind * 2}
                          value={manualBet}
                          onChange={(e) =>
                            setManualBet(e.target.value)
                          }
                          className="w-full rounded-lg bg-black/70 border border-white/25 px-2 py-1 text-[11px] outline-none focus:border-[#FFD700]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualBet("")}
                        className="mt-4 rounded-full border border-white/30 px-2 py-0.5 hover:border-[#FFD700]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Showdown */}
            {showdown && table && showdown.handId === table.handId && (
              <div className="mt-3 rounded-xl bg-black/60 border border-[#FFD700]/60 px-3 py-2 text-[11px] text-white/80 shadow-[0_0_25px_rgba(250,204,21,0.35)]">
                <div className="font-semibold text-[#FFD700] mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700] animate-pulse" />
                  <span>
                    Showdown • Pot {pot.toLocaleString()} PGLD
                  </span>
                </div>
                <div className="text-[10px] text-white/55 mb-2">
                  Final hands for this pot. Winners are highlighted in
                  gold.
                </div>
                {Array.isArray(showdown.players) &&
                  showdown.players.map((p) => {
                    const seat = seats.find(
                      (s) => s.seatIndex === p.seatIndex
                    );
                    const label = seat?.name || p.playerId;
                    const isHero = p.playerId === playerId;
                    return (
                      <div
                        key={p.playerId}
                        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-1 rounded-lg px-2 py-1 ${
                          p.isWinner
                            ? "bg-[#022c22]/80 border border-emerald-400/70"
                            : "bg-black/40 border border-white/10"
                        }`}
                      >
                        <div>
                          <span
                            className={
                              p.isWinner
                                ? "font-semibold text-[#FFD700]"
                                : "font-semibold"
                            }
                          >
                            {label}
                          </span>{" "}
                          <span className="text-white/60">
                            — {p.rankName}
                          </span>
                          {p.isWinner && (
                            <span className="ml-1 text-emerald-300 font-semibold">
                              (Winner)
                            </span>
                          )}
                          {isHero && (
                            <span className="ml-1 text-sky-300 text-[10px]">
                              (You)
                            </span>
                          )}
                        </div>
                        {p.bestHand && p.bestHand.length > 0 && (
                          <div className="flex gap-1">
                            {p.bestHand.map((c, i) => (
                              <PokerCard
                                key={c + i}
                                card={c}
                                size="small"
                                highlight={p.isWinner}
                                delayIndex={i}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {hasPotentialSidePot && (
                  <div className="mt-1 text-[10px] text-amber-300">
                    Side pots were active this hand. Final distribution
                    is handled server-side and will be fully on-chain in
                    live mode.
                  </div>
                )}
              </div>
            )}

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

            

            <div className="mt-3 text-[11px] text-white/40 relative z-10">
              Seats, blinds, betting, showdown, and chat are all synced
              through the coordinator. When we flip to on-chain, PGLD chip
              balances and rake accounting plug directly into this flow via
              the cashier.
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
                    backgroundColor:
                      profile?.avatarColor ?? "#facc15",
                  }}
                >
                  {initials.slice(0, 3).toUpperCase()}
                </div>
              </div>

              <div className="space-y-2 pt-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-white/80 font-semibold">
                      {profile?.name &&
                      profile.name.trim().length > 0
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

              {/* PGLD credits */}
              <div className="pt-2 border-t border-white/10 mt-2">
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
                    PGLD Chips
                  </div>
                  <div className="text-sm text-white/80">
                    Bankroll:{" "}
                    <span className="font-mono text-[#FFD700]">
                      {chips.toLocaleString()} PGLD
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">
                    Sitting deducts a PGLD chip buy-in from this profile;
                    standing up adds your table stack back. When the
                    cashier is live, this will map 1:1 to your on-chain
                    BGLD → PGLD chip balance.
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
                watch the countdown, and play through full hands — betting,
                turns, and showdown are synced via WebSocket.
              </p>

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

            {/* Info blocks */}
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
                    device is a unique player with their own PGLD chip
                    stack.
                  </p>
                  <p>
                    The coordinator tracks seats, blinds, betting order,
                    streets, and showdown. When we hook in on-chain BGLD /
                    PGLD balances through the cashier, this same flow powers
                    live pots on Base.
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

              {/* PGLD vs on-chain */}
              <button
                type="button"
                onClick={() =>
                  setOpenFreeOnchain((v) => !v)
                }
                className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                  PGLD demo vs on-chain mode
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
                      demo PGLD chips
                    </span>
                    . Hands, pots, and results are for fun and testing
                    only.
                  </p>
                  <p>
                    When we go live, these same flows route real PGLD chips
                    backed by BGLD on Base. Rake and payouts will be handled
                    through the cashier and vault contracts, not
                    hard-coded into this UI.
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
              Table Chat • PGLD Poker Room
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
              Choose a PGLD chip buy-in amount for this session. In live
              mode this will map to your on-chain BGLD → PGLD chip
              balance.
            </p>

            <div className="space-y-2 mb-3">
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
    </>
  );
}
