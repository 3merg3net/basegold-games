'use client'
import { useMemo, useState } from 'react'
import { useAccount, useContractRead } from 'wagmi'
import Token from '@/abis/MockBGLD.json'
import { usePlay } from '@/lib/hooks/usePlay'

const TOKEN = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`

export default function BalanceBetBar() {
  const { address } = useAccount()
  const { playPan, playMine, playSlots, isPending } = usePlay()

  const bal = useContractRead({
    address: TOKEN,
    abi: (Token as any).abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    watch: true,
    enabled: !!address,
  })

    const balRaw = bal.data ? (bal.data as unknown as bigint) : 0n
  const balance = Number(balRaw) / 1e18


  const [bet, setBet] = useState<number>(100)
  const toWei = useMemo(() => BigInt(Math.max(0, bet)) * 10n**18n, [bet])

  const presets = [1, 3, 5, 25]
  const disabled = isPending || !address || (bet <= 0)

  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-white/80">
          <div className="text-xs">BGRC Balance</div>
          <div className="font-black text-white tabular-nums">{balance.toLocaleString()} BGRC</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-white/60 mr-1">Quick Bets</div>
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setBet(p)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              ${p}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e)=>setBet(parseInt(e.target.value || '0'))}
            className="w-24 bg-white/10 text-white rounded-lg px-3 py-1.5 outline-none ml-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={disabled}
            onClick={()=>playPan(toWei)}
            className="px-3 py-2 rounded-lg bg-blue-400 text-black font-bold disabled:opacity-50"
          >Pan</button>
          <button
            disabled={disabled}
            onClick={()=>playMine(toWei)}
            className="px-3 py-2 rounded-lg bg-green-400 text-black font-bold disabled:opacity-50"
          >Mine</button>
          <button
            disabled={disabled}
            onClick={()=>playSlots(toWei)}
            className="px-3 py-2 rounded-lg bg-pink-400 text-black font-bold disabled:opacity-50"
          >Slots</button>
        </div>
      </div>

      <div className="text-[11px] text-white/50 mt-2">
        Tip: Click a quick bet to set the wager. Make sure you’ve approved enough BGRC before playing.
      </div>
    </div>
  )
}
