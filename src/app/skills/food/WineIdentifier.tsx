'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { emitXpGained } from '@/components/XpToast'

const S = {
  bg:       '#0e0a08',
  card:     '#16120e',
  card2:    '#13100c',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.2)',
  borderLit:'rgba(200,155,60,0.45)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  goldFaint:'rgba(200,155,60,0.08)',
  wine:     '#7a1428',
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
  flavorNotes: string[]
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

// Style → colors
const STYLE_CFG: Record<string, { bg: string; text: string; glow: string }> = {
  'Sweet Red':   { bg: 'rgba(160,30,55,0.85)',   text: '#f8dce4', glow: 'rgba(160,30,55,0.35)'  },
  'Dry Red':     { bg: 'rgba(120,18,36,0.85)',   text: '#f8dce4', glow: 'rgba(120,18,36,0.3)'   },
  'Bold Red':    { bg: 'rgba(90,10,24,0.92)',    text: '#f8dce4', glow: 'rgba(90,10,24,0.35)'   },
  'Crisp White': { bg: 'rgba(38,110,56,0.85)',   text: '#d4f0dd', glow: 'rgba(38,110,56,0.28)'  },
  'Sweet White': { bg: 'rgba(140,120,20,0.85)',  text: '#f8f0cc', glow: 'rgba(140,120,20,0.28)' },
  'Rosé':        { bg: 'rgba(190,65,110,0.85)',  text: '#ffe0ec', glow: 'rgba(190,65,110,0.3)'  },
  'Sparkling':   { bg: 'rgba(45,85,150,0.85)',   text: '#d8e8ff', glow: 'rgba(45,85,150,0.28)'  },
  'Dessert':     { bg: 'rgba(160,85,10,0.85)',   text: '#fde8c0', glow: 'rgba(160,85,10,0.28)'  },
}
const DEFAULT_STYLE = { bg: 'rgba(100,80,40,0.8)', text: '#f0e8d8', glow: 'rgba(100,80,40,0.25)' }

// Confidence → color + icon
const CONF_CFG: Record<string, { label: string; color: string; dot: string }> = {
  high:   { label: 'High Confidence',   color: '#52a852', dot: '#52a852' },
  medium: { label: 'Medium Confidence', color: '#c89b3c', dot: '#c89b3c' },
  low:    { label: 'Low Confidence',    color: '#8a6040', dot: '#8a6040' },
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1400
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = reject
    img.src = url
  })
}

/* ── Small reusable label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Press Start 2P', monospace", fontSize: 7,
      color: S.goldDim, letterSpacing: '0.14em', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

/* ── Pill badge ── */
function Pill({ children, variant = 'meta' }: { children: React.ReactNode; variant?: 'meta' | 'flavor' | 'pairing' | 'abv' }) {
  const styles: Record<string, React.CSSProperties> = {
    meta:    { background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.18)', color: S.text3 },
    abv:     { background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.32)', color: S.gold, fontWeight: 700 },
    flavor:  { background: 'rgba(140,20,44,0.18)',  border: '1px solid rgba(180,40,64,0.35)', color: '#d09090' },
    pairing: { background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)',  color: S.text2 },
  }
  return (
    <span style={{
      fontFamily: 'Inter, sans-serif', fontSize: 12,
      padding: '4px 11px', borderRadius: 20,
      lineHeight: 1.4,
      ...styles[variant],
    }}>
      {children}
    </span>
  )
}

export default function WineIdentifier() {
  const { data: session } = useSession()
  const [phase, setPhase]     = useState<Phase>('idle')
  const [imgData, setImgData] = useState('')
  const [result, setResult]   = useState<WineResult | null>(null)
  const [error, setError]     = useState('')
  const [msgIdx, setMsgIdx]   = useState(0)
  const [isDrag, setIsDrag]   = useState(false)

  // Actions
  const [favorited, setFavorited]   = useState(false)
  const [favXp, setFavXp]           = useState(0)
  const [rating, setRating]         = useState(0)
  const [hoverStar, setHoverStar]   = useState(0)
  const [logNote, setLogNote]       = useState('')
  const [logSaved, setLogSaved]     = useState(false)
  const [comment, setComment]       = useState('')
  const [comments, setComments]     = useState<Array<{ id: string; body: string; user: { username: string } }>>([])

  const fileRef  = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20MB.'); return }
    try {
      const compressed = await compressImage(file)
      setImgData(compressed)
      setPhase('preview')
      setError('')
    } catch { setError('Failed to process image.') }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function identify() {
    if (!imgData) return
    setPhase('identifying'); setMsgIdx(0)
    let i = 0
    timerRef.current = setInterval(() => { i = (i + 1) % LOADING_MSGS.length; setMsgIdx(i) }, 1900)
    try {
      const res = await fetch('/api/wine-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: imgData }),
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
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
      if (data.xpAwarded > 0) { setFavXp(data.xpAwarded); emitXpGained(data.xpAwarded) }
    }
  }

  async function submitLog() {
    if (!result?.id || !session || !rating) return
    await fetch('/api/wine-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wineId: result.id, rating, note: logNote }),
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
    setPhase('idle'); setImgData(''); setResult(null); setError('')
    setFavorited(false); setFavXp(0); setRating(0); setLogNote('')
    setLogSaved(false); setComment(''); setComments([])
  }

  const styleCfg = result?.style ? (STYLE_CFG[result.style] ?? DEFAULT_STYLE) : DEFAULT_STYLE
  const confCfg  = result?.confidence ? (CONF_CFG[result.confidence] ?? CONF_CFG.medium) : CONF_CFG.medium

  /* ════════════════════════════════════════════ */
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: 'hidden' }}>

      {/* ── Top header bar ── */}
      <div style={{
        padding: '18px 24px 16px',
        borderBottom: `1px solid rgba(200,155,60,0.08)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em', marginBottom: 5 }}>
            🔍 AI WINE IDENTIFIER
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
            Upload a label photo — instant sommelier review powered by AI
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold,
            background: S.goldFaint, border: `1px solid rgba(200,155,60,0.28)`,
            padding: '6px 12px',
          }}>
            +25 XP
          </div>
          {phase !== 'idle' && (
            <button onClick={reset} style={{
              background: 'none', border: `1px solid rgba(200,155,60,0.15)`,
              color: S.text4, padding: '6px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
            }}>
              ↩ Reset
            </button>
          )}
        </div>
      </div>

      {/* ══ IDLE ══════════════════════════════════════ */}
      {phase === 'idle' && (
        <div style={{ padding: '32px 28px' }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDrag ? S.gold : 'rgba(200,155,60,0.25)'}`,
              borderRadius: 12, padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
              background: isDrag ? 'rgba(200,155,60,0.04)' : 'transparent',
              transition: 'all 0.18s',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 18, lineHeight: 1 }}>🍷</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: S.text1, marginBottom: 10 }}>
              Upload a Wine Label Photo
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.7, marginBottom: 24 }}>
              AI reads the label text first, then recognizes brand designs — works great<br />
              on Stella Rosa, Matua, Juggernaut, Llano, Bogle, Santa Margherita + more
            </div>
            <button style={{
              padding: '13px 30px',
              background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
              border: 'none', color: '#0a0600',
              fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              📷 Choose Photo
            </button>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginTop: 14 }}>
              JPG · PNG · WebP &nbsp;·&nbsp; Drag &amp; drop or click to browse
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            style={{ display: 'none' }} />
          {!session && (
            <div style={{
              marginTop: 14, padding: '12px 18px', textAlign: 'center',
              background: 'rgba(200,155,60,0.04)', border: `1px solid rgba(200,155,60,0.12)`,
              borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3,
            }}>
              <a href="/login" style={{ color: S.gold, textDecoration: 'none', fontWeight: 600 }}>Log in</a>
              {' '}to earn +25 XP when you identify a wine today!
            </div>
          )}
        </div>
      )}

      {/* ══ PREVIEW ═══════════════════════════════════ */}
      {phase === 'preview' && (
        <div style={{ padding: '24px 28px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgData} alt="Wine bottle"
            style={{
              width: 140, height: 210, objectFit: 'cover', objectPosition: 'center top',
              borderRadius: 10, border: `1px solid rgba(200,155,60,0.2)`, flexShrink: 0,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            }} />
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: S.text1, marginBottom: 8 }}>
                Ready to identify!
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65 }}>
                Our AI sommelier will read the label, recognize the brand, and produce a full wine profile with tasting notes, pairings, and flavor descriptors.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={identify} style={{
                padding: '13px 26px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                border: 'none', color: '#0a0600',
                fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
                🔍 Identify This Wine
              </button>
              <button onClick={reset} style={{
                padding: '13px 18px', background: 'none',
                border: `1px solid rgba(200,155,60,0.2)`, color: S.text3,
                fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer',
              }}>
                Re-upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ IDENTIFYING ════════════════════════════════ */}
      {phase === 'identifying' && (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 20 }}>🍷</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 19, fontWeight: 700, color: S.text1, marginBottom: 10 }}>
            Identifying your wine...
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.gold, marginBottom: 24, minHeight: 20 }}>
            {LOADING_MSGS[msgIdx]}
          </div>
          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: S.gold,
                opacity: 0.2 + i * 0.2,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ══ ERROR ══════════════════════════════════════ */}
      {phase === 'error' && (
        <div style={{ padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>😕</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: '#d04040', marginBottom: 10 }}>
            Identification Failed
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
            {error || 'Something went wrong. Please try again.'}
          </div>
          <button onClick={reset} style={{
            padding: '12px 26px',
            background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
            border: 'none', color: '#0a0600',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Try Again
          </button>
        </div>
      )}

      {/* ══ RESULT ═════════════════════════════════════ */}
      {phase === 'result' && result && (
        <>
          {/* ── Hero panel: photo + info ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* Left: bottle showcase */}
            <div style={{
              position: 'relative', flexShrink: 0, width: 230,
              minHeight: 440,
              background: `
                radial-gradient(ellipse 65% 55% at 50% 90%, ${styleCfg.glow} 0%, transparent 65%),
                radial-gradient(ellipse 80% 40% at 50% 15%, rgba(200,155,60,0.05) 0%, transparent 60%),
                linear-gradient(180deg, #090706 0%, #120e0a 50%, #0a0806 100%)
              `,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: '32px 20px',
            }}>
              {/* Gold top accent */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.5) 35%, rgba(200,155,60,0.5) 65%, transparent)',
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgData} alt="Identified wine"
                style={{
                  width: 160, maxHeight: 320,
                  objectFit: 'contain', objectPosition: 'center',
                  filter: 'drop-shadow(0 16px 36px rgba(0,0,0,0.85)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
                  display: 'block',
                }} />
              {/* Confidence chip */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                border: `1px solid ${confCfg.dot}30`,
                padding: '5px 14px', borderRadius: 20,
                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                color: confCfg.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: confCfg.dot, flexShrink: 0, display: 'inline-block' }} />
                {confCfg.label}
              </div>
            </div>

            {/* Right: wine details */}
            <div style={{ flex: 1, minWidth: 260, padding: '30px 28px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Style badge */}
              {result.style && (
                <div style={{
                  display: 'inline-flex', alignSelf: 'flex-start', marginBottom: 14,
                  background: styleCfg.bg, color: styleCfg.text,
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  padding: '6px 12px', letterSpacing: '0.1em',
                }}>
                  {result.style.toUpperCase()}
                </div>
              )}

              {/* Wine name */}
              <h2 style={{
                fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 900,
                color: S.text1, margin: '0 0 4px', lineHeight: 1.15, letterSpacing: '-0.025em',
              }}>
                {result.wineName}
              </h2>

              {/* Winery */}
              {result.winery && (
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.goldDim,
                  fontStyle: 'italic', marginBottom: 20, lineHeight: 1.4,
                }}>
                  {result.winery}
                </div>
              )}

              {/* Meta pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
                {result.region   && <Pill variant="meta">{result.region}</Pill>}
                {result.varietal && <Pill variant="meta">{result.varietal}</Pill>}
                {result.vintage  && <Pill variant="abv">{result.vintage}</Pill>}
                {result.abv      && <Pill variant="abv">{result.abv} ABV</Pill>}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(200,155,60,0.08)', marginBottom: 22 }} />

              {/* Tasting notes */}
              {result.tastingNotes && (
                <div style={{ marginBottom: 22 }}>
                  <SectionLabel>TASTING NOTES</SectionLabel>
                  <p style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2,
                    lineHeight: 1.82, margin: 0,
                  }}>
                    {result.tastingNotes}
                  </p>
                </div>
              )}

              {/* Flavor profile badges */}
              {result.flavorNotes.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <SectionLabel>FLAVOR PROFILE</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.flavorNotes.map((note, i) => (
                      <Pill key={i} variant="flavor">{note}</Pill>
                    ))}
                  </div>
                </div>
              )}

              {/* Pairings */}
              {result.pairings.length > 0 && (
                <div style={{ borderTop: `1px solid rgba(200,155,60,0.08)`, paddingTop: 20 }}>
                  <SectionLabel>PAIRS WITH</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {result.pairings.map((p, i) => (
                      <Pill key={i} variant="pairing">{p}</Pill>
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
            background: 'rgba(0,0,0,0.15)',
          }}>
            {session && (
              <button onClick={toggleFavorite} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px',
                background: favorited ? 'rgba(200,50,80,0.18)' : S.goldFaint,
                border: `1px solid ${favorited ? 'rgba(200,50,80,0.45)' : 'rgba(200,155,60,0.25)'}`,
                color: favorited ? '#e06080' : S.text2,
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 16 }}>{favorited ? '♥' : '♡'}</span>
                {favorited ? 'Saved' : `Save${favXp > 0 ? '' : ' +5 XP'}`}
              </button>
            )}
            <button onClick={() => {
              const logSection = document.getElementById('wine-log-section')
              logSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              background: S.goldFaint, border: `1px solid rgba(200,155,60,0.2)`,
              color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>
              📓 Tasting Log
            </button>
            <button onClick={reset} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              background: S.goldFaint, border: `1px solid rgba(200,155,60,0.2)`,
              color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>
              📷 Scan Another
            </button>
            <div style={{ flex: 1 }} />
            {result.identificationMethod && (
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4,
                background: 'rgba(200,155,60,0.04)', border: `1px solid rgba(200,155,60,0.1)`,
                padding: '5px 10px', borderRadius: 4,
              }}>
                {result.identificationMethod === 'label_text'   ? '🔤 Label Read'
                  : result.identificationMethod === 'label_design' ? '🎨 Brand Recognized'
                  : '🔍 Visual Analysis'}
              </div>
            )}
          </div>

          {/* ── Tasting log ── */}
          <div id="wine-log-section" style={{ borderTop: `1px solid rgba(200,155,60,0.08)`, padding: '24px 28px' }}>
            <SectionLabel>📓 YOUR TASTING LOG</SectionLabel>
            {!session ? (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4 }}>
                <a href="/login" style={{ color: S.gold, textDecoration: 'none', fontWeight: 600 }}>Log in</a> to save a tasting note.
              </div>
            ) : !logSaved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Star picker */}
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Your rating
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverStar(star)}
                        onMouseLeave={() => setHoverStar(0)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 30, lineHeight: 1, padding: '0 3px',
                          color: star <= (hoverStar || rating) ? '#c89b3c' : 'rgba(200,155,60,0.15)',
                          transition: 'color 0.1s, transform 0.1s',
                          transform: star <= (hoverStar || rating) ? 'scale(1.2)' : 'scale(1)',
                        }}
                      >★</button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  placeholder="Tasting note... dark fruit, smooth finish, great with steak"
                  rows={3} maxLength={500}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: S.elevated, border: `1px solid rgba(200,155,60,0.18)`,
                    color: S.text1, padding: '11px 14px',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.55, resize: 'vertical',
                  }}
                />
                <div>
                  <button onClick={submitLog} disabled={!rating} style={{
                    padding: '11px 22px',
                    background: rating ? 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)' : 'rgba(200,155,60,0.1)',
                    border: 'none',
                    color: rating ? '#0a0600' : 'rgba(200,155,60,0.28)',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
                    cursor: rating ? 'pointer' : 'not-allowed',
                  }}>
                    📓 Save Tasting Log
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(80,160,80,0.1)', border: '1px solid rgba(80,160,80,0.2)', borderRadius: 8 }}>
                <span style={{ color: '#5aaa5a', fontSize: 18 }}>✓</span>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5aaa5a', fontWeight: 600 }}>
                    Saved — {['', '★', '★★', '★★★', '★★★★', '★★★★★'][rating]}
                  </div>
                  {logNote && (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3, marginTop: 2 }}>
                      &ldquo;{logNote}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Community comments ── */}
          <div style={{ borderTop: `1px solid rgba(200,155,60,0.08)`, padding: '24px 28px' }}>
            <SectionLabel>💬 COMMUNITY THOUGHTS</SectionLabel>
            {session ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your thoughts on this wine..."
                  rows={2} maxLength={500}
                  style={{
                    flex: 1, background: S.elevated, border: `1px solid rgba(200,155,60,0.18)`,
                    color: S.text1, padding: '10px 14px',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.55, resize: 'vertical',
                  }}
                />
                <button onClick={submitComment} disabled={!comment.trim()} style={{
                  padding: '10px 18px', flexShrink: 0, alignSelf: 'flex-start',
                  background: comment.trim() ? 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)' : 'rgba(200,155,60,0.1)',
                  border: 'none',
                  color: comment.trim() ? '#0a0600' : 'rgba(200,155,60,0.25)',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                  cursor: comment.trim() ? 'pointer' : 'not-allowed',
                }}>
                  Post
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4 }}>
                <a href="/login" style={{ color: S.gold, textDecoration: 'none' }}>Log in</a> to leave a comment.
              </div>
            )}
            {comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c.id} style={{
                    background: S.elevated, border: `1px solid rgba(200,155,60,0.1)`,
                    borderRadius: 8, padding: '13px 16px',
                  }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {c.user.username}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.65 }}>
                      {c.body}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4, fontStyle: 'italic' }}>
                No comments yet — be the first to share your thoughts!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
