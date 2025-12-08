// components/poker/PokerCard.tsx
import React from "react";

type PokerCardProps = {
  card?: string;                // e.g. "As", "Td"
  size?: "small" | "normal";
  highlight?: boolean;
  delayIndex?: number;
  tilt?: number;
  isBack?: boolean;
};

const SUIT_SYMBOL: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_NAME: Record<string, string> = {
  s: "Spades",
  h: "Hearts",
  d: "Diamonds",
  c: "Clubs",
};

export default function PokerCard({
  card,
  size = "normal",
  highlight = false,
  delayIndex = 0,
  tilt = 0,
  isBack = false,
}: PokerCardProps) {
  const rank = card ? card[0] : "A";
  const suitChar = card ? card[1] : "s";

  const suitSymbol = SUIT_SYMBOL[suitChar] ?? "♠";
  const suitName = SUIT_NAME[suitChar] ?? "Spades";

  const isRed = suitChar === "h" || suitChar === "d";

  const dims =
    size === "small"
      ? "w-[34px] h-[46px]"
      : "w-[44px] h-[62px]";

  const rankText =
    size === "small" ? "text-[11px]" : "text-[13px] md:text-[14px]";
  const suitText =
    size === "small" ? "text-[13px]" : "text-[16px] md:text-[18px]";

  const delayMs = 80 * delayIndex;

  if (isBack) {
    // Simple back pattern – used when we don’t want to show face
    return (
      <div
        className={[
          "relative rounded-[6px] border border-white/25 bg-gradient-to-br",
          "from-slate-200 via-slate-300 to-slate-400 shadow-[0_0_18px_rgba(0,0,0,0.9)]",
          dims,
        ].join(" ")}
        style={{
          transform: `rotate(${tilt}deg)`,
        }}
      >
        <div className="absolute inset-[3px] rounded-[4px] bg-[radial-gradient(circle_at_center,#0f172a_0,#020617_60%,#000000_100%)]" />
        <div className="absolute inset-[5px] rounded-[3px] border border-white/25 border-dashed opacity-70" />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="h-[65%] w-[65%] rounded-full border border-yellow-200/70 bg-yellow-300/20 shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "relative select-none rounded-[6px] border bg-white shadow-[0_8px_20px_rgba(0,0,0,0.9)]",
        "overflow-hidden",
        highlight
          ? "border-[#FACC15] ring-1 ring-[#FACC15]/80 shadow-[0_0_22px_rgba(250,204,21,0.7)]"
          : "border-slate-200",
        dims,
      ].join(" ")}
      style={{
        transform: `rotate(${tilt}deg) translateZ(1px)`,
        transition:
          "transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out",
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {/* Subtle gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-200" />

      {/* Soft inner glow */}
      <div className="pointer-events-none absolute inset-[2px] rounded-[5px] border border-white/60 shadow-[inset_0_0_4px_rgba(0,0,0,0.25)]" />

      {/* Corner rank & suit (top-left) */}
      <div className="pointer-events-none absolute left-[3px] top-[2px] flex flex-col items-center leading-none">
        <span
          className={[
            rankText,
            "font-bold",
            isRed ? "text-red-600" : "text-slate-900",
          ].join(" ")}
        >
          {rank}
        </span>
        <span
          className={[
            "mt-[1px] leading-none",
            size === "small" ? "text-[9px]" : "text-[10px]",
            isRed ? "text-red-500" : "text-slate-700",
          ].join(" ")}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Mirrored rank bottom-right (rotated) */}
      <div className="pointer-events-none absolute bottom-[2px] right-[3px] flex flex-col items-center leading-none rotate-180">
        <span
          className={[
            rankText,
            "font-bold",
            isRed ? "text-red-600" : "text-slate-900",
          ].join(" ")}
        >
          {rank}
        </span>
        <span
          className={[
            "mt-[1px] leading-none",
            size === "small" ? "text-[9px]" : "text-[10px]",
            isRed ? "text-red-500" : "text-slate-700",
          ].join(" ")}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Large suit in center – THIS is the only big suit, fully inside card */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <span
            className={[
              suitText,
              "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
              isRed ? "text-red-500" : "text-slate-800",
            ].join(" ")}
          >
            {suitSymbol}
          </span>
          {size === "normal" && (
            <span className="mt-[1px] text-[8px] uppercase tracking-[0.16em] text-slate-400">
              {suitName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
