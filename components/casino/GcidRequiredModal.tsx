// components/casino/GcidRequiredModal.tsx
"use client";

import { useRouter } from "next/navigation";

export default function GcidRequiredModal() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-gradient-to-b from-black to-slate-900 p-5 text-white space-y-4 shadow-2xl">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
            Base Gold Rush Casino
          </div>
          <h2 className="mt-1 text-lg font-semibold">Create your Global Casino ID</h2>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          Before you can play, you’ll set up a simple identity used across the entire
          casino: your <span className="text-white/90 font-semibold">handle</span>, avatar,
          and preferences. This powers leaderboards, seats, and your public/private profile.
        </p>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70">
          <div className="font-semibold text-white/80 mb-1">Demo requirement</div>
          Handle only. You can add nickname, wallet, and recovery later.
        </div>

        <button
          onClick={() => router.push("/profile")}
          className="w-full rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
        >
          Set up my Casino ID
        </button>

        <p className="text-[10px] text-white/45">
          Takes less than a minute. Stored in Supabase.
        </p>
      </div>
    </div>
  );
}
