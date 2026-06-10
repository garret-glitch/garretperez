import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel, xpProgress } from '@/lib/xp'
import AccountShield from '@/components/AccountShield'
import HomepageBlockRenderer from '@/components/HomepageBlockRenderer'
import type { PageBlock } from '@/types/builder'
import { migrateExistingSections } from '@/lib/builder-migration'
import { Phone, Mail, FileText } from 'lucide-react'


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
  let quests: Array<{ id: string; icon: string; title: string; description: string; xp: number; skill: string; href: string }> = []

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
      shieldColor = (userData as any)?.shieldColor ?? '#1a0e06'
    }
  } catch { /* DB not configured */ }

  return (
    <div className="space-y-5 fade-in">

      {/* ─── HERO + ACCOUNT ROW ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">

        {/* ── Hero panel — unified dashboard ──────────────────── */}
        <div className="hero-panel flex-1 min-w-0">
          <div className="flex gap-4 sm:gap-5 items-stretch">

            {/* 1 ── Large profile photo (desktop) */}
            <div className="hidden sm:flex shrink-0 items-center">
              <div
                className="overflow-hidden flex items-center justify-center font-bold"
                style={{
                  width: 175, height: 175,
                  border: '2px solid var(--border-lit)',
                  background: 'var(--bg-page)',
                  color: 'var(--gold)',
                  fontSize: 32,
                  boxShadow: '0 0 0 4px rgba(200,155,60,0.08), 0 6px 28px rgba(0,0,0,0.6)',
                  flexShrink: 0,
                }}
              >
                {headshot
                  ? <img src={headshot} alt="Garret Perez" className="w-full h-full object-cover" />
                  : 'GP'}
              </div>
            </div>

            {/* 2 ── Center: name + stats + XP */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">

              {/* Mobile: small photo + name side-by-side */}
              <div className="flex items-start gap-3">
                <div className="sm:hidden shrink-0">
                  <div
                    className="overflow-hidden flex items-center justify-center font-bold"
                    style={{ width: 68, height: 68, border: '2px solid var(--border-lit)', background: 'var(--bg-page)', color: 'var(--gold)', fontSize: 16 }}
                  >
                    {headshot
                      ? <img src={headshot} alt="Garret Perez" className="w-full h-full object-cover" />
                      : 'GP'}
                  </div>
                </div>
                <div>
                  <h1 style={{
                    fontSize: 24, lineHeight: 1.1, color: 'var(--text-1)',
                    fontFamily: "'Cinzel', serif", fontWeight: 700,
                    textShadow: '0 0 22px rgba(200,155,60,0.4), 1px 1px 3px rgba(0,0,0,0.9)',
                    letterSpacing: '0.04em', marginBottom: 4,
                  }}>Garret Perez</h1>
                  <div className="body-text" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{heroTitle}</div>
                  <div className="body-text" style={{ fontSize: 11, color: 'var(--text-2)' }}>📍 {heroLocation}</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(200,155,60,0.1)', margin: '12px 0' }} />

              {/* Stats: Members · Posts · then Level prominent on right */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5"
                  style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.2)' }}>
                  <span className="body-text font-bold" style={{ fontSize: 11, color: 'var(--gold)' }}>{totalUsers}</span>
                  <span className="body-text" style={{ fontSize: 10, color: 'var(--text-2)' }}>Members</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5"
                  style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.2)' }}>
                  <span className="body-text font-bold" style={{ fontSize: 11, color: 'var(--gold)' }}>{totalPosts}</span>
                  <span className="body-text" style={{ fontSize: 10, color: 'var(--text-2)' }}>Posts</span>
                </div>
                {/* Level — prominent, pushed to the right */}
                <div className="flex items-center gap-2 ml-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(200,155,60,0.2) 0%, rgba(200,155,60,0.07) 100%)',
                    border: '1px solid rgba(200,155,60,0.45)',
                    padding: '5px 12px',
                    boxShadow: '0 0 14px rgba(200,155,60,0.15)',
                  }}>
                  <span style={{ fontSize: 11 }}>⚔</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1, marginBottom: 2 }}>Level</div>
                    <div style={{ fontSize: 16, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", lineHeight: 1 }}>{garretTotalLevel}</div>
                  </div>
                </div>
              </div>

              {/* XP bar + label */}
              <div className="flex items-center gap-2.5 mb-1">
                <div className="xp-bar flex-1" style={{ height: 5 }}>
                  <div className="xp-bar-fill" style={{ width: `${garretXpBar.percent}%` }} />
                </div>
                <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {garretXpBar.currentXp} / {garretXpBar.neededXp} XP
                </span>
              </div>
              <p className="body-text" style={{ fontSize: 7, color: 'var(--text-3)', marginBottom: 8 }}>
                Login and use the site to earn XP.
              </p>

              {/* XP example chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: '🌅', text: '+10 Daily Login' },
                  { icon: '💬', text: '+5 Visit Community' },
                  { icon: '🎮', text: '+25 Game Win' },
                  { icon: '📝', text: '+50 Post' },
                ].map(e => (
                  <span key={e.text} className="body-text" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 7, color: '#78b838',
                    background: 'rgba(80,160,40,0.08)',
                    border: '1px solid rgba(80,160,40,0.2)',
                    padding: '2px 7px',
                  }}>
                    {e.icon} {e.text}
                  </span>
                ))}
              </div>

              {/* Mobile contact icons */}
              <div className="sm:hidden flex items-center justify-around gap-2 mt-4">
                {[
                  { href: `tel:${contactPhone.replace(/\D/g, '')}`, label: 'Call',     external: false, icon: <Phone size={15} color="#c89b3c" strokeWidth={1.7} /> },
                  { href: `mailto:${contactEmail}`,                  label: 'Email',    external: false, icon: <Mail size={15} color="#c89b3c" strokeWidth={1.7} /> },
                  { href: `https://www.linkedin.com/in/${contactLinkedin}`, label: 'LinkedIn', external: true, icon: <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 14, lineHeight: 1 }}>in</span> },
                  { href: '/resume',                                 label: 'Resume',   external: false, icon: <FileText size={15} color="#c89b3c" strokeWidth={1.7} /> },
                ].map(item => (
                  <a key={item.label} href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5"
                    style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                    {item.icon}
                    <span style={{ fontSize: 6.5, color: '#a07848' }}>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* 3 ── Contact — desktop, integrated (no separate card) */}
            <div
              className="hidden sm:flex flex-col shrink-0 justify-between"
              style={{ borderLeft: '1px solid rgba(200,155,60,0.15)', paddingLeft: 20, minWidth: 178 }}
            >
              <div className="flex flex-col gap-1">
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 py-2 transition-opacity hover:opacity-70"
                  style={{ textDecoration: 'none' }}>
                  <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.2)' }}>
                    <Phone size={13} color="#c89b3c" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 1 }}>Phone</div>
                    <div className="body-text" style={{ fontSize: 7.5, color: '#e0cc80', fontWeight: 600 }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 py-2 transition-opacity hover:opacity-70"
                  style={{ textDecoration: 'none' }}>
                  <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.1)', border: '1px solid rgba(60,110,200,0.22)' }}>
                    <Mail size={13} color="#7090c8" strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 1 }}>Email</div>
                    <div className="body-text" style={{ fontSize: 7, color: '#e0cc80', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 142 }}>{contactEmail}</div>
                  </div>
                </a>
                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 transition-opacity hover:opacity-70"
                  style={{ textDecoration: 'none' }}>
                  <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.12)', border: '1px solid rgba(0,90,200,0.25)' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 13, lineHeight: 1, userSelect: 'none' }}>in</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 1 }}>LinkedIn</div>
                    <div className="body-text" style={{ fontSize: 7, color: '#e0cc80', fontWeight: 600 }}>in/{contactLinkedin}</div>
                  </div>
                </a>
              </div>

              {/* Resume — bottom of column */}
              <a href="/resume"
                className="flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{
                  background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)',
                  color: '#120c00',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  padding: '9px 14px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  boxShadow: '0 2px 14px rgba(200,155,60,0.38)',
                  display: 'flex',
                  marginTop: 12,
                }}
              >
                <FileText size={11} strokeWidth={2.2} />
                View Resume
              </a>
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
        quests={quests}
      />


    </div>
  )
}
