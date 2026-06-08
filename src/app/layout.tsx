import type { Metadata } from 'next'
import './globals.css'
import { auth } from '@/auth'
import SiteHeader from '@/components/SiteHeader'
import SkillsPanel from '@/components/SkillsPanel'
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
          <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
            <SiteHeader />
            <div className="flex flex-1 w-full max-w-[1440px] mx-auto">
              <SkillsPanel />
              <main className="flex-1 min-w-0 px-5 py-5">
                {children}
              </main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
