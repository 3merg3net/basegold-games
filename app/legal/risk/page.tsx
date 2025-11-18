import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Risk Disclosure | Base Gold Rush',
}

export default function RiskPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Risk Disclosure</h1>
      <p className="text-xs text-neutral-400">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-neutral-200">
        This Risk Disclosure describes certain risks associated with using Base
        Gold Rush and interacting with cryptocurrencies and blockchain-based games.
        It is not exhaustive. By using the Service, you acknowledge and accept
        these risks.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Cryptocurrency Volatility</h2>
        <p>
          Tokens used in or around the Service (including BGLD and any in-game chip
          tokens) may fluctuate significantly in value. Market conditions outside of
          our control can cause rapid changes in token prices. You may lose some or
          all of the value of tokens you acquire or use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Smart Contract Risk</h2>
        <p>
          The Service relies on smart contracts deployed to public blockchain networks.
          Smart contracts may contain bugs, vulnerabilities, or unforeseen behavior
          that could result in loss of tokens or incorrect outcomes. While we strive
          to minimize these risks, we cannot guarantee that smart contracts will
          function as intended in all circumstances.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Network and Infrastructure Risk</h2>
        <p>
          Blockchain networks and related infrastructure (nodes, RPC providers, wallet
          software, etc.) may experience downtime, congestion, forks, or other
          disruptions. Such events can delay or prevent transactions from being
          confirmed, or may cause inconsistent or unexpected behavior.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Regulatory and Legal Risk</h2>
        <p>
          The legal status of cryptocurrencies and on-chain gaming varies by jurisdiction
          and may change over time. Regulatory actions or changes in law could impact
          your ability to use the Service or the value and treatment of tokens. You
          are solely responsible for understanding and complying with the laws that
          apply to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Personal Responsibility</h2>
        <p>You are solely responsible for:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Securing your devices and wallet credentials.</li>
          <li>Managing your private keys and seed phrases.</li>
          <li>Evaluating your own risk tolerance.</li>
          <li>
            Determining whether participation in on-chain gaming is appropriate for you.
          </li>
        </ul>
        <p>
          You should never risk more than you can afford to lose and should consider
          seeking independent financial, legal, and tax advice.
        </p>
      </section>

      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-semibold">6. No Guarantees</h2>
        <p>
          We do not guarantee any particular outcome, return, or level of performance
          from the Service, nor do we guarantee the future availability or
          functionality of any game, smart contract, or token. Your use of the Service
          is entirely at your own risk.
        </p>
      </section>
    </div>
  )
}
