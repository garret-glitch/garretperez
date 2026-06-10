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

              {/* Stats: Members · Posts · Level */}
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
                <div className="flex items-center gap-1.5 px-2.5 py-1.5"
                  style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.2)' }}>
                  <span className="body-text font-bold" style={{ fontSize: 11, color: 'var(--gold)' }}>{garretTotalLevel}</span>
                  <span className="body-text" style={{ fontSize: 10, color: 'var(--text-2)' }}>Level</span>
                </div>
              </div>

              {/* XP bar + label */}
              <div className="flex items-center gap-2.5 mb-1" style={{ maxWidth: 300 }}>
                <div className="xp-bar flex-1" style={{ height: 5 }}>
                  <div className="xp-bar-fill" style={{ width: `${garretXpBar.percent}%` }} />
                </div>
                <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {garretXpBar.currentXp} / {garretXpBar.neededXp} XP
                </span>
              </div>
              <p className="body-text" style={{ fontSize: 7, color: 'var(--text-3)', marginBottom: 8 }}>
                Interact with my website to get XP.
              </p>

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

            {/* 3 ── Contact — desktop, integrated */}
            <div
              className="hidden sm:flex flex-col shrink-0 justify-between"
              style={{ borderLeft: '1px solid rgba(200,155,60,0.18)', paddingLeft: 22, minWidth: 196 }}
            >
              <div className="flex flex-col" style={{ gap: 2 }}>
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none', padding: '7px 8px', margin: '0 -8px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.28)' }}>
                    <Phone size={15} color="#c89b3c" strokeWidth={1.7} />
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Phone</div>
                    <div className="body-text" style={{ fontSize: 10, color: '#f0dc90', fontWeight: 700, letterSpacing: '0.01em' }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none', padding: '7px 8px', margin: '0 -8px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.12)', border: '1px solid rgba(60,110,200,0.28)' }}>
                    <Mail size={15} color="#7090c8" strokeWidth={1.7} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Email</div>
                    <div className="body-text" style={{ fontSize: 8.5, color: '#f0dc90', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 148 }}>{contactEmail}</div>
                  </div>
                </a>
                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none', padding: '7px 8px', margin: '0 -8px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.14)', border: '1px solid rgba(0,90,200,0.3)' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 15, lineHeight: 1, userSelect: 'none' }}>in</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>LinkedIn</div>
                    <div className="body-text" style={{ fontSize: 8.5, color: '#f0dc90', fontWeight: 700 }}>in/{contactLinkedin}</div>
                  </div>
                </a>
              </div>

              {/* Resume — anchored to bottom */}
              <a href="/resume"
                className="flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{
                  background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)',
                  color: '#120c00',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6.5,
                  padding: '10px 14px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  boxShadow: '0 3px 16px rgba(200,155,60,0.4)',
                  display: 'flex',
                  marginTop: 14,
                }}
              >
                <FileText size={12} strokeWidth={2.2} />
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
