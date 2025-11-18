'use client'

import { useEffect, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import { formatUnits, maxUint256, parseUnits, zeroAddress } from 'viem'

/** ENV */
const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}` | undefined
const BGLD =
  ((process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`) || zeroAddress) as `0x${string}`
const ONCHAIN =
  String(process.env.NEXT_PUBLIC_POKER_ONCHAIN || '').toLowerCase() === 'true'

/** Minimal ABIs */
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

/** Escrow stub (wire these when you add them to Casino) */
const CASINO_ABI = [
  {
    type: 'function',
    name: 'pokerDeposit',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pokerWithdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const

type Seat = { name: string; stack: number; me?: boolean }
const defaultSeats: Seat[] = [
  { name: 'Miner_1', stack: 2500 },
  { name: 'Miner_2', stack: 2500 },
  { name: 'You', stack: 2500, me: true },
  { name: 'Miner_3', stack: 2500 },
  { name: 'Miner_4', stack: 2500 },
  { name: 'Miner_5', stack: 2500 },
]

export default function PokerTable() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /** Demo chips */
  const [seats] = useState(defaultSeats)
  const [pot, setPot] = useState(0)
  const [bet, setBet] = useState(50)
  const [chips, setChips] = useState(5000)
  const debit = (x: number) => setChips(c => Math.max(0, c - x))

  /** Wallet reads (mounted only) */
  const balQ = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && mounted,
    watch: true,
  })
  const allowQ = useContractRead({
    address: BGLD,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && CASINO ? [address, CASINO] : undefined,
    enabled: !!address && !!CASINO && mounted && ONCHAIN,
    watch: true,
  })
  const balance = balQ.data ? Number(formatUnits(balQ.data as bigint, 18)) : 0
  const allowance = (allowQ.data as bigint | undefined) || 0n
  const [buyin, setBuyin] = useState<number>(100) // BGLD buy-in (on-chain mode)

  /** Approve + Deposit (on-chain) */
  const {
    write: approve,
    data: approveTx,
    isLoading: approving,
  } = useContractWrite({ address: BGLD, abi: ERC20_ABI, functionName: 'approve' })
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })

  const {
    write: deposit,
    data: depTx,
    isLoading: depositing,
  } = useContractWrite({
    address: CASINO,
    abi: CASINO_ABI,
    functionName: 'pokerDeposit',
  })
  const depWait = useWaitForTransaction({ hash: (depTx as any)?.hash })

  const {
    write: withdraw,
    data: wTx,
    isLoading: withdrawing,
  } = useContractWrite({
    address: CASINO,
    abi: CASINO_ABI,
    functionName: 'pokerWithdraw',
  })
  const wWait = useWaitForTransaction({ hash: (wTx as any)?.hash })

  useEffect(() => {
    if (approveWait.isSuccess) allowQ.refetch?.()
    if (depWait.isSuccess || wWait.isSuccess) balQ.refetch?.()
  }, [approveWait.isSuccess, depWait.isSuccess, wWait.isSuccess]) // eslint-disable-line

  const onApprove = () =>
    approve?.({ args: [CASINO as `0x${string}`, maxUint256] as const })
  const onDeposit = () => {
    const amt = parseUnits(String(Math.max(1, Math.floor(buyin))), 18)
    deposit?.({ args: [amt] as const })
  }
  const onWithdraw = () => {
    const amt = parseUnits(String(Math.max(1, Math.floor(buyin))), 18)
    withdraw?.({ args: [amt] as const })
  }

  const act = (k: 'check' | 'bet' | 'fold') => {
    if (k === 'bet') {
      const b = Math.min(bet, chips)
      if (b > 0) {
        debit(b)
        setPot(p => p + b)
      }
    }
    // NOTE: when wiring real game, emit socket events here (check/bet/fold amounts)
  }

  const needsApproval =
    ONCHAIN && buyin > 0 && allowance < parseUnits(String(buyin || 0), 18)

  return (
    <div className="rounded-[26px] border border-[#f7e38a]/40 bg-gradient-to-br from-[#141521] via-[#05060c] to-[#020208] shadow-[0_0_40px_rgba(0,0,0,0.85)] p-4 md:p-5 space-y-4">
      {/* Header / Wallet strip */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-[0.28em] uppercase text-[#ffe99c]/80">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-lg md:text-xl font-extrabold text-white">
            BGLD Poker Table
          </div>
          <div className="text-[11px] text-white/60 mt-1">
            6-max ring — live buy-in ready. Chips track your stack, escrow tracks BGLD.
          </div>
        </div>

        {ONCHAIN ? (
          <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/80 flex flex-col gap-2 min-w-[260px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60">Wallet Balance</span>
              <span className="font-semibold text-[#ffd977]">
                {mounted ? balance.toLocaleString() : '…'} BGLD
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-white/60">Buy-in</span>
                <input
                  type="number"
                  min={1}
                  className="w-20 bg-black/60 outline-none text-right px-2 py-1 rounded-md border border-white/15 text-xs"
                  value={buyin}
                  onChange={e => setBuyin(Number(e.target.value || '0'))}
                />
                <span className="text-[11px] text-white/60">BGLD</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {needsApproval ? (
                <button
                  className="btn-cyan px-3 py-1.5 rounded-lg text-[11px]"
                  onClick={onApprove}
                  disabled={!address || approving}
                >
                  {approving ? 'Approving…' : 'Approve BGLD'}
                </button>
              ) : (
                <>
                  <button
                    className="btn-gold px-3 py-1.5 rounded-lg text-[11px]"
                    onClick={onDeposit}
                    disabled={!address || depositing}
                  >
                    {depositing ? 'Depositing…' : 'Buy-in'}
                  </button>
                  <button
                    className="btn-dim px-3 py-1.5 rounded-lg text-[11px]"
                    onClick={onWithdraw}
                    disabled={!address || withdrawing}
                  >
                    {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-white/80 flex flex-col gap-1 min-w-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Demo Stack</span>
              <span className="text-lg font-extrabold text-[#ffd977]">
                {chips.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-white/55">
              Local-only chips. On-chain rake + escrow will wire to Casino later.
            </div>
          </div>
        )}
      </div>

      {/* Table / felt */}
      <div className="relative mt-4 mx-auto w-full max-w-3xl aspect-[2.2/1]">
        <div className="absolute inset-0 rounded-full border border-emerald-400/45 bg-[radial-gradient(circle_at_20%_0%,#1e5b3e,transparent_55%),radial-gradient(circle_at_80%_0%,#194838,transparent_55%),#052017] shadow-[0_24px_60px_rgba(0,0,0,0.9)]" />

        {/* Inner oval / betting line */}
        <div className="absolute inset-[10%] rounded-full border border-emerald-200/30" />

        {/* Pot label */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[20%] flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">
            Pot
          </div>
          <div className="mt-1 px-3 py-1 rounded-full bg-black/40 border border-amber-300/60 text-xs font-semibold text-[#ffd977] shadow-[0_0_14px_rgba(0,0,0,0.8)]">
            {pot.toLocaleString()} {ONCHAIN ? 'BGLD' : 'chips'}
          </div>
        </div>

        {/* Seats */}
        <Seat pos="top" name={seats[0].name} stack={seats[0].stack} />
        <Seat pos="leftTop" name={seats[1].name} stack={seats[1].stack} />
        <Seat pos="leftBottom" name={seats[2].name} stack={seats[2].stack} me />
        <Seat pos="bottom" name={seats[3].name} stack={seats[3].stack} />
        <Seat pos="rightBottom" name={seats[4].name} stack={seats[4].stack} />
        <Seat pos="rightTop" name={seats[5].name} stack={seats[5].stack} />
      </div>

      {/* Controls strip */}
      <div className="mt-5 rounded-2xl border border-white/12 bg-black/45 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="uppercase tracking-[0.18em] text-[10px] text-white/50">
            Your Action
          </span>
          {!ONCHAIN && (
            <span className="text-[11px] text-white/50">
              Demo mode — use chips to simulate betting flow.
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button
            className="btn-dim px-4 py-1.5 text-xs rounded-full"
            onClick={() => act('check')}
          >
            CHECK
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5">
            <span className="text-[11px] text-white/60">BET</span>
            <input
              className="w-20 bg-transparent outline-none text-right text-sm"
              type="number"
              min={1}
              value={bet}
              onChange={e => setBet(parseInt(e.target.value || '0'))}
            />
            <span className="text-[11px] text-white/60">
              {ONCHAIN ? 'BGLD' : 'chips'}
            </span>
          </div>

          <button
            className="btn-cyan px-4 py-1.5 text-xs rounded-full"
            onClick={() => act('bet')}
          >
            BET
          </button>

          <button
            className="btn-dim px-4 py-1.5 text-xs rounded-full"
            onClick={() => {
              // fold stub
            }}
          >
            FOLD
          </button>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-white/50">
        {ONCHAIN
          ? 'On-chain mode: approve BGLD once, then use Buy-in / Withdraw to move chips into Casino escrow.'
          : 'Demo only — when live, chips will map 1:1 to escrowed BGLD with real rake + rewards.'}
      </div>
    </div>
  )
}

function Seat({
  pos,
  name,
  stack,
  me = false,
}: {
  pos: 'top' | 'leftTop' | 'leftBottom' | 'bottom' | 'rightBottom' | 'rightTop'
  name: string
  stack: number
  me?: boolean
}) {
  const base =
    'px-3 py-2 rounded-2xl bg-black/55 border border-white/18 text-center text-[11px] shadow-[0_6px_16px_rgba(0,0,0,0.7)] min-w-[90px]'
  const node = (
    <div className={base}>
      <div className="font-semibold text-white/85">
        {name}
        {me ? ' (you)' : ''}
      </div>
      <div className="mt-0.5 text-[#ffd977] font-semibold text-xs">
        {stack.toLocaleString()}
      </div>
    </div>
  )

  switch (pos) {
    case 'top':
      return (
        <div className="absolute left-1/2 -translate-x-1/2 top-[4%]">{node}</div>
      )
    case 'leftTop':
      return <div className="absolute left-[3%] top-[18%]">{node}</div>
    case 'leftBottom':
      return <div className="absolute left-[3%] bottom-[18%]">{node}</div>
    case 'bottom':
      return (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[4%]">
          {node}
        </div>
      )
    case 'rightBottom':
      return <div className="absolute right-[3%] bottom-[18%]">{node}</div>
    case 'rightTop':
      return <div className="absolute right-[3%] top-[18%]">{node}</div>
  }
}
