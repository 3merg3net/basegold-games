// components/casino/GameHero.tsx

type Props = {
  title: string
  subtitle: string
  badge?: string
  bullets?: string[]
}

export default function GameHero({ title, subtitle, badge, bullets = [] }: Props) {
  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_#3b2c0f_0,_#050507_55%)] px-4 py-4 md:px-6 md:py-5 shadow-[0_0_40px_rgba(0,0,0,0.75)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          {badge && (
            <div className="mb-2">
              <span className="inline-flex items-center rounded-full border border-[#FFD700]/40 bg-[#FFD700]/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD700]">
                {badge}
              </span>
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            {title}
          </h1>

          <p className="mt-1 text-sm md:text-base text-white/75 max-w-2xl">
            {subtitle}
          </p>
        </div>

        {bullets.length > 0 && (
          <div className="mt-3 md:mt-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/75 w-full md:w-auto md:max-w-xs">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-1">
              HOW IT WORKS
            </div>

            <ul className="space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[3px] h-[6px] w-[6px] rounded-full bg-[#FFD700]/70" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
