import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regional Notice – United States | Base Gold Rush',
}

export default function USNoticePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-[#FFD700]">
        Regional Notice: United States
      </h1>

      <p className="text-white/70">
        This page provides a general notice for users accessing Base Gold Rush
        from within the United States. It is not legal advice.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">User Responsibility</h2>
        <p className="text-white/70">
          Laws and regulations related to crypto, online gaming, and wagering can
          vary significantly between states and may change over time. You are
          solely responsible for determining whether your use of the Service is
          legal in your state or local jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">No Legal Advice</h2>
        <p className="text-white/70">
          Nothing on this site, including this notice, should be interpreted as
          legal, financial, or tax advice. If you are unsure about the laws that
          apply to you, you should consult a qualified professional advisor.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">Use of BGRC Chips</h2>
        <p className="text-white/70">
          Base Gold Rush uses BGRC chips as an internal unit of account for
          gameplay. BGRC chips are not intended as investment products and are
          used solely within the casino environment. Participation is at your
          own risk.
        </p>
      </section>
    </div>
  )
}
