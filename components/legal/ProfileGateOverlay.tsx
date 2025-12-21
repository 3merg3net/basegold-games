// components/legal/ProfileGateOverlay.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";

const AGE_STORAGE_KEY = "bg_age_verified_v2";

// Only gate these (casino tables / arcade)
const PROTECTED_PREFIXES = ["/arcade", "/poker", "/blackjack-live", "/cashier"];

// Consider profile "complete" if:
// - nickname (stored as db "name") is at least 2 chars
// - OR provider flagged isProfileComplete
function hasProfile(profile: any) {
  const nick = String(profile?.nickname ?? "").trim();
  const isComplete = Boolean(profile?.isProfileComplete);
  return isComplete || nick.length >= 2;
}

function displayName(profile: any) {
  const nick = String(profile?.nickname ?? "").trim();
  const handle = String(profile?.handle ?? "").trim();
  return nick || handle || "Player";
}

export default function ProfileGateOverlay() {
  const pathname = usePathname();
  const { profile, loading } = usePlayerProfileContext() as any;

  const [ageOk, setAgeOk] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(AGE_STORAGE_KEY);
    setAgeOk(stored === "true");
  }, []);

  const isProtected = useMemo(() => {
    if (!pathname) return false;
    return PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }, [pathname]);

  // Only gate after:
  // - user is on a protected route
  // - age gate accepted
  // - profile finished loading
  // - and profile is missing
  const needsProfile = isProtected && ageOk && !loading && !hasProfile(profile);

  // If returning user + protected route, we can show a softer "Welcome back" gate
  // (optional). For now: only block when missing profile.
  if (!needsProfile) return null;

  const nextLabel = pathname?.startsWith("/poker")
    ? "Enter Poker"
    : pathname?.startsWith("/blackjack-live")
    ? "Enter Blackjack"
    : pathname?.startsWith("/cashier")
    ? "Open Cashier"
    : "Enter Casino";

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-[0_0_55px_rgba(0,0,0,0.9)]">
        {/* Top glow bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#facc15]/80 to-transparent" />

        <div className="p-5 md:p-6">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                Base Gold Rush • Player Login
              </div>
              <div className="mt-1 text-xl font-extrabold text-white/95">
                Choose your table name
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-white/65">
                To enter live tables, you need a public display name. This keeps
                chat, hand history, and leaderboards consistent.
              </p>
            </div>

            {/* Close/back */}
            <Link
              href="/"
              className="shrink-0 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-black/70 hover:text-white"
            >
              Back
            </Link>
          </div>

          {/* “Login panel” */}
          <div className="mt-4 rounded-2xl border border-[#facc15]/25 bg-gradient-to-b from-[#0b0b0b] to-black p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-white/70">
                Status
              </div>
              <div className="text-[11px] font-semibold text-[#facc15]/90">
                Setup Required
              </div>
            </div>

            <div className="mt-2 text-[12px] text-white/70">
              Current name:{" "}
              <span className="font-semibold text-white/90">
                {displayName(profile)}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={`/profile?next=${encodeURIComponent(pathname || "/")}`}
                className="w-full rounded-xl bg-[#facc15] px-4 py-2.5 text-center text-[13px] font-extrabold text-black hover:bg-yellow-400"
              >
                Set Name &amp; Avatar →
              </Link>

              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/profile"
                  className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-2 text-center text-[12px] font-semibold text-white/80 hover:bg-black/70"
                >
                  Open Profile
                </Link>

                <Link
                  href="/"
                  className="flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-2 text-center text-[12px] font-semibold text-white/80 hover:bg-black/70"
                >
                  Not now
                </Link>
              </div>

              <div className="pt-1 text-center text-[10px] text-white/45">
                After setup, you’ll go straight to{" "}
                <span className="text-white/70 font-semibold">{nextLabel}</span>{" "}
                with no extra popups.
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-4 text-[10px] text-white/45">
            Tip: Keep it clean — this name is public at the tables.
          </div>
        </div>
      </div>
    </div>
  );
}
