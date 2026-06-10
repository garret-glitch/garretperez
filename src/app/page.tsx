import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel, xpProgress } from '@/lib/xp'
import AccountShield from '@/components/AccountShield'
import HomepageBlockRenderer from '@/components/HomepageBlockRenderer'
import type { PageBlock } from '@/types/builder'
import { migrateExistingSections } from '@/lib/builder-migration'


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
  let shieldColor = '#1a0e06'
  let heroTitle = 'Sales Supervisor · Builder · Family Man'
  let heroLocation = 'Houston, TX'
  let contactPhone = '(346) 604-1635'
  let contactEmail = 'gis.owner@gmail.com'
  let contactLinkedin = 'garretperez'

  let homeBlocks: PageBlock[] = []

  try {
    const allSettings = await (prisma as any).siteSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const s of allSettings) settingsMap[s.key] = s.value
    headshot = settingsMap.headshot ?? ''
    if (settingsMap.hero_title) heroTitle = settingsMap.hero_title
    if (settingsMap.hero_location) heroLocation = settingsMap.hero_location
    if (settingsMap.contact_phone) contactPhone = settingsMap.contact_phone
    if (settingsMap.contact_email) contactEmail = settingsMap.contact_email
    if (settingsMap.contact_linkedin) contactLinkedin = settingsMap.contact_linkedin
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

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { skills: { select: { xp: true } } },
    })
    if (adminUser?.skills?.length) {
      garretTotalLevel = adminUser.skills.reduce((s: number, sk: { xp: number }) => s + xpToLevel(sk.xp), 0)
      garretTotalXpRaw = adminUser.skills.reduce((s: number, sk: { xp: number }) => s + sk.xp, 0)
      garretXpBar = xpProgress(garretTotalXpRaw)
    }

    recentPosts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        user: { select: { username: true } },
        upvotes: { select: { userId: true } },
        replies: { select: { id: true } },
      },
    })
    totalPosts = await prisma.post.count()
    totalUsers = await prisma.user.count()

    dbProjects = await (prisma as any).project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: 3,
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
      shieldColor = (userData as any)?.shieldColor ?? '#1a0e06'
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-5 fade-in">

      {/* ─── HERO + ACCOUNT ROW ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">

        {/* Hero panel */}
        <div className="hero-panel flex-1 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">

            {/* Photo — square */}
            <div className="shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden flex items-center justify-center text-2xl font-bold"
                style={{ border: '2px solid var(--border-lit)', background: 'var(--bg-page)', color: 'var(--gold)' }}>
                {headshot
                  ? <img src={headshot} alt="Garret Perez" className="w-full h-full object-cover" />
                  : 'GP'}
              </div>
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 style={{
                  fontSize: 26, lineHeight: 1.1, color: 'var(--text-1)',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 700,
                  textShadow: '0 0 22px rgba(200,155,60,0.4), 1px 1px 3px rgba(0,0,0,0.9)',
                  letterSpacing: '0.04em',
                }}>Garret Perez</h1>
                <span className="text-[7px] px-2 py-0.5" style={{ background: 'rgba(200,155,60,0.15)', color: 'var(--gold)', border: '1px solid rgba(200,155,60,0.35)' }}>
                  ⚔ Level {garretTotalLevel}
                </span>
              </div>

              <div className="body-text text-[13px] font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>
                {heroTitle}
              </div>
              <div className="body-text text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
                📍 {heroLocation}
              </div>

              {/* Stat chips — square */}
              <div className="flex gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1"
                  style={{ background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.22)' }}>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>{totalUsers}</span>
                  <span className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>Members</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1"
                  style={{ background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.22)' }}>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>{totalPosts}</span>
                  <span className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>Posts</span>
                </div>
              </div>

              {/* XP bar */}
              <div className="flex items-center gap-3">
                <div className="xp-bar flex-1">
                  <div className="xp-bar-fill" style={{ width: `${garretXpBar.percent}%` }} />
                </div>
                <span className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>
                  {garretXpBar.currentXp} / {garretXpBar.neededXp} XP
                </span>
              </div>
            </div>

            {/* Contact panel — desktop: vertical card; mobile: icon row */}
            <div className="hidden sm:flex flex-col sm:shrink-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(200,155,60,0.22)', minWidth: 170 }}>
              <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'rgba(200,155,60,0.15)' }}>
                <span className="text-[6px] uppercase tracking-widest" style={{ color: '#a07848' }}>⚔ Contact</span>
              </div>
              <div className="flex flex-col">
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#2a1a0a', borderRadius: 2 }}>📞</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#1a2a1a', borderRadius: 2 }}>✉️</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>{contactEmail}</div>
                  </div>
                </a>
                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#1a1a3a', borderRadius: 2 }}>🔗</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LinkedIn</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>{contactLinkedin}</div>
                  </div>
                </a>
                <div className="px-3 py-2.5">
                  <a href="/resume" className="osrs-btn text-center block" style={{ fontSize: 6 }}>📄 Resume</a>
                </div>
              </div>
            </div>

            {/* Mobile contact row */}
            <div className="sm:hidden flex items-center justify-around gap-2 pt-1">
              {[
                { href: `tel:${contactPhone.replace(/\D/g, '')}`, icon: '📞', label: 'Call' },
                { href: `mailto:${contactEmail}`, icon: '✉️', label: 'Email' },
                { href: `https://www.linkedin.com/in/${contactLinkedin}`, icon: '🔗', label: 'LinkedIn', external: true },
                { href: '/resume', icon: '📄', label: 'Resume' },
              ].map(item => (
                <a key={item.label} href={item.href}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex flex-col items-center gap-1 flex-1 py-2 rounded transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)' }}>
                  <span className="text-xl">{item.icon}</span>
                  <span style={{ fontSize: 8, color: '#a07848' }}>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Account shield ───────────────────────────── */}
        <AccountShield
          username={session?.user?.name ?? null}
          level={currentUserLevel}
          xp={currentUserXp}
          xpPercent={currentUserXpBar.percent}
          isLoggedIn={!!session?.user}
          initColor={shieldColor}
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
      />


    </div>
  )
}
