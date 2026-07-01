'use client'
import { useState } from 'react'

interface GoodieApp {
  id: string
  name: string
  icon: string
  blurb: string
  accent: string
}

const APPS: GoodieApp[] = [
  {
    id: 'pokemon-restock',
    name: 'Pokémon Restock Radar',
    icon: '📡',
    blurb: 'Catch Pokémon card restocks & get instant Discord alerts.',
    accent: '#c89b3c',
  },
]

export default function AdminGoodiesPage() {
  const [open, setOpen] = useState<string | null>(null)
  const active = APPS.find(a => a.id === open) || null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>
          🎁 Admin Goodies
        </h1>
        <p className="text-[7px] mt-0.5" style={{ color: 'var(--text-2)' }}>
          Personal tools & apps — admin only
        </p>
      </div>

      {/* App grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {APPS.map(app => (
          <button
            key={app.id}
            onClick={() => setOpen(app.id)}
            className="osrs-panel-dark rounded-xl flex flex-col items-center text-center gap-2 py-4 px-2 transition-all"
            style={{ cursor: 'pointer', minHeight: 120 }}
          >
            <span
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: 48,
                height: 48,
                fontSize: 26,
                background: 'var(--bg-elevated)',
                border: `2px solid ${app.accent}`,
                boxShadow: `0 2px 10px ${app.accent}33`,
              }}
            >
              {app.icon}
            </span>
            <span className="text-[8px] font-bold leading-tight" style={{ color: 'var(--gold)' }}>
              {app.name}
            </span>
            <span className="text-[6px] leading-snug" style={{ color: 'var(--text-2)' }}>
              {app.blurb}
            </span>
          </button>
        ))}

        {/* Placeholder — more goodies to come */}
        <div
          className="rounded-xl flex flex-col items-center justify-center text-center gap-1 py-4 px-2"
          style={{
            minHeight: 120,
            border: '2px dashed var(--border)',
            color: 'var(--text-3)',
          }}
        >
          <span style={{ fontSize: 22, opacity: 0.5 }}>➕</span>
          <span className="text-[6px]">More goodies coming soon</span>
        </div>
      </div>

      {/* Detail modal */}
      {active && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="osrs-panel-dark rounded-xl w-full max-w-lg overflow-y-auto"
            style={{ maxHeight: '86vh', borderColor: active.accent }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 22 }}>{active.icon}</span>
              <h2 className="text-[11px] font-bold flex-1" style={{ color: 'var(--gold)' }}>
                {active.name}
              </h2>
              <button
                onClick={() => setOpen(null)}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: 'var(--text-2)', background: 'var(--bg-elevated)', cursor: 'pointer' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {active.id === 'pokemon-restock' && <PokemonRestockApp />}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── The Pokémon Restock Radar app content ─────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[8px] font-bold mb-1.5" style={{ color: 'var(--text-1)' }}>{title}</div>
      {children}
    </div>
  )
}

const ALERT_SERVERS = [
  { name: 'TrackaLacker', note: '37k+ collectors, 100% free, everyone gets the same drop', href: 'https://www.trackalacker.com/articles/news/best-free-pokemon-restocks-discord-server' },
  { name: 'PokePings', note: 'Ranked #1 for speed, free while in beta', href: 'https://discord.com/invite/pokemonrestocks' },
  { name: 'Pokémon Restocks & Alerts', note: 'Large free community', href: 'https://discord.com/invite/pkmnalerts' },
]

function PokemonRestockApp() {
  return (
    <div className="body-text">
      <p className="text-[8px] mb-4 leading-relaxed" style={{ color: 'var(--text-2)' }}>
        Two layers: <b style={{ color: 'var(--text-1)' }}>free alert servers</b> for reliable 24/7 coverage,
        plus your own <b style={{ color: 'var(--text-1)' }}>custom monitor</b> as a bonus.
      </p>

      <Section title="① Join free alert servers (works today)">
        <div className="space-y-2">
          {ALERT_SERVERS.map(s => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="text-[8px] font-bold" style={{ color: 'var(--gold)' }}>{s.name} ↗</div>
              <div className="text-[7px] mt-0.5" style={{ color: 'var(--text-2)' }}>{s.note}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section title="② Best drop windows">
        <ul className="text-[7px] space-y-1" style={{ color: 'var(--text-2)' }}>
          <li>• <b style={{ color: 'var(--text-1)' }}>Walmart</b> — Wed / Thu mornings</li>
          <li>• <b style={{ color: 'var(--text-1)' }}>Pokémon Center</b> — Tue &amp; Thu</li>
          <li>• <b style={{ color: 'var(--text-1)' }}>Target</b> — Sun / Mon</li>
        </ul>
      </Section>

      <Section title="③ Your custom monitor">
        <div className="rounded-lg px-3 py-2 text-[7px] leading-relaxed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <p className="mb-1">
            Files live on your PC at{' '}
            <code style={{ color: 'var(--gold)' }}>Downloads\pokemon-monitor</code>.
          </p>
          <p className="mb-1">
            To watch a new set: open <code style={{ color: 'var(--gold)' }}>products.txt</code>,
            add a line <code style={{ color: 'var(--gold)' }}>Nickname | link</code>, save. Done.
          </p>
          <p style={{ color: '#e0b060' }}>
            ⚠️ Heads-up: Walmart &amp; Pokémon Center actively block automated checks, so the
            custom monitor is unreliable on those two — keep the free servers as your main backbone.
          </p>
        </div>
      </Section>
    </div>
  )
}
