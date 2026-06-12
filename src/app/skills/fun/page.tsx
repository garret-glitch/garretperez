import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import Link from 'next/link'
import GameGrid, { type GameDef } from '@/components/GameGrid'

export const dynamic = 'force-dynamic'

const GAMES: GameDef[] = [
  { icon: '✦',  title: 'Lumina',       desc: 'Flow puzzle game',        href: '/game',                    xp: 'Endless',          bg: 'linear-gradient(135deg,#2a1a4a,#1a1230)', glow: '#9060ff' },
  { icon: '⚽', title: 'Ball Game',    desc: 'Keep the ball alive',     href: '/skills/fun/ballgame',     xp: 'High Score',       bg: 'linear-gradient(135deg,#2a1a08,#180e04)', glow: '#c07830' },
  { icon: '🔵', title: 'Drag Ball',    desc: 'Steer · dodge · collect', href: '/skills/fun/dragball',     xp: 'High Score',       bg: 'linear-gradient(135deg,#0a1a38,#050e20)', glow: '#4090e0' },
  { icon: '🍷', title: 'Wine Trivia',  desc: '10-question quiz',        href: '/skills/fun/wine-trivia',  xp: '+25 XP (7+/10)',   bg: 'linear-gradient(135deg,#3a1020,#1a0810)', glow: '#c03050' },
  { icon: '🃏', title: 'Matching',     desc: 'Memory card game',        href: '/skills/fun/matching',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a2a,#051818)', glow: '#30a090' },
  { icon: '🐍', title: 'Snake',        desc: 'Collect 10 coins',        href: '/skills/fun/snake',        xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a10,#051808)', glow: '#30a050' },
  { icon: '🧱', title: 'Breakout',     desc: 'Clear all the bricks',    href: '/skills/fun/breakout',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#1a1a0a,#0e0e04)', glow: '#c0a030' },
  { icon: '🦔', title: 'Whack-a-Mole', desc: '30s · score 10+',        href: '/skills/fun/whack-a-mole', xp: '+25 XP',           bg: 'linear-gradient(135deg,#2a1808,#180e04)', glow: '#b06830' },
  { icon: '🏓', title: 'Pong',         desc: 'vs CPU · first to 5',     href: '/skills/fun/pong',         xp: '+25 XP',           bg: 'linear-gradient(135deg,#181828,#0e0e18)', glow: '#8080c0' },
  { icon: '🍷', title: 'Wine Stocker', desc: 'Stock shelves · dodge mgr', href: '/skills/fun/wine-stocker', xp: '+25 XP (400+ pts)', bg: 'linear-gradient(135deg,#1a0a14,#0e0508)', glow: '#b03060' },
]

export default async function FunPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  let userXp = 0
  let hiddenGames: string[] = []

  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FUN' } },
      })
      userXp = userSkill?.xp ?? 0
    }

    const hiddenSetting = await (prisma as any).siteSetting.findUnique({ where: { key: 'hidden_games' } })
    if (hiddenSetting) {
      hiddenGames = JSON.parse(hiddenSetting.value) as string[]
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-4">
      <div className="rp-card">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎮</span>
          <div>
            <h1 className="text-[12px]" style={{ color: 'var(--text-1)' }}>More Games</h1>
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

      <GameGrid games={GAMES} initialHidden={hiddenGames} isAdmin={isAdmin} />
    </div>
  )
}
