import type { PageBlock, DividerBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props { block: PageBlock; isEditing: boolean }

export default function DividerBlock({ block }: Props) {
  const cfg = block.config as DividerBlockConfig
  const style = applyStylesToElement(block.styles)
  const W: Record<string, string> = { full: '100%', '50%': '50%', '25%': '25%' }
  const ML: Record<string, string> = { left: '0', center: 'auto', right: 'auto' }
  const MR: Record<string, string> = { left: 'auto', center: 'auto', right: '0' }

  return (
    <div style={style}>
      <hr style={{
        width: W[cfg.width], border: 'none',
        borderTop: `${cfg.thickness}px ${cfg.style} ${cfg.color}`,
        marginLeft: ML[cfg.align], marginRight: MR[cfg.align],
      }} />
    </div>
  )
}
