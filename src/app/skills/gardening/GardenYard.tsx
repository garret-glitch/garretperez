'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────
export interface PlantType {
  id: string
  name: string
  category: string
  icon: string
  description: string | null
  careInstructions: string | null
  waterNeeds: string | null
  sunNeeds: string | null
  daysToHarvest: number | null
  autoGrowthDays: number | null
  stage1Image: string | null
  stage2Image: string | null
  stage3Image: string | null
  stage4Image: string | null
  stage5Image: string | null
  stage6Image: string | null
}

export interface YardPlant {
  id: string
  name: string
  plantTypeId: string | null
  plantType: PlantType | null
  growthStage: number
  xPos: number
  yPos: number
  datePlanted: string | null
  notes: string | null
  harvestStatus: boolean
  photos: string
  isAutoGrowth: boolean
  addedBy: string | null
  createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────
const STAGES = [
  { n: 1, label: 'Seedling',      emoji: '🌱', color: '#7bcf5a', glow: '#7bcf5a55' },
  { n: 2, label: 'Sapling',       emoji: '🌿', color: '#5ab84a', glow: '#5ab84a55' },
  { n: 3, label: 'Growing',       emoji: '🌾', color: '#4aa83a', glow: '#4aa83a55' },
  { n: 4, label: 'Growing More',  emoji: '🌳', color: '#3a982a', glow: '#3a982a55' },
  { n: 5, label: 'Almost Ready',  emoji: '🌺', color: '#e09030', glow: '#e0903055' },
  { n: 6, label: 'Harvest Ready', emoji: '✨', color: '#e0c020', glow: '#e0c02066' },
]

const CATEGORY_LABELS: Record<string, string> = {
  POTTED:     '🪴 Potted',
  RAISED_BED: '🪵 Raised Bed',
  VINE:       '🍇 Vine',
  HERB:       '🌿 Herb',
  TREE:       '🌳 Tree',
  BERRY_BUSH: '🫐 Berry Bush',
}

const CATEGORY_OPTS = ['POTTED', 'RAISED_BED', 'VINE', 'HERB', 'TREE', 'BERRY_BUSH']
const SUN_OPTS = ['Full Sun', 'Partial Shade', 'Shade']

const S = {
  card:     '#16120e',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.2)',
  borderLit:'rgba(200,155,60,0.5)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%',
  background: '#1c1610', border: '1px solid rgba(200,155,60,0.25)',
  color: '#f0e8d8', padding: '10px 13px',
  fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
  borderRadius: 8,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11,
  fontWeight: 700, color: '#4a3820', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: 5,
}

// ── Helpers ────────────────────────────────────────────────────────
function computeStage(plant: YardPlant): number {
  if (plant.harvestStatus) return 6
  if (!plant.isAutoGrowth || !plant.plantType?.autoGrowthDays || !plant.datePlanted) {
    return Math.min(6, Math.max(1, plant.growthStage))
  }
  const days = (Date.now() - new Date(plant.datePlanted).getTime()) / 86400000
  return Math.min(6, Math.max(1, Math.floor(days / plant.plantType.autoGrowthDays) + 1))
}

function daysUntilHarvest(plant: YardPlant): number | null {
  if (!plant.plantType?.daysToHarvest || !plant.datePlanted) return null
  const harvestMs = new Date(plant.datePlanted).getTime() + plant.plantType.daysToHarvest * 86400000
  return Math.round((harvestMs - Date.now()) / 86400000)
}

function getStageImage(pt: PlantType | null, stage: number): string | null {
  if (!pt) return null
  const key = `stage${stage}Image` as keyof PlantType
  return (pt[key] as string | null) || null
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

// ── PlantPopup ─────────────────────────────────────────────────────
function PlantPopup({ plant, isAdmin, onClose, onUpdate, onDelete }: {
  plant: YardPlant
  isAdmin: boolean
  onClose: () => void
  onUpdate: (p: YardPlant) => void
  onDelete: (id: string) => void
}) {
  const stage = computeStage(plant)
  const stageInfo = STAGES[stage - 1]
  const stageImage = getStageImage(plant.plantType, stage)
  const daysUntil = daysUntilHarvest(plant)
  const initPhotos = (() => { try { return JSON.parse(plant.photos) as string[] } catch { return [] } })()

  const [editMode, setEditMode]       = useState(false)
  const [editStage, setEditStage]     = useState(plant.growthStage)
  const [editNotes, setEditNotes]     = useState(plant.notes ?? '')
  const [editHarvested, setEditHarvested] = useState(plant.harvestStatus)
  const [localPhotos, setLocalPhotos] = useState<string[]>(initPhotos)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/garden/yard-plants/${plant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ growthStage: editStage, notes: editNotes, harvestStatus: editHarvested, photos: localPhotos }),
    })
    if (res.ok) { onUpdate(await res.json()); setEditMode(false) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${plant.name}" from the garden?`)) return
    setDeleting(true)
    const res = await fetch(`/api/garden/yard-plants/${plant.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(plant.id)
    setDeleting(false)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 3_000_000) { alert('Max 3 MB per photo'); return }
    setUploading(true)
    setLocalPhotos(p => [...p, ''])
    const b64 = await toBase64(file)
    setLocalPhotos(p => { const n = [...p]; n[n.length - 1] = b64; return n })
    setUploading(false)
    e.target.value = ''
  }

  const viewPhotos = editMode ? localPhotos : initPhotos

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: 16, padding: '20px 20px 16px', borderBottom: '1px solid rgba(200,155,60,0.12)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, background: 'radial-gradient(ellipse at 50% 30%, #fffbf0, #e8d4a0)', border: `3px solid ${stageInfo.color}`, boxShadow: `0 0 20px ${stageInfo.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {stageImage
              ? <img src={stageImage} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
              : <span style={{ fontSize: 40 }}>{plant.plantType?.icon ?? '🌱'}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 800, color: S.text1, margin: 0, lineHeight: 1.2 }}>{plant.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {plant.plantType && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>{plant.plantType.name}</span>}
              {plant.plantType?.category && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, padding: '1px 8px', borderRadius: 20 }}>
                  {CATEGORY_LABELS[plant.plantType.category] ?? plant.plantType.category}
                </span>
              )}
            </div>
            {plant.harvestStatus && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#60d860', marginTop: 4, display: 'block' }}>✅ Harvested!</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, alignSelf: 'flex-start' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Growth stage bar */}
          <div>
            <div style={labelStyle}>Growth Stage</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {STAGES.map((s, i) => (
                <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: '100%', height: 7, borderRadius: 4, background: i < stage ? s.color : 'rgba(200,155,60,0.1)', transition: 'background 0.3s', boxShadow: i + 1 === stage ? `0 0 8px ${s.glow}` : undefined }} />
                  {i + 1 === stage && (
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: s.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.emoji} {s.label}</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3, marginTop: 5 }}>
              Stage {stage} of 6
              {plant.isAutoGrowth && <span style={{ color: S.text4, marginLeft: 6 }}>· auto-growing</span>}
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { icon: '📅', label: 'Date Planted', value: fmtDate(plant.datePlanted) },
              {
                icon: '⏳', label: 'Days to Harvest',
                value: plant.harvestStatus ? '✅ Done!'
                  : daysUntil === null ? '—'
                  : daysUntil < 0 ? 'Harvest now!'
                  : daysUntil === 0 ? 'Today!'
                  : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
              },
              plant.plantType?.waterNeeds ? { icon: '💧', label: 'Watering', value: plant.plantType.waterNeeds } : null,
              plant.plantType?.sunNeeds   ? { icon: '☀️',  label: 'Sunlight',  value: plant.plantType.sunNeeds }   : null,
            ] as ({ icon: string; label: string; value: string } | null)[]).filter(Boolean).map(stat => stat && (
              <div key={stat.label} style={{ background: '#1c1610', border: '1px solid rgba(200,155,60,0.1)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>{stat.icon} {stat.label}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: S.text1, marginTop: 2 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Care instructions */}
          {plant.plantType?.careInstructions && (
            <div>
              <div style={labelStyle}>Care Instructions</div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0 }}>{plant.plantType.careInstructions}</p>
            </div>
          )}

          {/* About plant */}
          {plant.plantType?.description && (
            <div>
              <div style={labelStyle}>About This Plant</div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0 }}>{plant.plantType.description}</p>
            </div>
          )}

          {/* Photos */}
          {viewPhotos.length > 0 && (
            <div>
              <div style={labelStyle}>Photos</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {viewPhotos.map((src, i) => src
                  ? <img key={i} src={src} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid rgba(200,155,60,0.2)' }} />
                  : <div key={i} style={{ width: 96, height: 96, borderRadius: 10, flexShrink: 0, background: '#1c1610', border: '1px solid rgba(200,155,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {!editMode && plant.notes && (
            <div>
              <div style={labelStyle}>Notes</div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{plant.notes}</p>
            </div>
          )}

          {/* Admin edit area */}
          {isAdmin && editMode && (
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold, letterSpacing: '0.1em' }}>✏️ EDIT PLANT</div>

              {/* Stage picker */}
              <div>
                <label style={labelStyle}>Growth Stage</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGES.map(s => (
                    <button key={s.n} type="button" onClick={() => setEditStage(s.n)}
                      style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, border: `2px solid ${editStage === s.n ? s.color : 'rgba(200,155,60,0.2)'}`, background: editStage === s.n ? `${s.color}22` : 'transparent', color: editStage === s.n ? s.color : S.text3 }}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harvested checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={editHarvested} onChange={e => setEditHarvested(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2 }}>Mark as Harvested ✅</span>
              </label>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Photo management */}
              <div>
                <label style={labelStyle}>Photos</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {localPhotos.map((src, i) => (
                    <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                      {src
                        ? <img src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                        : <div style={{ width: 80, height: 80, borderRadius: 8, background: '#1c1610', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
                      }
                      {src && (
                        <button type="button" onClick={() => setLocalPhotos(p => p.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(180,50,50,0.85)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: '20px', textAlign: 'center' }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
                    style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed rgba(200,155,60,0.3)', background: 'transparent', color: S.text4, cursor: uploading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
                    <span style={{ fontSize: 22 }}>📷</span>
                    {uploading ? 'Adding…' : 'Add'}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                </div>
              </div>
            </div>
          )}

          {/* Admin action buttons */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid rgba(200,155,60,0.12)', paddingTop: 14 }}>
              {!editMode ? (
                <>
                  <button onClick={() => setEditMode(true)}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(200,155,60,0.3)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>
                    ✏️ Edit
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(180,50,50,0.4)', color: '#c06060', fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>
                    {deleting ? 'Removing…' : '🗑 Remove'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 20px', background: saving ? 'rgba(200,155,60,0.2)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: saving ? S.text4 : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', borderRadius: 8 }}>
                    {saving ? 'Saving…' : '💾 Save'}
                  </button>
                  <button onClick={() => { setEditMode(false); setEditStage(plant.growthStage); setEditNotes(plant.notes ?? ''); setEditHarvested(plant.harvestStatus); setLocalPhotos(initPhotos) }}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AddPlantModal ──────────────────────────────────────────────────
function AddPlantModal({ plantTypes, onClose, onAdd }: {
  plantTypes: PlantType[]
  onClose: () => void
  onAdd: (p: YardPlant) => void
}) {
  const [name,         setName]        = useState('')
  const [plantTypeId,  setPlantTypeId] = useState('')
  const [growthStage,  setGrowthStage] = useState(1)
  const [xPos,         setXPos]        = useState(50)
  const [yPos,         setYPos]        = useState(50)
  const [datePlanted,  setDatePlanted] = useState('')
  const [notes,        setNotes]       = useState('')
  const [isAutoGrowth, setAutoGrowth]  = useState(false)
  const [saving,       setSaving]      = useState(false)
  const [err,          setErr]         = useState('')

  const selectedType = plantTypes.find(t => t.id === plantTypeId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Plant name is required.'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/garden/yard-plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, plantTypeId, growthStage, xPos, yPos, datePlanted, notes, isAutoGrowth }),
    })
    if (res.ok) {
      const data = await res.json()
      onAdd(data.plant)
      onClose()
    } else {
      setErr('Failed to add plant.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <form onSubmit={handleSubmit}
        style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>🌱 ADD PLANT TO YARD</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Plant Name *</label>
            <input autoFocus required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Cherry Tomatoes" maxLength={80} style={inputStyle} />
          </div>

          {/* Plant type */}
          <div>
            <label style={labelStyle}>Plant Type</label>
            <select value={plantTypeId} onChange={e => setPlantTypeId(e.target.value)} style={inputStyle}>
              <option value="">— No type (custom) —</option>
              {plantTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} · {CATEGORY_LABELS[t.category] ?? t.category}</option>)}
            </select>
          </div>

          {/* Growth stage */}
          <div>
            <label style={labelStyle}>Initial Growth Stage</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {STAGES.map(s => (
                <button key={s.n} type="button" onClick={() => setGrowthStage(s.n)}
                  style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, border: `2px solid ${growthStage === s.n ? s.color : 'rgba(200,155,60,0.2)'}`, background: growthStage === s.n ? `${s.color}22` : 'transparent', color: growthStage === s.n ? s.color : S.text3 }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-growth toggle (only if type has autoGrowthDays) */}
          {selectedType?.autoGrowthDays && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isAutoGrowth} onChange={e => setAutoGrowth(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2 }}>
                Auto-grow (advances 1 stage every {selectedType.autoGrowthDays} days)
              </span>
            </label>
          )}

          {/* Date planted */}
          <div>
            <label style={labelStyle}>Date Planted</label>
            <input type="date" value={datePlanted} onChange={e => setDatePlanted(e.target.value)} style={inputStyle} />
          </div>

          {/* Position sliders */}
          <div>
            <label style={labelStyle}>Position in Yard</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginBottom: 4 }}>Left ↔ Right: {Math.round(xPos)}%</div>
                <input type="range" min={5} max={95} value={xPos} onChange={e => setXPos(Number(e.target.value))} style={{ width: '100%', accentColor: S.gold }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginBottom: 4 }}>Top ↕ Bottom: {Math.round(yPos)}%</div>
                <input type="range" min={5} max={90} value={yPos} onChange={e => setYPos(Number(e.target.value))} style={{ width: '100%', accentColor: S.gold }} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Variety, source, observations…" />
          </div>

          {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c06060' }}>{err}</div>}

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              style={{ padding: '10px 22px', background: (saving || !name.trim()) ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: (saving || !name.trim()) ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', borderRadius: 8 }}>
              {saving ? 'Planting…' : '🌱 Plant It'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── PlantTypeForm ──────────────────────────────────────────────────
function PlantTypeForm({ initial, onClose, onSave }: {
  initial?: PlantType
  onClose: () => void
  onSave: (t: PlantType) => void
}) {
  const [name,             setName]          = useState(initial?.name ?? '')
  const [category,         setCategory]      = useState(initial?.category ?? 'POTTED')
  const [icon,             setIcon]          = useState(initial?.icon ?? '🌱')
  const [description,      setDescription]   = useState(initial?.description ?? '')
  const [careInstructions, setCare]          = useState(initial?.careInstructions ?? '')
  const [waterNeeds,       setWaterNeeds]    = useState(initial?.waterNeeds ?? '')
  const [sunNeeds,         setSunNeeds]      = useState(initial?.sunNeeds ?? '')
  const [daysToHarvest,    setDaysHarvest]   = useState(initial?.daysToHarvest?.toString() ?? '')
  const [autoGrowthDays,   setAutoGrowth]    = useState(initial?.autoGrowthDays?.toString() ?? '')
  const [stageImgs, setStageImgs] = useState<string[]>([
    initial?.stage1Image ?? '',
    initial?.stage2Image ?? '',
    initial?.stage3Image ?? '',
    initial?.stage4Image ?? '',
    initial?.stage5Image ?? '',
    initial?.stage6Image ?? '',
  ])
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const imgRef1 = useRef<HTMLInputElement>(null)
  const imgRef2 = useRef<HTMLInputElement>(null)
  const imgRef3 = useRef<HTMLInputElement>(null)
  const imgRef4 = useRef<HTMLInputElement>(null)
  const imgRef5 = useRef<HTMLInputElement>(null)
  const imgRef6 = useRef<HTMLInputElement>(null)
  const imgRefs = [imgRef1, imgRef2, imgRef3, imgRef4, imgRef5, imgRef6]

  async function handleStageImg(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2_000_000) { alert('Max 2 MB per image'); return }
    const b64 = await toBase64(file)
    setStageImgs(prev => { const n = [...prev]; n[idx] = b64; return n })
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const payload = {
      name, category, icon, description, careInstructions: careInstructions,
      waterNeeds, sunNeeds, daysToHarvest, autoGrowthDays,
      stage1Image: stageImgs[0] || null,
      stage2Image: stageImgs[1] || null,
      stage3Image: stageImgs[2] || null,
      stage4Image: stageImgs[3] || null,
      stage5Image: stageImgs[4] || null,
      stage6Image: stageImgs[5] || null,
    }
    const url = initial ? `/api/garden/plant-types/${initial.id}` : '/api/garden/plant-types'
    const method = initial ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      onSave(await res.json())
      onClose()
    } else {
      setErr('Failed to save.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <form onSubmit={handleSubmit}
        style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold, letterSpacing: '0.1em' }}>
            {initial ? '✏️ EDIT PLANT TYPE' : '🌿 NEW PLANT TYPE'}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name + icon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div>
              <label style={labelStyle}>Plant Type Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cherry Tomatoes" maxLength={80} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} style={{ ...inputStyle, fontSize: 22, textAlign: 'center' }} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {CATEGORY_OPTS.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, border: `2px solid ${category === c ? 'rgba(200,155,60,0.7)' : 'rgba(200,155,60,0.2)'}`, background: category === c ? 'rgba(200,155,60,0.12)' : 'transparent', color: category === c ? S.text1 : S.text3, fontWeight: category === c ? 700 : 400 }}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Harvest + auto-growth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Days to Harvest</label>
              <input type="number" min={1} max={999} value={daysToHarvest} onChange={e => setDaysHarvest(e.target.value)} placeholder="e.g. 75" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Days per Growth Stage</label>
              <input type="number" min={1} max={365} value={autoGrowthDays} onChange={e => setAutoGrowth(e.target.value)} placeholder="e.g. 12 (auto-advance)" style={inputStyle} />
            </div>
          </div>

          {/* Water + sun */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>💧 Water Needs</label>
              <input value={waterNeeds} onChange={e => setWaterNeeds(e.target.value)} placeholder="e.g. Every 2-3 days" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>☀️ Sun Needs</label>
              <select value={sunNeeds} onChange={e => setSunNeeds(e.target.value)} style={inputStyle}>
                <option value="">— pick one —</option>
                {SUN_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Description + care */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What kind of plant is this?" />
          </div>
          <div>
            <label style={labelStyle}>Care Instructions</label>
            <textarea value={careInstructions} onChange={e => setCare(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="How to care for this plant…" />
          </div>

          {/* Growth stage images */}
          <div>
            <div style={labelStyle}>Growth Stage Images</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {STAGES.map((s, i) => (
                <div key={s.n}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: S.text3, marginBottom: 4 }}>{s.emoji} Stage {s.n}: {s.label}</div>
                  <div style={{ position: 'relative' }}>
                    {stageImgs[i]
                      ? (
                        <div style={{ position: 'relative' }}>
                          <img src={stageImgs[i]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 8, background: '#1c1610', border: '1px solid rgba(200,155,60,0.2)', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4, alignItems: 'flex-end', justifyContent: 'center', padding: 4 }}>
                            <button type="button" onClick={() => imgRefs[i].current?.click()}
                              style={{ flex: 1, padding: '3px 0', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ddd', fontSize: 9, borderRadius: 4, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              Change
                            </button>
                            <button type="button" onClick={() => setStageImgs(p => { const n = [...p]; n[i] = ''; return n })}
                              style={{ padding: '3px 6px', background: 'rgba(180,50,50,0.75)', border: 'none', color: '#fff', fontSize: 9, borderRadius: 4, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                      : (
                        <button type="button" onClick={() => imgRefs[i].current?.click()}
                          style={{ width: '100%', aspectRatio: '1', borderRadius: 8, border: '2px dashed rgba(200,155,60,0.25)', background: 'transparent', color: S.text4, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 20 }}>
                          <span>{s.emoji}</span>
                          <span style={{ fontSize: 9 }}>Upload</span>
                        </button>
                      )
                    }
                    <input ref={imgRefs[i]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleStageImg(i, e)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c06060' }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              style={{ padding: '10px 22px', background: (saving || !name.trim()) ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: (saving || !name.trim()) ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', borderRadius: 8 }}>
              {saving ? 'Saving…' : initial ? '💾 Save Changes' : '🌿 Create Type'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── EditPlantModal ─────────────────────────────────────────────────
function EditPlantModal({ plant, plantTypes, onClose, onSave }: {
  plant: YardPlant
  plantTypes: PlantType[]
  onClose: () => void
  onSave: (p: YardPlant) => void
}) {
  const [name,        setName]       = useState(plant.name)
  const [plantTypeId, setTypeId]     = useState(plant.plantTypeId ?? '')
  const [xPos,        setXPos]       = useState(plant.xPos)
  const [yPos,        setYPos]       = useState(plant.yPos)
  const [datePlanted, setDate]       = useState(plant.datePlanted ? plant.datePlanted.slice(0, 10) : '')
  const [notes,       setNotes]      = useState(plant.notes ?? '')
  const [isAutoGrowth,setAuto]       = useState(plant.isAutoGrowth)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const selectedType = plantTypes.find(t => t.id === plantTypeId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const res = await fetch(`/api/garden/yard-plants/${plant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, plantTypeId: plantTypeId || null, xPos, yPos, datePlanted: datePlanted || null, notes, isAutoGrowth }),
    })
    if (res.ok) { onSave(await res.json()); onClose() }
    else { setErr('Failed to save.'); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <form onSubmit={handleSubmit}
        style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>✏️ EDIT PLANT</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Name *</label><input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Plant Type</label>
            <select value={plantTypeId} onChange={e => setTypeId(e.target.value)} style={inputStyle}>
              <option value="">— No type —</option>
              {plantTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Date Planted</label><input type="date" value={datePlanted} onChange={e => setDate(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Position</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, marginBottom: 4 }}>Left ↔ Right: {Math.round(xPos)}%</div>
                <input type="range" min={5} max={95} value={xPos} onChange={e => setXPos(Number(e.target.value))} style={{ width: '100%', accentColor: S.gold }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4, marginBottom: 4 }}>Top ↕ Bottom: {Math.round(yPos)}%</div>
                <input type="range" min={5} max={90} value={yPos} onChange={e => setYPos(Number(e.target.value))} style={{ width: '100%', accentColor: S.gold }} />
              </div>
            </div>
          </div>
          {selectedType?.autoGrowthDays && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isAutoGrowth} onChange={e => setAuto(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>Auto-grow (1 stage / {selectedType.autoGrowthDays} days)</span>
            </label>
          )}
          <div><label style={labelStyle}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c06060' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8 }}>Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} style={{ padding: '10px 22px', background: (saving || !name.trim()) ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: (saving || !name.trim()) ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', borderRadius: 8 }}>{saving ? 'Saving…' : '💾 Save'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Main GardenYard ────────────────────────────────────────────────
export default function GardenYard({
  initialPlants,
  initialTypes,
  isAdmin,
}: {
  initialPlants: YardPlant[]
  initialTypes: PlantType[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [plants,      setPlants]     = useState<YardPlant[]>(initialPlants)
  const [types,       setTypes]      = useState<PlantType[]>(initialTypes)
  const [selected,    setSelected]   = useState<YardPlant | null>(null)
  const [showAdd,     setShowAdd]    = useState(false)
  const [editingPlant,setEditPlant]  = useState<YardPlant | null>(null)
  const [adminOpen,   setAdminOpen]  = useState(false)
  const [adminTab,    setAdminTab]   = useState<'plants' | 'types'>('plants')
  const [typeForm,    setTypeForm]   = useState<PlantType | null | 'new'>(null)
  const [deletingType,setDelType]    = useState<string | null>(null)

  function handlePlantUpdate(updated: YardPlant) {
    setPlants(p => p.map(x => x.id === updated.id ? updated : x))
    setSelected(updated)
  }

  function handlePlantDelete(id: string) {
    setPlants(p => p.filter(x => x.id !== id))
    setSelected(null)
    router.refresh()
  }

  function handlePlantAdd(p: YardPlant) {
    setPlants(prev => [...prev, p])
    router.refresh()
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this plant type? Plants using it will lose their type info.')) return
    setDelType(id)
    const res = await fetch(`/api/garden/plant-types/${id}`, { method: 'DELETE' })
    if (res.ok) setTypes(t => t.filter(x => x.id !== id))
    setDelType(null)
  }

  const harvestedCount = plants.filter(p => p.harvestStatus).length
  const growingCount   = plants.filter(p => !p.harvestStatus).length

  return (
    <>
      {/* ── Yard container ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Yard visual */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 30% 20%, #4a9a34 0%, #2d7020 40%, #1e5014 80%, #3d7a28 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.05)',
          border: '4px solid #5a3010',
          borderBottom: 'none',
          minHeight: 200,
        }}>

          {/* Grass texture strips */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(88deg, transparent, transparent 18px, rgba(0,0,0,0.03) 18px, rgba(0,0,0,0.03) 36px)', pointerEvents: 'none' }} />

          {/* Decorative dirt path */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%', background: 'linear-gradient(180deg, #5c3a1a 0%, #4a2e12 100%)', borderTop: '2px solid #7a4a1e', opacity: 0.6, pointerEvents: 'none' }} />

          {/* Corner rocks */}
          {[{ t: '8%', l: '4%' }, { t: '8%', r: '4%', l: undefined as undefined }, { b: '16%', l: '4%', t: undefined as undefined }, { b: '16%', r: '4%', l: undefined as undefined, t: undefined as undefined }].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', ...pos, width: 10, height: 7, borderRadius: '50%', background: 'rgba(150,120,80,0.5)', boxShadow: '1px 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
          ))}

          {/* Garden sign */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(90,50,10,0.85)', border: '2px solid #8a5c28', borderRadius: 6, padding: '5px 14px', backdropFilter: 'blur(2px)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#e8c878', letterSpacing: '0.12em' }}>🌿 ZEN GARDEN 🌿</span>
          </div>

          {/* Plant nodes */}
          {plants.map(plant => {
            const stage = computeStage(plant)
            const info  = STAGES[stage - 1]
            const img   = getStageImage(plant.plantType, stage)
            return (
              <div
                key={plant.id}
                role="button"
                tabIndex={0}
                aria-label={`${plant.name}, ${info.label}`}
                style={{
                  position: 'absolute',
                  left: `${plant.xPos}%`,
                  top: `${plant.yPos}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, zIndex: 10, cursor: 'pointer', userSelect: 'none',
                }}
                onClick={e => { e.stopPropagation(); setSelected(plant) }}
                onKeyDown={e => e.key === 'Enter' && setSelected(plant)}
              >
                {/* Circle */}
                <div style={{
                  width: 58, height: 58, borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 50% 30%, #fffbf0, #e8d4a0)',
                  border: `3px solid ${info.color}`,
                  boxShadow: `0 4px 14px rgba(0,0,0,0.55), 0 0 14px ${info.glow}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.12s',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {img
                    ? <img src={img} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    : <span style={{ fontSize: 26, lineHeight: 1 }}>{plant.plantType?.icon ?? '🌱'}</span>
                  }
                  {plant.harvestStatus && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,220,0,0.18)' }} />
                  )}
                </div>
                {/* Name tag */}
                <div style={{
                  background: 'rgba(10,6,2,0.82)', color: '#f0e8d8',
                  fontSize: 9, padding: '2px 7px', borderRadius: 5,
                  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                  maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(3px)',
                }}>
                  {plant.name.length > 12 ? plant.name.slice(0, 12) + '…' : plant.name}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {plants.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, pointerEvents: 'none' }}>
              <span style={{ fontSize: 40, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))' }}>🌱</span>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(240,232,216,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                {isAdmin ? 'The garden is empty — add some plants!' : 'The garden is empty'}
              </div>
            </div>
          )}
        </div>

        {/* Garden footer bar */}
        <div style={{
          background: '#16120e', border: '4px solid #5a3010', borderTop: '2px solid rgba(200,155,60,0.2)',
          borderRadius: '0 0 16px 16px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          {/* Stats */}
          {plants.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em' }}>
                {plants.length} {plants.length === 1 ? 'PLANT' : 'PLANTS'}
              </span>
              {growingCount > 0 && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5ab84a', background: 'rgba(90,184,74,0.1)', border: '1px solid rgba(90,184,74,0.25)', padding: '2px 10px', borderRadius: 20 }}>
                  🌱 {growingCount} growing
                </span>
              )}
              {harvestedCount > 0 && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#60d860', background: 'rgba(96,216,96,0.1)', border: '1px solid rgba(96,216,96,0.25)', padding: '2px 10px', borderRadius: 20 }}>
                  ✅ {harvestedCount} harvested
                </span>
              )}
            </div>
          )}
          {plants.length === 0 && <div style={{ flex: 1 }} />}

          {/* Admin controls */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              <button onClick={() => setShowAdd(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 8, boxShadow: '0 2px 10px rgba(160,120,28,0.3)' }}>
                <span>🌱</span> Add Plant
              </button>
              <button onClick={() => setAdminOpen(o => !o)}
                style={{ padding: '8px 14px', background: adminOpen ? 'rgba(200,155,60,0.15)' : 'transparent', border: `1px solid ${adminOpen ? 'rgba(200,155,60,0.5)' : 'rgba(200,155,60,0.22)'}`, color: adminOpen ? S.gold : S.text3, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>
                ⚙️ Manage
              </button>
            </div>
          )}
        </div>

        {/* ── Admin panel ──────────────────────────── */}
        {isAdmin && adminOpen && (
          <div style={{ background: '#13100c', border: '1px solid rgba(200,155,60,0.18)', borderTop: 'none', borderRadius: '0 0 14px 14px', marginTop: -2 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,155,60,0.15)' }}>
              {(['plants', 'types'] as const).map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab)}
                  style={{ flex: 1, padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${adminTab === tab ? S.gold : 'transparent'}`, color: adminTab === tab ? S.gold : S.text3, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer', letterSpacing: '0.1em', transition: 'color 0.15s' }}>
                  {tab === 'plants' ? '🌱 YARD PLANTS' : '🌿 PLANT TYPES'}
                </button>
              ))}
            </div>

            {/* Plants list */}
            {adminTab === 'plants' && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plants.length === 0 ? (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4, textAlign: 'center', padding: '20px 0' }}>No plants in the yard yet.</div>
                ) : (
                  plants.map(plant => {
                    const stage = computeStage(plant)
                    const info  = STAGES[stage - 1]
                    return (
                      <div key={plant.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#16120e', border: '1px solid rgba(200,155,60,0.12)', borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{plant.plantType?.icon ?? '🌱'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plant.name}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>
                            {info.emoji} {info.label}
                            {plant.plantType && ` · ${plant.plantType.name}`}
                            {plant.harvestStatus && ' · ✅ Harvested'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setEditPlant(plant)}
                            style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>
                            ✏️
                          </button>
                          <button onClick={() => { setSelected(plant) }}
                            style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>
                            👁
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Types list */}
            {adminTab === 'types' && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setTypeForm('new')}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.35)', color: S.gold, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 8, marginBottom: 4 }}>
                  + Add Plant Type
                </button>
                {types.length === 0 ? (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4, textAlign: 'center', padding: '20px 0' }}>No plant types yet. Add one above!</div>
                ) : (
                  types.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#16120e', border: '1px solid rgba(200,155,60,0.12)', borderRadius: 10, padding: '10px 14px' }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>
                          {CATEGORY_LABELS[t.category] ?? t.category}
                          {t.daysToHarvest && ` · ${t.daysToHarvest}d to harvest`}
                          {t.autoGrowthDays && ` · auto ${t.autoGrowthDays}d/stage`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setTypeForm(t)}
                          style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>✏️</button>
                        <button onClick={() => deleteType(t.id)} disabled={deletingType === t.id}
                          style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(180,50,50,0.35)', color: '#c06060', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>
                          {deletingType === t.id ? '…' : '🗑'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────── */}
      {selected && (
        <PlantPopup
          plant={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onUpdate={handlePlantUpdate}
          onDelete={handlePlantDelete}
        />
      )}

      {showAdd && (
        <AddPlantModal
          plantTypes={types}
          onClose={() => setShowAdd(false)}
          onAdd={handlePlantAdd}
        />
      )}

      {editingPlant && (
        <EditPlantModal
          plant={editingPlant}
          plantTypes={types}
          onClose={() => setEditPlant(null)}
          onSave={updated => { setPlants(p => p.map(x => x.id === updated.id ? updated : x)); setEditPlant(null); router.refresh() }}
        />
      )}

      {typeForm !== null && (
        <PlantTypeForm
          initial={typeForm === 'new' ? undefined : typeForm}
          onClose={() => setTypeForm(null)}
          onSave={saved => {
            setTypes(prev => {
              const exists = prev.find(t => t.id === saved.id)
              return exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved]
            })
            setTypeForm(null)
          }}
        />
      )}
    </>
  )
}
