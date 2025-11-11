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

/* Local minimal ERC20 ABI */
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve',   stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD  = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

/* Symbols and payouts */
const SYMBOLS = [
  { g:'💎', name:'DIAMOND',  tripleMul: 25, pairMul: 2.5 },
  { g:'🏆', name:'TROPHY',   tripleMul: 10, pairMul: 2.0 },
  { g:'⭐', name:'STAR',     tripleMul: 6,  pairMul: 1.8 },
  { g:'🔥', name:'FIRE',     tripleMul: 4,  pairMul: 1.6 },
  { g:'🪙', name:'COIN',     tripleMul: 3,  pairMul: 1.4 },
  { g:'⛏️', name:'PICK',     tripleMul: 2,  pairMul: 1.2 },
] as const

const REEL_VISUAL_SIZE = 160
const SPIN_MS_MIN = 2600
const SPIN_MS_MAX = 4200

export default function SlotsGame() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  /* Bounds */
  const minStakeQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'minStake',
    enabled: mounted,
    watch: true,
  })
  const maxStakeQ = useContractRead({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'maxStake',
    enabled: mounted,
    watch: true,
  })
  const minStake: bigint = typeof minStakeQ.data === 'bigint' ? minStakeQ.data : parseUnits('1',18)
  const maxStake: bigint = typeof maxStakeQ.data === 'bigint' ? maxStakeQ.data : parseUnits('5',18)
  const minB = Number(formatUnits(minStake,18))
  const maxB = Number(formatUnits(maxStake,18))
  const outOfBounds = bet < minB || bet > maxB

  /* Balance & allowance (no undefined args; bigint coercion) */
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
    enabled: mounted && Boolean(address && isAddress(BGLD) && isAddress(CASINO)),
    watch: true,
  })
  const allowance: bigint = typeof allowRaw === 'bigint' ? allowRaw : 0n
  const hasAllowance = allowance >= stakeWei

  /* Approve */
  const { write: approve, data: approveTx, isLoading: approving } =
    useContractWrite({ address: BGLD, abi: ERC20_ABI, functionName: 'approve' })
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })

  /* Place bet */
  const { write: play, data: playTx, isLoading: placing, error: playErr } =
    useContractWrite({ address: CASINO, abi: (Casino as any).abi, functionName: 'playSlots' as const })
  const playWait = useWaitForTransaction({ hash: (playTx as any)?.hash })

  /* Seed */
  const seed = useMemo(
    () => (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9)),
    [bet]
  )

  /* Reels + UI */
  const [reels, setReels] = useState<number[]>([0, 2, 4])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ text: string; mul: number } | null>(null)
  const [payout, setPayout] = useState<number>(0)
  const [banner, setBanner] = useState<string>('')

  /* Session P&L (client-side clarity) */
  const [sessionPnL, setSessionPnL] = useState(0)

  /* After approve confirmed, refresh */
  useEffect(() => {
    if (approveWait.isSuccess) {
      refetchAllow()
      refetchBal()
    }
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  /* After bet confirmed on-chain, precompute landing & refresh */
  useEffect(() => {
    if (!playWait.isSuccess) return
    const h = (playTx as any)?.hash as `0x${string}`
    if (!h) return
    const n = (i:number) => Number((BigInt(h) >> BigInt(i*10)) % BigInt(SYMBOLS.length))
    const land = [n(0), n(1), n(2)]
    setReels(land)
    setResult({ text: 'Bet confirmed. Ready to spin.', mul: 0 })
    setBanner('')
    setPayout(0)

    // refresh balance/allowance (on-chain changed)
    refetchBal()
    refetchAllow()
    setTimeout(() => { refetchBal(); refetchAllow() }, 800)
  }, [playWait.isSuccess, playTx, refetchBal, refetchAllow])

  const spinNow = async () => {
    if (!playWait.isSuccess || spinning) return
    setSpinning(true)
    setBanner('')
    setResult(null)
    setPayout(0)

    const target = reels.slice()
    const dur1 = randBetween(SPIN_MS_MIN, SPIN_MS_MAX)
    const dur2 = dur1 + randBetween(220, 520)
    const dur3 = dur2 + randBetween(220, 520)

    await Promise.all([
      spinReel(0, dur1, target[0], setReels),
      spinReel(1, dur2, target[1], setReels),
      spinReel(2, dur3, target[2], setReels),
    ])

    // compute visual payout
    const [a,b,c] = target
    const triple = (a===b && b===c)
    const pair   = (!triple && (a===b || b===c))
    let mul = 0
    if (triple) mul = SYMBOLS[a].tripleMul
    else if (pair) mul = SYMBOLS[(a===b)?a:b].pairMul

    if (mul > 0) {
      const won = +(bet * mul).toFixed(2)
      setPayout(won)
      setBanner(mul >= 10 ? 'JACKPOT!' : 'WIN!')
      setResult({ text: `×${mul.toFixed(2)}  •  +${won} BGLD`, mul })
      setSessionPnL(s => s + won - bet)
    } else {
      setBanner('')
      setResult({ text: 'No line.', mul: 0 })
      setSessionPnL(s => s - bet)
    }
    setSpinning(false)

    refetchBal()
    setTimeout(() => { refetchBal(); refetchAllow() }, 500)
  }

  const onApprove = () => approve?.({ args: [CASINO, maxUint256] as const })

  const canConfirm = !!address && hasAllowance && !placing && !outOfBounds && balance >= bet
  const canSpin = playWait.isSuccess && !spinning

  return (
    <div className="grid md:grid-cols-[minmax(360px,1fr)_380px] gap-6 items-start">
      {/* LEFT — Machine */}
      <div className="rounded-[22px] relative p-[14px] bg-gradient-to-br from-[#262833] via-[#10121a] to-[#0a0c12] shadow-2xl border border-white/10">
        <div className="absolute inset-0 rounded-[22px] pointer-events-none ring-1 ring-white/10" />
        <div className="absolute -inset-[2px] rounded-[24px] pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-20" />

        <div className="mb-3 flex items-center justify-between px-2">
          <div className="text-lg font-extrabold tracking-wide">
            <span className="text-[#FFD700] drop-shadow">GOLD RUSH SLOTS</span>
          </div>
          <div className="text-[11px] text-white/60">1 payline • triples & pairs pay</div>
        </div>

        <div className="relative rounded-[18px] overflow-hidden border border-white/10 bg-[#05060a]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_-10%,rgba(255,255,255,0.2),transparent_55%)]" />
          <div className="grid grid-cols-3 gap-2 p-3">
            {[0,1,2].map(i=>(
              <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 bg-[linear-gradient(180deg,#0b0e14_0%,#0e111a_100%)]">
                <div className={`transition-[filter] ${spinning ? 'blur-[2px]' : 'blur-0'}`} style={{ height: REEL_VISUAL_SIZE }}>
                  <ReelCell symbol={SYMBOLS[reels[i]].g} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#FFD700]/40" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 h-10 flex items-center justify-center">
          {banner && (
            <div className="px-4 py-1 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/15 text-[#FFD700] font-extrabold tracking-wide">
              {banner}
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Meter label="PAYOUT" value={mounted ? `${payout.toLocaleString()} BGLD` : '…'} primary />
          <Meter label="LAST RESULT" value={result?.text ?? (playWait.isLoading ? 'Resolving…' : '—')} />
          <Meter label="BALANCE" value={mounted ? `${balance.toLocaleString()} BGLD` : '…'} />
        </div>

        {/* Session PnL + manual refresh */}
        <div className="mt-2 flex items-center justify-between">
          <div className={`text-sm font-semibold ${sessionPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Session P&L: {sessionPnL >= 0 ? '+' : ''}{sessionPnL.toLocaleString()} BGLD
          </div>
          <button onClick={()=>{ refetchBal(); refetchAllow(); }} className="text-xs text-white/60 hover:text-white">
            Refresh ↻
          </button>
        </div>
      </div>

      {/* RIGHT — Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-bold text-white/90">Controls</div>

        <div className="mt-3">
          <div className="text-sm text-white/70">Stake (BGLD)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(v=>{
              const disabled = mounted && (v<minB || v>maxB)
              return (
                <button
                  key={v}
                  onClick={()=>!disabled && setBet(v)}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border',
                    bet===v ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]' : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                    disabled ? 'opacity-40 cursor-not-allowed':''
                  ].join(' ')}
                  disabled={disabled}
                >
                  {v}
                </button>
              )
            })}
          </div>
          {mounted && outOfBounds && (
            <div className="mt-1 text-xs text-rose-400">Bet must be between {minB} and {maxB} BGLD.</div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {!hasAllowance ? (
            <button className="w-full btn-cyan" onClick={onApprove} disabled={!mounted || approving || approveWait.isLoading}>
              {!mounted ? '…' : (approving || approveWait.isLoading ? 'Confirming…' : 'Approve BGLD')}
            </button>
          ) : (
            <>
              <button
                className="w-full btn-gold"
                disabled={!mounted || !(!outOfBounds && !!address && balance >= bet && !placing)}
                onClick={() => play?.({ args: [stakeWei, seed] as const })}
              >
                {!mounted ? '…' : (placing || playWait.isLoading ? 'Confirming…' : 'Confirm Bet')}
              </button>
              <button className="w-full btn-dim" disabled={!mounted || !canSpin} onClick={spinNow}>
                {spinning ? 'Spinning…' : 'Spin'}
              </button>
            </>
          )}
          {playErr && (
            <div className="text-xs text-rose-400">
              {(playErr as any)?.shortMessage || String(playErr)}
            </div>
          )}
        </div>

        {/* Paytable */}
        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-sm font-semibold text-white/90 mb-2">Paytable</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {SYMBOLS.map((s,i)=>(
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.g}</span>
                  <span className="text-white/70">{s.name}</span>
                </div>
                <div className="text-right text-white/80">
                  <div>Triple: <b className="text-[#FFD700]">{s.tripleMul}×</b></div>
                  <div className="text-white/60">Pair: {s.pairMul}×</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-white/50">Visual payouts shown for clarity. Smart contract enforces actual results.</div>
        </div>
      </div>
    </div>
  )
}

/* -------- UI bits -------- */

function Meter({ label, value, primary=false }: {label:string; value:string; primary?:boolean}) {
  return (
    <div className={[
      'rounded-xl border p-3',
      primary ? 'border-[#FFD700]/50 bg-[#FFD700]/10' : 'border-white/10 bg-black/40'
    ].join(' ')}>
      <div className={primary ? 'text-[#FFD700] text-[11px]' : 'text-white/60 text-[11px]'}>{label}</div>
      <div className={primary ? 'text-[#FFD700] text-lg font-extrabold' : 'text-white font-semibold'}>
        {value}
      </div>
    </div>
  )
}

function ReelCell({ symbol }: { symbol: string }) {
  return (
    <div className="flex h-full items-center justify-center text-6xl md:text-7xl select-none
                    bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.06),transparent_45%)]">
      <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">{symbol}</span>
    </div>
  )
}

/* easing/helpers */
function easeOutCubic(x:number){ return 1 - Math.pow(1 - x, 3) }
function randBetween(a:number,b:number){ return Math.floor(Math.random()*(b-a+1))+a }
function spinReel(idx:number, ms:number, landIndex:number, setReels:(fn:(r:number[])=>number[])=>void){
  return new Promise<void>((resolve) => {
    const start = performance.now()
    const tick = (t:number) => {
      const p = Math.min(1, (t - start) / ms)
      const speed = 1 - easeOutCubic(p)
      setReels(prev => {
        const next = prev.slice()
        next[idx] = Math.floor((prev[idx] + 1 + Math.round(speed*3)) % SYMBOLS.length)
        return next
      })
      if (p < 1) requestAnimationFrame(tick)
      else {
        setReels(prev => { const next = prev.slice(); next[idx] = landIndex; return next })
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}
