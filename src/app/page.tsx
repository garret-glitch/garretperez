import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillByEnum } from '@/lib/skills'
import { BADGE_META } from '@/lib/badges'
import { xpToLevel, xpProgress } from '@/lib/xp'
import AccountShield from '@/components/AccountShield'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type ProjectRow = { id: string; icon: string; title: string; desc: string; progress: number; href: string; updated: string }

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
  let dbProjects: ProjectRow[] = []
  let currentUserXp = 0
  let currentUserLevel = 1
  let currentUserXpBar = { currentXp: 0, neededXp: 100, percent: 0 }
  let shieldColor = '#1a0e06'

  try {
    const headshotSetting = await (prisma as any).siteSetting.findUnique({ where: { key: 'headshot' } })
    headshot = headshotSetting?.value ?? ''

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

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  }

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
                Sales Supervisor · Builder · Family Man
              </div>
              <div className="body-text text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
                📍 Houston, TX
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

            {/* Contact panel — square */}
            <div className="flex flex-col sm:shrink-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(200,155,60,0.22)', minWidth: 170 }}>
              <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'rgba(200,155,60,0.15)' }}>
                <span className="text-[6px] uppercase tracking-widest" style={{ color: '#a07848' }}>⚔ Contact</span>
              </div>
              <div className="flex flex-col">
                <a href="tel:346-604-1635"
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#2a1a0a', borderRadius: 2 }}>📞</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>(346) 604-1635</div>
                  </div>
                </a>
                <a href="mailto:gis.owner@gmail.com"
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#1a2a1a', borderRadius: 2 }}>✉️</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>gis.owner@gmail.com</div>
                  </div>
                </a>
                <a href="https://www.linkedin.com/in/garretperez" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5">
                  <span className="shrink-0 flex items-center justify-center text-sm"
                    style={{ width: 26, height: 26, background: '#1a1a3a', borderRadius: 2 }}>🔗</span>
                  <div>
                    <div style={{ fontSize: 5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LinkedIn</div>
                    <div style={{ fontSize: 7, color: '#f0d898' }}>garretperez</div>
                  </div>
                </a>
                <div className="px-3 py-2.5">
                  <a href="/resume" className="osrs-btn text-center block" style={{ fontSize: 6 }}>📄 Resume</a>
                </div>
              </div>
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

      {/* ─── ALL SECTIONS: 3-col grid, no page scroll ────────── */}
      <div className="content-grid">

        {/* About Me — col 1 row 1 */}
        <div className="cg-about" style={{ overflow: 'visible' }}>
          <div className="scroll-roll" />
          <div className="scroll-parchment">
            <h2 className="text-[9px] mb-3 flex items-center gap-2" style={{ color: '#3a1e06' }}>
              <span>📜</span> About Me
            </h2>
            <div className="space-y-2 body-text" style={{ color: '#3a2810' }}>
              <p>
                Sales professional based in Houston, TX — focused on distribution,
                team management, and building strong customer relationships. I bring
                energy and structure to every team I lead, and I take pride in
                developing people as much as hitting numbers.
              </p>
              <p>
                Outside of work I'm a builder, gardener, fisherman, and father.
                Whether I'm fixing something around the house, growing vegetables in
                the backyard, or teaching my kids to cast a line, I'm always working
                with my hands on something that matters.
              </p>
              <p>
                This site is my personal hub — a place to log projects, share
                recipes, track progress, and connect with community. Built with
                Next.js and a heavy dose of OSRS nostalgia.
              </p>
            </div>
          </div>
          <div className="scroll-roll" />
        </div>

        {/* My Projects — col 2 row 1 */}
        <div className="cg-projects" style={{ overflow: 'visible' }}>
          <div className="scroll-roll" />
          <div className="scroll-parchment">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[9px] flex items-center gap-2" style={{ color: '#3a1e06' }}>
                <span>⚒️</span> My Projects
              </h2>
              <Link href="/skills/projects" className="text-[6px] hover:opacity-70 transition-opacity" style={{ color: '#6a3808' }}>
                View All →
              </Link>
            </div>

            {dbProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <span className="text-4xl opacity-30">⚒️</span>
                <p className="text-[7px]" style={{ color: '#8a6030' }}>No projects logged yet.</p>
                <Link href="/skills/projects" className="osrs-btn text-[6.5px] px-3 py-1.5">Start a Project</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {dbProjects.map(p => (
                  <Link key={p.title} href={p.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                    <span className="text-xl shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[7px] font-bold truncate" style={{ color: '#2a1006' }}>{p.title}</span>
                        <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{p.progress}%</span>
                      </div>
                      <div className="prog-bar">
                        <div className="prog-bar-fill" style={{ width: `${p.progress}%` }} />
                      </div>
                      <div className="text-[5.5px] mt-1" style={{ color: '#8a6030' }}>Updated {p.updated}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="scroll-roll" />
        </div>

        {/* Community Feed — col 3, spans both rows */}
        <div className="cg-feed" style={{ overflow: 'visible' }}>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: '#3a1e06' }}>
              <span>💬</span> Community Feed
              <span className="ml-auto text-[6px]" style={{ color: '#8a6030' }}>All Communities</span>
            </h2>

            {recentPosts.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-[8px] mb-4" style={{ color: '#5a3818' }}>The community feed is empty.</p>
                {!session?.user ? (
                  <div className="flex justify-center gap-2">
                    <Link href="/register" className="osrs-btn text-[7px]">Join &amp; Post</Link>
                    <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
                  </div>
                ) : (
                  <p className="text-[7px]" style={{ color: '#8a6030' }}>Click any community in the sidebar to post!</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map(post => {
                  const skill = getSkillByEnum(post.skill)
                  const upvotes = post.upvotes.length
                  const replies = post.replies.length
                  return (
                    <Link key={post.id} href={skill?.href ?? '/'} className="block post-card">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold"
                          style={{ background: 'rgba(180,120,40,0.2)', border: '1px solid #a07840', color: '#6a3808' }}>
                          {post.user.username.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[7px] font-bold" style={{ color: '#2a1006' }}>{post.user.username}</span>
                            <span className="text-[6px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(180,120,40,0.2)', color: '#5a3818', border: '1px solid #a07840' }}>
                              {skill?.icon} {skill?.label}
                            </span>
                            <span className="text-[5.5px] ml-auto" style={{ color: '#8a6030' }}>{timeAgo(post.createdAt)}</span>
                          </div>

                          <div className="text-[8px] font-bold mb-1 truncate" style={{ color: '#2a1006' }}>{post.title}</div>

                          <p className="body-text text-[12px] mb-2 line-clamp-2" style={{ color: '#3a2810' }}>
                            {post.body}
                          </p>

                          <div className="flex items-center gap-3">
                            {upvotes > 0 && (
                              <span className="text-[6px] flex items-center gap-1" style={{ color: '#6a3808' }}>
                                ▲ {upvotes}
                              </span>
                            )}
                            {replies > 0 && (
                              <span className="text-[6px] flex items-center gap-1" style={{ color: '#8a6030' }}>
                                💬 {replies}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          <div className="scroll-roll" />
        </div>

        {/* Achievements — col 1 row 2 */}
        <div className="cg-achieve" style={{ overflow: 'visible' }}>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={{ padding: '12px 20px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 10 }}>🏆</span>
              <span className="text-[7px]" style={{ color: '#3a1e06' }}>Achievements</span>
            </div>
            {userBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userBadges.map(key => {
                  const meta = BADGE_META[key]
                  return meta ? (
                    <span key={key} title={meta.label} className="cursor-default select-none"
                      style={{ fontSize: 22, lineHeight: 1 }}>
                      {meta.icon}
                    </span>
                  ) : null
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <span style={{ fontSize: 18 }}>🏆</span>
                <span className="text-[6px]" style={{ color: '#8a6030' }}>None yet — post &amp; play to earn</span>
              </div>
            )}
          </div>
          <div className="scroll-roll" />
        </div>

        {/* How to Earn XP — col 2 row 2 */}
        <div className="cg-xp" style={{ overflow: 'visible' }}>
          <div className="scroll-roll" />
          <div className="scroll-parchment">
            <h2 className="text-[9px] mb-3 flex items-center gap-2" style={{ color: '#3a1e06' }}>
              <span>⚡</span> How to Earn XP
            </h2>
            <div className="space-y-1.5">
              {[
                { icon: '📝', action: 'Post to a skill',  xp: '+50 XP' },
                { icon: '🍳', action: 'Add a recipe',     xp: '+50 XP' },
                { icon: '🎮', action: 'Win a mini-game',  xp: '+25 XP' },
                { icon: '📅', action: 'Daily login',      xp: '+10 XP' },
              ].map(row => (
                <div key={row.action}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                  <span className="text-sm shrink-0">{row.icon}</span>
                  <span className="flex-1 text-[6px]" style={{ color: '#3a2810' }}>{row.action}</span>
                  <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{row.xp}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="scroll-roll" />
        </div>

      </div>

    </div>
  )
}
