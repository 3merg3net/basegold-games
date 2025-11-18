'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import MineGame from '@/components/casino/MineGame';

export default function MinePage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            ⛏️ Chase the Motherlode
          </h1>

          <GameHero
            title="Mine – Strike the Vein"
            badge="RISK • REWARD"
            subtitle="Pick a tile and pray the vein runs deep. Fast, high-volatility mining with jackpots hidden under the Ridge."
            bullets={[
              'Choose your tool style: Pan, Shovel, or Dynamite.',
              'Pick a tile on the Ridge and lock in your BGRC stake.',
              'Watch your streak and P&L as you hunt for the motherlode.',
            ]}
          />
        </div>

        {/* Game UI */}
        <MineGame />
      </div>
    </CasinoLayout>
  );
}
