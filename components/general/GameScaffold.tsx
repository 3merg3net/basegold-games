'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import type { Address } from 'viem'
import { formatUnits, maxUint256, parseUnits } from 'viem'
import Casino from '@/abis/BaseGoldCasino.json'

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
] as const

type Props = {
  title: string
  subtitle?: string
  actionLabel?: string
  gameKey?: string 
  token: Address
  casino: Address
  children?: (ctx: {
    bet: number
    setBet: (n: number) => void
    canConfirm: boolean
    confirm: () => void
    placing: boolean
    playWaitLoading: boolean
    error?: unknown
    minB: number
    maxB: number
  }) => ReactNode
  functionName: string
  buildArgs: (stakeWei: bigint, seed: bigint) => unknown[] // <- mutable array
  confirmLabel?: string
}

export default function GameScaffold({
  title, token, casino, children, functionName, buildArgs, confirmLabel,
}: Props) {
  const { address } = useAccount()
  const [bet, setBet] = useState(1)
  const stakeWei = useMemo(() => parseUnits(String(bet), 18), [bet])

  const { data: minStakeWei = 0n } = useContractRead({
    address: casino, abi: (Casino as any).abi, functionName: 'minStake', watch: true,
    select: (d) => BigInt(d as any),
  })
  const { data: maxStakeWei = 0n } = useContractRead({
    address: casino, abi: (Casino as any).abi, functionName: 'maxStake', watch: true,
    select: (d) => BigInt(d as any),
  })
  const minB = Number(formatUnits(minStakeWei, 18))
  const maxB = Number(formatUnits(maxStakeWei, 18))
  const outOfBounds = bet < minB || bet > maxB

  const { data: balanceWei = 0n, refetch: refetchBal } = useContractRead({
    address: token, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined, enabled: !!address, watch: true,
    select: (d) => BigInt(d as any),
  })
  const { data: allowanceWei = 0n, refetch: refetchAllow } = useContractRead({
    address: token, abi: ERC20_ABI, functionName: 'allowance',
    args: address ? [address, casino] : undefined, enabled: !!address, watch: true,
    select: (d) => BigInt(d as any),
  })
  const balance = Number(formatUnits(balanceWei, 18))
  const hasAllowance = allowanceWei >= stakeWei

  const { write: writeApprove, data: approveTx, isLoading: approving } =
    useContractWrite({ address: token, abi: ERC20_ABI, functionName: 'approve' })
  const approveWait = useWaitForTransaction({ hash: (approveTx as any)?.hash })
  const onApprove = () => writeApprove?.({ args: [casino, maxUint256] as const })

  const { write: writePlay, data: playTx, isLoading: placing, error: playErr } =
    useContractWrite({ address: casino, abi: (Casino as any).abi, functionName: functionName as any })
  const playWait = useWaitForTransaction({ hash: (playTx as any)?.hash })

  const seed = useMemo(() => (BigInt(Date.now()) << 64n) ^ BigInt(Math.floor(Math.random() * 1e9)), [bet])
  const canConfirm = !!address && !placing && !outOfBounds && balance >= bet && hasAllowance

  useEffect(() => {
    if (approveWait.isSuccess) { refetchAllow(); refetchBal() }
  }, [approveWait.isSuccess, refetchAllow, refetchBal])

  const confirm = () => writePlay?.({ args: buildArgs(stakeWei, seed) as unknown[] })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-lg font-bold text-white/90">{title}</div>

      <div className="mt-3">
        <div className="text-sm text-white/70">Stake (BGRC)</div>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[1,2,3,4,5].map(v=>{
            const dis = v<minB || v>maxB
            return (
              <button
                key={v}
                disabled={dis}
                onClick={()=>!dis && setBet(v)}
                className={[
                  'rounded-lg px-3 py-2 text-sm font-semibold border',
                  bet===v ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]'
                           : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10',
                  dis ? 'opacity-40 cursor-not-allowed':''
                ].join(' ')}
              >{v}</button>
            )
          })}
        </div>
        {outOfBounds && (
          <div className="mt-1 text-xs text-rose-400">Bet must be between {minB} and {maxB} BGRC.</div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-white/60">Balance</div>
          <div className="text-white font-semibold">{balance.toLocaleString()} BGRC</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-white/60">Approval</div>
          <div className="text-white font-semibold">{hasAllowance ? '∞' : 'Not approved'}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {!hasAllowance ? (
          <button className="w-full btn-cyan" onClick={onApprove} disabled={approving || approveWait.isLoading}>
            {approving || approveWait.isLoading ? 'Confirming…' : 'Approve BGLD'}
          </button>
        ) : (
          <>
            <button className="w-full btn-gold" disabled={!canConfirm} onClick={confirm}>
              {placing || playWait.isLoading ? 'Confirming…' : (confirmLabel ?? 'Confirm Bet')}
            </button>
            {playErr && (
              <div className="text-xs text-rose-400">
                {(playErr as any)?.shortMessage || String(playErr)}
              </div>
            )}
          </>
        )}
      </div>

      {children?.({
        bet, setBet, canConfirm,
        confirm,
        placing,
        playWaitLoading: playWait.isLoading,
        error: playErr,
        minB, maxB,
      })}
    </div>
  )
}
