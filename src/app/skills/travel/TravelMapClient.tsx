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

const USA_GEO_ID = 840

interface TravelPin {
  id: string
  userId: string
  name: string
  reason: string
  emoji: string
  mapView: string
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

export default function TravelMapClient({ initialPins, isLoggedIn, userId }: Props) {
  const [pins, setPins] = useState<TravelPin[]>(initialPins)
  const [mapView, setMapView] = useState<MapView>('world')
  const [transitioning, setTransitioning] = useState(false)
  const [mode, setMode] = useState<Mode>('normal')
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [activePin, setActivePin] = useState<TravelPin | null>(null)
  const [form, setForm] = useState({ name: '', reason: '', emoji: '📍' })
  const [saving, setSaving] = useState(false)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const visiblePins = pins.filter(p => (p.mapView ?? 'world') === mapView)
  const worldCount  = pins.filter(p => (p.mapView ?? 'world') === 'world').length
  const usaCount    = pins.filter(p => p.mapView === 'usa').length

  function switchView(view: MapView) {
    if (view === mapView) return
    setTransitioning(true)
    setTimeout(() => {
      setMapView(view)
      closeAll()
      setTransitioning(false)
    }, 160)
  }

  const closeAll = useCallback(() => {
    setMode('normal')
    setPendingPos(null)
    setActivePin(null)
    setForm({ name: '', reason: '', emoji: '📍' })
  }, [])

  // Convert client coordinates → percentage of the map container
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
    setDraggingId(null); setDragPos(null); dragStartRef.current = null
    if (!moved) { setActivePin(pin); setMode('viewing'); return }
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
        body: JSON.stringify({ ...form, name: form.name.trim(), reason: form.reason.trim(), mapView, ...pendingPos }),
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

  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6, padding: '5px 9px', borderRadius: 6,
    border: active ? '1px solid rgba(200,155,60,0.5)' : '1px solid transparent',
    background: active ? 'rgba(200,155,60,0.14)' : 'transparent',
    color: active ? '#c89b3c' : 'rgba(160,152,128,0.55)',
    cursor: 'pointer', transition: 'all 0.14s ease', whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

      {/* ── MAP CARD ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(200,155,60,0.18)',
        borderRadius: 14,
        overflow: 'hidden',
        minWidth: 0,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(200,155,60,0.1)', background: 'rgba(0,0,0,0.25)' }}>
          {mapView === 'usa' ? (
            <button
              onClick={() => switchView('world')}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, fontFamily: "'Press Start 2P', monospace", fontSize: 6, display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s ease' }}
            >
              ← World
            </button>
          ) : (
            <span style={{ fontSize: 14 }}>🗺️</span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {mapView === 'usa' && <span style={{ color: 'rgba(200,155,60,0.35)', fontFamily: 'monospace', fontSize: 10 }}>/</span>}
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mapView === 'world' ? 'Adventure Map' : '🇺🇸 United States'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {mapView === 'world' && worldCount > 0 && (
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'var(--gold)', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: 4, padding: '3px 6px' }}>
                {worldCount} 🌍
              </span>
            )}
            {mapView === 'usa' && usaCount > 0 && (
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'var(--gold)', background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: 4, padding: '3px 6px' }}>
                {usaCount} 🇺🇸
              </span>
            )}
          </div>
        </div>

        {/* ── Map area ──
            padding-bottom drives the container height (% of width) so it scales with the layout.
            An inner absolute div fills that space; SVG + pin overlay both live inside it.
            mapRef.getBoundingClientRect() == the inner div == the SVG rendering area. */}
        <div
          ref={mapRef}
          style={{
            position: 'relative',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            background: '#05050e',
            cursor: isLoggedIn ? (draggingId ? 'grabbing' : 'crosshair') : 'default',
          }}
        >
          {/* padding-bottom sets height = width × ratio; opacity animates on view switch */}
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: mapView === 'world' ? '30%' : '44%',
            opacity: transitioning ? 0 : 1,
            transition: 'opacity 0.16s ease',
          }}>
            {/* Fills the padding-bottom space — SVG and pins both live here */}
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>

              {mapView === 'world' ? (
                <ComposableMap
                  width={800} height={240}
                  projection="geoEqualEarth"
                  projectionConfig={{ scale: 77 }}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                  onClick={handleMapClick}
                >
                  <rect width={800} height={240} fill="#05050e" />
                  {[60, 120, 180].map(y => (
                    <line key={y} x1={0} y1={y} x2={800} y2={y} stroke="rgba(200,155,60,0.04)" strokeWidth={1} />
                  ))}
                  {[100,200,300,400,500,600,700].map(x => (
                    <line key={x} x1={x} y1={0} x2={x} y2={240} stroke="rgba(200,155,60,0.04)" strokeWidth={1} />
                  ))}
                  <Geographies geography={WORLD_GEO}>
                    {({ geographies }: { geographies: GeoType[] }) =>
                      geographies.map((geo: GeoType) => {
                        const isUSA = Number(geo.id) === USA_GEO_ID
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={isUSA ? (e: React.MouseEvent<SVGPathElement>) => {
                              e.stopPropagation()
                              switchView('usa')
                            } : undefined}
                            style={{
                              default: { fill: isUSA ? '#2c2255' : '#1a1636', stroke: '#c89b3c', strokeWidth: 0.45, outline: 'none' },
                              hover:   { fill: isUSA ? '#3d3078' : '#222048', stroke: '#e8b84b', strokeWidth: isUSA ? 1 : 0.65, outline: 'none', cursor: isUSA ? 'zoom-in' : (isLoggedIn ? 'crosshair' : 'default') },
                              pressed: { fill: isUSA ? '#2c2255' : '#1a1636', stroke: '#c89b3c', strokeWidth: 0.45, outline: 'none' },
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ComposableMap>
              ) : (
                <ComposableMap
                  width={800} height={352}
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 720 }}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                  onClick={handleMapClick}
                >
                  <rect width={800} height={352} fill="#05050e" />
                  <Geographies geography={USA_GEO}>
                    {({ geographies }: { geographies: GeoType[] }) =>
                      geographies.map((geo: GeoType) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: { fill: '#0f1e10', stroke: '#c89b3c', strokeWidth: 0.7, outline: 'none' },
                            hover:   { fill: '#182c1a', stroke: '#e8b84b', strokeWidth: 1, outline: 'none', cursor: isLoggedIn ? 'crosshair' : 'default' },
                            pressed: { fill: '#0f1e10', stroke: '#c89b3c', strokeWidth: 0.7, outline: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                </ComposableMap>
              )}

              {/* Pin overlay — same position as the SVG */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}>

              {visiblePins.map(pin => {
                const isDragging = draggingId === pin.id
                const pos = isDragging && dragPos ? dragPos : { x: pin.x, y: pin.y }
                const isOwner = !!(userId && pin.userId === userId)
                return (
                  <button
                    key={pin.id}
                    onPointerDown={isOwner ? e => onPinDown(pin, e) : undefined}
                    onPointerMove={isOwner ? e => onPinMove(pin, e) : undefined}
                    onPointerUp={e => isOwner ? onPinUp(pin, e) : (e.stopPropagation(), setActivePin(pin), setMode('viewing'))}
                    title={pin.name}
                    style={{
                      pointerEvents: 'all',
                      position: 'absolute',
                      left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: isDragging ? 'translate(-50%,-118%) scale(1.5)' : 'translate(-50%,-100%)',
                      border: 'none', background: 'none', padding: 0,
                      zIndex: isDragging ? 30 : 10,
                      fontSize: 16, lineHeight: 1,
                      filter: isDragging
                        ? 'drop-shadow(0 6px 14px rgba(200,155,60,0.95))'
                        : 'drop-shadow(0 1px 4px rgba(0,0,0,1))',
                      transition: isDragging ? 'none' : 'transform 0.12s ease, filter 0.12s ease',
                      cursor: isOwner ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      minWidth: 24, minHeight: 24,
                      touchAction: 'none',
                    }}
                    onMouseEnter={e => {
                      if (isDragging) return
                      e.currentTarget.style.transform = 'translate(-50%,-108%) scale(1.25)'
                      e.currentTarget.style.filter = 'drop-shadow(0 3px 8px rgba(200,155,60,0.7))'
                    }}
                    onMouseLeave={e => {
                      if (isDragging) return
                      e.currentTarget.style.transform = 'translate(-50%,-100%) scale(1)'
                      e.currentTarget.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,1))'
                    }}
                  >
                    {pin.emoji}
                    <span style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 1.5, height: 4, background: isDragging ? '#c89b3c' : 'rgba(200,155,60,0.55)', display: 'block' }} />
                  </button>
                )
              })}

              {/* New-pin preview */}
              {pendingPos && mode === 'adding' && (
                <div style={{ position: 'absolute', left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: 'translate(-50%,-112%)', zIndex: 20, pointerEvents: 'none', fontSize: 20, filter: 'drop-shadow(0 0 8px rgba(200,155,60,0.9))' }}>
                  {form.emoji}
                </div>
              )}

              {/* World-view zoom hint */}
              {mapView === 'world' && (
                <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'rgba(200,155,60,0.25)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  CLICK USA TO ZOOM IN
                </div>
              )}
              </div>{/* end pin overlay */}
            </div>{/* end inner fill */}
          </div>{/* end paddingBottom wrapper */}
        </div>{/* end mapRef container */}

        {/* Footer */}
        <div style={{ padding: '7px 14px', borderTop: '1px solid rgba(200,155,60,0.08)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {isLoggedIn
              ? mapView === 'world'
                ? 'Click a country to explore · Click to pin'
                : 'Click a state to pin · Drag to move'
              : <><Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Log in</Link> to pin your favorite places</>
            }
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button style={tabBtn(mapView === 'world')} onClick={() => switchView('world')}>🌍</button>
            <button style={tabBtn(mapView === 'usa')} onClick={() => switchView('usa')}>🇺🇸</button>
          </div>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {isLoggedIn && visiblePins.length === 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed rgba(200,155,60,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>{mapView === 'world' ? '🌍' : '🇺🇸'}</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--text-2)', marginBottom: 6 }}>
            {mapView === 'world' ? 'No world pins yet' : 'No USA pins yet'}
          </div>
          <p className="body-text" style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
            {mapView === 'world' ? 'Click anywhere on the map to mark a place' : 'Click a state to drop your first USA pin'}
          </p>
        </div>
      )}

      {/* ── ADVENTURE SPOTS ── */}
      {visiblePins.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(200,155,60,0.15)', borderRadius: 12, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(200,155,60,0.08)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: 13 }}>📍</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: 'var(--text-1)', flex: 1 }}>
              {mapView === 'world' ? 'World Destinations' : 'USA Destinations'}
            </span>
            <span className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {visiblePins.length} {visiblePins.length === 1 ? 'place' : 'places'}
            </span>
          </div>

          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 9 }}>
            {visiblePins.map(pin => (
              <div key={pin.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(200,155,60,0.12)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 9, background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {pin.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 3 }}>{pin.name}</div>
                    <div className="body-text" style={{ fontSize: 9, color: 'var(--text-3)' }}>
                      {new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {pin.reason && (
                  <p className="body-text" style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.55, fontStyle: 'italic', borderLeft: '2px solid rgba(200,155,60,0.3)', paddingLeft: 8 }}>
                    &ldquo;{pin.reason}&rdquo;
                  </p>
                )}
                {userId && pin.userId === userId && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => handleEditPin(pin)} className="body-text" style={{ flex: 1, fontSize: 10, padding: '5px 0', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.22)', borderRadius: 6, color: 'var(--gold)', cursor: 'pointer' }}>✏️ Edit</button>
                    <button onClick={() => handleDeletePin(pin)} disabled={saving} className="body-text" style={{ flex: 1, fontSize: 10, padding: '5px 0', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.55 : 1 }}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showFormModal && (
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.35)', borderRadius: 14, padding: '18px 16px', width: '100%', maxWidth: 380, boxShadow: '0 0 80px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{form.emoji}</span>
              <h3 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--gold)', margin: 0 }}>
                {mode === 'editing' ? 'Edit Destination' : `New ${mapView === 'usa' ? 'USA' : 'World'} Pin`}
              </h3>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Icon</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {TRAVEL_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setForm(f => ({ ...f, emoji }))} style={{ width: 34, height: 34, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: form.emoji === emoji ? '2px solid #c89b3c' : '1px solid rgba(42,40,32,1)', background: form.emoji === emoji ? 'rgba(200,155,60,0.15)' : 'rgba(0,0,0,0.3)', cursor: 'pointer' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 9 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Place Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amalfi Coast, Italy" maxLength={100} autoFocus className="osrs-input body-text" style={{ width: '100%', fontSize: 12, padding: '8px 11px', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Why This Place?</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="A dream destination, a memory, or why it is special..." maxLength={500} rows={3} className="osrs-input body-text" style={{ width: '100%', fontSize: 12, padding: '8px 11px', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box' }} />
              <div className="body-text" style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'right', marginTop: 2 }}>{form.reason.length}/500</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={mode === 'editing' ? handleSaveEdit : handleSaveNew} disabled={saving || !form.name.trim()} className="osrs-btn" style={{ flex: 1, fontSize: 7, padding: '9px 0', cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
                {saving ? 'Saving...' : mode === 'editing' ? 'Update' : 'Drop Pin!'}
              </button>
              <button onClick={closeAll} className="body-text" style={{ padding: '9px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW PIN MODAL ── */}
      {showViewModal && activePin && (
        <div onClick={closeAll} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.35)', borderRadius: 14, padding: '18px 16px', width: '100%', maxWidth: 340, boxShadow: '0 0 80px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 11, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {activePin.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: 'var(--gold)', lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 3 }}>{activePin.name}</div>
                <div className="body-text" style={{ fontSize: 9, color: 'var(--text-3)' }}>
                  {new Date(activePin.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
            {activePin.reason && (
              <p className="body-text" style={{ fontSize: 12, color: 'var(--text-1)', margin: '0 0 14px', lineHeight: 1.65, fontStyle: 'italic', borderLeft: '2px solid rgba(200,155,60,0.45)', paddingLeft: 11 }}>
                &ldquo;{activePin.reason}&rdquo;
              </p>
            )}
            <div style={{ display: 'flex', gap: 7 }}>
              {userId && activePin.userId === userId && (
                <>
                  <button onClick={() => handleEditPin(activePin)} className="body-text" style={{ flex: 1, fontSize: 11, padding: '8px 0', background: 'rgba(200,155,60,0.09)', border: '1px solid rgba(200,155,60,0.28)', borderRadius: 8, color: 'var(--gold)', cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={() => handleDeletePin(activePin)} disabled={saving} className="body-text" style={{ flex: 1, fontSize: 11, padding: '8px 0', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, color: '#ef4444', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.55 : 1 }}>🗑️ Delete</button>
                </>
              )}
              <button onClick={closeAll} className="body-text" style={{ flex: 1, padding: '8px 0', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontSize: 11 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
