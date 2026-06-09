import { auth } from '@/auth'
import AuthButton from './AuthButton'
import Link from 'next/link'

export default async function SiteHeader() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <header
      className="px-4 sm:px-5 py-3 flex items-center justify-between sticky top-0 z-50"
      style={{ background: '#0a0a10', borderBottom: '1px solid #2a2418' }}
    >
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/"
          className="text-[11px] font-bold transition-colors hover:opacity-90"
          style={{ color: 'var(--gold)' }}
        >
          GP
        </Link>
        <Link
          href="/quest-board"
          className="text-[8px] transition-colors hover:text-[var(--text-1)]"
          style={{ color: 'var(--text-2)' }}
        >
          Quests
        </Link>
        <Link
          href="/resume"
          className="text-[8px] transition-colors hover:text-[var(--text-1)]"
          style={{ color: 'var(--text-2)' }}
        >
          Resume
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-[8px] transition-colors"
            style={{ color: 'var(--gold)' }}
          >
            Admin
          </Link>
        )}
      </div>
      <AuthButton session={session} />
    </header>
  )
}
