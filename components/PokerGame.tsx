'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
  useBlockNumber,
} from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress } from 'viem'
import Casino from '@/abis/BaseGoldCasino.json'

/* -------- Minimal ERC20 ABI -------- */
const ERC20_ABI = [
  { type:'function', name:'balanceOf', stateMutability:'view', inputs:[{name:'owner',type:'address'}], outputs:[{name:'',type:'uint256'}] },
  { type:'function', name:'allowance', stateMutability:'view', inputs:[{name:'owner',type:'address'},{name:'spender',type:'address'}], outputs:[{name:'',type:'uint256'}] },
  { type:'function', name:'approve',   stateMutability:'nonpayable', inputs:[{name:'spender',type:'address'},{name:'amount',type:'uint256'}], outputs:[{name:'',type:'bool'}] },
] as const

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const BGLD  = (process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress

/* -------- helpers -------- */
const toBigInt = (v: unknown, fallback: bigint = 0n) => (typeof v === 'bigint' ? v : fallback)
const fmtBGLD  = (wei: bigint, digits = 4) => Number(formatUnits(wei, 18)).toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: digits,
})

type Card = { r: number; s: number } // r: 2..14 (Ace=14), s: 0..3 (♠♥♦♣)
const rankChar = (r:number)=> r<=10?String(r):r===11?'J':r===12?'Q':r===13?'K':'A'
const suitChar = (s:number)=> ['♠','♥','♦','♣'][s]
const isRed = (s:number)=> s===1 || s===2  // ♥ ♦

/* ---- Jacks or Better paytable (integer multipliers → exact wei math) ---- */
const PAYTABLE: { name:string; mul:number; test:(c:Card[])=>boolean }[] = [
  { name:'Royal Flush',     mul:250, test:c=>isStraightFlush(c)&&highCard(c)===14&&lowCard(c)===10 },
  { name:'Straight Flush',  mul:50,  test:c=>isStraightFlush(c)&&!(highCard(c)===14&&lowCard(c)===10) },
  { name:'Four of a Kind',  mul:25,  test:c=>hasKind(c,4) },
  { name:'Full House',      mul:9,   test:c=>isFullHouse(c) },
  { name:'Flush',           mul:6,   test:c=>isFlush(c) },
  { name:'Straight',        mul:4,   test:c=>isStraight(c) },
  { name:'Three of a Kind', mul:3,   test:c=>hasKind(c,3)&&!isFullHouse(c) },
  { name:'Two Pair',        mul:2,   test:c=>twoPair(c) },
  { name:'Jacks or Better', mul:1,   test:c=>jacksOrBetter(c) },
]
function countsByRank(c:Card[]){ const m=new Map<number,number>(); for(const x of c) m.set(x.r,(m.get(x.r)||0)+1); return m }
function isFlush(c:Card[]){ return c.every(x=>x.s===c[0].s) }
function isStraight(c:Card[]){
  const rs=[...new Set(c.map(x=>x.r))].sort((a,b)=>a-b)
  if(rs.length!==5) return false
  let seq=true; for(let i=1;i<5;i++) if(rs[i]!==rs[i-1]+1){seq=false;break}
  const wheel=[2,3,4,5,14]; const wheelOK=rs.every((v,i)=>v===wheel[i])
  return seq||wheelOK
}
function isStraightFlush(c:Card[]){ return isFlush(c)&&isStraight(c) }
function hasKind(c:Card[],n:number){ for(const v of countsByRank(c).values()) if(v===n) return true; return false }
function isFullHouse(c:Card[]){ const v=[...countsByRank(c).values()].sort((a,b)=>b-a); return v[0]===3&&v[1]===2 }
function twoPair(c:Card[]){ return [...countsByRank(c).values()].filter(x=>x===2).length===2 }
function jacksOrBetter(c:Card[]){ for(const [r,cnt] of countsByRank(c)) if(cnt===2 && r>=11) return true; return false }
function highCard(c:Card[]){ return Math.max(...c.map(x=>x.r)) }
function lowCard(c:Card[]){ return Math.min(...c.map(x=>x.r)) }
function evaluate(c:Card[]){ for(const row of PAYTABLE) if(row.test(c)) return {name:row.name, mul:row.mul}; return {name:'No Win', mul:0} }

/* Deck from tx hash (deterministic for client viz) */
function buildDeckFromHash(tx:`0x${string}`): Card[] {
  let seed = BigInt(tx)
  const next = () => { seed = (seed * 1103515245n + 12345n) & ((1n<<61n)-1n); return Number(seed % 0x1_0000n) }
  const cards: Card[]=[]; const seen=new Set<number>()
  while(cards.length<52){
    const v=next()
    const r = 2 + (v % 13)        // 2..14
    const s = Math.floor(v/13)%4  // 0..3
    const key=(r<<3)+s
    if(!seen.has(key)){ seen.add(key); cards.push({r,s}) }
  }
  return cards
}

/* ---------------- Component ---------------- */
export default function PokerGame(){
  const { address } = useAccount()
  const [mounted,setMounted]=useState(false)
  useEffect(()=>setMounted(true),[])

  /* Stake (1..5, contract bounds) */
  const [bet,setBet]=useState(1)
  const stakeWei = useMemo(()=>parseUnits(String(bet),18),[bet])

  const minQ = useContractRead({ address:CASINO, abi:(Casino as any).abi, functionName:'minStake', enabled:mounted, watch:true })
  const maxQ = useContractRead({ address:CASINO, abi:(Casino as any).abi, functionName:'maxStake', enabled:mounted, watch:true })
  const minStake = toBigInt(minQ.data, parseUnits('1',18))
  const maxStake = toBigInt(maxQ.data, parseUnits('5',18))
  const minB = Number(formatUnits(minStake,18))
  const maxB = Number(formatUnits(maxStake,18))
  const outOfBounds = bet<minB || bet>maxB

  /* Balance & allowance (watch + refetch) */
  const { data: balRaw, refetch: refetchBal } = useContractRead({
    address:BGLD, abi:ERC20_ABI, functionName:'balanceOf',
    args: address?[address]:undefined, enabled:!!address && mounted, watch:true,
  })
  const balanceWei = toBigInt(balRaw, 0n)

  const { data: allowRaw, refetch: refetchAllow } = useContractRead({
    address:BGLD, abi:ERC20_ABI, functionName:'allowance',
    args: address?[address,CASINO]:undefined, enabled:!!address && mounted, watch:true,
  })
  const allowance = toBigInt(allowRaw, 0n)
  const hasAllowance = allowance >= stakeWei

  /* Keep values honest on new blocks */
  useBlockNumber({
    watch:true, enabled:!!address && mounted,
    onBlock(){ refetchBal(); refetchAllow() }
  })

  /* Approve */
  const { write: approve, data: approveTx, isLoading: approving } =
    useContractWrite({ address:BGLD, abi:ERC20_ABI, functionName:'approve' })
  const approveWait = useWaitForTransaction({ hash:(approveTx as any)?.hash })
  useEffect(()=>{ if(approveWait.isSuccess){ refetchAllow(); refetchBal() } },[approveWait.isSuccess,refetchAllow,refetchBal])
  const onApprove = ()=> approve?.({ args:[CASINO, maxUint256] as const })

  /* Confirm Bet (carrier uses playPan for now) */
  const seed = useMemo(()=> (BigInt(Date.now())<<64n) ^ BigInt(Math.floor(Math.random()*1e9)), [bet])
  const { write: play, data: playTx, isLoading: placing, error: playErr } =
    useContractWrite({ address:CASINO, abi:(Casino as any).abi, functionName:'playPan' as any })
  const playWait = useWaitForTransaction({ hash:(playTx as any)?.hash })

  /* Game state */
  type Phase = 'idle'|'deal-ready'|'holding'|'drawn'
  const [phase,setPhase]=useState<Phase>('idle')
  const [deck,setDeck]=useState<Card[]>([])
  const [hand,setHand]=useState<Card[]>([])
  const [holds,setHolds]=useState<boolean[]>([false,false,false,false,false])
  const [result,setResult]=useState<{name:string; mul:number}|null>(null)

  /* Exact accounting (wei) */
  const [sessionPnLWei,setSessionPnLWei]=useState<bigint>(0n)
  const [lastBetWei,setLastBetWei]=useState<bigint>(0n)
  const [lastWinWei,setLastWinWei]=useState<bigint>(0n)

  /* After bet mined → (1) record stake debit, (2) deal initial 5 */
  useEffect(()=>{
    if(!playWait.isSuccess) return
    const tx = (playTx as any)?.hash as `0x${string}` | undefined
    if(!tx) return
    // 1) debit stake from session P&L view immediately on confirm
    setSessionPnLWei(s=>s - stakeWei)
    setLastBetWei(stakeWei)
    setLastWinWei(0n)
    // 2) build deck from tx & deal
    const d = buildDeckFromHash(tx)
    setHand(d.slice(0,5))
    setDeck(d.slice(5))
    setHolds([false,false,false,false,false])
    setResult(null)
    setPhase('deal-ready')
    // refresh wallet views
    refetchBal(); refetchAllow()
    setTimeout(()=>{ refetchBal(); refetchAllow() }, 800)
  },[playWait.isSuccess, playTx, stakeWei, refetchBal, refetchAllow])

  /* Interactions */
  const onToggleHold=(i:number)=>{
    if(phase!=='deal-ready' && phase!=='holding') return
    setHolds(prev=>{ const n=prev.slice(); n[i]=!n[i]; return n })
    setPhase('holding')
  }
  const onDraw=()=>{
    if(phase!=='deal-ready' && phase!=='holding') return
    const take=[...deck]
    const newHand=hand.map((c,i)=> holds[i]?c:take.shift()!)
    const ev=evaluate(newHand)
    setHand(newHand); setDeck(take); setResult(ev); setPhase('drawn')
    // winnings (exact wei) credited to session P&L view
    const winningsWei = BigInt(ev.mul) * lastBetWei
    setLastWinWei(winningsWei)
    setSessionPnLWei(s=>s + winningsWei)
    setTimeout(()=>{ refetchBal(); refetchAllow() }, 500)
  }

  const canConfirm = !!address && mounted && hasAllowance && !placing && !outOfBounds && balanceWei >= stakeWei
  const onConfirmBet = ()=> play?.({ args:[stakeWei, seed] as const })

  /* ---- UI ---- */
  return (
    <div className="grid md:grid-cols-[minmax(360px,1fr)_380px] gap-6 items-start">
      {/* LEFT — Table + Cards */}
      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0a0b10,#0d1118)] p-4 relative">
        <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-white/10" />
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-extrabold tracking-wide">
            <span className="text-[#FFD700] drop-shadow">BGLD VIDEO POKER</span>
          </div>
          <div className="text-[11px] text-white/60">Jacks or Better</div>
        </div>

        {/* How-to */}
        <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="text-sm font-semibold text-white">How to Play</div>
          <div className="text-xs text-white/70">
            Pick stake → <b>Confirm Bet (Deal)</b> → tap cards to <b>HOLD</b> → <b>Draw</b>. Payouts on right. 
            <span className="opacity-60"> (Demo payouts; carrier bet only on-chain until payout fn is wired.)</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {hand.length ? hand.map((c,i)=>(
            <PlayingCard key={i} c={c} held={holds[i]} onToggle={()=>onToggleHold(i)} interactive={phase==='deal-ready'||phase==='holding'} />
          )) : [0,1,2,3,4].map(i=><CardSkeleton key={i}/>)}
        </div>

        {/* Result banner */}
        <div className="mt-4 h-10 flex items-center justify-center">
          {result ? (
            <div className={`px-4 py-1 rounded-full border ${result.mul>0?'border-[#FFD700]/40 bg-[#FFD700]/15 text-[#FFD700] font-extrabold':'border-white/10 bg-white/5 text-white/70'}`}>
              {result.name}{result.mul>0?` • ×${result.mul}`:''}
            </div>
          ) : <div className="text-white/50 text-sm">{(phase==='drawn')?'—':'Ready'}</div>}
        </div>

        {/* Session accounting (exact) */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <KV title="Last Bet" value={`${fmtBGLD(lastBetWei)} BGLD`} />
          <KV title="Winnings" value={`${fmtBGLD(lastWinWei)} BGLD`} />
          <KV title="Session P&L" value={`${sessionPnLWei>=0n?'+':''}${fmtBGLD(sessionPnLWei)} BGLD`} accent={sessionPnLWei>=0n?'pos':'neg'} />
        </div>
      </div>

      {/* RIGHT — Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-bold text-white/90">Controls</div>

        {/* Stake */}
        <div className="mt-3">
          <div className="text-sm text-white/70">Stake (BGLD)</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(v=>{
              const dis = mounted && (v<minB || v>maxB) || phase==='deal-ready' || phase==='holding'
              return (
                <button
                  key={v}
                  onClick={()=>!dis && setBet(v)}
                  className={[
                    'rounded-lg px-3 py-2 text-sm font-semibold border',
                    bet===v ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]' : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                    dis ? 'opacity-40 cursor-not-allowed':''
                  ].join(' ')}
                  disabled={dis}
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

        {/* Balance / Approval */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Wallet Balance</div>
            <div className="text-white font-semibold">
              {mounted ? `${fmtBGLD(balanceWei)} BGLD` : '…'}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-white/60">Approval</div>
            <div className="text-white font-semibold">{!mounted ? '…' : hasAllowance ? '∞' : 'Not approved'}</div>
          </div>
        </div>

        {/* Actions — hydration-safe labels */}
        <div className="mt-4 space-y-2">
          {!hasAllowance ? (
            <button className="w-full btn-cyan" onClick={onApprove} disabled={!mounted || approving || approveWait.isLoading}>
              {mounted ? (approving || approveWait.isLoading ? 'Confirming…' : 'Approve BGLD') : '…'}
            </button>
          ) : (
            <>
              <button className="w-full btn-gold" disabled={!mounted || !canConfirm || phase==='deal-ready' || phase==='holding'} onClick={onConfirmBet}>
                {mounted ? (placing || playWait.isLoading ? 'Confirming…' : 'Confirm Bet (Deal)') : '…'}
              </button>
              <button className="w-full btn-dim" disabled={!mounted || !(phase==='deal-ready'||phase==='holding')} onClick={onDraw}>
                {mounted ? 'Draw' : '…'}
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
          <div className="text-sm font-semibold text-white/90 mb-2">Paytable — Jacks or Better</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {PAYTABLE.map((row,i)=>(
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
                <div className="text-white/70">{row.name}</div>
                <div className="text-[#FFD700] font-semibold">×{row.mul}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------- Small UI bits -------- */

function KV({ title, value, accent }:{title:string; value:string; accent?:'pos'|'neg'}) {
  const tint = accent==='pos' ? 'text-emerald-400' : accent==='neg' ? 'text-rose-400' : 'text-white'
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
      <div className="text-white/60">{title}</div>
      <div className={`font-semibold ${tint}`}>{value}</div>
    </div>
  )
}

/* -------- Card visuals (bright HOLD & glow) -------- */

function PlayingCard({ c, held, onToggle, interactive }:{
  c: Card; held: boolean; onToggle: ()=>void; interactive: boolean
}){
  const suit = suitChar(c.s)
  const rank = rankChar(c.r)
  const red  = isRed(c.s)

  return (
    <button
      onClick={onToggle}
      disabled={!interactive}
      className={[
        'relative w-full aspect-[64/89] rounded-[14px] border overflow-hidden',
        'shadow-[0_8px_26px_rgba(0,0,0,0.45)]',
        held ? 'border-[#FFD700]/80 ring-2 ring-[#FFD700]/70 ring-offset-2 ring-offset-black/40' : 'border-black/20',
        interactive ? 'hover:-translate-y-[2px] transition-transform' : 'opacity-80',
        'bg-white'
      ].join(' ')}
    >
      {/* subtle paper & frame */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(180% 120% at 50% 0%, rgba(0,0,0,0.06), transparent 55%), ' +
            'repeating-linear-gradient(135deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 6px)'
        }}
      />
      <div className="absolute inset-[6px] rounded-[10px] border border-black/10 pointer-events-none" />

      {/* top-left rank/suit */}
      <div className={`absolute top-2 left-2 text-[14px] font-extrabold ${red?'text-red-600':'text-black'}`}>
        {rank}
        <div className="text-[12px] opacity-80 leading-none">{suit}</div>
      </div>

      {/* bottom-right rank/suit (rotated) */}
      <div className={`absolute bottom-2 right-2 rotate-180 text-[14px] font-extrabold ${red?'text-red-600':'text-black'}`}>
        {rank}
        <div className="text-[12px] opacity-80 leading-none">{suit}</div>
      </div>

      {/* center suit */}
      <div className={`absolute inset-0 flex items-center justify-center ${red?'text-red-500':'text-black'}`}>
        <div className="text-5xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">{suit}</div>
      </div>

      {/* HOLD banner */}
      <div className="absolute inset-x-0 bottom-0 h-7">
        <div className={[
          'mx-auto w-[86%] h-7 rounded-md text-center text-[12px] font-extrabold tracking-wide',
          held ? 'bg-[#FFD700] text-black shadow-[0_0_22px_rgba(255,215,0,0.75)]' : 'bg-transparent text-transparent'
        ].join(' ')}>
          {held ? 'HOLD' : 'HOLD'}
        </div>
      </div>
    </button>
  )
}

function CardSkeleton(){
  return (
    <div className="w-full aspect-[64/89] rounded-[14px] border border-white/10 bg-white/10 animate-pulse" />
  )
}
