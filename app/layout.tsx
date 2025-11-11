import type { Metadata } from 'next'
import '@rainbow-me/rainbowkit/styles.css'
import './globals.css'
import Providers from '@/components/Providers'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Base Gold Rush',
  description: 'Play-to-win jackpot games on Base. Mine, Pan, Slots, Poker — all on-chain.',
  openGraph: {
    title: 'Base Gold Rush',
    description: 'Mine the chain. Strike the Motherlode.',
    images: ['/images/og-bgld-games.png'],
  },
  icons: { icon: '/images/goldrush-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body className="min-h-screen text-white antialiased bg-[radial-gradient(1200px_600px_at_50%_-200px,#0f1220_0%,transparent_60%)]">
        <Providers>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
