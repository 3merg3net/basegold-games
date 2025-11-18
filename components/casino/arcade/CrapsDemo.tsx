'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type Phase = 'betting' | 'rolling' | 'resolving'

type Bets = {
  passLine: number
  dontPass: number
  field: number
  anySeven: number
  yo11: number
  snakeEyes: number
  boxcars: number
  aceDeuce: number
  place: {
    4: number
    5: number
    6: number
    8: number
    9: number
    10: number
  }
  hard: {
    4: number
    6: number
    8: number
    10: number
  }
}

type Player = {
  id: number
  name: string
  seat: string
  color: string
  credits: number
  sessionPnL: number
}

const initialBets: Bets = {
  passLine: 0,
  dontPass: 0,
  field: 0,
  anySeven: 0,
  yo11: 0,
  snakeEyes: 0,
  boxcars: 0,
  aceDeuce: 0,
  place: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
  hard: { 4: 0, 6: 0, 8: 0, 10: 0 },
}

const initialPlayers: Player[] = [
  {
    id: 1,
    name: 'Shooter 1',
    seat: 'Stick Left',
    color: '#facc15',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 2,
    name: 'Shooter 2',
    seat: 'Stick Right',
    color: '#22c55e',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 3,
    name: 'Shooter 3',
    seat: 'Base Left',
    color: '#38bdf8',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 4,
    name: 'Shooter 4',
    seat: 'Base Right',
    color: '#f97316',
    credits: 1_000,
    sessionPnL: 0,
  },
]

const chipDenoms = [1, 5, 25, 100] as const

function cloneBets(b: Bets): Bets {
  return {
    ...b,
    place: { ...b.place },
    hard: { ...b.hard },
  }
}

function sumBets(b: Bets): number {
  let total =
    b.passLine +
    b.dontPass +
    b.field +
    b.anySeven +
    b.yo11 +
    b.snakeEyes +
    b.boxcars +
    b.aceDeuce

  for (const k of [4, 5, 6, 8, 9, 10] as const) total += b.place[k]
  for (const k of [4, 6, 8, 10] as const) total += b.hard[k]
  return total
}

export default function CrapsDemo() {
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers)
  const [activeIdx, setActiveIdx] = useState(0)

  const activePlayer = players[activeIdx] ?? players[0]
  const credits = activePlayer?.credits ?? 0
  const sessionPnL = activePlayer?.sessionPnL ?? 0

  const [phase, setPhase] = useState<Phase>('betting')
  const [point, setPoint] = useState<number | null>(null)

  const [bets, setBets] = useState<Bets>(() => cloneBets(initialBets))
  const [chip, setChip] = useState<number>(5)

  const [die1, setDie1] = useState<number | null>(null)
  const [die2, setDie2] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [lastRoll, setLastRoll] = useState<string>('—')
  const [tableMsg, setTableMsg] = useState<string>(
    'Place your bets and roll the dice.'
  )
  const [detailMsg, setDetailMsg] = useState<string>('Come-out roll.')
  const [priceUsd, setPriceUsd] = useState<number | null>(null)

  // fake price just to match other arcade HUDs (optional API)
  useEffect(() => {
    let t: any
    const load = async () => {
      try {
        const r = await fetch('/api/bgld-price', { cache: 'no-store' })
        const j = await r.json()
        if (typeof j?.priceUsd === 'number') setPriceUsd(j.priceUsd)
      } catch {
        // ignore
      }
      t = setTimeout(load, 30_000)
    }
    load()
    return () => clearTimeout(t)
  }, [])

  const approxUsd = (v: number) => {
    if (!priceUsd) return '…'
    const x = v * priceUsd
    return `~$${x < 1 ? x.toFixed(4) : x.toFixed(2)}`
  }

  const stagedTotal = useMemo(() => sumBets(bets), [bets])
  const remainingCredits = credits - stagedTotal

  function updateActivePlayer(deltaCredits: number, deltaPnL: number) {
    setPlayers(prev =>
      prev.map((p, i) =>
        i === activeIdx
          ? {
              ...p,
              credits: Math.max(0, p.credits + deltaCredits),
              sessionPnL: p.sessionPnL + deltaPnL,
            }
          : p
      )
    )
  }

  function addBet(key: string, pointKey?: number) {
    if (phase !== 'betting') return
    if (chip <= 0) return
    if (stagedTotal + chip > credits) {
      setTableMsg('Not enough credits for that bet.')
      return
    }

    setBets(prev => {
      const next = cloneBets(prev)
      if (key === 'passLine') next.passLine += chip
      else if (key === 'dontPass') next.dontPass += chip
      else if (key === 'field') next.field += chip
      else if (key === 'anySeven') next.anySeven += chip
      else if (key === 'yo11') next.yo11 += chip
      else if (key === 'snakeEyes') next.snakeEyes += chip
      else if (key === 'boxcars') next.boxcars += chip
      else if (key === 'aceDeuce') next.aceDeuce += chip
      else if (key === 'place' && pointKey) {
        next.place[pointKey as 4 | 5 | 6 | 8 | 9 | 10] += chip
      } else if (key === 'hard' && pointKey) {
        next.hard[pointKey as 4 | 6 | 8 | 10] += chip
      }
      return next
    })
  }

  function clearTable() {
    if (phase !== 'betting') return
    setBets(cloneBets(initialBets))
    setTableMsg('Bets cleared. Place new bets and roll.')
  }

  function randomRoll(): [number, number] {
    const d1 = Math.floor(Math.random() * 6) + 1
    const d2 = Math.floor(Math.random() * 6) + 1
    return [d1, d2]
  }

  function resolveRoll(d1: number, d2: number) {
    const total = d1 + d2
    const isHard = d1 === d2
    const oldPoint = point
    let newPoint = oldPoint

    const betsBefore = stagedTotal
    let win = 0
    let lose = 0

    const b = bets // convenience

    // --- PASS / DON'T PASS ---
    if (b.passLine > 0 || b.dontPass > 0) {
      if (oldPoint == null) {
        // come-out logic
        if (total === 7 || total === 11) {
          if (b.passLine > 0) win += b.passLine * 2 // 1:1 (stake+win)
          if (b.dontPass > 0) lose += b.dontPass
          newPoint = null
        } else if (total === 2 || total === 3) {
          if (b.passLine > 0) lose += b.passLine
          if (b.dontPass > 0) win += b.dontPass * 2
          newPoint = null
        } else if (total === 12) {
          // bar 12 on don't pass (push)
          if (b.passLine > 0) lose += b.passLine
          newPoint = null
        } else if ([4, 5, 6, 8, 9, 10].includes(total)) {
          newPoint = total
        }
      } else {
        // point is on
        if (total === oldPoint) {
          if (b.passLine > 0) win += b.passLine * 2
          if (b.dontPass > 0) lose += b.dontPass
          newPoint = null
        } else if (total === 7) {
          if (b.passLine > 0) lose += b.passLine
          if (b.dontPass > 0) win += b.dontPass * 2
          newPoint = null
        }
      }
    }

    // --- FIELD (one-roll) ---
    if (b.field > 0) {
      if ([3, 4, 9, 10, 11].includes(total)) {
        win += b.field * 2 // 1:1
      } else if (total === 2) {
        win += b.field * 3 // 2:1
      } else if (total === 12) {
        win += b.field * 4 // 3:1
      } else {
        lose += b.field
      }
    }

    // --- ANY 7 (one-roll) ---
    if (b.anySeven > 0) {
      if (total === 7) win += b.anySeven * 5 // 4:1 approx
      else lose += b.anySeven
    }

    // --- YO (11) ---
    if (b.yo11 > 0) {
      if (total === 11) win += b.yo11 * 16 // 15:1 approx
      else lose += b.yo11
    }

    // --- Snake Eyes (2) ---
    if (b.snakeEyes > 0) {
      if (total === 2) win += b.snakeEyes * 31 // 30:1 approx
      else lose += b.snakeEyes
    }

    // --- Boxcars (12) ---
    if (b.boxcars > 0) {
      if (total === 12) win += b.boxcars * 31
      else lose += b.boxcars
    }

    // --- Ace-Deuce (3) ---
    if (b.aceDeuce > 0) {
      if (total === 3) win += b.aceDeuce * 16
      else lose += b.aceDeuce
    }

    // --- Place bets (persist) ---
    const placeNew = { ...b.place }
    if (oldPoint != null) {
      ;[4, 5, 6, 8, 9, 10].forEach(p => {
        const amt = b.place[p as 4 | 5 | 6 | 8 | 9 | 10]
        if (!amt) return
        if (total === p) {
          let mult = 0
          if (p === 4 || p === 10) mult = 2.8
          else if (p === 5 || p === 9) mult = 2.4
          else if (p === 6 || p === 8) mult = 2.1667
          win += amt * mult
        } else if (total === 7) {
          lose += amt
          placeNew[p as 4 | 5 | 6 | 8 | 9 | 10] = 0
        }
      })
    }

    // --- Hardways (persist) ---
    const hardNew = { ...b.hard }
    ;[4, 6, 8, 10].forEach(hw => {
      const amt = b.hard[hw as 4 | 6 | 8 | 10]
      if (!amt) return
      if (total === hw && isHard) {
        const mult = hw === 6 || hw === 8 ? 10 : 8
        win += amt * mult
      } else if (total === hw && !isHard) {
        // easy way knocks it down
        lose += amt
        hardNew[hw as 4 | 6 | 8 | 10] = 0
      } else if (total === 7) {
        lose += amt
        hardNew[hw as 4 | 6 | 8 | 10] = 0
      }
    })

    const totalStake = betsBefore
    const grossReturned = win
    const net = grossReturned - totalStake

    updateActivePlayer(-totalStake + grossReturned, net)

    // clean one-roll bets
    const nextBets: Bets = cloneBets(b)
    nextBets.field = 0
    nextBets.anySeven = 0
    nextBets.yo11 = 0
    nextBets.snakeEyes = 0
    nextBets.boxcars = 0
    nextBets.aceDeuce = 0
    nextBets.place = placeNew
    nextBets.hard = hardNew

    // pass/don't pass persistence: only if resolved
    if (oldPoint == null) {
      if (total === 7 || total === 11 || [2, 3, 12].includes(total)) {
        nextBets.passLine = 0
        nextBets.dontPass = 0
      }
    } else {
      if (total === 7 || total === oldPoint) {
        nextBets.passLine = 0
        nextBets.dontPass = 0
      }
    }

    setBets(nextBets)
    setPoint(newPoint)

    // messages
    let headline = ''
    if (oldPoint == null && newPoint != null) {
      headline = `Point is ON: ${newPoint}`
    } else if (oldPoint != null && newPoint == null) {
      headline = 'Point is OFF. Come-out roll next.'
    } else if (newPoint != null) {
      headline = `Point ${newPoint} is still ON.`
    } else {
      headline = 'Come-out roll.'
    }

    let outcome = ''
    if (net > 0) {
      outcome = `WIN +${net.toFixed(2)} BGRC (gross ${grossReturned.toFixed(2)})`
    } else if (net < 0) {
      outcome = `LOST ${(-net).toFixed(2)} BGRC`
    } else {
      outcome = 'PUSH — table came back flat.'
    }

    setTableMsg(outcome)
    setDetailMsg(headline)
  }

  function onRoll() {
    if (phase !== 'betting') return
    if (stagedTotal <= 0) {
      setTableMsg('Place at least one bet before rolling.')
      return
    }
    if (credits <= 0) {
      setTableMsg(
        `${activePlayer.name} is out of credits! Switch shooter or refresh to reset demo.`
      )
      return
    }

    setPhase('rolling')
    setRolling(true)
    setTableMsg('Dice are in the air…')
    setDetailMsg(point == null ? 'Come-out roll.' : `Point is ON: ${point}`)

    const [r1, r2] = randomRoll()
    const animDuration = 1200

    setTimeout(() => {
      setDie1(r1)
      setDie2(r2)
      setRolling(false)
      setPhase('resolving')

      const total = r1 + r2
      setLastRoll(`${r1} + ${r2} = ${total}`)

      setTimeout(() => {
        resolveRoll(r1, r2)
        setPhase('betting')
      }, 350)
    }, animDuration)
  }

  const pointStatus = point == null ? 'OFF' : `ON ${point}`

  function nextShooter() {
    if (phase !== 'betting') return
    const totalPlayers = players.length || 1
    setActiveIdx(prev => (prev + 1) % totalPlayers)
    setBets(cloneBets(initialBets))
    setPoint(null)
    setDie1(null)
    setDie2(null)
    setTableMsg('New shooter. Place your bets and roll.')
    setDetailMsg('Come-out roll.')
  }

  function selectShooter(idx: number) {
    if (idx === activeIdx) return
    if (phase !== 'betting') return
    setActiveIdx(idx)
    setBets(cloneBets(initialBets))
    setPoint(null)
    setDie1(null)
    setDie2(null)
    setTableMsg('Switched shooter. New come-out roll.')
    setDetailMsg('Come-out roll.')
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Global styles for dice animation */}
      <style jsx global>{`
        @keyframes craps-dice-throw {
          0% {
            transform: translate3d(-40px, 40px, 0) rotate(-45deg);
            opacity: 0;
          }
          30% {
            transform: translate3d(10px, -10px, 0) rotate(120deg);
            opacity: 1;
          }
          60% {
            transform: translate3d(40px, 0px, 0) rotate(260deg);
          }
          85% {
            transform: translate3d(55px, -8px, 0) rotate(340deg);
          }
          100% {
            transform: translate3d(60px, 0px, 0) rotate(360deg);
          }
        }
        .animate-craps-die {
          animation: craps-dice-throw 0.9s cubic-bezier(0.25, 0.7, 0.3, 1)
            forwards;
        }
      `}</style>

      {/* Top HUD */}
      <div className="rounded-2xl border border-[#facc15]/40 bg-gradient-to-r from-black via-[#020617] to-black px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#facc15]/80">
            BASE GOLD RUSH ARCADE
          </div>
          <div className="text-lg md:text-xl font-extrabold text-white">
            Craps • BGRC Demo Table
          </div>
          <div className="text-xs text-white/65 mt-1">
            Local-only credits. Multi-shooter rotation so you can simulate a
            real rail of friends at the table.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs min-w-[240px]">
          <InfoPill
            label="Active Shooter"
            value={activePlayer.name}
            sub={activePlayer.seat}
            tone="gold"
          />
          <InfoPill
            label="Shooter P&L"
            value={`${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toFixed(
              2
            )} BGRC`}
            sub={`Last roll: ${lastRoll}`}
            tone={sessionPnL >= 0 ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Shooter rail */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[11px] uppercase tracking-[0.22em] text-white/60">
          Shooter Rail
        </span>
        {players.map((p, i) => {
          const isActive = i === activeIdx
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectShooter(i)}
              className={[
                'flex items-center gap-2 rounded-full border px-3 py-1',
                isActive
                  ? 'border-white bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.4)]'
                  : 'border-white/20 bg-black/40 hover:bg-white/10',
              ].join(' ')}
            >
              <span
                className="w-5 h-5 rounded-full"
                style={{ background: p.color }}
              />
              <span className="font-semibold text-white truncate max-w-[110px]">
                {p.name}
              </span>
              <span className="text-[10px] text-white/60 hidden sm:inline">
                {p.credits.toLocaleString()} BGRC
              </span>
            </button>
          )
        })}
      </div>

      {/* Main layout: table + side panel */}
      <div className="grid md:grid-cols-[minmax(360px,1.3fr)_320px] gap-5 items-start">
        {/* TABLE */}
        <div className="relative rounded-[30px] border border-emerald-400/50 bg-[radial-gradient(circle_at_10%_0%,#065f46,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_24px_60px_rgba(0,0,0,0.9)] px-4 py-5 md:px-6 md:py-6 overflow-hidden">
          {/* top glow */}
          <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.45),transparent_60%)]" />

          {/* header strip */}
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-50/90 font-semibold">
                CRAPS TABLE
              </div>
              <div className="text-xs text-emerald-50/80">
                Tap on the felt to place bets, then roll the dice.
              </div>
            </div>
            <div className="text-right text-[11px] text-emerald-50/80">
              <div>
                Point:{' '}
                <span
                  className={
                    point == null
                      ? 'text-emerald-100 font-semibold'
                      : 'text-[#facc15] font-semibold'
                  }
                >
                  {pointStatus}
                </span>
              </div>
              <div>
                Stage:{' '}
                <span className="font-semibold">
                  {phase === 'betting'
                    ? 'Betting'
                    : phase === 'rolling'
                    ? 'Rolling'
                    : 'Resolving'}
                </span>
              </div>
            </div>
          </div>

          {/* felt main area */}
          <div className="relative rounded-[26px] border border-emerald-200/60 bg-[radial-gradient(circle_at_40%_0%,#059669,#065f46_55%,#022c22_80%)] px-3 py-4 md:px-5 md:py-5">
            {/* DIce & puck row */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <PointPuck point={point} />
                <div className="text-[11px] text-emerald-50/85 max-w-xs">
                  {detailMsg}
                </div>
              </div>
              <DiceDisplay die1={die1} die2={die2} rolling={rolling} />
            </div>

            {/* BET GRID */}
            <div className="grid grid-rows-[auto_auto_auto] gap-3 text-[10px] md:text-[11px] text-emerald-50 font-semibold">
              {/* TOP: place & hardways */}
              <div className="grid grid-cols-6 gap-2">
                {[4, 5, 6, 8, 9, 10].map(n => (
                  <BetBox
                    key={`place-${n}`}
                    label={`PLACE ${n}`}
                    sub="multi-roll"
                    amount={bets.place[n as 4 | 5 | 6 | 8 | 9 | 10]}
                    onClick={() => addBet('place', n)}
                    tone="outline"
                  />
                ))}
              </div>

              {/* MIDDLE: FIELD + PROP STRIP */}
              <div className="grid grid-cols-[2.3fr_1.2fr] gap-3">
                {/* FIELD */}
                <div className="relative rounded-2xl border border-emerald-200/70 bg-[radial-gradient(circle_at_50%_0%,#047857,#065f46_55%,#022c22_100%)] px-4 py-3 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)] opacity-70" />
                  <div className="relative flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="tracking-[0.22em] uppercase text-[10px] text-emerald-50/90">
                        FIELD
                      </div>
                      <div className="text-[9px] text-emerald-50/80">
                        3,4,9,10,11 pay 1:1 • 2 pays 2:1 • 12 pays 3:1
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-emerald-50/80">
                        Active field
                      </div>
                      <div className="text-base font-black text-[#fef9c3]">
                        {bets.field.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addBet('field')}
                    className="relative mt-2 inline-flex items-center justify-center rounded-full border border-emerald-200/70 bg-black/40 px-3 py-1 text-[10px] hover:bg-emerald-900/60"
                  >
                    TAP TO BET FIELD
                  </button>
                </div>

                {/* PROP RAIL */}
                <div className="grid grid-cols-2 gap-2">
                  <BetBox
                    label="ANY 7"
                    sub="one roll"
                    amount={bets.anySeven}
                    onClick={() => addBet('anySeven')}
                    tone="danger"
                  />
                  <BetBox
                    label="YO 11"
                    sub="one roll"
                    amount={bets.yo11}
                    onClick={() => addBet('yo11')}
                    tone="accent"
                  />
                  <BetBox
                    label="SNAKE EYES"
                    sub="2 • one roll"
                    amount={bets.snakeEyes}
                    onClick={() => addBet('snakeEyes')}
                    tone="accent"
                  />
                  <BetBox
                    label="BOXCARS"
                    sub="12 • one roll"
                    amount={bets.boxcars}
                    onClick={() => addBet('boxcars')}
                    tone="accent"
                  />
                  <BetBox
                    label="ACE-DEUCE"
                    sub="3 • one roll"
                    amount={bets.aceDeuce}
                    onClick={() => addBet('aceDeuce')}
                    tone="accent"
                  />
                  <div className="rounded-xl border border-emerald-200/60 bg-black/30 px-2 py-2">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-emerald-50/80">
                      HARDWAYS
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {[4, 6, 8, 10].map(n => (
                        <button
                          key={`hard-${n}`}
                          type="button"
                          onClick={() => addBet('hard', n)}
                          className="rounded-lg border border-emerald-200/60 bg-emerald-900/40 px-1.5 py-1 text-[9px] hover:bg-emerald-800/70"
                        >
                          HARD {n}
                          <div className="text-[9px] text-emerald-100/80">
                            {bets.hard[n as 4 | 6 | 8 | 10] || 0}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM: PASS / DON'T PASS */}
              <div className="grid grid-cols-[1.3fr_1.1fr] gap-3">
                <div className="rounded-2xl border border-emerald-200/70 bg-black/35 px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/85">
                      PASS LINE
                    </div>
                    <div className="text-[10px] text-emerald-50/80">
                      Wins 7/11 on come-out. Point must repeat before 7.
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-[10px] text-emerald-50/80">
                      <div>Active bet</div>
                      <div className="text-base font-black text-[#fefce8]">
                        {bets.passLine.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addBet('passLine')}
                      className="rounded-full border border-emerald-200/70 bg-emerald-900/60 px-3 py-1.5 text-[10px] hover:bg-emerald-700/80"
                    >
                      BET PASS
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200/70 bg-black/35 px-3 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/85">
                        DON&apos;T PASS
                      </div>
                      <div className="text-[10px] text-emerald-50/80">
                        Lays against the shooter. 12 pushes.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addBet('dontPass')}
                      className="rounded-full border border-emerald-200/70 bg-emerald-900/60 px-3 py-1.5 text-[10px] hover:bg-emerald-700/80"
                    >
                      BET DON&apos;T
                    </button>
                  </div>
                  <div className="text-[10px] text-emerald-50/80 flex items-center justify-between">
                    <span>Active:</span>
                    <span className="text-base font-black text-[#fefce8]">
                      {bets.dontPass.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE MESSAGE */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px]">
              <div className="inline-flex items-center rounded-full border border-amber-200/70 bg-black/60 px-3 py-1.5 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                {tableMsg}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-emerald-50/85">
                <span>
                  Staged Bets:{' '}
                  <span className="font-semibold text-emerald-50">
                    {stagedTotal.toFixed(2)} BGRC
                  </span>
                </span>
                <span>
                  Shooter Credits:{' '}
                  <span className="font-semibold text-emerald-50">
                    {remainingCredits.toFixed(2)} BGRC
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* CONTROLS STRIP */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[11px] text-emerald-50/80 mb-1">
                Choose chip &amp; tap on the felt to bet
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {chipDenoms.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setChip(v)}
                    className={[
                      'relative rounded-full border px-2.5 py-1 flex items-center gap-1 text-[11px] font-semibold',
                      chip === v
                        ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef9c3] shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                        : 'border-emerald-200/60 bg-black/40 text-emerald-50 hover:bg-emerald-900/60',
                    ].join(' ')}
                  >
                    <ChipIcon value={v} />
                    {v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearTable}
                  disabled={phase !== 'betting'}
                  className="rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Bets
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={nextShooter}
                disabled={phase !== 'betting'}
                className="rounded-full border border-white/30 bg-black/60 px-4 py-1.5 text-[11px] text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next Shooter
              </button>
              <button
                type="button"
                onClick={onRoll}
                disabled={phase !== 'betting' || stagedTotal <= 0}
                className={[
                  'rounded-full px-6 py-2 text-xs font-semibold tracking-[0.2em] uppercase',
                  phase === 'betting' && stagedTotal > 0
                    ? 'bg-[#facc15] text-black shadow-[0_0_18px_rgba(250,204,21,0.9)] hover:bg-[#fde68a]'
                    : 'bg-slate-700 text-slate-300 cursor-not-allowed',
                ].join(' ')}
              >
                {phase === 'rolling' ? 'Rolling…' : 'Roll Dice'}
              </button>
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
              GAME SUMMARY
            </div>
            <div className="mt-1 text-lg font-bold text-white">
              Craps Demo (BGRC)
            </div>
            <div className="mt-1 text-xs text-white/70">
              Fully local demo of a modern video craps machine in the Base Gold
              Rush theme. Multi-shooter rotation so you can model how a real
              table would feel before writing V4 on-chain contracts.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/14 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                Shooter Balance
              </div>
              <div className="mt-1 text-xl font-extrabold text-white">
                {credits.toLocaleString()}{' '}
                <span className="text-xs text-white/70">BGRC</span>
              </div>
              {priceUsd && (
                <div className="mt-1 text-[11px] text-white/55">
                  {approxUsd(credits)}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/14 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                Shooter P&amp;L
              </div>
              <div
                className={[
                  'mt-1 text-xl font-extrabold',
                  sessionPnL >= 0 ? 'text-emerald-300' : 'text-rose-300',
                ].join(' ')}
              >
                {sessionPnL >= 0 ? '+' : ''}
                {sessionPnL.toFixed(2)} BGRC
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Each seat tracks its own P&amp;L. Swap shooters via the rail or
                the Next Shooter button.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
            <div className="text-sm font-semibold text-white">
              Table Rules (Demo)
            </div>
            <ul className="space-y-1 text-white/70 list-disc list-inside">
              <li>Standard pass / don&apos;t pass logic with point ON/OFF.</li>
              <li>Field, Any 7, Yo, 2/3/12 props &amp; hardways included.</li>
              <li>Place bets on 4, 5, 6, 8, 9, 10 with approximate payouts.</li>
              <li>Hardways knocked down by easy ways or 7.</li>
              <li>Multi-shooter rotation, per-seat credits &amp; P&amp;L.</li>
            </ul>
            <div className="text-[11px] text-white/50 pt-1">
              This is <span className="font-semibold">front-end only</span> and
              meant to mirror a real Vegas video craps machine. Future{' '}
              <span className="font-semibold text-[#facc15]">BGLD / BGRC</span>{' '}
              contracts can plug in Chainlink VRF or L2-native randomness,
              settle to a shared casino treasury, and reuse this exact UX.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- sub components ---------- */

function DiceDisplay({
  die1,
  die2,
  rolling,
}: {
  die1: number | null
  die2: number | null
  rolling: boolean
}) {
  const faces = (v: number | null) => (v == null ? '•' : String(v))

  return (
    <div className="relative flex items-center gap-2 pr-1">
      <div className="text-[10px] text-emerald-50/80 mr-1 text-right">
        <div>DICE</div>
        <div className="text-[11px] font-semibold">
          {die1 && die2 ? `${die1} + ${die2} = ${die1 + die2}` : '—'}
        </div>
      </div>
      <div className="relative flex items-center gap-2">
        <div
          className={[
            'w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white flex items-center justify-center text-lg font-bold text-slate-800 shadow-[0_8px_18px_rgba(0,0,0,0.7)] border border-slate-300',
            rolling ? 'animate-craps-die' : '',
          ].join(' ')}
        >
          {faces(die1)}
        </div>
        <div
          className={[
            'w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white flex items-center justify-center text-lg font-bold text-slate-800 shadow-[0_8px_18px_rgba(0,0,0,0.7)] border border-slate-300',
            rolling ? 'animate-craps-die' : '',
          ].join(' ')}
          style={rolling ? { animationDelay: '0.08s' } : undefined}
        >
          {faces(die2)}
        </div>
      </div>
    </div>
  )
}

function PointPuck({ point }: { point: number | null }) {
  const isOn = point != null
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          'w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-black tracking-[0.16em]',
          isOn
            ? 'bg-[#facc15] border-[#fef9c3] text-black shadow-[0_0_16px_rgba(250,204,21,0.9)]'
            : 'bg-black/70 border-emerald-200/80 text-emerald-50',
        ].join(' ')}
      >
        {isOn ? 'ON' : 'OFF'}
      </div>
      {isOn && (
        <div className="text-[11px] text-emerald-50 font-semibold">
          Point {point}
        </div>
      )}
    </div>
  )
}

function BetBox({
  label,
  sub,
  amount,
  onClick,
  tone,
}: {
  label: string
  sub?: string
  amount: number
  onClick: () => void
  tone: 'outline' | 'danger' | 'accent'
}) {
  const base =
    tone === 'outline'
      ? 'border-emerald-200/70 bg-black/35 hover:bg-emerald-900/50'
      : tone === 'danger'
      ? 'border-rose-300/80 bg-rose-950/60 hover:bg-rose-900/70'
      : 'border-amber-200/80 bg-amber-950/50 hover:bg-amber-900/70'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-2.5 py-1.5 text-left ${base}`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em]">{label}</div>
      {sub && (
        <div className="text-[9px] text-emerald-50/75 mt-0.5">{sub}</div>
      )}
      <div className="mt-1 text-[11px] text-emerald-50">
        Bet:{' '}
        <span className="font-semibold">
          {amount.toLocaleString()} BGRC
        </span>
      </div>
    </button>
  )
}

function InfoPill({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'gold' | 'green' | 'red'
}) {
  const palette =
    tone === 'gold'
      ? 'border-[#facc15]/60 bg-[#facc15]/10 text-[#fef9c3]'
      : tone === 'green'
      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
      : 'border-rose-400/60 bg-rose-400/10 text-rose-100'

  return (
    <div className={`rounded-lg border px-3 py-2 ${palette}`}>
      <div className="text-[8px] uppercase tracking-[0.24em] opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] opacity-80 truncate mt-0.5">{sub}</div>
      )}
    </div>
  )
}

function ChipIcon({ value }: { value: number }) {
  const src =
    value === 1
      ? '/chips/chip-bgrc-1.png'
      : value === 5
      ? '/chips/chip-bgrc-5.png'
      : value === 25
      ? '/chips/chip-bgrc-25.png'
      : '/chips/chip-bgrc-100.png'

  return (
    <div className="relative w-5 h-5">
      <Image
        src={src}
        alt={`${value} chip`}
        fill
        className="object-contain"
      />
    </div>
  )
}
