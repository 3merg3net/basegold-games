'use client'

import Image from 'next/image'
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
import Casino from '@/abis/BaseGoldCasinoV2Testnet.json'

/** Minimal ERC20 ABI */
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

/** Gold Rush symbol set */
type SymbolDef = {
  key: string
  kind: 'emoji' | 'bar' | 'logo'
  emoji?: string
  name: string
  tripleMul: number
  pairMul: number
}

const SYMBOLS: SymbolDef[] = [
  {
    key: 'BGLD',
    kind: 'logo',
    name: 'BGLD COIN',
    tripleMul: 40,
    pairMul: 3.0,
  },
  {
    key: 'NUGGET',
    kind: 'emoji',
    emoji: '🍒',
    name: 'GOLD NUGGET',
    tripleMul: 25,
    pairMul: 2.2,
  },
  {
    key: 'PICKAXE',
    kind: 'emoji',
    emoji: '⛏️',
    name: 'PICKAXE',
    tripleMul: 15,
    pairMul: 2.0,
  },
  {
    key: 'CART',
    kind: 'emoji',
    emoji: '💎',
    name: 'ORE CART',
    tripleMul: 10,
    pairMul: 1.8,
  },
  {
    key: 'LANTERN',
    kind: 'emoji',
    emoji: '🔔',
    name: 'LANTERN',
    tripleMul: 6,
    pairMul: 1.5,
  },
  {
    key: 'BAR',
    kind: 'bar',
    name: 'GOLD BAR',
    tripleMul: 3,
    pairMul: 1.3,
  },
]

/** 3×3 grid indices for paylines (0–8) */
const PAYLINES: number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 4, 8], // diag ↘
  [2, 4, 6], // diag ↙
]

const REEL_HEIGHT = 150
const SPIN_MS = 2600

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3)
}

export default function SlotsV2Game() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /** live BGLD price (for USD display) */
  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  useEffect(() => {
    let t: any
    const load = async () => {
      try {
        const r = await fetch('/api/bgld-price', { cache: 'no-store' })
        const j = await r.json()
        setPriceUsd(typeof j?.priceUsd === 'number' ? j.priceUsd : null)
      } catch {
        // ignore
      }
      t = setTimeout(load, 30_000)
    }
    load()
    return () => clearTimeout(t)
  }, [])

  /** stake (BGLD) */
  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet || 0), 18), [bet])

  /** min / max from minBet / maxBet matching current contract */
  const minQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minBet',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })
  const maxQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxBet',
    enabled: mounted && Boolean(CASINO),
    watch: true,
  })

  // 👇 You can change the *fallback* min / max here for local tweaking
  const minStake: bigint =
    typeof minQ.data === 'bigint' ? minQ.data : parseUnits('1', 18)
  const maxStake: bigint =
    typeof maxQ.data === 'bigint' ? maxQ.data : parseUnits('5', 18)

  const minB = Number(formatUnits(minStake, 18))
  const maxB = Number(formatUnits(maxStake, 18))
  const clampBet = (v: number) => Math.min(Math.max(v, minB), maxB)
  const betOutOfBounds = bet < minB || bet > maxB

  /** balance & allowance */
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
      mounted && Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowance: bigint = typeof allowRaw === 'bigint' ? allowRaw : 0n
  const hasAllowance = allowance >= stakeWei

  /** approve flow */
  const {
    write: approve,
    data: approveTx,
    isLoading: approving,
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
    approve?.({
      args: [CASINO, maxUint256] as const,
    })

  /** bet placement */
  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9)),
    [bet]
  )

  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playSlots',
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  /** GRID STATE: 3×3 (indices 0..8) */
  const [grid, setGrid] = useState<number[]>([0, 1, 2, 3, 4, 5, 0, 1, 2])
  const [spinning, setSpinning] = useState(false)
  const [spinProgress, setSpinProgress] = useState(0)
  const [banner, setBanner] = useState<string>('')
  const [resultText, setResultText] = useState<string>('—')

  // on-chain PnL tracking
  const [beforeWei, setBeforeWei] = useState<bigint | null>(null)
  const [lastNetWei, setLastNetWei] = useState<bigint | null>(null)
  const [lastPayoutWei, setLastPayoutWei] = useState<bigint | null>(null)
  const [lastBet, setLastBet] = useState<number | null>(null)
  const [sessionPnL, setSessionPnL] = useState(0)

  const lastNet = lastNetWei != null ? Number(formatUnits(lastNetWei, 18)) : 0
  const lastPayout =
    lastPayoutWei != null ? Number(formatUnits(lastPayoutWei, 18)) : 0
  const winAmount = lastNet > 0 ? lastNet : 0

  // derive winning paylines (visual only)
  const winningLines: number[][] = useMemo(() => {
    const wins: number[][] = []
    for (const line of PAYLINES) {
      const [a, b, c] = line
      const sA = grid[a]
      const sB = grid[b]
      const sC = grid[c]
      if (sA === sB && sB === sC) {
        wins.push(line)
      }
    }
    return wins
  }, [grid])

  const winningIndexSet: Set<number> = useMemo(() => {
    const s = new Set<number>()
    for (const line of winningLines) {
      for (const idx of line) s.add(idx)
    }
    return s
  }, [winningLines])

  // when tx confirmed, compute net/payout and the landing grid from tx hash
  useEffect(() => {
    if (!playWait.isSuccess || !beforeWei) return

    const recompute = async () => {
      const res = await refetchBal()
      const after =
        typeof res.data === 'bigint' ? (res.data as bigint) : balanceWei

      const net = after - beforeWei
      const payout = net + stakeWei

      setLastNetWei(net)
      setLastPayoutWei(payout > 0n ? payout : 0n)
      setSessionPnL(prev => prev + Number(formatUnits(net, 18)))

      const h = (playTx as any)?.hash as `0x${string}` | undefined
      if (h) {
        const big = BigInt(h)
        // derive 9 symbols from the hash
        const nextGrid: number[] = []
        for (let i = 0; i < 9; i++) {
          const sym = Number(
            (big >> BigInt(i * 11)) % BigInt(SYMBOLS.length)
          )
          nextGrid.push(sym)
        }
        setGrid(nextGrid)
      }

      setResultText('Bet confirmed. Spin to reveal.')
    }

    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playWait.isSuccess])

  const spinNow = () => {
    if (!playWait.isSuccess || spinning) return
    setSpinning(true)
    setBanner('')
    setResultText('Spinning…')

    const start = performance.now()

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / SPIN_MS)
      setSpinProgress(p)

      if (p < 1) {
        requestAnimationFrame(tick)
      } else {
        setSpinning(false)

        // Use real on-chain net to label outcome
        if (lastNet > 0) {
          const mult =
            lastBet && lastBet > 0 ? lastPayout / lastBet : 0
          const isJackpot = mult >= 20
          setBanner(isJackpot ? 'JACKPOT!' : 'WIN!')
          setResultText(
            `+${lastNet.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })} BGRC  •  gross ${lastPayout.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })} BGRC`
          )
        } else if (lastNet < 0) {
          setBanner('')
          setResultText('No paying line this spin.')
        } else {
          setBanner('')
          setResultText('Push. Your spin came back flat.')
        }

        refetchBal()
        setTimeout(() => refetchBal(), 600)
      }
    }

    requestAnimationFrame(tick)
  }

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !betOutOfBounds &&
    balanceWei >= stakeWei

  const canSpin = playWait.isSuccess && !spinning && !!address

  const approxUsd = (b: number) => {
    if (!priceUsd) return '…'
    const v = b * priceUsd
    return `~$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`
  }

  const onConfirmBet = () => {
    if (!play || !canConfirm) return
    setBeforeWei(balanceWei)
    setLastBet(bet)
    setLastNetWei(null)
    setLastPayoutWei(null)
    setBanner('')
    setResultText('Sending bet to Base… confirm in wallet.')

    play({
      args: [stakeWei, seed] as const,
    })
  }

  const clearBet = () => {
    setBet(minB)
    setBanner('')
    setResultText('—')
    setLastNetWei(null)
    setLastPayoutWei(null)
  }

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.2fr)_380px] gap-6 items-start">
      {/* LEFT — CABINET WITH BG-SLOT IMAGE */}
      <div className="relative">
        <div className="relative mx-auto w-full max-w-8xl aspect-[3/5]">
  <Image
    src="/slots/bg-slot.png"
    alt="Base Gold Rush Slot Cabinet"
    fill
    priority
    className="pointer-events-none select-none object-contain"
  />

          {/* Interactive screen area */}
          <div className="absolute inset-x-[13%] top-[20%] bottom-[11%] flex flex-col">
            {/* Top HUD / PnL */}
            <div className="rounded-2xl border border-[#ffd977]/70 bg-black/80 px-3 py-2 mb-3">
              <div className="text-[9px] uppercase tracking-[0.22em] text-[#f6e5b5]/80 mb-1">
                Base Gold Rush • Session Stats
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Meter
                  label="SESSION P&L"
                  value={`${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 4 }
                  )} BGRC`}
                  tone={sessionPnL >= 0 ? 'green' : 'red'}
                />
                <Meter label="LAST RESULT" value={resultText} tone="neutral" />
                <Meter
                  label="LAST NET"
                  value={
                    winAmount > 0
                      ? `+${winAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })} BGRC`
                      : '—'
                  }
                  tone="gold"
                />
              </div>
            </div>

            {/* Reels window */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full rounded-[22px] border border-white/15 bg-gradient-to-b from-[#090b12] via-[#05060b] to-[#050509] shadow-inner overflow-hidden px-3 py-4 md:px-4 md:py-5">
                {/* Glass reflection */}
                <div className="pointer-events-none absolute left-[18%] right-[18%] top-[27%] h-14 bg-gradient-to-b from-white/16 via-transparent to-transparent opacity-45 rounded-full blur-[4px]" />

                <div className="flex items-center justify-between mb-2 text-[10px] text-white/65">
                  <span>3×3 GRID • 5 PAYLINES</span>
                  <span>
                    Stake:{' '}
                    <span className="font-semibold text-[#ffd977]">
                      {bet.toLocaleString()} BGRC
                    </span>
                  </span>
                </div>

                {/* 3×3 GRID */}
                <div className="relative z-10 grid grid-rows-3 grid-cols-3 gap-3">
                  {grid.map((symIndex, idx) => {
                    const row = Math.floor(idx / 3)
                    const isWinning = winningIndexSet.has(idx)
                    return (
                      <div
                        key={idx}
                        className={[
                          'relative rounded-2xl border bg-gradient-to-b from-[#04050a] via-[#050814] to-[#04050a] overflow-hidden flex items-center justify-center',
                          'transition-all duration-200',
                          isWinning
                            ? 'border-[#ffd977] shadow-[0_0_18px_rgba(255,215,0,0.7)]'
                            : 'border-white/14',
                        ].join(' ')}
                        style={{ height: REEL_HEIGHT / 1.3 }}
                      >
                        {/* center payline guideline for middle row */}
                        {row === 1 && (
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#ffd977]/35" />
                        )}
                        <ReelFace
                          index={symIndex}
                          spinning={spinning}
                          spinProgress={spinProgress}
                          highlight={isWinning}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Win banner under reels */}
                <div className="mt-3 flex items-center justify-center h-7">
                  {banner && (
                    <div className="px-4 py-1 rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.9),rgba(200,140,0,0.9))] text-black text-[10px] font-black tracking-[0.28em] uppercase shadow-[0_0_16px_rgba(255,215,0,0.9)] border border-[#fff6d1]">
                      {banner}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bet bar under reels */}
            <div className="mt-3 rounded-2xl border border-white/18 bg-black/80 px-3 py-2">
              <div className="flex items-center justify-between text-[11px] text-white/70 mb-1.5">
                <span>
                  CURRENT BET:{' '}
                  <span className="font-bold text-[#ffd977]">
                    {bet.toLocaleString()} BGRC
                  </span>
                </span>
                <span className="text-[10px] text-white/50">
                  Min {minB} • Max {maxB} BGRC
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBet(prev => clampBet((prev || minB) + 1))}
                  className="rounded-md border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold hover:bg-white/10"
                >
                  BET +1
                </button>
                <button
                  type="button"
                  onClick={() => setBet(prev => clampBet((prev || minB) + 5))}
                  className="rounded-md border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold hover:bg-white/10"
                >
                  BET +5
                </button>
                <button
                  type="button"
                  onClick={clearBet}
                  className="rounded-md border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold hover:bg-white/10"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => setBet(maxB)}
                  className="rounded-md border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold hover:bg-white/10"
                >
                  MAX
                </button>
              </div>
              {mounted && betOutOfBounds && (
                <div className="mt-1 text-[10px] text-rose-400">
                  Bet must be between {minB} and {maxB} BGRC.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cabinet base shadow */}
        <div className="mt-3 h-6 w-[92%] mx-auto bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.8),transparent_70%)] opacity-80" />
      </div>

      {/* RIGHT — CONTROLS & PAYTABLE */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#11121d] via-[#080910] to-[#050509] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-white/60">
              STAKE & CONTROLS
            </div>
            <div className="mt-1 text-lg font-bold text-white">
              Spin the Reels
            </div>
          </div>
          <div className="text-right text-[11px] text-white/60">
            On-chain engine • BGRC jackpots
          </div>
        </div>

        {/* Wallet + stake summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/60">
              Wallet Balance
            </div>
            <div className="mt-1 text-lg font-extrabold text-white">
              {mounted ? balance.toLocaleString() : '…'}{' '}
              <span className="text-xs text-white/70">BGRC</span>
            </div>
            {priceUsd && (
              <div className="text-[11px] text-white/50 mt-1">
                {approxUsd(balance)}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/60">
              Active Stake
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#f8e39f]">
              {bet.toLocaleString()}{' '}
              <span className="text-xs text-[#f6e5b5]">BGRC</span>
            </div>
            {priceUsd && (
              <div className="mt-1 text-[11px] text-white/55">
                {approxUsd(bet)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2">
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
                : 'Approve BGRC for Slots'}
            </button>
          ) : (
            <>
              <button
                className="w-full btn-gold"
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
                className="w-full btn-dim"
                disabled={!mounted || !canSpin}
                onClick={spinNow}
              >
                {spinning ? 'Spinning…' : 'Spin Reels'}
              </button>
            </>
          )}
          {playErr && (
            <div className="text-[11px] text-rose-400">
              {(playErr as any)?.shortMessage || String(playErr)}
            </div>
          )}
        </div>

        {/* Paytable */}
        <div className="mt-6 rounded-xl border border-white/12 bg-black/40 p-3">
          <div className="text-sm font-semibold text-white/90 mb-2">
            Paytable (Visual)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {SYMBOLS.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/3 px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {s.kind === 'bar' ? (
                      <span className="px-2 py-0.5 rounded bg-black text-[10px] font-black text-[#ffd977] border border-[#ffd977]/60">
                        BAR
                      </span>
                    ) : s.kind === 'emoji' ? (
                      s.emoji
                    ) : (
                      '🪙'
                    )}
                  </span>
                  <span className="text-white/75">{s.name}</span>
                </div>
                <div className="text-right text-white/80">
                  <div>
                    Triple:{' '}
                    <span className="text-[#ffd977] font-semibold">
                      {s.tripleMul}×
                    </span>
                  </div>
                  <div className="text-white/60">Pair: {s.pairMul}×</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-white/50">
            Visual pay lines and multipliers. Smart contract enforces the
            actual on-chain payout for each spin.
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------- helpers -------- */

function ReelFace({
  index,
  spinning,
  spinProgress,
  highlight,
}: {
  index: number
  spinning: boolean
  spinProgress: number
  highlight: boolean
}) {
  const def = SYMBOLS[index % SYMBOLS.length]

  // subtle scale/blur while spinning
  const eased = easeOutCubic(spinProgress)
  const scale = spinning ? 1 + 0.08 * (1 - eased) : 1
  const blur = spinning ? 1 + 2 * (1 - eased) : 0

  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center select-none',
        'bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.10),transparent_55%)]',
        highlight ? 'brightness-110' : '',
      ].join(' ')}
      style={{
        transform: `scale(${scale})`,
        filter: blur > 0 ? `blur(${blur.toFixed(1)}px)` : undefined,
        transition: spinning ? 'none' : 'transform 0.16s ease-out',
      }}
    >
      {def.kind === 'logo' ? (
        <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-full border border-[#ffd977]/70 bg-[radial-gradient(circle_at_30%_20%,#fff7d8,#f5d67a_40%,#b8860b_85%)] shadow-[0_0_18px_rgba(0,0,0,0.8)] flex items-center justify-center">
          <Image
            src="/images/bgld-logo-circle.png"
            alt="BGLD"
            fill={false}
            width={52}
            height={52}
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
          />
        </div>
      ) : def.kind === 'bar' ? (
        <div className="px-4 py-2 rounded-lg bg-black border border-[#ffd977]/70 text-[#ffd977] text-lg md:text-xl font-black tracking-[0.25em]">
          BAR
        </div>
      ) : (
        <span className="text-4xl md:text-5xl drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]">
          {def.emoji}
        </span>
      )}
    </div>
  )
}

function Meter({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'gold' | 'green' | 'red' | 'neutral'
}) {
  const palette =
    tone === 'gold'
      ? 'border-[#ffd977]/60 bg-[#ffd977]/10 text-[#ffd977]'
      : tone === 'green'
      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200'
      : tone === 'red'
      ? 'border-rose-400/60 bg-rose-400/10 text-rose-100'
      : 'border-white/12 bg-black/40 text-white'

  return (
    <div className={`rounded-lg border px-2 py-1.5 ${palette}`}>
      <div className="text-[8px] uppercase tracking-[0.22em] opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold truncate">{value}</div>
    </div>
  )
}
