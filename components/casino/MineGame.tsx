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

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

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

export default function MineGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  // Bounds
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

  const minBetWei: bigint =
    typeof minRaw === 'bigint' ? minRaw : parseUnits('0.01', 18)
  const maxBetWei: bigint =
    typeof maxRaw === 'bigint' ? maxRaw : parseUnits('1000000', 18)

  const minBetB = Number(formatUnits(minBetWei, 18))
  const maxBetB = Number(formatUnits(maxBetWei, 18))
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

  const {
    data: allowRaw,
    refetch: refetchAllow,
  } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? zeroAddress, CASINO],
    enabled:
      mounted && Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowanceWei: bigint = typeof allowRaw === 'bigint' ? allowRaw : 0n
  const hasAllowance = allowanceWei >= stakeWei

  // Before/after + last result
  const [beforeWei, setBeforeWei] = useState<bigint | null>(null)
  const [lastNetWei, setLastNetWei] = useState<bigint | null>(null)
  const [lastPayoutWei, setLastPayoutWei] = useState<bigint | null>(null)
  const [lastBet, setLastBet] = useState<number | null>(null)
  const [statusText, setStatusText] = useState<string>(
    'Confirm your stake and swing into the mine.'
  )

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

  const onApprove = () => {
    if (!approve) return
    approve({ args: [CASINO, maxUint256] as const })
  }

  // Play Mine
  const {
    write: playMine,
    data: playTx,
    isLoading: mining,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playMine',
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [shake, setShake] = useState(false)

  const canMine =
    !!address &&
    hasAllowance &&
    !outOfBounds &&
    balanceWei >= stakeWei &&
    !mining &&
    !playWait.isLoading

  const onMine = () => {
    if (!address || !playMine) return
    setBeforeWei(balanceWei)
    setLastBet(bet)
    setStatusText('Dropping pickaxe on-chain… confirm in wallet.')
    const seed =
      (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9))

    // little shake animation
    setShake(true)
    setTimeout(() => setShake(false), 200)

    playMine({ args: [stakeWei, seed] as const })
  }

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

      const payoutB = Number(formatUnits(payout > 0n ? payout : 0n, 18))
      const betB = lastBet ?? bet
      const mult = betB > 0 && payoutB > 0 ? payoutB / betB : 0

      if (net > 0n) {
        if (mult >= 20) {
          setStatusText(
            `Massive strike! Gross payout ~${mult.toFixed(1)}× your stake.`
          )
        } else if (mult >= 5) {
          setStatusText(
            `Rich vein hit. Gross payout ~${mult.toFixed(1)}× your stake.`
          )
        } else {
          setStatusText(
            `Clean hit. Gross payout ~${mult.toFixed(1)}× your stake.`
          )
        }
      } else if (net < 0n) {
        setStatusText('Missed the vein this time. The rock was empty.')
      } else {
        setStatusText('Push. Your stake came back.')
      }
    }

    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playWait.isSuccess])

  const lastNet =
    lastNetWei != null ? Number(formatUnits(lastNetWei, 18)) : 0
  const lastPayout =
    lastPayoutWei != null ? Number(formatUnits(lastPayoutWei, 18)) : 0

  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#02050a] via-[#050307] to-black p-4 md:p-6">
      {/* Header + wallet */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
            Mine • Strike the Vein
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-white">
            Swing for the rich seam. One hit can pay huge.
          </div>
          <div className="mt-1 text-xs text-white/70 max-w-md">
            A single on-chain strike against the Base Gold seam. Testnet odds:
            some taps, some monsters, mostly dust — just like a real mine.
          </div>
        </div>

        <div className="rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-right">
          <div className="text-[11px] font-semibold tracking-wide text-white/70">
            Wallet Balance
          </div>
          <div className="text-2xl font-black text-white">
            {mounted
              ? balanceB.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })
              : '—'}{' '}
            <span className="text-xs font-semibold text-white/70">
              BGRC
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(280px,1.1fr)_minmax(260px,0.9fr)] gap-4">
        {/* LEFT: Mine UI */}
        <div className="relative rounded-2xl border border-amber-500/40 bg-[radial-gradient(circle_at_50%_0%,#1b1306_0%,#050307_56%,#020106_100%)] p-5 overflow-hidden">
          <div className="absolute inset-x-0 -top-10 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.35),transparent_60%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300/90">
              BASE GOLD RUSH
            </div>
            <div className="text-[11px] text-white/70">
              Testnet odds • Single strike
            </div>
          </div>

          <div
            className={[
              'mt-2 mb-4 rounded-2xl border border-amber-300/40 bg-gradient-to-br from-[#0c0c10] via-[#110a04] to-black p-4',
              shake ? 'animate-[wiggle_0.2s_ease-in-out]' : '',
            ].join(' ')}
          >
            <style jsx>{`
              @keyframes wiggle {
                0% {
                  transform: translateX(0);
                }
                25% {
                  transform: translateX(-3px);
                }
                50% {
                  transform: translateX(3px);
                }
                75% {
                  transform: translateX(-2px);
                }
                100% {
                  transform: translateX(0);
                }
              }
            `}</style>

            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.9)]">
                <div className="absolute inset-[6px] rounded-full bg-black/70 flex items-center justify-center">
                  <span className="text-2xl">⛏️</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-200/80">
                  Active Strike
                </div>
                <div className="text-sm text-white/85">
                  Stake: <span className="font-semibold">{bet} BGRC</span>
                </div>
                <div className="text-[11px] text-white/65">
                  One transaction, one strike into the seam.
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] text-center">
              <div className="rounded-lg border border-amber-300/30 bg-black/50 py-2">
                <div className="text-amber-200/90 font-semibold">Dust</div>
                <div className="text-white/70">0×</div>
              </div>
              <div className="rounded-lg border border-amber-300/30 bg-black/50 py-2">
                <div className="text-amber-200/90 font-semibold">Tap</div>
                <div className="text-white/70">~1.5×</div>
              </div>
              <div className="rounded-lg border border-amber-300/30 bg-black/50 py-2">
                <div className="text-amber-200/90 font-semibold">Vein</div>
                <div className="text-white/70">~3–10×</div>
              </div>
              <div className="rounded-lg border border-amber-300/30 bg-black/50 py-2">
                <div className="text-amber-200/90 font-semibold">Motherlode</div>
                <div className="text-white/70">~30×</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-white/65 max-w-sm">
            Visual paybands shown are the testnet curve. Exact odds and
            multipliers are enforced directly by the contract.
          </div>
        </div>

        {/* RIGHT: Controls + Result */}
        <div className="space-y-4">
          {/* Stake */}
          <div className="rounded-xl border border-white/15 bg-black/50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-white/80">
                Stake per Strike
              </div>
              <div className="text-[10px] text-white/60">
                Bounds: {minBetB.toLocaleString()}–{maxBetB.toLocaleString()} BGRC
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(v => {
                const disabled = mounted && (v < minBetB || v > maxBetB)
                return (
                  <button
                    key={v}
                    onClick={() => !disabled && setBet(v)}
                    disabled={disabled}
                    className={[
                      'rounded-lg px-3 py-2 text-sm font-semibold border',
                      bet === v
                        ? 'border-amber-300 bg-amber-300/15 text-amber-100'
                        : 'border-white/15 bg-black/70 text-white/80 hover:bg-white/5',
                      disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            {mounted && outOfBounds && (
              <div className="mt-1 text-[11px] text-rose-400">
                Stake must be between {minBetB.toLocaleString()} and{' '}
                {maxBetB.toLocaleString()} BGRC.
              </div>
            )}
          </div>

          {/* Last result */}
          <div className="rounded-xl border border-amber-400/40 bg-black/60 p-3">
            <div className="text-[11px] font-semibold text-white/80">
              Last Strike Result
            </div>
            <div className="mt-1 text-sm text-white/85 min-h-[1.25rem]">
              {playWait.isLoading ? 'Resolving strike on Base…' : statusText}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/15 bg-black/70 p-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/60">
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
              <div className="rounded-lg border border-white/15 bg-black/70 p-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/60">
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

          {/* Actions */}
          <div className="space-y-2">
            {!hasAllowance ? (
              <button
                onClick={onApprove}
                disabled={!mounted || approving || approveWait.isLoading || !address}
                className="btn-cyan w-full"
              >
                {!mounted
                  ? '…'
                  : approving || approveWait.isLoading
                  ? 'Confirm in wallet…'
                  : 'Approve BGRC for Mine'}
              </button>
            ) : (
              <button
                onClick={onMine}
                disabled={!mounted || !canMine}
                className="btn-gold w-full"
              >
                {!mounted
                  ? '…'
                  : mining || playWait.isLoading
                  ? 'Confirming strike…'
                  : 'Confirm Bet & Strike'}
              </button>
            )}
            {!address && (
              <div className="text-center text-[11px] text-white/70">
                Connect your wallet to mine.
              </div>
            )}
            {(approveErr || playErr) && (
              <div className="text-[11px] text-rose-400/90">
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
