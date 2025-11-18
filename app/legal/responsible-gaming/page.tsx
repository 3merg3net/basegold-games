import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Responsible Gaming | Base Gold Rush',
}

export default function ResponsibleGamingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14 text-sm md:text-base space-y-6">
      
      <h1 className="text-2xl md:text-3xl font-semibold text-[#FFD700]">
        Responsible Gaming
      </h1>

      <p className="text-white/60 text-xs">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-white/80">
        Base Gold Rush is designed for entertainment using BGRC chips in a
        blockchain-native environment. We encourage players to maintain healthy,
        responsible participation at all times.
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#FFD700]">Know Your Limits</h2>
        <p className="text-white/70">
          Only play with tokens you can afford to lose. On-chain games can be
          volatile, and outcomes are determined by code, randomness, and blockchain
          execution beyond anyone’s direct control.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#FFD700]">Set Personal Boundaries</h2>
        <ul className="list-disc pl-5 space-y-2 text-white/70">
          <li>Decide your budget before playing.</li>
          <li>Take breaks between sessions.</li>
          <li>Do not attempt to chase losses.</li>
          <li>Consider how much time you spend playing.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#FFD700]">Non-Custodial Environment</h2>
        <p className="text-white/70">
          Base Gold Rush is a non-custodial platform. All transactions occur
          directly in your self-custodied wallet. Never share private keys,
          seed phrases, or wallet credentials with anyone.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#FFD700]">When to Step Away</h2>
        <p className="text-white/70">
          If you feel stressed, impulsive, or frustrated during play, it’s a good
          time to step away. Responsible gaming includes knowing when to pause.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#FFD700]">
          Geographic & Legal Responsibility
        </h2>
        <p className="text-white/70">
          Users are responsible for ensuring that blockchain-based gaming is
          legal in their jurisdiction. Base Gold Rush does not offer legal advice
          or guidance regarding local laws.
        </p>
      </section>
    </div>
  )
}
