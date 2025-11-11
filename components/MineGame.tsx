'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseUnits, formatUnits, isAddress } from 'viem'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'
import ProspectorMap from '@/components/ProspectorMap'
import HeatMeter from '@/components/HeatMeter'
import ToolToggles, { Tool } from '@/components/ToolToggles'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD  = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`

// DEMO: $1 ≈ 1 BGLD
const BGLD_PER_USD = 1
const ENTRY_OPTIONS = [1, 3, 5] // $1–$5

type PlayResult = {
  win: boolean
  payout: number // BGLD returned (0 if miss)
  stake: number  // BGLD staked
  jackpot?: 'motherlode' | 'lucky' | 'quick'
}

const TOOL_RULES: Record<Tool, { label: string; hit: number; mults: number[]; note: string }> = {
  pan:      { label: 'Pan',      hit: 0.45, mults: [1.02, 1.05, 1.1], note: 'more hits • small wins' },
  shovel:   { label: 'Shovel',   hit: 0.38, mults: [1.1, 1.25, 1.5],  note: 'balanced odds & payouts' },
  dynamite: { label: 'Dynamite', hit: 0.28, mults: [1.6, 2.0, 3.0],   note: 'rare hits • big multipliers' },
}

export default function MineGame() {
  const { address } = useAccount()

  // UI state
  const [tier, setTier] = useState<number>(ENTRY_OPTIONS[0])
  const [tile, setTile] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool>('shovel')
  const [phase, setPhase] = useState<'idle'|'pending'|'revealing'|'done'>('idle')
  const [result, setResult] = useState<PlayResult | null>(null)
  const [streak, setStreak] = useState(0)
  const [sessionDelta, setSessionDelta] = useState(0)
  const sessionCaptured = useRef(false)

  // stake
  const stakeBgld = useMemo(() => tier * BGLD_PER_USD, [tier])
  const stakeWei  = useMemo(() => parseUnits(String(stakeBgld), 18), [stakeBgld])

  // seed (front-end only for reveal pacing)
  const seed = useMemo(() => {
    const a = (BigInt(Date.now()) << 64n)
    const b = BigInt(Math.floor(Math.random() * 1e9))
    return (a ^ b)
  }, [phase])

  // reads
  const { data: balRaw } = useContractRead({
    address: BGLD,
    abi: [{ type:'function', name:'balanceOf', stateMutability:'view', inputs:[{name:'a',type:'address'}], outputs:[{type:'uint256'}] }] as const,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && isAddress(BGLD),
    watch: true,
  })
  const balance = Number(formatUnits((balRaw as any) ?? 0n, 18))

  const { data: allowanceRaw } = useContractRead({
    address: BGLD,
    abi: [{ type:'function', name:'allowance', stateMutability:'view', inputs:[{name:'o',type:'address'},{name:'s',type:'address'}], outputs:[{type:'uint256'}] }] as const,
    functionName: 'allowance',
    args: address ? [address, CASINO] : undefined,
    enabled: !!address && isAddress(BGLD) && isAddress(CASINO),
    watch: true,
  })
  const allowance = Number(formatUnits((allowanceRaw as any) ?? 0n, 18))

  // capture starting point for session delta exactly once
  useEffect(() => {
    if (!sessionCaptured.current && balance >= 0) {
      sessionCaptured.current = true
      // baseline is 0; we show net since the first render
      setSessionDelta(0)
    }
  }, [balance])

  // writes
  const { write: approveWrite, data: approveData, isLoading: approveLoading, error: approveError } = useContractWrite({
    address: BGLD,
    abi: [{ type:'function', name:'approve', stateMutability:'nonpayable', inputs:[{name:'spender',type:'address'},{name:'amount',type:'uint256'}], outputs:[{type:'bool'}]}] as const,
    functionName: 'approve',
  })
  const waitApprove = useWaitForTransaction({ hash: (approveData as any)?.hash })

  const { write: playWrite, data: playData, isLoading: playLoading, error: playError } = useContractWrite({
    address: CASINO,
    abi: (Casino as any).abi,
    functionName: 'playMine',
  })
  const waitPlay = useWaitForTransaction({ hash: (playData as any)?.hash })

  function ensureAllowanceThenPlay() {
    if (!address) return
    if (allowance < stakeBgld) {
      // approve max once; subsequent plays use existing allowance
      approveWrite?.({
        args: [CASINO, parseUnits('115792089237316195423570985008687907853269984665640564039457', 0)],
      })
      setPhase('pending')
    } else {
      doPlay()
    }
  }

  useEffect(() => {
    if (waitApprove.isSuccess) doPlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitApprove.isSuccess])

  function doPlay() {
    if (!address || !playWrite) return
    setResult(null)
    setPhase('pending')
    window.dispatchEvent(new CustomEvent('bgld:play')) // HeatMeter ping
    playWrite?.({ args: [stakeWei, seed] as const })
  }

  // demo reveal (UX only)
  useEffect(() => {
    if (!waitPlay.isSuccess || !(playData as any)?.hash) return
    setPhase('revealing')

    const rules = TOOL_RULES[tool]
    const hit = Math.random() < rules.hit
    const mult = hit ? rules.mults[Math.floor(Math.random() * rules.mults.length)] : 0
    const payout = hit ? Math.round(stakeBgld * mult) : 0
    const jackpot = hit && Math.random() < 0.05
      ? (['motherlode','lucky','quick'][Math.floor(Math.random()*3)] as PlayResult['jackpot'])
      : undefined

    const t = setTimeout(() => {
      const res: PlayResult = { win: hit, payout, stake: stakeBgld, jackpot }
      setResult(res)
      setPhase('done')
      setSessionDelta(d => d + (payout - stakeBgld))
      setStreak(s => hit ? s + 1 : 0)
    }, tool === 'dynamite' ? 550 : 850)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitPlay.isSuccess])

  const disabled = approveLoading || playLoading || phase === 'revealing' || !address
  const actionLabel =
    playLoading ? 'Submitting…'
    : phase === 'revealing' ? (tool === 'dynamite' ? 'Detonating…' : 'Revealing…')
    : tool === 'pan' ? 'Pan the Vein'
    : tool === 'dynamite' ? 'Light the Fuse'
    : 'Swing the Pickaxe'

  return (
    <div className="card border-white/10 p-4 md:p-5">
      {/* Top strip: how-to + quick stats (tight) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-white/80">
          <span className="font-bold text-[#FFD700]">How to Play: </span>
          Pick an <b>Entry</b>, choose a <b>Tool</b> (<span className="text-white/70">Pan more hits / small wins • Shovel balanced • Dynamite big wins / rare hits</span>),
          click the <b>Map</b>, then press <b>Play</b>. On-chain result is final. $1 → {BGLD_PER_USD} BGLD.
        </div>
        <div className="text-xs text-right text-white/60">
          Bal:&nbsp;<span className="text-white">{Math.floor(balance).toLocaleString()}</span> BGLD
          <span className="mx-2 opacity-30">•</span>
          Session:&nbsp;
          <span className={sessionDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {sessionDelta >= 0 ? '+' : ''}{sessionDelta.toLocaleString()} BGLD
          </span>
        </div>
      </div>

      {/* One compact grid: LEFT (map+controls) • RIGHT (outcome+play) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Map + Tools + Entry */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-[#FFD700]">Mine the Ridge</div>
            <div className="text-[11px] text-white/50">Streak: <span className="text-white">{streak}</span></div>
          </div>

          {/* Map (reduced height / tight) */}
          <div className="rounded-xl border border-yellow-400/20 overflow-hidden bg-[#1a1510]">
            <ProspectorMap selected={tile} onSelect={setTile} />
          </div>

          {/* Tools */}
          <ToolToggles value={tool} onChange={setTool} />
          <HeatMeter />

          {/* Entry buttons + stake line (tight) */}
          <div className="grid grid-cols-3 gap-2">
            {ENTRY_OPTIONS.map(v => (
              <button
                key={v}
                onClick={() => setTier(v)}
                className={`rounded-xl px-3 py-2 border text-sm font-semibold ${
                  tier === v
                    ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <div className="text-xs text-white/60">
            Stake: <span className="text-white">{stakeBgld.toLocaleString()}</span> BGLD
            {tile !== null && <span className="ml-2 text-white/50">• Site #{tile + 1}</span>}
            <span className="ml-2 text-white/50">• {TOOL_RULES[tool].label} • ~{Math.round(TOOL_RULES[tool].hit*100)}% hit</span>
          </div>
        </div>

        {/* RIGHT: Outcome + Play button (no scrolling to see it) */}
        <div className="flex flex-col h-full">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex-1">
            <div className="text-base font-semibold text-white/90">Outcome</div>

            {phase === 'revealing' && (
              <div className="mt-3 animate-pulse text-white/70">Scanning the vein…</div>
            )}

            {!result && phase !== 'revealing' && (
              <div className="mt-3 text-white/60 text-sm">
                Pick a site and tool, then play to reveal your haul.
              </div>
            )}

            {result && (
              <div className="mt-3 space-y-2">
                <div className={`text-xl font-extrabold ${result.win ? 'text-[#FFD700]' : 'text-white/70'}`}>
                  {result.win ? 'You struck gold!' : 'Dry pocket…'}
                </div>
                <div className="text-sm text-white/80">
                  Stake:&nbsp;<span className="text-white">{result.stake.toLocaleString()} BGLD</span>
                </div>
                <div className="text-sm text-white/80">
                  Payout:&nbsp;
                  <span className={result.payout > 0 ? 'text-emerald-400' : 'text-white/70'}>
                    {result.payout.toLocaleString()} BGLD
                  </span>
                </div>
                <div className="text-sm">
                  P/L:&nbsp;
                  <span className={(result.payout - result.stake) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {(result.payout - result.stake) >= 0 ? '+' : ''}{(result.payout - result.stake).toLocaleString()} BGLD
                  </span>
                </div>
                {result.jackpot && (
                  <div className="mt-1 text-[#FFD700] font-semibold">
                    JACKPOT HIT: {result.jackpot.toUpperCase()}!
                  </div>
                )}

                <div className="pt-2 text-[11px] text-white/50">
                  Demo odds/mults affect the reveal animation only; on-chain result is the source of truth.
                </div>
              </div>
            )}
          </div>

          <div className="mt-3">
            <button
              onClick={ensureAllowanceThenPlay}
              disabled={disabled}
              className={`btn-gold w-full py-3 rounded-2xl font-extrabold ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {actionLabel}
            </button>
            {!address && (
              <div className="mt-2 text-center text-xs text-white/60">
                Connect wallet to play
              </div>
            )}
            {(approveError || playError) && (
              <div className="text-xs text-red-400 mt-2">
                {((approveError as any)?.shortMessage || (playError as any)?.shortMessage) ??
                  String(approveError || playError)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
