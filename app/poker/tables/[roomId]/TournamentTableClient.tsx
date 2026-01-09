"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const PokerRoomTournament = dynamic(() => import("@/components/casino/PokerRoomTournament"), { ssr: false });

type Props = { params: { roomId: string } };

function safeName(v: string) {
  const s = (v || "").trim();
  if (!s) return "";
  return s.replace(/\s+/g, " ").slice(0, 48);
}

export default function TournamentTableClient({ params }: Props) {
  const sp = useSearchParams();

  const tableRoomId = params.roomId;
  const tournamentId = String(sp?.get("tid") || "");
  const tournamentName = useMemo(() => safeName(sp?.get("name") || "") || "Tournament", [sp]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="fixed left-3 top-[72px] z-[60]">
        <Link
          href="/poker/tournaments"
          className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/10"
        >
          ← Tournaments
        </Link>
      </div>

      <PokerRoomTournament
        tableRoomId={tableRoomId}
        tournamentId={tournamentId || "tournament"}
        tournamentName={tournamentName}
      />
    </main>
  );
}
