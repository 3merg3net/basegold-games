'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import HiLoGame from '@/components/casino/HiLoGame';

export default function HiLoPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🔺 Hi-Lo Ladder
          </h1>

          <GameHero
            title="Hi-Lo – Card Ladder"
            badge="STREAK MULTIPLIERS"
            subtitle="Predict whether the next card will be higher or lower. Build streaks for escalating BGRC multipliers."
            bullets={[
              'Set your BGRC stake and reveal the first card.',
              'Choose higher or lower each round based on odds.',
              'Climb streak multipliers — bust and the run ends instantly.',
            ]}
          />
        </div>

        {/* Game UI */}
        <HiLoGame />
      </div>
    </CasinoLayout>
  );
}
