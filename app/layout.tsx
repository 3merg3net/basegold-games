import type { Metadata } from 'next'
import '@rainbow-me/rainbowkit/styles.css'
import './globals.css'
import Providers from '@/components/wallet/Providers'
import SiteHeader from '@/components/wallet/SiteHeader'
import SiteFooter from '@/components/wallet/SiteFooter'
import RootClient from '@/components/wallet/RootClient'
import { WalletBarProvider } from '@/components/wallet/WalletBarProvider'
import AgeGateOverlay from '@/components/legal/AgeGateOverlay'
import { TestnetBanner } from '@/components/legal/TestnetBanner'
import RiskBanner from '@/components/legal/RiskBanner'

export const metadata: Metadata = {
  metadataBase: new URL("https://casino.basereserve.gold"), // <-- update to final domain

  title: {
    default: "Base Gold Rush — On-Chain Casino & Vegas Arcade",
    template: "%s | Base Gold Rush",
  },

  description:
    "A Vegas-style on-chain casino arcade built on Base. Play blackjack, roulette, slots, poker, dice & more using BGRC chips in the Arcade soon on-chain.",

  icons: {
    icon: "/images/goldrush-icon.png",
    shortcut: "/images/goldrush-icon.png",
    apple: "/images/goldrush-icon.png",
  },

  openGraph: {
    title: "Base Gold Rush — On-Chain Casino",
    description:
      "Vegas-grade on-chain gaming built on Base. Demo Arcade free. Mainnet casino coming soon.",
    url: "https://casino.basereserve.gold",
    siteName: "Base Gold Rush",
    type: "website",
    locale: "en_Vegas",
    images: [
      {
        url: "/images/og-base-gold-rush.png",
        width: 1200,
        height: 630,
        alt: "Base Gold Rush Casino Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Base Gold Rush",
    description:
      "Vegas-style on-chain casino built on Base. Blackjack, slots, roulette, poker, dice, and more.",
    images: ["/images/og-base-gold-rush.png"],
    creator: "@basegoldrush", // optional, change anytime
  },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-white min-h-screen">
        <Providers>
          <WalletBarProvider>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <TestnetBanner />

              <main className="flex-1">
                <RootClient>{children}</RootClient>
              </main>

              <RiskBanner />
              <SiteFooter />
              <AgeGateOverlay />
            </div>
          </WalletBarProvider>
        </Providers>
      </body>
    </html>
  )
}
