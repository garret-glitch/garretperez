import type { PageBlock, XpGuideBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

const XP_ROWS = [
  { icon: '📝', action: 'Post in any skill',          xp: '+50 XP',      big: true  },
  { icon: '💬', action: 'Comment on a post',          xp: '+20 XP',      big: false },
  { icon: '🍳', action: 'Add a recipe',               xp: '+50 XP',      big: true  },
  { icon: '🏆', action: 'Win a mini-game',            xp: '+25 XP',      big: false },
  { icon: '❤️', action: 'Upvote a post',              xp: '+5 XP',       big: false },
  { icon: '📅', action: 'Daily login',                xp: '+10 XP',      big: false },
  { icon: '🗺️', action: 'Explore communities',        xp: '+2–5 XP',     big: false },
  { icon: '🎮', action: 'Play mini-games',            xp: '+10 XP',      big: false },
  { icon: '⏱️', action: '5 min on the site',          xp: '+10 XP',      big: false },
]

interface Props { block: PageBlock; isEditing: boolean }

export default function XpGuideBlock({ block }: Props) {
  const cfg = block.config as XpGuideBlockConfig
  const style = applyStylesToElement(block.styles)

  return (
    <div className="rp-card rounded-xl p-4" style={style}>
      <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: 9, color: 'var(--gold)' }}>
        <span>{cfg.icon}</span> {cfg.heading}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {XP_ROWS.map(row => (
          <div
            key={row.action}
            className="flex items-center gap-3 px-3 rounded-lg"
            style={{
              paddingTop: row.big ? 9 : 6,
              paddingBottom: row.big ? 9 : 6,
              background: row.big ? 'rgba(200,155,60,0.10)' : 'var(--bg-elevated)',
              border: `1px solid ${row.big ? 'var(--border-lit)' : 'var(--border)'}`,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{row.icon}</span>
            <span className="body-text flex-1" style={{ fontSize: 11, color: 'var(--text-1)' }}>
              {row.action}
            </span>
            <span style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: row.big ? 8 : 7,
              color: row.big ? 'var(--gold)' : 'var(--text-2)',
              flexShrink: 0,
            }}>
              {row.xp}
            </span>
          </div>
        ))}
      </div>

      <p className="body-text mt-4 text-center" style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
        Level up just by using the site.
      </p>
    </div>
  )
}
