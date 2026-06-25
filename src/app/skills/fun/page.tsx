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
  { icon: '✦',  title: 'Lumina',       desc: 'Light the path. Clear the grid. Find your flow.',        href: '/game',                    xp: 'Endless',          bg: 'linear-gradient(135deg,#2a1a4a,#1a1230)', glow: '#9060ff', featured: true },
  { icon: '⚽', title: 'Ball Game',    desc: 'Keep the ball alive',     href: '/skills/fun/ballgame',     xp: 'High Score',       bg: 'linear-gradient(135deg,#2a1a08,#180e04)', glow: '#c07830' },
  { icon: '🔵', title: 'Drag Ball',    desc: 'Steer · dodge · collect', href: '/skills/fun/dragball',     xp: 'High Score',       bg: 'linear-gradient(135deg,#0a1a38,#050e20)', glow: '#4090e0' },
  { icon: '🍷', title: 'Wine Trivia',  desc: '10-question quiz',        href: '/skills/fun/wine-trivia',  xp: '+25 XP (7+/10)',   bg: 'linear-gradient(135deg,#3a1020,#1a0810)', glow: '#c03050' },
  { icon: '🃏', title: 'Matching',     desc: 'Memory card game',        href: '/skills/fun/matching',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a2a,#051818)', glow: '#30a090' },
  { icon: '🐍', title: 'Snake',        desc: 'Collect 10 coins',        href: '/skills/fun/snake',        xp: '+25 XP',           bg: 'linear-gradient(135deg,#0a2a10,#051808)', glow: '#30a050' },
  { icon: '🧱', title: 'Breakout',     desc: 'Clear all the bricks',    href: '/skills/fun/breakout',     xp: '+25 XP',           bg: 'linear-gradient(135deg,#1a1a0a,#0e0e04)', glow: '#c0a030' },
  { icon: '🦔', title: 'Whack-a-Mole', desc: '30s · score 10+',        href: '/skills/fun/whack-a-mole', xp: '+25 XP',           bg: 'linear-gradient(135deg,#2a1808,#180e04)', glow: '#b06830' },
  { icon: '🏓', title: 'Pong',         desc: 'vs CPU · first to 5',     href: '/skills/fun/pong',         xp: '+25 XP',           bg: 'linear-gradient(135deg,#181828,#0e0e18)', glow: '#8080c0' },
  { icon: '🍷', title: 'Wine Rush', desc: 'Stock shelves fast and survive the rush.', href: '/skills/fun/wine-stocker', xp: '+25 XP (400+ pts)', bg: 'linear-gradient(135deg,#1a0a14,#0e0508)', glow: '#b03060', featured: true },
  { icon: '⚔️', title: 'Boss Hunter', desc: 'Top-down action RPG. Hunt 3 legendary bosses.', href: '/skills/fun/boss-hunter', xp: '+25 XP', bg: 'linear-gradient(135deg,#1a0a2a,#0e0518)', glow: '#9060c0', featured: true },
  { icon: '🏴‍☠️', title: 'Pirate Carnage', desc: 'Twisted Metal on the ocean. 1-2P co-op vs a 3-boss gauntlet.', href: '/skills/fun/pirate-carnage', xp: '+25 XP', bg: 'linear-gradient(135deg,#0a2438,#06121e)', glow: '#ff6b2b', featured: true },
  { icon: '👑', title: 'Castle Dress Up', desc: 'Magical dress-up adventure. Style your empress, win fashion shows, unlock outfits & pets.', href: '/skills/fun/dress-empress', xp: '+25 XP', bg: 'linear-gradient(135deg,#3a1430,#2a0e22)', glow: '#ff8fc0', featured: true },
  { icon: '🏎️', title: 'Sunset Drift', desc: 'Arcade street racer. Drift, boost, beat rivals, and build your dream car.', href: '/skills/fun/sunset-drift', xp: 'Career + Garage', bg: 'linear-gradient(135deg,#3a2350,#ff9e57)', glow: '#ff8a3d', featured: true },
]

export default async function FunPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const skillMeta = getSkillBySlug('fun')!

  let communityXp = 0
  let communityMemberCount = 0
  let hiddenGames: string[] = []
  let gameOrder: string[] = []
  let gameImages: Record<string, string> = {}
  const likeCounts: Record<string, number> = {}
  let userLikedHrefs: string[] = []

  try {
    const userId = session?.user?.id
    const [communityData, hiddenSetting, orderSetting, imagesSetting, allLikes, userLikeRows] = await Promise.all([
      getCommunityXpForSkill('FUN' as SkillType),
      (prisma as any).siteSetting.findUnique({ where: { key: 'hidden_games' } }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'game_order' } }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'game_images' } }),
      (prisma as any).gameLike.groupBy({ by: ['gameHref'], _count: { gameHref: true } }),
      userId
        ? (prisma as any).gameLike.findMany({ where: { userId }, select: { gameHref: true } })
        : Promise.resolve([]),
    ])
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    if (hiddenSetting) hiddenGames = JSON.parse(hiddenSetting.value) as string[]
    if (orderSetting) gameOrder = JSON.parse(orderSetting.value) as string[]
    if (imagesSetting) gameImages = JSON.parse(imagesSetting.value) as Record<string, string>
    for (const row of allLikes as { gameHref: string; _count: { gameHref: number } }[]) {
      likeCounts[row.gameHref] = row._count.gameHref
    }
    userLikedHrefs = (userLikeRows as { gameHref: string }[]).map(r => r.gameHref)
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

      <GameGrid
        games={GAMES}
        initialHidden={hiddenGames}
        initialOrder={gameOrder}
        initialImages={gameImages}
        isAdmin={isAdmin}
        isLoggedIn={!!session?.user}
        initialLikeCounts={likeCounts}
        initialUserLikes={userLikedHrefs}
      />
    </div>
  )
}
