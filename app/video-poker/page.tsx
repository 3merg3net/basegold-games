'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import VideoPokerGame from '@/components/casino/VideoPokerGame';

export default function VideoPokerPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🎴 Video Poker
          </h1>

          <GameHero
            title="Video Poker – Jacks or Better"
            badge="5-CARD DRAW"
            subtitle="The iconic digital poker machine. Hold your cards, draw new ones, and climb the classic Jacks or Better payout ladder."
            bullets={[
              'Start each round with 5 cards.',
              'Choose which cards to hold, then draw new ones.',
              'Hands from Jacks or Better and up pay out in BGRC instantly.',
            ]}
          />
        </div>

        {/* Game UI */}
        <VideoPokerGame />
      </div>
    </CasinoLayout>
  );
}
