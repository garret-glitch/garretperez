'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UpvoteButton from '@/components/UpvoteButton'

interface Reply {
  id: string; body: string; createdAt: string; user: { username: string }
}
export interface FeedPost {
  id: string; title: string; body: string; imageUrl: string | null; createdAt: string
  user: { username: string }
  replies: Reply[]
  upvotes: { userId: string }[]
}

interface CatchData {
  __catchData?: boolean
  species?: string; length?: string; weight?: string
  spot?: string; location?: string; bait?: string; lure?: string
  rod?: string; water?: string; weather?: string; timeOfDay?: string; notes?: string
}

function parseCatch(body: string): CatchData | null {
  try { const d = JSON.parse(body); return d.__catchData ? d : null }
  catch { return null }
}

function getAvatarColor(name: string) {
  const cols = ['#2a1a0e','#1a1a2e','#0e2018','#2a0e0e','#1e1428','#1a2010']
  return cols[name.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % cols.length]
}
function getAvatarBorder(name: string) {
  const cols = ['rgba(200,155,60,0.5)','rgba(120,100,200,0.5)','rgba(60,160,80,0.5)','rgba(200,60,60,0.5)','rgba(140,80,220,0.5)','rgba(80,160,60,0.5)']
  return cols[name.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % cols.length]
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 604800) return `${Math.floor(s/86400)}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const S = {
  card:     '#0f1520',
  elevated: '#141e2c',
  border:   'rgba(60,160,220,0.18)',
  gold:     '#c89b3c',
  text1:    '#e8f2f8',
  text2:    '#7aaac8',
  text3:    '#3a6080',
  text4:    '#1e3850',
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '4px 11px',
      background: bg, color,
      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
      borderRadius: 20, whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>{label}</span>
  )
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: getAvatarColor(name),
      border: `1.5px solid ${getAvatarBorder(name)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.3), fontWeight: 700,
      color: '#d8c890', fontFamily: 'Inter, sans-serif',
    }}>
      {name.slice(0,2).toUpperCase()}
    </div>
  )
}

function InlineReplyForm({ postId }: { postId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, body: body.trim() }),
    })
    setSubmitting(false)
    if (res.ok) {
      setBody(''); setOpen(false); router.refresh()
    } else {
      setMsg(res.status === 401 ? 'Login to reply.' : 'Error.')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  if (!open) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
      <button onClick={() => setOpen(true)} style={{
        background: 'none', border: 'none', color: S.text3,
        fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', padding: 0,
      }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = S.gold }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = S.text3 }}
      >💬 Reply</button>
      {msg && <span style={{ fontSize: 12, color: '#cc6060', fontFamily: 'Inter, sans-serif' }}>{msg}</span>}
    </div>
  )

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
      <textarea autoFocus value={body} onChange={e => setBody(e.target.value)}
        placeholder="Write a reply..."
        rows={2} disabled={submitting}
        style={{
          flex: 1, background: S.elevated, border: `1px solid ${S.border}`,
          color: S.text1, padding: '8px 12px',
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          resize: 'none', outline: 'none', lineHeight: 1.55, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="submit" disabled={!body.trim() || submitting} style={{
          padding: '6px 14px',
          background: 'linear-gradient(135deg, #c89b3c, #a07828)',
          border: 'none', color: '#0a0600',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
          cursor: !body.trim() ? 'not-allowed' : 'pointer',
          opacity: !body.trim() ? 0.5 : 1,
        }}>Send</button>
        <button type="button" onClick={() => { setOpen(false); setBody('') }} style={{
          padding: '6px 14px', background: 'transparent',
          border: `1px solid rgba(60,160,220,0.25)`,
          color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
        }}>✕</button>
      </div>
    </form>
  )
}

function ReplyThread({ replies }: { replies: Reply[] }) {
  if (!replies.length) return null
  return (
    <div style={{
      paddingLeft: 14, borderLeft: `2px solid rgba(60,160,220,0.15)`,
      marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {replies.map(r => (
        <div key={r.id} style={{ display: 'flex', gap: 10 }}>
          <Avatar name={r.user.username} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
              <Link href={`/profile/${r.user.username}`}
                style={{ fontSize: 12, fontWeight: 600, color: S.gold, textDecoration: 'none' }}>
                {r.user.username}
              </Link>
              <span style={{ fontSize: 10, color: S.text4 }}>{timeAgo(r.createdAt)}</span>
            </div>
            <div style={{ fontSize: 13, color: S.text3, lineHeight: 1.6 }}>{r.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CatchCard({ post, currentUserId, isLoggedIn }: {
  post: FeedPost; currentUserId?: string; isLoggedIn: boolean
}) {
  const cd = parseCatch(post.body)
  const upvoteCount = post.upvotes.length
  const hasUpvoted  = currentUserId ? post.upvotes.some(u => u.userId === currentUserId) : false

  if (cd) {
    return (
      <div style={{
        background: S.card, border: `1px solid ${S.border}`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        {/* Photo hero */}
        {post.imageUrl ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt={post.title} style={{
              width: '100%', height: 280, objectFit: 'cover', display: 'block',
            }} />
            {/* Bottom gradient */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
              background: 'linear-gradient(to top, rgba(8,14,24,0.95), transparent)',
              pointerEvents: 'none',
            }} />
            {/* Species badge */}
            {cd.species && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(10,50,25,0.92)', backdropFilter: 'blur(4px)',
                color: '#5abf80',
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                padding: '5px 10px', letterSpacing: '0.06em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}>🐟 {cd.species}</div>
            )}
            {/* Time badge */}
            {cd.timeOfDay && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(50,25,5,0.92)', backdropFilter: 'blur(4px)',
                color: '#c89b60',
                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                padding: '4px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}>🕐 {cd.timeOfDay}</div>
            )}
            {/* Measurements overlay at bottom */}
            {(cd.length || cd.weight) && (
              <div style={{
                position: 'absolute', bottom: 12, left: 14,
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                {cd.length && (
                  <span style={{
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    color: '#e8f2f8', fontFamily: 'Inter, sans-serif',
                    fontSize: 14, fontWeight: 700, padding: '5px 12px',
                  }}>📏 {cd.length}&quot;</span>
                )}
                {cd.weight && (
                  <span style={{
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    color: '#e8f2f8', fontFamily: 'Inter, sans-serif',
                    fontSize: 14, fontWeight: 700, padding: '5px 12px',
                  }}>⚖️ {cd.weight} lbs</span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No photo — show species + measurements as top badges */
          (cd.species || cd.length || cd.weight) && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(10,30,50,0.6) 0%, rgba(5,15,30,0.4) 100%)',
              borderBottom: `1px solid ${S.border}`,
              padding: '14px 20px',
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
              {cd.species && (
                <span style={{
                  background: 'rgba(10,50,25,0.9)', color: '#5abf80',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  padding: '5px 11px', letterSpacing: '0.06em',
                }}>🐟 {cd.species}</span>
              )}
              {cd.length && (
                <span style={{
                  background: S.elevated, color: S.text1, border: `1px solid ${S.border}`,
                  fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
                  padding: '5px 12px',
                }}>📏 {cd.length}&quot;</span>
              )}
              {cd.weight && (
                <span style={{
                  background: S.elevated, color: S.text1, border: `1px solid ${S.border}`,
                  fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
                  padding: '5px 12px',
                }}>⚖️ {cd.weight} lbs</span>
              )}
            </div>
          )
        )}

        {/* Card body */}
        <div style={{ padding: '18px 20px 18px' }}>
          {/* Title + user */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{
              fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 800,
              color: S.text1, marginBottom: 8, lineHeight: 1.3,
            }}>{post.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Avatar name={post.user.username} size={22} />
              <Link href={`/profile/${post.user.username}`}
                style={{ fontSize: 13, fontWeight: 600, color: S.gold, textDecoration: 'none' }}>
                {post.user.username}
              </Link>
              <span style={{ fontSize: 12, color: S.text4 }}>·</span>
              <span style={{ fontSize: 12, color: S.text4 }}>{timeAgo(post.createdAt)}</span>
            </div>
          </div>

          {/* Detail badges */}
          {(cd.spot || cd.bait || cd.lure || cd.water || cd.weather) && (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap',
              paddingBottom: 14, marginBottom: 14,
              borderBottom: `1px solid rgba(60,160,220,0.08)`,
            }}>
              {cd.spot    && <Pill label={`📍 ${cd.spot}`}    bg="rgba(70,45,8,0.65)"    color="#c89b3c" />}
              {cd.bait    && <Pill label={`🪡 ${cd.bait}`}    bg="rgba(8,45,80,0.7)"    color="#4ab0d0" />}
              {cd.lure    && <Pill label={`🪁 ${cd.lure}`}    bg="rgba(8,40,75,0.6)"    color="#4ab0d0" />}
              {cd.water   && <Pill label={`🌊 ${cd.water}`}   bg="rgba(8,25,55,0.75)"   color="#3aa0c0" />}
              {cd.weather && <Pill label={`⛅ ${cd.weather}`} bg="rgba(8,25,55,0.65)"   color="#3aa0c0" />}
            </div>
          )}

          {/* Rod/Reel */}
          {cd.rod && (
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3,
              marginBottom: 12, fontStyle: 'italic',
            }}>🎣 {cd.rod}</div>
          )}

          {/* Notes */}
          {cd.notes && (
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2,
              lineHeight: 1.75, marginBottom: 16, whiteSpace: 'pre-wrap', margin: '0 0 16px',
            }}>{cd.notes}</p>
          )}

          {/* Reactions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <UpvoteButton postId={post.id} count={upvoteCount} upvoted={hasUpvoted} />
            {post.replies.length > 0 && (
              <span style={{ fontSize: 12, color: S.text4 }}>
                💬 {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>

          <ReplyThread replies={post.replies} />
          {isLoggedIn && <InlineReplyForm postId={post.id} />}
        </div>
      </div>
    )
  }

  /* ── Plain post (legacy / no catch data) ── */
  return (
    <div style={{
      background: S.card, border: `1px solid ${S.border}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    }}>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt={post.title} style={{
          width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block',
        }} />
      )}
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ marginBottom: 10 }}>
          <h3 style={{
            fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700,
            color: S.text1, marginBottom: 6, lineHeight: 1.3,
          }}>{post.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={post.user.username} size={20} />
            <Link href={`/profile/${post.user.username}`}
              style={{ fontSize: 13, fontWeight: 600, color: S.gold, textDecoration: 'none' }}>
              {post.user.username}
            </Link>
            <span style={{ fontSize: 12, color: S.text4 }}>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2,
          lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 14px',
        }}>{post.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <UpvoteButton postId={post.id} count={upvoteCount} upvoted={hasUpvoted} />
          {post.replies.length > 0 && (
            <span style={{ fontSize: 12, color: S.text4 }}>
              💬 {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
        <ReplyThread replies={post.replies} />
        {isLoggedIn && <InlineReplyForm postId={post.id} />}
      </div>
    </div>
  )
}

type SortMode = 'newest' | 'biggest' | 'most_liked'

export default function FishingFeed({ posts, currentUserId, isLoggedIn }: {
  posts: FeedPost[]; currentUserId?: string; isLoggedIn: boolean
}) {
  const [sort,          setSort]          = useState<SortMode>('newest')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [baitFilter,    setBaitFilter]    = useState('')
  const [spotFilter,    setSpotFilter]    = useState('')

  const allSpecies = Array.from(new Set(
    posts.flatMap(p => { const c = parseCatch(p.body); return c?.species ? [c.species] : [] })
  )).sort()
  const allBaits = Array.from(new Set(
    posts.flatMap(p => { const c = parseCatch(p.body); return c?.bait ? [c.bait] : [] })
  )).sort()
  const allSpots = Array.from(new Set(
    posts.flatMap(p => { const c = parseCatch(p.body); return c?.spot ? [c.spot] : [] })
  )).sort()

  let filtered = posts.filter(p => {
    const c = parseCatch(p.body)
    if (speciesFilter && c?.species !== speciesFilter) return false
    if (baitFilter    && c?.bait    !== baitFilter)    return false
    if (spotFilter    && c?.spot    !== spotFilter)    return false
    return true
  })

  if (sort === 'newest') {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sort === 'biggest') {
    filtered = [...filtered].sort((a, b) => {
      const wa = (() => { const c = parseCatch(a.body); return c?.weight ? parseFloat(c.weight) : 0 })()
      const wb = (() => { const c = parseCatch(b.body); return c?.weight ? parseFloat(c.weight) : 0 })()
      return wb - wa
    })
  } else {
    filtered = [...filtered].sort((a, b) => b.upvotes.length - a.upvotes.length)
  }

  const hasFilters = speciesFilter || baitFilter || spotFilter

  const selStyle: React.CSSProperties = {
    background: '#141e2c', border: '1px solid rgba(60,160,220,0.2)',
    color: '#7aaac8', padding: '8px 14px',
    fontFamily: 'Inter, sans-serif', fontSize: 13,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', minWidth: 130, maxWidth: '100%',
  }

  return (
    <div>
      {/* Filter / sort bar */}
      {posts.length > 0 && (
        <div style={{
          background: '#080d14',
          border: '1px solid rgba(60,160,220,0.14)',
          padding: '12px 16px',
          marginBottom: 22,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {/* Sort tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { k: 'newest',    l: '🕒 Newest'      },
              { k: 'biggest',   l: '⚖️ Biggest'      },
              { k: 'most_liked',l: '❤️ Most Liked'  },
            ] as { k: SortMode; l: string }[]).map(({ k, l }) => (
              <button key={k} onClick={() => setSort(k)} style={{
                padding: '7px 14px',
                background: sort === k ? 'rgba(200,155,60,0.14)' : 'transparent',
                border: sort === k ? '1px solid rgba(200,155,60,0.45)' : '1px solid rgba(60,160,220,0.14)',
                color: sort === k ? '#c89b3c' : '#3a6080',
                fontFamily: 'Inter, sans-serif', fontSize: 12,
                fontWeight: sort === k ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 8 }} />

          {allSpecies.length > 0 && (
            <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} style={selStyle}>
              <option value="">All Species</option>
              {allSpecies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {allBaits.length > 0 && (
            <select value={baitFilter} onChange={e => setBaitFilter(e.target.value)} style={selStyle}>
              <option value="">All Bait</option>
              {allBaits.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {allSpots.length > 0 && (
            <select value={spotFilter} onChange={e => setSpotFilter(e.target.value)} style={selStyle}>
              <option value="">All Spots</option>
              {allSpots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {hasFilters && (
            <button onClick={() => { setSpeciesFilter(''); setBaitFilter(''); setSpotFilter('') }} style={{
              padding: '7px 12px', background: 'transparent',
              border: '1px solid rgba(200,60,60,0.3)', color: '#cc8888',
              fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
            }}>✕ Clear</button>
          )}
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#1a3050',
        }}>
          {hasFilters ? 'No catches match your filters 🎣' : 'No catches yet — be the first to post! 🎣'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filtered.map(p => (
            <CatchCard key={p.id} post={p} currentUserId={currentUserId} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      )}
    </div>
  )
}
