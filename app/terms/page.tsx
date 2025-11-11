'use client'

export default function Terms() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700] mb-4">
        Terms & Conditions
      </h2>
      <p className="text-white/70 mb-4">
        Welcome to <strong>Base Gold Rush</strong>. By playing or interacting with this site,
        you agree to the following terms:
      </p>
      <ul className="list-disc pl-6 text-white/70 text-sm space-y-2">
        <li>This is an experimental on-chain gaming interface built on Base.</li>
        <li>No guarantees of profits or outcomes are made.</li>
        <li>Smart contracts are immutable once deployed — play responsibly.</li>
        <li>By connecting your wallet, you acknowledge risks associated with blockchain transactions.</li>
        <li>All trademarks and graphics remain property of BaseGold / Base Reserve ecosystem.</li>
      </ul>
      <p className="text-xs text-white/60 mt-6">
        © {new Date().getFullYear()} BaseGold Labs. All rights reserved.
      </p>
    </div>
  )
}
