import { auth } from '@/auth'
import AuthButton from './AuthButton'
import Link from 'next/link'

export default async function SiteHeader() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <header style={{ background: '#0a0a10', borderBottom: '1px solid #1e1e2c' }}
      className="px-5 py-2.5 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>
          GP
        </Link>
        <Link href="/quest-board" className="text-[7px] hover:opacity-80 transition-opacity" style={{ color: 'var(--text-2)' }}>
          Quests
        </Link>
        <Link href="/resume" className="text-[7px] hover:opacity-80 transition-opacity" style={{ color: 'var(--text-2)' }}>
          Resume
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-[7px] hover:opacity-80 transition-opacity" style={{ color: 'var(--gold)' }}>
            Admin
          </Link>
        )}
      </div>
      <AuthButton session={session} />
    </header>
  )
}
