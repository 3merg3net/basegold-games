'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import WarGame from '@/components/casino/WarGame';

export default function WarPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            ⚔️ Casino War
          </h1>

          <GameHero
            title="Casino War – High Card Wins"
            badge="PLAYER VS HOUSE"
            subtitle="Simple, brutal, instant combat. You and the house draw a card — higher card wins, ties go to WAR."
            bullets={[
              'Place your BGRC stake against the house.',
              'Player and Dealer each draw a single card.',
              'Higher card wins — ties trigger the war round for bigger risk.',
            ]}
          />
        </div>

        {/* Game UI */}
        <WarGame />
      </div>
    </CasinoLayout>
  );
}
