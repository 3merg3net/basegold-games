// components/casino/table/ChipStack.tsx
import React from "react";

type ChipStackProps = {
  amount: number;
  size?: number; // approximate chip width in px
};

const TIERS = [
  { max: 100, className: "bg-emerald-400 border-emerald-900" },   // small / green
  { max: 500, className: "bg-sky-400 border-sky-900" },           // blue
  { max: 2_000, className: "bg-red-400 border-red-900" },         // red
  { max: Infinity, className: "bg-yellow-300 border-yellow-900" } // big / gold
];

export function ChipStack({ amount, size = 24 }: ChipStackProps) {
  if (amount <= 0 || !Number.isFinite(amount)) return null;

  // Decide how many discs to show – more chips as amount grows
  const chipCount =
    amount < 100 ? 2 :
    amount < 500 ? 3 :
    amount < 2_000 ? 4 :
    amount < 10_000 ? 5 :
    6;

  // Choose color tier based on total amount (not capped!)
  const tier = TIERS.find((t) => amount <= t.max) ?? TIERS[TIERS.length - 1];

  const chipHeight = size / 2.6;
  const chipWidth = size;
  const offset = chipHeight * 0.45;

  return (
    <div
      className="relative"
      style={{
        height: chipHeight + offset * (chipCount - 1),
        width: chipWidth,
      }}
    >
      {/* stacked discs */}
      {Array.from({ length: chipCount }).map((_, i) => {
        const bottom = offset * i;
        const scale = 1 - (chipCount - 1 - i) * 0.04; // tiny taper for depth

        return (
          <div
            key={i}
            className={[
              "absolute left-1/2 -translate-x-1/2 rounded-full border",
              "shadow-[0_2px_6px_rgba(0,0,0,0.7)]",
              "bg-gradient-to-b from-white/80 via-white/90 to-white/60",
            ].join(" ")}
            style={{
              bottom,
              height: chipHeight,
              width: chipWidth,
              transform: `translateX(-50%) scale(${scale})`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.75)",
            }}
          >
            {/* colored band */}
            <div
              className={[
                "absolute inset-[15%] rounded-full border-2",
                tier.className,
              ].join(" ")}
            />
            {/* small inner ring */}
            <div className="absolute inset-[32%] rounded-full border border-white/60 bg-black/10" />
          </div>
        );
      })}
    </div>
  );
}
