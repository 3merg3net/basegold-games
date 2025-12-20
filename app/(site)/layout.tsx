// app/(site)/layout.tsx
import SiteHeader from '@/components/wallet/SiteHeader'
import SiteFooter from '@/components/wallet/SiteFooter'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
