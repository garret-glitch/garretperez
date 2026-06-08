import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SKILLS } from '@/lib/skills'
import { xpToLevel } from '@/lib/xp'
import SkillCell from './SkillCell'

export default async function SkillsPanel() {
  const session = await auth()

  const skillMap: Record<string, number> = {}
  if (session?.user?.id) {
    try {
      const userSkills = await prisma.userSkill.findMany({
        where: { userId: session.user.id },
      })
      for (const s of userSkills) {
        skillMap[s.skill] = s.xp
      }
    } catch {
      // DB not configured yet — show defaults
    }
  }

  const totalLevel = SKILLS.reduce(
    (sum, skill) => sum + xpToLevel(skillMap[skill.dbEnum] ?? 0),
    0
  )

  return (
    <aside className="w-[186px] shrink-0">
      <div className="osrs-panel text-center py-2 mb-1">
        <div className="text-[7px] text-[#5c3d1e]">Total Level</div>
        <div className="text-[20px] text-[#3c2a1e] font-bold leading-none mt-1">{totalLevel}</div>
        <div className="text-[6px] text-[#5c3d1e] mt-1">out of 891</div>
      </div>

      <div className="p-0.5 grid grid-cols-3 gap-px bg-[#5c3d1e]" style={{ border: '3px solid', borderColor: '#e8cc99 #5c3d1e #5c3d1e #e8cc99' }}>
        {SKILLS.map(skill => (
          <SkillCell
            key={skill.slug}
            skill={skill}
            level={xpToLevel(skillMap[skill.dbEnum] ?? 0)}
          />
        ))}
      </div>

      {!session?.user && (
        <div className="osrs-panel mt-1 text-center py-2">
          <div className="text-[6px] text-[#5c3d1e] leading-relaxed">
            Login to track your XP and level up!
          </div>
        </div>
      )}
    </aside>
  )
}
