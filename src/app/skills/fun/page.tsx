import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FunPage() {
  const session = await auth()

  let userXp = 0
  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FUN' } },
      })
      userXp = userSkill?.xp ?? 0
    }
  } catch {
    // DB not configured
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎮</span>
          <h1 className="text-[14px] text-[#1a1a1a] font-bold">Fun</h1>
        </div>
        <p className="text-[8px] text-[#3d3d3d]">Play mini-games to earn Fun XP!</p>
        {session?.user && (
          <div className="mt-3">
            <XpBar xp={userXp} skillName="Fun" />
          </div>
        )}
        {!session?.user && (
          <p className="text-[7px] text-[#3d3d3d] mt-2">
            <Link href="/login" className="text-[#a0bcd0] hover:underline">Login</Link>
            {' '}to save your XP when you win!
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/skills/fun/wine-trivia" className="osrs-panel rounded-xl block hover:bg-[#787878] transition-colors">
          <div className="text-center py-2">
            <div className="text-3xl mb-2">🍷</div>
            <div className="text-[10px] text-[#1a1a1a] font-bold">Wine Trivia</div>
            <div className="text-[7px] text-[#3d3d3d] mt-1">10-question quiz</div>
            <div className="text-[7px] text-[#007700] mt-1">+20 XP (score 7+)</div>
          </div>
        </Link>

        <Link href="/skills/fun/matching" className="osrs-panel rounded-xl block hover:bg-[#787878] transition-colors">
          <div className="text-center py-2">
            <div className="text-3xl mb-2">🃏</div>
            <div className="text-[10px] text-[#1a1a1a] font-bold">Matching Game</div>
            <div className="text-[7px] text-[#3d3d3d] mt-1">Memory card game</div>
            <div className="text-[7px] text-[#007700] mt-1">+20 XP for winning</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
