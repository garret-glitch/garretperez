import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel, xpProgress } from '@/lib/xp'
import AccountShield from '@/components/AccountShield'
import HomepageBlockRenderer from '@/components/HomepageBlockRenderer'
import type { PageBlock, HeroBlockConfig } from '@/types/builder'
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

    // If a hero block exists, its config overrides SiteSetting text fields
    const heroBlock = homeBlocks.find(b => b.type === 'hero')
    if (heroBlock) {
      const hcfg = heroBlock.config as HeroBlockConfig
      if (hcfg.heroTitle)       heroTitle       = hcfg.heroTitle
      if (hcfg.heroLocation)    heroLocation    = hcfg.heroLocation
      if (hcfg.contactPhone)    contactPhone    = hcfg.contactPhone
      if (hcfg.contactEmail)    contactEmail    = hcfg.contactEmail
      if (hcfg.contactLinkedin) contactLinkedin = hcfg.contactLinkedin
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

              {/* Name / level badge / title / location */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h1 style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 30, fontWeight: 700, lineHeight: 1.1,
                    color: 'var(--text-1)',
                    textShadow: '0 0 28px rgba(200,155,60,0.5), 1px 2px 4px rgba(0,0,0,0.9)',
                    letterSpacing: '0.04em', margin: 0,
                  }}>Garret Perez</h1>
                  <div style={{
                    padding: '3px 9px',
                    background: 'rgba(200,155,60,0.15)',
                    border: '1px solid rgba(200,155,60,0.45)',
                    boxShadow: '0 0 10px rgba(200,155,60,0.2)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 6, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.06em' }}>LVL {garretTotalLevel}</span>
                  </div>
                </div>
                <div className="body-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{heroTitle}</div>
                <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {heroLocation}</div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,155,60,0.35) 0%, transparent 100%)', marginBottom: 14 }} />

              {/* Stats chips + inline CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {/* Chips */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {([
                    { value: totalUsers,       label: 'Members', highlight: false },
                    { value: totalPosts,       label: 'Posts',   highlight: false },
                    { value: garretTotalLevel, label: 'Level',   highlight: true  },
                  ] as const).map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 18px',
                      background: stat.highlight ? 'rgba(200,155,60,0.13)' : 'rgba(200,155,60,0.07)',
                      border: `1px solid rgba(200,155,60,${stat.highlight ? '0.45' : '0.22'})`,
                      boxShadow: stat.highlight ? '0 0 12px rgba(200,155,60,0.18)' : 'none',
                    }}>
                      <span className="body-text" style={{ fontSize: 22, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 5 }}>{stat.value}</span>
                      <span style={{ fontSize: 5.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA — to the right of Level chip */}
                <div style={{ borderLeft: '1px solid rgba(200,155,60,0.2)', paddingLeft: 12, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, lineHeight: 1 }}>⚡</span>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6.5, color: '#e8c060', letterSpacing: '0.03em' }}>Help Me Level Up</span>
                  </div>
                  <p className="body-text" style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 8px' }}>
                    Your posts, recipes, games &amp; daily logins all earn me XP.
                  </p>
                  {!session?.user && (
                    <a href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)', color: '#120c00', fontFamily: "'Press Start 2P', monospace", fontSize: 6, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 12px rgba(200,155,60,0.35)' }}>
                      🛡 Join the Guild
                    </a>
                  )}
                </div>
              </div>

              {/* XP bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 5.5, color: '#8a6838', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Press Start 2P', monospace" }}>⚡ Community Level</span>
                  <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)' }}>{garretXpBar.currentXp} / {garretXpBar.neededXp} XP</span>
                </div>
                <div style={{ height: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #4a9a28)', position: 'relative', transition: 'width 0.6s ease' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3 — Contact */}
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              borderLeft: '1px solid rgba(200,155,60,0.2)',
              paddingLeft: 22,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.06]"
                  style={{ textDecoration: 'none', padding: '8px 10px', margin: '0 -10px' }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.15)', border: '1px solid rgba(200,155,60,0.4)' }}>
                    <Phone size={17} color="#c89b3c" strokeWidth={1.7} />
                  </div>
                  <div>
                    <div style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Phone</div>
                    <div className="body-text" style={{ fontSize: 12, color: '#f5e4a0', fontWeight: 700 }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.06]"
                  style={{ textDecoration: 'none', padding: '8px 10px', margin: '0 -10px' }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.18)', border: '1px solid rgba(60,110,200,0.4)' }}>
                    <Mail size={17} color="#7090c8" strokeWidth={1.7} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Email</div>
                    <div className="body-text" style={{ fontSize: 11, color: '#f5e4a0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 148 }}>{contactEmail}</div>
                  </div>
                </a>
                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.06]"
                  style={{ textDecoration: 'none', padding: '8px 10px', margin: '0 -10px' }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.2)', border: '1px solid rgba(0,90,200,0.42)' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#6098d8', fontSize: 17, lineHeight: 1, userSelect: 'none' }}>in</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>LinkedIn</div>
                    <div className="body-text" style={{ fontSize: 11, color: '#f5e4a0', fontWeight: 700 }}>in/{contactLinkedin}</div>
                  </div>
                </a>
              </div>

              {/* Resume — focal CTA */}
              <a href="/resume"
                className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #d4a840 0%, #a87830 100%)',
                  color: '#0e0800',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8, fontWeight: 700,
                  padding: '13px 14px', marginTop: 14,
                  textDecoration: 'none', letterSpacing: '0.04em',
                  boxShadow: '0 0 0 1px rgba(200,155,60,0.5), 0 4px 28px rgba(200,155,60,0.55)',
                  display: 'flex',
                }}>
                <FileText size={15} strokeWidth={2.2} />
                View Resume
              </a>
            </div>
          </div>

          {/* ── MOBILE: premium centered layout ──────────────────── */}
          <div className="sm:hidden flex flex-col" style={{ gap: 16 }}>

            {/* Photo — centered focal point */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 140, height: 140,
                border: '3px solid #c89b3c',
                boxShadow: '0 0 0 5px rgba(200,155,60,0.1), 0 8px 32px rgba(0,0,0,0.7)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-page)', color: 'var(--gold)',
                fontSize: 36, fontWeight: 700,
              }}>
                {headshot
                  ? <img src={headshot} alt="Garret Perez" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'GP'}
              </div>
            </div>

            {/* Name + level badge + title + location — centered */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26, fontWeight: 700, lineHeight: 1.15,
                color: 'var(--text-1)',
                textShadow: '0 0 20px rgba(200,155,60,0.45), 1px 1px 3px rgba(0,0,0,0.9)',
                letterSpacing: '0.04em', marginBottom: 7,
              }}>Garret Perez</h1>
              <div style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(200,155,60,0.15)', border: '1px solid rgba(200,155,60,0.45)', boxShadow: '0 0 10px rgba(200,155,60,0.2)', marginBottom: 7 }}>
                <span style={{ fontSize: 6.5, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace" }}>LVL {garretTotalLevel}</span>
              </div>
              <div className="body-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 5, lineHeight: 1.4 }}>{heroTitle}</div>
              <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {heroLocation}</div>
            </div>

            {/* Gold divider — symmetric fade */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(200,155,60,0.5) 25%, rgba(200,155,60,0.5) 75%, transparent 100%)' }} />

            {/* Stats — 1 per row, label left / number right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { value: totalUsers,       label: 'Members' },
                { value: totalPosts,        label: 'Posts' },
                { value: garretTotalLevel,  label: 'Level' },
              ] as const).map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(200,155,60,0.07)',
                  border: '1px solid rgba(200,155,60,0.22)',
                }}>
                  <span style={{ fontSize: 8, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                  <span className="body-text" style={{ fontSize: 20, fontWeight: 700, color: '#c89b3c', lineHeight: 1 }}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Mobile CTA — above XP bar */}
            <div style={{ padding: '14px 16px', background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#e8c060' }}>Help Me Level Up</span>
              </div>
              <p className="body-text" style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 10px' }}>
                Your posts, recipes, games, and daily logins all earn me XP.
              </p>
              {!session?.user && (
                <a href="/register" style={{ display: 'inline-block', padding: '6px 14px', background: 'linear-gradient(135deg, #c89b3c, #9a7228)', color: '#120c00', fontFamily: "'Press Start 2P', monospace", fontSize: 6, fontWeight: 700, textDecoration: 'none' }}>🛡 Join the Guild</a>
              )}
            </div>

            {/* XP bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 7, color: '#8a6838', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Press Start 2P', monospace" }}>⚡ Community Level</span>
                <span className="body-text" style={{ fontSize: 9, color: 'var(--text-3)' }}>{garretXpBar.currentXp} / {garretXpBar.neededXp} XP</span>
              </div>
              <div style={{ height: 12, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #4a9a28)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.15)' }} />
                </div>
              </div>
            </div>

            {/* Gold divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(200,155,60,0.4) 25%, rgba(200,155,60,0.4) 75%, transparent 100%)' }} />

            {/* Contact — 1 per row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

              <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', textDecoration: 'none' }}>
                <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.18)', border: '1px solid rgba(200,155,60,0.45)' }}>
                  <Phone size={16} color="#c89b3c" strokeWidth={1.7} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, fontFamily: "'Press Start 2P', monospace" }}>Phone</div>
                  <div className="body-text" style={{ fontSize: 13, color: '#f5e4a0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactPhone}</div>
                </div>
              </a>

              <a href={`mailto:${contactEmail}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(60,110,200,0.1)', border: '1px solid rgba(60,110,200,0.3)', textDecoration: 'none' }}>
                <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.2)', border: '1px solid rgba(60,110,200,0.42)' }}>
                  <Mail size={16} color="#7090c8" strokeWidth={1.7} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, fontFamily: "'Press Start 2P', monospace" }}>Email</div>
                  <div className="body-text" style={{ fontSize: 12, color: '#f5e4a0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactEmail}</div>
                </div>
              </a>

              <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(0,90,200,0.1)', border: '1px solid rgba(0,90,200,0.3)', textDecoration: 'none' }}>
                <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.2)', border: '1px solid rgba(0,90,200,0.42)' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#6098d8', fontSize: 16, lineHeight: 1, userSelect: 'none' }}>in</span>
                </div>
                <div>
                  <div style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, fontFamily: "'Press Start 2P', monospace" }}>LinkedIn</div>
                  <div className="body-text" style={{ fontSize: 12, color: '#f5e4a0', fontWeight: 700 }}>/{contactLinkedin}</div>
                </div>
              </a>

              {/* Resume — focal CTA */}
              <a href="/resume"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', background: 'linear-gradient(135deg, #d4a840 0%, #a87830 100%)', textDecoration: 'none', boxShadow: '0 0 0 1px rgba(200,155,60,0.5), 0 4px 24px rgba(200,155,60,0.5)', marginTop: 2 }}>
                <FileText size={17} color="#0e0800" strokeWidth={2.2} />
                <div>
                  <div style={{ fontSize: 8, color: '#0e0800', fontFamily: "'Press Start 2P', monospace", fontWeight: 700, letterSpacing: '0.04em' }}>View Resume</div>
                </div>
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
