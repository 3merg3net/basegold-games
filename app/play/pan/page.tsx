'use client';

import CasinoLayout from '@/components/casino/CasinoLayout';
import GameHero from '@/components/casino/GameHero';
import PanGame from '@/components/casino/PanGameV2';

export default function PanPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        {/* Title + Hero */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFD700] drop-shadow-lg">
            🟡 Spin the Golden Wheel
          </h1>

          <GameHero
            title="Pan – The Golden Wheel"
            badge="MULTIPLIER SPINS"
            subtitle="Fast, Gold Pan wheel. One spin can turn dust into Bars — from warm hits to legendary 25× strikes."
            bullets={[
              'Set your BGRC stake and spin the wheel.',
              'Each wedge represents a multiplier up to 25×.',
              'When the pointer locks in, BGRC payouts land instantly.',
            ]}
          />
        </div>

        {/* Game UI */}
        <PanGame />
      </div>
    </CasinoLayout>
  );
}
