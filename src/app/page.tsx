import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillByEnum } from '@/lib/skills'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const GARRET_SKILLS = [
  { level: 72 }, { level: 18 }, { level: 55 }, { level: 31 }, { level: 65 },
  { level: 80 }, { level: 45 }, { level: 88 }, { level: 65 },
]
const GARRET_TOTAL = GARRET_SKILLS.reduce((s, sk) => s + sk.level, 0)

const PROJECTS = [
  { icon: '🎃', title: 'Haunted House',     desc: 'Building the ultimate neighborhood haunted house experience for the community.',  progress: 65, href: '/skills/community', updated: 'Nov 2024' },
  { icon: '🎣', title: 'Fishing Log',       desc: 'Documenting fishing adventures, best spots, and catches across Texas.',           progress: 40, href: '/skills/fishing',   updated: 'Oct 2024' },
  { icon: '🌱', title: 'Garden Project',    desc: 'Growing and maintaining a productive home garden through all seasons.',           progress: 30, href: '/skills/gardening', updated: 'Sep 2024' },
  { icon: '💼', title: 'Wine Sales Goals',  desc: 'Hitting quarterly H-E-B distribution targets and growing client relationships.',  progress: 75, href: '/skills/business',  updated: 'Nov 2024' },
  { icon: '⚒️', title: 'Personal Projects', desc: 'Building, fixing, and creating things — home improvements and DIY builds.',       progress: 20, href: '/skills/projects',  updated: 'Oct 2024' },
]

const QUESTS = [
  { icon: '🎃', title: 'Haunted House: 100 Visitors', desc: 'Get 100 visitors to the annual haunted house', progress: 65, xp: 500 },
  { icon: '💼', title: 'Wine Sales — Q4 Target',       desc: 'Reach quarterly distribution goal with H-E-B', progress: 75, xp: 300 },
  { icon: '👥', title: 'Grow the Community',           desc: 'Reach 50 active members across all channels',  progress: 20, xp: 200 },
  { icon: '🌱', title: 'Full Garden Harvest',          desc: 'Complete a full seasonal garden cycle',         progress: 30, xp: 150 },
]

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
    totalPosts = await prisma.post.count()
    totalUsers = await prisma.user.count()
  } catch { /* DB not configured */ }

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  }

  return (
    <div className="space-y-5 fade-in">

      {/* ─── HERO ─────────────────────────────────────────── */}
      <div className="hero-panel">
        <div className="flex gap-6 flex-wrap">

          {/* Profile Photo */}
          <div className="shrink-0">
            <div className="w-28 h-28 rounded-xl overflow-hidden"
              style={{ border: '2px solid var(--border-lit)' }}>
              {/* Replace /headshot.jpg with your photo — drop the file into the /public folder */}
              <img
                src="/headshot.jpg"
                alt="Garret Perez"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  t.style.display = 'none'
                  if (t.parentElement) {
                    t.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-page);color:var(--gold);font-size:22px;font-weight:bold;">GP</div>'
                  }
                }}
              />
            </div>
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[14px] leading-tight" style={{ color: 'var(--text-1)' }}>
                Garret Perez
              </h1>
              <span className="text-[7px] px-2 py-0.5 rounded" style={{ background: 'rgba(200,155,60,0.15)', color: 'var(--gold)', border: '1px solid rgba(200,155,60,0.3)' }}>
                ⚔ Level {GARRET_TOTAL}
              </span>
            </div>
            <div className="body-text text-[13px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
              Sales Supervisor · Builder · Family Man
            </div>
            <div className="body-text text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
              📍 Houston, TX
            </div>

            {/* XP bar */}
            <div className="mb-1 flex items-center gap-3">
              <div className="xp-bar flex-1" style={{ maxWidth: 280 }}>
                <div className="xp-bar-fill" style={{ width: '62%' }} />
              </div>
              <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>6,200 / 10,000 XP</span>
            </div>

            {/* Current quest */}
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-[7px]"
              style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.25)', color: 'var(--gold)' }}>
              ⚔ Current Quest: Build the Ultimate Haunted House Experience
            </div>
          </div>

          {/* Contact info — all details */}
          <div className="shrink-0 flex flex-col gap-2.5" style={{ minWidth: 180 }}>
            <div className="text-[6px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Contact</div>

            <a href="tel:346-604-1635"
              className="flex items-center gap-2.5 body-text text-[12px] hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-1)' }}>
              <span className="text-base">📞</span>
              <span>(346) 604-1635</span>
            </a>

            <a href="mailto:gis.owner@gmail.com"
              className="flex items-center gap-2.5 body-text text-[12px] hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-1)' }}>
              <span className="text-base">✉️</span>
              <span>gis.owner@gmail.com</span>
            </a>

            <a href="https://www.linkedin.com/in/garretperez" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 body-text text-[12px] hover:opacity-80 transition-opacity"
              style={{ color: '#5b9bd5' }}>
              <span className="text-base">🔗</span>
              <span>linkedin.com/in/garretperez</span>
            </a>

            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer"
              className="osrs-btn text-[7px] text-center mt-1 w-full">📄 Download Resume</a>

            <div className="flex gap-2 mt-1">
              <div className="text-center flex-1 rounded-lg py-1.5" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-dim)' }}>
                <div className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>{totalUsers}</div>
                <div className="text-[5px]" style={{ color: 'var(--text-3)' }}>Members</div>
              </div>
              <div className="text-center flex-1 rounded-lg py-1.5" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-dim)' }}>
                <div className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>{totalPosts}</div>
                <div className="text-[5px]" style={{ color: 'var(--text-3)' }}>Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: About Me + Projects ───────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* About Me */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>👤</span> About Me
          </h2>
          <div className="space-y-3 body-text" style={{ color: '#9898b8' }}>
            <p>
              I&apos;m a wine sales professional based in Houston, TX working in H-E-B distribution
              and team management. Outside of work I&apos;m building, creating, and running community
              projects.
            </p>
            <p>
              Every year I run a full neighborhood haunted house, maintain a garden, go fishing,
              and take on home projects. This site is where I document all of it — and where you
              can join the conversation.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Wine Sales', 'Team Leadership', 'DIY Builds', 'Community Events', 'Fishing', 'Gardening'].map(tag => (
              <span key={tag} className="text-[6px] px-2 py-1 rounded"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {tag}
              </span>
            ))}
          </div>
          {!session?.user && (
            <div className="mt-4 flex gap-2">
              <Link href="/register" className="osrs-btn flex-1 text-center text-[7px]">✨ Join Community</Link>
              <Link href="/login" className="osrs-btn text-center text-[7px]">Login</Link>
            </div>
          )}
        </div>

        {/* My Projects */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>⚒️</span> My Projects
          </h2>
          <div className="space-y-2.5">
            {PROJECTS.map(p => (
              <Link key={p.title} href={p.href} className="block quest-card">
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[7px] font-bold truncate" style={{ color: 'var(--text-1)' }}>{p.title}</span>
                      <span className="text-[6px] shrink-0" style={{ color: 'var(--text-3)' }}>{p.updated}</span>
                    </div>
                    <div className="prog-bar mb-1">
                      <div className="prog-bar-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="text-[5.5px]" style={{ color: 'var(--text-3)' }}>{p.progress}% complete</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ROW 2: Quest Log + Achievements ─────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Quest Log */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>📜</span> Active Quests
            <Link href="/quest-board" className="ml-auto text-[6px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>See all →</Link>
          </h2>
          <div className="space-y-3">
            {QUESTS.map(q => (
              <div key={q.title} className="quest-card">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{q.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[7px] font-bold" style={{ color: 'var(--text-1)' }}>{q.title}</span>
                      <span className="text-[6px] shrink-0" style={{ color: 'var(--gold)' }}>+{q.xp} XP</span>
                    </div>
                    <div className="body-text text-[11px] mb-2" style={{ color: 'var(--text-2)' }}>{q.desc}</div>
                    <div className="prog-bar">
                      <div className="prog-bar-fill" style={{ width: `${q.progress}%` }} />
                    </div>
                    <div className="text-[5.5px] mt-1" style={{ color: 'var(--text-3)' }}>{q.progress}% complete</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>🏆</span> Achievements
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(BADGE_META).map(([key, meta]) => (
              <div key={key} className="badge-tile">
                <span className="text-2xl">{meta.icon}</span>
                <span className="text-[5.5px] text-center leading-tight" style={{ color: 'var(--text-2)' }}>{meta.label}</span>
                <span className="text-[5px] text-center leading-tight" style={{ color: 'var(--text-3)' }}>{meta.desc}</span>
              </div>
            ))}
          </div>
          {!session?.user && (
            <p className="mt-3 text-[6px] text-center" style={{ color: 'var(--text-3)' }}>
              Login to earn badges and unlock achievements
            </p>
          )}
        </div>
      </div>

      {/* ─── ROW 3: Recent Activity + Community Feed ─────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>

        {/* Recent Activity — compact */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>⚡</span> Activity
            <span className="blink ml-1" style={{ color: 'var(--gold)' }}>▮</span>
          </h2>
          {recentPosts.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">🗿</div>
              <p className="text-[7px]" style={{ color: 'var(--text-3)' }}>No posts yet. Click a community to start!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentPosts.slice(0, 6).map(post => {
                const skill = getSkillByEnum(post.skill)
                return (
                  <Link key={post.id} href={skill?.href ?? '/'} className="flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:opacity-80" style={{ background: 'var(--bg-elevated)' }}>
                    <span className="text-sm shrink-0">{skill?.icon ?? '📝'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[7px] truncate" style={{ color: 'var(--text-1)' }}>{post.title}</div>
                      <div className="text-[5.5px]" style={{ color: 'var(--text-3)' }}>
                        {post.user.username} · {timeAgo(post.createdAt)}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Community Feed — full cards */}
        <div className="rp-card">
          <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>💬</span> Community Feed
            <span className="ml-auto text-[6px]" style={{ color: 'var(--text-3)' }}>All Communities</span>
          </h2>

          {recentPosts.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-[8px] mb-4" style={{ color: 'var(--text-2)' }}>The community feed is empty.</p>
              {!session?.user ? (
                <div className="flex justify-center gap-2">
                  <Link href="/register" className="osrs-btn text-[7px]">Join &amp; Post</Link>
                  <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
                </div>
              ) : (
                <p className="text-[7px]" style={{ color: 'var(--text-3)' }}>Click any community in the sidebar to post!</p>
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
                      {/* User avatar */}
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold"
                        style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
                        {post.user.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Meta row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[7px] font-bold" style={{ color: 'var(--text-1)' }}>{post.user.username}</span>
                          <span className="text-[6px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-page)', color: 'var(--text-2)', border: '1px solid var(--border-dim)' }}>
                            {skill?.icon} {skill?.label}
                          </span>
                          <span className="text-[5.5px] ml-auto" style={{ color: 'var(--text-3)' }}>{timeAgo(post.createdAt)}</span>
                        </div>

                        {/* Title */}
                        <div className="text-[8px] font-bold mb-1 truncate" style={{ color: 'var(--text-1)' }}>{post.title}</div>

                        {/* Body preview */}
                        <p className="body-text text-[12px] mb-2 line-clamp-2" style={{ color: '#7878a0' }}>
                          {post.body}
                        </p>

                        {/* Engagement */}
                        <div className="flex items-center gap-3">
                          {upvotes > 0 && (
                            <span className="text-[6px] flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                              ▲ {upvotes}
                            </span>
                          )}
                          {replies > 0 && (
                            <span className="text-[6px] flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
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
      </div>

    </div>
  )
}
