'use client'
import { useState } from 'react'
import { useContractWrite, useWaitForTransaction } from 'wagmi'
import MockBGLD from '@/abis/MockBGLD.json'

const TOKEN = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`

export default function MintTestBgld() {
  const [amount, setAmount] = useState(10_000)

  const { write, data, isLoading, error } = useContractWrite({
    address: TOKEN,
    abi: (MockBGLD as any).abi,
    functionName: 'faucetMint',
  })
  const txHash = typeof data === 'string' ? data : (data as any)?.hash
  const wait = useWaitForTransaction({ hash: txHash as `0x${string}` })

  const onMint = () => {
    const wei = BigInt(amount) * 10n ** 18n
    write?.({ args: [wei] as const })
  }

  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10">
      <div className="text-lg font-semibold text-white">Mint Chips</div>

      <div className="mt-3 flex gap-2 items-center">
        <input
          type="number"
          min={1}
          max={10000}
          value={amount}
          onChange={e => setAmount(Math.max(1, Math.min(10000, parseInt(e.target.value || '0'))))}
          className="w-28 bg-white/10 text-white rounded-lg px-3 py-2 outline-none"
        />
        <button onClick={onMint} disabled={isLoading} className="px-4 py-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-black font-semibold">
          {isLoading ? 'Minting…' : 'Mint'}
        </button>
        <div className="flex gap-2 ml-2">
          <button onClick={() => setAmount(1_000)} className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">1k</button>
          <button onClick={() => setAmount(5_000)} className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">5k</button>
          <button onClick={() => setAmount(10_000)} className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">10k</button>
        </div>
      </div>

      {txHash && <div className="text-xs text-cyan-300 mt-2">Tx: {txHash.slice(0,10)}…</div>}
      {wait.isLoading && <div className="text-xs text-white/60 mt-1">Confirming…</div>}
      {wait.isSuccess && <div className="text-xs text-green-400 mt-1">Confirmed ✅</div>}
      {error && <div className="text-xs text-red-400 mt-2">{(error as any)?.shortMessage || String(error)}</div>}
    </div>
  )
}
