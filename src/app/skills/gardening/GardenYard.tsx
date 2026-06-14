'use client'
import { useState, useRef, useEffect } from 'react'
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
  bedType: string
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

const BED_TYPES = [
  { value: 'RAISED_BED',   label: 'Raised Bed',     icon: '🪵' },
  { value: 'IN_GROUND',    label: 'In Ground',      icon: '🌍' },
  { value: 'POT_1GAL',     label: '1 Gallon Pot',   icon: '🪴' },
  { value: 'POT_5GAL',     label: '5 Gallon Pot',   icon: '🪴' },
  { value: 'POT_10GAL',    label: '10 Gallon Pot',  icon: '🪴' },
  { value: 'POT_15GAL',    label: '15 Gallon Pot',  icon: '🪴' },
  { value: 'POT_20GAL',    label: '20 Gallon Pot',  icon: '🪴' },
  { value: 'POT_30GAL',    label: '30 Gallon Pot',  icon: '🪴' },
  { value: 'VINE_TRELLIS', label: 'Vine / Trellis', icon: '🪢' },
  { value: 'HERB_GARDEN',  label: 'Herb Garden',    icon: '🌿' },
]

const SUN_OPTS = ['Full Sun', 'Partial Shade', 'Shade']
const CATEGORY_OPTS = ['POTTED', 'RAISED_BED', 'VINE', 'HERB', 'TREE', 'BERRY_BUSH']
const CATEGORY_LABELS: Record<string, string> = {
  POTTED: '🪴 Potted', RAISED_BED: '🪵 Raised Bed',
  VINE: '🍇 Vine', HERB: '🌿 Herb', TREE: '🌳 Tree', BERRY_BUSH: '🫐 Berry Bush',
}

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
  fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none', borderRadius: 8,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11,
  fontWeight: 700, color: '#4a3820', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: 5,
}

// ── Helpers ────────────────────────────────────────────────────────
function bedLabel(val: string) {
  return BED_TYPES.find(b => b.value === val) ?? { icon: '🪴', label: val }
}

function displayName(plant: YardPlant) {
  return plant.name || plant.plantType?.name || 'Plant'
}

function computeStage(plant: YardPlant): number {
  if (plant.harvestStatus) return 6
  if (!plant.isAutoGrowth || !plant.plantType?.autoGrowthDays || !plant.datePlanted)
    return Math.min(6, Math.max(1, plant.growthStage))
  const days = (Date.now() - new Date(plant.datePlanted).getTime()) / 86400000
  return Math.min(6, Math.max(1, Math.floor(days / plant.plantType.autoGrowthDays) + 1))
}

function daysUntilHarvest(plant: YardPlant): number | null {
  if (!plant.plantType?.daysToHarvest || !plant.datePlanted) return null
  return Math.round((new Date(plant.datePlanted).getTime() + plant.plantType.daysToHarvest * 86400000 - Date.now()) / 86400000)
}

function getStageImage(pt: PlantType | null, stage: number): string | null {
  if (!pt) return null
  return (pt[`stage${stage}Image` as keyof PlantType] as string | null) || null
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file) })
}

// ── BedTypePicker ──────────────────────────────────────────────────
function BedTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {BED_TYPES.map(b => (
        <button key={b.value} type="button" onClick={() => onChange(b.value)}
          style={{
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: value === b.value ? 700 : 400,
            border: `2px solid ${value === b.value ? 'rgba(200,155,60,0.7)' : 'rgba(200,155,60,0.2)'}`,
            background: value === b.value ? 'rgba(200,155,60,0.14)' : 'transparent',
            color: value === b.value ? S.text1 : S.text3,
          }}>
          {b.icon} {b.label}
        </button>
      ))}
    </div>
  )
}

// ── PlantStageIcon — animated SVG plant, category-aware stages 3-6 ─
const PC = {
  stem:'#4a8a18', l1:'#6bcf40', l2:'#3aaa20', l3:'#88e060',
  trunk:'#7a4a18', trunkDk:'#5a3010',
  soil:'rgba(60,30,8,0.32)',
}
function PlantStageIcon({ stage, delay=0, icon='🌱', category='RAISED_BED' }: {
  stage: number; delay?: number; icon?: string; category?: string;
}) {
  const sw: React.CSSProperties = {
    display: 'block',
    animation: `plant-sway ${1.7 + stage * 0.14}s ${delay}s ease-in-out infinite`,
    transformOrigin: '50% 100%',
  }

  // ── Stage 1: Seedling (same for all) ───────────────────────────
  if (stage === 1) return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
      <ellipse cx="21" cy="41" rx="6" ry="2" fill={PC.soil}/>
      <path d="M21 40 C21 35 20.5 29 21 25" stroke={PC.stem} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="14" cy="32" rx="8.5" ry="4" fill={PC.l1} transform="rotate(-38 14 32)"/>
      <ellipse cx="28" cy="29" rx="8.5" ry="4" fill={PC.l2} transform="rotate(38 28 29)"/>
      <ellipse cx="21" cy="24.5" rx="4.5" ry="3.5" fill={PC.l3}/>
      <ellipse cx="21" cy="22.5" rx="2.5" ry="2" fill="#c8f8a0"/>
    </svg>
  )

  // ── Stage 2: Sapling (same for all) ────────────────────────────
  if (stage === 2) return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
      <ellipse cx="21" cy="41" rx="7" ry="2" fill={PC.soil}/>
      <path d="M21 40 C21 32 20.5 22 21 17" stroke={PC.stem} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="12.5" cy="35" rx="9" ry="4.5" fill={PC.l1} transform="rotate(-38 12.5 35)"/>
      <ellipse cx="29.5" cy="32" rx="9" ry="4.5" fill={PC.l2} transform="rotate(38 29.5 32)"/>
      <ellipse cx="12" cy="26.5" rx="8.5" ry="4" fill={PC.l3} transform="rotate(-30 12 26.5)"/>
      <ellipse cx="30" cy="23.5" rx="8.5" ry="4" fill={PC.l1} transform="rotate(30 30 23.5)"/>
      <ellipse cx="21" cy="16.5" rx="5" ry="4" fill={PC.l3}/>
      <ellipse cx="21" cy="14" rx="3" ry="2.5" fill="#b8f890"/>
    </svg>
  )

  // ── Stages 3-6: category-specific shapes + plant emoji ─────────
  const cat = (category || 'RAISED_BED').toUpperCase()
  // emoji scales up with stage; glow circle behind it on stage 6
  const ePx = stage === 3 ? 11 : stage === 4 ? 14 : stage === 5 ? 18 : 22
  const glow = stage === 6

  // ── HERB (basil, mint, rosemary, thyme…) — low dense bush ──────
  if (cat === 'HERB') {
    const top = stage === 3 ? 24 : stage === 4 ? 20 : stage === 5 ? 17 : 15
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
        <ellipse cx="21" cy="41" rx="8" ry="2" fill={PC.soil}/>
        <ellipse cx="21" cy={top+12} rx="14" ry="7"  fill={PC.l2}/>
        <ellipse cx="21" cy={top+6}  rx="13" ry="8"  fill={PC.l1}/>
        <ellipse cx="12" cy={top+4}  rx="8"  ry="7"  fill={PC.l3}/>
        <ellipse cx="30" cy={top+4}  rx="8"  ry="7"  fill={PC.l2}/>
        <ellipse cx="21" cy={top}    rx="9"  ry="7"  fill={PC.l1}/>
        <ellipse cx="8"  cy={top+7}  rx="5"  ry="3.5" fill={PC.l3} transform={`rotate(-25 8 ${top+7})`}/>
        <ellipse cx="34" cy={top+7}  rx="5"  ry="3.5" fill={PC.l3} transform={`rotate(25 34 ${top+7})`}/>
        {glow && <circle cx="21" cy={top-1} r="9" fill="rgba(240,192,0,0.25)"/>}
        <text x="21" y={top-1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:ePx,userSelect:'none'}}>{icon}</text>
      </svg>
    )
  }

  // ── VINE (grape, cucumber, bean…) — climbing stem + tendrils ───
  if (cat === 'VINE') {
    const fruitY = stage === 3 ? 13 : stage === 4 ? 10 : stage === 5 ? 9 : 8
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
        <ellipse cx="21" cy="41" rx="6" ry="2" fill={PC.soil}/>
        <line x1="21" y1="40" x2="21" y2="5" stroke="#9a6428" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.4"/>
        <path d="M21 40 C19 33 23 26 20 19 C18 13 22 9 21 6" stroke={PC.stem} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="12" cy="34" rx="8.5" ry="4"   fill={PC.l1} transform="rotate(-38 12 34)"/>
        <ellipse cx="30" cy="28" rx="8.5" ry="4"   fill={PC.l2} transform="rotate(38 30 28)"/>
        <ellipse cx="11" cy="22" rx="8"   ry="3.5" fill={PC.l3} transform="rotate(-30 11 22)"/>
        <ellipse cx="31" cy="16" rx="8"   ry="3.5" fill={PC.l1} transform="rotate(30 31 16)"/>
        <path d="M21 32 C26 29 29 31 28 28" stroke={PC.stem} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55"/>
        <path d="M21 22 C16 19 14 21 15 18" stroke={PC.stem} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55"/>
        {glow && <circle cx="30" cy={fruitY+4} r="9" fill="rgba(240,192,0,0.22)"/>}
        <text x="30" y={fruitY+4} textAnchor="middle" dominantBaseline="middle" style={{fontSize:ePx,userSelect:'none'}}>{icon}</text>
      </svg>
    )
  }

  // ── TREE (apple, lemon, avocado…) — trunk + round canopy ───────
  if (cat === 'TREE') {
    const trunkTop = stage === 3 ? 28 : stage === 4 ? 24 : stage === 5 ? 21 : 19
    const cr = stage === 3 ? 10 : stage === 4 ? 12 : stage === 5 ? 14 : 15
    const cy = trunkTop - cr + 5
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
        <ellipse cx="21" cy="41" rx="7" ry="2" fill={PC.soil}/>
        <rect x="18.5" y={trunkTop} width="5"   height={41-trunkTop} rx="2.5" fill={PC.trunk}/>
        <rect x="20"   y={trunkTop} width="2.5" height={41-trunkTop} rx="1.5" fill={PC.trunkDk} opacity="0.4"/>
        <circle cx="21"  cy={cy+2}  r={cr}           fill={PC.l2}/>
        <circle cx="13"  cy={cy+5}  r={cr*0.72}      fill={PC.l1}/>
        <circle cx="29"  cy={cy+5}  r={cr*0.72}      fill={PC.l3}/>
        <circle cx="21"  cy={cy-2}  r={cr*0.85}      fill={PC.l1}/>
        {glow && <circle cx="21" cy={cy} r={cr*0.55} fill="rgba(240,192,0,0.28)"/>}
        <text x="21" y={cy} textAnchor="middle" dominantBaseline="middle" style={{fontSize:ePx,userSelect:'none'}}>{icon}</text>
      </svg>
    )
  }

  // ── BERRY_BUSH (blueberry, strawberry, raspberry…) — round bush ─
  if (cat === 'BERRY_BUSH') {
    const bTop = stage === 3 ? 25 : stage === 4 ? 21 : stage === 5 ? 18 : 16
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
        <ellipse cx="21" cy="41" rx="9" ry="2" fill={PC.soil}/>
        <path d="M15 40 C14 36 13 31 13 27" stroke={PC.stem} strokeWidth="2"   strokeLinecap="round" fill="none"/>
        <path d="M21 40 C21 35 21 29 21 25"  stroke={PC.stem} strokeWidth="2"   strokeLinecap="round" fill="none"/>
        <path d="M27 40 C28 36 29 31 29 27" stroke={PC.stem} strokeWidth="2"   strokeLinecap="round" fill="none"/>
        <circle cx="21"  cy={bTop+6}  r="12" fill={PC.l2}/>
        <circle cx="12"  cy={bTop+7}  r="8"  fill={PC.l1}/>
        <circle cx="30"  cy={bTop+7}  r="8"  fill={PC.l3}/>
        <circle cx="21"  cy={bTop}    r="10" fill={PC.l1}/>
        <circle cx="8"   cy={bTop+3}  r="6"  fill={PC.l3}/>
        <circle cx="34"  cy={bTop+3}  r="6"  fill={PC.l2}/>
        {/* stage 3: generic berry dots; stages 4+ show actual emoji */}
        {stage === 3 && <>
          <circle cx="15" cy={bTop+1}  r="2.5" fill="#d04060"/>
          <circle cx="27" cy={bTop+3}  r="2.5" fill="#9030b0"/>
          <circle cx="21" cy={bTop-3}  r="2.5" fill="#d04060"/>
        </>}
        {glow && <circle cx="21" cy={bTop+1} r="9" fill="rgba(240,192,0,0.25)"/>}
        {stage >= 4 && <text x="21" y={bTop+1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:ePx,userSelect:'none'}}>{icon}</text>}
      </svg>
    )
  }

  // ── DEFAULT: RAISED_BED / POTTED (tomato, pepper, squash…) ─────
  const sTop = stage === 3 ? 14 : stage === 4 ? 11 : stage === 5 ? 9 : 8
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={sw}>
      <ellipse cx="21" cy="41" rx="8" ry="2" fill={PC.soil}/>
      <path d={`M21 40 C21 30 20.5 ${sTop+9} 21 ${sTop}`} stroke={PC.stem} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="11"   cy="35"   rx="9"   ry="4"   fill={PC.l2} transform="rotate(-38 11 35)"/>
      <ellipse cx="31"   cy="32"   rx="9"   ry="4"   fill={PC.l1} transform="rotate(38 31 32)"/>
      <ellipse cx="10.5" cy="26"   rx="8.5" ry="3.5" fill={PC.l3} transform="rotate(-30 10.5 26)"/>
      <ellipse cx="31.5" cy="23"   rx="8.5" ry="3.5" fill={PC.l1} transform="rotate(30 31.5 23)"/>
      {stage >= 4 && <>
        <ellipse cx="11"  cy="18" rx="8"   ry="3.5" fill={PC.l2} transform="rotate(-25 11 18)"/>
        <ellipse cx="31"  cy="15" rx="8"   ry="3.5" fill={PC.l3} transform="rotate(25 31 15)"/>
      </>}
      {/* stage 3: top leaf crown instead of emoji */}
      {stage === 3 && <>
        <ellipse cx="21" cy={sTop+2}  rx="7"   ry="5.5" fill={PC.l1}/>
        <ellipse cx="14" cy={sTop+4}  rx="5"   ry="3"   fill={PC.l3} transform={`rotate(-22 14 ${sTop+4})`}/>
        <ellipse cx="28" cy={sTop+4}  rx="5"   ry="3"   fill={PC.l2} transform={`rotate(22 28 ${sTop+4})`}/>
      </>}
      {glow && stage >= 4 && <circle cx="21" cy={sTop+1} r="10" fill="rgba(240,192,0,0.28)"/>}
      {stage >= 4 && <text x="21" y={sTop+1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:ePx,userSelect:'none'}}>{icon}</text>}
    </svg>
  )
}

// ── PlantPopup ─────────────────────────────────────────────────────
function PlantPopup({ plant, isAdmin, onClose, onUpdate, onDelete }: {
  plant: YardPlant; isAdmin: boolean
  onClose: () => void; onUpdate: (p: YardPlant) => void; onDelete: (id: string) => void
}) {
  const stage = computeStage(plant)
  const info  = STAGES[stage - 1]
  const img   = getStageImage(plant.plantType, stage)
  const daysUntil = daysUntilHarvest(plant)
  const initPhotos = (() => { try { return JSON.parse(plant.photos) as string[] } catch { return [] } })()
  const bed = bedLabel(plant.bedType)

  const [editMode, setEditMode]           = useState(false)
  const [editStage, setEditStage]         = useState(plant.growthStage)
  const [editNotes, setEditNotes]         = useState(plant.notes ?? '')
  const [editHarvested, setEditHarvested] = useState(plant.harvestStatus)
  const [localPhotos, setLocalPhotos]     = useState<string[]>(initPhotos)
  const [lightbox, setLightbox]           = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/garden/yard-plants/${plant.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ growthStage: editStage, notes: editNotes, harvestStatus: editHarvested, photos: localPhotos }),
    })
    if (res.ok) { onUpdate(await res.json()); setEditMode(false) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${displayName(plant)}" from the garden?`)) return
    setDeleting(true)
    if ((await fetch(`/api/garden/yard-plants/${plant.id}`, { method: 'DELETE' })).ok) onDelete(plant.id)
    setDeleting(false)
  }

  async function savePhotos(photos: string[]) {
    await fetch(`/api/garden/yard-plants/${plant.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos }),
    })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 3_000_000) { alert('Max 3 MB'); return }
    setUploading(true)
    setLocalPhotos(p => { const next = [...p, '']; return next })
    const b64 = await toBase64(file)
    setLocalPhotos(p => {
      const next = [...p]; next[next.length - 1] = b64
      savePhotos(next.filter(Boolean))
      return next
    })
    setUploading(false); e.target.value = ''
  }

  function handleRemovePhoto(i: number) {
    setLocalPhotos(p => {
      const next = p.filter((_, j) => j !== i)
      savePhotos(next)
      return next
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="garden-popup-header" style={{ display: 'flex', gap: 16, padding: '20px 20px 16px', borderBottom: '1px solid rgba(200,155,60,0.12)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, background: 'radial-gradient(ellipse at 50% 30%, #fffbf0, #e8d4a0)', border: `3px solid ${info.color}`, boxShadow: `0 0 20px ${info.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {img ? <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : <span style={{ fontSize: 40 }}>{plant.plantType?.icon ?? '🌱'}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 800, color: S.text1, margin: 0, lineHeight: 1.2 }}>{displayName(plant)}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {plant.plantType && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>{plant.plantType.name}</span>}
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'rgba(90,160,60,0.12)', border: '1px solid rgba(90,160,60,0.3)', color: '#7bcf5a', padding: '1px 8px', borderRadius: 20 }}>
                {bed.icon} {bed.label}
              </span>
            </div>
            {plant.harvestStatus && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#60d860', marginTop: 4, display: 'block' }}>✅ Harvested!</span>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, alignSelf: 'flex-start' }}>✕</button>
        </div>

        <div className="garden-popup-body" style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stage bar */}
          <div>
            <div style={labelStyle}>Growth Stage</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {STAGES.map((s, i) => (
                <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: '100%', height: 7, borderRadius: 4, background: i < stage ? s.color : 'rgba(200,155,60,0.1)', boxShadow: i + 1 === stage ? `0 0 8px ${s.glow}` : undefined }} />
                  {i + 1 === stage && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: s.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.emoji} {s.label}</span>}
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3, marginTop: 5 }}>
              Stage {stage} of 6{plant.isAutoGrowth && <span style={{ color: S.text4, marginLeft: 6 }}>· auto-growing</span>}
            </div>
          </div>

          {/* Info grid */}
          <div className="garden-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { icon: '📅', label: 'Date Planted', value: fmtDate(plant.datePlanted) },
              { icon: '⏳', label: 'Days to Harvest', value: plant.harvestStatus ? '✅ Done!' : daysUntil === null ? '—' : daysUntil < 0 ? 'Harvest now!' : daysUntil === 0 ? 'Today!' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}` },
              plant.plantType?.waterNeeds ? { icon: '💧', label: 'Watering', value: plant.plantType.waterNeeds } : null,
              plant.plantType?.sunNeeds   ? { icon: '☀️', label: 'Sunlight',  value: plant.plantType.sunNeeds  } : null,
            ] as ({ icon: string; label: string; value: string } | null)[]).filter(Boolean).map(s => s && (
              <div key={s.label} style={{ background: '#1c1610', border: '1px solid rgba(200,155,60,0.1)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>{s.icon} {s.label}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: S.text1, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {plant.plantType?.careInstructions && <div><div style={labelStyle}>Care Instructions</div><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0 }}>{plant.plantType.careInstructions}</p></div>}
          {plant.plantType?.description && <div><div style={labelStyle}>About This Plant</div><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0 }}>{plant.plantType.description}</p></div>}

          {/* Photos — always visible; admin can add/remove inline */}
          {(localPhotos.length > 0 || isAdmin) && (
            <div>
              <div style={labelStyle}>Photos</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {localPhotos.map((src, i) => (
                  <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                    {src
                      ? <img src={src} alt="" onClick={() => setLightbox(src)}
                          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(200,155,60,0.2)', display: 'block', cursor: 'zoom-in' }} />
                      : <div style={{ width: 90, height: 90, borderRadius: 10, background: '#1c1610', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>}
                    {isAdmin && src && (
                      <button type="button" onClick={() => handleRemovePhoto(i)}
                        style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(180,50,50,0.85)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: '20px', textAlign: 'center' }}>✕</button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <>
                    <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
                      style={{ width: 90, height: 90, borderRadius: 10, border: '2px dashed rgba(200,155,60,0.3)', background: 'transparent', color: S.text4, cursor: uploading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                      <span style={{ fontSize: 24 }}>📷</span>{uploading ? '…' : 'Add Photo'}
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                  </>
                )}
              </div>
            </div>
          )}

          {!editMode && plant.notes && <div><div style={labelStyle}>Notes</div><p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{plant.notes}</p></div>}

          {/* Admin edit */}
          {isAdmin && editMode && (
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>✏️ EDIT PLANT</div>
              <div><label style={labelStyle}>Growth Stage</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGES.map(s => (
                    <button key={s.n} type="button" onClick={() => setEditStage(s.n)}
                      style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, border: `2px solid ${editStage === s.n ? s.color : 'rgba(200,155,60,0.2)'}`, background: editStage === s.n ? `${s.color}22` : 'transparent', color: editStage === s.n ? s.color : S.text3 }}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={editHarvested} onChange={e => setEditHarvested(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2 }}>Mark as Harvested ✅</span>
              </label>
              <div><label style={labelStyle}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Admin buttons */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid rgba(200,155,60,0.12)', paddingTop: 14 }}>
              {!editMode ? (
                <>
                  <button onClick={() => setEditMode(true)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(200,155,60,0.3)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>✏️ Edit</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(180,50,50,0.4)', color: '#c06060', fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>{deleting ? 'Removing…' : '🗑 Remove'}</button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: saving ? 'rgba(200,155,60,0.2)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: saving ? S.text4 : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', borderRadius: 8 }}>{saving ? 'Saving…' : '💾 Save'}</button>
                  <button onClick={() => { setEditMode(false); setEditStage(plant.growthStage); setEditNotes(plant.notes ?? ''); setEditHarvested(plant.harvestStatus); setLocalPhotos(initPhotos) }}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>Cancel</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 8px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 20, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </div>
  )
}

// ── AddPlantModal ──────────────────────────────────────────────────
function AddPlantModal({ plantTypes, onClose, onAdd }: { plantTypes: PlantType[]; onClose: () => void; onAdd: (p: YardPlant) => void }) {
  const [bedType,     setBedType]     = useState('RAISED_BED')
  const [plantTypeId, setPlantTypeId] = useState('')
  const [growthStage, setGrowthStage] = useState(1)
  const [datePlanted, setDatePlanted] = useState('')
  const [notes,       setNotes]       = useState('')
  const [isAutoGrowth,setAutoGrowth]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')

  const selectedType = plantTypes.find(t => t.id === plantTypeId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) { setErr('Choose a plant type.'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/garden/yard-plants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedType.name, bedType, plantTypeId, growthStage, xPos: 50, yPos: 50, datePlanted, notes, isAutoGrowth }),
    })
    if (res.ok) { onAdd((await res.json()).plant); onClose() }
    else { setErr('Failed to add plant.'); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <form onSubmit={handleSubmit} style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold }}>🌱 ADD PLANT TO YARD</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: S.text4, marginBottom: 16, lineHeight: 1.6 }}>
          The plant will be placed in the center of the yard. <strong style={{ color: S.text3 }}>Drag it into position</strong> after adding.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bed Type */}
          <div>
            <label style={labelStyle}>Bed Type *</label>
            <BedTypePicker value={bedType} onChange={setBedType} />
          </div>

          {/* Plant Type */}
          <div>
            <label style={labelStyle}>Plant</label>
            <select value={plantTypeId} onChange={e => setPlantTypeId(e.target.value)} style={inputStyle}>
              <option value="">— Select a plant —</option>
              {plantTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Growth stage */}
          <div>
            <label style={labelStyle}>Starting Growth Stage</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {STAGES.map(s => (
                <button key={s.n} type="button" onClick={() => setGrowthStage(s.n)}
                  style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, border: `2px solid ${growthStage === s.n ? s.color : 'rgba(200,155,60,0.2)'}`, background: growthStage === s.n ? `${s.color}22` : 'transparent', color: growthStage === s.n ? s.color : S.text3 }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-grow */}
          {selectedType?.autoGrowthDays && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isAutoGrowth} onChange={e => setAutoGrowth(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>Auto-grow (1 stage every {selectedType.autoGrowthDays} days)</span>
            </label>
          )}

          {/* Date planted */}
          <div>
            <label style={labelStyle}>Date Planted</label>
            <input type="date" value={datePlanted} onChange={e => setDatePlanted(e.target.value)} style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Variety, source, observations…" />
          </div>

          {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c06060' }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8 }}>Cancel</button>
            <button type="submit" disabled={saving || !selectedType}
              style={{ padding: '10px 22px', background: (saving || !selectedType) ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: (saving || !selectedType) ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: (saving || !selectedType) ? 'not-allowed' : 'pointer', borderRadius: 8 }}>
              {saving ? 'Planting…' : '🌱 Plant It'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── EditPlantModal ─────────────────────────────────────────────────
function EditPlantModal({ plant, plantTypes, onClose, onSave }: { plant: YardPlant; plantTypes: PlantType[]; onClose: () => void; onSave: (p: YardPlant) => void }) {
  const [bedType,     setBedType]  = useState(plant.bedType || 'RAISED_BED')
  const [plantTypeId, setTypeId]   = useState(plant.plantTypeId ?? '')
  const [datePlanted, setDate]     = useState(plant.datePlanted ? plant.datePlanted.slice(0, 10) : '')
  const [notes,       setNotes]    = useState(plant.notes ?? '')
  const [isAutoGrowth,setAuto]     = useState(plant.isAutoGrowth)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const selectedType = plantTypes.find(t => t.id === plantTypeId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await fetch(`/api/garden/yard-plants/${plant.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedType?.name || plant.name, bedType, plantTypeId: plantTypeId || null, datePlanted: datePlanted || null, notes, isAutoGrowth }),
    })
    if (res.ok) { onSave(await res.json()); onClose() }
    else { setErr('Failed to save.'); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <form onSubmit={handleSubmit} style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>✏️ EDIT PLANT</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Bed Type</label><BedTypePicker value={bedType} onChange={setBedType} /></div>
          <div><label style={labelStyle}>Plant</label>
            <select value={plantTypeId} onChange={e => setTypeId(e.target.value)} style={inputStyle}>
              <option value="">— No type —</option>
              {plantTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Date Planted</label><input type="date" value={datePlanted} onChange={e => setDate(e.target.value)} style={inputStyle} /></div>
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
            <button type="submit" disabled={saving} style={{ padding: '10px 22px', background: saving ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: saving ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', borderRadius: 8 }}>{saving ? 'Saving…' : '💾 Save'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── PlantTypeForm ──────────────────────────────────────────────────
function PlantTypeForm({ initial, onClose, onSave }: { initial?: PlantType; onClose: () => void; onSave: (t: PlantType) => void }) {
  const [name,             setName]       = useState(initial?.name ?? '')
  const [category,         setCategory]   = useState(initial?.category ?? 'POTTED')
  const [icon,             setIcon]       = useState(initial?.icon ?? '🌱')
  const [description,      setDesc]       = useState(initial?.description ?? '')
  const [careInstructions, setCare]       = useState(initial?.careInstructions ?? '')
  const [waterNeeds,       setWater]      = useState(initial?.waterNeeds ?? '')
  const [sunNeeds,         setSun]        = useState(initial?.sunNeeds ?? '')
  const [daysToHarvest,    setDaysH]      = useState(initial?.daysToHarvest?.toString() ?? '')
  const [autoGrowthDays,   setAutoG]      = useState(initial?.autoGrowthDays?.toString() ?? '')
  const [stageImgs, setStageImgs] = useState<string[]>([
    initial?.stage1Image ?? '', initial?.stage2Image ?? '', initial?.stage3Image ?? '',
    initial?.stage4Image ?? '', initial?.stage5Image ?? '', initial?.stage6Image ?? '',
  ])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const ir1 = useRef<HTMLInputElement>(null); const ir2 = useRef<HTMLInputElement>(null)
  const ir3 = useRef<HTMLInputElement>(null); const ir4 = useRef<HTMLInputElement>(null)
  const ir5 = useRef<HTMLInputElement>(null); const ir6 = useRef<HTMLInputElement>(null)
  const imgRefs = [ir1, ir2, ir3, ir4, ir5, ir6]

  async function handleImg(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2_000_000) { alert('Max 2 MB'); return }
    const b64 = await toBase64(file)
    setStageImgs(p => { const n = [...p]; n[idx] = b64; return n })
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const url = initial ? `/api/garden/plant-types/${initial.id}` : '/api/garden/plant-types'
    const res = await fetch(url, {
      method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, icon, description, careInstructions, waterNeeds, sunNeeds, daysToHarvest, autoGrowthDays, stage1Image: stageImgs[0] || null, stage2Image: stageImgs[1] || null, stage3Image: stageImgs[2] || null, stage4Image: stageImgs[3] || null, stage5Image: stageImgs[4] || null, stage6Image: stageImgs[5] || null }),
    })
    if (res.ok) { onSave(await res.json()); onClose() }
    else { setErr('Failed to save.'); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <form onSubmit={handleSubmit} className="garden-popup-form" style={{ background: '#16120e', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: '22px 22px 20px', boxShadow: '0 12px 50px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>{initial ? '✏️ EDIT PLANT TYPE' : '🌿 NEW PLANT TYPE'}</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text4, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div><label style={labelStyle}>Name *</label><input required value={name} onChange={e => setName(e.target.value)} maxLength={80} style={inputStyle} /></div>
            <div><label style={labelStyle}>Icon</label><input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} style={{ ...inputStyle, fontSize: 22, textAlign: 'center' }} /></div>
          </div>
          <div><label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {CATEGORY_OPTS.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, border: `2px solid ${category === c ? 'rgba(200,155,60,0.7)' : 'rgba(200,155,60,0.2)'}`, background: category === c ? 'rgba(200,155,60,0.12)' : 'transparent', color: category === c ? S.text1 : S.text3, fontWeight: category === c ? 700 : 400 }}>{CATEGORY_LABELS[c]}</button>
              ))}
            </div>
          </div>
          <div className="garden-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Days to Harvest</label><input type="number" min={1} max={999} value={daysToHarvest} onChange={e => setDaysH(e.target.value)} placeholder="e.g. 75" style={inputStyle} /></div>
            <div><label style={labelStyle}>Days per Growth Stage</label><input type="number" min={1} max={365} value={autoGrowthDays} onChange={e => setAutoG(e.target.value)} placeholder="e.g. 12 (auto)" style={inputStyle} /></div>
          </div>
          <div className="garden-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>💧 Water Needs</label><input value={waterNeeds} onChange={e => setWater(e.target.value)} placeholder="e.g. Every 2-3 days" style={inputStyle} /></div>
            <div><label style={labelStyle}>☀️ Sun Needs</label>
              <select value={sunNeeds} onChange={e => setSun(e.target.value)} style={inputStyle}>
                <option value="">— pick one —</option>
                {SUN_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Description</label><textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div><label style={labelStyle}>Care Instructions</label><textarea value={careInstructions} onChange={e => setCare(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div>
            <div style={labelStyle}>Growth Stage Images</div>
            <div className="garden-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {STAGES.map((s, i) => (
                <div key={s.n}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: S.text3, marginBottom: 4 }}>{s.emoji} {s.label}</div>
                  {stageImgs[i]
                    ? <div style={{ position: 'relative' }}>
                        <img src={stageImgs[i]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 8, background: '#1c1610', border: '1px solid rgba(200,155,60,0.2)', display: 'block' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4, alignItems: 'flex-end', justifyContent: 'center', padding: 4 }}>
                          <button type="button" onClick={() => imgRefs[i].current?.click()} style={{ flex: 1, padding: '3px 0', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ddd', fontSize: 9, borderRadius: 4, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Change</button>
                          <button type="button" onClick={() => setStageImgs(p => { const n = [...p]; n[i] = ''; return n })} style={{ padding: '3px 6px', background: 'rgba(180,50,50,0.75)', border: 'none', color: '#fff', fontSize: 9, borderRadius: 4, cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    : <button type="button" onClick={() => imgRefs[i].current?.click()} style={{ width: '100%', aspectRatio: '1', borderRadius: 8, border: '2px dashed rgba(200,155,60,0.25)', background: 'transparent', color: S.text4, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 20 }}>
                        <span>{s.emoji}</span><span style={{ fontSize: 9 }}>Upload</span>
                      </button>
                  }
                  <input ref={imgRefs[i]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImg(i, e)} />
                </div>
              ))}
            </div>
          </div>
          {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c06060' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8 }}>Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} style={{ padding: '10px 22px', background: (saving || !name.trim()) ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: (saving || !name.trim()) ? 'rgba(200,155,60,0.35)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', borderRadius: 8 }}>{saving ? 'Saving…' : initial ? '💾 Save' : '🌿 Create'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Main GardenYard ────────────────────────────────────────────────
interface DragState {
  id: string
  startX: number; startY: number
  origX: number;  origY: number
  moved: boolean
}

export default function GardenYard({ initialPlants, initialTypes, isAdmin }: {
  initialPlants: YardPlant[]; initialTypes: PlantType[]; isAdmin: boolean
}) {
  const router = useRouter()
  const [plants,      setPlants]    = useState<YardPlant[]>(initialPlants)
  const [types,       setTypes]     = useState<PlantType[]>(initialTypes)
  const [selected,    setSelected]  = useState<YardPlant | null>(null)
  const [showAdd,     setShowAdd]   = useState(false)
  const [editingPlant,setEditPlant] = useState<YardPlant | null>(null)
  const [adminOpen,   setAdminOpen] = useState(false)
  const [adminTab,    setAdminTab]  = useState<'plants' | 'types'>('plants')
  const [typeForm,    setTypeForm]  = useState<PlantType | null | 'new'>(null)
  const [deletingType,setDelType]   = useState<string | null>(null)
  const [saving,      setSaving]    = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Drag state — all refs so window handlers don't go stale
  const yardRef    = useRef<HTMLDivElement>(null)
  const dragRef    = useRef<DragState | null>(null)
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)
  const [dragPos,  setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  // Wire up global mouse/touch drag listeners
  useEffect(() => {
    if (!isAdmin) return

    function move(clientX: number, clientY: number) {
      const d = dragRef.current; if (!d) return
      const dx = clientX - d.startX
      const dy = clientY - d.startY
      if (!d.moved && Math.sqrt(dx * dx + dy * dy) < 6) return
      dragRef.current = { ...d, moved: true }
      if (!yardRef.current) return
      const rect = yardRef.current.getBoundingClientRect()
      const x = Math.min(95, Math.max(5, d.origX + (dx / rect.width)  * 100))
      const y = Math.min(90, Math.max(5, d.origY + (dy / rect.height) * 100))
      dragPosRef.current = { x, y }
      setDragPos({ id: d.id, x, y })
    }

    async function up() {
      const d   = dragRef.current
      const pos = dragPosRef.current
      dragRef.current    = null
      dragPosRef.current = null
      setDragPos(null)
      if (!d?.moved || !pos) return
      setSaving(true)
      const res = await fetch(`/api/garden/yard-plants/${d.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xPos: pos.x, yPos: pos.y }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPlants(p => p.map(x => x.id === updated.id ? updated : x))
      }
      setSaving(false)
    }

    function onMouseMove(e: MouseEvent)  { move(e.clientX, e.clientY) }
    function onTouchMove(e: TouchEvent)  { if (e.touches[0]) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY) } }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   up)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend',  up)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend',  up)
    }
  }, [isAdmin])

  function startDrag(e: React.MouseEvent | React.TouchEvent, plant: YardPlant) {
    if (!isAdmin) return
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragRef.current = { id: plant.id, startX: clientX, startY: clientY, origX: plant.xPos, origY: plant.yPos, moved: false }
  }

  function handlePlantClick(plant: YardPlant) {
    // Only open popup if we didn't drag
    if (dragRef.current?.moved) return
    if (!dragRef.current || !dragRef.current.moved) setSelected(plant)
  }

  function handlePlantUpdate(updated: YardPlant) {
    setPlants(p => p.map(x => x.id === updated.id ? updated : x))
    setSelected(updated)
  }

  function handlePlantDelete(id: string) {
    setPlants(p => p.filter(x => x.id !== id))
    setSelected(null)
    router.refresh()
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this plant type?')) return
    setDelType(id)
    if ((await fetch(`/api/garden/plant-types/${id}`, { method: 'DELETE' })).ok) setTypes(t => t.filter(x => x.id !== id))
    setDelType(null)
  }

  const isDragging   = dragPos !== null
  const harvestCount = plants.filter(p => p.harvestStatus).length
  const growingCount = plants.filter(p => !p.harvestStatus).length

  return (
    <>
      <div style={isFullscreen ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0d0d14', display: 'flex', flexDirection: 'column',
      } : { display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Yard ──────────────────────────────────────── */}
        <div
          ref={yardRef}
          style={{
            position: 'relative', width: '100%',
            ...(isFullscreen
              ? { flex: 1, minHeight: 0 }
              : { aspectRatio: '16/9', minHeight: 200 }),
            borderRadius: isFullscreen ? 0 : '16px 16px 0 0', overflow: 'hidden',
            background: '#1a4a10',
            border: isFullscreen ? 'none' : '5px solid #6b4020', borderBottom: 'none',
            boxShadow: '0 0 0 1px rgba(200,155,60,0.15)',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          {/* ── Fullscreen toggle button ── */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Expand garden'}
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 50,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(200,155,60,0.3)', borderRadius: 7,
              color: '#c89b3c', fontSize: 14, cursor: 'pointer',
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, padding: 0,
            }}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
          {/* ── CSS Animations ── */}
          <style>{`
            @keyframes flutter {
              0%,100% { transform: translateY(0px) rotate(-8deg) scaleX(1); }
              35% { transform: translateY(-10px) rotate(10deg) scaleX(-1); }
              70% { transform: translateY(-4px) rotate(-4deg) scaleX(1); }
            }
            @keyframes flutter2 {
              0%,100% { transform: translateY(0px) rotate(6deg); }
              40% { transform: translateY(-14px) rotate(-9deg); }
              75% { transform: translateY(-6px) rotate(5deg); }
            }
            @keyframes beehover {
              0%,100% { transform: translate(0,0) rotate(0deg); }
              25% { transform: translate(7px,-5px) rotate(6deg); }
              50% { transform: translate(3px,-9px) rotate(-4deg); }
              75% { transform: translate(-5px,-4px) rotate(5deg); }
            }
            @keyframes sway {
              0%,100% { transform: rotate(-4deg) scale(1); }
              50% { transform: rotate(4deg) scale(1.06); }
            }
            @keyframes pond-ripple {
              0%,100% { transform: scale(1); opacity: 0.18; }
              50% { transform: scale(1.12); opacity: 0.38; }
            }
            @keyframes harvest-glow {
              0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(224,192,32,0.5); }
              50% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 36px rgba(224,192,32,0.85), 0 0 55px rgba(224,192,32,0.25); }
            }
            @keyframes plant-sway {
              0%,100% { transform: rotate(-5deg) scale(0.97); }
              50% { transform: rotate(5deg) scale(1.02); }
            }
          `}</style>

          {/* ── Sky ── */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'20%', background:'linear-gradient(180deg, #6aaed6 0%, #9ecde0 50%, #c0dda8 100%)', pointerEvents:'none', zIndex:0 }} />

          {/* ── Main grass ── */}
          <div style={{ position:'absolute', top:'18%', bottom:'13%', left:0, right:0, background:'linear-gradient(180deg, #5aaa3e 0%, #42902e 40%, #307020 80%, #266018 100%)', pointerEvents:'none', zIndex:0 }} />

          {/* ── Grass texture ── */}
          <div style={{ position:'absolute', top:'18%', bottom:'13%', left:0, right:0, background:'repeating-linear-gradient(92deg, transparent, transparent 22px, rgba(255,255,255,0.022) 22px, rgba(255,255,255,0.022) 44px)', pointerEvents:'none', zIndex:1 }} />

          {/* ── Light grass patches ── */}
          {[[12,30,16,8],[60,55,12,6],[82,38,10,7],[35,70,8,5],[50,25,14,7]].map(([l,t,w,h],i) => (
            <div key={i} style={{ position:'absolute', left:`${l}%`, top:`${t}%`, width:`${w}%`, height:`${h}%`, background:'rgba(110,200,70,0.1)', borderRadius:'50%', pointerEvents:'none', zIndex:1 }} />
          ))}

          {/* ── Stone path ── */}
          {[
            { l:'42%', t:'82%', w:'9%',   h:'6%',   r:14  },
            { l:'47%', t:'73%', w:'8%',   h:'5.5%', r:-10 },
            { l:'43%', t:'64%', w:'9.5%', h:'6%',   r:8   },
            { l:'46%', t:'55%', w:'8%',   h:'5%',   r:-12 },
            { l:'42%', t:'46%', w:'9%',   h:'6%',   r:5   },
            { l:'45%', t:'37%', w:'7.5%', h:'5%',   r:-8  },
          ].map((s,i) => (
            <div key={i} style={{ position:'absolute', left:s.l, top:s.t, width:s.w, height:s.h, background:'radial-gradient(ellipse at 40% 30%, #d0c8b8, #a09080)', borderRadius:'50%', transform:`rotate(${s.r}deg)`, boxShadow:'inset 0 2px 5px rgba(0,0,0,0.25), 0 2px 5px rgba(0,0,0,0.35)', pointerEvents:'none', zIndex:3 }} />
          ))}

          {/* ── Pond ── */}
          <div style={{ position:'absolute', left:'5%', top:'47%', width:'14%', paddingBottom:'10%', background:'radial-gradient(ellipse at 45% 38%, #5599cc, #1a3d88)', borderRadius:'50%', boxShadow:'inset 0 4px 14px rgba(0,0,60,0.5), 0 3px 12px rgba(0,0,0,0.45)', border:'2px solid rgba(100,170,220,0.45)', overflow:'hidden', pointerEvents:'none', zIndex:3 }}>
            <div style={{ position:'absolute', top:'12%', left:'18%', width:'65%', height:'22%', background:'rgba(255,255,255,0.14)', borderRadius:'50%', transform:'rotate(-18deg)', animation:'pond-ripple 3.5s infinite ease-in-out' }} />
            <div style={{ position:'absolute', top:'45%', left:'8%', width:'40%', height:'15%', background:'rgba(255,255,255,0.08)', borderRadius:'50%', animation:'pond-ripple 4.8s 1.2s infinite ease-in-out' }} />
            <span style={{ position:'absolute', bottom:'18%', right:'14%', fontSize:'min(2.8vw,18px)', lineHeight:1 }}>🪷</span>
            <span style={{ position:'absolute', top:'22%', left:'10%', fontSize:'min(1.5vw,11px)', lineHeight:1 }}>🐸</span>
          </div>

          {/* ── Rocks ── */}
          {[
            { l:'24%', t:'58%', w:'3.2%', pb:'2%'  },
            { l:'63%', t:'68%', w:'2.8%', pb:'1.8%' },
            { l:'82%', t:'43%', w:'3%',   pb:'1.9%' },
            { l:'18%', t:'72%', w:'2.4%', pb:'1.5%' },
          ].map((r,i) => (
            <div key={i} style={{ position:'absolute', left:r.l, top:r.t, width:r.w, paddingBottom:r.pb, background:`radial-gradient(ellipse at 38% 28%, #c0b8a8, ${i%2===0?'#807060':'#706858'})`, borderRadius:'50%', boxShadow:'0 2px 5px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.18)', pointerEvents:'none', zIndex:4 }} />
          ))}

          {/* ── Dirt strip ── */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'13%', background:'linear-gradient(180deg, #6b3e18 0%, #4e2c0e 100%)', borderTop:'2px solid #8b5228', pointerEvents:'none', zIndex:2 }} />

          {/* ── Wooden fence ── */}
          <div style={{ position:'absolute', bottom:'13%', left:0, right:0, height:'3.5%', background:'linear-gradient(180deg, #9b6838, #7a4e26)', pointerEvents:'none', zIndex:5 }}>
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={{ position:'absolute', bottom:0, left:`${(i / 17) * 100}%`, width:'4px', height:'220%', background:'linear-gradient(180deg, #b87a44, #6b4020)', borderRadius:'3px 3px 0 0', transform:'translateX(-50%)', boxShadow:'1px 0 3px rgba(0,0,0,0.3)' }} />
            ))}
          </div>

          {/* ── Butterflies ── */}
          {[
            { l:'22%', t:'27%', d:'0s',   dur:'4.8s', a:'flutter'  },
            { l:'57%', t:'31%', d:'1.6s', dur:'5.5s', a:'flutter2' },
            { l:'76%', t:'23%', d:'3s',   dur:'4.2s', a:'flutter'  },
          ].map((b,i) => (
            <span key={i} style={{ position:'absolute', left:b.l, top:b.t, fontSize:'min(2.5vw,18px)', pointerEvents:'none', zIndex:6, filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', animation:`${b.a} ${b.dur} ${b.d} infinite ease-in-out`, display:'inline-block', userSelect:'none' }}>🦋</span>
          ))}

          {/* ── Bee ── */}
          <span style={{ position:'absolute', left:'84%', top:'36%', fontSize:'min(2vw,15px)', pointerEvents:'none', zIndex:6, animation:'beehover 3.4s 0.5s infinite ease-in-out', display:'inline-block', userSelect:'none' }}>🐝</span>

          {/* ── Garden sign ── */}
          <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg, rgba(100,60,15,0.94), rgba(70,40,10,0.94))', border:'2px solid rgba(200,155,60,0.65)', borderRadius:8, padding:'6px 16px', whiteSpace:'nowrap', pointerEvents:'none', zIndex:20, boxShadow:'0 3px 14px rgba(0,0,0,0.55)' }}>
            <span style={{ fontFamily:"'Press Start 2P', monospace", fontSize:7, color:'#f0d070', letterSpacing:'0.14em', textShadow:'0 0 10px rgba(240,208,112,0.7)' }}>✨ ZEN GARDEN ✨</span>
          </div>

          {/* ── Admin drag hint ── */}
          {isAdmin && plants.length > 0 && !isDragging && (
            <div style={{ position:'absolute', bottom:'16%', right:10, background:'rgba(0,0,0,0.62)', color:'rgba(240,232,216,0.5)', fontFamily:'Inter, sans-serif', fontSize:10, padding:'4px 10px', borderRadius:6, pointerEvents:'none', backdropFilter:'blur(3px)', zIndex:20 }}>
              drag to reposition
            </div>
          )}

          {/* ── Saving indicator ── */}
          {saving && (
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(200,155,60,0.2)', border:'1px solid rgba(200,155,60,0.4)', color:S.gold, fontFamily:'Inter, sans-serif', fontSize:11, padding:'4px 10px', borderRadius:6, zIndex:20 }}>Saving…</div>
          )}

          {/* Plant nodes */}
          {plants.map(plant => {
            const stage    = computeStage(plant)
            const info     = STAGES[stage - 1]
            const img      = getStageImage(plant.plantType, stage)
            const isThisDragging = dragPos?.id === plant.id
            const xPct     = isThisDragging ? dragPos!.x : plant.xPos
            const yPct     = isThisDragging ? dragPos!.y : plant.yPos
            const dname    = displayName(plant)
            const bed      = bedLabel(plant.bedType)

            return (
              <div
                key={plant.id}
                style={{
                  position: 'absolute',
                  left: `${xPct}%`, top: `${yPct}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                  zIndex: isThisDragging ? 30 : 10,
                  cursor: isAdmin ? (isThisDragging ? 'grabbing' : 'grab') : 'pointer',
                  userSelect: 'none',
                  filter: isThisDragging ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.7))' : undefined,
                  transition: isThisDragging ? 'none' : 'left 0.1s, top 0.1s',
                }}
                onMouseDown={e => startDrag(e, plant)}
                onTouchStart={e => startDrag(e, plant)}
                onClick={() => handlePlantClick(plant)}
              >
                {/* Plant circle */}
                <div style={{ position:'relative' }}>
                  <div style={{
                    width: 56, height: 56,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    transform: isThisDragging ? 'scale(1.14)' : 'scale(1)',
                    transition: isThisDragging ? 'none' : 'transform 0.15s',
                  }}>
                    {img
                      ? <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                      : <PlantStageIcon stage={stage} delay={(plant.xPos % 10) * 0.2} icon={plant.plantType?.icon ?? '🌱'} category={plant.plantType?.category ?? 'RAISED_BED'} />}
                  </div>
                  {/* Stage badge */}
                  <div style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: `radial-gradient(circle at 40% 35%, ${info.color}ee, ${info.color}88)`,
                    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 6px rgba(0,0,0,0.55), 0 0 8px ${info.glow}`,
                    border: '1.5px solid rgba(0,0,0,0.3)',
                  }}>{info.emoji}</div>
                </div>
                {/* Stem */}
                <div style={{ width: 3, height: 9, background: 'linear-gradient(180deg, #5a9a28, #3a6010)', borderRadius: '0 0 2px 2px', marginTop: -1 }} />
                {/* Ground shadow */}
                <div style={{ width: 36, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.22)', filter: 'blur(3px)', marginTop: -2 }} />
                {/* Labels */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <div style={{ background: 'rgba(8,5,1,0.9)', color: '#f5eedc', fontSize: 9, padding: '2px 8px', borderRadius: 5, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', maxWidth: 98, overflow: 'hidden', textOverflow: 'ellipsis', backdropFilter: 'blur(4px)', boxShadow: '0 2px 6px rgba(0,0,0,0.65)', fontWeight: 700 }}>
                    {dname.length > 13 ? dname.slice(0, 13) + '…' : dname}
                  </div>
                  <div style={{ background: 'rgba(18,48,8,0.85)', color: '#90dd70', fontSize: 8, padding: '1px 7px', borderRadius: 4, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', backdropFilter: 'blur(3px)', fontWeight: 600 }}>
                    {bed.icon} {bed.label}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {plants.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none', zIndex: 20 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {['🌱','🌻','🌷','🌿','🍀'].map((e,i) => (
                  <span key={i} style={{ fontSize:'min(6vw,32px)', filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.6))', animation:`sway ${1.8+i*0.3}s ${i*0.4}s infinite ease-in-out`, display:'inline-block', transformOrigin:'bottom center', userSelect:'none' }}>{e}</span>
                ))}
              </div>
              <div style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', padding:'12px 24px', borderRadius:12, border:'1px solid rgba(200,155,60,0.35)', boxShadow:'0 4px 20px rgba(0,0,0,0.45)' }}>
                <div style={{ fontFamily:'Inter, sans-serif', fontSize:14, fontWeight:600, color:'rgba(240,232,216,0.92)', textAlign:'center' }}>
                  {isAdmin ? '✨ Add your first plant to get growing!' : '🌸 This garden is waiting to bloom'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer bar ─────────────────────────────────── */}
        <div style={{ background: '#16120e', border: '4px solid #5a3010', borderTop: '2px solid rgba(200,155,60,0.2)', borderRadius: '0 0 16px 16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {plants.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em' }}>{plants.length} {plants.length === 1 ? 'PLANT' : 'PLANTS'}</span>
              {growingCount > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5ab84a', background: 'rgba(90,184,74,0.1)', border: '1px solid rgba(90,184,74,0.25)', padding: '2px 10px', borderRadius: 20 }}>🌱 {growingCount} growing</span>}
              {harvestCount > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#60d860', background: 'rgba(96,216,96,0.1)', border: '1px solid rgba(96,216,96,0.25)', padding: '2px 10px', borderRadius: 20 }}>✅ {harvestCount} harvested</span>}
            </div>
          )}
          {plants.length === 0 && <div style={{ flex: 1 }} />}

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

        {/* ── Admin panel ────────────────────────────────── */}
        {isAdmin && adminOpen && (
          <div style={{ background: '#13100c', border: '1px solid rgba(200,155,60,0.18)', borderTop: 'none', borderRadius: '0 0 14px 14px', marginTop: -2 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,155,60,0.15)' }}>
              {(['plants', 'types'] as const).map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab)}
                  style={{ flex: 1, padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${adminTab === tab ? S.gold : 'transparent'}`, color: adminTab === tab ? S.gold : S.text3, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  {tab === 'plants' ? '🌱 YARD PLANTS' : '🌿 PLANT TYPES'}
                </button>
              ))}
            </div>

            {adminTab === 'plants' && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plants.length === 0
                  ? <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4, textAlign: 'center', padding: '20px 0' }}>No plants yet.</div>
                  : plants.map(plant => {
                      const stage = computeStage(plant); const info = STAGES[stage - 1]; const bed = bedLabel(plant.bedType)
                      return (
                        <div key={plant.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#16120e', border: '1px solid rgba(200,155,60,0.12)', borderRadius: 10, padding: '10px 14px' }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{plant.plantType?.icon ?? '🌱'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(plant)}</div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>{bed.icon} {bed.label} · {info.emoji} {info.label}{plant.harvestStatus && ' · ✅ Harvested'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setEditPlant(plant)} style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>✏️</button>
                            <button onClick={() => setSelected(plant)} style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>👁</button>
                          </div>
                        </div>
                      )
                    })
                }
              </div>
            )}

            {adminTab === 'types' && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setTypeForm('new')} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.35)', color: S.gold, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 8, marginBottom: 4 }}>+ Add Plant Type</button>
                {types.length === 0
                  ? <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4, textAlign: 'center', padding: '20px 0' }}>No plant types yet.</div>
                  : types.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#16120e', border: '1px solid rgba(200,155,60,0.12)', borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text4 }}>{CATEGORY_LABELS[t.category] ?? t.category}{t.daysToHarvest && ` · ${t.daysToHarvest}d harvest`}{t.autoGrowthDays && ` · auto ${t.autoGrowthDays}d/stage`}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setTypeForm(t)} style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(200,155,60,0.25)', color: S.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>✏️</button>
                          <button onClick={() => deleteType(t.id)} disabled={deletingType === t.id} style={{ padding: '5px 11px', background: 'transparent', border: '1px solid rgba(180,50,50,0.35)', color: '#c06060', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', borderRadius: 6 }}>{deletingType === t.id ? '…' : '🗑'}</button>
                        </div>
                      </div>
                    ))
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {selected && <PlantPopup plant={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} onUpdate={handlePlantUpdate} onDelete={handlePlantDelete} />}
      {showAdd && <AddPlantModal plantTypes={types} onClose={() => setShowAdd(false)} onAdd={p => { setPlants(prev => [...prev, p]); router.refresh() }} />}
      {editingPlant && <EditPlantModal plant={editingPlant} plantTypes={types} onClose={() => setEditPlant(null)} onSave={u => { setPlants(p => p.map(x => x.id === u.id ? u : x)); setEditPlant(null) }} />}
      {typeForm !== null && <PlantTypeForm initial={typeForm === 'new' ? undefined : typeForm} onClose={() => setTypeForm(null)} onSave={saved => { setTypes(prev => { const ex = prev.find(t => t.id === saved.id); return ex ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved] }); setTypeForm(null) }} />}
    </>
  )
}
