import type { HeroBlockConfig } from '@/types/builder'
import { Phone, Mail, FileText } from 'lucide-react'

/** "#c89b3c" → "200, 155, 60" (falls back to the default gold on bad input) */
function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return '200, 155, 60'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

interface Props {
  cfg: HeroBlockConfig
  headshot: string                 // fallback photo (SiteSetting) if cfg.heroPhoto empty
  totalMembers: number
  totalPosts: number
  garretLevel: number
  xpBar: { currentXp: number; neededXp: number; percent: number }
  style?: React.CSSProperties      // block.styles applied to the .hero-panel shell
  className?: string
}

export default function HeroCard({
  cfg, headshot, totalMembers, totalPosts, garretLevel, xpBar, style, className,
}: Props) {
  const gold = cfg.accentColor || '#c89b3c'
  const rgb = hexToRgb(gold)
  const ga = (a: number) => `rgba(${rgb}, ${a})`

  const photo = cfg.heroPhoto || headshot
  const initials = (cfg.heroName || 'GP').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'GP'

  const stats = [
    cfg.showStats ? { value: totalMembers, label: cfg.statMembersLabel, small: false } : null,
    cfg.showStats ? { value: totalPosts,   label: cfg.statPostsLabel,   small: true  } : null,
    cfg.showStats ? { value: garretLevel,  label: cfg.statLevelLabel,   small: true  } : null,
  ].filter(Boolean) as Array<{ value: number; label: string; small: boolean }>

  const phone = cfg.contactPhone
  const email = cfg.contactEmail
  const linkedin = cfg.contactLinkedin

  const rootStyle: React.CSSProperties = {
    overflow: 'visible',
    ...style,
    ...(cfg.heroBgImage ? { backgroundImage: `url(${cfg.heroBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
  }

  // Photo element (shared desktop/mobile, sized by caller)
  const PhotoBox = ({ size, font }: { size: number; font: number }) => (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `3px solid ${gold}`,
      boxShadow: `0 0 0 5px ${ga(0.1)}, 0 10px 40px rgba(0,0,0,0.7)`,
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)', color: gold, fontSize: font, fontWeight: 700,
    }}>
      {photo
        ? <img src={photo} alt={cfg.heroName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )

  // Contact rows — desktop column / mobile stack share the same data
  const contactRows = [
    cfg.showContact && cfg.showPhone && (
      <a key="phone" href={`tel:${phone.replace(/\D/g, '')}`} style={{ textDecoration: 'none', display: 'block', padding: '10px 14px', background: ga(0.08), borderLeft: `3px solid ${gold}` }} className="hover:brightness-110 transition-all">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Phone size={11} color={gold} strokeWidth={2} />
          <span style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Phone</span>
        </div>
        <div className="body-text" style={{ fontSize: 14, color: '#f8edb0', fontWeight: 700 }}>{phone}</div>
      </a>
    ),
    cfg.showContact && cfg.showEmail && (
      <a key="email" href={`mailto:${email}`} style={{ textDecoration: 'none', display: 'block', padding: '10px 14px', background: 'rgba(60,110,200,0.1)', borderLeft: '3px solid #7090c8' }} className="hover:brightness-110 transition-all">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Mail size={11} color="#7090c8" strokeWidth={2} />
          <span style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Email</span>
        </div>
        <div className="body-text" style={{ fontSize: 14, color: '#f8edb0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
      </a>
    ),
    cfg.showContact && cfg.showLinkedin && (
      <a key="linkedin" href={`https://www.linkedin.com/in/${linkedin}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', padding: '10px 14px', background: 'rgba(0,90,200,0.1)', borderLeft: '3px solid #4a88d0' }} className="hover:brightness-110 transition-all">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#6098d8', fontSize: 11, lineHeight: 1, userSelect: 'none' }}>in</span>
          <span style={{ fontSize: 7, color: '#9a7848', textTransform: 'uppercase', letterSpacing: '0.12em' }}>LinkedIn</span>
        </div>
        <div className="body-text" style={{ fontSize: 15, color: '#f8edb0', fontWeight: 700 }}>in/{linkedin}</div>
      </a>
    ),
  ].filter(Boolean)

  const ResumeBtn = ({ mt }: { mt: number }) => (
    <a href="/resume"
      className="body-text flex items-center justify-center gap-3 hover:brightness-110 transition-all"
      style={{
        background: 'linear-gradient(135deg, #1e1608 0%, #2a1e0c 100%)',
        color: '#f5e8c0', border: `1.5px solid ${ga(0.6)}`,
        fontSize: 14, fontWeight: 700, padding: '15px', marginTop: mt,
        textDecoration: 'none', letterSpacing: '0.02em',
        boxShadow: `0 0 18px ${ga(0.25)}`, display: 'flex',
      }}>
      <FileText size={17} strokeWidth={2.2} />
      View Resume
    </a>
  )

  const XpBar = ({ h }: { h: number }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 5.5, color: '#8a6838', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: "'Press Start 2P', monospace" }}>⚡ Level</span>
        <span className="body-text" style={{ fontSize: 8, color: 'var(--text-3)' }}>{xpBar.currentXp} / {xpBar.neededXp} XP</span>
      </div>
      <div style={{ height: h, background: 'rgba(0,0,0,0.4)', border: `1px solid ${ga(0.3)}`, overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: '100%', width: `${xpBar.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #4a9a28)', position: 'relative', transition: 'width 0.6s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className={`hero-panel flex-1 min-w-0 ${className ?? ''}`} style={rootStyle}>

      {/* ── DESKTOP: 3-col grid ─────────────────────────────── */}
      <div className="hidden sm:grid" style={{
        gridTemplateColumns: `${cfg.showPhoto ? '200px ' : ''}1fr ${cfg.showContact ? '250px' : ''}`.trim(),
        gap: 28, minHeight: 210, alignItems: 'stretch',
      }}>

        {/* Col 1 — Photo */}
        {cfg.showPhoto && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhotoBox size={200} font={38} />
          </div>
        )}

        {/* Col 2 — Identity + Stats + XP */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>

          <div style={{ marginBottom: 14 }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif", fontSize: 30, fontWeight: 700, lineHeight: 1.1,
              color: 'var(--text-1)', textShadow: `0 0 28px ${ga(0.5)}, 1px 2px 4px rgba(0,0,0,0.9)`,
              letterSpacing: '0.04em', margin: 0,
            }}>{cfg.heroName}</h1>
            {cfg.showTitle && cfg.heroTitle && (
              <div className="body-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginTop: 6 }}>{cfg.heroTitle}</div>
            )}
            <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>📍 {cfg.heroLocation}</div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg, ${ga(0.35)} 0%, transparent 100%)`, marginBottom: 14 }} />

          {(cfg.showStats || cfg.showCta) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {cfg.showStats && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {stats.map((stat, i) => {
                    const highlight = i === stats.length - 1 && cfg.statLevelLabel === stat.label
                    return (
                      <div key={stat.label + i} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: stat.small ? '7px 12px' : '10px 18px',
                        background: highlight ? ga(0.13) : ga(0.07),
                        border: `1px solid ${ga(highlight ? 0.45 : 0.22)}`,
                        boxShadow: highlight ? `0 0 12px ${ga(0.18)}` : 'none',
                      }}>
                        <span className="body-text" style={{ fontSize: stat.small ? 15 : 22, fontWeight: 700, color: gold, lineHeight: 1, marginBottom: stat.small ? 4 : 5 }}>{stat.value}</span>
                        <span style={{ fontSize: stat.small ? 5 : 5.5, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {cfg.showCta && (
                <div style={{ borderLeft: cfg.showStats ? `1px solid ${ga(0.2)}` : 'none', paddingLeft: cfg.showStats ? 14 : 0, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>⚡</span>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#e8c060', letterSpacing: '0.03em' }}>{cfg.ctaTitle}</span>
                  </div>
                  <p className="body-text" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{cfg.ctaText}</p>
                </div>
              )}
            </div>
          )}

          {cfg.showXpBar && <XpBar h={10} />}
        </div>

        {/* Col 3 — Contact */}
        {cfg.showContact && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contactRows}
            </div>
            {cfg.showResume && <ResumeBtn mt={12} />}
          </div>
        )}
      </div>

      {/* ── MOBILE: premium centered layout ──────────────────── */}
      <div className="sm:hidden flex flex-col" style={{ gap: 16 }}>

        {cfg.showPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PhotoBox size={140} font={36} />
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 700, lineHeight: 1.15,
            color: 'var(--text-1)', textShadow: `0 0 20px ${ga(0.45)}, 1px 1px 3px rgba(0,0,0,0.9)`,
            letterSpacing: '0.04em', marginBottom: 7,
          }}>{cfg.heroName}</h1>
          {cfg.showTitle && cfg.heroTitle && (
            <div className="body-text" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 5 }}>{cfg.heroTitle}</div>
          )}
          <div className="body-text" style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {cfg.heroLocation}</div>
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${ga(0.5)} 25%, ${ga(0.5)} 75%, transparent 100%)` }} />

        {cfg.showStats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.map((stat, i) => (
              <div key={stat.label + i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: stat.small ? '7px 14px' : '10px 14px',
                background: ga(0.07), border: `1px solid ${ga(0.22)}`,
              }}>
                <span style={{ fontSize: stat.small ? 7 : 8, color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>{stat.label}</span>
                <span className="body-text" style={{ fontSize: stat.small ? 14 : 20, fontWeight: 700, color: gold, lineHeight: 1 }}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {cfg.showCta && (
          <div style={{ padding: '14px 16px', background: ga(0.06), border: `1px solid ${ga(0.22)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#e8c060' }}>{cfg.ctaTitle}</span>
            </div>
            <p className="body-text" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{cfg.ctaText}</p>
          </div>
        )}

        {cfg.showXpBar && <XpBar h={12} />}

        {cfg.showContact && (
          <>
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${ga(0.4)} 25%, ${ga(0.4)} 75%, transparent 100%)` }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {contactRows}
              {cfg.showResume && <ResumeBtn mt={2} />}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
