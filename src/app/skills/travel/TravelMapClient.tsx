'use client'

import { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, type Geography as GeoType } from 'react-simple-maps'
import Link from 'next/link'

const WORLD_GEO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const USA_GEO   = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const TRAVEL_EMOJIS = [
  '📍','✈️','🏖️','🏔️','🗼','🏯',
  '🌴','🌊','🏝️','🌋','🏛️','🎡',
  '🏕️','🌍','🗺️','⭐',
]

interface TravelPin {
  id: string
  userId: string
  name: string
  reason: string
  emoji: string
  x: number
  y: number
  createdAt: string
}

interface Props {
  initialPins: TravelPin[]
  isLoggedIn: boolean
  userId?: string
}

type Mode    = 'normal' | 'adding' | 'viewing' | 'editing'
type MapView = 'world' | 'usa'

// Per-view config
const MAP: Record<MapView, {
  geoUrl: string
  projection: string
  projectionConfig?: Record<string, unknown>
  svgW: number
  svgH: number
  fill: string
  hoverFill: string
  strokeW: number
  label: string
  hint: string
}> = {
  world: {
    geoUrl: WORLD_GEO,
    projection: 'geoEqualEarth',
    svgW: 800, svgH: 340,
    fill: '#1a1630', hoverFill: '#22203c',
    strokeW: 0.5,
    label: '🌍 World',
    hint: 'Click anywhere to drop a pin',
  },
  usa: {
    geoUrl: USA_GEO,
    projection: 'geoAlbersUsa',
    projectionConfig: { scale: 900 },
    svgW: 800, svgH: 500,
    fill: '#0f1f10', hoverFill: '#18301a',
    strokeW: 0.9,
    label: '🇺🇸 USA',
    hint: 'Click a state to drop a pin',
  },
}

export default function TravelMapClient({ initialPins, isLoggedIn, userId }: Props) {
  const [pins, setPins] = useState<TravelPin[]>(initialPins)
  const [mapView, setMapView] = useState<MapView>('world')
  const [mode, setMode] = useState<Mode>('normal')
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [activePin, setActivePin] = useState<TravelPin | null>(null)
  const [form, setForm] = useState({ name: '', reason: '', emoji: '📍' })
  const [saving, setSaving] = useState(false)

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const cfg = MAP[mapView]
  // paddingBottom keeps the SVG aspect ratio so the map fills correctly
  const mapPad = `${(cfg.svgH / cfg.svgW) * 100}%`

  const closeAll = useCallback(() => {
    setMode('normal')
    setPendingPos(null)
    setActivePin(null)
    setForm({ name: '', reason: '', emoji: '📍' })
  }, [])

  function getMapPct(clientX: number, clientY: number) {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.max(1, Math.min(99, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(1, Math.min(99, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  function handleMapClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isLoggedIn) return
    if (draggingId) return
    if (mode !== 'normal') { closeAll(); return }
    const pos = getMapPct(e.clientX, e.clientY)
    if (!pos) return
    setPendingPos(pos)
    setForm({ name: '', reason: '', emoji: '📍' })
    setMode('adding')
  }

  // ── Pin drag handlers ──────────────────────────────────────
  function onPinDown(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    if (!isLoggedIn || pin.userId !== userId || mode !== 'normal') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingId(pin.id)
    setDragPos({ x: pin.x, y: pin.y })
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    hasDraggedRef.current = false
  }

  function onPinMove(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    if (draggingId !== pin.id) return
    const s = dragStartRef.current
    if (s && (Math.abs(e.clientX - s.x) > 5 || Math.abs(e.clientY - s.y) > 5)) {
      hasDraggedRef.current = true
    }
    const pos = getMapPct(e.clientX, e.clientY)
    if (pos) setDragPos(pos)
  }

  async function onPinUp(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (draggingId !== pin.id) return
    const moved = hasDraggedRef.current
    const finalPos = dragPos
    setDraggingId(null)
    setDragPos(null)
    dragStartRef.current = null

    if (!moved) {
      setActivePin(pin); setMode('viewing')
      return
    }
    if (!finalPos) return
    setPins(prev => prev.map(p => p.id === pin.id ? { ...p, ...finalPos } : p))
    try {
      await fetch(`/api/travel-pins/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPos),
      })
    } catch {
      setPins(prev => prev.map(p => p.id === pin.id ? { ...p, x: pin.x, y: pin.y } : p))
    }
  }

  function handleEditPin(pin: TravelPin) {
    setActivePin(pin)
    setForm({ name: pin.name, reason: pin.reason, emoji: pin.emoji })
    setMode('editing')
  }

  async function handleSaveNew() {
    if (!pendingPos || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/travel-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), reason: form.reason.trim(), ...pendingPos }),
      })
      if (res.ok) { const pin = await res.json(); setPins(prev => [pin, ...prev]); closeAll() }
    } catch { /**/ } finally { setSaving(false) }
  }

  async function handleSaveEdit() {
    if (!activePin || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/travel-pins/${activePin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), reason: form.reason.trim(), emoji: form.emoji }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPins(prev => prev.map(p => p.id === updated.id ? updated : p))
        closeAll()
      }
    } catch { /**/ } finally { setSaving(false) }
  }

  async function handleDeletePin(pin: TravelPin) {
    setSaving(true)
    try {
      const res = await fetch(`/api/travel-pins/${pin.id}`, { method: 'DELETE' })
      if (res.ok) { setPins(prev => prev.filter(p => p.id !== pin.id)); closeAll() }
    } catch { /**/ } finally { setSaving(false) }
  }

  const showFormModal = mode === 'adding' || mode === 'editing'
  const showViewModal = mode === 'viewing' && activePin !== null

  return (
    <div>
      {/* ── MAP CARD ── */}
      <div className="rp-card" style={{ padding: '14px 14px 12px', borderRadius: 14, marginBottom: 14 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🗺️</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--text-1)', flex: 1 }}>
            Adventure Map
          </span>
          {/* Map toggle tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 3, border: '1px solid rgba(200,155,60,0.15)' }}>
            {(['world','usa'] as MapView[]).map(v => (
              <button
                key={v}
                onClick={() => setMapView(v)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  padding: '5px 9px',
                  borderRadius: 6,
                  border: 'none',
                  background: mapView === v ? 'rgba(200,155,60,0.2)' : 'transparent',
                  color: mapView === v ? 'var(--gold)' : 'var(--text-3)',
                  cursor: 'pointer',
                  boxShadow: mapView === v ? 'inset 0 0 0 1px rgba(200,155,60,0.5)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {MAP[v].label}
              </button>
            ))}
          </div>
          {pins.length > 0 && (
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--gold)', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 5, padding: '3px 6px', whiteSpace: 'nowrap' }}>
              {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
            </span>
          )}
        </div>

        {/* Map container — aspect ratio matches the active SVG viewBox */}
        <div
          ref={mapRef}
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: mapPad,
            background: '#06060f',
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(200,155,60,0.22)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
            cursor: isLoggedIn ? (draggingId ? 'grabbing' : 'crosshair') : 'default',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <ComposableMap
              width={cfg.svgW}
              height={cfg.svgH}
              projection={cfg.projection}
              projectionConfig={cfg.projectionConfig}
              style={{ width: '100%', height: '100%' }}
              onClick={handleMapClick}
            >
              {/* Ocean / bg */}
              <rect width={cfg.svgW} height={cfg.svgH} fill="#06060f" />

              {/* Grid lines — world only */}
              {mapView === 'world' && (
                <>
                  {[68, 136, 204, 272].map(y => (
                    <line key={y} x1={0} y1={y} x2={800} y2={y} stroke="rgba(200,155,60,0.05)" strokeWidth={1} />
                  ))}
                  {[100,200,300,400,500,600,700].map(x => (
                    <line key={x} x1={x} y1={0} x2={x} y2={340} stroke="rgba(200,155,60,0.05)" strokeWidth={1} />
                  ))}
                </>
              )}

              <Geographies geography={cfg.geoUrl}>
                {({ geographies }: { geographies: GeoType[] }) =>
                  geographies.map((geo: GeoType) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: { fill: cfg.fill, stroke: '#c89b3c', strokeWidth: cfg.strokeW, outline: 'none' },
                        hover:   { fill: cfg.hoverFill, stroke: '#e8b84b', strokeWidth: cfg.strokeW + 0.3, outline: 'none', cursor: isLoggedIn ? 'crosshair' : 'default' },
                        pressed: { fill: cfg.fill, stroke: '#c89b3c', strokeWidth: cfg.strokeW, outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>
            </ComposableMap>

            {/* Pin overlay */}
            {pins.map(pin => {
              const isDragging = draggingId === pin.id
              const pos = isDragging && dragPos ? dragPos : { x: pin.x, y: pin.y }
              const isOwner = !!(userId && pin.userId === userId)
              return (
                <button
                  key={pin.id}
                  onPointerDown={isOwner ? e => onPinDown(pin, e) : undefined}
                  onPointerMove={isOwner ? e => onPinMove(pin, e) : undefined}
                  onPointerUp={e => {
                    if (isOwner) { onPinUp(pin, e) }
                    else { e.stopPropagation(); setActivePin(pin); setMode('viewing') }
                  }}
                  title={pin.name}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: isDragging ? 'translate(-50%,-115%) scale(1.45)' : 'translate(-50%,-100%)',
                    border: 'none', background: 'none', padding: 0,
                    zIndex: isDragging ? 30 : 10,
                    lineHeight: 1,
                    fontSize: 18,
                    filter: isDragging
                      ? 'drop-shadow(0 6px 12px rgba(200,155,60,0.9))'
                      : 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))',
                    transition: isDragging ? 'none' : 'transform 0.12s ease, filter 0.12s ease',
                    cursor: isOwner ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    minWidth: 26, minHeight: 26,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    touchAction: 'none',
                  }}
                  onMouseEnter={e => {
                    if (isDragging) return
                    e.currentTarget.style.transform = 'translate(-50%,-108%) scale(1.28)'
                    e.currentTarget.style.filter = 'drop-shadow(0 3px 8px rgba(200,155,60,0.65))'
                  }}
                  onMouseLeave={e => {
                    if (isDragging) return
                    e.currentTarget.style.transform = 'translate(-50%,-100%) scale(1)'
                    e.currentTarget.style.filter = 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))'
                  }}
                >
                  {pin.emoji}
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%',
                    transform: 'translateX(-50%)', width: 2, height: 5,
                    background: isDragging ? '#c89b3c' : 'rgba(200,155,60,0.6)',
                    borderRadius: 1,
                  }} />
                </button>
              )
            })}

            {/* New-pin preview */}
            {pendingPos && mode === 'adding' && (
              <div style={{
                position: 'absolute',
                left: `${pendingPos.x}%`, top: `${pendingPos.y}%`,
                transform: 'translate(-50%,-110%)',
                zIndex: 20, pointerEvents: 'none',
                fontSize: 22,
                filter: 'drop-shadow(0 0 8px rgba(200,155,60,0.9))',
              }}>
                {form.emoji}
              </div>
            )}
          </div>

          {/* Watermark */}
          <div style={{ position: 'absolute', bottom: 5, right: 7, fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'rgba(200,155,60,0.2)', pointerEvents: 'none' }}>
            {mapView === 'world' ? 'WORLD MAP' : 'USA MAP'}
          </div>
        </div>

        {/* Hint */}
        <div style={{ marginTop: 7, textAlign: 'center' }}>
          {isLoggedIn ? (
            <span className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {cfg.hint} · Drag to move ✈️
            </span>
          ) : (
            <span className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
              <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Log in</Link>
              {' '}to pin your favorite places
            </span>
          )}
        </div>
      </div>

      {/* ── ADVENTURE SPOTS ── */}
      {isLoggedIn && pins.length === 0 && (
        <div className="rp-card" style={{ padding: 24, borderRadius: 14, textAlign: 'center', border: '1px dashed rgba(200,155,60,0.22)', marginBottom: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🌍</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--text-2)', marginBottom: 6 }}>Your adventure awaits!</div>
          <p className="body-text" style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Tap the map above to mark a favorite place or dream destination.</p>
        </div>
      )}

      {pins.length > 0 && (
        <div className="rp-card" style={{ padding: '14px 14px 16px', borderRadius: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>📍</span>
            <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--text-1)', margin: 0 }}>
              Favorite Adventure Spots
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {pins.map(pin => (
              <div key={pin.id} style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(200,155,60,0.16)', borderRadius: 11, padding: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 9, background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {pin.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 3 }}>
                      {pin.name}
                    </div>
                    <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                      {new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {pin.reason && (
                  <div style={{ borderLeft: '2px solid rgba(200,155,60,0.38)', paddingLeft: 9 }}>
                    <p className="body-text" style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                      &ldquo;{pin.reason}&rdquo;
                    </p>
                  </div>
                )}

                {userId && pin.userId === userId && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => handleEditPin(pin)} className="body-text" style={{ flex: 1, fontSize: 10, padding: '5px 0', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: 7, color: 'var(--gold)', cursor: 'pointer' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDeletePin(pin)} disabled={saving} className="body-text" style={{ flex: 1, fontSize: 10, padding: '5px 0', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showFormModal && (
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, padding: '20px 18px', width: '100%', maxWidth: 390, boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>{form.emoji}</span>
              <h3 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: 'var(--gold)', margin: 0 }}>
                {mode === 'editing' ? 'Edit Destination' : 'New Pin'}
              </h3>
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Icon</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {TRAVEL_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setForm(f => ({ ...f, emoji }))} style={{ width: 36, height: 36, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: form.emoji === emoji ? '2px solid #c89b3c' : '1px solid rgba(42,40,32,1)', background: form.emoji === emoji ? 'rgba(200,155,60,0.18)' : 'rgba(0,0,0,0.3)', cursor: 'pointer', boxShadow: form.emoji === emoji ? '0 0 7px rgba(200,155,60,0.3)' : 'none' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Place Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amalfi Coast, Italy" maxLength={100} autoFocus className="osrs-input body-text" style={{ width: '100%', fontSize: 13, padding: '9px 11px', borderRadius: 9, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Why This Place?</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="A dream destination, a memory, or why it is special..." maxLength={500} rows={3} className="osrs-input body-text" style={{ width: '100%', fontSize: 13, padding: '9px 11px', borderRadius: 9, resize: 'vertical', boxSizing: 'border-box' }} />
              <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', marginTop: 3 }}>{form.reason.length}/500</div>
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={mode === 'editing' ? handleSaveEdit : handleSaveNew} disabled={saving || !form.name.trim()} className="osrs-btn" style={{ flex: 1, fontSize: 8, padding: '10px 0', cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.name.trim() ? 0.55 : 1 }}>
                {saving ? 'Saving...' : mode === 'editing' ? 'Update Pin' : 'Drop Pin!'}
              </button>
              <button onClick={closeAll} className="body-text" style={{ padding: '10px 15px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW PIN MODAL ── */}
      {showViewModal && activePin && (
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, padding: '20px 18px', width: '100%', maxWidth: 350, boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                {activePin.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 4 }}>
                  {activePin.name}
                </div>
                <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  {new Date(activePin.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {activePin.reason && (
              <div style={{ borderLeft: '3px solid rgba(200,155,60,0.5)', paddingLeft: 12, marginBottom: 16 }}>
                <p className="body-text" style={{ fontSize: 13, color: 'var(--text-1)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  &ldquo;{activePin.reason}&rdquo;
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 7 }}>
              {userId && activePin.userId === userId && (
                <>
                  <button onClick={() => handleEditPin(activePin)} className="body-text" style={{ flex: 1, fontSize: 12, padding: '8px 0', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 9, color: 'var(--gold)', cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={() => handleDeletePin(activePin)} disabled={saving} className="body-text" style={{ flex: 1, fontSize: 12, padding: '8px 0', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>🗑 Delete</button>
                </>
              )}
              <button onClick={closeAll} className="body-text" style={{ flex: 1, padding: '8px 0', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
