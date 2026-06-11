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
  card:     '#14110d',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.2)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
  up:       '#5abf72',
  upBorder: 'rgba(60,175,90,0.3)',
  upBg:     'rgba(50,140,70,0.04)',
  down:     '#d46060',
  downBorder:'rgba(190,60,60,0.3)',
  downBg:   'rgba(160,40,40,0.05)',
}

function fmtPrice(price: number | null, key: string): string {
  if (price === null) return '—'
  if (key === 'btc')    return '$' + Math.round(price).toLocaleString('en-US')
  if (key === 'nasdaq') return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDelta(change: number | null, pct: number | null, key: string): string {
  if (change === null || pct === null) return '—'
  const sign = change >= 0 ? '+' : '−'
  const abs  = Math.abs(change)
  const pctStr = `${change >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`
  if (key === 'btc')    return `${sign}$${Math.round(abs).toLocaleString('en-US')} (${pctStr})`
  if (key === 'nasdaq') return `${sign}${abs.toFixed(2)} pts (${pctStr})`
  return `${sign}$${abs.toFixed(2)} (${pctStr})`
}

function TickCard({ tick, wide = false }: { tick: Tick; wide?: boolean }) {
  const up = (tick.change ?? 0) >= 0
  const loaded = tick.price !== null

  return (
    <div style={{
      background:  loaded ? (up ? S.upBg   : S.downBg)   : S.card,
      border:      `1px solid ${loaded ? (up ? S.upBorder : S.downBorder) : S.border}`,
      padding:     wide ? '22px 28px' : '20px 20px',
      display:     'flex',
      flexDirection: wide ? 'row' : 'column',
      alignItems:  wide ? 'center' : 'flex-start',
      gap:         wide ? 28 : 14,
      position:    'relative',
      overflow:    'hidden',
      height:      '100%',
      boxSizing:   'border-box',
    }}>
      {/* top gold accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: loaded
          ? (up ? 'linear-gradient(90deg, transparent, rgba(60,175,90,0.5), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(190,60,60,0.5), transparent)')
          : 'linear-gradient(90deg, transparent, rgba(200,155,60,0.25), transparent)',
      }} />

      {/* Symbol badge */}
      <div style={{
        flexShrink:   0,
        background:   'rgba(200,155,60,0.07)',
        border:       '1px solid rgba(200,155,60,0.18)',
        width:        wide ? 68 : 54,
        height:       wide ? 68 : 54,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontFamily:   tick.category === 'metals' ? "'Press Start 2P', monospace" : 'Inter, sans-serif',
        fontSize:     tick.category === 'metals' ? (wide ? 15 : 12) : (wide ? 26 : 20),
        fontWeight:   tick.category !== 'metals' ? 900 : 400,
        color:        S.gold,
        letterSpacing: tick.category === 'metals' ? '0.04em' : 0,
      }}>
        {tick.display}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Asset name label */}
        <div style={{
          fontFamily:    "'Press Start 2P', monospace",
          fontSize:      wide ? 8 : 7,
          color:         S.text3,
          letterSpacing: '0.1em',
          marginBottom:  wide ? 10 : 8,
          whiteSpace:    'nowrap',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
        }}>
          {tick.name.toUpperCase()}
        </div>

        {/* Price */}
        <div style={{
          fontFamily:        'Inter, sans-serif',
          fontSize:          wide ? 34 : 26,
          fontWeight:        800,
          color:             S.text1,
          letterSpacing:     '-0.025em',
          fontVariantNumeric:'tabular-nums',
          lineHeight:        1,
          marginBottom:      wide ? 12 : 8,
          whiteSpace:        'nowrap',
        }}>
          {loaded ? fmtPrice(tick.price, tick.key) : (
            <span style={{ color: S.text4 }}>Loading…</span>
          )}
        </div>

        {/* Change row */}
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   wide ? 15 : 13,
          fontWeight: 600,
          color:      loaded ? (up ? S.up : S.down) : S.text4,
          display:    'flex',
          alignItems: 'center',
          gap:        5,
        }}>
          {loaded && (
            <span style={{ fontSize: wide ? 17 : 15, lineHeight: 1 }}>
              {up ? '▲' : '▼'}
            </span>
          )}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {loaded ? fmtDelta(tick.change, tick.changePercent, tick.key) : '—'}
          </span>
        </div>
      </div>

      {/* Market state badge (REGULAR / PRE / POST / CLOSED) */}
      {tick.marketState && tick.marketState !== 'REGULAR' && (
        <div style={{
          position:   'absolute',
          bottom:     10, right: 12,
          fontFamily: "'Press Start 2P', monospace",
          fontSize:   6,
          color:      S.text4,
          letterSpacing: '0.06em',
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
  const nasdaq  = data?.find(d => d.category === 'index')

  const timeStr = updatedAt?.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }) ?? ''

  const SectionHead = ({ icon, label }: { icon: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 8,
        color: S.goldDim, letterSpacing: '0.12em',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(200,155,60,0.1)' }} />
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
        <SectionHead icon="🪙" label="PRECIOUS METALS" />
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
        <SectionHead icon="🔗" label="CRYPTOCURRENCY" />
        <div className="grid sm:grid-cols-2 gap-4">
          {crypto.length > 0
            ? crypto.map(t => <TickCard key={t.key} tick={t} />)
            : ['btc','eth'].map(k => (
                <TickCard key={k} tick={{ key:k, name:k, display:'—', category:'crypto', unit:'', price:null, change:null, changePercent:null, marketState:null }} />
              ))
          }
        </div>
      </div>

      {/* ── Markets / Indices ── */}
      <div>
        <SectionHead icon="📈" label="MARKETS" />
        {nasdaq
          ? <TickCard tick={nasdaq} wide />
          : <TickCard wide tick={{ key:'nasdaq', name:'NASDAQ Composite', display:'IXIC', category:'index', unit:'', price:null, change:null, changePercent:null, marketState:null }} />
        }
      </div>

    </div>
  )
}
