"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function GcidRequiredModal() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 px-4">
      {/* Background image (same as age gate) */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <Image
          src="/images/agegate-bg.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="relative w-full max-w-sm rounded-2xl border border-yellow-500/35 bg-neutral-950/95 p-5 text-white space-y-4 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/images/goldrush-icon.png"
              alt="Base Gold Rush"
              width={30}
              height={30}
              className="rounded"
            />
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/60">
              Base Gold Rush
            </div>
          </div>

          <h2 className="mt-2 text-lg font-semibold text-yellow-100">
            Create your Global Casino ID
          </h2>

          <p className="mt-2 text-xs text-white/70 leading-relaxed">
            Before you can play, set up a simple identity used across the entire
            casino: your <span className="text-white/90 font-semibold">handle</span>, avatar,
            and preferences.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] text-white/70">
          <div className="font-semibold text-white/85 mb-1">Demo requirement</div>
          Handle only. Add nickname, wallet link, and recovery later.
        </div>

        <button
          onClick={() => router.push("/profile")}
          className="w-full rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 transition"
        >
          Set up my Casino ID
        </button>

        <p className="text-[10px] text-white/45 text-center">
          Takes less than a minute. Stored in Supabase.
        </p>
      </div>
    </div>
  );
}
