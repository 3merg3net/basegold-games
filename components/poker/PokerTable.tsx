// components/poker/PokerTable.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildShuffledDeck,
  dealFlop,
  dealPreflop,
  dealRiver,
  dealTurn,
  evaluateBestFive,
  formatHandRank,
  nextPosition,
  seedCommit,
  verifySeed,
} from "@/lib/poker/engine";
import { calcRake } from "@/lib/poker/rake";
import type { Card, Player, Street } from "@/lib/poker/types";

const SEATS = 6;
const STARTING_STACK = 100;
const SMALL_BLIND = 0.5;
const BIG_BLIND = 1;

// PNG assets
const FELT = "/brand/bgld-felt.png";
const CREST = "/brand/bgld-crest.png";
const CHIP = "/brand/chip-gold.png";

export default function PokerTable({ tableId }: { tableId: string }) {
  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: SEATS }).map((_, i) => ({
      seat: i,
      name: `P${i + 1}`,
      stack: STARTING_STACK,
      inHand: false,
      folded: false,
      hole: [],
      acted: false,
      bet: 0,
    }))
  );

  const [button, setButton] = useState(0);
  const [street, setStreet] = useState<Street>("idle");
  const [board, setBoard] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [toAct, setToAct] = useState<number | null>(null);
  const [minRaise, setMinRaise] = useState(BIG_BLIND);
  const [currentBet, setCurrentBet] = useState(0);
  const [betInput, setBetInput] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const [seed, setSeed] = useState<string>("");
  const [commit, setCommit] = useState<string>("");

  const deckRef = useRef<Card[]>([]);

  const activeCount = useMemo(
    () => players.filter((p) => p.stack > 0).length,
    [players]
  );

  function appendLog(s: string) {
    setLog((L) => [s, ...L].slice(0, 200));
  }

  // ---------- GAME LOGIC ----------

  function postBlinds(nextBtn: number, table: Player[]) {
    const sb = nextPosition(nextBtn, table.length, table);
    const bb = nextPosition(sb, table.length, table);

    const t = structuredClone(table);
    const sbP = t[sb];
    const bbP = t[bb];

    const sbAmt = Math.min(SMALL_BLIND, sbP.stack);
    const bbAmt = Math.min(BIG_BLIND, bbP.stack);

    sbP.stack -= sbAmt;
    bbP.stack -= bbAmt;
    sbP.bet = sbAmt;
    bbP.bet = bbAmt;

    setCurrentBet(bbAmt);
    setMinRaise(BIG_BLIND);
    setPot(sbAmt + bbAmt);
    appendLog(
      `Blinds posted — SB ${sbAmt} (P${sb + 1}), BB ${bbAmt} (P${bb + 1})`
    );

    return { t, firstToAct: nextPosition(bb, t.length, t) };
  }

  function resetHand() {
    setStreet("idle");
    setBoard([]);
    setPot(0);
    setCurrentBet(0);
    setMinRaise(BIG_BLIND);
    setToAct(null);
    setPlayers((ps) =>
      ps.map((p) => ({
        ...p,
        inHand: p.inHand,
        folded: false,
        hole: [],
        acted: false,
        bet: 0,
      }))
    );
  }

  function startHand() {
    if (activeCount < 2) {
      appendLog("Need at least 2 players with chips to start.");
      return;
    }
    resetHand();

    const seedLocal = crypto.getRandomValues(new Uint32Array(4)).join("-");
    const { c, s } = seedCommit(seedLocal);
    setSeed(s);
    setCommit(c);

    const deck = buildShuffledDeck(s);
    deckRef.current = deck;

    setPlayers((prev) => {
      const t = prev.map((p) => ({
        ...p,
        inHand: p.inHand && p.stack > 0,
        folded: false,
        acted: false,
        hole: [],
        bet: 0,
      }));

      const nextBtn = nextPosition(button, t.length, t);
      setButton(nextBtn);

      const { t: blinded, firstToAct } = postBlinds(nextBtn, t);
      const dealt = dealPreflop(blinded, deckRef.current);
      deckRef.current = dealt.deckAfter;

      setStreet("preflop");
      setToAct(firstToAct);
      appendLog(`Commit published: ${c.slice(0, 12)}…`);
      return dealt.tableAfter;
    });
  }

  function proceedStreet(next: Street) {
    let deck = deckRef.current;
    const t = structuredClone(players);
    t.forEach((p) => (p.acted = false));

    if (next === "flop") {
      const { b, d } = dealFlop(deck);
      deck = d;
      setBoard(b);
      appendLog(`FLOP: ${b.map(formatCard).join(" ")}`);
    } else if (next === "turn") {
      const { card: turn, deck: d2 } = dealTurn(deck);
      deck = d2;
      setBoard((b) => [...b, turn]);
      appendLog(`TURN: ${formatCard(turn)}`);
    } else if (next === "river") {
      const { card: river, deck: d3 } = dealRiver(deck);
      deck = d3;
      setBoard((b) => [...b, river]);
      appendLog(`RIVER: ${formatCard(river)}`);
    }

    deckRef.current = deck;
    setCurrentBet(0);
    setMinRaise(BIG_BLIND);

    const first = nextPosition(button, players.length, players);
    setToAct(first);
    setStreet(next);
    setPlayers((ps) => ps.map((p) => ({ ...p, bet: 0 })));
  }

  function allPlayersActedOrAllIn() {
    const inHand = players.filter((p) => p.inHand && !p.folded);
    if (inHand.length <= 1) return true;
    return inHand.every((p) => p.acted || p.stack === 0);
  }

  function tryAdvance() {
    if (!allPlayersActedOrAllIn()) return;

    const alive = players.filter((p) => p.inHand && !p.folded);
    if (alive.length === 1) return showdown(true);

    if (street === "preflop") return proceedStreet("flop");
    if (street === "flop") return proceedStreet("turn");
    if (street === "turn") return proceedStreet("river");
    if (street === "river") return showdown(false);
  }

  function callAmount(p: Player) {
    const need = Math.max(0, currentBet - (p.bet || 0));
    return Math.min(need, p.stack);
  }

  function onFold() {
    if (toAct == null) return;
    const t = structuredClone(players);
    const p = t[toAct];
    if (!p.inHand || p.folded) return;
    p.folded = true;
    p.acted = true;
    appendLog(`P${p.seat + 1} folds`);
    setPlayers(t);
    setToAct(nextPosition(toAct, t.length, t));
    tryAdvance();
  }

  function onCall() {
    if (toAct == null) return;
    const t = structuredClone(players);
    const p = t[toAct];
    const c = callAmount(p);
    p.stack -= c;
    p.bet = (p.bet || 0) + c;
    p.acted = true;
    setPot((x) => x + c);
    appendLog(`P${p.seat + 1} calls ${c}`);
    setPlayers(t);
    setToAct(nextPosition(toAct, t.length, t));
    tryAdvance();
  }

  function onBetOrRaise() {
    if (toAct == null) return;
    const t = structuredClone(players);
    const p = t[toAct];

    let raiseTo = Math.max(currentBet + minRaise, betInput);
    raiseTo = Math.min(raiseTo, (p.bet || 0) + p.stack);
    const raiseAmt = Math.max(0, raiseTo - (p.bet || 0));
    if (raiseAmt <= 0) return;

    p.stack -= raiseAmt;
    p.bet = (p.bet || 0) + raiseAmt;
    p.acted = true;
    setPot((x) => x + raiseAmt);

    const lastRaiseSize = Math.max(raiseTo - currentBet, minRaise);
    setCurrentBet(raiseTo);
    setMinRaise(lastRaiseSize);

    appendLog(
      `P${p.seat + 1} ${street === "preflop" ? "raises" : "bets"} to ${raiseTo}`
    );

    const reset = t.map((q, idx) => ({
      ...q,
      acted: idx === toAct ? true : !q.inHand || q.folded ? true : false,
    }));

    setPlayers(reset);
    setToAct(nextPosition(toAct, t.length, t));
  }

  function showdown(wonByFold: boolean) {
    const sawFlop = street !== "preflop";
    const { rake, capApplied } = calcRake(pot, 0.05, 1.0, sawFlop);

    let payouts: number[] = players.map(() => 0);
    const alive = players.filter((p) => p.inHand && !p.folded);

    if (wonByFold) {
      const w = alive[0];
      payouts[w.seat] = pot - rake;
      appendLog(
        `Hand over — pot ${pot}, rake ${rake}${capApplied ? " (cap)" : ""}`
      );
      appendLog(
        `Winner: P${w.seat + 1} (win by fold) +${payouts[w.seat].toFixed(2)}`
      );
    } else {
      const evals = players
        .map((p) => {
          if (!p.inHand || p.folded) return null;
          const { value } = evaluateBestFive(p.hole, board);
          return { seat: p.seat, value, rankStr: formatHandRank(value) };
        })
        .filter(Boolean) as { seat: number; value: number; rankStr: string }[];

      const max = Math.max(...evals.map((e) => e.value));
      const champs = evals.filter((e) => e.value === max);
      const share = (pot - rake) / champs.length;
      champs.forEach((c) => (payouts[c.seat] += share));

      appendLog(
        `Hand over — pot ${pot}, rake ${rake}${capApplied ? " (cap)" : ""}`
      );
      champs.forEach((w) =>
        appendLog(
          `Winner: P${w.seat + 1} ${w.rankStr} +${share.toFixed(2)}`
        )
      );
    }

    setPlayers((ps) =>
      ps.map((p) => ({ ...p, stack: p.stack + payouts[p.seat] }))
    );

    appendLog(`Reveal seed: ${seed}`);
    const ok = verifySeed(seed, commit);
    appendLog(`Verify commit→reveal: ${ok ? "OK" : "FAIL"}`);

    setStreet("idle");
  }

  function sitOrStand(seat: number) {
    setPlayers((ps) => {
      const t = structuredClone(ps);
      const p = t[seat];
      if (p.stack <= 0) p.stack = STARTING_STACK;
      p.inHand = !p.inHand;
      p.folded = false;
      p.hole = [];
      return t;
    });
  }

  // ---------- UI HELPERS & LAYOUT ----------

  function formatCard(c: Card) {
    return `${c.rank}${c.suit}`;
  }
  function suitClass(c: Card) {
    return c.suit === "♥" || c.suit === "♦" ? "text-red-400" : "text-zinc-100";
  }

 const seatPos = [
  // P1 – top center (perfect)
  "top-[6%] left-1/2 -translate-x-1/2",

  // P2 – upper right (good)
  "top-[10%] right-[4%]",

  // P3 – lower right (good)
  "bottom-[10%] right-[4%]",

  // P4 – BOTTOM CENTER (fully down, clear of logo + cards)
  "bottom-[-20%] left-1/2 -translate-x-1/2",

  // P5 – lower left (good)
  "bottom-[10%] left-[4%]",

  // P6 – upper left (good)
  "top-[10%] left-[4%]",
];







  return (
    <div className="relative">
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#0a0a0f] via-[#0d0f16] to-[#0b0b12] border border-[#1b1e24] shadow-[0_0_80px_rgba(255,215,0,0.04)] overflow-hidden">
        {/* TABLE OVAL */}
        <div className="relative mx-auto aspect-[2.2/1] w-full max-w-4xl">
          {/* Felt + edge */}
          <div className="absolute inset-0 rounded-[999px] overflow-hidden z-0">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${FELT})`,
                backgroundSize: "320px 320px",
                backgroundRepeat: "repeat",
                filter: "saturate(1.05) brightness(0.92)",
              }}
            />
            <div className="absolute inset-0 rounded-[999px] ring-2 ring-[#e7c76a]/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.6),0_0_0_8px_#5b4b12,0_0_0_12px_#c7a84b,0_4px_40px_rgba(0,0,0,0.55)]" />
            <div
  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-16"
  style={{
    width: 180,
    height: 180,
    backgroundImage: `url(${CREST})`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
  }}
  aria-hidden
/>

          </div>

          {/* Pot badge */}
          <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="flex items-center gap-2 rounded-full px-4 py-1 text-sm bg-black/55 border border-yellow-500/30 shadow-lg">
              <img src={CHIP} alt="" className="w-5 h-5" />
              <span className="text-yellow-300 font-semibold">
                {pot.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Community cards */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3 z-20">
            {board.map((c, i) => (
              <div
                key={i}
                className="w-14 h-20 rounded-xl bg-zinc-900/80 border border-zinc-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center font-mono text-lg"
              >
                <span className={suitClass(c)}>{formatCard(c)}</span>
              </div>
            ))}
          </div>

          {/* Seats */}
          {players.map((p, i) => (
            <div
              key={i}
              className={`absolute ${seatPos[i]} -translate-y-1/2 z-10`}
            >
              <div
                className={[
                  "rounded-2xl px-3 py-2 min-w-[135px]",
                  "bg-black/40 border border-[#c7a84b]/20 backdrop-blur",
                  toAct === i && street !== "idle"
                    ? "shadow-[0_0_24px_rgba(255,215,0,0.35)] border-yellow-400/50"
                    : "shadow-[0_0_12px_rgba(0,0,0,0.35)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">P{i + 1}</div>
                  <div className="text-xs opacity-80">
                    {p.stack.toFixed(2)}
                  </div>
                </div>
                <div className="mt-2 flex gap-3">
                  {(p.hole || []).map((c, k) => (
                    <div
                      key={k}
                      className="w-10 h-14 rounded-lg bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center font-mono"
                    >
                      <span className={suitClass(c)}>{formatCard(c)}</span>
                    </div>
                  ))}
                  {(!p.hole || p.hole.length === 0) && (
                    <div className="text-[10px] opacity-60">—</div>
                  )}
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  {p.inHand
                    ? p.folded
                      ? "folded"
                      : street === "idle"
                      ? "seated"
                      : "live"
                    : "standing"}
                </div>
                {street === "idle" && (
                  <button
                    onClick={() => sitOrStand(i)}
                    className="mt-2 text-xs px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#222] border border-zinc-700"
                  >
                    {p.inHand ? "Stand" : "Sit"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={startHand}
              disabled={street !== "idle"}
              className="px-4 py-2 rounded-lg font-semibold text-black
                         bg-gradient-to-b from-[#ffe48a] to-[#d9a93a]
                         border border-[#caa548] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_rgba(255,215,0,0.25)]
                         hover:brightness-105 disabled:opacity-40"
            >
              Deal New Hand
            </button>

            {street !== "idle" && (
              <>
                <button
                  onClick={onFold}
                  className="px-3 py-2 rounded-lg bg-gradient-to-b from-[#2a2a2a] to-[#1e1e1e] border border-[#383838] hover:brightness-110"
                >
                  Fold
                </button>
                <button
                  onClick={onCall}
                  className="px-3 py-2 rounded-lg bg-gradient-to-b from-[#2a2a2a] to-[#1e1e1e] border border-[#383838] hover:brightness-110"
                >
                  Call
                </button>
                <input
                  type="number"
                  step="0.5"
                  value={Number.isFinite(betInput) ? betInput : 0}
                  onChange={(e) => setBetInput(parseFloat(e.target.value))}
                  className="w-28 px-2 py-2 rounded bg-black/70 border border-zinc-700"
                  placeholder="bet/raise to"
                />
                <button
                  onClick={onBetOrRaise}
                  className="px-3 py-2 rounded-lg bg-gradient-to-b from-[#2a2a2a] to-[#1e1e1e] border border-[#383838] hover:brightness-110"
                >
                  Bet / Raise
                </button>
              </>
            )}
          </div>

          <div className="text-sm opacity-80 flex flex-wrap gap-3">
            <span>Table: {tableId}</span>
            <span>Street: {street}</span>
            <span>Button: P{button + 1}</span>
            <span>Bet: {currentBet.toFixed(2)}</span>
            <span>Commit: {commit ? commit.slice(0, 10) + "…" : "—"}</span>
          </div>
        </div>

        {/* History / verify */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#2a2a2a] bg-black/40 p-3">
            <div className="font-semibold mb-2">Hand History</div>
            <div className="space-y-1 max-h-72 overflow-auto text-xs">
              {log.map((l, i) => (
                <div key={i} className="opacity-90">
                  {l}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-black/40 p-3 text-sm">
            <div className="font-semibold mb-2">Verify Shuffle</div>
            <div className="space-y-2">
              <div>
                Seed: <span className="font-mono break-all">{seed || "—"}</span>
              </div>
              <div>
                Commit:{" "}
                <span className="font-mono break-all">
                  {commit || "—"}
                </span>
              </div>
              <div className="text-xs opacity-70">
                Commit = hash(seed). After the hand, we reveal seed; anyone can
                recompute to verify integrity.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
