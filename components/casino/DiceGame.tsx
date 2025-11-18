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

type Mode = 'EXACT' | 'OVER' | 'UNDER'

type DiceHistoryItem = {
  total: number
  d1: number
  d2: number
}

type Phase = 'idle' | 'confirming' | 'readyToRoll' | 'rolling' | 'result'

function diceFromHash(
  hash: `0x${string}` | undefined,
  seed: bigint
): [number, number, number] {
  const base = hash ? BigInt(hash) : seed
  const d1 = Number((base >> 32n) % 6n) + 1
  const d2 = Number((base >> 64n) % 6n) + 1
  return [d1, d2, d1 + d2]
}

export default function DiceGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // stake
  const [betAmount, setBetAmount] = useState(2)
  const stakeWei = useMemo(
    () => parseUnits(String(betAmount), 18),
    [betAmount]
  )

  // min/max (reuse minStake/maxStake like roulette)
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
    typeof minRaw === 'bigint' ? minRaw : parseUnits('1', 18)
  const maxStakeWei: bigint =
    typeof maxRaw === 'bigint' ? maxRaw : parseUnits('1000', 18)

  const minB = Number(formatUnits(minStakeWei, 18))
  const maxB = Number(formatUnits(maxStakeWei, 18))
  const outOfBounds = betAmount < minB || betAmount > maxB

  // wallet balance & allowance
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

  // optimistic overlay like coin flip
  const [effectiveBalance, setEffectiveBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!mounted) return
    setEffectiveBalance(prev => (prev === null ? balance : prev))
  }, [balance, mounted])

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

  // dice bet params
  const [mode, setMode] = useState<Mode>('OVER')
  const [target, setTarget] = useState(7) // threshold for over/under; exact total for EXACT
  const [lastTotal, setLastTotal] = useState<number | null>(null)
  const [lastDice, setLastDice] = useState<[number, number] | null>(null)
  const [status, setStatus] = useState('Confirm your bet to start a roll.')
  const [lastWin, setLastWin] = useState(0)
  const [sessionPnL, setSessionPnL] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [netDelta, setNetDelta] = useState(0)
  const [history, setHistory] = useState<DiceHistoryItem[]>([])
  const [phase, setPhase] = useState<Phase>('idle')

  // prepared outcome from tx hash (before user clicks "Roll Dice")
  const [prepared, setPrepared] = useState<{
    d1: number
    d2: number
    total: number
  } | null>(null)

  // snapshot of bet state at tx time
  const [resolvedMode, setResolvedMode] = useState<Mode | null>(null)
  const [resolvedTarget, setResolvedTarget] = useState<number | null>(null)
  const [resolvedBet, setResolvedBet] = useState<number | null>(null)

  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9)),
    [betAmount, mode, target]
  )

  // playDice call
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playDice' as any,
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  // After confirm bet mined: derive outcome from tx hash but do NOT reveal yet
  useEffect(() => {
    if (!playWait.isSuccess) return
    const hash = (playTx as any)?.hash as `0x${string}` | undefined
    const [d1, d2, total] = diceFromHash(hash, seed)

    setPrepared({ d1, d2, total })
    setLastDice(null)
    setLastTotal(null)
    setNetDelta(0)
    setLastWin(0)
    setRolling(false)
    setStatus('Bet confirmed. Click "Roll Dice" to reveal your total.')
    setPhase('readyToRoll')

    // background fresh balance
    refetchBal()
  }, [playWait.isSuccess, playTx, seed, refetchBal])

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !outOfBounds &&
    (effectiveBalance ?? balance) >= betAmount &&
    phase !== 'confirming'

  const canRollDice = phase === 'readyToRoll' && prepared != null

  const onConfirmBet = () => {
    if (!play || !canConfirm) return

    setStatus('Confirm bet in wallet…')
    setLastWin(0)
    setNetDelta(0)
    setPhase('confirming')
    setPrepared(null)

    // snapshot current config for this hand
    setResolvedMode(mode)
    setResolvedTarget(target)
    setResolvedBet(betAmount)

    // optimistic: subtract stake immediately
    setEffectiveBalance(prev => {
      const base = prev ?? balance
      return base - betAmount
    })

    // Match V3: playDice(uint256 stake, uint8 target, uint8 betType)
    play({
      args: [stakeWei, target, modeToInt(mode)] as const,
    })
  }

  const onRollDice = () => {
    if (!prepared || !resolvedMode || resolvedTarget == null || resolvedBet == null) return
    if (phase !== 'readyToRoll') return

    const { d1, d2, total } = prepared
    const bet = resolvedBet
    const modeForHand = resolvedMode
    const targetForHand = resolvedTarget

    setPhase('rolling')
    setRolling(true)
    setStatus('Rolling the dice…')

    // brief "spin" window
    setLastDice(null)
    setLastTotal(null)

    setTimeout(() => {
      setLastDice([d1, d2])
      setLastTotal(total)

      let winText = ''
      let won = false

      if (modeForHand === 'EXACT') {
        if (total === targetForHand) {
          won = true
          winText = `Hit exact ${total}!`
        } else {
          winText = `Total ${total}. Missed ${targetForHand}.`
        }
      } else if (modeForHand === 'OVER') {
        if (total > targetForHand) {
          won = true
          winText = `Total ${total} is OVER ${targetForHand}.`
        } else {
          winText = `Total ${total} is not over ${targetForHand}.`
        }
      } else if (modeForHand === 'UNDER') {
        if (total < targetForHand) {
          won = true
          winText = `Total ${total} is UNDER ${targetForHand}.`
        } else {
          winText = `Total ${total} is not under ${targetForHand}.`
        }
      }

      // UI-only estimated multipliers:
      // OVER/UNDER: even money (2x total return = +1x profit)
      // EXACT: spicier multiple (5x total return = +4x profit)
      const estMul = modeForHand === 'EXACT' ? 5 : 2
      const delta = won ? bet * (estMul - 1) : -bet

      setStatus(winText)
      setLastWin(won ? delta : 0)
      setSessionPnL(prev => prev + delta)
      setNetDelta(delta)
      setPhase('result')
      setRolling(false)

      // optimistic overlay: add stake + profit if win
      if (won) {
        setEffectiveBalance(prev => {
          const base = prev ?? balance
          return base + bet * estMul
        })
      }
      // refresh chain balance in background
      setTimeout(() => refetchBal(), 600)

      // update history now that the roll is revealed
      setHistory(prev => {
        const next: DiceHistoryItem[] = [{ total, d1, d2 }, ...prev]
        return next.slice(0, 5)
      })
    }, 1900) // slightly longer than before so spin feels real
  }

  const hotStreak = sessionPnL >= betAmount * 5 // tweak threshold if you want
  const displayBalance =
    effectiveBalance !== null ? effectiveBalance : balance

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.2fr)_360px] gap-6 items-start">
      {/* LEFT — Dice table */}
      <div className="relative rounded-[32px] border border-[#22c55e]/40 bg-gradient-to-br from-[#022c1e] via-[#02140f] to-[#02060a] shadow-[0_0_60px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.4),transparent_60%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-[#bbf7d0]/90 uppercase">
            BASE GOLD RUSH • DICE
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-[#bbf7d0]/80">
              Bet Over / Under / Exact Number Hit
            </div>
            {hotStreak && (
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.7)] uppercase tracking-[0.18em]">
                <span>🔥</span>
                <span>Hot Streak</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_50%_0%,#064e3b,#020617)] px-4 py-5">
          {/* status + session stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="text-xs text-emerald-100/90 max-w-sm">
              <div className="uppercase tracking-[0.2em] text-emerald-200/80 text-[10px]">
                Table Status
              </div>
              <div className="mt-1 text-sm text-white">{status}</div>
            </div>
            <div className="flex flex-col items-end gap-1 text-[11px] text-emerald-100/90">
              <div>
                Session P&amp;L:{' '}
                <span
                  className={
                    sessionPnL >= 0
                      ? 'text-emerald-300 font-semibold'
                      : 'text-rose-300 font-semibold'
                  }
                >
                  {sessionPnL >= 0 ? '+' : ''}
                  {sessionPnL.toFixed(2)} BGLD
                </span>
              </div>
              <div>
                Last total:{' '}
                <span className="font-semibold text-emerald-100">
                  {lastTotal ?? '—'}
                </span>
              </div>
            </div>
          </div>

          {/* felt + dice */}
          <div className="relative mt-1 flex flex-col items-center gap-4">
            <div className="w-full max-w-[420px] aspect-[7/3] rounded-[40px] border border-emerald-300/25 bg-[radial-gradient(circle_at_20%_0%,#047857,transparent_55%),radial-gradient(circle_at_80%_0%,#059669,transparent_55%),#064e3b] shadow-[0_18px_40px_rgba(0,0,0,0.85)] flex flex-col justify-between px-6 py-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-emerald-50/80">
                <span>Over {target}</span>
                <span>Exact {target}</span>
                <span>Under {target}</span>
              </div>

              <div className="flex items-center justify-center gap-6 md:gap-8">
                <DiceVisual
                  value={lastDice ? lastDice[0] : null}
                  rolling={rolling}
                />
                <DiceVisual
                  value={lastDice ? lastDice[1] : null}
                  rolling={rolling}
                />
                <WildDiceVisual total={lastTotal} rolling={rolling} />
              </div>

              <div className="flex items-center justify-center mt-2">
                <div className="inline-flex items-baseline gap-2 rounded-full border border-emerald-100/40 bg-black/50 px-4 py-1.5 text-xs text-emerald-50/90">
                  <span>Stake:</span>
                  <span className="text-sm font-bold">
                    {betAmount.toLocaleString()} BGLD
                  </span>
                  <span className="opacity-70">per roll</span>
                </div>
              </div>
            </div>

            {/* mode display */}
            <div className="text-[11px] text-emerald-50/80">
              Current bet mode:{' '}
              <span className="font-semibold text-emerald-200">
                {mode === 'EXACT'
                  ? `Exact total = ${target}`
                  : mode === 'OVER'
                  ? `Over ${target}`
                  : `Under ${target}`}
              </span>
            </div>
          </div>

          {/* history strip */}
          <div className="mt-4 w-full max-w-[420px] rounded-2xl border border-emerald-300/25 bg-black/40 px-3 py-2 text-[11px] text-emerald-50/80">
            <div className="flex items-center justify-between mb-1">
              <span className="uppercase tracking-[0.18em] text-emerald-100/80">
                Last Rolls
              </span>
              <span className="text-emerald-200/80">
                {history.length} / 5
              </span>
            </div>
            {history.length === 0 ? (
              <div className="text-emerald-100/60">No rolls yet.</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.map((h, idx) => (
                  <div
                    key={`${h.total}-${idx}`}
                    className="min-w-[64px] rounded-xl border border-emerald-200/40 bg-emerald-900/40 px-2 py-1.5 flex flex-col items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.4)]"
                  >
                    <div className="text-xs text-emerald-100/90">
                      {h.d1} + {h.d2}
                    </div>
                    <div className="text-lg font-bold text-emerald-200">
                      {h.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — Controls & Wallet */}
      <div className="rounded-2xl border border-[#f5e3a8]/30 bg-gradient-to-b from-white/10 via-black/40 to-black/80 p-4 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        <div>
          <div className="text-lg font-bold text-[#fef3c7] drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]">
            Dice Game Controls
          </div>
          <div className="text-xs text-white/70 mt-1">
            Approve <b>BGLD</b> once, confirm your bet, then roll the dice to reveal
            your on-chain total.
          </div>
        </div>

        {/* mode selection */}
        <div>
          <div className="text-sm text-white/80 mb-1">Bet Type</div>
          <div className="flex flex-wrap gap-2">
            <ModeButton
              label="Over 7"
              active={mode === 'OVER'}
              onClick={() => {
                setMode('OVER')
                setTarget(7)
              }}
            />
            <ModeButton
              label="Under 7"
              active={mode === 'UNDER'}
              onClick={() => {
                setMode('UNDER')
                setTarget(7)
              }}
            />
            <ModeButton
              label="Exact Total"
              active={mode === 'EXACT'}
              onClick={() => setMode('EXACT')}
            />
          </div>
          {mode === 'EXACT' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
              <span>Pick total (2–12):</span>
              <input
                type="number"
                min={2}
                max={12}
                value={target}
                onChange={e => {
                  const v = Number(e.target.value || '7')
                  if (v < 2 || v > 12) return
                  setTarget(v)
                }}
                className="w-16 rounded-md border border-white/30 bg-black/60 px-2 py-1 text-right text-sm text-white"
              />
            </div>
          )}
        </div>

        {/* stake */}
        <div>
          <div className="text-sm text-white/80">Stake (BGLD)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1, 2, 5, 10, 25].map(v => {
              const disabled = mounted && (v < minB || v > maxB)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBetAmount(v)}
                  disabled={disabled}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border backdrop-blur',
                    betAmount === v
                      ? 'border-emerald-300/80 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.6)]'
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
              Bet must be between {minB} and {maxB} BGLD.
            </div>
          )}
        </div>

        {/* wallet */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-[#facc15]/40 bg-black/60 p-3 shadow-[0_0_22px_rgba(234,179,8,0.4)]">
            <div className="text-[11px] text-[#fef9c3]/80 uppercase tracking-[0.18em]">
              Wallet Balance
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#fef9c3]">
              {mounted
                ? displayBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : '…'}{' '}
              <span className="text-[11px] font-semibold text-[#fde68a]">
                BGLD
              </span>
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
                : 'Approve BGLD for Casino'}
            </button>
          ) : (
            <>
              <button
                onClick={onConfirmBet}
                disabled={!mounted || !canConfirm}
                className="w-full rounded-full border border-[#fde68a]/80 bg-gradient-to-r from-[#facc15]/80 to-[#fb923c]/80 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(250,204,21,0.75)] hover:brightness-110 disabled:opacity-40"
              >
                {!mounted
                  ? '…'
                  : placing || playWait.isLoading || phase === 'confirming'
                  ? 'Confirming bet…'
                  : 'Confirm Bet'}
              </button>
              <button
                onClick={onRollDice}
                disabled={!mounted || !canRollDice}
                className="w-full rounded-full border border-white/20 bg-black/60 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
              >
                {phase === 'rolling' ? 'Rolling…' : 'Roll Dice'}
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

        {/* Outcome / winnings bar */}
        <div className="rounded-xl border border-white/15 bg-black/50 p-3 space-y-2 mt-2">
          <div className="text-sm font-semibold text-white/90 flex items-center justify-between">
            <span>Last Result</span>
            <span className="text-[11px] text-emerald-100/80">
              Total:{' '}
              <span className="font-bold">
                {lastTotal ?? '—'}
              </span>
            </span>
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
            {netDelta.toFixed(2)} BGLD
          </div>

          {lastWin > 0 && (
            <div className="text-xs text-[#bbf7d0]">
              Estimated Win:{' '}
              <span className="font-semibold">
                {lastWin.toFixed(2)} BGLD
              </span>
            </div>
          )}

          <div className="text-[10px] text-white/50">
            PnL is an estimated UI preview. Actual payouts are enforced by the
            on-chain dice contract.
          </div>
        </div>

        <div className="text-[10px] text-white/45 mt-1">
          Demo Sepolia. Payouts, odds, and session P&amp;L will reflect your
          on-chain V3 config once deployed.
        </div>
      </div>
    </div>
  )
}

function modeToInt(mode: Mode): number {
  if (mode === 'EXACT') return 0
  if (mode === 'OVER') return 1
  return 2
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs font-semibold border transition backdrop-blur',
        active
          ? 'border-emerald-300/80 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.6)]'
          : 'border-white/20 bg-black/40 text-white/80 hover:bg-white/10',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function DiceVisual({
  value,
  rolling,
}: {
  value: number | null
  rolling: boolean
}) {
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
      <div
        className={[
          'w-full h-full rounded-2xl border flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.8)]',
        ].join(' ')}
        style={{
          borderColor: '#d1d5db',
          background:
            'radial-gradient(circle at 20% 15%, #ffffff, #e5e7eb 45%, #d1d5db 75%, #9ca3af)',
          boxShadow:
            '0 10px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(0,0,0,0.35)',
          // this tilt/bounce is fine – it's on the OUTER cube
          transform: rolling
            ? 'rotate(18deg) translateY(-4px)'
            : 'rotate(0deg) translateY(0)',
          transition: 'transform 0.18s ease-in-out',
        }}
      >
        {/* 👇 spin only the inner face; no inline transform here */}
        <div
          className={[
            'relative w-10 h-10 flex items-center justify-center',
            rolling ? 'animate-spin' : '',
          ].join(' ')}
        >
          {value == null ? (
            <span className="text-emerald-800 text-xl font-black select-none">
              ?
            </span>
          ) : (
            renderPips(value)
          )}
        </div>
      </div>
    </div>
  )
}




function WildDiceVisual({
  total,
  rolling,
}: {
  total: number | null
  rolling: boolean
}) {
  const display = total ?? null

  return (
    <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
      <div
        className={[
          'w-full h-full rounded-full flex items-center justify-center border shadow-[0_10px_28px_rgba(0,0,0,0.9)]',
          // pulse + slight lift/scale while rolling
          rolling ? 'animate-pulse -translate-y-1 scale-105' : '',
        ].join(' ')}
        style={{
          borderColor: '#facc15',
          background:
            'radial-gradient(circle at 20% 15%, #fef9c3, #facc15 40%, #d97706 75%, #78350f)',
          boxShadow:
            '0 10px 25px rgba(0,0,0,0.8), inset 0 3px 5px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(0,0,0,0.55)',
          // ❌ no transform here either
        }}
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-100/90">
            Total
          </span>
          <span className="text-lg md:text-xl font-black text-black drop-shadow-[0_0_8px_rgba(250,250,210,0.8)]">
            {display ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}



function renderPips(v: number) {
  const spots: [number, number][] = []
  const add = (x: number, y: number) => spots.push([x, y])

  switch (v) {
    case 1:
      add(50, 50)
      break
    case 2:
      add(25, 25)
      add(75, 75)
      break
    case 3:
      add(25, 25)
      add(50, 50)
      add(75, 75)
      break
    case 4:
      add(25, 25)
      add(75, 25)
      add(25, 75)
      add(75, 75)
      break
    case 5:
      add(25, 25)
      add(75, 25)
      add(50, 50)
      add(25, 75)
      add(75, 75)
      break
    case 6:
      add(25, 25)
      add(75, 25)
      add(25, 50)
      add(75, 50)
      add(25, 75)
      add(75, 75)
      break
  }

  return (
    <>
      {spots.map(([x, y], i) => (
        <span
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full bg-emerald-800"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.6), inset 0 0 2px rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </>
  )
}
