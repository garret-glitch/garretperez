import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel, xpProgress } from '@/lib/xp'
import AccountShield from '@/components/AccountShield'
import HeroCard from '@/components/HeroCard'
import HomepageBlockRenderer from '@/components/HomepageBlockRenderer'
import SkillsPanel from '@/components/SkillsPanel'
import type { PageBlock, HeroBlockConfig } from '@/types/builder'
import { migrateExistingSections } from '@/lib/builder-migration'
import { normalizeHeroConfig, applyStylesToElement } from '@/lib/block-defaults'


export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()

  let recentPosts: Array<{
    id: string; title: string; body: string; skill: string; createdAt: Date
    user: { username: string }
    upvotes: Array<{ userId: string }>
    replies: Array<{ id: string }>
  }> = []
  let totalPosts = 0
  let totalUsers = 0
  let headshot = ''
  let userBadges: string[] = []
  let garretTotalLevel = 9
  let garretXpBar = { currentXp: 0, neededXp: 100, percent: 0 }
  let garretTotalXpRaw = 0
  let dbProjects: Array<{ id: string; icon: string; title: string; desc: string; progress: number; href: string; updated: string }> = []
  let currentUserXp = 0
  let currentUserLevel = 1
  let currentUserXpBar = { currentXp: 0, neededXp: 100, percent: 0 }
  let heroCfg = normalizeHeroConfig(null)
  let heroStyles = applyStylesToElement({})
  let shieldColor = heroCfg.account.defaultTheme
  let contactPhone = heroCfg.contactPhone
  let contactEmail = heroCfg.contactEmail
  let contactLinkedin = heroCfg.contactLinkedin

  let homeBlocks: PageBlock[] = []
  let quests: Array<{ id: string; icon: string; title: string; description: string; xp: number; skill: string; href: string }> = []

  try {
    const allSettings = await (prisma as any).siteSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const s of allSettings) settingsMap[s.key] = s.value
    headshot = settingsMap.headshot ?? ''
    // Seed hero config from any legacy SiteSetting values (a hero block overrides these below)
    const heroSeed: Partial<HeroBlockConfig> = {}
    if (settingsMap.hero_title)     heroSeed.heroTitle       = settingsMap.hero_title
    if (settingsMap.hero_location)  heroSeed.heroLocation    = settingsMap.hero_location
    if (settingsMap.contact_phone)  heroSeed.contactPhone    = settingsMap.contact_phone
    if (settingsMap.contact_email)  heroSeed.contactEmail    = settingsMap.contact_email
    if (settingsMap.contact_linkedin) heroSeed.contactLinkedin = settingsMap.contact_linkedin
    heroCfg = normalizeHeroConfig(heroSeed)
    const rawBlocks = await (prisma as any).pageBlock.findMany({
      where: { pageSlug: 'home', visible: true },
      orderBy: { order: 'asc' },
    })
    const parseBlocks = (rows: ({ config: string; styles: string } & Record<string, unknown>)[]): PageBlock[] =>
      rows.map(b => ({
        ...b,
        config: (() => { try { return JSON.parse(b.config as string) } catch { return {} } })(),
        styles: (() => { try { return JSON.parse(b.styles as string) } catch { return {} } })(),
      })) as PageBlock[]

    homeBlocks = parseBlocks(rawBlocks)

    // Auto-seed blocks on first visit after deploy
    if (homeBlocks.length === 0) {
      try {
        await migrateExistingSections()
        const seeded = await (prisma as any).pageBlock.findMany({
          where: { pageSlug: 'home', visible: true },
          orderBy: { order: 'asc' },
        })
        homeBlocks = parseBlocks(seeded)
      } catch { /* migration failed silently */ }
    }

    // A hero block (edited in the builder) is the source of truth for the hero + account card
    const heroBlock = homeBlocks.find(b => b.type === 'hero')
    if (heroBlock) {
      heroCfg = normalizeHeroConfig(heroBlock.config as Partial<HeroBlockConfig>)
      heroStyles = applyStylesToElement(heroBlock.styles)
    }
    contactPhone    = heroCfg.contactPhone
    contactEmail    = heroCfg.contactEmail
    contactLinkedin = heroCfg.contactLinkedin
    shieldColor     = heroCfg.account.defaultTheme


    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { skills: { select: { xp: true } } },
    })
    if (adminUser?.skills?.length) {
      garretTotalLevel = adminUser.skills.reduce((s: number, sk: { xp: number }) => s + xpToLevel(sk.xp), 0)
      garretTotalXpRaw = adminUser.skills.reduce((s: number, sk: { xp: number }) => s + sk.xp, 0)
      garretXpBar = xpProgress(garretTotalXpRaw)
    }

    totalPosts = await prisma.post.count()
    totalUsers = await prisma.user.count()

    try {
      recentPosts = await (prisma as any).post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { username: true } },
          upvotes: { select: { userId: true } },
          replies: { select: { id: true } },
        },
      })
    } catch { /* relation tables may not exist yet */ }

    dbProjects = await (prisma as any).project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: 3,
    })

    quests = await (prisma as any).quest.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })

    if (session?.user?.id) {
      const [badges, userSkills, userData] = await Promise.all([
        (prisma as any).userBadge.findMany({ where: { userId: session.user.id }, select: { badge: true } }),
        prisma.userSkill.findMany({ where: { userId: session.user.id } }),
        prisma.user.findUnique({ where: { id: session.user.id } }),
      ])
      userBadges = badges.map((b: { badge: string }) => b.badge)
      currentUserXp = userSkills.reduce((s: number, sk: { xp: number }) => s + sk.xp, 0)
      currentUserLevel = xpToLevel(currentUserXp)
      currentUserXpBar = xpProgress(currentUserXp)
      shieldColor = (userData as any)?.shieldColor ?? heroCfg.account.defaultTheme
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-5 fade-in">

      {/* ─── HERO + ACCOUNT ROW ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch" style={{ gap: 20 }}>

        {/* ── Hero panel — fully editable via the Hero block in /admin/builder ── */}
        <HeroCard
          cfg={heroCfg}
          headshot={headshot}
          totalMembers={totalUsers}
          totalPosts={totalPosts}
          garretLevel={garretTotalLevel}
          xpBar={garretXpBar}
          style={heroStyles}
        />

        {/* ─── Account shield ───────────────────────────── */}
        <AccountShield
          username={session?.user?.name ?? null}
          level={currentUserLevel}
          xp={currentUserXp}
          xpPercent={currentUserXpBar.percent}
          isLoggedIn={!!session?.user}
          initColor={shieldColor}
          loggedOutTitle={heroCfg.account.loggedOutTitle}
          loggedOutIcon={heroCfg.account.loggedOutIcon}
          registerLabel={heroCfg.account.registerLabel}
          loginLabel={heroCfg.account.loginLabel}
        />

      </div>

      <HomepageBlockRenderer
        blocks={homeBlocks}
        dbProjects={dbProjects}
        recentPosts={recentPosts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        hasSession={!!session?.user}
        userBadges={userBadges}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        contactLinkedin={contactLinkedin}
        quests={quests}
      />

      {/* ─── Mobile-only: full skills panel at bottom ────────── */}
      <div className="md:hidden mobile-skills-panel">
        <SkillsPanel />
      </div>

    </div>
  )
}
