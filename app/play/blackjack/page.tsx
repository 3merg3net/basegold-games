'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import BlackjackGame from '@/components/casino/arcade/BlackjackDemo';

export default function BlackjackPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            ♠️ Beat the Dealer
          </h1>

          <GameHero
            title="Blackjack – 21 on Chain"
            badge="HOUSE VS PLAYER"
            subtitle="Classic Vegas blackjack with BGRC chips. Hit, stand, or double down — every decision is a live edge against the house."
            bullets={[
              'Set your BGRC chip size and place your wager.',
              'Cards are dealt face up – decide to hit, stand, or double.',
              'Beat the dealer without busting and stack your BGRC balance.',
            ]}
          />
        </div>

        {/* Game UI */}
        <BlackjackGame />
      </div>
    </CasinoLayout>
  );
}
