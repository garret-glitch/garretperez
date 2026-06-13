'use client'

export interface CardData {
  id: string
  name: string
  title: string | null
  company: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  website: string | null
  tagline: string | null
  accentColor: string
  createdAt: string
  user: { id: string; username: string; level: number }
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function BusinessCardDisplay({
  card,
  onDelete,
  isAdmin,
  isOwnCard,
  memberNum,
}: {
  card: CardData
  onDelete?: (id: string) => void
  isAdmin?: boolean
  isOwnCard?: boolean
  memberNum?: number
}) {
  const ac = card.accentColor
  const uid = card.id.replace(/[^a-z0-9]/gi, '')

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .bcard-${uid}:hover .bcard-inner-${uid} {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Perspective wrapper */}
      <div
        className={`bcard-${uid}`}
        style={{
          width: '100%',
          paddingBottom: '57%',
          position: 'relative',
          perspective: '1200px',
        }}
      >
        <div
          className={`bcard-inner-${uid}`}
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >

          {/* ── FRONT ── */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden' as any,
            background: 'linear-gradient(140deg, #12100e 0%, #1d1912 55%, #161210 100%)',
            border: `1px solid ${ac}40`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: `0 6px 28px rgba(0,0,0,0.65), 0 0 0 1px ${ac}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
            padding: '14px 16px 14px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
              background: `linear-gradient(180deg, ${ac} 0%, ${ac}70 100%)`,
            }} />

            {/* Grid pattern */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.022, pointerEvents: 'none',
              backgroundImage: `linear-gradient(${ac} 1px, transparent 1px), linear-gradient(90deg, ${ac} 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }} />

            {/* Member number chip */}
            {memberNum !== undefined && (
              <div style={{
                position: 'absolute', top: 10, right: 12,
                fontFamily: "'Press Start 2P', monospace", fontSize: 5,
                color: `${ac}90`, letterSpacing: '0.04em',
              }}>
                #{String(memberNum).padStart(3, '0')}
              </div>
            )}

            {/* Logo + company */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: `${ac}18`, border: `1.5px solid ${ac}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: ac,
              }}>
                {initials(card.name)}
              </div>
              {card.company && (
                <span style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9.5, color: '#907858',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {card.company}
                </span>
              )}
            </div>

            {/* Name */}
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f0d898',
              lineHeight: 1.55, marginBottom: 5, position: 'relative',
            }}>
              {card.name}
            </div>

            {/* Title */}
            {card.title && (
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
                color: ac, fontWeight: 600, marginBottom: 6, position: 'relative',
              }}>
                {card.title}
              </div>
            )}

            {/* Tagline */}
            {card.tagline && (
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10,
                color: '#786850', fontStyle: 'italic', position: 'relative', flex: 1,
              }}>
                &ldquo;{card.tagline}&rdquo;
              </div>
            )}

            {/* Bottom row */}
            <div style={{ marginTop: 'auto', paddingTop: 8, position: 'relative' }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#504030' }}>
                @{card.user.username}
              </span>
            </div>

          </div>

          {/* ── BACK ── */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden' as any,
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(140deg, #0e0c0a 0%, #161210 100%)',
            border: `1px solid ${ac}40`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: `0 6px 28px rgba(0,0,0,0.65)`,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${ac} 35%, ${ac} 65%, transparent 100%)`,
            }} />

            {/* Name on back */}
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
              color: `${ac}cc`, marginBottom: 14,
            }}>
              {card.name}
            </div>

            {/* Contact rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>✉</span>
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: '#c8a870', wordBreak: 'break-all' }}>
                    {card.email}
                  </span>
                </div>
              )}
              {card.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>📞</span>
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: '#c8a870' }}>
                    {card.phone}
                  </span>
                </div>
              )}
              {card.linkedin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>💼</span>
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: '#c8a870', wordBreak: 'break-all' }}>
                    {card.linkedin}
                  </span>
                </div>
              )}
              {card.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>🌐</span>
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: '#c8a870', wordBreak: 'break-all' }}>
                    {card.website}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom accent line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${ac}60 35%, ${ac}60 65%, transparent 100%)`,
            }} />

          </div>
        </div>
      </div>

      {/* Admin/owner actions */}
      {(isAdmin || isOwnCard) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
          {isOwnCard && !isAdmin && (
            <span style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 5,
              color: ac, border: `1px solid ${ac}40`, padding: '3px 7px', borderRadius: 2,
              alignSelf: 'center',
            }}>
              ★ Your Card
            </span>
          )}
          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(card.id)}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
                color: '#7a2020', border: '1px solid #3a1010', background: 'transparent',
                padding: '3px 8px', cursor: 'pointer', borderRadius: 2, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = '#2a1010'; b.style.color = '#ef4444' }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'transparent'; b.style.color = '#7a2020' }}
            >
              🗑 Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
