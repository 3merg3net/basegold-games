import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regional Notice – European Users | Base Gold Rush',
}

export default function EUNoticePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-[#FFD700]">
        Regional Notice: Europe
      </h1>

      <p className="text-white/70">
        This page provides a general notice for users accessing Base Gold Rush
        from within European jurisdictions. It is not legal advice and does not
        reflect the specific laws of any particular country.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">Regulatory Variation</h2>
        <p className="text-white/70">
          Rules regarding crypto assets, online gaming, and related services
          differ between European countries and may evolve as new regulations
          are introduced. You are responsible for understanding and complying
          with the laws that apply to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">No Advice or Endorsement</h2>
        <p className="text-white/70">
          Base Gold Rush does not provide legal, financial, or tax advice, and
          does not represent that the Service is suitable or permitted in any
          specific jurisdiction. If you are uncertain about your legal position,
          you should seek professional advice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#FFD700]">Non-Custodial Use</h2>
        <p className="text-white/70">
          The Service operates in a non-custodial manner. Gameplay uses BGRC
          chips within smart contracts, and all transactions are executed
          directly through your wallet. You remain in control of your assets at
          all times.
        </p>
      </section>
    </div>
  )
}
