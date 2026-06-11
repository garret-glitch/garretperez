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
            gridTemplateColumns: '192px 1fr 245px',
            gap: 24,
            alignItems: 'stretch',
          }}>

            {/* Col 1 — Photo + nameplate */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {/* Photo frame */}
              <div style={{
                width: 192, flexShrink: 0,
                border: '2px solid rgba(200,155,60,0.6)',
                boxShadow: '0 0 0 4px rgba(200,155,60,0.08), 0 0 0 5px rgba(200,155,60,0.22), 0 14px 44px rgba(0,0,0,0.8)',
                overflow: 'hidden', position: 'relative',
                background: 'var(--bg-page)',
              }}>
                {headshot
                  ? <img src={headshot} alt="Garret Perez" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                  : <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 38, fontWeight: 700 }}>GP</div>}
                {/* Corner accents */}
                <div style={{ position: 'absolute', top: 4, left: 4, width: 14, height: 14, borderTop: '2px solid #c89b3c', borderLeft: '2px solid #c89b3c', opacity: 0.8 }} />
                <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderTop: '2px solid #c89b3c', borderRight: '2px solid #c89b3c', opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: 4, left: 4, width: 14, height: 14, borderBottom: '2px solid #c89b3c', borderLeft: '2px solid #c89b3c', opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderBottom: '2px solid #c89b3c', borderRight: '2px solid #c89b3c', opacity: 0.8 }} />
              </div>
              {/* Name plate */}
              <div style={{
                width: 192,
                padding: '7px 0',
                background: 'rgba(200,155,60,0.1)',
                border: '1px solid rgba(200,155,60,0.35)',
                borderTop: '1px solid rgba(200,155,60,0.5)',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: 5.5, color: '#c89b3c', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: "'Press Start 2P', monospace" }}>◆ Guild Admin ◆</span>
              </div>
            </div>

            {/* Col 2 — Identity + Stats + XP */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

              {/* Name + title badge + location */}
              <div style={{ marginBottom: 16 }}>
                <h1 style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 32, fontWeight: 700, lineHeight: 1.1,
                  color: '#f0d898',
                  textShadow: '0 0 32px rgba(200,155,60,0.55), 1px 2px 5px rgba(0,0,0,0.95)',
                  letterSpacing: '0.04em', margin: '0 0 9px',
                }}>Garret Perez</h1>
                {/* Role badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', marginBottom: 7,
                  background: 'rgba(200,155,60,0.07)',
                  border: '1px solid rgba(200,155,60,0.28)',
                }}>
                  <span style={{ fontSize: 9, color: '#a07828', lineHeight: 1 }}>◈</span>
                  <span className="body-text" style={{ fontSize: 11, fontWeight: 600, color: '#c8a060' }}>{heroTitle}</span>
                </div>
                <div className="body-text" style={{ fontSize: 12, color: '#8a7050' }}>📍 {heroLocation}</div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,155,60,0.45) 0%, rgba(200,155,60,0.08) 100%)', marginBottom: 16 }} />

              {/* Stats chips — full width row with icons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {([
                  { value: totalUsers,       label: 'Members', icon: '👥', highlight: false },
                  { value: totalPosts,       label: 'Posts',   icon: '📝', highlight: false },
                  { value: garretTotalLevel, label: 'Level',   icon: '⚡', highlight: true  },
                ] as const).map(stat => (
                  <div key={stat.label} style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 6px',
                    background: stat.highlight ? 'rgba(200,155,60,0.14)' : 'rgba(200,155,60,0.06)',
                    border: `1px solid rgba(200,155,60,${stat.highlight ? '0.45' : '0.2'})`,
                    boxShadow: stat.highlight ? 'inset 0 1px 0 rgba(200,155,60,0.25)' : 'none',
                  }}>
                    <span style={{ fontSize: 11, marginBottom: 4, lineHeight: 1 }}>{stat.icon}</span>
                    <span className="body-text" style={{ fontSize: 20, fontWeight: 700, color: stat.highlight ? '#ffd060' : '#c89b3c', lineHeight: 1, marginBottom: 4 }}>{stat.value}</span>
                    <span style={{ fontSize: 5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA — full-width block below stats */}
              <div style={{
                padding: '11px 14px', marginBottom: 16,
                background: 'rgba(200,155,60,0.05)',
                borderLeft: '3px solid rgba(200,155,60,0.55)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>⚡</span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6.5, color: '#e8c060', letterSpacing: '0.03em' }}>Help Me Level Up</span>
                </div>
                <p className="body-text" style={{ fontSize: 10.5, color: '#a09070', lineHeight: 1.55, margin: '0 0 9px' }}>
                  Post, add recipes, play games &amp; log in daily — we both gain XP!
                </p>
                {!session?.user && (
                  <a href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)', color: '#120c00', fontFamily: "'Press Start 2P', monospace", fontSize: 6, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 12px rgba(200,155,60,0.35)' }}>
                    🛡 Join the Guild
                  </a>
                )}
              </div>

              {/* XP bar — gold gradient */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 5.5, color: '#8a6838', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Press Start 2P', monospace" }}>⚡ Level Progress</span>
                  <span className="body-text" style={{ fontSize: 8, color: '#7a5828' }}>{garretXpBar.currentXp} / {garretXpBar.neededXp} XP</span>
                </div>
                <div style={{ height: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(200,155,60,0.25)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)', position: 'relative', transition: 'width 0.6s ease' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.12)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3 — Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                <a href={`tel:${contactPhone.replace(/\D/g, '')}`} style={{ textDecoration: 'none', display: 'block', padding: '11px 14px', background: 'rgba(200,155,60,0.08)', borderLeft: '3px solid #c89b3c' }}
                  className="hover:brightness-110 transition-all">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Phone size={11} color="#c89b3c" strokeWidth={2} />
                    <span style={{ fontSize: 6, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'Press Start 2P', monospace" }}>Phone</span>
                  </div>
                  <div className="body-text" style={{ fontSize: 17, color: '#f8edb0', fontWeight: 700, letterSpacing: '0.01em' }}>{contactPhone}</div>
                </a>

                <a href={`mailto:${contactEmail}`} style={{ textDecoration: 'none', display: 'block', padding: '11px 14px', background: 'rgba(60,110,200,0.09)', borderLeft: '3px solid #7090c8' }}
                  className="hover:brightness-110 transition-all">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Mail size={11} color="#7090c8" strokeWidth={2} />
                    <span style={{ fontSize: 6, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'Press Start 2P', monospace" }}>Email</span>
                  </div>
                  <div className="body-text" style={{ fontSize: 14, color: '#f8edb0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactEmail}</div>
                </a>

                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block', padding: '11px 14px', background: 'rgba(0,90,200,0.09)', borderLeft: '3px solid #4a88d0' }}
                  className="hover:brightness-110 transition-all">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#6098d8', fontSize: 11, lineHeight: 1, userSelect: 'none' }}>in</span>
                    <span style={{ fontSize: 6, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'Press Start 2P', monospace" }}>LinkedIn</span>
                  </div>
                  <div className="body-text" style={{ fontSize: 15, color: '#f8edb0', fontWeight: 700 }}>in/{contactLinkedin}</div>
                </a>
              </div>

              {/* Resume — focal CTA */}
              <a href="/resume"
                className="flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #d4a840 0%, #a87830 100%)',
                  color: '#0e0800',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9, fontWeight: 700,
                  padding: '16px', marginTop: 14,
                  textDecoration: 'none', letterSpacing: '0.04em',
                  boxShadow: '0 0 0 1px rgba(200,155,60,0.55), 0 8px 36px rgba(200,155,60,0.55)',
                  display: 'flex',
                }}>
                <FileText size={17} strokeWidth={2.2} />
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

            {/* Name + title badge + location — centered */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26, fontWeight: 700, lineHeight: 1.15,
                color: '#f0d898',
                textShadow: '0 0 20px rgba(200,155,60,0.45), 1px 1px 3px rgba(0,0,0,0.9)',
                letterSpacing: '0.04em', marginBottom: 8,
              }}>Garret Perez</h1>
              {/* Role badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', marginBottom: 7,
                background: 'rgba(200,155,60,0.07)',
                border: '1px solid rgba(200,155,60,0.28)',
              }}>
                <span style={{ fontSize: 9, color: '#a07828', lineHeight: 1 }}>◈</span>
                <span className="body-text" style={{ fontSize: 11, fontWeight: 600, color: '#c8a060' }}>{heroTitle}</span>
              </div>
              <div className="body-text" style={{ fontSize: 12, color: '#8a7050' }}>📍 {heroLocation}</div>
            </div>

            {/* Gold divider — symmetric fade */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(200,155,60,0.5) 25%, rgba(200,155,60,0.5) 75%, transparent 100%)' }} />

            {/* Stats — 1 per row, label left / number right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { value: totalUsers,       label: 'Members', icon: '👥' },
                { value: totalPosts,       label: 'Posts',   icon: '📝' },
                { value: garretTotalLevel, label: 'Level',   icon: '⚡' },
              ] as const).map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(200,155,60,0.07)',
                  border: '1px solid rgba(200,155,60,0.22)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12 }}>{stat.icon}</span>
                    <span style={{ fontSize: 7.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                  </div>
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
                Post, add recipes, play games &amp; log in daily — we both gain XP!
              </p>
              {!session?.user && (
                <a href="/register" style={{ display: 'inline-block', padding: '6px 14px', background: 'linear-gradient(135deg, #c89b3c, #9a7228)', color: '#120c00', fontFamily: "'Press Start 2P', monospace", fontSize: 6, fontWeight: 700, textDecoration: 'none' }}>🛡 Join the Guild</a>
              )}
            </div>

            {/* XP bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 7, color: '#8a6838', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Press Start 2P', monospace" }}>⚡ Level</span>
                <span className="body-text" style={{ fontSize: 9, color: 'var(--text-3)' }}>{garretXpBar.currentXp} / {garretXpBar.neededXp} XP</span>
              </div>
              <div style={{ height: 12, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${garretXpBar.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.12)' }} />
                </div>
              </div>
            </div>

            {/* Gold divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(200,155,60,0.4) 25%, rgba(200,155,60,0.4) 75%, transparent 100%)' }} />

            {/* Contact — 1 per row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

              <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                style={{ textDecoration: 'none', display: 'block', padding: '11px 16px', background: 'rgba(200,155,60,0.09)', borderLeft: '3px solid #c89b3c' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Phone size={11} color="#c89b3c" strokeWidth={2} />
                  <span style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>Phone</span>
                </div>
                <div className="body-text" style={{ fontSize: 17, color: '#f8edb0', fontWeight: 700 }}>{contactPhone}</div>
              </a>

              <a href={`mailto:${contactEmail}`}
                style={{ textDecoration: 'none', display: 'block', padding: '11px 16px', background: 'rgba(60,110,200,0.1)', borderLeft: '3px solid #7090c8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Mail size={11} color="#7090c8" strokeWidth={2} />
                  <span style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>Email</span>
                </div>
                <div className="body-text" style={{ fontSize: 14, color: '#f8edb0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactEmail}</div>
              </a>

              <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'block', padding: '11px 16px', background: 'rgba(0,90,200,0.1)', borderLeft: '3px solid #4a88d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#6098d8', fontSize: 11, lineHeight: 1, userSelect: 'none' }}>in</span>
                  <span style={{ fontSize: 7.5, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>LinkedIn</span>
                </div>
                <div className="body-text" style={{ fontSize: 16, color: '#f8edb0', fontWeight: 700 }}>in/{contactLinkedin}</div>
              </a>

              {/* Resume — focal CTA */}
              <a href="/resume"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', background: 'linear-gradient(135deg, #d4a840 0%, #a87830 100%)', textDecoration: 'none', boxShadow: '0 0 0 1px rgba(200,155,60,0.6), 0 6px 28px rgba(200,155,60,0.55)', marginTop: 2 }}>
                <FileText size={17} color="#0e0800" strokeWidth={2.2} />
                <span style={{ fontSize: 9, color: '#0e0800', fontFamily: "'Press Start 2P', monospace", fontWeight: 700, letterSpacing: '0.04em' }}>View Resume</span>
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
