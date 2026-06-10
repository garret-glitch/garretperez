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

          {/* ── DESKTOP: 3-col grid ─────────────────────────────── */}
          <div className="hidden sm:grid" style={{
            gridTemplateColumns: '200px 1fr 185px',
            gap: 28,
            minHeight: 210,
            alignItems: 'stretch',
          }}>

            {/* Col 1 — Photo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 200, height: 200, flexShrink: 0,
                border: '3px solid #c89b3c',
                boxShadow: '0 0 0 5px rgba(200,155,60,0.1), 0 10px 40px rgba(0,0,0,0.7)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-page)', color: 'var(--gold)',
                fontSize: 38, fontWeight: 700,
              }}>
                {headshot
                  ? <img src={headshot} alt="Garret Perez" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'GP'}
              </div>
            </div>

            {/* Col 2 — Identity + Stats + XP */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

              {/* Name / title / location */}
              <div style={{ marginBottom: 16 }}>
                <h1 style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 30, fontWeight: 700, lineHeight: 1.1,
                  color: 'var(--text-1)',
                  textShadow: '0 0 24px rgba(200,155,60,0.45), 1px 2px 4px rgba(0,0,0,0.9)',
                  letterSpacing: '0.04em', marginBottom: 7,
                }}>Garret Perez</h1>
                <div className="body-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{heroTitle}</div>
                <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {heroLocation}</div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,155,60,0.35) 0%, transparent 100%)', marginBottom: 16 }} />

              {/* Stats — vertical-stack chips */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {([
                  { value: totalUsers,       label: 'Members' },
                  { value: totalPosts,        label: 'Posts' },
                  { value: garretTotalLevel,  label: 'Level' },
                ] as const).map(stat => (
                  <div key={stat.label} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 20px',
                    background: 'rgba(200,155,60,0.07)',
                    border: '1px solid rgba(200,155,60,0.22)',
                  }}>
                    <span className="body-text" style={{ fontSize: 22, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 5 }}>{stat.value}</span>
                    <span style={{ fontSize: 5.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* XP bar — full-width, premium */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Press Start 2P', monospace" }}>XP Progress</span>
                  <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)' }}>{garretXpBar.currentXp} / {garretXpBar.neededXp} XP</span>
                </div>
                <div style={{ height: 10, background: '#a88040', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #3a7a22)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                </div>
              </div>
              <p className="body-text" style={{ fontSize: 7, color: 'var(--text-3)' }}>Earn XP by using the site.</p>
            </div>

            {/* Col 3 — Contact */}
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              borderLeft: '1px solid rgba(200,155,60,0.2)',
              paddingLeft: 22,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.28)' }}>
                    <Phone size={15} color="#c89b3c" strokeWidth={1.7} />
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Phone</div>
                    <div className="body-text" style={{ fontSize: 10, color: '#f0dc90', fontWeight: 700 }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
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
                  style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.14)', border: '1px solid rgba(0,90,200,0.3)' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 15, lineHeight: 1, userSelect: 'none' }}>in</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>LinkedIn</div>
                    <div className="body-text" style={{ fontSize: 8.5, color: '#f0dc90', fontWeight: 700 }}>in/{contactLinkedin}</div>
                  </div>
                </a>
              </div>
              <a href="/resume"
                className="flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{
                  background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)',
                  color: '#120c00',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6.5, fontWeight: 700,
                  padding: '10px 14px', marginTop: 16,
                  textDecoration: 'none', letterSpacing: '0.03em',
                  boxShadow: '0 3px 18px rgba(200,155,60,0.42)',
                  display: 'flex',
                }}>
                <FileText size={12} strokeWidth={2.2} />
                View Resume
              </a>
            </div>
          </div>

          {/* ── MOBILE: stacked layout ───────────────────────────── */}
          <div className="sm:hidden flex flex-col gap-3">
            {/* Photo + name */}
            <div className="flex items-start gap-3">
              <div style={{ width: 72, height: 72, border: '2px solid #c89b3c', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', color: 'var(--gold)', fontSize: 18, fontWeight: 700 }}>
                {headshot ? <img src={headshot} alt="Garret Perez" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'GP'}
              </div>
              <div>
                <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, color: 'var(--text-1)', textShadow: '0 0 16px rgba(200,155,60,0.4)', letterSpacing: '0.03em', marginBottom: 3, lineHeight: 1.1 }}>Garret Perez</h1>
                <div className="body-text" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{heroTitle}</div>
                <div className="body-text" style={{ fontSize: 10, color: 'var(--text-2)' }}>📍 {heroLocation}</div>
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-2">
              {([
                { value: totalUsers, label: 'Members' },
                { value: totalPosts, label: 'Posts' },
                { value: garretTotalLevel, label: 'Level' },
              ] as const).map(stat => (
                <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 0', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)', flex: 1 }}>
                  <span className="body-text" style={{ fontSize: 16, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 3 }}>{stat.value}</span>
                  <span style={{ fontSize: 5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</span>
                </div>
              ))}
            </div>
            {/* XP bar */}
            <div>
              <div style={{ height: 8, background: '#a88040', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #3a7a22)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.12)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <p className="body-text" style={{ fontSize: 7, color: 'var(--text-3)' }}>Earn XP by using the site.</p>
                <span className="body-text" style={{ fontSize: 7, color: 'var(--text-3)' }}>{garretXpBar.currentXp}/{garretXpBar.neededXp} XP</span>
              </div>
            </div>
            {/* Contact icons */}
            <div className="flex items-center justify-around gap-2">
              <a href={`tel:${contactPhone.replace(/\D/g, '')}`} className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                <Phone size={15} color="#c89b3c" strokeWidth={1.7} /><span style={{ fontSize: 6.5, color: '#a07848' }}>Call</span>
              </a>
              <a href={`mailto:${contactEmail}`} className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                <Mail size={15} color="#c89b3c" strokeWidth={1.7} /><span style={{ fontSize: 6.5, color: '#a07848' }}>Email</span>
              </a>
              <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 14, lineHeight: 1 }}>in</span><span style={{ fontSize: 6.5, color: '#a07848' }}>LinkedIn</span>
              </a>
              <a href="/resume" className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                <FileText size={15} color="#c89b3c" strokeWidth={1.7} /><span style={{ fontSize: 6.5, color: '#a07848' }}>Resume</span>
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
