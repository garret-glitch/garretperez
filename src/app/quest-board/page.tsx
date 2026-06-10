import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const FALLBACK_QUESTS = [
  { id: 'f1', icon: '📝', title: 'Share a Project', description: 'Post an update in the Projects skill — what are you building?', xp: 10, skill: 'Projects', href: '/skills/projects', active: true },
  { id: 'f2', icon: '🌱', title: 'Garden Update', description: 'Post a garden update, photo description, or tip in Farming.', xp: 10, skill: 'Farming', href: '/skills/gardening', active: true },
  { id: 'f3', icon: '💬', title: 'Help Someone Out', description: 'Reply to an open post and help another community member.', xp: 5, skill: 'Community', href: '/skills/community', active: true },
  { id: 'f4', icon: '🌅', title: 'Daily Check-In', description: 'Log in every day to keep your XP streak going.', xp: 3, skill: 'All skills', href: '/', active: true },
  { id: 'f5', icon: '🍷', title: 'Wine Expert', description: 'Score 7 or higher on the Wine Trivia quiz.', xp: 20, skill: 'Fun', href: '/skills/fun/wine-trivia', active: true },
  { id: 'f6', icon: '🃏', title: 'Memory Master', description: 'Complete the Matching Card Game.', xp: 20, skill: 'Fun', href: '/skills/fun/matching', active: true },
  { id: 'f7', icon: '🍷', title: 'Home Cook', description: 'Share a recipe you love in the Food &amp; Wine section.', xp: 10, skill: 'Food & Wine', href: '/skills/food', active: true },
  { id: 'f8', icon: '💼', title: 'Business Mind', description: 'Share a sales tip, business insight, or work win.', xp: 10, skill: 'Business', href: '/skills/business', active: true },
  { id: 'f9', icon: '🎣', title: "Gone Fishin'", description: 'Post a fishing trip report, tip, or photo description.', xp: 10, skill: 'Fishing', href: '/skills/fishing', active: true },
  { id: 'f10', icon: '🗺️', title: 'Road Warrior', description: 'Share a travel story, destination review, or trip highlight.', xp: 10, skill: 'Travel', href: '/skills/travel', active: true },
  { id: 'f11', icon: '❤️', title: 'Health Check', description: 'Share a wellness tip, workout update, or health goal.', xp: 10, skill: 'Health', href: '/skills/health', active: true },
  { id: 'f12', icon: '🎃', title: 'Halloween Crew', description: 'Share something spooky — haunted house updates, costume ideas, or decor tips.', xp: 10, skill: 'Community', href: '/skills/community', active: true },
]

type QuestRow = { id: string; icon: string; title: string; description: string; xp: number; skill: string; href: string; active: boolean }

export default async function QuestBoard() {
  const session = await auth()

  let quests: QuestRow[] = []
  try {
    const dbQuests = await (prisma as any).quest.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    quests = dbQuests.length > 0 ? dbQuests : FALLBACK_QUESTS
  } catch {
    quests = FALLBACK_QUESTS
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl px-5 py-4">
        <h1 className="text-[13px] text-[#e0e0e0] font-bold">📋 Quest Board</h1>
        <p className="text-[7px] text-[#909090] mt-1">
          Complete quests to earn XP and unlock badges. New quests added regularly.
        </p>
        {!session?.user && (
          <div className="mt-3 flex gap-2">
            <Link href="/register" className="osrs-btn text-[7px]">Join to Track Progress</Link>
            <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {quests.map(q => (
          <Link key={q.id} href={q.href} className="block">
            <div className="osrs-panel-dark rounded-xl hover:bg-[#282828] transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{q.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-[#d0d0d0] font-bold">{q.title}</span>
                    <span className="text-[6px] bg-[#3d3d3d] text-[#909090] px-1.5 py-0.5 rounded">{q.skill}</span>
                  </div>
                  <p className="text-[7px] text-[#909090] mt-0.5 leading-relaxed">{q.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] text-[#ffe066] font-bold">+{q.xp} XP</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
