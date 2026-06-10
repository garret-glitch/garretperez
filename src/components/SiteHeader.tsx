import { auth } from '@/auth'
import AuthButton from './AuthButton'
import MobileCommunitiesMenu from './MobileCommunitiesMenu'
import Link from 'next/link'

export default async function SiteHeader() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <header
      className="px-4 sm:px-5 py-3 flex items-center gap-3 sticky top-0 z-50"
      style={{ background: '#1e1008', borderBottom: '2px solid #5a3818' }}
    >
      {/* Logo — always visible */}
      <Link
        href="/"
        className="text-[11px] font-bold shrink-0 mr-2"
        style={{ color: 'var(--gold)' }}
      >
        Home
      </Link>

      {/* Desktop nav links — hidden on mobile (sidebar handles navigation) */}
      <div className="hidden md:flex items-center gap-6 flex-1">
        <Link href="/resume" className="text-[8px] transition-colors hover:opacity-80" style={{ color: '#c8a870' }}>
          Resume
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-[8px]" style={{ color: '#e8c060' }}>
            Admin
          </Link>
        )}
      </div>

      {/* Spacer on mobile so Communities + Auth sit on the right */}
      <div className="flex-1 md:hidden" />

      {/* Communities dropdown — mobile only */}
      <MobileCommunitiesMenu isAdmin={isAdmin} />

      {/* Auth — always visible */}
      <AuthButton session={session} />
    </header>
  )
}
