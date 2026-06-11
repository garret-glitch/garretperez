import { NextResponse } from 'next/server'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}

interface Tick {
  price: number | null
  change: number | null
  changePercent: number | null
  marketState: string | null
}

async function fetchYahooChart(symbol: string): Promise<Tick> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) throw new Error('No price')
    const price: number = meta.regularMarketPrice
    const prev: number  = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.previousClose ?? price
    const change        = price - prev
    const changePercent = prev ? (change / prev) * 100 : 0
    return { price, change, changePercent, marketState: meta.marketState ?? null }
  } catch {
    return { price: null, change: null, changePercent: null, marketState: null }
  }
}

async function fetchCoinGecko(): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    return await res.json()
  } catch {
    return {}
  }
}

function cgToTick(coin: { usd: number; usd_24h_change: number } | undefined): Tick {
  if (!coin) return { price: null, change: null, changePercent: null, marketState: null }
  const price       = coin.usd
  const pctDecimal  = coin.usd_24h_change / 100
  const prev        = price / (1 + pctDecimal)
  const change      = price - prev
  return { price, change, changePercent: coin.usd_24h_change, marketState: 'REGULAR' }
}

export async function GET() {
  const [gold, silver, platinum, nasdaq, cg] = await Promise.all([
    fetchYahooChart('GC=F'),
    fetchYahooChart('SI=F'),
    fetchYahooChart('PL=F'),
    fetchYahooChart('^IXIC'),
    fetchCoinGecko(),
  ])

  const data = [
    { key: 'gold',     name: 'Gold',             display: 'Au',   category: 'metals', unit: '/oz', ...gold },
    { key: 'silver',   name: 'Silver',           display: 'Ag',   category: 'metals', unit: '/oz', ...silver },
    { key: 'platinum', name: 'Platinum',         display: 'Pt',   category: 'metals', unit: '/oz', ...platinum },
    { key: 'btc',      name: 'Bitcoin',          display: '₿',    category: 'crypto', unit: '',    ...cgToTick(cg.bitcoin) },
    { key: 'eth',      name: 'Ethereum',         display: 'Ξ',    category: 'crypto', unit: '',    ...cgToTick(cg.ethereum) },
    { key: 'nasdaq',   name: 'NASDAQ Composite', display: 'IXIC', category: 'index',  unit: '',    ...nasdaq },
  ]

  return NextResponse.json({ data, timestamp: Date.now() }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
