import { auth } from '@/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const QUESTS = [
  {
    icon: '📝', title: 'Share a Project',
    desc: 'Post an update in the Projects skill — what are you building?',
    xp: 10, href: '/skills/projects', skill: 'Projects',
  },
  {
    icon: '🌱', title: 'Garden Update',
    desc: 'Post a garden update, photo description, or tip in Farming.',
    xp: 10, href: '/skills/gardening', skill: 'Farming',
  },
  {
    icon: '💬', title: 'Help Someone Out',
    desc: 'Reply to an open post and help another community member.',
    xp: 5, href: '/skills/community', skill: 'Community',
  },
  {
    icon: '🌅', title: 'Daily Check-In',
    desc: 'Log in every day to keep your XP streak going.',
    xp: 3, href: '/', skill: 'All skills',
  },
  {
    icon: '🍷', title: 'Wine Expert',
    desc: 'Score 7 or higher on the Wine Trivia quiz.',
    xp: 20, href: '/skills/fun/wine-trivia', skill: 'Fun',
  },
  {
    icon: '🃏', title: 'Memory Master',
    desc: 'Complete the Matching Card Game.',
    xp: 20, href: '/skills/fun/matching', skill: 'Fun',
  },
  {
    icon: '🍳', title: 'Home Cook',
    desc: 'Share a recipe you love in the Cooking section.',
    xp: 10, href: '/skills/food', skill: 'Cooking',
  },
  {
    icon: '💼', title: 'Business Mind',
    desc: 'Share a sales tip, business insight, or work win.',
    xp: 10, href: '/skills/business', skill: 'Business',
  },
  {
    icon: '🎣', title: 'Gone Fishin\'',
    desc: 'Post a fishing trip report, tip, or photo description.',
    xp: 10, href: '/skills/fishing', skill: 'Fishing',
  },
  {
    icon: '🗺️', title: 'Road Warrior',
    desc: 'Share a travel story, destination review, or trip highlight.',
    xp: 10, href: '/skills/travel', skill: 'Travel',
  },
  {
    icon: '❤️', title: 'Health Check',
    desc: 'Share a wellness tip, workout update, or health goal.',
    xp: 10, href: '/skills/health', skill: 'Health',
  },
  {
    icon: '🎃', title: 'Halloween Crew',
    desc: 'Share something spooky — haunted house updates, costume ideas, or decor tips.',
    xp: 10, href: '/skills/community', skill: 'Community',
  },
]

export default async function QuestBoard() {
  const session = await auth()
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
        {QUESTS.map(q => (
          <Link key={q.title} href={q.href} className="block">
            <div className="osrs-panel-dark rounded-xl hover:bg-[#282828] transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{q.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-[#d0d0d0] font-bold">{q.title}</span>
                    <span className="text-[6px] bg-[#3d3d3d] text-[#909090] px-1.5 py-0.5 rounded">{q.skill}</span>
                  </div>
                  <p className="text-[7px] text-[#909090] mt-0.5 leading-relaxed">{q.desc}</p>
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
