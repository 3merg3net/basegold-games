'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress, isAddress } from 'viem'
import Casino from '@/abis/BaseGoldCasino.json'

/* Minimal ERC20 ABI (avoids erc20Abi import issues) */
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve',   stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD  = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

const WHEEL_PX = 550

// 24 wedges — balanced, with rare 10x and 25x
const WEDGES = [
  { label: '0x',  mul: 0   }, { label: '1.2x', mul: 1.2 },
  { label: '0x',  mul: 0   }, { label: '1.5x', mul: 1.5 },
  { label: '0x',  mul: 0   }, { label: '2.0x', mul: 2.0 },
  { label: '0x',  mul: 0   }, { label: '3.0x', mul: 3.0 },
  { label: '0x',  mul: 0   }, { label: '1.0x', mul: 1.0 },
  { label: '0x',  mul: 0   }, { label: '2.5x', mul: 2.5 },
  { label: '0x',  mul: 0   }, { label: '1.8x', mul: 1.8 },
  { label: '0x',  mul: 0   }, { label: '5.0x', mul: 5.0 },
  { label: '0x',  mul: 0   }, { label: '1.4x', mul: 1.4 },
  { label: '0x',  mul: 0   }, { label: '10x',  mul: 10.0 }, // rare
  { label: '0x',  mul: 0   }, { label: '1.6x', mul: 1.6 },
  { label: '0x',  mul: 0   }, { label: '25x',  mul: 25.0 }, // super rare
] as const
const SEG = 360 / WEDGES.length

export default function PanGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // price (optional)
  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  useEffect(() => {
    let t: any
    const load = async () => {
      try {
        const r = await fetch('/api/bgld-price', { cache: 'no-store' })
        const j = await r.json()
        setPriceUsd(typeof j?.priceUsd === 'number' ? j.priceUsd : null)
      } catch {}
      t = setTimeout(load, 30000)
    }
    load()
    return () => clearTimeout(t)
  }, [])

  // stake (contract is 1–5 on your current deploy)
  const [bet, setBet] = useState<number>(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  // min / max (guard with enabled + runtime bigint coerce)
  const { data: minRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minStake',
    enabled: mounted,
    watch: true,
  })
  const { data: maxRaw } = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxStake',
    enabled: mounted,
    watch: true,
  })
  const minStake: bigint = typeof minRaw === 'bigint' ? minRaw : parseUnits('1', 18)
  const maxStake: bigint = typeof maxRaw === 'bigint' ? maxRaw : parseUnits('5', 18)
  const minBGLD = Number(formatUnits(minStake, 18))
  const maxBGLD = Number(formatUnits(maxStake, 18))
  const betOutOfBounds = bet < minBGLD || bet > maxBGLD

  // balance & allowance (never pass undefined args; coerce to bigint)
  const { data: balRaw } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: mounted && Boolean(address && isAddress(BGLD)),
    watch: true,
  })
  const balanceWei: bigint = typeof balRaw === 'bigint' ? balRaw : 0n
  const bal = Number(formatUnits(balanceWei, 18))

  const { data: allowanceRaw, refetch: refetchAllowance } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? zeroAddress, CASINO],
    enabled: mounted && Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowance: bigint = typeof allowanceRaw === 'bigint' ? allowanceRaw : 0n
  const hasAllowance = allowance >= stakeWei

  // approve
  const { write: approve, data: approveTx, isLoading: approving, error: approveErr } =
    useContractWrite({ address: BGLD, abi: ERC20_ABI, functionName: 'approve' })
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })
  useEffect(() => {
    if (approveWait.isSuccess) refetchAllowance()
  }, [approveWait.isSuccess, refetchAllowance])
  const onApprove = () => approve?.({ args: [CASINO, maxUint256] as const })

  // confirm bet -> then spin
  const { write: play, data: playTx, isLoading: placing, error: playErr } =
    useContractWrite({ address: CASINO, abi: (Casino as any).abi, functionName: 'playPan' })
  const playWait = useWaitForTransaction({ hash: (playTx as any)?.hash })

  // spin visuals
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [landIndex, setLandIndex] = useState<number | null>(null)
  const [resultText, setResultText] = useState('')
  const fullSpins = 10
  const spinSeconds = 3.6

  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}`
    if (!h) return
    const n = Number((BigInt(h) % BigInt(WEDGES.length)))
    setLandIndex(n)
    setResultText('Bet confirmed. Ready to spin.')
  }, [playWait.isSuccess, playTx])

  const startSpin = () => {
    if (landIndex == null) return
    const centerOffset = SEG / 2
    const targetAngle = landIndex * SEG + centerOffset
    const nextRotation = -(fullSpins * 360 + targetAngle)
    setSpinning(true)
    requestAnimationFrame(() => setRotation(nextRotation))

    const mul = WEDGES[landIndex].mul
    const text =
      mul === 0 ? 'Dry pan — 0x.'
      : mul === 1 ? 'Break even — 1.00x'
      : `You struck gold! ${mul.toFixed(2)}x`

    setTimeout(() => {
      setResultText(text)
      setSpinning(false)
    }, spinSeconds * 1000 - 250)
  }

  const canConfirm = !!address && hasAllowance && !placing && !betOutOfBounds && bal >= bet
  const canSpin = playWait.isSuccess && landIndex != null && !spinning

  const pointer = (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
      <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]" />
    </div>
  )
  const wedgeColor = (i: number) =>
    WEDGES[i].mul > 0
      ? 'fill-[rgba(255,215,0,0.22)] stroke-[rgba(255,215,0,0.6)]'
      : 'fill-[rgba(255,255,255,0.04)] stroke-[rgba(255,255,255,0.15)]'

  const approxUsd = (b: number) =>
    priceUsd ? `~$${(b * priceUsd).toFixed(b * priceUsd < 1 ? 4 : 2)}` : '…'

  return (
    <div className="grid md:grid-cols-[minmax(320px,auto)_360px] gap-6 items-start">
      {/* LEFT: How-to + Wheel */}
      <div>
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
          <div className="text-sm font-semibold text-white">How to Play</div>
          <div className="text-xs text-white/70">
            Pick your stake, <strong>Confirm Bet</strong> (wallet), then <strong>Spin Wheel</strong>.
            Land on a multiplier to win <em>stake × multiplier</em>. Big hits: <b>10×</b> & <b>25×</b> (rare).
            <span className="opacity-60"> Bet limits: {minBGLD}–{maxBGLD} BGLD.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="relative mx-auto w-full aspect-square" style={{ maxWidth: `${WHEEL_PX}px` }}>
            {pointer}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${spinSeconds}s cubic-bezier(.17,.67,.32,1.28)` : undefined,
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="98" fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
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
                      <path d={`M100,100 L${x0},${y0} A98,98 0 ${largeArc} 1 ${x1},${y1} Z`} className={wedgeColor(i)} strokeWidth="1" />
                      <text
                        x="100"
                        y="100"
                        transform={`rotate(${i * SEG + SEG / 2} 100 100) translate(0 -70)`}
                        textAnchor="middle"
                        fontSize="10"
                        fill={w.mul > 0 ? '#FFD700' : 'rgba(255,255,255,0.55)'}
                        fontWeight={w.mul > 0 ? 800 : 500}
                      >
                        {w.label}
                      </text>
                    </g>
                  )
                })}
                <circle cx="100" cy="100" r="14" fill="#0a0b10" stroke="rgba(255,215,0,0.6)" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Controls + Outcome */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-bold text-white/90">Pan Controls</div>

        {/* Stake */}
        <div className="mt-3">
          <div className="text-sm text-white/70">Stake (BGLD)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(v => {
              const disabled = mounted && (v < minBGLD || v > maxBGLD)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBet(v)}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border',
                    bet === v
                      ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]'
                      : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                    disabled ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                  disabled={disabled}
                  title={priceUsd ? `${v} BGLD ≈ ${approxUsd(v)}` : ''}
                >
                  {v} <span className="opacity-60 text-[11px] ml-0.5">{priceUsd ? approxUsd(v) : ''}</span>
                </button>
              )
            })}
          </div>
          {mounted && betOutOfBounds && (
            <div className="mt-1 text-xs text-rose-400">
              Bet must be between {minBGLD} and {maxBGLD} BGLD.
            </div>
          )}
        </div>

        {/* Balance & Approval */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Balance</div>
            <div className="text-white font-semibold">{mounted ? bal.toLocaleString() : '…'}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Approval</div>
            <div className="text-white font-semibold">
              {mounted ? (hasAllowance ? '∞' : 'Not approved') : '…'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          {!hasAllowance ? (
            <button onClick={onApprove} className="w-full btn-cyan" disabled={!mounted || approving || approveWait.isLoading}>
              {!mounted ? '…' : (approving || approveWait.isLoading ? 'Confirming…' : 'Approve BGLD')}
            </button>
          ) : (
            <>
              <button
                className="w-full btn-gold"
                disabled={!mounted || !canConfirm}
                onClick={() => play?.({
                  args: [stakeWei, ((BigInt(Date.now())<<64n)^BigInt(Math.floor(Math.random()*1e9)))] as const
                })}
              >
                {!mounted ? '…' : (placing || playWait.isLoading ? 'Confirming…' : 'Confirm Bet')}
              </button>
              <button className="w-full btn-dim" disabled={!mounted || !canSpin} onClick={startSpin}>
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
        </div>

        {/* Outcome */}
        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="text-sm font-semibold text-white/90">Outcome</div>
          <div className="mt-1 text-white/80 min-h-[1.25rem]">
            {playWait.isLoading ? 'Resolving…' : (playWait.isSuccess ? resultText : '—')}
          </div>
          {landIndex != null && (
            <div className="mt-1 text-xs text-white/60">
              Landed on: <span className="text-white">{WEDGES[landIndex].label}</span>
            </div>
          )}
        </div>

        <div className="mt-4 text-[11px] text-white/50">
          Visual spin follows confirmed bet. Contract enforces actual results.
        </div>
      </div>
    </div>
  )
}
