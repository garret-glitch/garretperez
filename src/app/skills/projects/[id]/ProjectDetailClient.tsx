'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface ProjectTask {
  id: string
  text: string
  done: boolean
  priority: 1 | 2 | 3 | 4
  category: string
}

interface ProjectSpecs {
  year?: string
  make?: string
  model?: string
  engine?: string
  goal?: string
  currentStatus?: string[]
}

interface Props {
  project: {
    id: string
    icon: string
    title: string
    desc: string
    status: string
    progress: number
  }
  tasks: ProjectTask[]
  images: string[]
  specs: ProjectSpecs
  isAdmin: boolean
}

const PRIORITY_CATEGORIES: Array<{
  priority: 1 | 2 | 3 | 4
  label: string
  color: string
}> = [
  { priority: 1, label: 'Safety',       color: '#ef4444' },
  { priority: 2, label: 'Reliability',  color: '#f59e0b' },
  { priority: 3, label: 'Comfort',      color: '#60a5fa' },
  { priority: 4, label: 'Nice-to-Have', color: '#6b7280' },
]

const ZONE_LEGEND = [
  { dot: '🔴', label: 'Safety',       color: '#ef4444', priority: 1 },
  { dot: '🟡', label: 'Reliability',  color: '#f59e0b', priority: 2 },
  { dot: '🔵', label: 'Comfort',      color: '#60a5fa', priority: 3 },
  { dot: '⬜', label: 'Nice-to-Have', color: '#6b7280', priority: 4 },
]

function getStatusIndicator(item: string): { symbol: string; color: string } {
  const lower = item.toLowerCase()
  if (
    lower.includes('completed') ||
    lower.includes('installed') ||
    lower.includes('updated')
  ) {
    return { symbol: '✓', color: '#22c55e' }
  }
  if (lower.includes('issue') || lower.includes('suspected')) {
    return { symbol: '⚠', color: '#f97316' }
  }
  if (lower.startsWith('no ') || lower.startsWith('old ') || lower.includes('not installed')) {
    return { symbol: '✗', color: '#ef4444' }
  }
  return { symbol: '·', color: '#a09880' }
}

interface ZoneState {
  color: string
  allDone: boolean
  total: number
  done: number
}

function useZoneStates(tasks: ProjectTask[]): Record<number, ZoneState> {
  const zones: Record<number, ZoneState> = {}
  for (const pc of PRIORITY_CATEGORIES) {
    const catTasks = tasks.filter((t) => t.priority === pc.priority)
    const doneCnt = catTasks.filter((t) => t.done).length
    const allDone = catTasks.length > 0 && doneCnt === catTasks.length
    zones[pc.priority] = {
      color: allDone ? '#22c55e' : pc.color,
      allDone,
      total: catTasks.length,
      done: doneCnt,
    }
  }
  return zones
}

interface MustangSVGProps {
  zones: Record<number, ZoneState>
}

function MustangSVG({ zones }: MustangSVGProps) {
  const safety = zones[1].color
  const rel    = zones[2].color
  const com    = zones[3].color
  const nice   = zones[4].color

  const sDone = zones[1].allDone
  const rDone = zones[2].allDone
  const cDone = zones[3].allDone
  const nDone = zones[4].allDone

  function glowFilter(id: string, color: string, done: boolean) {
    const r = (parseInt(color.slice(1, 3), 16) / 255).toFixed(4)
    const g = (parseInt(color.slice(3, 5), 16) / 255).toFixed(4)
    const b = (parseInt(color.slice(5, 7), 16) / 255).toFixed(4)
    return (
      <filter key={id} id={id} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={done ? 3 : 7} result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${done ? 1.5 : 2.5} 0`}
          result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    )
  }

  const pulse = `
    @keyframes mPulse{0%,100%{opacity:.66}50%{opacity:1}}
    .mzp{animation:mPulse 2.2s ease-in-out infinite}
  `

  // 5-spoke wheel (returns SVG elements, called inline not as <Component/>)
  function drawWheel(cx: number, cy: number, r: number, c: string) {
    const spokes = [0, 72, 144, 216, 288]
    return (
      <g key={cx}>
        <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.9} stroke={c} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={7} />
        <circle cx={cx} cy={cy} r={r - 8} fill={c} fillOpacity={0.45} stroke="rgba(220,200,160,0.2)" strokeWidth={0.7} />
        {spokes.map(deg => {
          const rad = deg * Math.PI / 180
          return (
            <line key={deg} x1={cx} y1={cy}
              x2={cx + Math.cos(rad) * (r - 9)} y2={cy + Math.sin(rad) * (r - 9)}
              stroke="#d4c89a" strokeWidth={2} strokeOpacity={0.82} />
          )
        })}
        <circle cx={cx} cy={cy} r={5} fill="#e8e6e0" stroke="rgba(200,180,140,0.55)" strokeWidth={0.8} />
        <circle cx={cx} cy={cy} r={2} fill="#c89b3c" />
      </g>
    )
  }

  /*
   * 1965 Ford Mustang Coupe — side profile
   * ViewBox 520×210. Proportions match real car (~45% hood, ~25% cabin, ~30% trunk).
   *
   * Front wheel:  cx=135, cy=158, r=24
   * Rear wheel:   cx=438, cy=158, r=24   (wheelbase ≈ 303px, ~59% of 514 total)
   * Body rail:    y=138
   * Hood surface: y≈72–76 (long flat)
   * Roof:         y≈40  (notchback — flat top, upright C-pillar)
   * Ground:       y≈186
   */

  return (
    <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <svg viewBox="0 0 520 210" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <style>{pulse}</style>
          <radialGradient id="mBg" cx="50%" cy="55%" r="70%">
            <stop offset="0%" stopColor="#14122a" />
            <stop offset="100%" stopColor="#09090f" />
          </radialGradient>
          {glowFilter('mg1', safety, sDone)}
          {glowFilter('mg2', rel,    rDone)}
          {glowFilter('mg3', com,    cDone)}
          {glowFilter('mg4', nice,   nDone)}
        </defs>

        {/* Background */}
        <rect width="520" height="210" fill="url(#mBg)" rx="8" />

        {/* Ground shadow */}
        <ellipse cx="262" cy="192" rx="228" ry="8" fill="rgba(0,0,0,0.55)" />

        {/* ── COMPLETE BODY BASE SILHOUETTE (dark underlayer) ── */}
        {/*
          Going clockwise from cowl top-left:
          Cowl → A-pillar → roof → C-pillar (notchback: more upright) →
          trunk lid → rear slope → bumper → rocker → front bumper → hood → back
        */}
        <path
          d="
            M 214,74 L 44,72
            C 28,72 16,78 12,86
            C 8,94 8,108 8,130
            L 10,138 L 96,138
            A 40,24 0 0,1 174,138
            L 354,138
            A 40,24 0 0,1 430,138
            L 488,138 L 508,128 L 514,112 L 514,102 L 504,88
            L 472,78 L 360,72 L 356,66 L 348,44 L 340,40
            L 228,40 L 220,44 L 214,74
            Z
          "
          fill="#15132c" stroke="#28264a" strokeWidth={1}
        />

        {/* ── RELIABILITY — Hood, engine, front fender ── */}
        <g filter="url(#mg2)" className={rDone ? '' : 'mzp'}>
          {/*
            Hood shape: from front bumper curve → long flat hood surface →
            firewall (x=214) → body rail bottom → back to bumper
          */}
          <path
            d="
              M 12,84 C 8,94 8,110 8,130 L 10,138
              L 172,138 L 172,110 L 214,110 L 214,72
              L 44,72 C 28,72 16,76 12,84 Z
            "
            fill={rel} fillOpacity={0.65} stroke={rel} strokeWidth={1.5}
          />
          {/* Front bumper face */}
          <rect x="6" y="94" width="10" height="48" rx="5"
            fill={rel} fillOpacity={0.62} stroke={rel} strokeWidth={1} />
          {/* Dual round headlights — 1965 Mustang had two stacked per side */}
          <circle cx="20" cy="99"  r="7.5" fill="#fef9aa" fillOpacity={0.94} stroke="#fde047" strokeWidth={1.3} />
          <circle cx="20" cy="113" r="6.2" fill="#fef9aa" fillOpacity={0.7}  stroke="#fde047" strokeWidth={1.1} />
          {/* Parking / turn signal lamp below lower headlight */}
          <ellipse cx="20" cy="124" rx="5" ry="3.5" fill="#fbbf24" fillOpacity={0.68} />
          {/* Grille opening */}
          <rect x="14" y="103" width="28" height="28" rx="2"
            fill="rgba(0,0,0,0.68)" stroke={rel} strokeWidth={0.8} strokeOpacity={0.55} />
          {/* Horizontal grille bars */}
          {[107, 111, 115, 119, 123, 127].map(y => (
            <line key={y} x1="16" y1={y} x2="40" y2={y} stroke={rel} strokeWidth={0.7} strokeOpacity={0.45} />
          ))}
          {/* Chrome corral center bar (1965 Mustang signature) */}
          <line x1="28" y1="104" x2="28" y2="130" stroke="rgba(200,155,60,0.65)" strokeWidth={1.2} />
          {/* Running horse emblem (gold oval) */}
          <ellipse cx="28" cy="117" rx="5" ry="3" fill="rgba(200,155,60,0.6)" stroke="rgba(200,155,60,0.5)" strokeWidth={0.6} />
          {/* Front fender badge (running horse on fender) */}
          <ellipse cx="100" cy="86" rx="7" ry="3.5" fill="none" stroke={rel} strokeWidth={0.8} strokeOpacity={0.45} />
          <ellipse cx="100" cy="86" rx="5" ry="2.2" fill="rgba(200,155,60,0.38)" />
          {/* Hood centerline ridge */}
          <line x1="46" y1="70" x2="210" y2="70" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} />
        </g>

        {/* ── COMFORT — Cabin, roof, doors ── */}
        <g filter="url(#mg3)" className={cDone ? '' : 'mzp'}>
          {/* Notchback roof panel — flat top, upright C-pillar distinguishes it from fastback */}
          <path
            d="M 216,76 L 222,44 L 230,40 L 338,40 L 348,46 L 356,78 Z"
            fill={com} fillOpacity={0.72} stroke={com} strokeWidth={1.5}
          />
          {/* Door area below beltline */}
          <rect x="214" y="76" width="144" height="36"
            fill={com} fillOpacity={0.48} />
          {/* Windshield — A-pillar at ~60° (realistic for 1965) */}
          <path d="M 218,74 L 224,44 L 238,42 L 228,78 Z"
            fill="rgba(120,200,255,0.19)" stroke="rgba(140,210,255,0.45)" strokeWidth={1} />
          {/* Vent window (triangular ventipane — 1965 Mustang feature) */}
          <path d="M 228,78 L 235,48 L 248,48 L 242,78 Z"
            fill="rgba(120,200,255,0.11)" stroke="rgba(140,210,255,0.32)" strokeWidth={0.7} />
          {/* Vent window divider chrome */}
          <line x1="235" y1="48" x2="242" y2="78" stroke="rgba(220,200,160,0.45)" strokeWidth={0.8} />
          {/* Main door window */}
          <path d="M 244,44 L 330,40 L 326,78 L 244,78 Z"
            fill="rgba(120,200,255,0.12)" stroke="rgba(140,210,255,0.24)" strokeWidth={0.7} />
          {/* Rear quarter glass (small window behind C-pillar top) */}
          <path d="M 330,40 L 350,48 L 352,78 L 326,78 Z"
            fill="rgba(120,200,255,0.10)" stroke="rgba(140,210,255,0.22)" strokeWidth={0.7} />
          {/* A-pillar chrome */}
          <line x1="222" y1="44" x2="216" y2="78" stroke="rgba(220,200,160,0.48)" strokeWidth={1.3} />
          {/* C-pillar chrome (notchback: goes more vertically than fastback) */}
          <line x1="350" y1="48" x2="356" y2="78" stroke="rgba(220,200,160,0.42)" strokeWidth={1.2} />
          {/* Roof drip rail */}
          <line x1="222" y1="42" x2="340" y2="40" stroke="rgba(220,200,160,0.3)" strokeWidth={0.9} />
          {/* Door handle */}
          <rect x="266" y="95" width="24" height="5" rx="2.5"
            fill="rgba(220,200,160,0.52)" stroke="rgba(220,200,160,0.38)" strokeWidth={0.5} />
          {/* Door lock button */}
          <circle cx="265" cy="97" r="2" fill="rgba(220,200,160,0.4)" />
          {/* Beltline chrome trim */}
          <line x1="216" y1="104" x2="358" y2="102" stroke="rgba(220,200,160,0.25)" strokeWidth={1} />
        </g>

        {/* ── NICE-TO-HAVE — Trunk lid, rear quarter, rear bumper ── */}
        <g filter="url(#mg4)" className={nDone ? '' : 'mzp'}>
          {/* Trunk lid — notchback has a distinct trunk opening, lid is fairly flat */}
          <path
            d="M 356,66 L 362,72 L 472,78 L 504,90 L 514,104 L 514,110 L 356,110 L 356,78 Z"
            fill={nice} fillOpacity={0.72} stroke={nice} strokeWidth={1.5}
          />
          {/* Rear bumper face */}
          <rect x="511" y="100" width="10" height="40" rx="4"
            fill={nice} fillOpacity={0.65} stroke={nice} strokeWidth={1} />
          {/*
            1965 Mustang TRI-BAR taillights — the car's most distinctive feature:
            Three vertical red bars arranged in each taillight cluster.
          */}
          <rect x="491" y="103" width="8" height="12" rx="1.5" fill="#ff3333" fillOpacity={0.97} />
          <rect x="500" y="103" width="8" height="12" rx="1.5" fill="#ff3333" fillOpacity={0.7} />
          <rect x="491" y="117" width="8" height="10" rx="1.5" fill="#ff3333" fillOpacity={0.48} />
          {/* Backup light */}
          <rect x="500" y="117" width="8" height="10" rx="1.5" fill="#f0f0ee" fillOpacity={0.38} />
          {/* Gas cap (small chrome circle on rear quarter) */}
          <circle cx="474" cy="82" r="5" fill="rgba(200,180,140,0.55)" stroke="rgba(200,180,140,0.7)" strokeWidth={0.9} />
          <circle cx="474" cy="82" r="2" fill="rgba(200,180,140,0.85)" />
          {/*
            Rear quarter scoop — the concave C-scoop on the rear quarter panel
            is one of the most recognizable 1965 Mustang design elements
          */}
          <path d="M 396,80 C 406,75 428,73 440,75 L 440,92 C 428,94 406,93 396,88 Z"
            fill="rgba(0,0,0,0.58)" stroke={nice} strokeWidth={0.8} strokeOpacity={0.5} />
          {/* Vertical slats inside scoop */}
          {[404, 412, 420, 428, 436].map(x => (
            <line key={x} x1={x} y1={76} x2={x} y2={92} stroke={nice} strokeWidth={0.6} strokeOpacity={0.38} />
          ))}
          {/* Trunk emblem area */}
          <ellipse cx="434" cy="73" rx="9" ry="4" fill="rgba(200,155,60,0.28)" stroke="rgba(200,155,60,0.4)" strokeWidth={0.6} />
          {/* Trunk lid character line (runs rear to front along lid) */}
          <line x1="362" y1="74" x2="470" y2="80" stroke="rgba(255,255,255,0.06)" strokeWidth={1.2} />
        </g>

        {/* ── CHASSIS — Rocker panel (neutral dark) ── */}
        <rect x="8" y="118" width="506" height="22" rx="5"
          fill="#181626" stroke="#24223e" strokeWidth={1.5} />

        {/* ── SAFETY — Front + Rear wheels ── */}
        <g filter="url(#mg1)" className={sDone ? '' : 'mzp'}>
          {drawWheel(135, 158, 24, safety)}
          {drawWheel(438, 158, 24, safety)}
        </g>

        {/* ── CHROME ACCENTS ── */}
        {/* Front bumper chrome highlight */}
        <path d="M 6,96 C 4,108 4,120 6,132"
          stroke="rgba(220,200,160,0.68)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Rear bumper chrome highlight */}
        <path d="M 522,102 C 524,114 524,124 522,134"
          stroke="rgba(220,200,160,0.68)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Rocker panel chrome molding (runs between wheel arches) */}
        <line x1="88" y1="126" x2="360" y2="126" stroke="rgba(210,190,150,0.52)" strokeWidth={1.8} />
        {/* Side body crease / character line (lower third of door) */}
        <path d="M 216,108 C 280,106 320,107 358,106"
          stroke="rgba(210,190,150,0.18)" strokeWidth={1} fill="none" />

        {/* ── ZONE LABELS ── */}
        <text x="135" y="204" textAnchor="middle" fontSize="5.5"
          fontFamily="'Press Start 2P',monospace" fill={safety} fillOpacity={0.85}>SAFETY</text>
        <text x="438" y="204" textAnchor="middle" fontSize="5.5"
          fontFamily="'Press Start 2P',monospace" fill={safety} fillOpacity={0.85}>SAFETY</text>
        <text x="108" y="62" textAnchor="middle" fontSize="5.5"
          fontFamily="'Press Start 2P',monospace" fill={rel} fillOpacity={0.9}>ENGINE</text>
        <text x="284" y="31" textAnchor="middle" fontSize="5.5"
          fontFamily="'Press Start 2P',monospace" fill={com} fillOpacity={0.9}>CABIN</text>
        <text x="442" y="60" textAnchor="middle" fontSize="5.5"
          fontFamily="'Press Start 2P',monospace" fill={nice} fillOpacity={0.9}>BODY</text>
      </svg>
    </div>
  )
}

export default function ProjectDetailClient({
  project,
  tasks: initialTasks,
  images: initialImages,
  specs,
  isAdmin,
}: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [images, setImages] = useState<string[]>(initialImages)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.done).length
  const computedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : project.progress

  const isCompleted = project.status === 'completed'

  const zones = useZoneStates(tasks)

  async function handleToggleTask(taskId: string) {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    )
    setTasks(updated)
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: JSON.stringify(updated) }),
      })
    } catch (err) {
      console.error('Failed to save task toggle:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPhoto() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const updated = [...images, base64]
      setImages(updated)
      setSaving(true)
      try {
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: JSON.stringify(updated) }),
        })
      } catch (err) {
        console.error('Failed to save image:', err)
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleDeleteImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    setImages(updated)
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: JSON.stringify(updated) }),
      })
    } catch (err) {
      console.error('Failed to delete image:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Back + saving indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Link
          href="/skills/projects"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            color: 'var(--text-3)',
            textDecoration: 'none',
          }}
        >
          ← Back to Projects
        </Link>
        {saving && (
          <span
            className="body-text"
            style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}
          >
            Saving…
          </span>
        )}
      </div>

      {/* Project header */}
      <div
        className="rp-card"
        style={{ padding: '24px 24px 20px', marginBottom: 16, borderRadius: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 48, flexShrink: 0 }}>{project.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: 'var(--gold)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {project.title}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(13,13,20,0.85)',
                  border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.4)'}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isCompleted ? '#22c55e' : '#f97316',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 6,
                    fontFamily: "'Press Start 2P', monospace",
                    color: isCompleted ? '#22c55e' : '#f97316',
                  }}
                >
                  {isCompleted ? 'Complete' : 'In Progress'}
                </span>
              </span>
            </div>
            <p
              className="body-text"
              style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}
            >
              {project.desc}
            </p>
          </div>
        </div>

        {/* Overall progress */}
        {totalTasks > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: 'var(--text-1)',
                marginBottom: 8,
              }}
            >
              {doneTasks} / {totalTasks} tasks complete
            </div>
            <div
              style={{
                height: 12,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(200,155,60,0.25)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${computedProgress}%`,
                  background: 'linear-gradient(90deg, #9a7428, #c89b3c)',
                  borderRadius: 6,
                  transition: 'width 0.4s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '45%',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
            <div
              className="body-text"
              style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, textAlign: 'right' }}
            >
              {computedProgress}% complete
            </div>
          </div>
        )}
      </div>

      {/* === SECTION A: SVG Car Diagram === */}
      <div
        className="rp-card"
        style={{ padding: '20px 20px 16px', marginBottom: 16, borderRadius: 12 }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 16 }}>⚒️</span>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: 'var(--text-1)',
              margin: 0,
            }}
          >
            BUILD PROGRESS
          </h2>
        </div>

        {/* SVG */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <MustangSVG zones={zones} />
        </div>

        {/* Zone legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
          }}
        >
          {ZONE_LEGEND.map((z) => {
            const zoneData = zones[z.priority]
            const displayColor = zoneData.allDone ? '#22c55e' : z.color
            return (
              <div
                key={z.priority}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${displayColor}33`,
                  borderRadius: 6,
                  padding: '6px 10px',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: displayColor,
                    flexShrink: 0,
                    boxShadow: `0 0 5px ${displayColor}88`,
                    display: 'inline-block',
                  }}
                />
                <span
                  className="body-text"
                  style={{ fontSize: 11, color: displayColor }}
                >
                  {z.label}
                </span>
                <span
                  className="body-text"
                  style={{ fontSize: 10, color: 'var(--text-3)' }}
                >
                  {zoneData.done}/{zoneData.total}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* === SECTION B: Image Gallery === */}
      <div
        className="rp-card"
        style={{ padding: '20px 20px 16px', marginBottom: 16, borderRadius: 12 }}
      >
        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: 'var(--text-1)',
            margin: '0 0 14px',
          }}
        >
          Photos
        </h2>

        {images.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={src}
                  alt={`${project.title} photo ${i + 1}`}
                  style={{ width: 256, height: 192, objectFit: 'cover', display: 'block' }}
                />
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteImage(i)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(239,68,68,0.5)',
                      color: '#ef4444',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              height: 120,
              background: 'radial-gradient(ellipse at center, #1a1a28 0%, #0d0d14 80%)',
              borderRadius: 8,
              border: '1px dashed var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>{project.icon}</span>
            <span
              className="body-text"
              style={{ fontSize: 11, color: 'var(--text-3)' }}
            >
              No photos yet
            </span>
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: 12 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={handleAddPhoto}
              className="osrs-btn"
              style={{
                fontSize: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              + Add Photo
            </button>
          </div>
        )}
      </div>

      {/* === SECTION C: Build Specs === */}
      {(specs.year || specs.make || specs.model || specs.engine || specs.goal || (specs.currentStatus && specs.currentStatus.length > 0)) && (
        <div
          className="rp-card"
          style={{ padding: '20px 20px 16px', marginBottom: 16, borderRadius: 12 }}
        >
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: 'var(--text-1)',
              margin: '0 0 16px',
            }}
          >
            Build Specs
          </h2>

          {/* 4-cell spec grid */}
          {(specs.year || specs.make || specs.model || specs.engine) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { label: 'Year',   value: specs.year   },
                { label: 'Make',   value: specs.make   },
                { label: 'Model',  value: specs.model  },
                { label: 'Engine', value: specs.engine },
              ].map(({ label, value }) =>
                value ? (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: 6,
                        color: 'var(--text-3)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className="body-text"
                      style={{ fontSize: 16, color: 'var(--text-1)', fontWeight: 700 }}
                    >
                      {value}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Goal */}
          {specs.goal && (
            <div
              style={{
                background: 'rgba(200,155,60,0.07)',
                border: '1px solid rgba(200,155,60,0.25)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  color: '#c89b3c',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Goal
              </div>
              <p
                className="body-text"
                style={{ fontSize: 13, color: 'var(--text-1)', margin: 0, lineHeight: 1.6 }}
              >
                {specs.goal}
              </p>
            </div>
          )}

          {/* Current status list */}
          {specs.currentStatus && specs.currentStatus.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  color: 'var(--text-3)',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Current Status
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {specs.currentStatus.map((item, i) => {
                  const { symbol, color } = getStatusIndicator(item)
                  return (
                    <li
                      key={i}
                      className="body-text"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-1)' }}
                    >
                      <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: 14, width: 16, textAlign: 'center' }}>
                        {symbol}
                      </span>
                      {item}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* === SECTION D: Checklist by priority === */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRIORITY_CATEGORIES.map(({ priority, label, color }) => {
            const categoryTasks = tasks.filter((t) => t.priority === priority)
            if (categoryTasks.length === 0) return null
            const catDone = categoryTasks.filter((t) => t.done).length
            const catProgress = Math.round((catDone / categoryTasks.length) * 100)

            return (
              <div
                key={priority}
                className="rp-card"
                style={{ padding: '20px 20px 16px', borderRadius: 12 }}
              >
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      display: 'inline-block',
                      boxShadow: `0 0 6px ${color}88`,
                    }}
                  />
                  <h3
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 8,
                      color: color,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    Priority {priority} — {label}
                  </h3>
                  <span
                    className="body-text"
                    style={{
                      fontSize: 11,
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${color}44`,
                      borderRadius: 10,
                      padding: '2px 8px',
                      color: color,
                    }}
                  >
                    {catDone}/{categoryTasks.length}
                  </span>
                </div>

                {/* Mini progress bar */}
                <div
                  style={{
                    height: 4,
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${color}33`,
                    borderRadius: 3,
                    overflow: 'hidden',
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${catProgress}%`,
                      background: color,
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                {/* Task rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        background: task.done ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
                        borderRadius: 6,
                        border: task.done
                          ? '1px solid rgba(34,197,94,0.15)'
                          : '1px solid var(--border-dim)',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      {isAdmin ? (
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleTask(task.id)}
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            accentColor: color,
                            cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            borderRadius: 3,
                            border: task.done ? `2px solid ${color}` : '2px solid var(--border)',
                            background: task.done ? `${color}33` : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {task.done && (
                            <span style={{ color, fontSize: 10, lineHeight: 1 }}>✓</span>
                          )}
                        </div>
                      )}
                      <span
                        className="body-text"
                        style={{
                          fontSize: 13,
                          color: task.done ? 'var(--text-3)' : 'var(--text-1)',
                          textDecoration: task.done ? 'line-through' : 'none',
                          flex: 1,
                          lineHeight: 1.5,
                        }}
                      >
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
