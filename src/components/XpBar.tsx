import { xpProgress } from '@/lib/xp'

export default function XpBar({ xp, skillName }: { xp: number; skillName: string }) {
  const { level, currentXp, neededXp, percent } = xpProgress(xp)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[8px]">
        <span className="text-[#ff981f]">{skillName}</span>
        <span className="text-[#ffe066]">Level {level}</span>
      </div>
      <div className="h-2 bg-[#1a1208] border border-[#5c3d1e]">
        <div className="h-full bg-[#00b800] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-[7px] text-[#c5a882]">
        {currentXp} / {neededXp} XP to next level
      </div>
    </div>
  )
}
