// app/demo/page.tsx
import CasinoLayout from "@/components/casino/CasinoLayout";
import { GameCard } from "@/components/casino/GameCard";
import { IS_DEMO } from "@/config/env";

export default function DemoCasinoPage() {
  return (
    <CasinoLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD700] drop-shadow-lg">
            Base Gold Rush Demo Pit
          </h1>
          {IS_DEMO && (
            <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl mx-auto">
              Play around with the Base Gold Rush casino experience using BGRC
              demo chips on testnet. No real BGLD or real-world value is
              involved here.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          <GameCard
            title="BGRC Slots"
            href="/demo/slots"
            tag="Slots"
            description="Spin the reels with demo BGRC chips and test the slot experience and animations."
          />
          <GameCard
            title="Live Poker (Demo)"
            href="/demo/poker"
            tag="Poker"
            description="Try the multi-seat poker table UI and flow using testnet chips."
          />
          <GameCard
            title="Coming Soon"
            href="#"
            tag="WIP"
            description="More Base-native games are in development. This tile is just a visual placeholder for now."
          />
        </div>
      </div>
    </CasinoLayout>
  );
}
