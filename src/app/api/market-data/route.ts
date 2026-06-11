import { NextResponse } from 'next/server'

const ASSETS = [
  { key: 'gold',     symbol: 'GC=F',    name: 'Gold',             display: 'Au',  category: 'metals', unit: '/oz' },
  { key: 'silver',   symbol: 'SI=F',    name: 'Silver',           display: 'Ag',  category: 'metals', unit: '/oz' },
  { key: 'platinum', symbol: 'PL=F',    name: 'Platinum',         display: 'Pt',  category: 'metals', unit: '/oz' },
  { key: 'btc',      symbol: 'BTC-USD', name: 'Bitcoin',          display: '₿',   category: 'crypto', unit: '' },
  { key: 'eth',      symbol: 'ETH-USD', name: 'Ethereum',         display: 'Ξ',   category: 'crypto', unit: '' },
  { key: 'nasdaq',   symbol: '^IXIC',   name: 'NASDAQ Composite', display: 'IXIC',category: 'index',  unit: '' },
]

export async function GET() {
  try {
    const symbolStr = ASSETS.map(a => a.symbol.replace('^', '%5E')).join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolStr}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`)

    const json = await res.json()
    const quotes: Record<string, number | string | null>[] = json?.quoteResponse?.result ?? []

    const data = ASSETS.map(a => {
      const q = quotes.find(q => q.symbol === a.symbol)
      return {
        key:           a.key,
        name:          a.name,
        display:       a.display,
        category:      a.category,
        unit:          a.unit,
        price:         (q?.regularMarketPrice as number) ?? null,
        change:        (q?.regularMarketChange as number) ?? null,
        changePercent: (q?.regularMarketChangePercent as number) ?? null,
        marketState:   (q?.marketState as string) ?? null,
      }
    })

    return NextResponse.json({ data, timestamp: Date.now() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
