'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import SlotsV2Game from '@/components/casino/SlotsV2Game';

export default function SlotsPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🎰 Gold Rush Slots
          </h1>

          <GameHero
            title="Slots – Base Gold Rush Machine"
            badge="3× VEGAS REELS"
            subtitle="An On-chain native slot machine rebuilt for Base. Hit the Golden explosive jackpots."
            bullets={[
              'Set your BGRC stake and spin the reels.',
              'Line up 3-of-a-kind across the payline for multipliers.',
              'Hit the Motherlode Jackpot for massive BGRC payouts.',
            ]}
          />
        </div>

        {/* Game UI */}
        <SlotsV2Game />
      </div>
    </CasinoLayout>
  );
}
