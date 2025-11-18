// components/casino/GameCard.tsx
import Link from "next/link";

type GameCardProps = {
  title: string;
  href: string;
  tag?: string;
  description?: string;
};

export function GameCard({ title, href, tag, description }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-yellow-500/25 bg-neutral-950/60 p-4 md:p-5 flex flex-col justify-between hover:border-yellow-400/70 hover:-translate-y-0.5 transition"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base md:text-lg font-semibold text-neutral-50">
          {title}
        </h3>
        {tag && (
          <span className="text-[10px] px-2 py-1 rounded-full border border-yellow-500/40 text-yellow-200 uppercase tracking-[0.14em]">
            {tag}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] md:text-xs text-neutral-400 mb-3">
          {description}
        </p>
      )}
      <div className="text-[11px] text-yellow-300 mt-auto">
        Enter game<span className="opacity-70"> →</span>
      </div>
    </Link>
  );
}
