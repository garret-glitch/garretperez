'use client'

export interface ChannelData {
  id: string
  channelName: string
  channelUrl: string
  description: string | null
  category: string | null
  imageUrl: string | null
  accentColor: string
  createdAt: string
  user: { id: string; username: string }
}

function cleanUrl(url: string) {
  return url.startsWith('http') ? url : `https://${url}`
}

export default function YoutubeChannelCard({
  channel,
  onDelete,
  isAdmin,
  isOwn,
}: {
  channel: ChannelData
  onDelete?: (id: string) => void
  isAdmin?: boolean
  isOwn?: boolean
}) {
  const ac = channel.accentColor
  const uid = channel.id.replace(/[^a-z0-9]/gi, '')

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .yt-${uid}:hover .yt-inner-${uid} {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Perspective wrapper */}
      <div
        className={`yt-${uid}`}
        style={{ width: '100%', paddingBottom: '66%', position: 'relative', perspective: '1200px' }}
      >
        <div
          className={`yt-inner-${uid}`}
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
            {channel.imageUrl && (
              <div style={{ position: 'relative', height: '44%', flexShrink: 0, marginLeft: 5 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={channel.imageUrl}
                  alt={channel.channelName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Bottom fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                  background: 'linear-gradient(to top, #12100e, transparent)',
                  pointerEvents: 'none',
                }} />
                {/* Category pill over image */}
                {channel.category && (
                  <span style={{
                    position: 'absolute', top: 8, left: 10,
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9,
                    color: ac, background: 'rgba(10,8,6,0.85)',
                    border: `1px solid ${ac}50`,
                    padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {channel.category}
                  </span>
                )}
              </div>
            )}

            {/* Content area */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              padding: channel.imageUrl ? '10px 14px 12px 22px' : '14px 14px 12px 22px',
              position: 'relative', zIndex: 1, minHeight: 0,
            }}>
              {/* Play icon + category (no-image only) */}
              {!channel.imageUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: `${ac}18`, border: `1.5px solid ${ac}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, paddingLeft: 2,
                  }}>
                    ▶
                  </div>
                  {channel.category && (
                    <span style={{
                      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9,
                      color: ac, background: `${ac}15`, border: `1px solid ${ac}35`,
                      padding: '1px 7px', borderRadius: 10, letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {channel.category}
                    </span>
                  )}
                </div>
              )}

              {/* Channel name */}
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898',
                lineHeight: 1.5, marginBottom: 5,
              }}>
                {channel.channelName}
              </div>

              {/* Description */}
              {channel.description && (
                <div style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
                  color: '#907858', fontStyle: 'italic',
                  lineHeight: 1.5, flex: 1,
                }}>
                  &ldquo;{channel.description}&rdquo;
                </div>
              )}

              {/* Bottom: recommended by */}
              <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: '#504030' }}>
                  rec by @{channel.user.username}
                </span>
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
            gap: 14,
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${ac} 35%, ${ac} 65%, transparent 100%)`,
            }} />

            {/* Channel name on back */}
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
              color: `${ac}cc`, textAlign: 'center',
            }}>
              {channel.channelName}
            </div>

            {channel.description && (
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
                color: '#907858', textAlign: 'center', lineHeight: 1.6,
              }}>
                {channel.description}
              </div>
            )}

            {/* Watch button */}
            <a
              href={cleanUrl(channel.channelUrl)}
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
              ▶ Watch on YouTube
            </a>

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
            onClick={() => onDelete(channel.id)}
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
