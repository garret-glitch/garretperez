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
      style={{ background: '#0a0a10', borderBottom: '1px solid #2a2418' }}
    >
      {/* Logo — always visible */}
      <Link
        href="/"
        className="text-[11px] font-bold shrink-0 mr-2"
        style={{ color: 'var(--gold)' }}
      >
        GP
      </Link>

      {/* Desktop nav links — hidden on mobile (sidebar handles navigation) */}
      <div className="hidden md:flex items-center gap-6 flex-1">
        <Link href="/quest-board" className="text-[8px] transition-colors hover:opacity-80" style={{ color: 'var(--text-2)' }}>
          Quests
        </Link>
        <Link href="/resume" className="text-[8px] transition-colors hover:opacity-80" style={{ color: 'var(--text-2)' }}>
          Resume
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-[8px]" style={{ color: 'var(--gold)' }}>
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
