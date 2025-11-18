import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Base Gold Rush',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Terms of Service</h1>
      <p className="text-xs text-neutral-400">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-neutral-200">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        Base Gold Rush website, applications, and any related services (the
        &quot;Service&quot;). By accessing or using the Service, you agree to be bound by
        these Terms. If you do not agree, you must not use the Service.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Eligibility</h2>
        <p>
          You may use the Service only if you are at least{' '}
          <span className="font-semibold">18 years old</span> or the age of
          majority in your jurisdiction, whichever is higher, and you are legally
          permitted to participate in cryptocurrency-based gaming and on-chain
          wagering where you are located.
        </p>
        <p>
          You are solely responsible for determining whether your use of the
          Service is legal in your jurisdiction and for complying with all
          applicable laws.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Nature of the Service</h2>
        <p>
          Base Gold Rush provides on-chain gaming experiences built on public
          blockchain networks. Games may use one or more tokens, including but not
          limited to BGLD and internal chip tokens, to represent in-game balances
          and wagers.
        </p>
        <p>
          The Service is provided for{' '}
          <span className="font-semibold">entertainment purposes</span> only and
          does not guarantee any financial return, profit, or outcome.
        </p>
        <p>
          The Service does not custodially hold your funds. All transactions are
          initiated by you from your self-custodied wallet and are executed by
          smart contracts on the underlying blockchain.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          3. No Financial, Legal, or Tax Advice
        </h2>
        <p>
          Nothing on or in connection with the Service constitutes financial,
          investment, legal, or tax advice. You should consult your own
          professional advisors before making any decisions involving
          cryptocurrency or on-chain activity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. On-Chain Risk</h2>
        <p>
          By using the Service, you acknowledge and accept the inherent risks of
          interacting with blockchain networks, including but not limited to:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Irreversible transactions and loss of tokens.</li>
          <li>Smart contract bugs, exploits, or unexpected behavior.</li>
          <li>Network congestion, downtime, or forks.</li>
          <li>
            Volatility in the value of tokens used in or around the Service.
          </li>
        </ul>
        <p>
          You understand that you may lose some or all of the tokens you use in
          connection with the Service, and you agree that you are solely
          responsible for this risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Tokens and Chips</h2>
        <p>
          The Service may use one or more tokens for different purposes, such as
          BGLD for ecosystem utility and internal chip tokens used solely within
          games as in-platform credits.
        </p>
        <p>
          Internal chip tokens used in the Service are{' '}
          <span className="font-semibold">not designed as investment products</span>{' '}
          and are intended only for in-game use. They do not represent equity,
          ownership, or a claim on any entity&apos;s assets or revenues.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. User Responsibilities</h2>
        <p>You agree that you will not use the Service to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Violate any applicable law or regulation.</li>
          <li>Attempt to cheat, exploit, or manipulate game outcomes.</li>
          <li>
            Use bots, scripts, or other automated tools to gain an unfair
            advantage.
          </li>
          <li>Interfere with or disrupt the Service or its infrastructure.</li>
        </ul>
        <p>
          You are solely responsible for securing your wallet, private keys, and
          access credentials. Loss or compromise of your wallet may result in the
          loss of your tokens.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Game Outcomes</h2>
        <p>
          Game outcomes are determined by smart contracts and/or verifiable
          randomness mechanisms on the blockchain. Once a transaction has been
          confirmed on-chain, the outcome is{' '}
          <span className="font-semibold">final and irreversible</span>.
        </p>
        <p>We do not offer refunds, chargebacks, or reversals.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, the operators, developers, and
          contributors to the Service are not liable for any indirect, incidental,
          special, consequential, or punitive damages, or for any loss of profits,
          data, or other intangible losses, resulting from:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your access to or use of the Service.</li>
          <li>Any conduct or content of any third party.</li>
          <li>Any unauthorized access to or use of your wallet.</li>
          <li>Any bugs, exploits, or malfunctions in smart contracts.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless the operators, developers, and
          contributors to the Service from and against any claims, damages,
          obligations, losses, liabilities, and expenses arising from your use of
          the Service or your violation of these Terms or applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">10. Modifications</h2>
        <p>
          We may update these Terms from time to time. When we do, we will update
          the &quot;Last updated&quot; date above. Your continued use of the Service
          after any changes become effective constitutes your acceptance of the
          revised Terms.
        </p>
      </section>

      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-semibold">11. Contact</h2>
        <p>
          If you have questions about these Terms, you may contact us at:
          <br />
          <span className="font-mono text-xs md:text-sm">
            support@basereserve.gold
          </span>
        </p>
      </section>
    </div>
  )
}
