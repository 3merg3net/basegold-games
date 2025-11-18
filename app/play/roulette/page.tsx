'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import RouletteGame from '@/components/casino/RouletteGame';

export default function RoulettePage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🎡 Roulette on Base
          </h1>

          <GameHero
            title="Roulette – Vegas Table"
            badge="RED • BLACK • NUMBERS"
            subtitle="The full roulette experience — Shining wheel physics, Golden balls, and classic bets ."
            bullets={[
              'Place BGRC chips on red/black, dozens, or straight numbers.',
              'Spin the wheel and watch the ball drop.',
              'Hit your pocket and claim instant BGRC payouts.',
            ]}
          />
        </div>

        {/* Game UI */}
        <RouletteGame />
      </div>
    </CasinoLayout>
  );
}
