import { xpProgress } from '@/lib/xp'

export default function XpBar({ xp, skillName }: { xp: number; skillName: string }) {
  const { level, currentXp, neededXp, percent } = xpProgress(xp)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[8px]">
        <span className="text-[#c0c0c0]">{skillName}</span>
        <span className="text-[#ffe066]">Level {level}</span>
      </div>
      <div className="h-2 bg-[#141414] border border-[#3d3d3d]">
        <div className="h-full bg-[#00b800] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-[7px] text-[#909090]">
        {currentXp} / {neededXp} XP to next level
      </div>
    </div>
  )
}
