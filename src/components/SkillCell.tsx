'use client'
import Link from 'next/link'
import type { SkillMeta } from '@/lib/skills'

export default function SkillCell({ skill, level }: { skill: SkillMeta; level: number }) {
  return (
    <Link href={skill.href} className="skill-cell" title={skill.description}>
      <span className="text-base leading-none">{skill.icon}</span>
      <span className="text-[6px] text-[#c0c0c0] mt-0.5 leading-tight text-center block">
        {skill.label}
      </span>
      <span className="text-[9px] text-[#ffe066] font-bold">{level}</span>
    </Link>
  )
}
