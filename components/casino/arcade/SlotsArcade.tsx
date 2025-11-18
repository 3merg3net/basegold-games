'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type SymbolKey =
  | 'BGLD'
  | 'GOLD_BAR'
  | 'NUGGET'
  | 'PICKAXE'
  | 'CART'
  | 'LANTERN'
  | 'SEVEN'

type SymbolDef = {
  key: SymbolKey
  label: string
  kind: 'logo' | 'icon' | 'bar'
  icon?: string
  colorClass: string
  pay: {
    '3': number
    '4': number
    '5': number
  }
}

const SYMBOLS: SymbolDef[] = [
  {
    key: 'BGLD',
    label: 'BGLD COIN',
    kind: 'logo',
    colorClass: 'text-yellow-300',
    pay: { '3': 8, '4': 25, '5': 100 },
  },
  {
    key: 'SEVEN',
    label: 'Lucky 7',
    kind: 'icon',
    icon: '7',
    colorClass: 'text-red-400',
    pay: { '3': 6, '4': 15, '5': 50 },
  },
  {
    key: 'GOLD_BAR',
    label: 'Gold Bar',
    kind: 'bar',
    colorClass: 'text-amber-300',
    pay: { '3': 4, '4': 10, '5': 25 },
  },
  {
    key: 'NUGGET',
    label: 'Nugget',
    kind: 'icon',
    icon: '🍒',
    colorClass: 'text-amber-200',
    pay: { '3': 3, '4': 6, '5': 15 },
  },
  {
    key: 'PICKAXE',
    label: 'Pickaxe',
    kind: 'icon',
    icon: '⛏️',
    colorClass: 'text-sky-200',
    pay: { '3': 2.5, '4': 5, '5': 12 },
  },
  {
    key: 'CART',
    label: 'Ore Cart',
    kind: 'icon',
    icon: '💎',
    colorClass: 'text-cyan-200',
    pay: { '3': 2, '4': 4, '5': 10 },
  },
  {
    key: 'LANTERN',
    label: 'Lantern',
    kind: 'icon',
    icon: '🔔',
    colorClass: 'text-amber-200',
    pay: { '3': 1.5, '4': 3, '5': 8 },
  },
]

const REELS: SymbolKey[][] = [
  ['BGLD', 'NUGGET', 'PICKAXE', 'CART', 'LANTERN', 'SEVEN', 'GOLD_BAR'],
  ['NUGGET', 'LANTERN', 'BGLD', 'CART', 'GOLD_BAR', 'SEVEN', 'PICKAXE'],
  ['PICKAXE', 'BGLD', 'CART', 'LANTERN', 'SEVEN', 'NUGGET', 'GOLD_BAR'],
  ['CART', 'SEVEN', 'LANTERN', 'BGLD', 'NUGGET', 'GOLD_BAR', 'PICKAXE'],
  ['LANTERN', 'PICKAXE', 'GOLD_BAR', 'SEVEN', 'BGLD', 'NUGGET', 'CART'],
]

type SpinGrid = SymbolKey[][] // [row][col] => symbol key

const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0], // top row
  [1, 1, 1, 1, 1], // middle row
  [2, 2, 2, 2, 2], // bottom row
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
]

function getSymbolDef(key: SymbolKey): SymbolDef {
  const def = SYMBOLS.find(s => s.key === key)
  if (!def) return SYMBOLS[0]
  return def
}

function randomGrid(): SpinGrid {
  const grid: SpinGrid = [[], [], []] as SpinGrid
  for (let col = 0; col < 5; col++) {
    const reel = REELS[col]
    const startIndex = Math.floor(Math.random() * reel.length)
    for (let row = 0; row < 3; row++) {
      const idx = (startIndex + row) % reel.length
      grid[row][col] = reel[idx]
    }
  }
  return grid
}

type LineWin = {
  lineIndex: number
  symbol: SymbolKey
  count: number
  payout: number
}

function evaluateGrid(grid: SpinGrid, betPerLine: number): { totalWin: number; lineWins: LineWin[] } {
  const lineWins: LineWin[] = []
  let totalWin = 0

  PAYLINES.forEach((line, lineIndex) => {
    const firstRow = line[0]
    const firstSym = grid[firstRow][0]
    const def = getSymbolDef(firstSym)
    let count = 1

    for (let col = 1; col < 5; col++) {
      const row = line[col]
      if (grid[row][col] === firstSym) {
        count++
      } else {
        break
      }
    }

    if (count >= 3) {
      const mult = def.pay[String(count) as '3' | '4' | '5']
      const payout = betPerLine * mult
      totalWin += payout
      lineWins.push({ lineIndex, symbol: firstSym, count, payout })
    }
  })

  return { totalWin, lineWins }
}

function easeOutQuad(x: number) {
  return 1 - (1 - x) * (1 - x)
}

export default function SlotsArcade() {
  const { credits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  const [betPerLine, setBetPerLine] = useState(1)
  const [linesActive, setLinesActive] = useState(PAYLINES.length)
  const [sessionPnL, setSessionPnL] = useState(0)

  const [grid, setGrid] = useState<SpinGrid>(() => randomGrid())
  const [spinning, setSpinning] = useState(false)
  const [spinT, setSpinT] = useState(0)
  const [lastWin, setLastWin] = useState(0)
  const [lastBet, setLastBet] = useState(0)
  const [banner, setBanner] = useState<string>('')

  const [lineWins, setLineWins] = useState<LineWin[]>([])

  const totalBet = betPerLine * linesActive
  const canSpin = !spinning && totalBet > 0 && credits >= totalBet

  const activeLineSet = useMemo(() => {
    const s = new Set<number>()
    for (let i = 0; i < linesActive; i++) s.add(i)
    return s
  }, [linesActive])

  const winningCellSet = useMemo(() => {
    const s = new Set<string>()
    for (const lw of lineWins) {
      const line = PAYLINES[lw.lineIndex]
      for (let col = 0; col < lw.count; col++) {
        const row = line[col]
        s.add(`${row}-${col}`)
      }
    }
    return s
  }, [lineWins])

  useEffect(() => {
    if (!spinning) return
    const start = performance.now()
    const duration = 1700

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      setSpinT(t)

      if (t < 1) {
        // random jitter frames while spinning
        const jitterGrid: SpinGrid = [[], [], []] as any
        for (let col = 0; col < 5; col++) {
          const reel = REELS[col]
          const startIndex = Math.floor(Math.random() * reel.length)
          for (let row = 0; row < 3; row++) {
            const idx = (startIndex + row) % reel.length
            jitterGrid[row][col] = reel[idx]
          }
        }
        setGrid(jitterGrid)
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [spinning])

  const handleSpin = () => {
    if (!canSpin) return

    setSpinning(true)
    setSpinT(0)
    setBanner('')
    setLineWins([])
    setLastBet(totalBet)
    setLastWin(0)

    // deduct immediately from arcade + local session
    addLoss(totalBet, { game: 'slots-arcade' })
    setSessionPnL(prev => prev - totalBet)

    const finalGrid = randomGrid()
    const { totalWin, lineWins } = evaluateGrid(finalGrid, betPerLine)

    setTimeout(() => {
      setGrid(finalGrid)
      setLineWins(lineWins)
      setSpinning(false)
      setLastWin(totalWin)

      if (totalWin > 0) {
        addWin(totalWin, { game: 'slots-arcade' })
        setSessionPnL(prev => prev + totalWin)

        const mult = totalWin / totalBet
        if (mult >= 25) {
          setBanner('MEGA WIN')
        } else if (mult >= 10) {
          setBanner('BIG WIN')
        } else {
          setBanner('WIN')
        }
      } else {
        setBanner('Better luck next spin')
      }
    }, 1800)
  }

  const left = (
    <div className="relative mx-auto w-full max-w-3xl rounded-[30px] border border-[#ffd977]/40 bg-[radial-gradient(circle_at_10%_0%,#1f2937,transparent_55%),radial-gradient(circle_at_90%_0%,#111827,transparent_55%),#020617] shadow-[0_26px_80px_rgba(0,0,0,0.95)] p-4 md:p-6">
      {/* Header HUD */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-[#fef3c7]/80">
            Base Gold Rush
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-white">
            Gold Rush Slots (Arcade)
          </div>
          <div className="text-[11px] text-white/70">
            5×3 reels • {PAYLINES.length} lines • demo credits only
          </div>
        </div>
        <div className="text-right text-[11px] text-white/70 space-y-1">
          <div>
            Arcade Stack:{' '}
            <span className="font-bold text-[#facc15]">
              {credits.toLocaleString()} BGRC
            </span>
          </div>
          <div>
            Slots Session:{' '}
            <span className={sessionPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {sessionPnL >= 0 ? '+' : ''}
              {sessionPnL.toFixed(2)} BGRC
            </span>
          </div>
        </div>
      </div>

      {/* Screen */}
      <div className="mt-2 rounded-[24px] border border-white/15 bg-gradient-to-b from-[#020617] via-[#020617] to-black px-3 py-4 md:px-5 md:py-5 relative overflow-hidden">
        {/* glass glow */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-16 bg-gradient-to-b from-white/18 via-transparent to-transparent opacity-60 rounded-b-full blur-sm" />

        {/* banner */}
        <div className="flex items-center justify-between mb-2 text-[10px] text-white/70 relative z-10">
          <span>
            Bet:{' '}
            <span className="font-semibold text-[#facc15]">
              {totalBet.toLocaleString()} BGRC
            </span>{' '}
            ({betPerLine} per line × {linesActive} lines)
          </span>
          <span>
            Last Win:{' '}
            <span className={lastWin > 0 ? 'text-emerald-300 font-semibold' : 'text-white/60'}>
              {lastWin > 0 ? `+${lastWin.toLocaleString()} BGRC` : '—'}
            </span>
          </span>
        </div>

        {/* reels grid */}
        <div className="relative z-10 grid grid-cols-5 grid-rows-3 gap-2 md:gap-3 py-2">
          {grid.map((row, rIdx) =>
            row.map((symKey, cIdx) => {
              const id = `${rIdx}-${cIdx}`
              const def = getSymbolDef(symKey)
              const winning = winningCellSet.has(id)

              const t = easeOutQuad(spinT)
              const scale = spinning ? 1 + 0.18 * (1 - t) : 1
              const blur = spinning ? (1 - t) * 3 : 0

              return (
                <div
                  key={id}
                  className={[
                    'relative rounded-2xl border flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#111827,#020617)]',
                    winning
                      ? 'border-[#facc15] shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                      : 'border-slate-700/70',
                  ].join(' ')}
                  style={{
                    height: 72,
                  }}
                >
                  <div
                    className="flex items-center justify-center w-full h-full select-none"
                    style={{
                      transform: `scale(${scale})`,
                      filter: blur ? `blur(${blur.toFixed(1)}px)` : undefined,
                      transition: spinning ? 'none' : 'transform 0.12s ease-out',
                    }}
                  >
                    {def.kind === 'logo' ? (
                      <div className="relative h-11 w-11 md:h-12 md:w-12 rounded-full border border-[#facc15]/80 bg-[radial-gradient(circle_at_30%_20%,#fff7d8,#f5d67a_40%,#b8860b_85%)] shadow-[0_0_18px_rgba(0,0,0,0.8)] flex items-center justify-center">
                        <Image
                          src="/images/bgld-logo-circle.png"
                          alt="BGLD"
                          fill={false}
                          width={38}
                          height={38}
                          className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                        />
                      </div>
                    ) : def.kind === 'bar' ? (
                      <div className="px-3 py-1 rounded-lg bg-black border border-[#facc15]/70 text-[#facc15] text-xs md:text-sm font-black tracking-[0.2em]">
                        BAR
                      </div>
                    ) : (
                      <span className="text-3xl md:text-4xl drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]">
                        {def.icon}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* bottom info / banner */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-white/70 relative z-10">
          <div className="flex flex-col gap-0.5">
            <span>
              Active lines:{' '}
              <span className="font-semibold text-[#facc15]">
                {linesActive}/{PAYLINES.length}
              </span>
            </span>
            <span>
              Arcade Net:{' '}
              <span className={arcadeNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {arcadeNet >= 0 ? '+' : ''}
                {arcadeNet.toFixed(2)} BGRC
              </span>
            </span>
          </div>
          <div className="h-7 flex items-center justify-end">
            {banner && (
              <div className="px-4 py-1 rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.95),rgba(217,119,6,0.95))] text-black text-[10px] font-black tracking-[0.28em] uppercase shadow-[0_0_18px_rgba(250,204,21,1)] border border-[#fff7d6]">
                {banner}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* control bar */}
      <div className="mt-4 rounded-2xl border border-white/15 bg-black/80 px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/70">
          <span>
            Bet per line:{' '}
            <span className="font-semibold text-[#facc15]">
              {betPerLine.toLocaleString()} BGRC
            </span>
          </span>
          <span>
            Total bet:{' '}
            <span className="font-semibold text-[#facc15]">
              {totalBet.toLocaleString()} BGRC
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 5, 10].map(v => (
            <button
              key={v}
              onClick={() => setBetPerLine(v)}
              disabled={spinning}
              className={[
                'px-3 py-1 rounded-full border text-[11px] font-semibold',
                betPerLine === v
                  ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef3c7]'
                  : 'border-white/25 bg-black/60 text-white/80',
                spinning ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {v} / line
            </button>
          ))}
          <button
            onClick={() =>
              setBetPerLine(prev => (prev >= 10 ? 1 : prev + 1))
            }
            disabled={spinning}
            className="px-3 py-1 rounded-full border border-white/25 bg-black/60 text-[11px] text-white/80 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +1
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70">
          <span>Lines:</span>
          {[3, 5, 9].map(v => (
            <button
              key={v}
              onClick={() => setLinesActive(v)}
              disabled={spinning}
              className={[
                'px-3 py-1 rounded-full border text-[11px] font-semibold',
                linesActive === v
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                  : 'border-white/25 bg-black/60 text-white/80',
                spinning ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {v} lines
            </button>
          ))}
        </div>

        <button
          onClick={handleSpin}
          disabled={!canSpin}
          className="mt-1 w-full h-11 rounded-xl bg-gradient-to-b from-[#facc15] to-[#f97316] text-black text-xs font-extrabold tracking-[0.2em] uppercase shadow-[0_0_24px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {spinning ? 'SPINNING…' : 'SPIN REELS'}
        </button>

        {!canSpin && !spinning && (
          <div className="text-[10px] text-rose-300 mt-1">
            {credits < totalBet
              ? 'Not enough demo credits for this bet.'
              : 'Set a bet amount to spin.'}
          </div>
        )}
      </div>
    </div>
  )

  const right = (
    <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
          PAYTABLE
        </div>
        <div className="mt-1 text-lg font-bold text-white">
          Gold Rush Slots (Demo)
        </div>
        <div className="mt-1 text-xs text-white/70">
          Front-end only video slot to model Base Gold Rush multipliers before
          we launch full on-chain slots contracts on Base mainnet.
        </div>
      </div>

      <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SYMBOLS.map(sym => (
            <div
              key={sym.key}
              className="flex items-center justify-between rounded-lg border border-white/12 bg-white/[0.02] px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="text-xl">
                  {sym.kind === 'logo' ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#facc15]/70 bg-[radial-gradient(circle_at_30%_20%,#fff7d8,#f5d67a_40%,#b8860b_85%)] text-[10px] font-black text-black">
                      BG
                    </span>
                  ) : sym.kind === 'bar' ? (
                    <span className="px-2 py-0.5 rounded bg-black text-[10px] font-black text-[#facc15] border border-[#facc15]/70">
                      BAR
                    </span>
                  ) : (
                    sym.icon
                  )}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] font-semibold ${sym.colorClass}`}>
                    {sym.label}
                  </span>
                  <span className="text-[10px] text-white/50">
                    Pays left-to-right on active lines
                  </span>
                </div>
              </div>
              <div className="text-right text-[10px] text-white/80">
                <div>
                  5×:{' '}
                  <span className="text-[#facc15] font-semibold">
                    {sym.pay['5']}×
                  </span>
                </div>
                <div>4×: {sym.pay['4']}×</div>
                <div>3×: {sym.pay['3']}×</div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-1 text-[10px] text-white/50">
          Multipliers apply to <span className="font-semibold text-[#facc15]">bet per line</span>.
          Demo only — real BGLD / BGRC slots will mirror this structure with
          verifiable randomness and Base mainnet settlement.
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.4fr)_360px] gap-6 items-start">
      {left}
      {right}
    </div>
  )
}
