import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SKILLS } from '@/lib/skills'
import { xpToLevel } from '@/lib/xp'
import { BADGE_META } from '@/lib/badges'
import SkillCell from './SkillCell'
import Link from 'next/link'

const GARRET_SKILLS = [
  { icon: '❤️', label: 'Health',    level: 72,  href: '/skills/health' },
  { icon: '⚒️', label: 'Projects',  level: 18,  href: '/skills/projects' },
  { icon: '🎣', label: 'Fishing',   level: 55,  href: '/skills/fishing' },
  { icon: '💼', label: 'Business',  level: 31,  href: '/skills/business' },
  { icon: '🍳', label: 'Cooking',   level: 65,  href: '/skills/food' },
  { icon: '👥', label: 'Community', level: 80,  href: '/skills/community' },
  { icon: '🌱', label: 'Farming',   level: 45,  href: '/skills/gardening' },
  { icon: '🎮', label: 'Fun',       level: 88,  href: '/skills/fun' },
  { icon: '🗺️', label: 'Travel',    level: 65,  href: '/skills/travel' },
]

export default async function SkillsPanel() {
  const session = await auth()

  const skillMap: Record<string, number> = {}
  let userBadges: string[] = []

  if (session?.user?.id) {
    try {
      const userSkills = await prisma.userSkill.findMany({
        where: { userId: session.user.id },
      })
      for (const s of userSkills) {
        skillMap[s.skill] = s.xp
      }
      const badges = await (prisma as any).userBadge.findMany({
        where: { userId: session.user.id },
        select: { badge: true },
      })
      userBadges = badges.map((b: { badge: string }) => b.badge)
    } catch {
      // DB not configured yet — show defaults
    }
  }

  const userTotalLevel = SKILLS.reduce(
    (sum, skill) => sum + xpToLevel(skillMap[skill.dbEnum] ?? 0),
    0
  )

  const garretTotalLevel = GARRET_SKILLS.reduce((sum, s) => sum + s.level, 0)

  return (
    <aside className="w-[220px] shrink-0 space-y-2">
      {/* Home tab */}
      <Link
        href="/"
        className="skill-cell rounded-lg flex-row justify-start gap-2 px-3 py-2"
        style={{ minHeight: 'auto' }}
      >
        <span className="text-base">🏠</span>
        <span className="text-[8px] text-[#d0d0d0] font-bold">Home</span>
      </Link>

      {/* Garret's Skills */}
      <div>
        <div className="osrs-panel-dark rounded-t-lg py-1.5 text-center">
          <div className="text-[6px] text-[#909090]">Garret Perez</div>
          <div className="text-[16px] text-[#ffe066] font-bold leading-none mt-0.5">{garretTotalLevel}</div>
          <div className="text-[5px] text-[#707070] mt-0.5">Total Level</div>
        </div>
        <div
          className="p-0.5 grid grid-cols-3 gap-px bg-[#3d3d3d] rounded-b-lg overflow-hidden"
          style={{ border: '2px solid #3d3d3d', borderTop: 'none' }}
        >
          {GARRET_SKILLS.map(skill => (
            <Link key={skill.href} href={skill.href} className="skill-cell" title={skill.label}>
              <span className="text-base leading-none">{skill.icon}</span>
              <span className="text-[6px] text-[#c0c0c0] mt-0.5 leading-tight text-center block">{skill.label}</span>
              <span className="text-[9px] text-[#ffe066] font-bold">{skill.level}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Your Skills */}
      <div>
        <div className="osrs-panel-dark rounded-t-lg py-1.5 text-center">
          <div className="text-[6px] text-[#909090]">
            {session?.user ? session.user.name ?? 'You' : 'Your Skills'}
          </div>
          <div className="text-[16px] text-[#ffe066] font-bold leading-none mt-0.5">{userTotalLevel}</div>
          <div className="text-[5px] text-[#707070] mt-0.5">Total Level</div>
        </div>
        <div
          className="p-0.5 grid grid-cols-3 gap-px bg-[#3d3d3d] rounded-b-lg overflow-hidden"
          style={{ border: '2px solid #3d3d3d', borderTop: 'none' }}
        >
          {SKILLS.map(skill => (
            <SkillCell
              key={skill.slug}
              skill={skill}
              level={xpToLevel(skillMap[skill.dbEnum] ?? 0)}
            />
          ))}
        </div>

        {!session?.user && (
          <div className="osrs-panel-dark mt-1 rounded-lg text-center py-2">
            <div className="text-[6px] text-[#888888] leading-relaxed">
              Login to track<br />your XP!
            </div>
          </div>
        )}
      </div>

      {/* Badges */}
      {session?.user && userBadges.length > 0 && (
        <div className="osrs-panel-dark rounded-lg py-2 px-2">
          <div className="text-[6px] text-[#909090] mb-1.5 text-center">Badges Earned</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {userBadges.map(badge => {
              const meta = BADGE_META[badge]
              return meta ? (
                <span key={badge} title={meta.label} className="text-base cursor-default">
                  {meta.icon}
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
