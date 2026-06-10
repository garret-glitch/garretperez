import Link from 'next/link'
import type { PageBlock, SkillCardBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'
import { SKILLS } from '@/lib/skills'

interface Props { block: PageBlock; isEditing: boolean }

export default function SkillCardBlock({ block, isEditing }: Props) {
  const cfg = block.config as SkillCardBlockConfig
  const style = applyStylesToElement(block.styles)
  const skill = SKILLS.find(s => s.dbEnum === cfg.skillKey) ?? SKILLS[0]
  const hPx = block.styles.headingPx ?? 9

  return (
    <Link href={isEditing ? '#' : skill.href}
      className="rp-card block hover:opacity-90 transition-opacity"
      style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <span style={{ fontSize: 28 }}>{skill.icon}</span>
        <div>
          <div style={{ fontSize: hPx, color: 'var(--gold)' }}>{skill.label}</div>
          <div style={{ fontSize: 7, color: 'var(--text-3)', marginTop: 2 }}>Skill Channel</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-2)' }}>→</span>
      </div>
    </Link>
  )
}
