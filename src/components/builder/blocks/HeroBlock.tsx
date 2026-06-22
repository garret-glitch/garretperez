'use client'
import type { PageBlock, HeroBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement, normalizeHeroConfig } from '@/lib/block-defaults'
import HeroCard from '@/components/HeroCard'

interface Props {
  block: PageBlock
  isEditing: boolean
  liveData: BlockLiveData
  onConfigChange?: (c: HeroBlockConfig) => void
}

const THEME_OPTIONS = [
  { name: 'Gold',    val: '#1a0e06' },
  { name: 'Royal',   val: '#0e1628' },
  { name: 'Forest',  val: '#081a10' },
  { name: 'Crimson', val: '#1a0808' },
  { name: 'Arcane',  val: '#100818' },
  { name: 'Onyx',    val: '#111118' },
]

const LBL: React.CSSProperties = { fontSize: 6, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }
const SECTION_TITLE: React.CSSProperties = { fontSize: 8, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }
const CARD: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.25)', padding: '16px 18px', marginBottom: 10 }

function pickImage(cb: (dataUrl: string) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) { alert('Image is too large — please use one under ~2.5 MB.'); return }
    const r = new FileReader()
    r.onload = () => cb(r.result as string)
    r.readAsDataURL(file)
  }
  input.click()
}

function stopEvt(e: React.SyntheticEvent) { e.stopPropagation() }

// Defined at module scope so React doesn't remount them (and drop input focus) on every keystroke.
function TextField({ label, value, onChange, full, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; full?: boolean; placeholder?: string
}) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={LBL}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={stopEvt}
        placeholder={placeholder}
        className="osrs-input"
        style={{ width: '100%', fontSize: 10, padding: '6px 9px' }}
      />
    </div>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { stopEvt(e); onToggle() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
        padding: '7px 10px', borderRadius: 6, textAlign: 'left',
        background: on ? 'rgba(200,155,60,0.12)' : 'var(--bg-card)',
        border: `1px solid ${on ? 'rgba(200,155,60,0.4)' : 'var(--border)'}`,
      }}
    >
      <span style={{
        width: 26, height: 15, borderRadius: 8, flexShrink: 0, position: 'relative',
        background: on ? 'var(--gold)' : 'rgba(255,255,255,0.12)', transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 13 : 2, width: 11, height: 11, borderRadius: '50%',
          background: '#0d0d14', transition: 'left 0.15s',
        }} />
      </span>
      <span style={{ fontSize: 8.5, color: on ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 600 }}>{label}</span>
    </button>
  )
}

function ImageField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div>
      <div style={LBL}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 46, height: 46, flexShrink: 0, borderRadius: 6, overflow: 'hidden',
          border: '1px solid var(--border)', background: 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {value ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={value.startsWith('data:') ? '' : value}
            onChange={e => onChange(e.target.value)}
            onClick={stopEvt}
            placeholder={value.startsWith('data:') ? 'Uploaded image' : 'Paste image URL…'}
            className="osrs-input"
            style={{ width: '100%', fontSize: 9, padding: '5px 8px', marginBottom: 5 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={e => { stopEvt(e); pickImage(onChange) }} className="osrs-btn" style={{ fontSize: 7, padding: '5px 10px' }}>⬆ Upload</button>
            {value && <button onClick={e => { stopEvt(e); onChange('') }} style={{ fontSize: 7, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: '#df5d5d', cursor: 'pointer' }}>Clear</button>}
          </div>
        </div>
      </div>
      {hint && <div style={{ fontSize: 6.5, color: 'var(--text-3)', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

export default function HeroBlock({ block, isEditing, liveData, onConfigChange }: Props) {
  const cfg = normalizeHeroConfig(block.config as Partial<HeroBlockConfig>)
  const style = applyStylesToElement(block.styles)

  const headshot = liveData.heroHeadshot ?? ''
  const totalMembers = liveData.heroTotalMembers ?? 0
  const totalPosts = liveData.heroTotalPosts ?? 0
  const garretLevel = liveData.heroGarretLevel ?? 1
  const xpBar = liveData.heroGarretXpBar ?? { currentXp: 0, neededXp: 100, percent: 0 }

  // Read mode (public): rendered by page.tsx — kept here for completeness / safety
  if (!isEditing) {
    return (
      <HeroCard
        cfg={cfg} headshot={headshot}
        totalMembers={totalMembers} totalPosts={totalPosts}
        garretLevel={garretLevel} xpBar={xpBar} style={style}
      />
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const upd = (patch: Partial<HeroBlockConfig>) => onConfigChange?.({ ...cfg, ...patch })
  const updAccount = (patch: Partial<HeroBlockConfig['account']>) =>
    onConfigChange?.({ ...cfg, account: { ...cfg.account, ...patch } })

  const stop = stopEvt

  return (
    <div style={style} onClick={stop}>
      {/* ─ Identity ───────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>🏠</span> Hero — Identity</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <TextField label="Name" value={cfg.heroName} onChange={v => upd({ heroName: v })} full />
          <TextField label="Title / Role" value={cfg.heroTitle} onChange={v => upd({ heroTitle: v })} full />
          <TextField label="Location" value={cfg.heroLocation} onChange={v => upd({ heroLocation: v })} />
          <div>
            <div style={LBL}>Accent Color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="color" value={cfg.accentColor || '#c89b3c'} onChange={e => upd({ accentColor: e.target.value })} onClick={stop}
                style={{ width: 30, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: 'pointer' }} />
              <input value={cfg.accentColor ?? ''} onChange={e => upd({ accentColor: e.target.value })} onClick={stop}
                placeholder="default gold" className="osrs-input" style={{ flex: 1, fontSize: 9, padding: '6px 8px' }} />
              {cfg.accentColor && <button onClick={e => { stop(e); upd({ accentColor: '' }) }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>✕</button>}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ImageField label="Profile Photo" value={cfg.heroPhoto ?? ''} onChange={v => upd({ heroPhoto: v })} hint="Overrides the Settings headshot. Leave empty to use it." />
          <ImageField label="Panel Background" value={cfg.heroBgImage ?? ''} onChange={v => upd({ heroBgImage: v })} hint="Optional background image behind the hero." />
        </div>
      </div>

      {/* ─ Sections to show ───────────────────────────────────── */}
      <div style={CARD}>
        <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>🧩</span> Sections to Show</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          <Toggle label="Photo" on={cfg.showPhoto} onToggle={() => upd({ showPhoto: !cfg.showPhoto })} />
          <Toggle label="Title line" on={cfg.showTitle} onToggle={() => upd({ showTitle: !cfg.showTitle })} />
          <Toggle label="Stat chips" on={cfg.showStats} onToggle={() => upd({ showStats: !cfg.showStats })} />
          <Toggle label="XP bar" on={cfg.showXpBar} onToggle={() => upd({ showXpBar: !cfg.showXpBar })} />
          <Toggle label="CTA box" on={cfg.showCta} onToggle={() => upd({ showCta: !cfg.showCta })} />
          <Toggle label="Contact column" on={cfg.showContact} onToggle={() => upd({ showContact: !cfg.showContact })} />
        </div>
      </div>

      {/* ─ Call to action ─────────────────────────────────────── */}
      {cfg.showCta && (
        <div style={CARD}>
          <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>⚡</span> Call to Action</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextField label="CTA Title" value={cfg.ctaTitle} onChange={v => upd({ ctaTitle: v })} full />
            <TextField label="CTA Text" value={cfg.ctaText} onChange={v => upd({ ctaText: v })} full />
          </div>
        </div>
      )}

      {/* ─ Stat labels ────────────────────────────────────────── */}
      {cfg.showStats && (
        <div style={CARD}>
          <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>📊</span> Stat Labels <span style={{ fontSize: 6.5, color: 'var(--text-3)', fontWeight: 400 }}>(values update live from the database)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <TextField label="Members label" value={cfg.statMembersLabel} onChange={v => upd({ statMembersLabel: v })} />
            <TextField label="Posts label" value={cfg.statPostsLabel} onChange={v => upd({ statPostsLabel: v })} />
            <TextField label="Level label" value={cfg.statLevelLabel} onChange={v => upd({ statLevelLabel: v })} />
          </div>
        </div>
      )}

      {/* ─ Contact ────────────────────────────────────────────── */}
      {cfg.showContact && (
        <div style={CARD}>
          <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>📇</span> Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <TextField label="Phone" value={cfg.contactPhone} onChange={v => upd({ contactPhone: v })} />
            <TextField label="Email" value={cfg.contactEmail} onChange={v => upd({ contactEmail: v })} />
            <TextField label="LinkedIn handle" value={cfg.contactLinkedin} onChange={v => upd({ contactLinkedin: v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            <Toggle label="Phone" on={cfg.showPhone} onToggle={() => upd({ showPhone: !cfg.showPhone })} />
            <Toggle label="Email" on={cfg.showEmail} onToggle={() => upd({ showEmail: !cfg.showEmail })} />
            <Toggle label="LinkedIn" on={cfg.showLinkedin} onToggle={() => upd({ showLinkedin: !cfg.showLinkedin })} />
            <Toggle label="Resume button" on={cfg.showResume} onToggle={() => upd({ showResume: !cfg.showResume })} />
          </div>
        </div>
      )}

      {/* ─ Account card (right side) ──────────────────────────── */}
      <div style={CARD}>
        <div style={SECTION_TITLE}><span style={{ fontSize: 14 }}>🛡</span> Account Card <span style={{ fontSize: 6.5, color: 'var(--text-3)', fontWeight: 400 }}>(the card to the right)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <TextField label="Welcome title (logged out)" value={cfg.account.loggedOutTitle} onChange={v => updAccount({ loggedOutTitle: v })} />
          <TextField label="Icon (emoji)" value={cfg.account.loggedOutIcon} onChange={v => updAccount({ loggedOutIcon: v })} />
          <TextField label="Create-account button" value={cfg.account.registerLabel} onChange={v => updAccount({ registerLabel: v })} />
          <TextField label="Log-in button" value={cfg.account.loginLabel} onChange={v => updAccount({ loginLabel: v })} />
        </div>
        <div style={LBL}>Default Banner Theme</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {THEME_OPTIONS.map(t => (
            <button key={t.val} onClick={e => { stop(e); updAccount({ defaultTheme: t.val }) }}
              style={{
                fontSize: 8, padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                background: t.val, color: '#d4b880',
                border: cfg.account.defaultTheme === t.val ? '2px solid var(--gold)' : '1px solid var(--border)',
              }}>{t.name}</button>
          ))}
        </div>
      </div>

      {/* ─ Live preview ───────────────────────────────────────── */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 6.5, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>↓ Live preview (exactly how it looks on the homepage)</div>
        <div style={{ pointerEvents: 'none', border: '1px dashed var(--border)', padding: 12, borderRadius: 6 }}>
          <HeroCard
            cfg={cfg} headshot={headshot}
            totalMembers={totalMembers} totalPosts={totalPosts}
            garretLevel={garretLevel} xpBar={xpBar}
          />
        </div>
      </div>
    </div>
  )
}
