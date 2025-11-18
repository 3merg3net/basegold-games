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
  zeroAddress,
  isAddress,
  maxUint256,
} from 'viem'
import GameShell from '../general/GameShell'
import Casino from '@/abis/BaseGoldCasinoV3.json'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD =
  ((process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) ||
    zeroAddress) as `0x${string}`

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

const WEDGES = [
  { label: '0x', mul: 0 },
  { label: '1.2x', mul: 1.2 },
  { label: '0x', mul: 0 },
  { label: '1.5x', mul: 1.5 },
  { label: '0x', mul: 0 },
  { label: '2.0x', mul: 2.0 },
  { label: '0x', mul: 0 },
  { label: '3.0x', mul: 3.0 },
  { label: '0x', mul: 0 },
  { label: '1.0x', mul: 1.0 },
  { label: '0x', mul: 0 },
  { label: '2.5x', mul: 2.5 },
  { label: '0x', mul: 0 },
  { label: '1.8x', mul: 1.8 },
  { label: '0x', mul: 0 },
  { label: '5.0x', mul: 5.0 },
  { label: '0x', mul: 0 },
  { label: '1.4x', mul: 1.4 },
  { label: '0x', mul: 0 },
  { label: '10x', mul: 10.0 },
  { label: '0x', mul: 0 },
  { label: '1.6x', mul: 1.6 },
  { label: '0x', mul: 0 },
  { label: '25x', mul: 25.0 },
] as const

const SEG = 360 / WEDGES.length

export default function PanGameV2() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Price feed for USD vibes
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

  // Stake
  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  // Min / max
  const { data: minRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minBet',
    enabled: mounted,
    watch: true,
  })
  const { data: maxRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxBet',
    enabled: mounted,
    watch: true,
  })
  const minBet: bigint =
    typeof minRaw === 'bigint' ? minRaw : parseUnits('0.01', 18)
  const maxBet: bigint =
  typeof maxRaw === 'bigint' ? maxRaw : parseUnits('1000000', 18)

  const minB = Number(formatUnits(minBet, 18))
  const maxB = Number(formatUnits(maxBet, 18))
  const outOfBounds = bet < minB || bet > maxB

  // Wallet balance
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

  // Optimistic overlay (like coin flip / dice)
  const [effectiveBalance, setEffectiveBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!mounted) return
    setEffectiveBalance(prev => (prev === null ? balance : prev))
  }, [balance, mounted])
  const displayBalance =
    effectiveBalance !== null ? effectiveBalance : balance

  // Allowance
  const { data: allowRaw, refetch: refetchAllow } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? zeroAddress, CASINO],
    enabled:
      mounted &&
      Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowance: bigint = typeof allowRaw === 'bigint' ? allowRaw : 0n
  const hasAllowance = allowance >= stakeWei

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
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })

  useEffect(() => {
    if (!approveWait.isSuccess) return
    refetchAllow()
    refetchBal()
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  const onApprove = () =>
    approve?.({ args: [CASINO, maxUint256] as const })

  // playPan
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playPan',
  })
  const playWait = useWaitForTransaction({ hash: (playTx as any)?.hash })

  // Wheel + outcome
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landIndex, setLandIndex] = useState<number | null>(null)
  const [resultText, setResultText] = useState('')
  const [lastStake, setLastStake] = useState(0)

  // UI P&L (numbers, not wei)
  const [netDelta, setNetDelta] = useState(0)
  const [grossPayout, setGrossPayout] = useState(0)

  const lastNet = netDelta
  const lastPayout = grossPayout

  const approxUsd = (b: number) =>
    priceUsd ? `~$${(b * priceUsd).toFixed(b * priceUsd < 1 ? 4 : 2)}` : ''

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !outOfBounds &&
    displayBalance >= bet
  const canSpin = playWait.isSuccess && !spinning && landIndex !== null

  const onConfirm = () => {
    if (!play || !canConfirm) return

    setLastStake(bet)
    setResultText('Sending bet to Base… confirm in wallet.')
    setLandIndex(null)
    setNetDelta(0)
    setGrossPayout(0)

    // optimistic: subtract stake immediately
    setEffectiveBalance(prev => {
      const base = prev ?? balance
      return base - bet
    })

    const seed =
      (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9))

    play({ args: [stakeWei, seed] as const })
  }

  // After tx mined: choose wedge index from hash (visual only)
  useEffect(() => {
    if (!playWait.isSuccess) return
    const hash = (playTx as any)?.hash as `0x${string}` | undefined
    if (hash) {
      const n = Number(BigInt(hash) % BigInt(WEDGES.length))
      setLandIndex(n)
    }
    setResultText('Bet confirmed. Spin to resolve your haul.')
  }, [playWait.isSuccess, playTx])

  const startSpin = () => {
  if (landIndex == null) return

  setSpinning(true)

  const fullSpins = 20       // at least 20 full rotations every time
  const spinSeconds = 4.0    // spin duration in seconds

  setRotation(prev => {
    // normalize current angle into [0, 360)
    const base = ((prev % 360) + 360) % 360

    // center of the winning wedge
    const centerOffset = SEG / 2
    const targetAngle = landIndex * SEG + centerOffset

    // forward delta from current angle to that wedge center
    let delta = targetAngle - base
    delta = ((delta % 360) + 360) % 360 // ensure 0–360

    // add 20 full spins so it always rips around the wheel
    const extra = fullSpins * 360 + delta

    // negative so the wheel moves clockwise under a fixed pointer
    return prev - extra
  })

  setTimeout(() => {
    setSpinning(false)

    const wedge = WEDGES[landIndex]

    if (lastNet > 0) {
      setResultText(
        `Hit ${wedge.label} • Net +${lastNet.toFixed(
          4
        )} BGRC (gross ${lastPayout.toFixed(4)} BGRC)`
      )
    } else if (lastNet < 0) {
      setResultText(
        `Hit ${wedge.label} • Net ${lastNet.toFixed(
          4
        )} BGRC on this spin.`
      )
    } else if (wedge.mul === 0) {
      setResultText('Dry pan — 0x')
    } else {
      setResultText(
        `Hit ${wedge.label}, but on-chain result ended flat this spin.`
      )
    }

    // keep wallet in sync with chain
    refetchBal()
  }, spinSeconds * 1000)
}




  const wedgeColor = (i: number) =>
    WEDGES[i].mul > 0
      ? 'fill-[rgba(250,204,21,0.18)] stroke-[rgba(250,204,21,0.7)]'
      : 'fill-[rgba(15,23,42,0.9)] stroke-[rgba(148,163,184,0.5)]'

  const left = (
    <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-b from-[#020617] via-[#020617] to-black p-4 md:p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-yellow-500/80">
            Pan the Chain
          </div>
          <div className="mt-1 text-xs md:text-sm text-white/70 max-w-md">
            Confirm your BGRC stake on-chain, then spin the Pan Wheel. Contract
            handles the real jackpots; this cabinet lets you watch the gold hit.
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[420px] aspect-square">
        {/* pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-[#FACC15] drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
        </div>

        {/* wheel */}
        <div
          className="absolute inset-0 rounded-full bg-[#020617] flex items-center justify-center"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 4s cubic-bezier(.17,.67,.32,1.28)'
              : undefined,
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle
              cx="100"
              cy="100"
              r="98"
              fill="rgba(15,23,42,1)"
              stroke="rgba(148,163,184,0.5)"
              strokeWidth="2"
            />
            {WEDGES.map((w, i) => {
              const a0 = (i * SEG - 90) * (Math.PI / 180)
              const a1 = ((i + 1) * SEG - 90) * (Math.PI / 180)
              const x0 = 100 + 98 * Math.cos(a0)
              const y0 = 100 + 98 * Math.sin(a0)
              const x1 = 100 + 98 * Math.cos(a1)
              const y1 = 100 + 98 * Math.sin(a1)
              const largeArc = SEG > 180 ? 1 : 0
              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x0},${y0} A98,98 0 ${largeArc} 1 ${x1},${y1} Z`}
                    className={wedgeColor(i)}
                    strokeWidth="1"
                  />
                  <text
                    x="100"
                    y="100"
                    transform={`rotate(${
                      i * SEG + SEG / 2
                    } 100 100) translate(0 -70)`}
                    textAnchor="middle"
                    fontSize="9"
                    fill={w.mul > 0 ? '#FACC15' : 'rgba(148,163,184,0.9)'}
                    fontWeight={w.mul > 0 ? 800 : 500}
                  >
                    {w.label}
                  </text>
                </g>
              )
            })}
            <circle
              cx="100"
              cy="100"
              r="12"
              fill="#020617"
              stroke="rgba(250,204,21,0.7)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/12 bg-black/35 p-3 text-xs">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
          Spin Status
        </div>
        <div className="mt-1 text-sm text-white min-h-[1.25rem]">
          {playWait.isLoading
            ? 'Resolving on-chain…'
            : resultText || 'Confirm a bet, then spin the wheel.'}
        </div>
      </div>
    </div>
  )

  const right = (
    <>
      {/* Big wallet card */}
      <div className="rounded-xl border border-[#facc15]/40 bg-black/70 p-4 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#fef9c3]/80">
          Wallet Balance
        </div>
        <div className="mt-1 text-2xl md:text-3xl font-extrabold text-[#fef9c3] leading-tight">
          {mounted
            ? displayBalance.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })
            : '…'}{' '}
          <span className="text-xs md:text-sm font-semibold text-[#fde68a]">
            BGRC
          </span>
        </div>
        {priceUsd && (
          <div className="text-xs text-white/70 mt-1">
            ≈{' '}
            {(displayBalance * priceUsd).toFixed(
              displayBalance * priceUsd < 1 ? 4 : 2
            )}{' '}
            USD
          </div>
        )}
        <div className="mt-2 text-[11px] text-white/55">
          Table limits: {minB.toLocaleString()} – {maxB.toLocaleString()} BGRC
        </div>
      </div>

      {/* Stake selector */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white/90">
          Stake per Spin
        </div>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(v => {
            const disabled = mounted && (v < minB || v > maxB)
            return (
              <button
                key={v}
                onClick={() => !disabled && setBet(v)}
                disabled={disabled}
                className={[
                  'rounded-lg px-2 py-2 text-sm font-semibold border',
                  bet === v
                    ? 'border-[#FACC15]/70 bg-[#FACC15]/20 text-[#FACC15] shadow-[0_0_18px_rgba(250,204,21,0.7)]'
                    : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                  disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {v}
                {approxUsd(v) && (
                  <div className="mt-0.5 text-[10px] text-white/60">
                    {approxUsd(v)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {mounted && outOfBounds && (
          <div className="mt-2 text-xs text-rose-400">
            Bet must be between {minB} and {maxB} BGRC.
          </div>
        )}
      </div>

      {/* Actions + BIG P&L bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        {!hasAllowance ? (
          <button
            onClick={onApprove}
            disabled={!mounted || approving || approveWait.isLoading}
            className="w-full btn-cyan h-11 font-semibold"
          >
            {!mounted
              ? '…'
              : approving || approveWait.isLoading
              ? 'Confirm in wallet…'
              : 'Approve BGRC for Pan'}
          </button>
        ) : (
          <>
            <button
              onClick={onConfirm}
              disabled={!mounted || !canConfirm}
              className="w-full btn-gold h-11 font-extrabold"
            >
              {!mounted
                ? '…'
                : placing || playWait.isLoading
                ? 'Confirming…'
                : 'Confirm Bet'}
            </button>
            <button
              onClick={startSpin}
              disabled={!mounted || !canSpin}
              className="w-full btn-dim h-10 text-sm"
            >
              {spinning ? 'Spinning…' : 'Spin Wheel'}
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

        {/* BIG winnings bar */}
        <div className="rounded-lg border border-white/12 bg-black/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>Last Spin Result</span>
            <span>
              Last stake:{' '}
              <span className="font-semibold text-white">
                {lastStake ? `${lastStake} BGRC` : '—'}
              </span>
            </span>
          </div>

          <div
            className={[
              'text-2xl md:text-3xl font-extrabold tracking-tight',
              lastNet > 0
                ? 'text-emerald-400 drop-shadow-[0_0_22px_rgba(16,185,129,0.7)]'
                : lastNet < 0
                ? 'text-rose-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.6)]'
                : 'text-slate-100',
            ].join(' ')}
          >
            {lastNet > 0 ? '+' : ''}
            {lastNet.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}{' '}
            BGRC
          </div>

          <div className="text-[11px] text-white/75">
            Gross payout:{' '}
            <span className="font-semibold text-white">
              {lastPayout.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{' '}
              BGRC
            </span>
          </div>

          <div className="text-[10px] text-white/50">
            Winnings are computed from the wheel multiplier × your stake. The
            BaseGold casino contract enforces final jackpot logic on-chain.
          </div>
        </div>
      </div>
    </>
  )

  return (
    <GameShell
      title="Pan the Chain"
      subtitle="Stake BGRC, spin the Pan Wheel, and let the BaseGold jackpot logic decide how heavy your pan hits."
      left={left}
      right={right}
    />
  )
}
