import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillBySlug } from '@/lib/skills'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import SkillHeroBar from '@/components/SkillHeroBar'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import { SkillType } from '@prisma/client'
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
  { icon: '📦', title: 'Wine Stocker', desc: 'Stock shelves · dodge mgr', href: '/skills/fun/wine-stocker', xp: '+25 XP (400+ pts)', bg: 'linear-gradient(135deg,#1a0a14,#0e0508)', glow: '#b03060' },
]

export default async function FunPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const skillMeta = getSkillBySlug('fun')!

  let communityXp = 0
  let communityMemberCount = 0
  let hiddenGames: string[] = []
  let gameOrder: string[] = []

  try {
    const [communityData, hiddenSetting, orderSetting] = await Promise.all([
      getCommunityXpForSkill('FUN' as SkillType),
      (prisma as any).siteSetting.findUnique({ where: { key: 'hidden_games' } }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'game_order' } }),
    ])
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    if (hiddenSetting) {
      hiddenGames = JSON.parse(hiddenSetting.value) as string[]
    }
    if (orderSetting) {
      gameOrder = JSON.parse(orderSetting.value) as string[]
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-4">
      {session?.user && <SkillVisitTracker skill={'FUN' as SkillType} />}

      <SkillHeroBar
        skill={skillMeta}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        isLoggedIn={!!session?.user}
      />

      <GameGrid games={GAMES} initialHidden={hiddenGames} initialOrder={gameOrder} isAdmin={isAdmin} />
    </div>
  )
}
