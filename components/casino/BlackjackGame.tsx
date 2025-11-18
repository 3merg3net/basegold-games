'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import {
  formatUnits,
  parseUnits,
  maxUint256,
  zeroAddress,
  isAddress,
} from 'viem'
import Casino from '@/abis/BaseGoldCasinoV3.json'

// ENV
const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

// Minimal ERC20 ABI
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

type Card = {
  rank: string
  suit: '♠' | '♥' | '♦' | '♣'
}

const DECK: Card[] = [
  'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2',
].flatMap(rank => ([
  { rank, suit: '♠' as const },
  { rank, suit: '♥' as const },
  { rank, suit: '♦' as const },
  { rank, suit: '♣' as const },
]))

function drawRandomCard(seed: bigint, offset: number): Card {
  const idx = Number((seed >> BigInt(offset * 11)) % BigInt(DECK.length))
  return DECK[idx]
}

function cardValue(c: Card): number {
  if (c.rank === 'A') return 11
  if (['K', 'Q', 'J'].includes(c.rank)) return 10
  return parseInt(c.rank, 10)
}

function handValue(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c)
    if (c.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

type Phase = 'idle' | 'confirming' | 'resolving' | 'result'

export default function BlackjackGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Price (for USD display)
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

  // Bounds
  const minBetQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minBet',
    enabled: mounted,
    watch: true,
  })
  const maxBetQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxBet',
    enabled: mounted,
    watch: true,
  })

  const minBetWei: bigint =
    typeof minBetQ.data === 'bigint' ? minBetQ.data : parseUnits('0.01', 18)
  const maxBetWei: bigint =
    typeof maxBetQ.data === 'bigint'
      ? maxBetQ.data
      : parseUnits('1000000', 18)

  const minBetB = Number(formatUnits(minBetWei, 18))
  const maxBetB = Number(formatUnits(maxBetWei, 18))

  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])
  const outOfBounds = bet < minBetB || bet > maxBetB

  // Balance + allowance
  const {
    data: balRaw,
    refetch: refetchBal,
  } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: mounted && Boolean(address && isAddress(BGLD)),
    watch: true,
  })
  const balanceWei: bigint = typeof balRaw === 'bigint' ? balRaw : 0n
  const balanceB = Number(formatUnits(balanceWei, 18))
  const balanceUsd = priceUsd != null ? balanceB * priceUsd : null

  // optimistic overlay
  const [effectiveBalance, setEffectiveBalance] = useState<number | null>(null)

  // sync overlay with chain balance when it changes
  useEffect(() => {
    if (!mounted) return
    setEffectiveBalance(prev => (prev === null ? balanceB : prev))
  }, [balanceB, mounted])

  const {
    data: allowRaw,
    refetch: refetchAllow,
  } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? zeroAddress, CASINO],
    enabled:
      mounted &&
      Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowanceWei: bigint =
    typeof allowRaw === 'bigint' ? allowRaw : 0n
  const hasAllowance = allowanceWei >= stakeWei

  // Track before/after for true net
  const [beforeWei, setBeforeWei] = useState<bigint | null>(null)
  const [lastNetWei, setLastNetWei] = useState<bigint | null>(null)
  const [lastPayoutWei, setLastPayoutWei] = useState<bigint | null>(null)

  // Approve
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

  useEffect(() => {
    if (approveWait.isSuccess) {
      refetchAllow()
      refetchBal()
    }
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  const onApprove = () =>
    approve?.({ args: [CASINO, maxUint256] as const })

  // Play Blackjack
  const {
    write: playBlackjack,
    data: playTx,
    isLoading: playing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playBlackjack',
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [statusText, setStatusText] = useState<string>(
    'Confirm your bet to start a new hand.'
  )
  const [seedUsed, setSeedUsed] = useState<bigint | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  // for extra draw pips on Hit
  const [drawOffset, setDrawOffset] = useState<number>(4)

  const canConfirm =
    !!address &&
    hasAllowance &&
    !outOfBounds &&
    balanceWei >= stakeWei &&
    !playing &&
    !playWait.isLoading

  const onConfirmBet = () => {
    if (!address || !playBlackjack) return
    setBeforeWei(balanceWei)
    setStatusText('Sending hand to chain… confirm in wallet.')
    setPhase('confirming')

    const seed =
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9))
    setSeedUsed(seed)

    // optimistic: subtract the stake immediately from overlay
    setEffectiveBalance(prev => {
      const base = prev ?? balanceB
      return base - bet
    })

    // contract: playBlackjack(uint256 stake, uint256 seed)
    playBlackjack({ args: [stakeWei, seed] as const })
  }

  // Once confirmed on-chain, recompute net & build hands from tx hash/seed
  useEffect(() => {
    if (!playWait.isSuccess || !beforeWei) return

    const recompute = async () => {
      setPhase('resolving')
      const b = await refetchBal()
      const after =
        typeof b.data === 'bigint'
          ? (b.data as bigint)
          : balanceWei

      const net = after - beforeWei
      const payout = net + stakeWei

      setLastNetWei(net)
      setLastPayoutWei(payout > 0n ? payout : 0n)

      // sync overlay with real chain balance
      const afterB = Number(formatUnits(after, 18))
      setEffectiveBalance(afterB)

      // build a pseudo-hand from hash + seed (visual only)
      const h = (playTx as any)?.hash as `0x${string}` | undefined
      const baseSeed =
        seedUsed != null
          ? seedUsed
          : h
          ? BigInt(h)
          : BigInt(Date.now())

      const p1 = drawRandomCard(baseSeed, 0)
      const d1 = drawRandomCard(baseSeed, 1)
      const p2 = drawRandomCard(baseSeed, 2)
      const d2 = drawRandomCard(baseSeed, 3)

      const pHand = [p1, p2]
      const dHand = [d1, d2]

      setPlayerHand(pHand)
      setDealerHand(dHand)
      setDrawOffset(4) // next draws for Hit start here

      const pv = handValue(pHand)
      const dv = handValue(dHand)

      if (net > 0n) {
        if (pv === 21 && pHand.length === 2) {
          setStatusText('Blackjack! You beat the house.')
        } else {
          setStatusText('You won the hand against the house.')
        }
      } else if (net < 0n) {
        if (pv > 21) {
          setStatusText('You busted. House wins this round.')
        } else if (dv === 21) {
          setStatusText('House hits blackjack. Tough beat.')
        } else {
          setStatusText('House wins this round.')
        }
      } else {
        setStatusText('Push. Your stake came back.')
      }

      setPhase('result')
    }

    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playWait.isSuccess])

  // Local-only Hit / Stand (visual)
  const onHit = () => {
    if (!seedUsed || phase !== 'result' || playerHand.length === 0) return

    setPlayerHand(prev => {
      const nextCard = drawRandomCard(seedUsed, drawOffset)
      const next = [...prev, nextCard]
      const v = handValue(next)

      if (v > 21) {
        setStatusText(
          `You draw and bust on ${v}. On-chain result above is already final.`
        )
      } else {
        setStatusText(
          `You hit and move to ${v}. On-chain result above is already final.`
        )
      }

      return next
    })
    setDrawOffset(o => o + 1)
  }

  const onStand = () => {
    if (phase !== 'result' || playerHand.length === 0) return
    const v = handValue(playerHand)
    setStatusText(
      `You stand on ${v}. On-chain payout shown in Last Hand Result.`
    )
  }

  const lastNet =
    lastNetWei != null
      ? Number(formatUnits(lastNetWei, 18))
      : 0
  const lastPayout =
    lastPayoutWei != null
      ? Number(formatUnits(lastPayoutWei, 18))
      : 0

  const usdStr = (amt: number) =>
    priceUsd != null
      ? `~$${(amt * priceUsd).toFixed(
          amt * priceUsd < 1 ? 4 : 2
        )}`
      : ''

  const displayBalance =
    effectiveBalance !== null ? effectiveBalance : balanceB

  const hitDisabled =
    phase !== 'result' || playerHand.length === 0
  const standDisabled =
    phase !== 'result' || playerHand.length === 0

  // UI
  return (
    <div className="rounded-2xl border border-[#14f195]/30 bg-gradient-to-br from-[#02050c] via-[#05030a] to-black p-4 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.24em] text-[#14f195]/80">
            Base Gold Blackjack
          </div>
          <div className="text-lg md:text-2xl font-extrabold text-white">
            Beat the dealer in the Base Gold Rush pit.
          </div>
          <div className="text-[11px] md:text-xs text-white/70 max-w-md">
            Confirm your BGRC stake, let the contract resolve the hand on Base,
            and watch the table light up. This is a simplified testnet model —
            payouts &amp; odds are enforced fully on-chain.
          </div>
        </div>

        {/* BIG BALANCE BLOCK */}
        <div className="rounded-2xl border border-emerald-400/50 bg-black/80 px-4 py-3 md:py-4 text-right w-full md:w-auto">
          <div className="text-[10px] md:text-[11px] font-semibold tracking-wide text-white/70">
            Wallet Balance
          </div>
          <div className="mt-0.5 text-2xl md:text-3xl font-black text-white leading-tight">
            {mounted
              ? displayBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })
              : '—'}{' '}
            <span className="text-[10px] md:text-xs font-semibold text-white/70">
              BGRC
            </span>
          </div>
          {balanceUsd != null && (
            <div className="text-[10px] md:text-[11px] text-white/70 mt-0.5">
              ≈ {balanceUsd.toFixed(balanceUsd < 1 ? 4 : 2)} USD
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(280px,1.1fr)_minmax(260px,0.9fr)] gap-4 md:gap-5">
        {/* TABLE UI – GREEN FELT */}
        <div className="relative rounded-3xl border border-emerald-500/60 bg-[radial-gradient(circle_at_50%_0%,#166534_0%,#052e16_40%,#020617_100%)] p-4 md:p-5 overflow-hidden min-h-[220px]">
          {/* Felt sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.35),transparent_65%)]" />

          {/* Subtle table edge ring */}
          <div className="pointer-events-none absolute inset-6 rounded-[999px] border border-emerald-300/20" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                Vegas Pit • Table 21
              </div>
              <div className="text-[10px] text-emerald-50/75">
                On-chain hands • Testnet V1
              </div>
            </div>

            {/* Dealer row */}
            <div>
              <div className="text-[11px] font-semibold text-emerald-50/90">
                Dealer
              </div>
              <div className="mt-2 flex gap-2">
                {dealerHand.length === 0 && (
                  <div className="text-[11px] text-emerald-50/70">
                    Waiting for a confirmed hand…
                  </div>
                )}
                {dealerHand.map((c, idx) => (
                  <PlayingCard key={idx} card={c} />
                ))}
              </div>
            </div>

            {/* Player row */}
            <div className="mt-5">
              <div className="text-[11px] font-semibold text-emerald-50/90">
                You
              </div>
              <div className="mt-2 flex gap-2">
                {playerHand.length === 0 && (
                  <div className="text-[11px] text-emerald-50/70">
                    Confirm a bet to draw a hand.
                  </div>
                )}
                {playerHand.map((c, idx) => (
                  <PlayingCard key={idx} card={c} highlight />
                ))}
              </div>
            </div>

            {/* Hit / Stand – now interactive (visual only) */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onHit}
                disabled={hitDisabled}
                className={[
                  'px-4 py-2 rounded-full text-sm font-semibold border transition',
                  hitDisabled
                    ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-50/50 opacity-60 cursor-not-allowed'
                    : 'border-emerald-300/80 bg-emerald-400/20 text-emerald-50 hover:bg-emerald-400/30 shadow-[0_0_18px_rgba(16,185,129,0.6)]',
                ].join(' ')}
              >
                Hit
              </button>
              <button
                type="button"
                onClick={onStand}
                disabled={standDisabled}
                className={[
                  'px-4 py-2 rounded-full text-sm font-semibold border transition',
                  standDisabled
                    ? 'border-emerald-100/30 bg-black/40 text-emerald-50/50 opacity-60 cursor-not-allowed'
                    : 'border-emerald-100/60 bg-black/60 text-emerald-50 hover:bg-black/70',
                ].join(' ')}
              >
                Stand
              </button>
            </div>
            <div className="mt-1 text-[10px] text-emerald-50/55 max-w-xs">
              Hit / Stand draw extra cards locally for visuals. The actual
              win/loss and payouts are resolved in a single on-chain hand.
            </div>
          </div>
        </div>

        {/* CONTROLS + RESULT */}
        <div className="space-y-4">
          {/* Stake panel */}
          <div className="rounded-2xl border border-white/15 bg-black/60 p-3 md:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-white/80">
                Stake per Hand
              </div>
              <div className="text-[10px] text-white/60 text-right">
                Bounds:{' '}
                {minBetB.toLocaleString()}–{maxBetB.toLocaleString()} BGRC
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((v) => {
                const disabled =
                  mounted && (v < minBetB || v > maxBetB)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => !disabled && setBet(v)}
                    disabled={disabled}
                    className={[
                      'rounded-lg px-2 py-2 text-xs md:text-sm font-semibold border',
                      bet === v
                        ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100'
                        : 'border-white/15 bg-black/80 text-white/80 hover:bg-white/5',
                      disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                    title={usdStr(v)}
                  >
                    {v}
                    <span className="ml-1 text-[10px] opacity-70">
                      {usdStr(v)}
                    </span>
                  </button>
                )
              })}
            </div>
            {mounted && outOfBounds && (
              <div className="mt-1 text-[10px] md:text-[11px] text-rose-400">
                Stake must be between{' '}
                {minBetB.toLocaleString()} and{' '}
                {maxBetB.toLocaleString()} BGRC.
              </div>
            )}
          </div>

          {/* Last hand result – big bold net */}
          <div className="rounded-2xl border border-white/15 bg-black/70 p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-white/80">
                Last Hand Result
              </div>
              <div className="text-[10px] text-white/60">
                {phase === 'confirming' || playWait.isLoading
                  ? 'Resolving on-chain…'
                  : ''}
              </div>
            </div>

            <div
              className={[
                'text-2xl md:text-3xl font-black',
                lastNet > 0
                  ? 'text-emerald-400'
                  : lastNet < 0
                  ? 'text-rose-400'
                  : 'text-slate-200',
              ].join(' ')}
            >
              {lastNet > 0 ? '+' : ''}
              {lastNet.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{' '}
              BGRC
            </div>

            <div className="text-[11px] md:text-xs text-white/75 min-h-[1.5rem]">
              {statusText}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-white/15 bg-black/80 p-2">
                <div className="text-[9px] uppercase tracking-[0.14em] text-white/60">
                  Net Change
                </div>
                <div
                  className={
                    lastNet > 0
                      ? 'text-emerald-400 text-sm font-bold'
                      : lastNet < 0
                      ? 'text-rose-400 text-sm font-bold'
                      : 'text-white text-sm font-bold'
                  }
                >
                  {lastNet > 0 ? '+' : ''}
                  {lastNet.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  BGRC
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-black/80 p-2">
                <div className="text-[9px] uppercase tracking-[0.14em] text-white/60">
                  Gross Payout
                </div>
                <div className="text-white text-sm font-bold">
                  {lastPayout.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  BGRC
                </div>
              </div>
            </div>
          </div>

          {/* Approve / Bet CTA */}
          <div className="space-y-2">
            {!hasAllowance ? (
              <button
                type="button"
                onClick={onApprove}
                disabled={
                  !mounted ||
                  approving ||
                  approveWait.isLoading ||
                  !address
                }
                className="btn-cyan w-full"
              >
                {!mounted
                  ? '…'
                  : approving || approveWait.isLoading
                  ? 'Confirm in wallet…'
                  : 'Approve BGRC for Blackjack'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConfirmBet}
                disabled={!mounted || !canConfirm}
                className="btn-gold w-full"
              >
                {!mounted
                  ? '…'
                  : playing || playWait.isLoading
                  ? 'Confirming on-chain…'
                  : 'Confirm Bet & Deal'}
              </button>
            )}
            {!address && (
              <div className="text-center text-[10px] md:text-[11px] text-white/70">
                Connect your wallet to play.
              </div>
            )}
            {(approveErr || playErr) && (
              <div className="text-[10px] md:text-[11px] text-rose-400/90">
                {(
                  (approveErr as any)?.shortMessage ||
                  (playErr as any)?.shortMessage ||
                  String(approveErr || playErr)
                )
                  .toString()
                  .slice(0, 180)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayingCard({ card, highlight }: { card: Card; highlight?: boolean }) {
  const isRed = card.suit === '♥' || card.suit === '♦'

  return (
    <div
      className={[
        'relative w-[54px] h-[78px] md:w-[64px] md:h-[92px]',
        'rounded-2xl border-[1.5px] bg-gradient-to-br from-white to-neutral-100',
        'shadow-[0_10px_18px_rgba(0,0,0,0.55)] flex flex-col justify-between px-2 py-1.5',
        'overflow-hidden',
        highlight
          ? 'border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.8)]'
          : 'border-neutral-300',
      ].join(' ')}
    >
      {/* subtle inner border */}
      <div className="pointer-events-none absolute inset-[3px] rounded-xl border border-white/60" />

      {/* top rank + suit */}
      <div className="relative flex items-start justify-between">
        <div
          className={[
            'text-[11px] font-bold leading-none',
            isRed ? 'text-red-600' : 'text-neutral-900',
          ].join(' ')}
        >
          {card.rank}
        </div>
        <div
          className={[
            'text-[11px] leading-none',
            isRed ? 'text-red-500' : 'text-neutral-800',
          ].join(' ')}
        >
          {card.suit}
        </div>
      </div>

      {/* center pip */}
      <div
        className={[
          'relative flex-1 flex items-center justify-center text-xl md:text-2xl',
          isRed ? 'text-red-500' : 'text-neutral-800',
        ].join(' ')}
      >
        {card.suit}
      </div>

      {/* bottom rank (rotated) */}
      <div className="relative flex items-end justify-between">
        <div className="flex-1" />
        <div
          className={[
            'text-[11px] font-bold leading-none rotate-180',
            isRed ? 'text-red-600' : 'text-neutral-900',
          ].join(' ')}
        >
          {card.rank}
        </div>
      </div>
    </div>
  )
}
