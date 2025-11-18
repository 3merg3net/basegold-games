import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regional Notice – Australia | Base Gold Rush',
}

export default function AUNoticePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-[#FFD700]">
        Regional Notice: Australia
      </h1>

      <p className="text-white/70">
        This page provides a general notice for users accessing Base Gold Rush
        from within Australia. It is not legal or financial advice.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">Local Law Considerations</h2>
        <p className="text-white/70">
          Regulations involving crypto assets and online gaming may apply to
          your use of the Service and can change over time. You are solely
          responsible for ensuring that your use of Base Gold Rush complies
          with all applicable laws and regulations in your state or territory.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">No Guarantees or Advice</h2>
        <p className="text-white/70">
          We do not guarantee that the Service is lawful or appropriate for use
          in any particular jurisdiction, and nothing here should be treated as
          legal, financial, or tax advice. If you are unsure, you should consult
          a qualified professional.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">Use of BGRC Chips</h2>
        <p className="text-white/70">
          Gameplay on Base Gold Rush uses BGRC chips as internal casino credits.
          BGRC chips are not designed as investment products and are used solely
          for gameplay within the platform. Participation is entirely at your
          own risk.
        </p>
      </section>
    </div>
  )
}
