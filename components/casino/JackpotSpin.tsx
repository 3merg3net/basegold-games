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
  maxUint256,
  parseUnits,
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

type Tier = 0 | 1 | 2 | 3 // 0=miss, 1=minor, 2=major, 3=mega

function tierFromHash(hash: `0x${string}` | undefined, seed: bigint): Tier {
  const base = hash ? BigInt(hash) : seed
  const r = Number(base % 10_000n)
  if (r === 0) return 3 // mega
  if (r < 6) return 2 // major
  if (r < 26) return 1 // minor
  return 0
}

export default function JackpotSpinGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // optional jackpot display (wire to API or contract later)
  const [jackpotEstimate, setJackpotEstimate] = useState<number | null>(null)
  useEffect(() => {
    // stub: you can fetch from /api/jackpot or a read-only contract later
    // setJackpotEstimate(123456.789)
  }, [])

  // stake
  const [betAmount, setBetAmount] = useState(1)
  const stakeWei = useMemo(
    () => parseUnits(String(betAmount), 18),
    [betAmount]
  )

  const { data: minRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minStake',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const { data: maxRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxStake',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const minStakeWei: bigint =
    typeof minRaw === 'bigint' ? minRaw : parseUnits('0.5', 18)
  const maxStakeWei: bigint =
    typeof maxRaw === 'bigint' ? maxRaw : parseUnits('10', 18)

  const minB = Number(formatUnits(minStakeWei, 18))
  const maxB = Number(formatUnits(maxStakeWei, 18))
  const outOfBounds = betAmount < minB || betAmount > maxB

  // wallet
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

  useEffect(() => {
    if (approveWait.isSuccess) {
      refetchAllow()
      refetchBal()
    }
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  const onApprove = () =>
    approve?.({ args: [CASINO, maxUint256] as const })

  // playJackpotSpin
  const [tier, setTier] = useState<Tier>(0)
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [status, setStatus] = useState('Fire small stakes for a shot at the jackpot.')
  const [lastPrize, setLastPrize] = useState<number | null>(null)

  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9)),
    [betAmount]
  )

  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playJackpotSpin' as any,
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  useEffect(() => {
    if (!playWait.isSuccess) return
    const hash = (playTx as any)?.hash as `0x${string}` | undefined
    const newTier = tierFromHash(hash, seed)
    setTier(newTier)
    refetchBal()
    spinWheelToTier(newTier)
  }, [playWait.isSuccess, playTx, seed, refetchBal])

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !outOfBounds &&
    balance >= betAmount

  const onSpin = () => {
    if (!play) return
    if (!canConfirm) return
    setStatus('Sending spin transaction…')
    setLastPrize(null)
    play({
      args: [stakeWei, seed] as any,
    })
  }

  function spinWheelToTier(t: Tier) {
    setSpinning(true)
    setStatus('Spinning for jackpot…')

    // 4 segments: 0=MISS,1=MINOR,2=MAJOR,3=MEGA
    const seg = 360 / 4
    const index = t // align tier index with segment
    const target = index * seg + seg / 2
    const totalRotation = 4 * 360 + target

    requestAnimationFrame(() => {
      setAngle(-totalRotation)
    })

    setTimeout(() => {
      let label = 'No jackpot this time.'
      let estPrize: number | null = null
      if (t === 1) {
        label = 'MINOR jackpot hit!'
        estPrize = jackpotEstimate ? jackpotEstimate * 0.05 : null
      } else if (t === 2) {
        label = 'MAJOR jackpot hit!'
        estPrize = jackpotEstimate ? jackpotEstimate * 0.25 : null
      } else if (t === 3) {
        label = 'MEGA jackpot hit!'
        estPrize = jackpotEstimate ?? null
      }
      setLastPrize(estPrize)
      setStatus(label)
      setSpinning(false)
      setTimeout(() => refetchBal(), 600)
    }, 3200)
  }

  return (
    <div className="grid md:grid-cols-[minmax(340px,1fr)_420px] gap-6 items-start">
      {/* LEFT — Jackpot Wheel */}
      <div className="relative rounded-[30px] border border-[#facc15]/40 bg-gradient-to-b from-[#1f1300] via-[#0b0500] to-black shadow-[0_0_45px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.35),transparent_60%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] tracking-[0.28em] uppercase text-[#facc15]/80">
              BASE GOLD RUSH
            </div>
            <div className="text-xl font-bold text-white mt-1">
              Jackpot Spin
            </div>
          </div>
          <div className="text-[11px] text-white/60 text-right">
            Small stakes, big hits
            <br />
            On-chain jackpot wheel
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center gap-4">
          {/* wheel */}
          <div className="relative w-full max-w-[340px] aspect-square">
            {/* pointer */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-[#fde68a] drop-shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
            </div>

            <div
              className="absolute inset-0 rounded-full bg-[#020617] flex items-center justify-center"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: spinning
                  ? 'transform 3.2s cubic-bezier(.18,.7,.26,1.05)'
                  : undefined,
              }}
            >
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.85)]"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="98"
                  fill="#020617"
                  stroke="#4b5563"
                  strokeWidth="3"
                />
                {[
                  { label: 'MEGA', color: '#fbbf24', idx: 3 },
                  { label: 'MAJOR', color: '#f97316', idx: 2 },
                  { label: 'MINOR', color: '#22c55e', idx: 1 },
                  { label: 'MISS', color: '#0f172a', idx: 0 },
                ].map((seg, i) => {
                  const segAngle = 360 / 4
                  const a0 = (i * segAngle - 90) * (Math.PI / 180)
                  const a1 = ((i + 1) * segAngle - 90) * (Math.PI / 180)
                  const x0 = 100 + 98 * Math.cos(a0)
                  const y0 = 100 + 98 * Math.sin(a0)
                  const x1 = 100 + 98 * Math.cos(a1)
                  const y1 = 100 + 98 * Math.sin(a1)
                  const largeArc = segAngle > 180 ? 1 : 0
                  const textColor =
                    seg.label === 'MISS' ? '#9ca3af' : '#0b0b0b'
                  return (
                    <g key={seg.label}>
                      <path
                        d={`M100,100 L${x0},${y0} A98,98 0 ${largeArc} 1 ${x1},${y1} Z`}
                        fill={seg.color}
                        stroke="#020617"
                        strokeWidth="1.6"
                      />
                      <text
                        x="100"
                        y="100"
                        transform={`rotate(${
                          i * segAngle + segAngle / 2
                        } 100 100) translate(0 -70)`}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={800}
                        fill={textColor}
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}
                {/* inner ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  fill="#020617"
                  stroke="#facc15"
                  strokeWidth="2"
                />
                {/* hub */}
                <circle
                  cx="100"
                  cy="100"
                  r="18"
                  fill="#111827"
                  stroke="#fde68a"
                  strokeWidth="2"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="6"
                  fill="#fde68a"
                  stroke="#fef3c7"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </div>

          {/* status / jackpot display */}
          <div className="w-full max-w-[340px]">
            <div className="rounded-2xl border border-yellow-200/30 bg-black/40 px-3 py-2 text-xs text-yellow-100/90">
              <div className="uppercase tracking-[0.2em] text-[10px] text-yellow-200/90">
                Spin Status
              </div>
              <div className="mt-1 text-sm text-white">{status}</div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <div>
                  Last tier:{' '}
                  <span className="font-semibold text-yellow-200">
                    {tier === 0
                      ? 'MISS'
                      : tier === 1
                      ? 'MINOR'
                      : tier === 2
                      ? 'MAJOR'
                      : 'MEGA'}
                  </span>
                </div>
                <div>
                  Est. prize:{' '}
                  <span className="font-semibold text-yellow-200">
                    {lastPrize != null
                      ? `${lastPrize.toLocaleString()} BGLD`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-yellow-300/20 bg-gradient-to-r from-yellow-500/10 via-yellow-300/5 to-yellow-600/10 px-3 py-2 flex items-center justify-between text-xs text-yellow-100/80">
              <div>
                <div className="uppercase tracking-[0.2em] text-[10px] text-yellow-200/90">
                  Jackpot Pool
                </div>
                <div className="mt-0.5 text-sm font-bold text-white">
                  {jackpotEstimate != null
                    ? `${jackpotEstimate.toLocaleString()} BGLD`
                    : 'On-chain amount'}
                </div>
              </div>
              <div className="text-[10px] text-yellow-100/70 text-right">
                A slice of every spin feeds the pool.
                <br />
                Hit MEGA to take it all.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Controls & Wallet */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div>
          <div className="text-lg font-bold text-white/90">
            Jackpot Spin
          </div>
          <div className="text-xs text-white/60 mt-1">
            Approve <b>BGLD</b>, choose a small stake, and spin.{' '}
            <b>MINOR</b>, <b>MAJOR</b>, and <b>MEGA</b> tiers are powered by
            the on-chain jackpot pool.
          </div>
        </div>

        {/* stake */}
        <div>
          <div className="text-sm text-white/70">Stake per spin (BGLD)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[0.5, 1, 2, 5, 10].map(v => {
              const disabled = mounted && (v < minB || v > maxB)
              const active = betAmount === v
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBetAmount(v)}
                  disabled={disabled}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border',
                    active
                      ? 'border-yellow-300/80 bg-yellow-500/15 text-yellow-100'
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
              Stake must be between {minB} and {maxB} BGLD.
            </div>
          )}
        </div>

        {/* wallet */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Wallet Balance</div>
            <div className="text-white font-semibold text-sm">
              {mounted ? balance.toLocaleString() : '…'} BGLD
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Approval</div>
            <div className="text-white font-semibold text-sm">
              {mounted ? (hasAllowance ? 'Approved' : 'Not approved') : '…'}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="space-y-2">
          {!hasAllowance ? (
            <button
              onClick={onApprove}
              disabled={!mounted || approving || approveWait.isLoading}
              className="w-full btn-cyan"
            >
              {!mounted
                ? '…'
                : approving || approveWait.isLoading
                ? 'Confirm in wallet…'
                : 'Approve BGLD for Jackpot Spin'}
            </button>
          ) : (
            <button
              className="w-full btn-gold"
              disabled={!mounted || !canConfirm}
              onClick={onSpin}
            >
              {!mounted
                ? '…'
                : placing || playWait.isLoading
                ? 'Spinning…'
                : 'Spin for Jackpot'}
            </button>
          )}
          {(approveErr || playErr) && (
            <div className="text-xs text-rose-400">
              {(approveErr as any)?.shortMessage ||
                (playErr as any)?.shortMessage ||
                String(approveErr || playErr)}
            </div>
          )}
        </div>

        <div className="text-[10px] text-white/50">
          Once V3 is live, this will reflect the true jackpot tiers and payout
          amounts from your contract events.
        </div>
      </div>
    </div>
  )
}
