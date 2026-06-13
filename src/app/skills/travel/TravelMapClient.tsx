'use client'

import { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, type Geography as GeoType } from 'react-simple-maps'
import Link from 'next/link'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const TRAVEL_EMOJIS = [
  '📍', '✈️', '🏖️', '🏔️', '🗼', '🏯',
  '🌴', '🌊', '🏝️', '🌋', '🏛️', '🎡',
  '🏕️', '🌍', '🗺️', '⭐',
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

type Mode = 'normal' | 'adding' | 'viewing' | 'editing'

export default function TravelMapClient({ initialPins, isLoggedIn, userId }: Props) {
  const [pins, setPins] = useState<TravelPin[]>(initialPins)
  const [mode, setMode] = useState<Mode>('normal')
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [activePin, setActivePin] = useState<TravelPin | null>(null)
  const [form, setForm] = useState({ name: '', reason: '', emoji: '📍' })
  const [saving, setSaving] = useState(false)

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const dragStartClientRef = useRef<{ x: number; y: number } | null>(null)

  const closeAll = useCallback(() => {
    setMode('normal')
    setPendingPos(null)
    setActivePin(null)
    setForm({ name: '', reason: '', emoji: '📍' })
  }, [])

  function getMapPct(clientX: number, clientY: number) {
    const rect = mapContainerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.max(1, Math.min(99, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(1, Math.min(99, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  function handleMapClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isLoggedIn) return
    if (draggingId) return          // ignore click fired after drag ends
    if (mode !== 'normal') { closeAll(); return }

    const pos = getMapPct(e.clientX, e.clientY)
    if (!pos) return
    setPendingPos(pos)
    setForm({ name: '', reason: '', emoji: '📍' })
    setMode('adding')
  }

  // ── Drag handlers on each pin button ──────────────────────────
  function handlePinPointerDown(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    if (!isLoggedIn || pin.userId !== userId) return
    if (mode !== 'normal') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingId(pin.id)
    setDragPos({ x: pin.x, y: pin.y })
    dragStartClientRef.current = { x: e.clientX, y: e.clientY }
    hasDraggedRef.current = false
  }

  function handlePinPointerMove(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    if (draggingId !== pin.id) return
    const start = dragStartClientRef.current
    if (start && (Math.abs(e.clientX - start.x) > 5 || Math.abs(e.clientY - start.y) > 5)) {
      hasDraggedRef.current = true
    }
    const pos = getMapPct(e.clientX, e.clientY)
    if (pos) setDragPos(pos)
  }

  async function handlePinPointerUp(pin: TravelPin, e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (draggingId !== pin.id) return

    const moved = hasDraggedRef.current
    const finalPos = dragPos
    setDraggingId(null)
    setDragPos(null)
    dragStartClientRef.current = null

    if (!moved) {
      // Short tap → open view modal
      setActivePin(pin)
      setMode('viewing')
      return
    }

    if (!finalPos) return

    // Optimistically update position
    setPins(prev => prev.map(p => p.id === pin.id ? { ...p, x: finalPos.x, y: finalPos.y } : p))

    try {
      await fetch(`/api/travel-pins/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: finalPos.x, y: finalPos.y }),
      })
    } catch {
      // revert on failure
      setPins(prev => prev.map(p => p.id === pin.id ? { ...p, x: pin.x, y: pin.y } : p))
    }
  }

  function handleEditPin(pin: TravelPin) {
    setActivePin(pin)
    setForm({ name: pin.name, reason: pin.reason, emoji: pin.emoji })
    setPendingPos(null)
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
      if (res.ok) {
        const pin = await res.json()
        setPins(prev => [pin, ...prev])
        closeAll()
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
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
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  async function handleDeletePin(pin: TravelPin) {
    setSaving(true)
    try {
      const res = await fetch(`/api/travel-pins/${pin.id}`, { method: 'DELETE' })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pin.id))
        closeAll()
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const showFormModal = mode === 'adding' || mode === 'editing'
  const showViewModal = mode === 'viewing' && activePin !== null

  return (
    <div>
      {/* ── MAP CARD ── */}
      <div className="rp-card" style={{ padding: 16, borderRadius: 16, marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>🗺️</span>
          <h2 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: 'var(--text-1)',
            margin: 0,
            flex: 1,
          }}>
            Adventure Map
          </h2>
          {pins.length > 0 && (
            <span style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 6,
              color: 'var(--gold)',
              background: 'rgba(200,155,60,0.1)',
              border: '1px solid rgba(200,155,60,0.3)',
              borderRadius: 6,
              padding: '3px 7px',
            }}>
              {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
            </span>
          )}
        </div>

        {/* Map container — shorter aspect ratio */}
        <div
          ref={mapContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '40%',
            background: '#08081a',
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(200,155,60,0.25)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
            cursor: isLoggedIn ? (draggingId ? 'grabbing' : 'crosshair') : 'default',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>

            {/* World map SVG */}
            <ComposableMap
              width={800}
              height={320}
              style={{ width: '100%', height: '100%' }}
              onClick={handleMapClick}
            >
              <rect width={800} height={320} fill="#080818" />

              {/* Subtle grid */}
              {[80, 160, 240].map(y => (
                <line key={y} x1={0} y1={y} x2={800} y2={y}
                  stroke="rgba(200,155,60,0.05)" strokeWidth={1} />
              ))}
              {[100, 200, 300, 400, 500, 600, 700].map(x => (
                <line key={x} x1={x} y1={0} x2={x} y2={320}
                  stroke="rgba(200,155,60,0.05)" strokeWidth={1} />
              ))}

              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: GeoType[] }) =>
                  geographies.map((geo: GeoType) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: { fill: '#1a1630', stroke: '#c89b3c', strokeWidth: 0.5, outline: 'none' },
                        hover: { fill: '#22203c', stroke: '#e8b84b', strokeWidth: 0.8, outline: 'none', cursor: isLoggedIn ? 'crosshair' : 'default' },
                        pressed: { fill: '#1a1630', stroke: '#c89b3c', strokeWidth: 0.5, outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>
            </ComposableMap>

            {/* Pins overlay */}
            {pins.map(pin => {
              const isDragging = draggingId === pin.id
              const pos = isDragging && dragPos ? dragPos : { x: pin.x, y: pin.y }
              const isOwner = userId && pin.userId === userId

              return (
                <button
                  key={pin.id}
                  onPointerDown={isOwner ? e => handlePinPointerDown(pin, e) : undefined}
                  onPointerMove={isOwner ? e => handlePinPointerMove(pin, e) : undefined}
                  onPointerUp={isOwner ? e => handlePinPointerUp(pin, e) : e => { e.stopPropagation(); setActivePin(pin); setMode('viewing') }}
                  title={pin.name}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: isDragging
                      ? 'translate(-50%, -115%) scale(1.4)'
                      : 'translate(-50%, -100%)',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    zIndex: isDragging ? 30 : 10,
                    lineHeight: 1,
                    fontSize: 20,
                    filter: isDragging
                      ? 'drop-shadow(0 6px 14px rgba(200,155,60,0.8))'
                      : 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))',
                    transition: isDragging ? 'none' : 'transform 0.15s ease, filter 0.15s ease',
                    cursor: isOwner ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    minWidth: 28,
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    touchAction: 'none',
                  }}
                  onMouseEnter={e => {
                    if (isDragging) return
                    e.currentTarget.style.transform = 'translate(-50%, -110%) scale(1.3)'
                    e.currentTarget.style.filter = 'drop-shadow(0 4px 10px rgba(200,155,60,0.6))'
                  }}
                  onMouseLeave={e => {
                    if (isDragging) return
                    e.currentTarget.style.transform = 'translate(-50%, -100%) scale(1)'
                    e.currentTarget.style.filter = 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))'
                  }}
                >
                  {pin.emoji}
                  <div style={{
                    position: 'absolute',
                    bottom: -5,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 2,
                    height: 6,
                    background: isDragging ? '#c89b3c' : 'rgba(200,155,60,0.65)',
                    borderRadius: 1,
                  }} />
                </button>
              )
            })}

            {/* Pending pin preview */}
            {pendingPos && mode === 'adding' && (
              <div style={{
                position: 'absolute',
                left: `${pendingPos.x}%`,
                top: `${pendingPos.y}%`,
                transform: 'translate(-50%, -110%)',
                zIndex: 20,
                pointerEvents: 'none',
                fontSize: 24,
                filter: 'drop-shadow(0 0 8px rgba(200,155,60,0.9))',
              }}>
                {form.emoji}
              </div>
            )}
          </div>

          {/* Corner watermark */}
          <div style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 5,
            color: 'rgba(200,155,60,0.25)',
            pointerEvents: 'none',
          }}>
            ADVENTURE MAP
          </div>
        </div>

        {/* Hint text */}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          {isLoggedIn ? (
            <span className="body-text" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Click to drop a pin · Drag pins to move them ✈️
            </span>
          ) : (
            <span className="body-text" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Log in</Link>
              {' '}to mark your favorite places
            </span>
          )}
        </div>
      </div>

      {/* ── ADVENTURE SPOTS CARDS ── */}
      {isLoggedIn && pins.length === 0 && (
        <div className="rp-card" style={{
          padding: 28,
          borderRadius: 16,
          textAlign: 'center',
          border: '1px dashed rgba(200,155,60,0.25)',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🌍</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--text-2)', marginBottom: 8 }}>
            Your adventure awaits!
          </div>
          <p className="body-text" style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Tap the map above to mark a favorite place or dream destination.
          </p>
        </div>
      )}

      {pins.length > 0 && (
        <div className="rp-card" style={{ padding: 16, borderRadius: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: 'var(--text-1)', margin: 0 }}>
              Favorite Adventure Spots
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {pins.map(pin => (
              <div key={pin.id} style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(200,155,60,0.18)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: 'rgba(200,155,60,0.08)',
                    border: '1px solid rgba(200,155,60,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {pin.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 4 }}>
                      {pin.name}
                    </div>
                    <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                      {new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {pin.reason && (
                  <div style={{
                    background: 'rgba(200,155,60,0.06)',
                    borderLeft: '3px solid rgba(200,155,60,0.4)',
                    borderRadius: '0 8px 8px 0',
                    padding: '7px 10px',
                  }}>
                    <p className="body-text" style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                      &ldquo;{pin.reason}&rdquo;
                    </p>
                  </div>
                )}

                {userId && pin.userId === userId && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleEditPin(pin)}
                      className="body-text"
                      style={{ flex: 1, fontSize: 11, padding: '6px 0', background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.28)', borderRadius: 8, color: 'var(--gold)', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeletePin(pin)}
                      disabled={saving}
                      className="body-text"
                      style={{ flex: 1, fontSize: 11, padding: '6px 0', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
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
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 18, padding: '22px 20px', width: '100%', maxWidth: 400, boxShadow: '0 0 60px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 22 }}>{form.emoji}</span>
              <h3 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: 'var(--gold)', margin: 0 }}>
                {mode === 'editing' ? 'Edit Destination' : 'New Pin'}
              </h3>
            </div>

            {/* Emoji picker */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Icon
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {TRAVEL_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setForm(f => ({ ...f, emoji }))} style={{ width: 36, height: 36, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: form.emoji === emoji ? '2px solid #c89b3c' : '1px solid rgba(42,40,32,1)', background: form.emoji === emoji ? 'rgba(200,155,60,0.18)' : 'rgba(0,0,0,0.3)', cursor: 'pointer', boxShadow: form.emoji === emoji ? '0 0 8px rgba(200,155,60,0.3)' : 'none' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 11 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Place Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amalfi Coast, Italy" maxLength={100} autoFocus className="osrs-input body-text" style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Why This Place?</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="A dream destination, a memory, or why it is special..." maxLength={500} rows={3} className="osrs-input body-text" style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 10, resize: 'vertical', boxSizing: 'border-box' }} />
              <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', marginTop: 3 }}>{form.reason.length}/500</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={mode === 'editing' ? handleSaveEdit : handleSaveNew} disabled={saving || !form.name.trim()} className="osrs-btn" style={{ flex: 1, fontSize: 8, padding: '10px 0', cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.name.trim() ? 0.55 : 1 }}>
                {saving ? 'Saving...' : mode === 'editing' ? 'Update Pin' : 'Drop Pin!'}
              </button>
              <button onClick={closeAll} className="body-text" style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW PIN MODAL ── */}
      {showViewModal && activePin && (
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 18, padding: '22px 20px', width: '100%', maxWidth: 360, boxShadow: '0 0 60px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                {activePin.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 4 }}>
                  {activePin.name}
                </div>
                <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  Pinned {new Date(activePin.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {activePin.reason && (
              <div style={{ background: 'rgba(200,155,60,0.06)', borderLeft: '3px solid rgba(200,155,60,0.5)', borderRadius: '0 10px 10px 0', padding: '9px 13px', marginBottom: 16 }}>
                <p className="body-text" style={{ fontSize: 13, color: 'var(--text-1)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  &ldquo;{activePin.reason}&rdquo;
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {userId && activePin.userId === userId && (
                <>
                  <button onClick={() => handleEditPin(activePin)} className="body-text" style={{ flex: 1, fontSize: 12, padding: '9px 0', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 10, color: 'var(--gold)', cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDeletePin(activePin)} disabled={saving} className="body-text" style={{ flex: 1, fontSize: 12, padding: '9px 0', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    🗑 Delete
                  </button>
                </>
              )}
              <button onClick={closeAll} className="body-text" style={{ flex: 1, padding: '9px 0', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
