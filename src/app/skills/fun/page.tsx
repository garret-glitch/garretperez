import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const GAMES = [
  { icon: '🍷', title: 'Wine Trivia', desc: '10-question quiz',      href: '/skills/fun/wine-trivia',  xp: '+25 XP (7+/10)' },
  { icon: '🃏', title: 'Matching',    desc: 'Memory card game',      href: '/skills/fun/matching',     xp: '+25 XP' },
  { icon: '🐍', title: 'Snake',       desc: 'Collect 10 coins',      href: '/skills/fun/snake',        xp: '+25 XP' },
  { icon: '🧱', title: 'Breakout',    desc: 'Clear all the bricks',  href: '/skills/fun/breakout',     xp: '+25 XP' },
  { icon: '🦔', title: 'Whack-a-Mole',desc: '30s · score 10+',      href: '/skills/fun/whack-a-mole', xp: '+25 XP' },
  { icon: '🏓', title: 'Pong',        desc: 'vs CPU · first to 5',   href: '/skills/fun/pong',         xp: '+25 XP' },
]

export default async function FunPage() {
  const session = await auth()

  let userXp = 0
  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FUN' } },
      })
      userXp = userSkill?.xp ?? 0
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-4">
      <div className="rp-card">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="text-[12px]" style={{ color: 'var(--text-1)' }}>Fun Zone</h1>
            <p className="text-[7px] mt-0.5" style={{ color: 'var(--text-3)' }}>Play mini-games to earn Fun XP</p>
          </div>
        </div>
        {session?.user && (
          <div className="mt-3">
            <XpBar xp={userXp} skillName="Fun" />
          </div>
        )}
        {!session?.user && (
          <p className="text-[7px] mt-2" style={{ color: 'var(--text-3)' }}>
            <Link href="/login" style={{ color: 'var(--gold)' }}>Login</Link>
            {' '}to save your XP when you win!
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {GAMES.map(g => (
          <Link key={g.href} href={g.href}
            className="rp-card block hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--border)' }}>
            <div className="text-center py-1">
              <div className="text-3xl mb-2">{g.icon}</div>
              <div className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-1)' }}>{g.title}</div>
              <div className="text-[6px] mb-1" style={{ color: 'var(--text-3)' }}>{g.desc}</div>
              <div className="text-[6px] font-bold" style={{ color: 'var(--gold)' }}>{g.xp}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
