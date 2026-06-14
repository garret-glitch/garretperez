'use client'
import { useState, useEffect, useCallback } from 'react'

interface Tick {
  key: string
  name: string
  display: string
  category: string
  unit: string
  price: number | null
  change: number | null
  changePercent: number | null
  marketState: string | null
}

const REFRESH_MS = 30_000

const S = {
  card:     '#1a1612',
  elevated: '#201c16',
  border:   'rgba(200,155,60,0.28)',
  gold:     '#c89b3c',
  goldDim:  '#a07838',
  text1:    '#f0e8d8',
  text2:    '#c8a878',
  text3:    '#9a7a50',
  text4:    '#6a5030',
  up:       '#5abf72',
  upBorder: '#2a7040',
  upBg:     '#0e2216',
  down:     '#d46060',
  downBorder:'#7a2828',
  downBg:   '#220e0e',
}

function fmtPrice(price: number | null, key: string): string {
  if (price === null) return '—'
  if (key === 'btc') return '$' + Math.round(price).toLocaleString('en-US')
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDelta(change: number | null, pct: number | null, key: string): string {
  if (change === null || pct === null) return '—'
  const sign = change >= 0 ? '+' : '−'
  const abs  = Math.abs(change)
  const pctStr = `${change >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`
  if (key === 'btc') return `${sign}$${Math.round(abs).toLocaleString('en-US')} (${pctStr})`
  return `${sign}$${abs.toFixed(2)} (${pctStr})`
}

function StockRow({ tick, rank }: { tick: Tick; rank: number }) {
  const up = (tick.change ?? 0) >= 0
  const loaded = tick.price !== null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: loaded ? (up ? S.upBg : S.downBg) : S.card,
      border: `1px solid ${loaded ? (up ? S.upBorder : S.downBorder) : 'rgba(200,155,60,0.15)'}`,
      borderLeft: `3px solid ${loaded ? (up ? S.up : S.down) : S.text4}`,
      padding: '13px 18px',
    }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, width: 18, flexShrink: 0, textAlign: 'right' }}>
        {rank}
      </div>
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 7,
        color: S.gold, letterSpacing: '0.06em', width: 46, flexShrink: 0,
      }}>
        {tick.display}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2,
        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {tick.name}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
        color: S.text1, fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 82, textAlign: 'right',
      }}>
        {loaded ? fmtPrice(tick.price, tick.key) : <span style={{ color: S.text4 }}>—</span>}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
        color: loaded ? (up ? S.up : S.down) : S.text4,
        flexShrink: 0, minWidth: 120, textAlign: 'right',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
      }}>
        {loaded && <span style={{ fontSize: 11 }}>{up ? '▲' : '▼'}</span>}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {loaded ? `${up ? '+' : '−'}${Math.abs(tick.changePercent ?? 0).toFixed(2)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

function TickCard({ tick }: { tick: Tick }) {
  const up = (tick.change ?? 0) >= 0
  const loaded = tick.price !== null

  return (
    <div style={{
      background:    loaded ? (up ? S.upBg : S.downBg) : S.card,
      border:        `1px solid ${loaded ? (up ? S.upBorder : S.downBorder) : S.border}`,
      padding:       '20px',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'flex-start',
      gap:           14,
      position:      'relative',
      overflow:      'hidden',
      height:        '100%',
      boxSizing:     'border-box',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: loaded
          ? (up ? 'linear-gradient(90deg, transparent, #2a7040, transparent)'
                : 'linear-gradient(90deg, transparent, #7a2828, transparent)')
          : 'linear-gradient(90deg, transparent, #7a5a20, transparent)',
      }} />

      <div style={{
        flexShrink: 0, width: 54, height: 54,
        background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: tick.category === 'metals' ? "'Press Start 2P', monospace" : 'Inter, sans-serif',
        fontSize:   tick.category === 'metals' ? 12 : 20,
        fontWeight: tick.category !== 'metals' ? 900 : 400,
        color: S.gold,
        letterSpacing: tick.category === 'metals' ? '0.04em' : 0,
      }}>
        {tick.display}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          color: S.text3, letterSpacing: '0.1em', marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {tick.name.toUpperCase()}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 800,
          color: S.text1, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
          lineHeight: 1, marginBottom: 8, whiteSpace: 'nowrap',
        }}>
          {loaded ? fmtPrice(tick.price, tick.key) : (
            <span style={{ color: S.text4 }}>Loading…</span>
          )}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
          color: loaded ? (up ? S.up : S.down) : S.text4,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {loaded && <span style={{ fontSize: 15, lineHeight: 1 }}>{up ? '▲' : '▼'}</span>}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {loaded ? fmtDelta(tick.change, tick.changePercent, tick.key) : '—'}
          </span>
        </div>
      </div>

      {tick.marketState && tick.marketState !== 'REGULAR' && (
        <div style={{
          position: 'absolute', bottom: 10, right: 12,
          fontFamily: "'Press Start 2P', monospace", fontSize: 6,
          color: S.text4, letterSpacing: '0.06em',
        }}>
          {tick.marketState}
        </div>
      )}
    </div>
  )
}

export default function MarketDashboard() {
  const [data,       setData]       = useState<Tick[] | null>(null)
  const [updatedAt,  setUpdatedAt]  = useState<Date | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [secsAgo,    setSecsAgo]    = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch('/api/market-data')
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.data)
      setUpdatedAt(new Date())
      setSecsAgo(0)
      setError(null)
    } catch {
      setError('Could not reach market data — retrying automatically.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(() => fetchData(), REFRESH_MS)
    return () => clearInterval(iv)
  }, [fetchData])

  useEffect(() => {
    if (!updatedAt) return
    const iv = setInterval(() => setSecsAgo(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [updatedAt])

  const metals  = data?.filter(d => d.category === 'metals')  ?? []
  const crypto  = data?.filter(d => d.category === 'crypto')  ?? []
  const stocks  = data?.filter(d => d.category === 'stocks')  ?? []

  const timeStr = updatedAt?.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }) ?? ''

  const SectionHead = ({ icon, label, badge, color }: { icon: string; label: string; badge: string; color: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
      background: 'rgba(200,155,60,0.04)',
      border: '1px solid rgba(200,155,60,0.14)',
      borderLeft: '3px solid #c89b3c',
      padding: '10px 14px',
    }}>
      <span style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: 8,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>
        {icon}
      </span>
      <span style={{
        flex: 1,
        fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
        color: '#dcc898', letterSpacing: '0.01em',
      }}>
        {label}
      </span>
      <span style={{
        flexShrink: 0,
        background: 'rgba(200,155,60,0.13)',
        border: '1px solid rgba(200,155,60,0.32)',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 8,
        fontFamily: "'Press Start 2P', monospace",
        color: '#c89b3c',
        letterSpacing: '0.04em',
      }}>
        {badge}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        background: S.card, border: `1px solid rgba(200,155,60,0.15)`,
        padding: '12px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="market-live-dot" />
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 7,
            color: '#5abf72', letterSpacing: '0.12em',
          }}>LIVE</span>
          {updatedAt && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
              · Updated {timeStr}{secsAgo > 0 ? ` (${secsAgo}s ago)` : ''}
            </span>
          )}
          {loading && !data && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text4 }}>
              Fetching market data…
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {error && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#d46060' }}>
              {error}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              background: 'transparent', border: `1px solid rgba(200,155,60,0.25)`,
              color: S.goldDim, fontFamily: 'Inter, sans-serif', fontSize: 13,
              padding: '5px 14px', cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            {refreshing ? '…' : '↻ Refresh'}
          </button>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4 }}>
            Auto · 30s
          </span>
        </div>
      </div>

      {/* ── Precious Metals ── */}
      <div>
        <SectionHead icon="🪙" label="Precious Metals" badge="SPOT" color="#2a1808" />
        <div className="grid sm:grid-cols-3 gap-4">
          {metals.length > 0
            ? metals.map(t => <TickCard key={t.key} tick={t} />)
            : ['gold','silver','platinum'].map(k => (
                <TickCard key={k} tick={{ key:k, name:k, display:'—', category:'metals', unit:'/oz', price:null, change:null, changePercent:null, marketState:null }} />
              ))
          }
        </div>
      </div>

      {/* ── Cryptocurrency ── */}
      <div>
        <SectionHead icon="🔗" label="Cryptocurrency" badge="24H" color="#0c1830" />
        <div className="grid sm:grid-cols-2 gap-4">
          {crypto.length > 0
            ? crypto.map(t => <TickCard key={t.key} tick={t} />)
            : ['btc','eth'].map(k => (
                <TickCard key={k} tick={{ key:k, name:k, display:'—', category:'crypto', unit:'', price:null, change:null, changePercent:null, marketState:null }} />
              ))
          }
        </div>
      </div>

      {/* ── Top 10 US Stocks ── */}
      <div>
        <SectionHead icon="🏆" label="Top 10 US Stocks" badge="TOP 10" color="#0e2018" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stocks.length > 0
            ? stocks.map((t, i) => <StockRow key={t.key} tick={t} rank={i + 1} />)
            : ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK.B','AVGO','JPM'].map((sym, i) => (
                <StockRow key={sym} rank={i + 1} tick={{ key: sym.toLowerCase(), name: sym, display: sym, category: 'stocks', unit: '', price: null, change: null, changePercent: null, marketState: null }} />
              ))
          }
        </div>
      </div>

    </div>
  )
}
