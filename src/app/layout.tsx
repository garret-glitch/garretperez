import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}
import { auth } from '@/auth'
import SkillsPanel from '@/components/SkillsPanel'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import SessionProvider from '@/components/SessionProvider'
import AdminFloatingBar from '@/components/AdminFloatingBar'
import XpTracker from '@/components/XpTracker'
import XpToast from '@/components/XpToast'

export const metadata: Metadata = {
  title: 'Garret Perez',
  description: 'Sales professional, builder, creator — personal hub and community platform.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <XpTracker />
          <XpToast />
          <AdminFloatingBar isAdmin={session?.user?.role === 'ADMIN'} />
          <div className="flex flex-col min-h-screen" style={{
            background: 'var(--bg-page)',
            paddingTop: session?.user?.role === 'ADMIN' ? 38 : 0,
          }}>
            <SiteHeader />
            <div className="flex flex-1 min-h-0">
              {/* Sidebar — hidden on mobile, shown on md+ */}
              <div className="hidden md:flex md:flex-col md:shrink-0 md:self-stretch">
                <SkillsPanel />
              </div>

              <main className="flex-1 min-w-0 px-4 py-4 sm:px-5 sm:py-5">
                {children}
              </main>
            </div>
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
