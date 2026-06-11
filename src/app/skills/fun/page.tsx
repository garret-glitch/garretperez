import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const GAMES = [
  { icon: '✦',  title: 'Lumina',       desc: 'Flow puzzle game',        href: '/game',                    xp: 'Endless',          bg: 'linear-gradient(135deg,#2a1a4a,#1a1230)', glow: '#9060ff' },
  { icon: '⚽', title: 'Ball Game',    desc: 'Keep the ball alive',     href: '/skills/fun/ballgame',     xp: 'High Score',       bg: 'linear-gradient(135deg,#2a1a08,#180e04)', glow: '#c07830' },
  { icon: '🔵', title: 'Drag Ball',    desc: 'Steer · dodge · collect', href: '/skills/fun/dragball',     xp: 'High Score',       bg: 'linear-gradient(135deg,#0a1a38,#050e20)', glow: '#4090e0' },
  { icon: '🍷', title: 'Wine Trivia',  desc: '10-question quiz',        href: '/skills/fun/wine-trivia',  xp: '+25 XP (7+/10)',   bg: 'linear-gradient(135deg,#3a1020,#1a0810)', glow: '#c03050' },
  { icon: '🃏', title: 'Matching',     desc: 'Memory card game',        href: '/skills/fun/matching',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a2a,#051818)', glow: '#30a090' },
  { icon: '🐍', title: 'Snake',        desc: 'Collect 10 coins',        href: '/skills/fun/snake',        xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a10,#051808)', glow: '#30a050' },
  { icon: '🧱', title: 'Breakout',     desc: 'Clear all the bricks',    href: '/skills/fun/breakout',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#1a1a0a,#0e0e04)', glow: '#c0a030' },
  { icon: '🦔', title: 'Whack-a-Mole', desc: '30s · score 10+',         href: '/skills/fun/whack-a-mole', xp: '+25 XP',           bg: 'linear-gradient(135deg,#2a1808,#180e04)', glow: '#b06830' },
  { icon: '🏓', title: 'Pong',         desc: 'vs CPU · first to 5',     href: '/skills/fun/pong',         xp: '+25 XP',           bg: 'linear-gradient(135deg,#181828,#0e0e18)', glow: '#8080c0' },
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
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all duration-150 hover:scale-105 hover:brightness-110"
            style={{
              background: g.bg,
              border: `1px solid ${g.glow}33`,
              boxShadow: `0 2px 12px ${g.glow}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}>
            <span style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(0 0 6px ${g.glow}99)` }}>
              {g.icon}
            </span>
            <div className="text-center">
              <div className="text-[9px] font-bold mb-0.5" style={{ color: '#e8e4d8' }}>{g.title}</div>
              <div className="text-[6px] mb-1 body-text" style={{ color: 'rgba(160,152,128,0.7)' }}>{g.desc}</div>
              <div className="text-[6px] font-bold" style={{ color: g.glow }}>{g.xp}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
