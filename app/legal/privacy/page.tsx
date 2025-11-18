import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Base Gold Rush',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12 text-sm md:text-base space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-xs text-neutral-400">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-neutral-200">
        This Privacy Policy explains how Base Gold Rush (&quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;) handles information when you access or use our website or related
        services (the &quot;Service&quot;).
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Information We Do Not Collect</h2>
        <p>We do not require you to create a traditional account, and we do not knowingly collect:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Full legal names</li>
          <li>Postal addresses</li>
          <li>Payment card numbers</li>
          <li>Government IDs</li>
          <li>Private keys or seed phrases</li>
        </ul>
        <p>
          You interact with the Service directly through your self-custodied wallet.
          You should never share your private keys or seed phrase with anyone,
          including us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          2. Information We May Collect Automatically
        </h2>
        <p>
          Like most websites, we may automatically collect limited technical information
          when you use the Service, such as:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>IP address and general location (country/region)</li>
          <li>Browser type and version</li>
          <li>Device type and operating system</li>
          <li>Referring/exit pages and URLs</li>
          <li>Basic interaction logs (pages viewed, clicks)</li>
        </ul>
        <p>
          We use this information to monitor performance, detect abuse, and improve
          the Service. We do not sell or rent this information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Wallet and Blockchain Data</h2>
        <p>
          When you connect a wallet, we may view and use your public wallet address
          and on-chain activity relevant to the Service (such as balances and transactions
          interacting with our contracts).
        </p>
        <p>
          All blockchain transactions are public by design and permanently stored on
          the relevant blockchain network. We do not control, edit, or delete on-chain
          data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Cookies and Local Storage</h2>
        <p>
          We may use cookies and similar technologies to remember your preferences
          (for example, theme settings or age-gate confirmation) and to support basic
          analytics.
        </p>
        <p>
          We may also use local storage in your browser to store non-sensitive data
          such as demo chip balances or flags indicating that you have accepted certain
          prompts. You can clear this data through your browser settings at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Third-Party Services</h2>
        <p>The Service may integrate third-party providers, such as:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Analytics services</li>
          <li>RPC and node providers</li>
          <li>Wallet connection libraries (e.g., WalletConnect, RainbowKit)</li>
        </ul>
        <p>
          These providers may collect information in accordance with their own privacy
          policies. We encourage you to review the privacy policies of any third-party
          services you use in connection with the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Data Security</h2>
        <p>
          We use reasonable technical and organizational measures to help protect the
          information we control. However, no method of transmission or storage is
          100% secure, and we cannot guarantee absolute security.
        </p>
        <p>You are responsible for securing your own devices, wallets, and private keys.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Children</h2>
        <p>
          The Service is intended for adults. We do not knowingly collect information
          from anyone under 18 years old. If you believe we may have inadvertently
          collected information from a minor, please contact us so we can investigate
          and, where appropriate, delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          update the &quot;Last updated&quot; date above. Your continued use of the
          Service after any changes become effective constitutes your acceptance of
          the revised Policy.
        </p>
      </section>

      <section className="space-y-3 pb-4">
        <h2 className="text-lg font-semibold">9. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, you may contact us at:
          <br />
          <span className="font-mono text-xs md:text-sm">
            support@basereserve.gold
          </span>
        </p>
      </section>
    </div>
  )
}
