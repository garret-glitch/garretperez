'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { emitXpGained } from '@/components/XpToast'

const S = {
  card:     '#16120e',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.22)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
}

type Phase = 'idle' | 'preview' | 'identifying' | 'result' | 'error'

interface WineResult {
  id: string
  wineName: string
  winery?: string
  varietal?: string
  region?: string
  vintage?: string
  style?: string
  abv?: string
  tastingNotes?: string
  pairings: string[]
  confidence: string
  identificationMethod?: string
}

const LOADING_MSGS = [
  'Reading the label...',
  'Consulting the sommelier...',
  'Checking vintage notes...',
  'Analyzing the terroir...',
  'Decanting the data...',
  'Cross-referencing the cellar...',
]

const STYLE_COLORS: Record<string, { bg: string; border: string }> = {
  'Sweet Red':   { bg: 'rgba(180,40,60,0.18)',  border: 'rgba(180,40,60,0.5)'  },
  'Dry Red':     { bg: 'rgba(130,20,40,0.18)',  border: 'rgba(130,20,40,0.5)'  },
  'Bold Red':    { bg: 'rgba(100,10,30,0.22)',  border: 'rgba(100,10,30,0.55)' },
  'Crisp White': { bg: 'rgba(50,130,70,0.15)',  border: 'rgba(50,130,70,0.45)' },
  'Sweet White': { bg: 'rgba(160,140,40,0.15)', border: 'rgba(160,140,40,0.45)'},
  'Rosé':        { bg: 'rgba(200,80,120,0.15)', border: 'rgba(200,80,120,0.45)'},
  'Sparkling':   { bg: 'rgba(60,100,160,0.15)', border: 'rgba(60,100,160,0.45)'},
  'Dessert':     { bg: 'rgba(180,100,20,0.15)', border: 'rgba(180,100,20,0.45)'},
}

const CONFIDENCE_CFG: Record<string, { label: string; color: string; icon: string }> = {
  high:   { label: 'High Confidence',   color: '#4a9a4a', icon: '✓' },
  medium: { label: 'Medium Confidence', color: '#c89b3c', icon: '◎' },
  low:    { label: 'Low Confidence',    color: '#8a6040', icon: '○' },
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function WineIdentifier() {
  const { data: session } = useSession()
  const [phase, setPhase]           = useState<Phase>('idle')
  const [imageData, setImageData]   = useState('')
  const [result, setResult]         = useState<WineResult | null>(null)
  const [error, setError]           = useState('')
  const [msgIdx, setMsgIdx]         = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [favorited, setFavorited]   = useState(false)
  const [rating, setRating]         = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingNote, setRatingNote] = useState('')
  const [logSaved, setLogSaved]     = useState(false)
  const [comment, setComment]       = useState('')
  const [comments, setComments]     = useState<Array<{ id: string; body: string; user: { username: string } }>>([])
  const fileRef   = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 15 * 1024 * 1024) { setError('Image must be under 15MB.'); return }
    try {
      const compressed = await compressImage(file)
      setImageData(compressed)
      setPhase('preview')
      setError('')
    } catch {
      setError('Failed to process image.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function identify() {
    if (!imageData) return
    setPhase('identifying'); setMsgIdx(0)
    let i = 0
    timerRef.current = setInterval(() => { i = (i + 1) % LOADING_MSGS.length; setMsgIdx(i) }, 1800)
    try {
      const res = await fetch('/api/wine-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })
      clearInterval(timerRef.current!)
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Identification failed') }
      const data = await res.json()
      if (data.xpAwarded > 0) emitXpGained(data.xpAwarded)
      setResult({ id: data.id, ...data.wine })
      setPhase('result')
    } catch (err) {
      clearInterval(timerRef.current!)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  async function toggleFavorite() {
    if (!result?.id || !session) return
    const res = await fetch('/api/wine-favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wineId: result.id }),
    })
    if (res.ok) setFavorited((await res.json()).favorited)
  }

  async function submitLog() {
    if (!result?.id || !session || !rating) return
    await fetch('/api/wine-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wineId: result.id, rating, note: ratingNote }),
    })
    setLogSaved(true)
  }

  async function submitComment() {
    if (!result?.id || !session || !comment.trim()) return
    const res = await fetch('/api/wine-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wineId: result.id, body: comment }),
    })
    if (res.ok) {
      const data = await res.json()
      setComments(prev => [data.comment, ...prev])
      setComment('')
    }
  }

  function reset() {
    setPhase('idle'); setImageData(''); setResult(null); setError('')
    setRating(0); setRatingNote(''); setLogSaved(false)
    setFavorited(false); setComment(''); setComments([])
  }

  const styleCtx = result?.style ? (STYLE_COLORS[result.style] ?? STYLE_COLORS['Dry Red']) : null
  const confCtx  = result?.confidence ? (CONFIDENCE_CFG[result.confidence] ?? CONFIDENCE_CFG.medium) : null

  return (
    <div style={{
      background: S.card,
      border: `1px solid ${S.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: `1px solid rgba(200,155,60,0.1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.08em', marginBottom: 6 }}>
            🔍 AI WINE IDENTIFIER
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3, lineHeight: 1.4 }}>
            Upload a wine label photo — get a full sommelier review instantly
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            background: 'rgba(200,155,60,0.08)', border: `1px solid rgba(200,155,60,0.28)`,
            padding: '6px 12px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold,
          }}>
            +25 XP
          </div>
          {phase !== 'idle' && (
            <button onClick={reset} style={{
              background: 'none', border: `1px solid rgba(200,155,60,0.18)`,
              color: S.text3, padding: '6px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
            }}>
              ↩ Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Phase: idle ── */}
      {phase === 'idle' && (
        <div style={{ padding: '28px 24px' }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? S.gold : 'rgba(200,155,60,0.28)'}`,
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(200,155,60,0.04)' : 'transparent',
              transition: 'all 0.18s',
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🍷</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: S.text1, marginBottom: 10 }}>
              Upload a Wine Label Photo
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.7, marginBottom: 22 }}>
              Our AI sommelier reads the label, recognizes the brand,<br />
              and delivers a professional wine review in seconds
            </div>
            <button style={{
              padding: '13px 28px',
              background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
              border: 'none', color: '#0a0600',
              fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
            }}>
              📷 Choose Photo
            </button>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginTop: 14 }}>
              JPG, PNG, WebP · Works on Stella Rosa, Matua, Juggernaut, Llano, Bogle + more
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            style={{ display: 'none' }} />
          {!session && (
            <div style={{
              marginTop: 14, padding: '13px 18px',
              background: 'rgba(200,155,60,0.05)', border: `1px solid rgba(200,155,60,0.14)`,
              borderRadius: 8, textAlign: 'center',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3,
            }}>
              <a href="/login" style={{ color: S.gold, textDecoration: 'none', fontWeight: 600 }}>Log in</a>
              {' '}to earn +25 XP when you identify your first wine today!
            </div>
          )}
        </div>
      )}

      {/* ── Phase: preview ── */}
      {phase === 'preview' && (
        <div style={{ padding: '24px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageData} alt="Wine bottle"
            style={{ width: 160, height: 240, objectFit: 'cover', borderRadius: 8, border: `1px solid rgba(200,155,60,0.2)`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 700, color: S.text1, marginBottom: 8 }}>
                Ready to identify!
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65 }}>
                Our AI sommelier will analyze the label and produce a full wine profile — tasting notes, pairings, region, and more.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={identify} style={{
                padding: '13px 26px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                border: 'none', color: '#0a0600',
                fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}>
                🔍 Identify This Wine
              </button>
              <button onClick={reset} style={{
                padding: '13px 18px',
                background: 'none', border: `1px solid rgba(200,155,60,0.22)`,
                color: S.text3, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer',
              }}>
                Re-upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase: identifying ── */}
      {phase === 'identifying' && (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 18, display: 'inline-block' }}>🍷</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: S.text1, marginBottom: 10 }}>
            Identifying your wine...
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.gold, opacity: 0.85 }}>
            {LOADING_MSGS[msgIdx]}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 22 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: S.gold,
                opacity: 0.25 + (i * 0.25),
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Phase: error ── */}
      {phase === 'error' && (
        <div style={{ padding: '44px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>😕</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: '#d04040', marginBottom: 8 }}>
            Identification Failed
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, marginBottom: 22, maxWidth: 440, margin: '0 auto 22px' }}>
            {error || 'Something went wrong. Please try again.'}
          </div>
          <button onClick={reset} style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
            border: 'none', color: '#0a0600',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Try Again
          </button>
        </div>
      )}

      {/* ── Phase: result ── */}
      {phase === 'result' && result && (
        <>
          {/* ── Main result panel ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* Left: bottle photo */}
            <div style={{
              position: 'relative',
              background: `
                radial-gradient(ellipse 60% 75% at 50% 85%, rgba(120,20,40,0.32) 0%, transparent 70%),
                radial-gradient(ellipse 80% 55% at 50% 25%, rgba(200,155,60,0.06) 0%, transparent 65%),
                linear-gradient(180deg, #0c0a08 0%, #14100c 55%, #0e0b09 100%)
              `,
              width: 220,
              minHeight: 360,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              padding: 24, gap: 14,
            }}>
              {/* Gold top line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.45) 40%, rgba(200,155,60,0.45) 60%, transparent)',
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData} alt="Wine bottle"
                style={{
                  width: 150, height: 240, objectFit: 'cover', objectPosition: 'center top',
                  borderRadius: 8,
                  filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                  display: 'block',
                }} />
              {/* Confidence badge */}
              {confCtx && (
                <div style={{
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                  border: `1px solid ${confCtx.color}40`,
                  padding: '5px 14px', borderRadius: 20,
                  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                  color: confCtx.color, whiteSpace: 'nowrap',
                }}>
                  {confCtx.icon} {confCtx.label}
                </div>
              )}
            </div>

            {/* Right: wine details */}
            <div style={{ flex: 1, minWidth: 220, padding: '28px 28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Style badge + wine name */}
              {result.style && styleCtx && (
                <div style={{
                  display: 'inline-flex', alignSelf: 'flex-start',
                  background: styleCtx.bg, border: `1px solid ${styleCtx.border}`,
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  color: S.text1, padding: '5px 10px', letterSpacing: '0.08em',
                  marginBottom: 10,
                }}>
                  {result.style.toUpperCase()}
                </div>
              )}

              <h2 style={{
                fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 900,
                color: S.text1, lineHeight: 1.2, margin: '0 0 6px',
                letterSpacing: '-0.02em',
              }}>
                {result.wineName}
              </h2>

              {result.winery && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.goldDim, marginBottom: 16, fontStyle: 'italic' }}>
                  {result.winery}
                </div>
              )}

              {/* Meta pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {result.region && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3, background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.16)`, padding: '4px 10px', borderRadius: 4 }}>
                    {result.region}
                  </span>
                )}
                {result.varietal && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3, background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.16)`, padding: '4px 10px', borderRadius: 4 }}>
                    {result.varietal}
                  </span>
                )}
                {result.vintage && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.gold, background: 'rgba(200,155,60,0.1)', border: `1px solid rgba(200,155,60,0.28)`, padding: '4px 10px', borderRadius: 4, fontWeight: 700 }}>
                    {result.vintage}
                  </span>
                )}
                {result.abv && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.gold, background: 'rgba(200,155,60,0.1)', border: `1px solid rgba(200,155,60,0.28)`, padding: '4px 10px', borderRadius: 4, fontWeight: 700 }}>
                    {result.abv} ABV
                  </span>
                )}
              </div>

              {/* Tasting notes */}
              {result.tastingNotes && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.14em', marginBottom: 10 }}>
                    TASTING NOTES
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.8, margin: 0 }}>
                    {result.tastingNotes}
                  </p>
                </div>
              )}

              {/* Pairings */}
              {result.pairings.length > 0 && (
                <div style={{ borderTop: `1px solid rgba(200,155,60,0.1)`, paddingTop: 18 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.14em', marginBottom: 12 }}>
                    PAIRS WITH
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {result.pairings.map((p, i) => (
                      <span key={i} style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2,
                        background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.2)`,
                        padding: '5px 12px', borderRadius: 20,
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Action bar ── */}
          <div style={{
            borderTop: `1px solid rgba(200,155,60,0.1)`,
            padding: '16px 24px',
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {session ? (
              <button onClick={toggleFavorite} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px',
                background: favorited ? 'rgba(200,60,80,0.14)' : 'rgba(200,155,60,0.07)',
                border: `1px solid ${favorited ? 'rgba(200,60,80,0.4)' : 'rgba(200,155,60,0.22)'}`,
                color: favorited ? '#e05070' : S.text2,
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {favorited ? '♥ Saved' : '♡ Save to Favorites'}
              </button>
            ) : null}
            <button onClick={reset} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px',
              background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.2)`,
              color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}>
              📷 Scan Another Wine
            </button>
            <div style={{ flex: 1 }} />
            {result.identificationMethod && (
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4,
                background: 'rgba(200,155,60,0.04)', border: `1px solid rgba(200,155,60,0.1)`,
                padding: '5px 10px', borderRadius: 4,
              }}>
                {result.identificationMethod === 'label_text' ? '🔤 Label Read'
                  : result.identificationMethod === 'label_design' ? '🎨 Brand Recognized'
                  : '🔍 Visual Analysis'}
              </div>
            )}
          </div>

          {/* ── Tasting log (logged-in users) ── */}
          {session && (
            <div style={{ borderTop: `1px solid rgba(200,155,60,0.1)`, padding: '20px 24px' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.goldDim, letterSpacing: '0.1em', marginBottom: 16 }}>
                📓 YOUR TASTING LOG
              </div>
              {!logSaved ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Rate this wine
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 28, lineHeight: 1, padding: '0 2px',
                            color: star <= (hoverRating || rating) ? '#c89b3c' : 'rgba(200,155,60,0.18)',
                            transition: 'color 0.1s, transform 0.1s',
                            transform: star <= (hoverRating || rating) ? 'scale(1.18)' : 'scale(1)',
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={ratingNote}
                    onChange={e => setRatingNote(e.target.value)}
                    placeholder="Tasting note... (optional)"
                    rows={2}
                    maxLength={500}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: S.elevated, border: `1px solid rgba(200,155,60,0.2)`,
                      color: S.text1, padding: '10px 13px',
                      fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.5, resize: 'vertical',
                    }}
                  />
                  <div>
                    <button onClick={submitLog} disabled={!rating} style={{
                      padding: '10px 20px',
                      background: rating ? 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)' : 'rgba(200,155,60,0.12)',
                      border: 'none',
                      color: rating ? '#0a0600' : 'rgba(200,155,60,0.3)',
                      fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
                      cursor: rating ? 'pointer' : 'not-allowed',
                    }}>
                      📓 Save to Tasting Log
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a9a4a' }}>
                  ✓ Saved — {['', '★', '★★', '★★★', '★★★★', '★★★★★'][rating]}
                  {ratingNote && (
                    <span style={{ color: S.text3 }}> &mdash; &ldquo;{ratingNote}&rdquo;</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Community comments ── */}
          <div style={{ borderTop: `1px solid rgba(200,155,60,0.1)`, padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.goldDim, letterSpacing: '0.1em', marginBottom: 16 }}>
              💬 COMMUNITY THOUGHTS
            </div>
            {session ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your thoughts on this wine..."
                  rows={2}
                  maxLength={500}
                  style={{
                    flex: 1, background: S.elevated, border: `1px solid rgba(200,155,60,0.2)`,
                    color: S.text1, padding: '10px 13px',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.5, resize: 'vertical',
                  }}
                />
                <button onClick={submitComment} disabled={!comment.trim()} style={{
                  padding: '10px 16px', alignSelf: 'flex-start', flexShrink: 0,
                  background: comment.trim() ? 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)' : 'rgba(200,155,60,0.12)',
                  border: 'none',
                  color: comment.trim() ? '#0a0600' : 'rgba(200,155,60,0.3)',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                  cursor: comment.trim() ? 'pointer' : 'not-allowed',
                }}>
                  Post
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4 }}>
                <a href="/login" style={{ color: S.gold, textDecoration: 'none' }}>Log in</a> to comment.
              </div>
            )}
            {comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c.id} style={{
                    background: S.elevated, border: `1px solid rgba(200,155,60,0.1)`,
                    borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, marginBottom: 5 }}>
                      {c.user.username}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.65 }}>
                      {c.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {comments.length === 0 && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4, fontStyle: 'italic' }}>
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
