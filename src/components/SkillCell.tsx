'use client'
import Link from 'next/link'
import type { SkillMeta } from '@/lib/skills'

export default function SkillCell({ skill, level }: { skill: SkillMeta; level: number }) {
  return (
    <Link href={skill.href} className="skill-cell" title={skill.description} style={{ background: skill.color }}>
      <span className="text-2xl leading-none">{skill.icon}</span>
      <span className="text-[7px] leading-tight text-center block" style={{ color: '#e8d8b0' }}>
        {skill.label}
      </span>
      <span className="text-[8px] font-bold" style={{ color: '#ffd060' }}>Lv {level}</span>
    </Link>
  )
}
