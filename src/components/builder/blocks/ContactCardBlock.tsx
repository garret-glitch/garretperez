import type { PageBlock, ContactCardBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props { block: PageBlock; isEditing: boolean; liveData: BlockLiveData }

export default function ContactCardBlock({ block, liveData }: Props) {
  const cfg = block.config as ContactCardBlockConfig
  const style = applyStylesToElement(block.styles)
  const phone = liveData.contactPhone ?? '(346) 604-1635'
  const email = liveData.contactEmail ?? 'gis.owner@gmail.com'
  const linkedin = liveData.contactLinkedin ?? 'garretperez'

  const rows = [
    cfg.showPhone    && { href: `tel:${phone.replace(/\D/g, '')}`,          icon: '📞', label: 'Phone',    value: phone },
    cfg.showEmail    && { href: `mailto:${email}`,                           icon: '✉️',  label: 'Email',    value: email },
    cfg.showLinkedin && { href: `https://www.linkedin.com/in/${linkedin}`,   icon: '🔗', label: 'LinkedIn', value: linkedin },
    cfg.showResume   && { href: '/resume',                                   icon: '📄', label: 'Resume',   value: 'View Resume' },
  ].filter(Boolean) as { href: string; icon: string; label: string; value: string }[]

  return (
    <div className="rp-card" style={style}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 7, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚔ Contact</span>
      </div>
      {rows.map(row => (
        <a key={row.label} href={row.href} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
          <span style={{ fontSize: 18 }}>{row.icon}</span>
          <div>
            <div style={{ fontSize: 5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</div>
            <div style={{ fontSize: 8, color: 'var(--text-1)' }}>{row.value}</div>
          </div>
        </a>
      ))}
    </div>
  )
}
