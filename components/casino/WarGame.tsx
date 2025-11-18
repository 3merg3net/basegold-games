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
import Casino from '@/abis/BaseGoldCasinoV3.json'
import { cardRank, formatCard } from '../general/cardsCore'

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

type Phase = 'idle' | 'confirming' | 'ready' | 'revealing' | 'result'

export default function WarGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ---- stake ----
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
    typeof minRaw === 'bigint' ? minRaw : parseUnits('1', 18)
  const maxBetWei: bigint =
    typeof maxRaw === 'bigint' ? maxRaw : parseUnits('1000000', 18)

  const minB = Number(formatUnits(minBetWei, 18))
  const maxB = Number(formatUnits(maxBetWei, 18))
  const outOfBounds = bet < minB || bet > maxB

  // ---- wallet + allowance ----
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
    if (!approveWait.isSuccess) return
    refetchAllow()
    refetchBal()
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  const onApprove = () => {
    if (!approve) return
    approve({ args: [CASINO, maxUint256] as const })
  }

  // ---- playWar ----
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playWar' as any, // playWar(uint256 stake, uint256 seed)
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState('Place a bet and confirm to battle.')
  const [playerCard, setPlayerCard] = useState<number | null>(null)
  const [dealerCard, setDealerCard] = useState<number | null>(null)

  // snapshot for net calc
  const [beforeWei, setBeforeWei] = useState<bigint | null>(null)
  const [lastStake, setLastStake] = useState<number>(0)
  const [netLast, setNetLast] = useState<number>(0)
  const [sessionPnL, setSessionPnL] = useState<number>(0)

  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9)),
    [bet]
  )

  const canConfirm =
    !!address && hasAllowance && !placing && !outOfBounds && balance >= bet
  const canBattle = phase === 'ready'

  const onConfirmBet = () => {
    if (!play || !canConfirm) return
    setPhase('confirming')
    setStatus('Confirm bet in wallet to go to battle…')
    setPlayerCard(null)
    setDealerCard(null)
    setNetLast(0)

    setBeforeWei(balanceWei)
    setLastStake(bet)

    play({
      args: [stakeWei, seed] as any,
    })
  }

  // tx mined → ready to reveal
  useEffect(() => {
    if (!playWait.isSuccess) return
    setPhase('ready')
    setStatus('Bet confirmed. Hit BATTLE to flip the cards.')
  }, [playWait.isSuccess])

  const onBattle = async () => {
    if (!playWait.isSuccess || !playTx) return
    if (!beforeWei) return

    setPhase('revealing')
    const h = (playTx as any).hash as `0x${string}`
    const big = BigInt(h)

    // derive visual cards from tx hash (contract decides real result)
    const pIdx = Number(big % 52n)
    const dIdx = Number((big >> 8n) % 52n)

    setPlayerCard(pIdx)
    setDealerCard(dIdx)

    // on-chain net
    const res = await refetchBal()
    const after =
      typeof res.data === 'bigint' ? (res.data as bigint) : balanceWei
    const rawNet = after - beforeWei

    const stakeNum = lastStake
    // 🔒 FORCE 1:1 DISPLAY — if win, show +stake; if loss, -stake; else 0
    let displayNet = 0
    if (rawNet > 0n) displayNet = stakeNum
    else if (rawNet < 0n) displayNet = -stakeNum
    else displayNet = 0

    setNetLast(displayNet)
    setSessionPnL(prev => prev + displayNet)

    const pr = cardRank(pIdx)
    const dr = cardRank(dIdx)

    let msg = ''
    if (pr > dr) {
      msg = `You win the battle! +${stakeNum} BGRC`
    } else if (dr > pr) {
      msg = `Dealer wins this battle. -${stakeNum} BGRC`
    } else {
      msg = 'Tie on rank. Contract decides the push / outcome on-chain.'
    }

    setStatus(msg)
    setPhase('result')
  }

  const approxNetClass =
    netLast > 0
      ? 'text-emerald-400 drop-shadow-[0_0_18px_rgba(16,185,129,0.7)]'
      : netLast < 0
      ? 'text-rose-400 drop-shadow-[0_0_14px_rgba(248,113,113,0.6)]'
      : 'text-slate-100'

  const renderWarCard = (idx: number | null) => {
    if (idx == null)
      return (
        <div className="w-[80px] h-[116px] md:w-[96px] md:h-[140px] rounded-xl border border-emerald-300 bg-[repeating-linear-gradient(135deg,#111827,#111827_4px,#1f2937_4px,#1f2937_8px)] shadow-[0_10px_30px_rgba(0,0,0,0.85)]" />
      )

    const { rank, suit, red } = formatCard(idx)
    return (
      <div className="w-[80px] h-[116px] md:w-[96px] md:h-[140px] rounded-xl border border-emerald-200 bg-[#f9fafb] shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between p-2">
        <div className={red ? 'text-sm font-semibold text-rose-600' : 'text-sm font-semibold text-slate-800'}>
          {rank}
        </div>
        <div className="flex items-center justify-center text-3xl md:text-4xl">
          <span className={red ? 'text-rose-600' : 'text-slate-800'}>{suit}</span>
        </div>
        <div
          className={
            red
              ? 'text-sm font-semibold self-end rotate-180 text-rose-600'
              : 'text-sm font-semibold self-end rotate-180 text-slate-800'
          }
        >
          {rank}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-emerald-400/40 bg-[radial-gradient(circle_at_15%_0%,#065f46,transparent_55%),radial-gradient(circle_at_85%_0%,#047857,transparent_55%),#022c22] shadow-[0_18px_45px_rgba(0,0,0,0.9)] p-4 md:p-5 space-y-4">
      {/* HEADER + WALLET / RESULT STRIP */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/85">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-emerald-50">
            Casino War
          </div>
          <div className="text-xs text-emerald-100/80 mt-1">
            High card wins. V3 contract enforces the real on-chain result.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs min-w-[260px]">
          <div className="rounded-2xl border border-emerald-200/60 bg-black/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/75">
              Wallet
            </div>
            <div className="mt-1 text-lg font-extrabold text-emerald-50">
              {mounted
                ? balance.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : '…'}{' '}
              <span className="text-[11px] text-emerald-100/80">BGRC</span>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200/60 bg-black/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/75">
              Last Result
            </div>
            <div className={`mt-1 text-lg font-extrabold ${approxNetClass}`}>
              {netLast > 0 && '+'}
              {netLast.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              <span className="text-[11px] text-emerald-100/80">BGRC</span>
            </div>
          </div>
        </div>
      </div>

      {/* FELT / CARDS */}
      <div className="rounded-[30px] border border-emerald-200/50 bg-[radial-gradient(circle_at_50%_0%,#065f46,#022c22_60%,#01110d_100%)] px-4 py-5 md:px-6 md:py-6 space-y-6">
        {/* Dealer row */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-50/90">
            DEALER
          </div>
          <div className="h-[120px] md:h-[140px] flex items-center justify-center">
            {renderWarCard(phase === 'result' || phase === 'revealing' ? dealerCard : null)}
          </div>
        </div>

        {/* Status chip */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-amber-200/70 bg-black/60 px-4 py-1.5 text-xs text-amber-50 shadow-[0_0_14px_rgba(252,211,77,0.6)]">
            {playWait.isLoading ? 'Resolving…' : status}
          </div>
        </div>

        {/* Player row */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-50/90">
            PLAYER
          </div>
          <div className="h-[120px] md:h-[140px] flex items-center justify-center">
            {renderWarCard(phase === 'result' || phase === 'revealing' ? playerCard : null)}
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Bet chips */}
        <div>
          <div className="text-xs text-emerald-100/80 mb-1">
            Stake (BGRC) – pays 1:1 on win
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map(v => {
              const disabled = mounted && (v < minB || v > maxB)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBet(v)}
                  disabled={disabled || phase === 'confirming'}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold border',
                    bet === v
                      ? 'border-amber-300 bg-amber-300/20 text-amber-50 shadow-[0_0_12px_rgba(252,211,77,0.7)]'
                      : 'border-emerald-200/60 bg-black/40 text-emerald-50 hover:bg-emerald-900/40',
                    disabled ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {v}
                </button>
              )
            })}
          </div>
          {mounted && outOfBounds && (
            <div className="mt-1 text-[11px] text-amber-100">
              Contract min {minB} / max {maxB} BGRC
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          {!hasAllowance ? (
            <button
              onClick={onApprove}
              disabled={!mounted || approving || approveWait.isLoading}
              className="px-5 py-2 rounded-full text-xs font-semibold tracking-[0.16em] uppercase border border-cyan-300/70 bg-cyan-500/20 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.6)] disabled:opacity-40"
            >
              {!mounted
                ? '…'
                : approving || approveWait.isLoading
                ? 'Confirm in wallet…'
                : 'Approve BGRC'}
            </button>
          ) : (
            <>
              <button
                onClick={onConfirmBet}
                disabled={!mounted || !canConfirm}
                className="px-5 py-2 rounded-full text-xs font-semibold tracking-[0.16em] uppercase bg-amber-300 text-black hover:bg-amber-200 shadow-[0_0_18px_rgba(252,211,77,0.8)] disabled:opacity-40"
              >
                {!mounted
                  ? '…'
                  : placing || playWait.isLoading
                  ? 'Confirming…'
                  : 'Confirm Bet'}
              </button>
              <button
                onClick={onBattle}
                disabled={!mounted || !canBattle}
                className="px-5 py-2 rounded-full text-xs font-semibold tracking-[0.16em] uppercase border border-emerald-200/80 bg-black/60 text-emerald-50 hover:bg-emerald-900/50 disabled:opacity-40"
              >
                {phase === 'ready' ? 'BATTLE' : 'Waiting…'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="text-[11px] text-emerald-100/70">
        Net result is computed from your real BGRC balance before and after the on-chain
        War call. Display is locked to <span className="font-semibold">1:1</span> payout on wins.
      </div>

      {(approveErr || playErr) && (
        <div className="text-[11px] text-rose-300">
          {(approveErr as any)?.shortMessage ||
            (playErr as any)?.shortMessage ||
            String(approveErr || playErr)}
        </div>
      )}
    </div>
  )
}
