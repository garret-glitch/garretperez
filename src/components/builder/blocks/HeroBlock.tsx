'use client'
import type { PageBlock, HeroBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'
import { Phone, Mail, FileText } from 'lucide-react'

interface Props {
  block: PageBlock
  isEditing: boolean
  liveData: BlockLiveData
  onConfigChange?: (c: HeroBlockConfig) => void
}

export default function HeroBlock({ block, isEditing, liveData, onConfigChange }: Props) {
  const cfg = block.config as HeroBlockConfig
  const style = applyStylesToElement(block.styles)

  const upd = (field: keyof HeroBlockConfig, val: string) =>
    onConfigChange?.({ ...cfg, [field]: val })

  const headshot = liveData.heroHeadshot ?? ''
  const totalMembers = liveData.heroTotalMembers ?? 0
  const totalPosts = liveData.heroTotalPosts ?? 0
  const garretLevel = liveData.heroGarretLevel ?? 1
  const xpBar = liveData.heroGarretXpBar ?? { currentXp: 0, neededXp: 100, percent: 0 }
  const phone = cfg.contactPhone ?? '(346) 604-1635'
  const email = cfg.contactEmail ?? 'gis.owner@gmail.com'
  const linkedin = cfg.contactLinkedin ?? 'garretperez'

  if (isEditing) {
    return (
      <div style={{ ...style }}>
        {/* Settings panel */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid rgba(200,155,60,0.25)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>🏠</span>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.05em' }}>Hero Panel Settings</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              { key: 'heroTitle'       as const, label: 'Title / Role',    span: true },
              { key: 'heroLocation'    as const, label: 'Location',        span: false },
              { key: 'contactPhone'    as const, label: 'Phone',           span: false },
              { key: 'contactEmail'    as const, label: 'Email',           span: false },
              { key: 'contactLinkedin' as const, label: 'LinkedIn Handle', span: false },
            ]).map(({ key, label, span }) => (
              <div key={key} style={{ gridColumn: span ? '1 / -1' : undefined }}>
                <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {label}
                </div>
                <input
                  value={(cfg as unknown as Record<string, string>)[key] ?? ''}
                  onChange={e => upd(key, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="osrs-input"
                  style={{ width: '100%', fontSize: 10, padding: '6px 9px' }}
                />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: '8px 12px',
            background: 'rgba(200,155,60,0.05)', border: '1px solid rgba(200,155,60,0.14)',
            fontSize: 7, color: 'var(--text-3)', lineHeight: 1.6,
          }}>
            💡 Photo → Admin → Settings tab &nbsp;·&nbsp; Stats and XP update live from the database
          </div>
        </div>

        {/* Live preview */}
        <div style={{
          marginTop: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          padding: '4px 8px 6px',
        }}>
          <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Preview (live stats)
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {/* Mini photo */}
            <div style={{
              width: 48, height: 48, flexShrink: 0,
              border: '2px solid #c89b3c', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-page)', color: 'var(--gold)', fontSize: 12, fontWeight: 700,
            }}>
              {headshot
                ? <img src={headshot} alt="GP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : 'GP'}
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: 'var(--text-1)', fontWeight: 700, marginBottom: 2 }}>
                Garret Perez
              </div>
              <div className="body-text" style={{ fontSize: 9, color: 'var(--text-2)', marginBottom: 2 }}>
                {cfg.heroTitle || '—'}
              </div>
              <div className="body-text" style={{ fontSize: 8, color: 'var(--text-3)' }}>
                📍 {cfg.heroLocation || '—'}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {[
                { v: totalMembers, l: 'Members' },
                { v: totalPosts,   l: 'Posts' },
                { v: garretLevel,  l: 'Level' },
              ].map(s => (
                <div key={s.l} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '5px 10px', background: 'rgba(200,155,60,0.07)',
                  border: '1px solid rgba(200,155,60,0.2)',
                }}>
                  <span className="body-text" style={{ fontSize: 14, fontWeight: 700, color: '#c89b3c', lineHeight: 1 }}>{s.v}</span>
                  <span style={{ fontSize: 4.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Community XP</span>
              <span className="body-text" style={{ fontSize: 7, color: 'var(--text-3)' }}>{xpBar.currentXp} / {xpBar.neededXp}</span>
            </div>
            <div style={{ height: 6, background: '#a88040', border: '1px solid rgba(200,155,60,0.25)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #3a7a22)' }} />
            </div>
          </div>

          {/* Contact preview */}
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: <Phone size={9} color="#c89b3c" />, val: phone },
              { icon: <Mail size={9} color="#7090c8" />,  val: email },
              { icon: <span style={{ fontFamily: 'Georgia', fontWeight: 900, color: '#4a88d0', fontSize: 9, lineHeight: 1 }}>in</span>, val: linkedin },
              { icon: <FileText size={9} color="#c89b3c" />, val: 'Resume' },
            ].map((c, i) => (
              <div key={i} className="body-text" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--text-2)' }}>
                {c.icon} {c.val}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Read mode: rendered by page.tsx, not HomepageBlockRenderer (which skips hero blocks)
  return (
    <div className="hero-panel" style={style}>
      <div className="hidden sm:grid" style={{ gridTemplateColumns: '200px 1fr 185px', gap: 28, minHeight: 210, alignItems: 'stretch' }}>
        {/* Col 1 — Photo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 200, height: 200, flexShrink: 0,
            border: '3px solid #c89b3c',
            boxShadow: '0 0 0 5px rgba(200,155,60,0.1), 0 10px 40px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-page)', color: 'var(--gold)', fontSize: 38, fontWeight: 700,
          }}>
            {headshot
              ? <img src={headshot} alt="Garret Perez" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : 'GP'}
          </div>
        </div>

        {/* Col 2 — Identity + Stats + XP */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: 'var(--text-1)', textShadow: '0 0 24px rgba(200,155,60,0.45), 1px 2px 4px rgba(0,0,0,0.9)', letterSpacing: '0.04em', marginBottom: 7 }}>Garret Perez</h1>
            <div className="body-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{cfg.heroTitle}</div>
            <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {cfg.heroLocation}</div>
          </div>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,155,60,0.35) 0%, transparent 100%)', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {[
              { value: totalMembers, label: 'Members' },
              { value: totalPosts,   label: 'Posts' },
              { value: garretLevel,  label: 'Level' },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.22)' }}>
                <span className="body-text" style={{ fontSize: 22, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 5 }}>{stat.value}</span>
                <span style={{ fontSize: 5.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Press Start 2P', monospace" }}>XP Progress</span>
              <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)' }}>{xpBar.currentXp} / {xpBar.neededXp} XP</span>
            </div>
            <div style={{ height: 10, background: '#a88040', border: '1px solid rgba(200,155,60,0.3)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${xpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #3a7a22)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.12)' }} />
              </div>
            </div>
          </div>
          <p className="body-text" style={{ fontSize: 7, color: 'var(--text-3)' }}>Level grows as the community interacts.</p>
        </div>

        {/* Col 3 — Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid rgba(200,155,60,0.2)', paddingLeft: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]" style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.28)' }}>
                <Phone size={15} color="#c89b3c" strokeWidth={1.7} />
              </div>
              <div>
                <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Phone</div>
                <div className="body-text" style={{ fontSize: 10, color: '#f0dc90', fontWeight: 700 }}>{phone}</div>
              </div>
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]" style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(60,110,200,0.12)', border: '1px solid rgba(60,110,200,0.28)' }}>
                <Mail size={15} color="#7090c8" strokeWidth={1.7} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Email</div>
                <div className="body-text" style={{ fontSize: 8.5, color: '#f0dc90', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 148 }}>{email}</div>
              </div>
            </a>
            <a href={`https://www.linkedin.com/in/${linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded transition-colors hover:bg-white/[0.04]" style={{ textDecoration: 'none', padding: '9px 8px', margin: '0 -8px' }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,90,200,0.14)', border: '1px solid rgba(0,90,200,0.3)' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#4a88d0', fontSize: 15, lineHeight: 1, userSelect: 'none' }}>in</span>
              </div>
              <div>
                <div style={{ fontSize: 5.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>LinkedIn</div>
                <div className="body-text" style={{ fontSize: 8.5, color: '#f0dc90', fontWeight: 700 }}>in/{linkedin}</div>
              </div>
            </a>
          </div>
          <a href="/resume" className="flex items-center justify-center gap-2 transition-opacity hover:opacity-85" style={{ background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)', color: '#120c00', fontFamily: "'Press Start 2P', monospace", fontSize: 6.5, fontWeight: 700, padding: '10px 14px', marginTop: 16, textDecoration: 'none', letterSpacing: '0.03em', boxShadow: '0 3px 18px rgba(200,155,60,0.42)', display: 'flex' }}>
            <FileText size={12} strokeWidth={2.2} />
            View Resume
          </a>
        </div>
      </div>
    </div>
  )
}
