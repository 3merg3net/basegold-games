// components/poker/PokerCard.tsx
import Image from "next/image";

export type PokerCardProps = {
  card: string;                 // e.g. "As", "Td"
  highlight?: boolean;
  size?: "small" | "normal";
  delayIndex?: number;
  tilt?: number;
  isBack?: boolean;
};

// --- tiny helper to turn "As" → labels/colors ---
function parseCard(card: string) {
  const rankChar = card[0]?.toUpperCase() ?? "A";
  const suitChar = card[1]?.toLowerCase() ?? "s";

  const rankLabel =
    rankChar === "T" ? "10" : rankChar; // show "10" instead of "T"

  const suitMap: Record<string, { label: string; color: string }> = {
    s: { label: "♠", color: "text-slate-900" },   // spades – black
    c: { label: "♣", color: "text-slate-900" },   // clubs – black
    h: { label: "♥", color: "text-red-500" },     // hearts – red
    d: { label: "♦", color: "text-red-500" },     // diamonds – red
  };

  const suit = suitMap[suitChar] ?? suitMap.s;
  return {
    rankLabel,
    suitLabel: suit.label,
    suitColor: suit.color,
  };
}

export default function PokerCard({
  card,
  highlight = false,
  size = "normal",
  delayIndex = 0,
  tilt = 0,
  isBack = false,
}: PokerCardProps) {
  
  const { rankLabel, suitLabel, suitColor } = isBack
  ? { rankLabel: "", suitLabel: "", suitColor: "text-slate-900" }
  : parseCard(card);


  // card size presets
    const dims =
    size === "small"
      ? { w: 40, h: 56, text: "text-[12px]" }
      : { w: 56, h: 80, text: "text-sm md:text-base" };


  const delay = `${0.05 * delayIndex}s`;

  // background for front vs back
  const bgClass = isBack
    ? "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500"
    : "bg-white";

  return (
    <div
            className={[
        "card-deal relative flex flex-col justify-between px-1.5 py-1",
        "rounded-xl border shadow-[0_4px_14px_rgba(0,0,0,0.7)]",
        dims.text,
        bgClass,
        highlight
          ? "border-[#FFD700] shadow-[0_0_18px_rgba(250,204,21,0.95)]"
          : "border-slate-300",
      ].join(" ")}
      style={{
        width: dims.w,
        height: dims.h,
        animationDelay: delay,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "50% 60%",
      }}

    >
      {/* subtle inner border to make the edge feel real */}
      <div className="pointer-events-none absolute inset-[2px] rounded-[10px] border border-slate-200" />

      {!isBack ? (
        <>
          {/* top rank + suit */}
          <div className="relative z-10 flex items-start justify-between leading-none">
            <span className="font-bold text-slate-900">{rankLabel}</span>
            <span className={`text-[11px] md:text-xs ${suitColor}`}>
              {suitLabel}
            </span>
          </div>

          {/* big center suit pip */}
          <div className="relative z-10 flex flex-1 items-center justify-center">
            <span
              className={[
                suitColor,
                "leading-none text-xl md:text-2xl",
              ].join(" ")}
            >
              {suitLabel}
            </span>
          </div>

          {/* bottom mirror suit in corner */}
          <div className="relative z-10 flex items-end justify-end">
            <span className={`text-[11px] md:text-xs ${suitColor}`}>
              {suitLabel}
            </span>
          </div>
        </>
      ) : (
        // Card back: simple logo on metallic gradient
       <div className="relative z-10 flex flex-1 items-center justify-center">
  {/* back pattern */}
  <div className="absolute inset-0 opacity-70">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_55%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.15)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
  </div>

  <div className="relative flex items-center justify-center">
    <div className="h-10 w-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center border border-white/70 shadow-[0_0_10px_rgba(0,0,0,0.6)]">
      <Image
        src="/felt/bgrc-logo.png"
        alt="Card back"
        width={28}
        height={28}
        className="object-contain opacity-90 drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]"
      />
    </div>
  </div>
</div>

      )}
    </div>
  );
}
