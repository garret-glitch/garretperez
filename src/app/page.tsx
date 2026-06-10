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
              {/* Name row — no level badge here, moved to chips */}
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 style={{
                  fontSize: 26, lineHeight: 1.1, color: 'var(--text-1)',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 700,
                  textShadow: '0 0 22px rgba(200,155,60,0.4), 1px 1px 3px rgba(0,0,0,0.9)',
                  letterSpacing: '0.04em',
                }}>Garret Perez</h1>
              </div>

              <div className="body-text text-[13px] font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>
                {heroTitle}
              </div>
              <div className="body-text text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
                📍 {heroLocation}
              </div>

              {/* Stat chips: Level · Members · Posts */}
              <div className="flex gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1"
                  style={{ background: 'rgba(200,155,60,0.18)', border: '1px solid rgba(200,155,60,0.4)' }}>
                  <span style={{ fontSize: 9 }}>⚔</span>
                  <span className="body-text text-[11px] font-bold" style={{ color: 'var(--gold)' }}>Lv. {garretTotalLevel}</span>
                </div>
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

              {/* XP bar — slim */}
              <div className="flex items-center gap-2.5">
                <div className="xp-bar flex-1" style={{ height: 5 }}>
                  <div className="xp-bar-fill" style={{ width: `${garretXpBar.percent}%` }} />
                </div>
                <span className="body-text" style={{ fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {garretXpBar.currentXp} / {garretXpBar.neededXp} XP
                </span>
              </div>
            </div>

            {/* ── Contact card — desktop ──────────────────────────── */}
            <div className="hidden sm:flex flex-col sm:shrink-0 overflow-hidden" style={{
              background: '#0a0806',
              border: '1px solid rgba(200,155,60,0.35)',
              minWidth: 195,
              boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,155,60,0.1)',
            }}>
              {/* Card header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(200,155,60,0.16) 0%, rgba(200,155,60,0.04) 100%)',
                borderBottom: '1px solid rgba(200,155,60,0.2)',
                padding: '12px 16px 10px',
              }}>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 12, fontWeight: 700,
                  color: '#e8d080',
                  letterSpacing: '0.06em',
                  textShadow: '0 0 14px rgba(200,155,60,0.45)',
                }}>Garret Perez</div>
                <div className="body-text" style={{ fontSize: 7, color: '#907040', marginTop: 3 }}>
                  Houston, TX · Open to connect
                </div>
              </div>

              {/* Contact rows */}
              <div style={{ flex: 1 }}>
                <a href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 transition-colors hover:bg-white/[0.04]"
                  style={{ padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.22)' }}>
                    <Phone size={13} color="#c89b3c" strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Phone</div>
                    <div className="body-text" style={{ fontSize: 7.5, color: '#e0cc80', fontWeight: 600 }}>{contactPhone}</div>
                  </div>
                </a>
                <a href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 transition-colors hover:bg-white/[0.04]"
                  style={{ padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.12)', border: '1px solid rgba(60,110,200,0.25)' }}>
                    <Mail size={13} color="#7090c8" strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Email</div>
                    <div className="body-text" style={{ fontSize: 7, color: '#e0cc80', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactEmail}</div>
                  </div>
                </a>
                <a href={`https://www.linkedin.com/in/${contactLinkedin}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 transition-colors hover:bg-white/[0.04]"
                  style={{ padding: '10px 14px', textDecoration: 'none' }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.14)', border: '1px solid rgba(0,90,200,0.28)' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>in</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 5.5, color: '#5a4020', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>LinkedIn</div>
                    <div className="body-text" style={{ fontSize: 7, color: '#e0cc80', fontWeight: 600 }}>in/{contactLinkedin}</div>
                  </div>
                </a>
              </div>

              {/* Resume CTA */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(200,155,60,0.18)' }}>
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
                    boxShadow: '0 2px 14px rgba(200,155,60,0.4)',
                    display: 'flex',
                  }}
                >
                  <FileText size={11} strokeWidth={2.2} />
                  View Resume
                </a>
              </div>
            </div>

            {/* ── Contact row — mobile ──────────────────────────── */}
            <div className="sm:hidden flex items-center justify-around gap-2 pt-1">
              {[
                { href: `tel:${contactPhone.replace(/\D/g, '')}`, label: 'Call',     external: false, icon: <Phone size={16} color="#c89b3c" strokeWidth={1.7} /> },
                { href: `mailto:${contactEmail}`,                  label: 'Email',    external: false, icon: <Mail size={16} color="#c89b3c" strokeWidth={1.7} /> },
                { href: `https://www.linkedin.com/in/${contactLinkedin}`, label: 'LinkedIn', external: true, icon: <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 15, lineHeight: 1 }}>in</span> },
                { href: '/resume',                                 label: 'Resume',   external: false, icon: <FileText size={16} color="#c89b3c" strokeWidth={1.7} /> },
              ].map(item => (
                <a key={item.label} href={item.href}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex flex-col items-center gap-1.5 flex-1 py-2.5 transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(200,155,60,0.2)', background: 'rgba(0,0,0,0.2)', textDecoration: 'none' }}>
                  {item.icon}
                  <span style={{ fontSize: 7, color: '#a07848' }}>{item.label}</span>
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
        quests={quests}
      />


    </div>
  )
}
