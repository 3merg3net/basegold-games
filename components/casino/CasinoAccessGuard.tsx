// components/casino/CasinoAccessGuard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";
import GcidRequiredModal from "./GcidRequiredModal";
import CasinoFullScreenLoader from "./CasinoFullScreenLoader";


const RETURN_TO_KEY = "bgrc_return_to";

export default function CasinoAccessGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = usePlayerProfileContext() as any;
  const [returnToSet, setReturnToSet] = useState(false);

  if (loading) {
  return <CasinoFullScreenLoader label="Loading casino access…" />;
}


  const isProfileComplete = Boolean(profile?.isProfileComplete);

  // If blocked, store where they tried to go (once)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isProfileComplete) return;
    if (returnToSet) return;

    const path = window.location.pathname + window.location.search;
    window.localStorage.setItem(RETURN_TO_KEY, path);
    setReturnToSet(true);
  }, [isProfileComplete, returnToSet]);

  if (!isProfileComplete) {
    return <GcidRequiredModal />;
  }

  return <>{children}</>;
}
