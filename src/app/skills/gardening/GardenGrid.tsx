'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

export interface PlantData {
  id: string
  userId: string
  name: string
  type: string
  emoji: string
  notes: string | null
  plantedDate: string | null
  waterDays: number | null
  sunlight: string | null
  status: string
  createdAt: string
  user: { username: string }
}

const TYPE_OPTS = [
  { value: 'vegetable', label: 'Vegetable', emoji: '🥦', color: 'rgba(55,160,75,0.75)' },
  { value: 'herb',      label: 'Herb',      emoji: '🌿', color: 'rgba(80,150,70,0.75)' },
  { value: 'flower',    label: 'Flower',    emoji: '🌸', color: 'rgba(200,100,160,0.75)' },
  { value: 'fruit',     label: 'Fruit',     emoji: '🍓', color: 'rgba(210,110,45,0.75)' },
  { value: 'tree',      label: 'Tree',      emoji: '🌳', color: 'rgba(120,90,50,0.75)' },
  { value: 'other',     label: 'Other',     emoji: '🌱', color: 'rgba(90,130,90,0.65)' },
]

const SUN_OPTS = ['Full Sun', 'Partial Shade', 'Shade']
const STATUS_OPTS = [
  { value: 'growing',   label: '🌱 Growing' },
  { value: 'harvested', label: '✅ Harvested' },
  { value: 'dormant',   label: '💤 Dormant' },
  { value: 'dead',      label: '🪦 R.I.P.' },
]

const S = {
  bg:       '#0d100a',
  card:     '#13160f',
  elevated: '#1a1e14',
  border:   'rgba(80,160,90,0.2)',
  borderLit:'rgba(80,160,90,0.45)',
  green:    '#4da85e',
  greenDim: '#2d6b3a',
  gold:     '#c89b3c',
  text1:    '#eef0e8',
  text2:    '#a8b89a',
  text3:    '#6a8060',
  text4:    '#3a5040',
  muted:    '#2a3828',
}

function typeInfo(type: string) {
  return TYPE_OPTS.find(t => t.value === type) ?? TYPE_OPTS[5]
}

function daysAgo(dateStr: string | null): string | null {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Planted today'
  if (diff === 1) return '1 day ago'
  if (diff < 30) return `${diff} days ago`
  const months = Math.floor(diff / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function PlantCard({
  plant, isOwn, onDelete,
}: { plant: PlantData; isOwn: boolean; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const ti = typeInfo(plant.type)
  const planted = daysAgo(plant.plantedDate)
  const statusObj = STATUS_OPTS.find(s => s.value === plant.status) ?? STATUS_OPTS[0]

  async function handleDelete() {
    if (!confirm(`Remove ${plant.name} from your garden?`)) return
    setDeleting(true)
    const res = await fetch(`/api/plants/${plant.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(plant.id)
    else setDeleting(false)
  }

  return (
    <div className="plant-card" style={{
      background: S.card,
      border: `1px solid rgba(80,160,90,0.22)`,
      borderRadius: 18,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    }}>
      {/* top color strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${ti.color}, transparent)` }} />

      {/* Emoji + delete */}
      <div style={{
        background: `radial-gradient(ellipse at 50% 100%, rgba(60,140,70,0.1) 0%, transparent 70%), ${S.elevated}`,
        padding: '24px 20px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        position: 'relative',
      }}>
        {isOwn && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Remove plant"
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'rgba(180,50,50,0.15)', border: '1px solid rgba(180,50,50,0.3)',
              color: '#c06060', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer',
              fontSize: 13, lineHeight: '26px', textAlign: 'center', padding: 0,
              opacity: deleting ? 0.4 : 1,
            }}
          >✕</button>
        )}

        <div style={{ fontSize: 48, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
          {plant.emoji}
        </div>

        {/* Type badge */}
        <div style={{
          background: ti.color, color: '#f0ece4',
          fontFamily: "'Press Start 2P', monospace", fontSize: 6,
          padding: '3px 9px', borderRadius: 4, letterSpacing: '0.08em',
        }}>
          {ti.label.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{
          fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 800,
          color: S.text1, margin: 0, lineHeight: 1.2,
        }}>
          {plant.name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.greenDim, fontWeight: 600 }}>
            {statusObj.label}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>
            by {plant.user.username}
          </span>
        </div>

        {/* Info row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {planted && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>📅</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
                {planted}
              </span>
            </div>
          )}
          {plant.waterDays && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>💧</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
                Every {plant.waterDays} {plant.waterDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
          {plant.sunlight && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>
                {plant.sunlight === 'Full Sun' ? '☀️' : plant.sunlight === 'Partial Shade' ? '🌤️' : '🌥️'}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
                {plant.sunlight}
              </span>
            </div>
          )}
        </div>

        {plant.notes && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3,
            lineHeight: 1.6, margin: 0,
            borderTop: `1px solid rgba(80,160,90,0.1)`, paddingTop: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {plant.notes}
          </p>
        )}
      </div>
    </div>
  )
}

const DEFAULT_EMOJIS: Record<string, string> = {
  vegetable: '🥦', herb: '🌿', flower: '🌸', fruit: '🍓', tree: '🌳', other: '🌱',
}

export default function GardenGrid({
  initial, userId,
}: { initial: PlantData[]; userId: string | null }) {
  const router = useRouter()
  const [plants,  setPlants]  = useState<PlantData[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  const [name,        setName]        = useState('')
  const [type,        setType]        = useState('other')
  const [emoji,       setEmoji]       = useState('🌱')
  const [notes,       setNotes]       = useState('')
  const [plantedDate, setPlantedDate] = useState('')
  const [waterDays,   setWaterDays]   = useState('')
  const [sunlight,    setSunlight]    = useState('')
  const [status,      setStatus]      = useState('growing')

  function handleTypeChange(t: string) {
    setType(t)
    setEmoji(DEFAULT_EMOJIS[t] ?? '🌱')
  }

  function resetForm() {
    setName(''); setType('other'); setEmoji('🌱'); setNotes('')
    setPlantedDate(''); setWaterDays(''); setSunlight(''); setStatus('growing')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, emoji, notes, plantedDate, waterDays, sunlight, status }),
    })
    if (res.ok) {
      const data = await res.json()
      emitXpGained(data.xpAwarded ?? 50)
      setPlants(prev => [data.plant, ...prev])
      resetForm(); setShowAdd(false)
      setMsg(`${name} added! +${data.xpAwarded ?? 50} XP 🌱`)
      router.refresh()
      setTimeout(() => setMsg(''), 4000)
    } else if (res.status === 401) {
      setMsg('Log in to add plants.')
    } else {
      setMsg('Something went wrong.')
    }
    setSaving(false)
  }

  function handleDelete(id: string) {
    setPlants(prev => prev.filter(p => p.id !== id))
  }

  const inputBase: React.CSSProperties = {
    display: 'block', width: '100%', background: S.elevated,
    border: `1px solid rgba(80,160,90,0.22)`, color: S.text1,
    padding: '11px 14px', fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none', borderRadius: 8,
  }

  // Stats
  const counts = TYPE_OPTS.map(t => ({ ...t, count: plants.filter(p => p.type === t.value).length })).filter(t => t.count > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      {plants.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          background: S.card, border: `1px solid rgba(80,160,90,0.15)`,
          padding: '12px 16px', borderRadius: 12,
        }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.greenDim, letterSpacing: '0.1em', marginRight: 6 }}>
            {plants.length} {plants.length === 1 ? 'PLANT' : 'PLANTS'}
          </span>
          {counts.map(t => (
            <span key={t.value} style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3,
              background: 'rgba(80,160,90,0.07)', border: `1px solid rgba(80,160,90,0.18)`,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {t.emoji} {t.count} {t.label}{t.count > 1 ? 's' : ''}
            </span>
          ))}
          {msg && <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.green }}>{msg}</span>}
        </div>
      )}

      {/* Add plant button / form */}
      {userId && !showAdd && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #3d8b57 0%, #2d6b42 100%)',
              border: 'none', color: '#e8f0e4',
              fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 12px rgba(40,120,60,0.3)',
            }}
          >
            <span style={{ fontSize: 18 }}>🌱</span>
            Add a Plant
          </button>
          {!msg && plants.length === 0 && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4 }}>
              Your garden is empty — plant something!
            </span>
          )}
          {msg && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.green }}>{msg}</span>}
        </div>
      )}

      {/* Add form */}
      {userId && showAdd && (
        <form onSubmit={handleAdd} style={{
          background: S.card, border: `1px solid rgba(80,160,90,0.3)`,
          borderRadius: 16, padding: '24px 24px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.green, letterSpacing: '0.1em' }}>
                ADD A PLANT
              </span>
            </div>
            <button type="button" onClick={() => { setShowAdd(false); resetForm() }}
              style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {/* Row 1: Name + Type */}
            <div className="plant-form-grid">
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Plant Name *
                </label>
                <input
                  autoFocus required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Cherry Tomatoes"
                  maxLength={80}
                  className="plant-input"
                  style={inputBase}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Type
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TYPE_OPTS.map(t => (
                    <button
                      key={t.value} type="button"
                      onClick={() => handleTypeChange(t.value)}
                      style={{
                        padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: 13,
                        background: type === t.value ? t.color : 'rgba(80,160,90,0.07)',
                        border: `1px solid ${type === t.value ? t.color : 'rgba(80,160,90,0.2)'}`,
                        color: type === t.value ? '#f0ece4' : S.text3,
                        fontWeight: type === t.value ? 700 : 400,
                      }}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Emoji + Status */}
            <div className="plant-form-grid">
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Emoji
                </label>
                <input
                  value={emoji} onChange={e => setEmoji(e.target.value)}
                  placeholder="🌱"
                  maxLength={4}
                  className="plant-input"
                  style={{ ...inputBase, fontSize: 20, width: 80 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Status
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUS_OPTS.map(s => (
                    <button
                      key={s.value} type="button"
                      onClick={() => setStatus(s.value)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: 13,
                        background: status === s.value ? 'rgba(80,160,90,0.25)' : 'rgba(80,160,90,0.07)',
                        border: `1px solid ${status === s.value ? 'rgba(80,160,90,0.55)' : 'rgba(80,160,90,0.2)'}`,
                        color: status === s.value ? S.text1 : S.text3,
                        fontWeight: status === s.value ? 700 : 400,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Planted date + Water days + Sunlight */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Date Planted
                </label>
                <input
                  type="date"
                  value={plantedDate}
                  onChange={e => setPlantedDate(e.target.value)}
                  className="plant-input"
                  style={{ ...inputBase }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  💧 Water Every
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number" min={1} max={30}
                    value={waterDays}
                    onChange={e => setWaterDays(e.target.value)}
                    placeholder="3"
                    className="plant-input"
                    style={{ ...inputBase, width: 70 }}
                  />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4, whiteSpace: 'nowrap' }}>days</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  ☀️ Sunlight
                </label>
                <select
                  value={sunlight}
                  onChange={e => setSunlight(e.target.value)}
                  className="plant-input"
                  style={{ ...inputBase }}
                >
                  <option value="">— pick one</option>
                  {SUN_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: S.text4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Variety, where you got it, how it's doing…"
                rows={2}
                className="plant-input"
                style={{ ...inputBase, resize: 'vertical' }}
              />
            </div>

            {/* Submit row */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => { setShowAdd(false); resetForm() }}
                style={{
                  padding: '11px 20px', background: 'transparent',
                  border: `1px solid rgba(80,160,90,0.22)`, color: S.text3,
                  fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                style={{
                  padding: '11px 24px', borderRadius: 8,
                  background: saving || !name.trim() ? 'rgba(60,140,70,0.25)' : 'linear-gradient(135deg, #3d8b57 0%, #2d6b42 100%)',
                  border: 'none', color: saving || !name.trim() ? 'rgba(150,220,160,0.4)' : '#e8f0e4',
                  fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
                  cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Planting…' : '🌱 Plant It (+50 XP)'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Plant grid */}
      {plants.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plants.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              isOwn={plant.userId === userId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : !userId ? (
        <div style={{
          background: S.card, border: `1px solid rgba(80,160,90,0.15)`,
          borderRadius: 14, padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: S.text3, marginBottom: 6 }}>
            The garden is empty
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4 }}>
            Log in to start tracking your plants
          </div>
        </div>
      ) : null}
    </div>
  )
}
