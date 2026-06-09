import type { Metadata } from 'next'
import './globals.css'
import { auth } from '@/auth'
import SkillsPanel from '@/components/SkillsPanel'
import SiteHeader from '@/components/SiteHeader'
import SessionProvider from '@/components/SessionProvider'

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
          <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-page)' }}>
            {/* Header — always visible; primary nav on mobile */}
            <SiteHeader />

            <div className="flex flex-1 min-h-0">
              {/* Sidebar — hidden on mobile, shown on md+ */}
              <div className="hidden md:block md:shrink-0">
                <SkillsPanel />
              </div>

              <main className="flex-1 min-w-0 px-4 py-4 sm:px-5 sm:py-5" style={{ maxWidth: '1200px' }}>
                {children}
              </main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
