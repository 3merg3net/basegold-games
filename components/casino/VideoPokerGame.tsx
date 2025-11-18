'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress, isAddress } from 'viem'
import Casino from '@/abis/BaseGoldCasinoV3.json'

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

type Phase = 'idle' | 'dealt' | 'drawing' | 'result'

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['J', 'Q', 'K', 'A', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

type Card = { rank: (typeof RANKS)[number]; suit: (typeof SUITS)[number] }

function cardFromIndex(i: number): Card {
  const rank = RANKS[i % RANKS.length]
  const suit = SUITS[Math.floor(i / RANKS.length) % SUITS.length]
  return { rank, suit }
}

export default function VideoPokerGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [bet, setBet] = useState(2)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  // min / max
  const { data: minRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minBet',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const { data: maxRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxBet',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const minBetWei: bigint =
    typeof minRaw === 'bigint' ? minRaw : parseUnits('0.01', 18)
  const maxBetWei: bigint =
    typeof maxRaw === 'bigint' ? maxRaw : parseUnits('1000000', 18)

  const minB = Number(formatUnits(minBetWei, 18))
  const maxB = Number(formatUnits(maxBetWei, 18))
  const outOfBounds = bet < minB || bet > maxB

  // balance & allowance
  const { data: balRaw, refetch: refetchBal } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: mounted && Boolean(address && isAddress(BGLD)),
    watch: true,
  })
  const balanceWei: bigint = typeof balRaw === 'bigint' ? balRaw : 0n
  const balance = Number(formatUnits(balanceWei, 18))

  const { data: allowanceRaw, refetch: refetchAllow } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? zeroAddress, CASINO],
    enabled:
      mounted && Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowance: bigint = typeof allowanceRaw === 'bigint' ? allowanceRaw : 0n
  const hasAllowance = allowance >= stakeWei

  // approve
  const {
    write: approve,
    data: approveTx,
    isLoading: approving,
    error: approveErr,
  } = useContractWrite({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'approve',
  })
  const approveWait = useWaitForTransaction({
    hash: (approveTx as any)?.hash,
  })

  // play
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playVideoPoker' as any,
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [cards, setCards] = useState<Card[]>([])
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false])
  const [resultText, setResultText] = useState('')
  const [payout, setPayout] = useState(0)
  const [netDelta, setNetDelta] = useState(0)

  const seed = useMemo(
    () => (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9)),
    [bet]
  )

  // After approve
  useEffect(() => {
    if (!approveWait.isSuccess) return
    refetchAllow()
  }, [approveWait.isSuccess, refetchAllow])

  // After confirm bet (deal)
  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}`
    if (!h) return

    // build a pseudo-deck from tx hash
    const base = BigInt(h)
    const newCards: Card[] = []
    for (let i = 0; i < 5; i++) {
      const idx = Number((base >> BigInt(i * 10)) % BigInt(52))
      newCards.push(cardFromIndex(idx))
    }
    setCards(newCards)
    setHolds([false, false, false, false, false])
    setPhase('dealt')
    setResultText('')
    setPayout(0)
    setNetDelta(0)
    refetchBal()
  }, [playWait.isSuccess, playTx, refetchBal])

  const onApprove = () => {
    if (!approve) return
    approve({ args: [CASINO, maxUint256] as const })
  }

  const onDeal = () => {
    if (!play) return
    setPhase('idle')
    setResultText('')
    setPayout(0)
    setNetDelta(0)
    play({
      // later: playVideoPoker(uint256 stake, uint256 seed)
      args: [stakeWei, seed] as any,
    })
  }

  const onToggleHold = (i: number) => {
    if (phase !== 'dealt') return
    setHolds(prev => prev.map((h, idx) => (idx === i ? !h : h)))
  }

  const onDraw = () => {
    if (phase !== 'dealt') return
    setPhase('drawing')

    // simple redraw for non-held cards
    const base = BigInt(playTx?.hash ?? seed)
    const newCards = cards.slice()
    let extraIdx = 5
    for (let i = 0; i < 5; i++) {
      if (holds[i]) continue
      const idx = Number((base >> BigInt(extraIdx * 10)) % BigInt(52))
      newCards[i] = cardFromIndex(idx)
      extraIdx++
    }

    // basic hand score (demo only)
    const score = evalHand(newCards)
    const mul =
      score === 'ROYAL FLUSH'
        ? 50
        : score === 'STRAIGHT FLUSH'
        ? 30
        : score === 'FOUR OF A KIND'
        ? 20
        : score === 'FULL HOUSE'
        ? 12
        : score === 'FLUSH'
        ? 8
        : score === 'STRAIGHT'
        ? 6
        : score === 'THREE OF A KIND'
        ? 4
        : score === 'TWO PAIR'
        ? 2.5
        : score === 'JACKS OR BETTER'
        ? 1.5
        : 0

    const won = mul > 0
    const pay = +(bet * mul).toFixed(2)
    const net = won ? pay - bet : -bet

    setTimeout(() => {
      setCards(newCards)
      setPhase('result')
      setPayout(pay)
      setNetDelta(net)
      if (won) {
        setResultText(`${score} — +${pay.toFixed(2)} BGRC`)
      } else {
        setResultText('No qualifying hand.')
      }
      refetchBal()
    }, 600)
  }

  const canDeal =
    !!address && hasAllowance && !placing && !outOfBounds && balance >= bet
  const canDraw = phase === 'dealt'

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.2fr)_360px] gap-6 items-start">
      {/* LEFT: Cabinet + Screen */}
      <div className="relative rounded-[26px] border border-[#f7e38a]/40 bg-gradient-to-br from-[#19192a] via-[#060712] to-[#050308] shadow-[0_0_60px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.32),transparent_60%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs md:text-sm font-semibold tracking-[0.3em] text-[#ffeaa6]/90 uppercase">
            BASE GOLD RUSH • VIDEO POKER
          </div>
          <div className="text-[11px] text-white/60">Jacks or Better • Multi-hand</div>
        </div>

        {/* Top glass / paytable preview */}
<div className="rounded-2xl border border-[#ffd977]/60 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.35),transparent_55%),radial-gradient(circle_at_90%_0%,rgba(147,51,234,0.4),transparent_55%),linear-gradient(to_bottom,#1b102b,#0b0715,#05020b)] px-4 py-3 mb-3 shadow-[0_0_28px_rgba(234,179,8,0.55)]">
  {/* header */}
  <div className="flex items-baseline justify-between text-[12px] md:text-sm text-[#fef3c7] font-semibold tracking-[0.18em] uppercase">
    <span>Pay Table</span>
    <span className="text-[11px] tracking-[0.16em] text-[#fde68a]">Payout × Bet</span>
  </div>

  {/* rows */}
  <div className="mt-2 space-y-1.5 text-[12px] md:text-[13px] text-white/90">
    {/* Royal Flush */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <span className="text-[#f97316] font-semibold">Royal Flush</span>
        </span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[11px]">
          <span className="text-[#fef08a]">A</span>
          <span className="text-[#fef08a]">K</span>
          <span className="text-[#fef08a]">Q</span>
          <span className="text-[#fef08a]">J</span>
          <span className="text-[#fef08a]">10</span>
          <span className="ml-1 text-[#fef9c3]">♠♥♦♣</span>
        </span>
      </div>
      <span className="text-right font-bold text-[#facc15] text-[13px] md:text-[14px]">
        50×
      </span>
    </div>

    {/* Straight Flush */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/95">Straight Flush</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[11px] text-[#fef9c3]">
          <span>♠</span>
          <span>♥</span>
          <span>♦</span>
          <span>♣</span>
        </span>
      </div>
      <span className="text-right font-semibold text-[#facc15]/95 text-[13px]">
        30×
      </span>
    </div>

    {/* Four of a Kind */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/95">Four of a Kind</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[11px] text-[#fef9c3]">
          <span>🂡</span>
          <span>🂱</span>
          <span>🃁</span>
          <span>🃑</span>
        </span>
      </div>
      <span className="text-right font-semibold text-[#facc15]/90 text-[13px]">
        20×
      </span>
    </div>

    {/* Full House */}
    <div className="flex items-center justify-between">
      <span className="font-semibold text-white/90">Full House</span>
      <span className="text-right font-semibold text-[#facc15]/90 text-[13px]">
        12×
      </span>
    </div>

    {/* Flush */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/90">Flush</span>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#fef9c3]">
          <span>♠</span>
          <span>♥</span>
          <span>♦</span>
          <span>♣</span>
        </span>
      </div>
      <span className="text-right font-semibold text-[#facc15]/80 text-[13px]">
        8×
      </span>
    </div>

    {/* Straight */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/90">Straight</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[11px] text-[#fef9c3]">
          <span>7</span>
          <span>8</span>
          <span>9</span>
          <span>10</span>
          <span>J</span>
        </span>
      </div>
      <span className="text-right font-semibold text-[#facc15]/75 text-[13px]">
        6×
      </span>
    </div>

    {/* Trips / Two Pair */}
    <div className="flex items-center justify-between">
      <span className="font-semibold text-white/90">Trips / Two Pair</span>
      <span className="text-right font-semibold text-[#facc15]/75 text-[13px]">
        4× / 2.5×
      </span>
    </div>

    {/* Jacks or Better */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/90">Jacks or Better</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[11px] text-[#fef9c3]">
          <span>J</span>
          <span>Q</span>
          <span>K</span>
          <span>A</span>
        </span>
      </div>
      <span className="text-right font-semibold text-[#facc15]/70 text-[13px]">
        1.5×
      </span>
    </div>
  </div>
</div>


        {/* Screen with cards */}
        <div className="rounded-2xl border border-white/15 bg-[radial-gradient(circle_at_50%_0%,#111827,#020617)] px-3 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-white/60">
              Bet:{' '}
              <span className="text-white font-semibold">{bet}</span>{' '}
              <span className="text-[11px] text-white/60">BGRC</span>
            </div>
            <div className="text-xs text-white/60">
              Phase:{' '}
              <span className="text-[#ffd977] font-semibold">
                {phase === 'idle'
                  ? 'Ready'
                  : phase === 'dealt'
                  ? 'Select Holds'
                  : phase === 'drawing'
                  ? 'Drawing…'
                  : 'Complete'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* cards row */}
            <div className="flex justify-between gap-1 md:gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const card = cards[i]
                const held = holds[i]
                const show = !!card
                const isRed = card && (card.suit === '♥' || card.suit === '♦')

                const canHold = phase === 'dealt' && show

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => canHold && onToggleHold(i)}
                    className={[
                      'flex-1 max-w-[20%] aspect-[2.4/3.5] rounded-xl border flex items-center justify-center transition-transform',
                      'shadow-[0_0_16px_rgba(0,0,0,0.8)]',
                      held ? 'border-[#ffd977]/80 scale-[1.03]' : 'border-white/15',
                      canHold ? 'cursor-pointer' : 'cursor-default',
                      !show ? 'bg-[#0b1020]' : 'bg-[#0b1020]',
                    ].join(' ')}
                  >
                    {show ? (
                      <div className="w-[80%] h-[88%] rounded-lg bg-white flex flex-col justify-between p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
                        <div
                          className={[
                            'text-xs font-bold',
                            isRed ? 'text-red-600' : 'text-slate-900',
                          ].join(' ')}
                        >
                          {card.rank}
                        </div>
                        <div
                          className={[
                            'text-2xl text-center',
                            isRed ? 'text-red-600' : 'text-slate-900',
                          ].join(' ')}
                        >
                          {card.suit}
                        </div>
                        <div
                          className={[
                            'text-xs font-bold self-end',
                            isRed ? 'text-red-600' : 'text-slate-900',
                          ].join(' ')}
                        >
                          {card.rank}
                        </div>
                      </div>
                    ) : (
                      <div className="w-[80%] h-[88%] rounded-lg bg-[repeating-linear-gradient(135deg,#0f172a,#0f172a_6px,#1e293b_6px,#1e293b_12px)] border border-slate-700" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* hold buttons (still there as an extra affordance) */}
            <div className="flex justify-between gap-1 md:gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const held = holds[i]
                return (
                  <button
                    key={i}
                    onClick={() => onToggleHold(i)}
                    disabled={phase !== 'dealt'}
                    className={[
                      'flex-1 text-[10px] md:text-xs py-1 rounded-full border',
                      'uppercase tracking-wide',
                      held
                        ? 'border-[#ffd977]/80 bg-[#ffd977]/15 text-[#ffd977]'
                        : 'border-white/20 bg-black/60 text-white/70',
                      phase !== 'dealt' ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {held ? 'HELD' : 'HOLD'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Controls & Outcome */}
      <div className="rounded-2xl border border-[#f5e3a8]/30 bg-gradient-to-b from-white/10 via-black/40 to-black/80 p-4 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        <div>
          <div className="text-lg font-bold text-[#fef3c7] drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]">
            Video Poker Controls
          </div>
          <div className="text-xs text-white/70 mt-1">
            Approve BGRC once, then press <b>DEAL</b> to get 5 cards. Tap a{' '}
            <b>card</b> (or the HOLD button) to keep it, then press <b>DRAW</b> to
            resolve the hand.
          </div>
        </div>

        {/* stake */}
        <div>
          <div className="text-sm text-white/80">Stake (BGRC)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(v => {
              const disabled = mounted && (v < minB || v > maxB)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBet(v)}
                  disabled={disabled}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border backdrop-blur',
                    bet === v
                      ? 'border-[#ffd977]/80 bg-[#ffd977]/20 text-[#ffd977] shadow-[0_0_18px_rgba(252,211,77,0.6)]'
                      : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                    disabled ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {v}
                </button>
              )
            })}
          </div>
          {mounted && outOfBounds && (
            <div className="mt-1 text-xs text-rose-400">
              Bet must be between {minB} and {maxB} BGRC.
            </div>
          )}
        </div>

        {/* balance / approval */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-[#facc15]/40 bg-black/60 p-3 shadow-[0_0_22px_rgba(234,179,8,0.4)]">
            <div className="text-[11px] text-[#fef9c3]/80 uppercase tracking-[0.18em]">
              Wallet Balance
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#fef9c3]">
              {mounted
                ? balance.toLocaleString(undefined, { maximumFractionDigits: 4 })
                : '…'}{' '}
              <span className="text-[11px] font-semibold text-[#fde68a]">BGRC</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/50 p-3">
            <div className="text-[11px] text-white/60 uppercase tracking-[0.18em]">
              Approval
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {mounted ? (hasAllowance ? 'Approved for play' : 'Not approved') : '…'}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="space-y-2">
          {!hasAllowance ? (
            <button
              onClick={onApprove}
              disabled={!mounted || approving || approveWait.isLoading}
              className="w-full rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.5)] hover:bg-cyan-400/25 disabled:opacity-40"
            >
              {!mounted
                ? '…'
                : approving || approveWait.isLoading
                ? 'Confirm in wallet…'
                : 'Approve BGRC for Casino'}
            </button>
          ) : (
            <>
              <button
                onClick={onDeal}
                disabled={!mounted || !canDeal}
                className="w-full rounded-full border border-[#fde68a]/80 bg-gradient-to-r from-[#facc15]/80 to-[#fb923c]/80 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(250,204,21,0.75)] hover:brightness-110 disabled:opacity-40"
              >
                {!mounted
                  ? '…'
                  : placing || playWait.isLoading
                  ? 'Confirming bet…'
                  : 'Deal'}
              </button>
              <button
                onClick={onDraw}
                disabled={!mounted || !canDraw}
                className="w-full rounded-full border border-white/20 bg-black/60 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
              >
                {phase === 'drawing' ? 'Drawing…' : 'Draw'}
              </button>
            </>
          )}

          {(approveErr || playErr) && (
            <div className="text-xs text-rose-400">
              {(approveErr as any)?.shortMessage ||
                (playErr as any)?.shortMessage ||
                String(approveErr || playErr)}
            </div>
          )}
        </div>

        {/* outcome */}
        <div className="rounded-xl border border-white/15 bg-black/50 p-3 space-y-2">
          <div className="text-sm font-semibold text-white/90 flex items-center justify-between">
            <span>Outcome</span>
          </div>

          <div
            className={[
              'mt-1 text-2xl md:text-3xl font-extrabold tracking-tight',
              netDelta > 0
                ? 'text-emerald-400 drop-shadow-[0_0_22px_rgba(16,185,129,0.7)]'
                : netDelta < 0
                ? 'text-rose-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.6)]'
                : 'text-slate-100',
            ].join(' ')}
          >
            {netDelta > 0 && '+'}
            {netDelta.toFixed(2)} BGRC
          </div>

          <div className="text-white/85 min-h-[1.25rem] text-sm">
            {playWait.isLoading ? 'Resolving…' : resultText || '—'}
          </div>

          {payout > 0 && (
            <div className="text-xs text-[#bbf7d0]">
              Payout:{' '}
              <span className="font-semibold">
                {payout.toFixed(2)} BGRC
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Super simple evaluator (demo only) */
function evalHand(cards: Card[]): string {
  if (cards.length !== 5) return 'NO HAND'
  const ranks = cards.map(c => c.rank)
  const suits = cards.map(c => c.suit)

  const counts: Record<string, number> = {}
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1
  const freqs = Object.values(counts).sort((a, b) => b - a)

  const isFlush = new Set(suits).size === 1

  const order = [...RANKS]
  const indices = ranks.map(r => order.indexOf(r)).sort((a, b) => a - b)
  let isStraight = true
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[0] + i) {
      isStraight = false
      break
    }
  }

  const highRanks = new Set(ranks)
  const isRoyal =
    isFlush &&
    isStraight &&
    ['A', 'K', 'Q', 'J', '10'].every(r => highRanks.has(r as any))

  if (isRoyal) return 'ROYAL FLUSH'
  if (isFlush && isStraight) return 'STRAIGHT FLUSH'
  if (freqs[0] === 4) return 'FOUR OF A KIND'
  if (freqs[0] === 3 && freqs[1] === 2) return 'FULL HOUSE'
  if (isFlush) return 'FLUSH'
  if (isStraight) return 'STRAIGHT'
  if (freqs[0] === 3) return 'THREE OF A KIND'
  if (freqs[0] === 2 && freqs[1] === 2) return 'TWO PAIR'
  if (
    freqs[0] === 2 &&
    ranks.some(r => r === 'J' || r === 'Q' || r === 'K' || r === 'A')
  )
    return 'JACKS OR BETTER'
  return 'NO HAND'
}
