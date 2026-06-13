'use client'

export interface ItemData {
  id: string
  itemName: string
  description: string | null
  category: string | null
  link: string | null
  priceRange: string | null
  imageUrl: string | null
  accentColor: string
  createdAt: string
  user: { id: string; username: string }
}

function cleanUrl(url: string) {
  return url.startsWith('http') ? url : `https://${url}`
}

export default function CoolItemCard({
  item,
  onDelete,
  isAdmin,
  isOwn,
}: {
  item: ItemData
  onDelete?: (id: string) => void
  isAdmin?: boolean
  isOwn?: boolean
}) {
  const ac = item.accentColor
  const uid = item.id.replace(/[^a-z0-9]/gi, '')

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .ci-${uid}:hover .ci-inner-${uid} {
          transform: rotateY(180deg);
        }
      `}</style>

      <div
        className={`ci-${uid}`}
        style={{ width: '100%', paddingBottom: '66%', position: 'relative', perspective: '1200px' }}
      >
        <div
          className={`ci-inner-${uid}`}
          style={{
            position: 'absolute', inset: 0,
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
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, zIndex: 2,
              background: `linear-gradient(180deg, ${ac} 0%, ${ac}70 100%)`,
            }} />

            {/* Grid pattern */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.022, pointerEvents: 'none', zIndex: 0,
              backgroundImage: `linear-gradient(${ac} 1px, transparent 1px), linear-gradient(90deg, ${ac} 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }} />

            {/* Image hero (if present) */}
            {item.imageUrl ? (
              <div style={{ position: 'relative', height: '44%', flexShrink: 0, marginLeft: 5 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Bottom fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                  background: 'linear-gradient(to top, #12100e, transparent)',
                  pointerEvents: 'none',
                }} />
                {/* Category pill over image */}
                {item.category && (
                  <span style={{
                    position: 'absolute', top: 8, left: 10,
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9,
                    color: ac, background: 'rgba(10,8,6,0.85)',
                    border: `1px solid ${ac}50`,
                    padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {item.category}
                  </span>
                )}
                {/* Price over image */}
                {item.priceRange && (
                  <span style={{
                    position: 'absolute', top: 8, right: 10,
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13,
                    fontWeight: 800, color: '#60df80',
                    background: 'rgba(4,22,10,0.9)',
                    border: '1px solid rgba(60,180,80,0.4)',
                    padding: '3px 10px', borderRadius: 4,
                  }}>
                    {item.priceRange}
                  </span>
                )}
              </div>
            ) : null}

            {/* Content area */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              padding: item.imageUrl ? '10px 14px 12px 22px' : '14px 14px 12px 22px',
              position: 'relative', zIndex: 1, minHeight: 0,
            }}>
              {/* Row: circle icon + category (no-image only) */}
              {!item.imageUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `${ac}18`, border: `1.5px solid ${ac}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13,
                  }}>
                    ⚙️
                  </div>
                  {item.category && (
                    <span style={{
                      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9,
                      color: ac, background: `${ac}15`, border: `1px solid ${ac}35`,
                      padding: '1px 7px', borderRadius: 10, letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {item.category}
                    </span>
                  )}
                </div>
              )}

              {/* Item name */}
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898',
                lineHeight: 1.5, marginBottom: 5,
              }}>
                {item.itemName}
              </div>

              {/* Description */}
              {item.description && (
                <div style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
                  color: '#907858', fontStyle: 'italic',
                  lineHeight: 1.5, flex: 1,
                }}>
                  &ldquo;{item.description}&rdquo;
                </div>
              )}

              {/* Bottom row: username + price (no-image only — with image price is overlaid) */}
              <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#504030' }}>
                  @{item.user.username}
                </span>
                {!item.imageUrl && item.priceRange && (
                  <span style={{
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
                    fontWeight: 800, color: '#60df80',
                    background: 'rgba(4,22,10,0.85)',
                    border: '1px solid rgba(60,180,80,0.35)',
                    padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
                  }}>
                    {item.priceRange}
                  </span>
                )}
              </div>
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
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${ac} 35%, ${ac} 65%, transparent 100%)`,
            }} />

            {/* Item name on back */}
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
              color: `${ac}cc`, textAlign: 'center',
            }}>
              {item.itemName}
            </div>

            {/* Price on back — large */}
            {item.priceRange && (
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 20,
                fontWeight: 900, color: '#60df80',
                background: 'rgba(4,22,10,0.85)',
                border: '1px solid rgba(60,180,80,0.35)',
                padding: '5px 16px', borderRadius: 4,
              }}>
                {item.priceRange}
              </div>
            )}

            {item.description && (
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
                color: '#907858', textAlign: 'center', lineHeight: 1.6,
              }}>
                {item.description}
              </div>
            )}

            {/* Link button */}
            {item.link ? (
              <a
                href={cleanUrl(item.link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  background: `linear-gradient(135deg, ${ac}, ${ac}bb)`,
                  color: '#0e0c08',
                  padding: '9px 18px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: `0 2px 12px ${ac}40`,
                }}
              >
                ↗ View Item
              </a>
            ) : (
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                color: '#504030', textAlign: 'center',
              }}>
                No link provided
              </div>
            )}

            {/* Bottom accent line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${ac}60 35%, ${ac}60 65%, transparent 100%)`,
            }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      {(isAdmin || isOwn) && onDelete && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            onClick={() => onDelete(item.id)}
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
        </div>
      )}
    </div>
  )
}
