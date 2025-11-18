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
const BGLD =
  ((process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress) as `0x${string}`

/** European wheel numbers in order */
const WHEEL_NUMBERS = [
  0,
  32,
  15,
  19,
  4,
  21,
  2,
  25,
  17,
  34,
  6,
  27,
  13,
  36,
  11,
  30,
  8,
  23,
  10,
  5,
  24,
  16,
  33,
  1,
  20,
  14,
  31,
  9,
  22,
  18,
  29,
  7,
  28,
  12,
  35,
  3,
  26,
]

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

type BetKind = 'color' | 'parity' | 'range' | 'single'

type Bet =
  | { kind: 'color'; value: 'RED' | 'BLACK' }
  | { kind: 'parity'; value: 'ODD' | 'EVEN' }
  | { kind: 'range'; value: 'LOW' | 'HIGH' } // 1–18 / 19–36
  | { kind: 'single'; value: number }

/** helper */
function isRed(n: number) {
  return RED_NUMBERS.has(n)
}

export default function RouletteGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // price (for USD approximate)
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

  /** stake */
  const [betAmount, setBetAmount] = useState(1)
  const stakeWei = useMemo(
    () => parseUnits(String(betAmount), 18),
    [betAmount]
  )

  /** min / max */
  const minQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minStake',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const maxQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxStake',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const minStake: bigint =
    typeof minQ.data === 'bigint' ? minQ.data : parseUnits('1', 18)
  const maxStake: bigint =
    typeof maxQ.data === 'bigint' ? maxQ.data : parseUnits('5', 18)
  const minB = Number(formatUnits(minStake, 18))
  const maxB = Number(formatUnits(maxStake, 18))
  const outOfBounds = betAmount < minB || betAmount > maxB

  /** balance + allowance */
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

  // optimistic balance overlay
  const [effectiveBalance, setEffectiveBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!mounted) return
    setEffectiveBalance(prev => (prev === null ? balance : prev))
  }, [balance, mounted])

  const displayBalance =
    effectiveBalance !== null ? effectiveBalance : balance

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

  /** bet selection */
  const [bet, setBet] = useState<Bet>({ kind: 'color', value: 'RED' })
  const [singleNumber, setSingleNumber] = useState('')

  const encodedBet = useMemo(() => {
    // betType: 0=color,1=parity,2=range,3=single
    let kind = 0
    let v = 0
    if (bet.kind === 'parity') kind = 1
    else if (bet.kind === 'range') kind = 2
    else if (bet.kind === 'single') kind = 3

    if (bet.kind === 'color') v = bet.value === 'RED' ? 1 : 2
    if (bet.kind === 'parity') v = bet.value === 'ODD' ? 1 : 2
    if (bet.kind === 'range') v = bet.value === 'LOW' ? 1 : 2
    if (bet.kind === 'single') v = bet.value

    return { kind, v }
  }, [bet])

  // seed for on-chain RNG
  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9)),
    [betAmount, bet]
  )

  /** contract write: playRoulette(uint256 stake, uint256 seed, uint8 betType, uint8 number) */
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playRoulette',
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  /** wheel + ball animation */
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)        // wheel rotation
  const [ballAngle, setBallAngle] = useState(0) // ball orbit
  const [resultNumber, setResultNumber] = useState<number | null>(null)
  const [status, setStatus] = useState('Place your bet.')
  const [lastWinGross, setLastWinGross] = useState<number>(0) // full payout
  const [sessionPnL, setSessionPnL] = useState(0)              // net across spins
  const [netDelta, setNetDelta] = useState(0)                  // net last spin

  // after tx mined, derive wheel outcome from hash
  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}` | undefined
    if (!h) return
    const big = BigInt(h)
    const idx =
      Number(big % BigInt(WHEEL_NUMBERS.length)) % WHEEL_NUMBERS.length
    const n = WHEEL_NUMBERS[idx]
    setResultNumber(n)
    setStatus('Bet confirmed. Spin the wheel to reveal.')
    setLastWinGross(0)
    setNetDelta(0)
  }, [playWait.isSuccess, playTx])

  const spinWheel = () => {
    if (!playWait.isSuccess || spinning || resultNumber == null) return
    setSpinning(true)
    setStatus('Spinning…')

    const index = WHEEL_NUMBERS.indexOf(resultNumber)
    const segment = 360 / WHEEL_NUMBERS.length
    const centerOffset = segment / 2
    const targetAngle = index * segment + centerOffset
    const totalRotation = 5 * 360 + targetAngle

    // wheel spin
    requestAnimationFrame(() => {
      setAngle(-totalRotation)
    })

    // ball orbits around the wheel and ends back at the pointer
    setBallAngle(prev => prev + 720) // 2 full circles (mod 360 looks same but gives motion)

    setTimeout(() => {
      const winMul = computeWinMultiplier(resultNumber, bet)
      // net profit for this spin (1:1 net on even-money bets, 35:1 on straights)
      const profit =
        winMul === 0 ? -betAmount : betAmount * (winMul - 1)

      setNetDelta(profit)
      setSessionPnL(prev => prev + profit)

      if (winMul === 0) {
        setLastWinGross(0)
        setStatus(`Landed on ${resultNumber}. No win this spin.`)
      } else {
        const gross = betAmount * winMul
        setLastWinGross(gross)
        setStatus(
          `Landed on ${resultNumber}. Payout ×${winMul.toFixed(
            2
          )}   (+${gross.toLocaleString()} BGLD)`
        )

        // optimistic: we already pulled stake on confirm; add stake + profit back
        setEffectiveBalance(prev => {
          const base = prev ?? balance
          return base + gross
        })
      }

      setSpinning(false)
      refetchBal()
      setTimeout(() => refetchBal(), 600)
    }, 3200)
  }

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !outOfBounds &&
    (effectiveBalance ?? balance) >= betAmount
  const canSpin = playWait.isSuccess && resultNumber != null && !spinning

  const approxUsd = (b: number) => {
    if (!priceUsd) return '…'
    const v = b * priceUsd
    return `~$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`
  }

  const chooseSingle = (n: number) => {
    setSingleNumber(String(n))
    setBet({ kind: 'single', value: n })
  }

  const usdStr = (amt: number) =>
    priceUsd != null ? approxUsd(amt) : ''

  const onConfirmBet = () => {
    if (!play || !address) return
    if (outOfBounds) return

    setStatus('Confirm bet in wallet…')
    setLastWinGross(0)
    setNetDelta(0)
    setResultNumber(null)
    setSpinning(false)

    // optimistic: pull stake out of overlay immediately
    setEffectiveBalance(prev => {
      const base = prev ?? balance
      return base - betAmount
    })

    // playRoulette(uint256 stake, uint256 seed, uint8 betType, uint8 number)
    play({
      args: [
        stakeWei,
        seed,
        BigInt(encodedBet.kind),
        BigInt(encodedBet.v),
      ] as const,
    })
  }

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.1fr)_420px] gap-6 items-start">
      {/* LEFT — WHEEL + STATUS */}
      <div className="relative">
        <div className="rounded-[28px] border border-[#32e6b7]/35 bg-gradient-to-b from-[#111827] via-[#020617] to-black shadow-[0_18px_45px_rgba(0,0,0,0.9)] p-4 md:p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] tracking-[0.28em] uppercase text-[#32e6b7]/80">
                GOLDEN ROULETTE
              </div>
              <div className="text-xl font-bold text-white mt-1">
                Base Gold Wheel
              </div>
            </div>
            <div className="text-[11px] text-white/60 text-right">
              European wheel • 0 + 1–36
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="relative w-full max-w-[360px] aspect-square">
              

              {/* wheel + ball */}
              <div className="absolute inset-0 rounded-full bg-[#050509] flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-[0_12px_25px_rgba(0,0,0,0.8)]"
                >
                  {/* wheel group (rotates) */}
                  <g
                    style={{
                      transformOrigin: '50% 50%',
                      transform: `rotate(${angle}deg)`,
                      transition: spinning
                        ? 'transform 3.2s cubic-bezier(.18,.7,.26,1.05)'
                        : undefined,
                    }}
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="98"
                      fill="#050509"
                      stroke="#2b313f"
                      strokeWidth="3"
                    />

                    {WHEEL_NUMBERS.map((num, i) => {
                      const seg = 360 / WHEEL_NUMBERS.length
                      const a0 = (i * seg - 90) * (Math.PI / 180)
                      const a1 = ((i + 1) * seg - 90) * (Math.PI / 180)
                      const x0 = 100 + 98 * Math.cos(a0)
                      const y0 = 100 + 98 * Math.sin(a0)
                      const x1 = 100 + 98 * Math.cos(a1)
                      const y1 = 100 + 98 * Math.sin(a1)
                      const isZero = num === 0
                      const fill = isZero
                        ? '#008b3b'
                        : isRed(num)
                        ? '#b81421'
                        : '#11151f'
                      const textColor = isZero ? '#f4ffdf' : '#fefefe'
                      const largeArc = seg > 180 ? 1 : 0
                      return (
                        <g key={i}>
                          <path
                            d={`M100,100 L${x0},${y0} A98,98 0 ${largeArc} 1 ${x1},${y1} Z`}
                            fill={fill}
                            stroke="#050509"
                            strokeWidth="1.2"
                          />
                          <text
                            x="100"
                            y="100"
                            transform={`rotate(${
                              i * seg + seg / 2
                            } 100 100) translate(0 -80)`}
                            textAnchor="middle"
                            fontSize="9"
                            fill={textColor}
                            fontWeight={700}
                          >
                            {num}
                          </text>
                        </g>
                      )
                    })}

                    <circle
                      cx="100"
                      cy="100"
                      r="68"
                      fill="#050509"
                      stroke="#2a3344"
                      strokeWidth="2"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="18"
                      fill="#12151f"
                      stroke="#f5d67a"
                      strokeWidth="2"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="6"
                      fill="#f5d67a"
                      stroke="#fff5c0"
                      strokeWidth="1"
                    />
                  </g>

                  {/* ball group (orbits around wheel) */}
                  {resultNumber != null && (
                    <g
                      style={{
                        transformOrigin: '50% 50%',
                        transform: `rotate(${ballAngle}deg)`,
                        transition: spinning
                          ? 'transform 3.2s cubic-bezier(.18,.7,.26,1.05)'
                          : undefined,
                      }}
                    >
                      <circle
                        cx="100"
                        cy="32"
                        r="5"
                        fill="#fdfdfd"
                        stroke="#c0c0c0"
                        strokeWidth="1"
                      />
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* status + pnl */}
          <div className="mt-5 rounded-xl border border-white/12 bg-black/35 p-3 text-xs">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
              Spin Status
            </div>
            <div className="mt-1 text-sm text-white min-h-[1.25rem]">
              {status}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="rounded-lg border border-white/15 bg-black/40 p-2 flex-1">
                <div className="uppercase tracking-[0.16em] text-white/55 text-[10px]">
                  Session P&L
                </div>
                <div
                  className={
                    sessionPnL >= 0
                      ? 'text-emerald-400 text-lg font-bold'
                      : 'text-rose-400 text-lg font-bold'
                  }
                >
                  {sessionPnL >= 0 ? '+' : ''}
                  {sessionPnL.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  BGLD
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-black/40 p-2 flex-1">
                <div className="uppercase tracking-[0.16em] text-white/55 text-[10px]">
                  Last Net
                </div>
                <div
                  className={
                    netDelta > 0
                      ? 'text-emerald-300 text-lg font-bold'
                      : netDelta < 0
                      ? 'text-rose-300 text-lg font-bold'
                      : 'text-slate-200 text-lg font-bold'
                  }
                >
                  {netDelta > 0 ? '+' : ''}
                  {netDelta.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  BGLD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* base shadow */}
        <div className="mt-3 h-6 w-[92%] mx-auto bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.8),transparent_70%)] opacity-80" />
      </div>

      {/* RIGHT — FELT TABLE & WALLET */}
      <div className="rounded-[24px] border border-[#0fe0a5]/40 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#020b09] p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#bfffe8]/80">
              TABLE
            </div>
            <div className="mt-1 text-lg font-bold text-white">
              Place Your Chips
            </div>
          </div>
          <div className="text-[11px] text-[#bfffe8]/80 text-right">
            Inside / outside bets
          </div>
        </div>

        {/* Wallet + stake cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/25 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#bfffe8]/80">
              Wallet Balance
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {mounted
                ? displayBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : '…'}{' '}
              <span className="text-xs text-white/70">BGLD</span>
            </div>
            {priceUsd && (
              <div className="mt-1 text-[11px] text-white/65">
                {approxUsd(displayBalance)}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-white/25 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#bfffe8]/80">
              Stake
            </div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-xl font-bold text-white">
                {betAmount.toLocaleString()}{' '}
                <span className="text-xs text-white/70">BGLD</span>
              </div>
              {priceUsd && (
                <div className="text-[11px] text-white/65">
                  {usdStr(betAmount)}
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {[1, 2, 5, 10, 25].map(v => {
                const disabled = mounted && (v < minB || v > maxB)
                const active = v === betAmount
                return (
                  <button
                    key={v}
                    onClick={() => !disabled && setBetAmount(v)}
                    disabled={disabled}
                    className={[
                      'rounded-md px-2 py-1 text-[11px] font-semibold border',
                      active
                        ? 'border-[#32e6b7]/80 bg-[#32e6b7]/20 text-[#e4fff4] shadow-[0_0_10px_rgba(50,230,183,0.7)]'
                        : 'border-white/25 bg-black/40 text-white/80 hover:bg-white/10',
                      disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            {mounted && outOfBounds && (
              <div className="mt-1 text-[11px] text-rose-300">
                Bet must be between {minB} and {maxB} BGLD.
              </div>
            )}
          </div>
        </div>

        {/* Betting felt */}
        <div className="grid gap-3 text-xs">
          {/* Color / parity / range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/20 bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-wide text-white/70 mb-2">
                Color
              </div>
              <div className="flex gap-2">
                <BetButton
                  active={bet.kind === 'color' && bet.value === 'RED'}
                  onClick={() =>
                    setBet({ kind: 'color', value: 'RED' })
                  }
                  className="bg-[#b81421] text-white"
                  label="RED"
                />
                <BetButton
                  active={bet.kind === 'color' && bet.value === 'BLACK'}
                  onClick={() =>
                    setBet({ kind: 'color', value: 'BLACK' })
                  }
                  className="bg-black text-white border border-white/40"
                  label="BLACK"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/20 bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-wide text-white/70 mb-2">
                Even / Odd &amp; Range
              </div>
              <div className="flex flex-wrap gap-2">
                <BetButton
                  active={bet.kind === 'parity' && bet.value === 'EVEN'}
                  onClick={() =>
                    setBet({ kind: 'parity', value: 'EVEN' })
                  }
                  label="EVEN"
                />
                <BetButton
                  active={bet.kind === 'parity' && bet.value === 'ODD'}
                  onClick={() =>
                    setBet({ kind: 'parity', value: 'ODD' })
                  }
                  label="ODD"
                />
                <BetButton
                  active={bet.kind === 'range' && bet.value === 'LOW'}
                  onClick={() =>
                    setBet({ kind: 'range', value: 'LOW' })
                  }
                  label="1 – 18"
                />
                <BetButton
                  active={bet.kind === 'range' && bet.value === 'HIGH'}
                  onClick={() =>
                    setBet({ kind: 'range', value: 'HIGH' })
                  }
                  label="19 – 36"
                />
              </div>
            </div>
          </div>

          {/* Single number */}
          <div className="rounded-xl border border-white/20 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/70">
                  Straight-Up Number
                </div>
                <div className="text-[11px] text-white/60">
                  0–36 • pays 35:1
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={singleNumber}
                  onChange={e => {
                    const val = Number(e.target.value || '0')
                    if (Number.isNaN(val)) return
                    setSingleNumber(e.target.value)
                    if (val >= 0 && val <= 36) {
                      setBet({ kind: 'single', value: val })
                    }
                  }}
                  className="w-16 rounded-md border border-white/40 bg-black/60 px-2 py-1 text-right text-sm text-white"
                />
                <button
                  onClick={() => {
                    const v = Number(singleNumber || '0')
                    if (v >= 0 && v <= 36) {
                      setBet({ kind: 'single', value: v })
                    }
                  }}
                  className="text-[11px] px-2 py-1 rounded-md border border-[#32e6b7]/60 text-[#bfffe8] hover:bg-[#32e6b7]/10"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
                : 'Approve BGLD for Roulette'}
            </button>
          ) : (
            <>
              <button
                className="w-full btn-gold h-11 text-sm font-extrabold"
                disabled={!mounted || !canConfirm}
                onClick={onConfirmBet}
              >
                {!mounted
                  ? '…'
                  : placing || playWait.isLoading
                  ? 'Confirming bet…'
                  : 'Confirm Bet'}
              </button>
              <button
                className="w-full btn-dim h-10 text-sm"
                disabled={!mounted || !canSpin}
                onClick={spinWheel}
              >
                {spinning ? 'Spinning…' : 'Spin Wheel'}
              </button>
            </>
          )}
          {(approveErr || playErr) && (
            <div className="text-[11px] text-rose-300">
              {(approveErr as any)?.shortMessage ||
                (playErr as any)?.shortMessage ||
                String(approveErr || playErr)}
            </div>
          )}
        </div>

        <div className="mt-2 text-[10px] text-[#bfffe8]/75">
          Visual odds &amp; payouts shown here. BaseGold casino contract
          enforces final on-chain results. Demo: Sepolia testnet flow.
        </div>
      </div>
    </div>
  )
}

/* ------- helpers ------- */

function BetButton({
  active,
  onClick,
  label,
  className = '',
}: {
  active: boolean
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 rounded-md px-3 py-1 text-xs font-semibold border transition',
        active
          ? 'border-[#32e6b7]/80 bg-[#32e6b7]/25 text-[#e4fff4]'
          : 'border-white/25 bg-black/40 text-white/80 hover:bg-white/10',
        className,
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function computeWinMultiplier(result: number, bet: Bet): number {
  if (bet.kind === 'single') {
    if (bet.value === result) return 35
    return 0
  }

  if (bet.kind === 'color') {
    if (result === 0) return 0
    const red = isRed(result)
    if (bet.value === 'RED' && red) return 2
    if (bet.value === 'BLACK' && !red) return 2
    return 0
  }

  if (bet.kind === 'parity') {
    if (result === 0) return 0
    const odd = result % 2 === 1
    if (bet.value === 'ODD' && odd) return 2
    if (bet.value === 'EVEN' && !odd) return 2
    return 0
  }

  if (bet.kind === 'range') {
    if (result === 0) return 0
    const low = result >= 1 && result <= 18
    const high = result >= 19 && result <= 36
    if (bet.value === 'LOW' && low) return 2
    if (bet.value === 'HIGH' && high) return 2
    return 0
  }

  return 0
}
