import type { Metadata } from 'next'
import './globals.css'
import { auth } from '@/auth'
import ContactHeader from '@/components/ContactHeader'
import SiteHeader from '@/components/SiteHeader'
import SkillsPanel from '@/components/SkillsPanel'
import Footer from '@/components/Footer'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: "Garret's World",
  description: 'A community blog where you earn XP for doing things!',
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
          <div className="min-h-screen flex flex-col">
            <ContactHeader />
            <SiteHeader />
            <div className="flex flex-1 w-full max-w-[1100px] mx-auto gap-2 px-2 py-3">
              <main className="flex-1 min-w-0">
                {children}
              </main>
              <SkillsPanel />
            </div>
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
