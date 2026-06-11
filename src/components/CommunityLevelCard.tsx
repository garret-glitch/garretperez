import { xpProgress } from '@/lib/xp'

interface Props {
  xp: number
  memberCount: number
}

export default function CommunityLevelCard({ xp, memberCount }: Props) {
  const p = xpProgress(xp)
  return (
    <div style={{
      flexShrink: 0, width: 200,
      background: '#13100c',
      border: '1px solid rgba(200,155,60,0.22)',
      padding: '18px 20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 7,
        color: '#7a5a20', letterSpacing: '0.12em', marginBottom: 12,
      }}>
        ⚔ COMMUNITY
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 36, fontWeight: 800, color: '#c89b3c', lineHeight: 1 }}>
          {p.level}
        </span>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#7a5a20', letterSpacing: '0.08em' }}>
          LVL
        </span>
      </div>

      <div style={{ height: 5, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.18)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${p.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)' }} />
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a5e3c', lineHeight: 1.6 }}>
        <div>{xp.toLocaleString()} total XP</div>
        {memberCount > 0 && (
          <div style={{ marginTop: 2, color: '#4a3820' }}>
            {memberCount} {memberCount === 1 ? 'contributor' : 'contributors'}
          </div>
        )}
      </div>
    </div>
  )
}
