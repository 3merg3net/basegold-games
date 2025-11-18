'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import CoinFlipGame from '@/components/casino/CoinFlipGame';

export default function CoinFlipPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🪙 The Golden 50/50
          </h1>

          <GameHero
            title="Coin Flip – Pure Degeneracy"
            badge="HEADS • TAILS"
            subtitle="Pick a side, place your BGRC chips, and watch the golden coin arc through the air. Fast, clean, deadly — the ultimate on-chain 50/50."
            bullets={[
              'Choose heads or tails and set your BGRC stake.',
              'The massive golden coin flips with smooth Vegas animation.',
              'Win instantly or lose instantly — no middle ground.',
            ]}
          />
        </div>

        {/* Game UI */}
        <CoinFlipGame />
      </div>
    </CasinoLayout>
  );
}
