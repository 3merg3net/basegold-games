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

/** Minimal local ERC20 ABI */
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
  ((process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) ||
    zeroAddress) as `0x${string}`

type Phase = 'idle' | 'confirming' | 'ready' | 'flipping' | 'result'
type Side = 'HEADS' | 'TAILS'

export default function CoinFlipGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // stake
  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(
    () => parseUnits(String(bet), 18),
    [bet]
  )

  // min / max from contract
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
    typeof maxRaw === 'bigint'
      ? maxRaw
      : parseUnits('1000000', 18)

  const minB = Number(formatUnits(minBetWei, 18))
  const maxB = Number(formatUnits(maxBetWei, 18))
  const outOfBounds = bet < minB || bet > maxB

  // chain balance & allowance
  const { data: balRaw, refetch: refetchBal } = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: mounted && Boolean(address && isAddress(BGLD)),
    watch: true,
  })
  const balanceWei: bigint =
    typeof balRaw === 'bigint' ? balRaw : 0n
  const balance = Number(formatUnits(balanceWei, 18))

  const {
    data: allowanceRaw,
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
  const allowance: bigint =
    typeof allowanceRaw === 'bigint' ? allowanceRaw : 0n
  const hasAllowance = allowance >= stakeWei

  // optimistic balance overlay
  const [effectiveBalance, setEffectiveBalance] =
    useState<number | null>(null)

  // whenever chain balance changes, sync base for overlay
  useEffect(() => {
    if (!mounted) return
    setEffectiveBalance(prev =>
      prev === null ? balance : prev
    )
  }, [balance, mounted])

  // Heads / Tails
  const [side, setSide] = useState<Side>('HEADS')

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

  // confirm bet – V3: playCoinFlip(uint256 stake, uint256 seed, bool guessHeads)
  const {
    write: play,
    data: playTx,
    isLoading: placing,
    error: playErr,
  } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playCoinFlip' as any,
  })
  const playWait = useWaitForTransaction({
    hash: (playTx as any)?.hash,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [flipRotation, setFlipRotation] = useState(0)
  const [landSide, setLandSide] = useState<Side | null>(null)
  const [resultText, setResultText] = useState('')
  const [netDelta, setNetDelta] = useState<number>(0) // P&L for last flip

  // seed – uint256, as required by ABI (no bytes32)
  const seed = useMemo(
    () =>
      (BigInt(Date.now()) << 64n) ^
      BigInt(Math.floor(Math.random() * 1e9)),
    [bet, side]
  )

  const onApprove = () => {
    if (!approve) return
    approve({ args: [CASINO, maxUint256] as const })
  }

  const onConfirmBet = () => {
    if (!play || !address) return
    if (outOfBounds) return

    setPhase('confirming')
    setResultText('Confirm bet in wallet…')
    setNetDelta(0)
    setLandSide(null)

    // optimistic: subtract stake immediately
    setEffectiveBalance(prev => {
      const base = prev ?? balance
      return base - bet
    })

    const isHeads = side === 'HEADS'

    // EXACTLY matches ABI: (stake, seed, guessHeads)
    play({
      args: [stakeWei, seed, isHeads] as const,
    })
  }

  // After approve
  useEffect(() => {
    if (!approveWait.isSuccess) return
    refetchAllow()
    setPhase('idle')
  }, [approveWait.isSuccess, refetchAllow])

  // After confirm bet mined: derive outcome bit from tx hash (UI only),
  // and refresh on-chain balance in the background.
  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}` | undefined
    if (!h) return

    const bit = Number(BigInt(h) & 1n)
    const landed: Side = bit === 0 ? 'HEADS' : 'TAILS'
    setLandSide(landed)
    setPhase('ready')
    setResultText('Bet confirmed. Flip to reveal result.')

    // reload real token balance from chain
    refetchBal()
    refetchAllow()
  }, [playWait.isSuccess, playTx, refetchBal, refetchAllow])

  const flipCoin = () => {
    if (phase !== 'ready' || landSide == null) return

    setPhase('flipping')
    const extraSpins = 5
    const baseRotation = flipRotation
    const finalRotation =
      baseRotation +
      extraSpins * 360 +
      (landSide === 'HEADS' ? 0 : 180)

    setFlipRotation(finalRotation)

    const won = landSide === side
const mul = won ? 2 : 0 // 2x total return on stake (stake back + 1x profit)


    setTimeout(() => {
      if (won) {
        const profit = bet * (mul - 1)
        setNetDelta(profit)
        setResultText(
  `You won! Landed on ${landSide}. +${profit.toFixed(
    4
  )} BGRC (2.00× / even money)`
)

        // optimistic: add full returned amount (stake + profit)
        setEffectiveBalance(prev => {
          const base = prev ?? balance
          return base + bet * mul
        })
      } else {
        setNetDelta(-bet)
        setResultText(
          `Lost. Landed on ${landSide}. -${bet.toFixed(4)} BGRC`
        )
        // stake was already subtracted
      }

      setPhase('result')
      // pull fresh onchain balance in background
      refetchBal()
    }, 900)
  }

  const canConfirm =
    !!address &&
    hasAllowance &&
    !placing &&
    !outOfBounds &&
    (effectiveBalance ?? balance) >= bet
  const canFlip = phase === 'ready'

  const displayBalance =
    effectiveBalance !== null ? effectiveBalance : balance

  return (
    <div className="grid md:grid-cols-[minmax(340px,1fr)_360px] gap-6 items-start">
      {/* LEFT: Cabinet + Coin */}
      <div className="relative rounded-[26px] border border-[#f7e38a]/40 bg-gradient-to-br from-[#151724] via-[#05060b] to-[#040308] shadow-[0_0_60px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.35),transparent_65%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs md:text-sm font-semibold tracking-[0.3em] text-[#fce89b]/90 uppercase">
            BASE GOLD RUSH • COIN FLIP
          </div>
          <div className="text-[11px] text-white/60">
  Heads / Tails • Even money (2× on hit)
</div>

        </div>

        {/* Coin display */}
        <div className="flex flex-col items-center justify-center mt-4 mb-4">
          <div className="relative h-40 w-40 md:h-52 md:w-52 [perspective:1200px]">
            <div
              className="relative h-full w-full rounded-full"
              style={{
                transform: `rotateY(${flipRotation}deg)`,
                transformStyle: 'preserve-3d',
                transition:
                  phase === 'flipping'
                    ? 'transform 0.9s cubic-bezier(.3,.7,.4,1.05)'
                    : undefined,
              }}
            >
              {/* HEADS side */}
              <div
                className="
                  absolute inset-0 flex items-center justify-center rounded-full backface-hidden
                  bg-[radial-gradient(circle_at_30%_20%,#fff9e0,#f6d46a_35%,#c79321_70%,#5a3f0b_100%)]
                  shadow-[0_0_0_2px_rgba(255,255,255,0.45)_inset,0_0_0_7px_rgba(0,0,0,0.65)_inset,0_18px_35px_rgba(0,0,0,0.95)]
                "
                style={{ transform: 'rotateY(0deg)' }}
              >
                <div className="
                  h-[70%] w-[70%] rounded-full border border-white/20
                  bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_60%)]
                  flex items-center justify-center
                ">
                  <span className="
                    text-3xl md:text-4xl font-black tracking-[0.25em]
                    text-[#5b3c08]
                    drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]
                  ">
                    HEADS
                  </span>
                </div>
              </div>

              {/* TAILS side */}
              <div
                className="
                  absolute inset-0 flex items-center justify-center rounded-full backface-hidden
                  bg-[radial-gradient(circle_at_30%_20%,#fff9e0,#f6d46a_35%,#c79321_70%,#5a3f0b_100%)]
                  shadow-[0_0_0_2px_rgba(255,255,255,0.45)_inset,0_0_0_7px_rgba(0,0,0,0.65)_inset,0_18px_35px_rgba(0,0,0,0.95)]
                "
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="
                  h-[70%] w-[70%] rounded-full border border-white/20
                  bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_60%)]
                  flex items-center justify-center
                ">
                  <span className="
                    text-3xl md:text-4xl font-black tracking-[0.25em]
                    text-[#5b3c08]
                    drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]
                  ">
                    TAILS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wager + side selection */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex gap-3">
              {(['HEADS', 'TAILS'] as Side[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={[
                    'px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur',
                    side === s
                      ? 'border-[#ffd977]/80 bg-[#ffd977]/20 text-[#ffd977] shadow-[0_0_24px_rgba(252,211,77,0.55)]'
                      : 'border-white/20 bg-black/40 text-white/80 hover:bg-white/10',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-white/70">
              Wager:&nbsp;
              <span className="font-semibold text-[#FFD700]">
                {bet.toFixed(2)} BGRC
              </span>
            </div>

            <div className="mt-2 text-xs text-white/60 text-center max-w-md">
              Confirm your BGRC stake, then flip. Land on your side to
              win.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Controls + Outcome */}
      <div className="rounded-2xl border border-[#f5e3a8]/30 bg-gradient-to-b from-white/10 via-black/40 to-black/80 p-4 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        <div>
          <div className="text-lg font-bold text-[#fef3c7] drop-shadow-[0_0_18px_rgba(250,204,21,0.5)]">
            Coin Flip Controls
          </div>
          <div className="text-xs text-white/70 mt-1">
            Connect wallet, pick your side, set stake, approve BGRC once,
            then confirm bet &amp; flip.
          </div>
        </div>

        {/* Stake */}
        <div>
          <div className="text-sm text-white/80">Stake (BGRC)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(v => {
              const disabled =
                mounted && (v < minB || v > maxB)
              return (
                <button
                  key={v}
                  onClick={() => !disabled && setBet(v)}
                  disabled={disabled}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border backdrop-blur',
                    bet === v
                      ? 'border-[#ffd977]/80 bg-[#ffd977]/20 text-[#ffd977] shadow-[0_0_18px_rgba(252,211,77,0.6)]'
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
              Bet must be between {minB} and {maxB} BGRC.
            </div>
          )}
        </div>

        {/* Balance / Approval */}
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
                BGRC
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/50 p-3">
            <div className="text-[11px] text-white/60 uppercase tracking-[0.18em]">
              Approval
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {mounted
                ? hasAllowance
                  ? 'Approved for play'
                  : 'Not approved'
                : '…'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!hasAllowance ? (
            <button
              onClick={onApprove}
              className="w-full rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.5)] hover:bg-cyan-400/25 disabled:opacity-40"
              disabled={
                !mounted ||
                approving ||
                approveWait.isLoading
              }
            >
              {!mounted
                ? '…'
                : approving || approveWait.isLoading
                ? 'Confirm in wallet…'
                : 'Approve BGRC for Casino'}
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
                  : placing || playWait.isLoading
                  ? 'Confirming bet…'
                  : 'Confirm Bet'}
              </button>
              <button
                onClick={flipCoin}
                disabled={!mounted || !canFlip}
                className="w-full rounded-full border border-white/20 bg-black/60 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
              >
                {phase === 'flipping'
                  ? 'Flipping…'
                  : 'Flip Coin'}
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
        <div className="rounded-xl border border-white/15 bg-black/50 p-3 space-y-2">
          <div className="text-sm font-semibold text-white/90 flex items-center justify-between">
            <span>Outcome</span>
            {landSide && (
              <span className="text-[11px] text-white/70">
                Landed:&nbsp;
                <span className="font-bold text-white">
                  {landSide}
                </span>
              </span>
            )}
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
            {netDelta.toFixed(4)} BGRC
          </div>

          <div className="text-white/85 min-h-[1.25rem] text-sm">
            {playWait.isLoading
              ? 'Resolving…'
              : resultText || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
