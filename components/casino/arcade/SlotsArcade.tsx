'use client'

import { useMemo, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Symbol = '🍋' | '🍒' | '🔔' | '💎' | '7️⃣'

const REEL_SYMBOLS: Symbol[] = ['🍋', '🍒', '🔔', '💎', '7️⃣']

// Simple payout table (3 in a row, center line)
// multiplier is total payout / stake (incl. returning stake)
const PAYTABLE: Record<Symbol, number> = {
  '🍋': 2, // 1:1
  '🍒': 3, // 2:1
  '🔔': 5, // 4:1
  '💎': 10, // 9:1
  '7️⃣': 25, // 24:1
}

type ReelState = Symbol[][] // [row][col]

function randomReels(): ReelState {
  // 3 rows x 3 columns
  const rows = 3
  const cols = 3
  const out: Symbol[][] = []
  for (let r = 0; r < rows; r++) {
    const row: Symbol[] = []
    for (let c = 0; c < cols; c++) {
      const idx = Math.floor(Math.random() * REEL_SYMBOLS.length)
      row.push(REEL_SYMBOLS[idx])
    }
    out.push(row)
  }
  return out
}

export default function SlotsArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState<ReelState>(() => randomReels())
  const [status, setStatus] = useState('Select your bet and tap SPIN.')
  const [lastNet, setLastNet] = useState(0)
  const [lastWinGross, setLastWinGross] = useState(0)
  const [lastCombo, setLastCombo] = useState<Symbol[] | null>(null)
  const [spinHistory, setSpinHistory] = useState<
    { net: number; combo: Symbol[] }[]
  >([])

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  // simple: only pay on the center row line
  function evaluatePayout(line: Symbol[], stake: number): number {
    if (line.length !== 3) return 0
    const [a, b, c] = line
    if (a === b && b === c) {
      const mul = PAYTABLE[a] ?? 0
      if (mul <= 0) return 0
      return stake * mul // total payout, including returning stake
    }
    return 0
  }

  function spin() {
    if (spinning) return

    const stake = Math.max(1, betPerSpin)

    if (credits <= 0) {
      setStatus('Out of demo credits in your arcade wallet.')
      return
    }
    if (stake > credits) {
      setStatus('Not enough demo credits for that bet size.')
      return
    }

    setStatus('Spinning…')
    setSpinning(true)
    setLastNet(0)
    setLastWinGross(0)
    setLastCombo(null)

    // fake spin duration
    const spinDuration = 1400

    // little pre-anim: you could cycle symbols visually if you want
    setTimeout(() => {
      const nextReels = randomReels()
      setReels(nextReels)

      const centerLine = nextReels[1] // row index 1 (middle)
      const payout = evaluatePayout(centerLine, stake)

      // record in global arcade wallet (deduct stake + add payout)
      recordSpin({
        wager: stake,
        payout,
      })

      const net = payout - stake
      setLastNet(net)
      setLastWinGross(payout)
      setLastCombo(centerLine)

      setSpinHistory(prev => {
        const next = [{ net, combo: centerLine }, ...prev]
        return next.slice(0, 10)
      })

      if (payout > 0) {
        setStatus(
          `Win! ${centerLine.join(' ')} • paid ${payout} credits (net ${
            net >= 0 ? '+' : ''
          }${net}).`
        )
      } else {
        setStatus(`No line hit. Net -${stake}.`)
      }

      setSpinning(false)
    }, spinDuration)
  }

  const stake = Math.max(1, betPerSpin)
  const canSpin =
    !spinning && credits > 0 && stake > 0 && stake <= credits

  const betOptions = [1, 2, 5, 10, 25, 50]

  return (
    <div className="mx-auto w-full max-w-4xl rounded-[32px] border border-yellow-500/60 bg-gradient-to-b from-[#020617] via-black to-[#0b1120] p-4 sm:p-5 md:p-6 shadow-[0_28px_90px_rgba(0,0,0,0.95)] space-y-4">
      {/* HEADER STRIP */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
            Base Gold Rush Casino
          </div>
          <div className="mt-1 text-2xl md:text-3xl font-extrabold text-white">
            Triple Line Slots <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="mt-1 max-w-sm text-xs text-white/65">
            3×3 reels, center line pays. Demo credits only — no real BGLD on
            this machine.
          </div>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 text-xs md:w-auto md:items-end md:text-sm">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-black/75 px-4 py-2 md:justify-end">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              Demo Credits
            </div>
            <div className="text-2xl md:text-3xl font-black text-[#fbbf24] tabular-nums">
              {credits.toLocaleString()}
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:grid-cols-3">
            <MiniStat label="Bet / Spin" value={stake} />
            <MiniStat label="Last Net" value={lastNet} colored />
            <MiniStat label="Session P&L" value={sessionPnL} colored />
          </div>
        </div>
      </div>

      {/* MAIN: STACKED ON MOBILE */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(260px,0.95fr)_minmax(260px,1.05fr)] items-start">
        {/* LEFT: REELS + SPIN + STATUS */}
        <div className="space-y-3 rounded-[24px] border border-white/12 bg-gradient-to-b from-black/50 via-[#020617] to-black p-3 sm:p-4 md:p-5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="uppercase tracking-[0.3em] text-white/60">
              Reel Display
            </div>
            <div className="text-white/50">Center line pays • fixed odds</div>
          </div>

          {/* REEL CABINET */}
          <div className="flex justify-center">
            <div className="w-full max-w-[260px] sm:max-w-[300px] rounded-[24px] border border-yellow-400/60 bg-gradient-to-b from-slate-900 via-black to-slate-900 p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
              <div className="mb-2 flex items-center justify-between rounded-full border border-yellow-300/60 bg-gradient-to-r from-yellow-500/10 via-yellow-300/15 to-amber-400/10 px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-200">
                  Triple Line
                </span>
                <span className="text-[10px] text-yellow-100">
                  Bet {stake} credits
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {reels.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex flex-col gap-2 sm:gap-3"
                  >
                    {row.map((sym, cIdx) => {
                      const isCenter = rIdx === 1
                      return (
                        <div
                          key={cIdx}
                          className={[
                            'flex h-12 sm:h-14 items-center justify-center rounded-xl border text-2xl sm:text-3xl bg-gradient-to-b from-slate-800 via-black to-slate-900',
                            isCenter
                              ? 'border-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.85)]'
                              : 'border-slate-500/70',
                          ].join(' ')}
                        >
                          {sym}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BIG SPIN BUTTON (THUMB ZONE) */}
          <div className="space-y-1">
            <button
              onClick={spin}
              disabled={!canSpin}
              className="h-11 w-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-[12px] font-extrabold uppercase tracking-[0.3em] text-black shadow-[0_0_26px_rgba(250,204,21,0.9)] hover:from-yellow-300 hover:to-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {spinning
                ? 'Spinning…'
                : credits <= 0
                ? 'No Demo Credits'
                : stake > credits
                ? 'Lower Bet'
                : 'Spin Reels'}
            </button>
            <div className="text-center text-[10px] text-emerald-100/80">
              Each spin pulls your bet from the arcade wallet and returns any
              wins automatically.
            </div>
          </div>

          {/* STATUS + LAST RESULT */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/70 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                Spin Status
              </div>
              {lastCombo && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/60 uppercase tracking-wide">
                    Last Line
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/80 bg-yellow-300/10 px-2 py-0.5 text-yellow-100">
                    {lastCombo.join(' ')}
                  </span>
                </div>
              )}
            </div>

            <div className="min-h-[1.4rem] text-[13px] text-white/90">
              {status}
            </div>

            <div className="flex flex-col items-start justify-between gap-3 text-[11px] sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="uppercase tracking-[0.16em] text-white/50">
                  Last Net
                </div>
                <div
                  className={
                    lastNet > 0
                      ? 'text-lg font-bold text-emerald-400'
                      : lastNet < 0
                      ? 'text-lg font-bold text-rose-400'
                      : 'text-lg font-bold text-slate-200'
                  }
                >
                  {lastNet > 0 ? '+' : ''}
                  {lastNet.toLocaleString()}
                </div>
              </div>
              <div className="flex-1">
                <div className="uppercase tracking-[0.16em] text-white/50">
                  Spin History
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {spinHistory.length === 0 && (
                    <span className="text-[11px] text-white/40">
                      Spin to build history.
                    </span>
                  )}
                  {spinHistory.map((h, i) => (
                    <span
                      key={i}
                      className={[
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                        h.net > 0
                          ? 'border-emerald-300 bg-emerald-900/40 text-emerald-200'
                          : h.net < 0
                          ? 'border-rose-300 bg-rose-900/40 text-rose-200'
                          : 'border-slate-300 bg-slate-800/40 text-slate-100',
                      ].join(' ')}
                    >
                      {h.combo.join(' ')} · {h.net > 0 ? '+' : ''}
                      {h.net}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: BET SELECT + PAYTABLE */}
        <div className="space-y-4 rounded-[24px] border border-emerald-400/40 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-black p-4 md:p-5 text-xs text-white">
          {/* Bet selector */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
              Bet Per Spin
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {betOptions.map(v => {
                const active = v === betPerSpin
                const disabled = v > credits && credits > 0
                return (
                  <button
                    key={v}
                    onClick={() => !disabled && setBetPerSpin(v)}
                    className={[
                      'rounded-full px-2.5 py-1.5 text-[11px] font-semibold border text-center',
                      active
                        ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.7)]'
                        : 'border-emerald-200/60 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60',
                      disabled ? 'cursor-not-allowed opacity-40' : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            {credits <= 0 && (
              <div className="mt-1 text-[11px] text-rose-300">
                You&apos;re out of demo credits. Use the arcade wallet HUD to
                top up and keep spinning.
              </div>
            )}
          </div>

          {/* Paytable */}
          <div className="space-y-2 rounded-2xl border border-emerald-200/60 bg-black/40 p-3">
            <div className="text-sm font-semibold text-emerald-50">
              Paytable (Center Line)
            </div>
            <ul className="space-y-1 text-emerald-50/85">
              <li>🍋 🍋 🍋 — pays 2× total (1:1 net)</li>
              <li>🍒 🍒 🍒 — pays 3× total (2:1 net)</li>
              <li>🔔 🔔 🔔 — pays 5× total (4:1 net)</li>
              <li>💎 💎 💎 — pays 10× total (9:1 net)</li>
              <li>7️⃣ 7️⃣ 7️⃣ — pays 25× total (24:1 net)</li>
            </ul>
            <div className="pt-1 text-[11px] text-emerald-100/80">
              Only the center row counts in this demo. Future on-chain
              versions can add multi-line bets, wilds, and bonus features.
            </div>
          </div>

          {/* Explainer */}
          <div className="space-y-2 rounded-2xl border border-white/12 bg-black/40 p-3 text-[11px]">
            <div className="text-sm font-semibold text-white">
              How This Machine Works
            </div>
            <ul className="list-inside list-disc space-y-1 text-white/75">
              <li>All spins use your shared arcade demo wallet credits.</li>
              <li>
                Choose a bet per spin, then tap{' '}
                <span className="font-semibold text-[#facc15]">
                  Spin Reels
                </span>
                .
              </li>
              <li>
                If the center row hits three of a kind, you&apos;re paid out
                according to the table above.
              </li>
              <li>
                The arcade wallet tracks your net result across all demo arcade
                games, including this machine.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----- SMALL UI HELPERS ----- */

function MiniStat({
  label,
  value,
  colored,
}: {
  label: string
  value: number
  colored?: boolean
}) {
  const colorClass = !colored
    ? 'text-slate-100'
    : value > 0
    ? 'text-emerald-400'
    : value < 0
    ? 'text-rose-400'
    : 'text-slate-100'

  return (
    <div className="rounded-lg border border-white/15 bg-black/60 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${colorClass}`}>
        {value > 0 ? '+' : ''}
        {value.toLocaleString()}
      </div>
    </div>
  )
}
