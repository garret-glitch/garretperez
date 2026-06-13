'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const SPECIES = [
  'Largemouth Bass','Smallmouth Bass','Striped Bass','Spotted Bass',
  'Channel Catfish','Blue Catfish','Flathead Catfish',
  'Crappie (Black)','Crappie (White)','Bluegill','Redear Sunfish',
  'White Bass','Striped Hybrid Bass','Carp','Rainbow Trout','Alligator Gar','Other',
]
const SPOTS = [
  'Lake Travis','Lake Austin','Canyon Lake','Lady Bird Lake',
  'Barton Creek','Town Lake / Colorado River','Inks Lake','Lake Georgetown',
  'Granger Lake','Belton Lake','Stillhouse Hollow Lake',
  'River / Creek','Local Pond','Private Tank','Gulf Coast / Bay','Other',
]
const BAITS = [
  'Live Shiner','Live Worm / Nightcrawler','Live Crawfish','Live Perch',
  'Chicken Liver','Cut Bait','Corn','Powerbait','Dough Bait','Stink Bait','Other',
]
const LURES = [
  'Crankbait','Spinnerbait','Topwater Frog','Texas Rig (Plastic Worm)',
  'Carolina Rig','Ned Rig','Drop Shot','Jig','Swimbait','Spoon',
  'Chatterbait','Buzzbait','Finesse Worm','Flutter Spoon','Other',
]
const WATER_CONDITIONS = [
  'Clear','Slightly Murky','Murky','Stained Green','Stained Brown',
  'Cold (< 60°F)','Cool (60–69°F)','Warm (70–79°F)','Hot (80°F+)',
  'Calm / Flat','Choppy',
]
const WEATHER = [
  'Sunny / Clear','Partly Cloudy','Overcast','Light Rain',
  'After Rain','Windy','Pre-Cold Front','Post-Cold Front',
]
const TIMES = [
  'Pre-Dawn (Before 5 AM)','Early Morning (5–8 AM)','Morning (8–11 AM)',
  'Midday (11 AM–2 PM)','Afternoon (2–5 PM)','Evening (5–8 PM)','Night (After 8 PM)',
]

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface FormData {
  title: string; species: string; length: string; weight: string
  spot: string; location: string; bait: string; lure: string
  rod: string; water: string; weather: string; timeOfDay: string; notes: string
}
const EMPTY: FormData = {
  title:'', species:'', length:'', weight:'',
  spot:'', location:'', bait:'', lure:'',
  rod:'', water:'', weather:'', timeOfDay:'', notes:'',
}

const S = {
  card:     '#12100e',
  elevated: '#1c1812',
  border:   'rgba(200,155,60,0.2)',
  water:    '#c89b3c',
  gold:     '#c89b3c',
  text1:    '#f0d898',
  text2:    '#c8a870',
  text3:    '#907848',
}

export default function FishingCatchForm() {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [open,        setOpen]       = useState(false)
  const [form,        setForm]       = useState<FormData>(EMPTY)
  const [imgSrc,      setImgSrc]     = useState<string | null>(null)
  const [imgLoading,  setImgLoading] = useState(false)
  const [status,      setStatus]     = useState<'idle'|'submitting'|'success'|'error'>('idle')
  const [msg,         setMsg]        = useState('')

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMsg('Please select an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { setMsg('Image must be under 10 MB.'); return }
    setImgLoading(true)
    try { setImgSrc(await compressImage(file)) }
    catch { setMsg('Could not load image.') }
    setImgLoading(false)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setStatus('submitting')

    const catchData = {
      __catchData: true,
      ...(form.species   && { species:   form.species }),
      ...(form.length    && { length:    form.length }),
      ...(form.weight    && { weight:    form.weight }),
      ...(form.spot      && { spot:      form.spot }),
      ...(form.location  && { location:  form.location }),
      ...(form.bait      && { bait:      form.bait }),
      ...(form.lure      && { lure:      form.lure }),
      ...(form.rod       && { rod:       form.rod }),
      ...(form.water     && { water:     form.water }),
      ...(form.weather   && { weather:   form.weather }),
      ...(form.timeOfDay && { timeOfDay: form.timeOfDay }),
      ...(form.notes     && { notes:     form.notes }),
    }

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'FISHING',
        title: form.title.trim(),
        body:  JSON.stringify(catchData),
        ...(imgSrc ? { imageUrl: imgSrc } : {}),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      emitXpGained(data.xpAwarded ?? 50)
      setForm(EMPTY); setImgSrc(null); setOpen(false)
      setStatus('success'); setMsg(`+${data.xpAwarded ?? 50} Fishing XP!`)
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    } else {
      setStatus('error')
      setMsg(res.status === 401 ? 'You must be logged in.' : 'Something went wrong.')
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    }
  }

  function close() { setOpen(false); setForm(EMPTY); setImgSrc(null) }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 24px',
          background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
          border: 'none', color: '#0a0600',
          fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
        }}>
          🎣 Log a Catch
          <span style={{
            background: 'rgba(0,0,0,0.18)', padding: '2px 9px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          }}>+50 XP</span>
        </button>
        {msg && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#cc6060' : '#60aa60' }}>
            {msg}
          </span>
        )}
      </div>
    )
  }

  const inp: React.CSSProperties = {
    width: '100%', background: S.elevated,
    border: `1px solid ${S.border}`, color: S.text1,
    padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer', appearance: 'none' }
  const lbl: React.CSSProperties = {
    fontFamily: "'Press Start 2P', monospace", fontSize: 7,
    color: '#907848', letterSpacing: '0.12em', display: 'block', marginBottom: 7,
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: S.card,
      border: `1px solid ${S.border}`,
      borderTop: `2px solid ${S.water}`,
      padding: 24,
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
          🎣 LOG A CATCH
        </div>
        <button type="button" onClick={close} style={{
          background: 'none', border: 'none', color: S.text3,
          fontSize: 20, cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Photo upload */}
      <div style={{ marginBottom: 22 }}>
        {imgSrc ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="Catch preview" style={{
              width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block',
              border: `1px solid ${S.border}`,
            }} />
            <button type="button" onClick={() => setImgSrc(null)} style={{
              position: 'absolute', top: 8, right: 8,
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.75)', border: 'none',
              color: '#e8e6e0', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
            <button type="button" onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', bottom: 8, right: 8,
              padding: '6px 14px', background: 'rgba(0,0,0,0.75)',
              border: `1px solid ${S.border}`, color: S.text2,
              fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
            }}>📷 Change Photo</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={imgLoading}
            style={{
              width: '100%', padding: '36px 20px',
              background: S.elevated, border: `2px dashed rgba(200,155,60,0.22)`,
              color: S.text3, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,60,0.22)' }}
          >
            <span style={{ fontSize: 30 }}>📷</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600 }}>
              {imgLoading ? 'Loading...' : 'Add Catch Photo'}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Click to upload · optional</span>
          </button>
        )}
      </div>

      {/* Catch title */}
      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>CATCH TITLE *</label>
        <input
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Monster Bass at Lake Travis!"
          maxLength={120} required style={inp}
        />
      </div>

      {/* Species / Length / Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
        <div>
          <label style={lbl}>SPECIES</label>
          <select value={form.species} onChange={e => set('species', e.target.value)} style={sel}>
            <option value="">Select species...</option>
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>LENGTH (inches)</label>
          <input type="number" step="0.1" min="0" max="120"
            value={form.length} onChange={e => set('length', e.target.value)}
            placeholder="e.g. 18" style={inp} />
        </div>
        <div>
          <label style={lbl}>WEIGHT (lbs)</label>
          <input type="number" step="0.1" min="0" max="200"
            value={form.weight} onChange={e => set('weight', e.target.value)}
            placeholder="e.g. 3.5" style={inp} />
        </div>
      </div>

      {/* Spot / Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
        <div>
          <label style={lbl}>FISHING SPOT / LAKE</label>
          <select value={form.spot} onChange={e => set('spot', e.target.value)} style={sel}>
            <option value="">Select spot...</option>
            {SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>SPECIFIC LOCATION (optional)</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="e.g. North boat ramp, Cove 3..."
            maxLength={80} style={inp} />
        </div>
      </div>

      {/* Bait / Lure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
        <div>
          <label style={lbl}>BAIT USED</label>
          <select value={form.bait} onChange={e => set('bait', e.target.value)} style={sel}>
            <option value="">Select bait...</option>
            {BAITS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>LURE USED</label>
          <select value={form.lure} onChange={e => set('lure', e.target.value)} style={sel}>
            <option value="">Select lure...</option>
            {LURES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Conditions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
        <div>
          <label style={lbl}>WATER CONDITIONS</label>
          <select value={form.water} onChange={e => set('water', e.target.value)} style={sel}>
            <option value="">Select...</option>
            {WATER_CONDITIONS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>WEATHER</label>
          <select value={form.weather} onChange={e => set('weather', e.target.value)} style={sel}>
            <option value="">Select...</option>
            {WEATHER.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>TIME OF DAY</label>
          <select value={form.timeOfDay} onChange={e => set('timeOfDay', e.target.value)} style={sel}>
            <option value="">Select...</option>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Rod/Reel */}
      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>ROD / REEL SETUP (optional)</label>
        <input value={form.rod} onChange={e => set('rod', e.target.value)}
          placeholder="e.g. Shimano Stradic 2500 + 7ft Medium Fast, 10lb mono"
          maxLength={120} style={inp} />
      </div>

      {/* Story */}
      <div style={{ marginBottom: 24 }}>
        <label style={lbl}>STORY / NOTES (optional)</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Tell the story — where you were, how long the fight lasted, any tips for the spot..."
          rows={4}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        {msg && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#cc6060' : '#60aa60' }}>
            {msg}
          </span>
        )}
        <button type="button" onClick={close} style={{
          padding: '10px 20px', background: 'transparent',
          border: `1px solid rgba(200,155,60,0.25)`, color: S.text2,
          fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer',
        }}>Cancel</button>
        <button type="submit"
          disabled={status === 'submitting' || !form.title.trim()}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
            border: 'none', color: '#0a0600',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: status === 'submitting' || !form.title.trim() ? 'not-allowed' : 'pointer',
            opacity: status === 'submitting' || !form.title.trim() ? 0.5 : 1,
          }}
        >
          {status === 'submitting' ? 'Posting...' : '🎣 Post Catch +50 XP'}
        </button>
      </div>
    </form>
  )
}
