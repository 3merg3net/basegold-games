'use client'

export default function Terms() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-[#FFD700]">
        Terms & Disclosures
      </h2>

      <p className="text-white/70 text-sm">
        Welcome to <strong>Base Gold Rush</strong> (“Base Gold Rush”, “we”, “our”, “the Platform”).
        By accessing or using this site—including any games, tables, cashier features, or related tools—you agree to these Terms.
        If you do not agree, do not use the Platform.
      </p>

      {/* Platform overview */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Platform Overview</h3>
        <p className="text-white/70 text-sm">
          Base Gold Rush is a crypto-native gaming platform offering live poker, casino-style games,
          and arcade experiences. Access and gameplay may be provided through in-house chips and account-based balances
          tied to your Casino ID, and may integrate wallet-based interactions where applicable.
        </p>
      </section>

      {/* Chip system */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Chip System (GLD &amp; PGLD)</h3>

        <p className="text-white/70 text-sm">
          The Platform uses two primary in-house chip types:
        </p>

        <ul className="list-disc pl-6 text-white/70 text-sm space-y-1">
          <li>
            <strong>GLD</strong> — used across the casino floor, including slots, arcade games, and table-style games
            (including Blackjack).
          </li>
          <li>
            <strong>PGLD</strong> — used for live poker tables and poker-specific gameplay (e.g., table stacks and buy-ins).
          </li>
        </ul>

        <p className="text-white/70 text-sm">
          GLD and PGLD are <strong>in-house gameplay credits</strong> recorded in our systems and associated to your Casino ID
          (and, where enabled, may be associated with your connected wallet for access and settlement flows).
          They are not intended to represent an on-chain token or transferable currency unless explicitly stated in the Cashier or game UI.
        </p>
      </section>

      {/* Cashier */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Cashier &amp; Chip Access</h3>

        <p className="text-white/70 text-sm">
          Chip access may be provided through promotional grants, demo modes, rewards, and/or cashier-based swap mechanisms
          shown in the Cashier window. During early access, some balances and features may operate in demo or preview mode.
        </p>

        <p className="text-white/70 text-sm">
          When live cashier functionality is enabled, chip loading, withdrawal mechanics, limits, and any applicable fees
          will be clearly displayed in the Cashier window and related screens.
        </p>

        <p className="text-white/70 text-sm">
          If the Platform displays a path to acquire <strong>$BGLD</strong> via third-party services (e.g., DEX links),
          those services are independent and governed by their own terms. Always verify you are using the correct app and contract addresses.
        </p>
      </section>

      {/* Non-custodial */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Non-Custodial Use &amp; Security</h3>
        <p className="text-white/70 text-sm">
          Where wallet-based interactions are used, you control your wallet. We do not ask for your seed phrase or private keys.
          You are responsible for maintaining device security and protecting wallet credentials. Transactions on public blockchains
          (when used) may be irreversible.
        </p>
      </section>

      {/* Risk */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Risk Disclosure</h3>
        <p className="text-white/70 text-sm">
          Gameplay involves risk. Outcomes are not guaranteed, and you may lose some or all of the chips you use during play.
          Only participate using funds and balances you can afford to risk.
        </p>
        <p className="text-white/70 text-sm">
          Crypto assets can be volatile. Network congestion, software bugs, downtime, forks, and third-party issues may impact
          availability, settlement, and user experience.
        </p>
      </section>

      {/* Eligibility */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Eligibility &amp; Jurisdiction</h3>
        <p className="text-white/70 text-sm">
          You must be at least <strong>21 years old</strong> (or the age of majority in your jurisdiction) to use the Platform.
          You are responsible for ensuring your use complies with local laws and regulations. The Platform may restrict or disable
          access in certain regions or jurisdictions where participation is not permitted.
        </p>
      </section>

      {/* Responsible gaming */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Responsible Gaming</h3>
        <p className="text-white/70 text-sm">
          Play responsibly. Take breaks, set limits, and do not chase losses. If you believe you may have a gambling-related problem,
          stop playing and seek help. See the Responsible Gaming page for tools and resources.
        </p>
      </section>

      {/* No advice */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">No Advice</h3>
        <p className="text-white/70 text-sm">
          Nothing on this site is financial, investment, tax, or legal advice. You are responsible for your own decisions
          and for understanding the risks of crypto-based activity.
        </p>
      </section>

      {/* Changes */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Changes to the Platform</h3>
        <p className="text-white/70 text-sm">
          We may update or modify features, chip systems, access methods, and these Terms over time.
          Continued use of the Platform after changes go live constitutes acceptance of the updated Terms.
        </p>
      </section>

      {/* Limitation */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Limitation of Liability</h3>
        <p className="text-white/70 text-sm">
          To the maximum extent permitted by law, Base Gold Rush is provided “as is” and “as available”.
          We are not liable for indirect, incidental, special, consequential, or punitive damages, or for losses arising from
          gameplay outcomes, blockchain/network issues, or third-party services.
        </p>
      </section>

      {/* Contact */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Contact</h3>
        <p className="text-white/70 text-sm">
          Questions about these Terms can be directed to the contact method listed on the site footer or official social channels.
        </p>
      </section>

      <p className="text-xs text-white/50 pt-2">
        © {new Date().getFullYear()} Base Gold Rush. All rights reserved.
      </p>
    </div>
  )
}
