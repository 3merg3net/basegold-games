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

type Phase = 'idle' | 'confirmed' | 'revealing' | 'result'
type Guess = 'HIGH' | 'LOW'

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

type Card = { rank: (typeof RANKS)[number]; suit: (typeof SUITS)[number] }

function cardFromIndex(i: number): Card {
  const rank = RANKS[i % RANKS.length]
  const suit = SUITS[Math.floor(i / RANKS.length) % SUITS.length]
  return { rank, suit }
}

function rankValue(r: (typeof RANKS)[number]): number {
  // A = 0 (highest), 2 = last (lowest)
  return RANKS.indexOf(r)
}

export default function HiLoV2Game() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  useEffect(() => {
    let t: any
    const load = async () => {
      try {
        const r = await fetch('/api/bgld-price', { cache: 'no-store' })
        const j = await r.json()
        setPriceUsd(typeof j?.priceUsd === 'number' ? j.priceUsd : null)
      } catch {}
      t = setTimeout(load, 30_000)
    }
    load()
    return () => clearTimeout(t)
  }, [])

  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

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

  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playHiLo' as any,
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [guess, setGuess] = useState<Guess>('HIGH')
  const [startCard, setStartCard] = useState<Card | null>(null)
  const [endCard, setEndCard] = useState<Card | null>(null)
  const [resultText, setResultText] = useState('')
  const [payout, setPayout] = useState(0)
  const [sessionPnL, setSessionPnL] = useState(0)

  // V3 pattern: playHiLo(uint256 stake, uint256 seed, bool guessHigher)
  const seed = useMemo(
    () => (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9)),
    [bet, guess]
  )

  // approve
  useEffect(() => {
    if (!approveWait.isSuccess) return
    refetchAllow()
    refetchBal()
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  // after confirm bet mined – derive the cards & prompt reveal
  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}`
    if (!h) return
    const base = BigInt(h)

    const idx1 = Number(base % BigInt(52))
    const idx2 = Number((base >> 10n) % BigInt(52))

    const c1 = cardFromIndex(idx1)
    const c2 = cardFromIndex(idx2)

    setStartCard(c1)
    setEndCard(c2)
    setPhase('confirmed')
    setResultText('Bet confirmed. Tap Reveal to see the next card.')
    setPayout(0)
    refetchBal()
  }, [playWait.isSuccess, playTx, refetchBal])

  const onApprove = () => {
    if (!approve) return
    approve({ args: [CASINO, maxUint256] as const })
  }

  const onConfirmBet = () => {
    if (!play) return
    setPhase('idle')
    setStartCard(null)
    setEndCard(null)
    setResultText('')
    setPayout(0)

    // ✅ call order: playHiLo(uint256 stake, uint256 seed, bool guessHigher)
    play({
      args: [stakeWei, seed, guess === 'HIGH'] as any,
    })
  }

  const onReveal = () => {
    if (phase !== 'confirmed' || !startCard || !endCard) return
    setPhase('revealing')

    const v1 = rankValue(startCard.rank)
    const v2 = rankValue(endCard.rank)
    const isHigher = v2 < v1 // A=0, 2=max index → lower index = higher rank
    const equal = v1 === v2

    const win =
      !equal &&
      ((guess === 'HIGH' && isHigher) || (guess === 'LOW' && !isHigher))

    // 🎰 1:1 style payout → gross 2x on win, 0x on loss/tie
    const mul = win ? 2 : 0
    const pay = win ? bet * mul : 0

    setTimeout(() => {
      setPhase('result')
      setPayout(pay)

      if (equal) {
        setResultText(
          `Tie — both cards ${startCard.rank}. House takes this round.`
        )
        setSessionPnL(prev => prev - bet) // tie = loss
      } else if (win) {
        setResultText(
          `${guess === 'HIGH' ? 'Higher' : 'Lower'} was correct! +${pay.toFixed(
            2
          )} BGRC`
        )
        // net = pay - stake = bet
        setSessionPnL(prev => prev + (pay - bet))
      } else {
        setResultText('Missed. Better luck on the next draw.')
        setSessionPnL(prev => prev - bet)
      }

      refetchBal()
    }, 550)
  }

  const canConfirm =
    !!address && hasAllowance && !placing && !outOfBounds && balance >= bet
  const canReveal = phase === 'confirmed'

  const approxUsd = (b: number) =>
    priceUsd ? `~$${(b * priceUsd).toFixed(b * priceUsd < 1 ? 4 : 2)}` : ''

  const renderCard = (card: Card | null, highlight?: boolean) => {
    if (!card)
      return (
        <div className="w-[78px] h-[112px] md:w-[96px] md:h-[138px] rounded-xl bg-[repeating-linear-gradient(135deg,#0b1220,#0b1220_6px,#1f2937_6px,#1f2937_12px)] border border-slate-700 shadow-[0_6px_20px_rgba(0,0,0,0.8)]" />
      )
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <div
        className={[
          'w-[78px] h-[112px] md:w-[96px] md:h-[138px] rounded-xl bg-white flex flex-col justify-between p-2',
          'shadow-[0_8px_26px_rgba(0,0,0,0.8)] border border-slate-300',
          highlight
            ? 'ring-2 ring-[#ffd977] ring-offset-2 ring-offset-emerald-900/60'
            : '',
        ].join(' ')}
      >
        <div
          className={[
            'text-sm font-bold',
            isRed ? 'text-red-600' : 'text-slate-900',
          ].join(' ')}
        >
          {card.rank}
          <span className="ml-0.5">{card.suit}</span>
        </div>
        <div
          className={[
            'text-4xl md:text-5xl text-center',
            isRed ? 'text-red-600' : 'text-slate-900',
          ].join(' ')}
        >
          {card.suit}
        </div>
        <div
          className={[
            'text-sm font-bold self-end rotate-180',
            isRed ? 'text-red-600' : 'text-slate-900',
          ].join(' ')}
        >
          {card.rank}
          <span className="ml-0.5">{card.suit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.1fr)_360px] gap-6 items-start">
      {/* LEFT: TABLE FELT */}
      <div className="relative rounded-[28px] border border-emerald-400/35 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_18px_45px_rgba(0,0,0,0.9)] p-4 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 -top-10 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(252,211,77,0.35),transparent_60%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.3em] text-emerald-100/85 uppercase">
              BASE GOLD RUSH
            </div>
            <div className="text-lg md:text-xl font-extrabold text-emerald-50 mt-1">
              Hi–Lo Table
            </div>
          </div>
          <div className="text-[11px] text-emerald-100/80 text-right">
            Aces high • ties lose
          </div>
        </div>

        {/* Center table + cards */}
        <div className="mt-3 rounded-3xl border border-emerald-200/30 bg-[radial-gradient(circle_at_50%_0%,#064e3b,#022c22_60%,#011712_100%)] px-4 py-5 md:px-6 md:py-6">
          {/* bet/guess strip */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div className="text-xs text-emerald-100/80">
              Bet:{' '}
              <span className="font-semibold text-emerald-50">
                {bet.toLocaleString()} BGRC
              </span>
              {priceUsd && (
                <span className="ml-1 text-[11px] text-emerald-100/70">
                  ({approxUsd(bet)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-100/80">
                Your call:
              </span>
              <div className="inline-flex rounded-full border border-emerald-200/60 bg-black/20 p-1">
                {(['HIGH', 'LOW'] as Guess[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGuess(g)}
                    disabled={phase === 'revealing'}
                    className={[
                      'px-3 py-1 rounded-full text-[11px] md:text-xs font-semibold',
                      guess === g
                        ? 'bg-emerald-300 text-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                        : 'text-emerald-100/80 hover:bg-emerald-900/40',
                      phase === 'revealing' ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {g === 'HIGH' ? 'HIGHER' : 'LOWER'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* cards row */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] tracking-[0.22em] uppercase text-emerald-100/80">
                CURRENT CARD
              </div>
              <div className="aspect-[2.3/3.5] w-[120px] md:w-[140px] rounded-3xl border border-emerald-200/50 bg-black/20 flex items-center justify-center">
                {renderCard(startCard)}
              </div>
            </div>

            <div className="text-3xl md:text-4xl font-black tracking-[0.25em] text-amber-200">
              VS
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] tracking-[0.22em] uppercase text-emerald-100/80">
                NEXT CARD
              </div>
              <div className="aspect-[2.3/3.5] w-[120px] md:w-[140px] rounded-3xl border border-emerald-200/50 bg-black/20 flex items-center justify-center">
                {renderCard(
                  phase === 'result' ? endCard : null,
                  phase === 'result'
                )}
              </div>
            </div>
          </div>

          {/* table text */}
          <div className="mt-5 flex flex-col gap-2 text-[11px] text-emerald-50/85">
            <div className="inline-flex items-center justify-center rounded-full border border-emerald-200/60 bg-black/30 px-4 py-1.5 text-xs text-emerald-50">
              {playWait.isLoading
                ? 'Resolving…'
                : resultText || 'Place your bet, choose HIGH or LOW, confirm, then reveal.'}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-100/80">
              <div>
                Aces are <span className="font-semibold">high</span>. Ties are{' '}
                <span className="font-semibold text-amber-200">house wins</span>.
              </div>
              <div>
                Session P&amp;L:{' '}
                <span
                  className={
                    sessionPnL >= 0
                      ? 'text-emerald-200 font-semibold'
                      : 'text-amber-200 font-semibold'
                  }
                >
                  {sessionPnL >= 0 ? '+' : ''}
                  {sessionPnL.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  BGRC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: WALLET & CONTROLS */}
      <div className="rounded-[24px] border border-white/12 bg-gradient-to-b from-[#020617] via-[#020617] to-black p-4 md:p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/60">
            WALLET & CONTROLS
          </div>
          <div className="mt-1 text-lg font-bold text-white">Hi–Lo</div>
          <div className="text-xs text-white/60 mt-1">
            Approve BGRC once, pick <b>Higher</b> or <b>Lower</b>, confirm your bet,
            then reveal the next card.
          </div>
        </div>

        {/* wallet + stake summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/15 bg-black/50 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">
              Wallet Balance
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {mounted
                ? balance.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : '…'}{' '}
              <span className="text-xs text-white/65">BGRC</span>
            </div>
            {priceUsd && (
              <div className="mt-1 text-[11px] text-white/55">
                {approxUsd(balance)}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-white/15 bg-black/50 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">
              Stake / Limits
            </div>
            <div className="mt-1 text-xl font-extrabold text-amber-200">
              {bet.toLocaleString()}{' '}
              <span className="text-xs text-amber-100/90">BGRC</span>
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Min {minB} • Max {maxB} BGRC
            </div>
          </div>
        </div>

        {/* stake chips */}
        <div>
          <div className="text-xs text-white/70 mb-2">Choose stake (BGRC)</div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(v => {
              const disabled = mounted && (v < minB || v > maxB)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBet(v)}
                  disabled={disabled}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border',
                    bet === v
                      ? 'border-[#ffd977]/80 bg-[#ffd977]/15 text-[#ffd977]'
                      : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                    disabled ? 'opacity-35 cursor-not-allowed' : '',
                  ].join(' ')}
                  title={priceUsd ? approxUsd(v) : ''}
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

        {/* approval + actions */}
        <div className="space-y-2">
          {!hasAllowance ? (
            <button
              onClick={onApprove}
              disabled={!mounted || approving || approveWait.isLoading}
              className="w-full btn-cyan h-11 text-sm font-semibold"
            >
              {!mounted
                ? '…'
                : approving || approveWait.isLoading
                ? 'Confirm in wallet…'
                : 'Approve BGRC for Hi–Lo'}
            </button>
          ) : (
            <>
              <button
                onClick={onConfirmBet}
                disabled={!mounted || !canConfirm}
                className="w-full btn-gold h-11 text-sm font-extrabold"
              >
                {!mounted
                  ? '…'
                  : placing || playWait.isLoading
                  ? 'Confirming bet…'
                  : 'Confirm Bet'}
              </button>
              <button
                onClick={onReveal}
                disabled={!mounted || !canReveal}
                className="w-full btn-dim h-10 text-sm"
              >
                {phase === 'revealing'
                  ? 'Revealing…'
                  : phase === 'confirmed'
                  ? 'Reveal Next Card'
                  : 'Waiting for bet…'}
              </button>
            </>
          )}

          {(approveErr || playErr) && (
            <div className="text-[11px] text-rose-400">
              {(approveErr as any)?.shortMessage ||
                (playErr as any)?.shortMessage ||
                String(approveErr || playErr)}
            </div>
          )}
        </div>

        {/* outcome panel */}
        <div className="rounded-xl border border-white/12 bg-black/40 p-3 text-xs">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Round Outcome
          </div>
          <div className="mt-1 text-sm text-white/85 min-h-[1.25rem]">
            {playWait.isLoading ? 'Resolving…' : resultText || '—'}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/15 bg-black/50 p-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                Last Payout
              </div>
              <div
                className={
                  payout > 0
                    ? 'text-emerald-400 text-sm font-bold'
                    : 'text-white text-sm font-bold'
                }
              >
                {payout > 0 ? `+${payout.toLocaleString()} BGRC` : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/50 p-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                Visual Only
              </div>
              <div className="text-[11px] text-white/65">
                Testnet odds &amp; payouts visualized here. Casino contract
                enforces the real on-chain result.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
