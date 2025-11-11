'use client'

import { useEffect, useState } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress } from 'viem'

/** ENV */
const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}` | undefined
const BGLD   = (process.env.NEXT_PUBLIC_BGLD_CA   as `0x${string}`) || zeroAddress
const ONCHAIN = String(process.env.NEXT_PUBLIC_POKER_ONCHAIN || '').toLowerCase() === 'true'

/** Minimal ABIs */
const ERC20_ABI = [
  { type:'function', name:'balanceOf', stateMutability:'view', inputs:[{name:'account', type:'address'}], outputs:[{type:'uint256'}]},
  { type:'function', name:'allowance', stateMutability:'view', inputs:[{name:'owner', type:'address'},{name:'spender', type:'address'}], outputs:[{type:'uint256'}]},
  { type:'function', name:'approve',   stateMutability:'nonpayable', inputs:[{name:'spender', type:'address'},{name:'amount', type:'uint256'}], outputs:[{type:'bool'}]},
] as const

/** Escrow stub (wire these when you add them to Casino) */
const CASINO_ABI = [
  { type:'function', name:'pokerDeposit',  stateMutability:'nonpayable', inputs:[{name:'amount', type:'uint256'}], outputs:[] },
  { type:'function', name:'pokerWithdraw', stateMutability:'nonpayable', inputs:[{name:'amount', type:'uint256'}], outputs:[] },
] as const

type Seat = { name:string, stack:number, me?:boolean }
const defaultSeats:Seat[]=[
  {name:'Miner_1',stack:2500},{name:'Miner_2',stack:2500},{name:'You',stack:2500,me:true},
  {name:'Miner_3',stack:2500},{name:'Miner_4',stack:2500},{name:'Miner_5',stack:2500},
]

export default function PokerTable(){
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(()=>setMounted(true),[])

  /** Demo chips */
  const [seats] = useState(defaultSeats)
  const [pot, setPot] = useState(0)
  const [bet, setBet] = useState(50)
  const [chips, setChips] = useState(5000)
  const debit = (x:number)=> setChips(c=>Math.max(0,c-x))

  /** Wallet reads (mounted only) */
  const balQ = useContractRead({
    address: BGLD, abi: ERC20_ABI, functionName:'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && mounted,
    watch: true
  })
  const allowQ = useContractRead({
    address: BGLD, abi: ERC20_ABI, functionName:'allowance',
    args: address && CASINO ? [address, CASINO] : undefined,
    enabled: !!address && !!CASINO && mounted && ONCHAIN,
    watch: true
  })
  const balance = balQ.data ? Number(formatUnits(balQ.data as bigint, 18)) : 0
  const allowance = (allowQ.data as bigint | undefined) || 0n
  const [buyin, setBuyin] = useState<number>(100) // BGLD buy-in (on-chain mode)

  /** Approve + Deposit (on-chain) */
  const { write: approve, data: approveTx, isLoading: approving } =
    useContractWrite({ address: BGLD, abi: ERC20_ABI, functionName: 'approve' })
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })

  const { write: deposit, data: depTx, isLoading: depositing } =
    useContractWrite({ address: CASINO, abi: CASINO_ABI, functionName: 'pokerDeposit' })
  const depWait = useWaitForTransaction({ hash: (depTx as any)?.hash })

  const { write: withdraw, data: wTx, isLoading: withdrawing } =
    useContractWrite({ address: CASINO, abi: CASINO_ABI, functionName: 'pokerWithdraw' })
  const wWait = useWaitForTransaction({ hash: (wTx as any)?.hash })

  useEffect(()=>{
    if (approveWait.isSuccess) allowQ.refetch?.()
    if (depWait.isSuccess || wWait.isSuccess) balQ.refetch?.()
  },[approveWait.isSuccess, depWait.isSuccess, wWait.isSuccess]) // eslint-disable-line

  const onApprove = () => approve?.({ args:[CASINO as `0x${string}`, maxUint256] as const })
  const onDeposit = () => {
    const amt = parseUnits(String(Math.max(1, Math.floor(buyin))), 18)
    deposit?.({ args:[amt] as const })
  }
  const onWithdraw = () => {
    const amt = parseUnits(String(Math.max(1, Math.floor(buyin))), 18)
    withdraw?.({ args:[amt] as const })
  }

  const act=(k:'check'|'bet'|'fold')=>{
    if(k==='bet'){
      const b=Math.min(bet,chips)
      if(b>0){ debit(b); setPot(p=>p+b) }
    }
    // NOTE: when wiring real game, emit socket events here (check/bet/fold amounts)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between text-sm opacity-80">
        <div>BGLD Poker {ONCHAIN ? '• On-chain Buy-in Ready' : '• Demo Chips'}</div>
        <div className="flex items-center gap-4">
          {ONCHAIN ? (
            <>
              <span>Wallet: <span className="text-[#FFD700] font-bold">{mounted ? balance.toLocaleString() : '…'}</span> BGLD</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className="w-24 bg-transparent outline-none text-right px-2 py-1 rounded border border-white/10"
                  value={buyin}
                  onChange={e=>setBuyin(Number(e.target.value||'0'))}
                />
                <span className="text-xs opacity-70">BGLD</span>
              </div>
              {allowance < parseUnits(String(buyin||0),18) ? (
                <button className="btn-cyan px-3 py-1 rounded-lg" onClick={onApprove} disabled={!address || approving}>
                  {approving ? 'Approving…' : 'Approve'}
                </button>
              ) : (
                <>
                  <button className="btn-gold px-3 py-1 rounded-lg" onClick={onDeposit} disabled={!address || depositing}>
                    {depositing ? 'Depositing…' : 'Buy-in'}
                  </button>
                  <button className="btn px-3 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}
                          onClick={onWithdraw} disabled={!address || withdrawing}>
                    {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div>Your Stack: <span className="text-[#FFD700] font-bold">{chips.toLocaleString()}</span> chips</div>
          )}
        </div>
      </div>

      <div className="relative mt-6 rounded-full mx-auto w-full max-w-3xl aspect-[2/1] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]">
        <div className="absolute left-1/2 -translate-x-1/2 top-3 text-xs opacity-70">Pot</div>
        <div className="absolute left-1/2 -translate-x-1/2 top-7 text-[#FFD700] font-bold">{pot.toLocaleString()} {ONCHAIN?'BGLD':'chips'}</div>
        <Seat pos="top"         name={seats[0].name} stack={seats[0].stack}/>
        <Seat pos="leftTop"     name={seats[1].name} stack={seats[1].stack}/>
        <Seat pos="leftBottom"  name={seats[2].name} stack={seats[2].stack} me/>
        <Seat pos="bottom"      name={seats[3].name} stack={seats[3].stack}/>
        <Seat pos="rightBottom" name={seats[4].name} stack={seats[4].stack}/>
        <Seat pos="rightTop"    name={seats[5].name} stack={seats[5].stack}/>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button className="btn" style={{background:'rgba(255,255,255,0.08)'}} onClick={()=>act('check')}>CHECK</button>
        <div className="flex items-center gap-2" style={{background:'rgba(255,255,255,0.08)', padding:'.5rem .75rem', borderRadius:'12px'}}>
          <span className="text-sm opacity-70">BET</span>
          <input className="w-20 bg-transparent outline-none text-right"
                 type="number" min={1}
                 value={bet}
                 onChange={e=>setBet(parseInt(e.target.value||'0'))}/>
          <span className="text-sm opacity-70">{ONCHAIN?'BGLD':'chips'}</span>
        </div>
        <button className="btn btn-cyan" onClick={()=>act('bet')}>BET</button>
        <button className="btn" style={{background:'rgba(255,255,255,0.08)'}} onClick={()=>{ /* fold stub */ }}>FOLD</button>
      </div>

      <div className="mt-3 text-center text-xs opacity-60">
        {ONCHAIN
          ? 'Buy-in uses real BGLD escrow in Casino (deposit/withdraw stubs ready).'
          : 'Demo only — we’ll wire escrow + rake later.'}
      </div>
    </div>
  )
}

function Seat({pos,name,stack,me=false}:{pos:'top'|'leftTop'|'leftBottom'|'bottom'|'rightBottom'|'rightTop';name:string;stack:number;me?:boolean}){
  const base='px-3 py-2 rounded-lg bg-black/40 border border-[rgba(255,255,255,0.1)] text-center text-[12px]'
  const node=<div className={base}><div>{name}{me?' (you)':''}</div><div className="text-[#FFD700] font-semibold">{stack}</div></div>
  switch(pos){
    case 'top': return <div className="absolute left-1/2 -translate-x-1/2 -top-3">{node}</div>
    case 'leftTop': return <div className="absolute -left-3 top-1/4">{node}</div>
    case 'leftBottom': return <div className="absolute -left-3 bottom-1/4">{node}</div>
    case 'bottom': return <div className="absolute left-1/2 -translate-x-1/2 -bottom-3">{node}</div>
    case 'rightBottom': return <div className="absolute -right-3 bottom-1/4">{node}</div>
    case 'rightTop': return <div className="absolute -right-3 top-1/4">{node}</div>
  }
}
