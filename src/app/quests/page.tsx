import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const FALLBACK_QUESTS = [
  { id: 'f1',  icon: '📝', title: 'Share a Project',   description: 'Post an update in the Projects skill — what are you building?', xp: 10, skill: 'Projects',    href: '/skills/projects' },
  { id: 'f2',  icon: '🌱', title: 'Garden Update',     description: 'Post a garden update, photo description, or tip in Gardening.',  xp: 10, skill: 'Gardening',   href: '/skills/gardening' },
  { id: 'f3',  icon: '💬', title: 'Help Someone Out',  description: 'Reply to an open post and help another community member.',        xp: 5,  skill: 'Community',   href: '/skills/community' },
  { id: 'f4',  icon: '🌅', title: 'Daily Check-In',    description: 'Log in every day to keep your XP streak going.',                  xp: 3,  skill: 'All skills',  href: '/' },
  { id: 'f5',  icon: '🍷', title: 'Wine Expert',        description: 'Score 7 or higher on the Wine Trivia quiz.',                     xp: 20, skill: 'Fun',         href: '/skills/fun/wine-trivia' },
  { id: 'f6',  icon: '🃏', title: 'Memory Master',      description: 'Complete the Matching Card Game.',                               xp: 20, skill: 'Fun',         href: '/skills/fun/matching' },
  { id: 'f7',  icon: '🍳', title: 'Home Cook',          description: 'Share a recipe you love in the Food & Wine section.',            xp: 10, skill: 'Food & Wine', href: '/skills/food' },
  { id: 'f8',  icon: '💼', title: 'Business Mind',      description: 'Share a sales tip, business insight, or work win.',              xp: 10, skill: 'Business',    href: '/skills/business' },
  { id: 'f9',  icon: '🎣', title: "Gone Fishin'",       description: 'Post a fishing trip report, tip, or photo description.',         xp: 10, skill: 'Fishing',     href: '/skills/fishing' },
  { id: 'f10', icon: '🗺️', title: 'Road Warrior',       description: 'Share a travel story, destination review, or trip highlight.',   xp: 10, skill: 'Travel',     href: '/skills/travel' },
  { id: 'f11', icon: '❤️', title: 'Health Check',       description: 'Share a wellness tip, workout update, or health goal.',          xp: 10, skill: 'Health',      href: '/skills/health' },
]

type QuestRow = { id: string; icon: string; title: string; description: string; xp: number; skill: string; href: string }

export default async function QuestsPage() {
  const session = await auth()

  let quests: QuestRow[] = []
  try {
    const db = await (prisma as any).quest.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    quests = db.length > 0 ? db : FALLBACK_QUESTS
  } catch {
    quests = FALLBACK_QUESTS
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rp-card px-5 py-4">
        <div className="flex items-center gap-3 mb-1">
          <span style={{ fontSize: 18 }}>⚔️</span>
          <h1 style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>Quest Board</h1>
        </div>
        <p className="body-text" style={{ fontSize: 8, color: 'var(--text-2)' }}>
          Complete quests to earn XP and level up your skills. New quests added regularly.
        </p>
        {!session?.user && (
          <div className="flex gap-2 mt-3">
            <Link href="/register" className="osrs-btn text-[7px]">Join to Track Progress</Link>
            <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
          </div>
        )}
      </div>

      {/* Quest list */}
      <div className="flex flex-col gap-3">
        {quests.map(q => (
          <Link key={q.id} href={q.href} className="block" style={{ textDecoration: 'none' }}>
            <div className="rp-card quest-card" style={{ padding: '14px 16px' }}>
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{q.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontSize: 8.5, color: 'var(--text-1)', fontWeight: 700 }}>{q.title}</span>
                    <span style={{
                      fontSize: 6, color: 'var(--text-3)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      padding: '1px 6px', borderRadius: 3,
                    }}>{q.skill}</span>
                  </div>
                  <p className="body-text" style={{ fontSize: 7, color: 'var(--text-2)', lineHeight: 1.6 }}>{q.description}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{
                    fontSize: 8, fontFamily: "'Press Start 2P', monospace",
                    color: '#90c040',
                    background: 'rgba(80,160,40,0.12)',
                    border: '1px solid rgba(80,160,40,0.3)',
                    borderRadius: 4, padding: '3px 7px',
                  }}>+{q.xp} XP</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
