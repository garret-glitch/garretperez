'use client'
import { useEffect, useState } from 'react'

interface Settings {
  headshot?: string
  hero_title?: string
  hero_location?: string
  bio_1?: string
  bio_2?: string
  bio_3?: string
  contact_phone?: string
  contact_email?: string
  contact_linkedin?: string
}

export default function AdminHomepagePage() {
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // Hero info
  const [heroTitle, setHeroTitle] = useState('')
  const [heroLocation, setHeroLocation] = useState('')

  // Bio
  const [bio1, setBio1] = useState('')
  const [bio2, setBio2] = useState('')
  const [bio3, setBio3] = useState('')

  // Contact
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [linkedin, setLinkedin] = useState('')

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/homepage')
      const data = await res.json()
      const s: Settings = data.settings ?? {}
      setHeroTitle(s.hero_title ?? '')
      setHeroLocation(s.hero_location ?? '')
      setBio1(s.bio_1 ?? '')
      setBio2(s.bio_2 ?? '')
      setBio3(s.bio_3 ?? '')
      setPhone(s.contact_phone ?? '')
      setEmail(s.contact_email ?? '')
      setLinkedin(s.contact_linkedin ?? '')
      if (s.headshot) setPhotoPreview(s.headshot)
    } catch {
      showMsg('Failed to load settings.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function postKey(key: string, value: string) {
    const res = await fetch('/api/admin/homepage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  async function saveHero() {
    try {
      await postKey('hero_title', heroTitle)
      await postKey('hero_location', heroLocation)
      showMsg('Hero info saved!')
    } catch {
      showMsg('Failed to save.', 'err')
    }
  }

  async function saveBioAll() {
    try {
      await postKey('bio_1', bio1)
      await postKey('bio_2', bio2)
      await postKey('bio_3', bio3)
      showMsg('Bio saved!')
    } catch {
      showMsg('Failed to save bio.', 'err')
    }
  }

  async function saveContact() {
    try {
      await postKey('contact_phone', phone)
      await postKey('contact_email', email)
      await postKey('contact_linkedin', linkedin)
      showMsg('Contact info saved!')
    } catch {
      showMsg('Failed to save.', 'err')
    }
  }

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      showMsg('Photo must be under 4 MB.', 'err')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function savePhoto() {
    if (!photoPreview) return
    setPhotoSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'headshot', value: photoPreview }),
      })
      showMsg('Profile photo saved!')
    } catch {
      showMsg('Failed to save photo.', 'err')
    }
    setPhotoSaving(false)
  }

  async function removePhoto() {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'headshot', value: '' }),
    })
    setPhotoPreview(null)
    showMsg('Photo removed.')
  }

  if (loading) {
    return (
      <div className="osrs-panel-dark rounded-xl text-[7px] py-8 text-center" style={{ color: 'var(--text-2)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>🏠 Edit Homepage</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>Changes apply immediately to the live homepage.</p>
      </div>

      {msg && (
        <div
          className="rounded px-3 py-1.5 text-[7px]"
          style={{
            background: msgType === 'ok' ? '#1a3a1a' : '#3a1a1a',
            border: `1px solid ${msgType === 'ok' ? '#4a8a4a' : '#8a4a4a'}`,
            color: msgType === 'ok' ? '#90c890' : '#e09090',
          }}
        >
          {msg}
        </div>
      )}

      {/* Profile Photo */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Profile Photo</h2>
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold"
            style={{ border: '2px solid var(--border-lit)', background: 'var(--bg-page)', color: 'var(--gold)' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              : 'GP'}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>
              Upload a photo under 4 MB (JPG or PNG). Displays on your homepage hero.
            </p>
            <label className="osrs-btn text-[7px] cursor-pointer inline-block">
              📁 Choose Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoFile}
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={savePhoto}
                disabled={!photoPreview || photoSaving}
                className="osrs-btn text-[7px]"
              >
                {photoSaving ? 'Saving...' : '✓ Save Photo'}
              </button>
              {photoPreview && (
                <button onClick={removePhoto} className="osrs-btn text-[7px] opacity-60">
                  ✕ Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Info */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Hero Info</h2>
        <div className="space-y-2">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Hero Title</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. Sales Manager & Community Builder"
              value={heroTitle}
              onChange={e => setHeroTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Location</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. Sacramento, CA"
              value={heroLocation}
              onChange={e => setHeroLocation(e.target.value)}
            />
          </div>
          <button onClick={saveHero} className="osrs-btn text-[7px]">Save Hero Info</button>
        </div>
      </div>

      {/* Bio */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Bio</h2>
        <div className="space-y-2">
          {[
            { label: 'Bio Paragraph 1', value: bio1, set: setBio1 },
            { label: 'Bio Paragraph 2', value: bio2, set: setBio2 },
            { label: 'Bio Paragraph 3', value: bio3, set: setBio3 },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>{label}</label>
              <textarea
                className="osrs-input text-[7px] w-full h-20 resize-none"
                placeholder={label}
                value={value}
                onChange={e => set(e.target.value)}
              />
            </div>
          ))}
          <button onClick={saveBioAll} className="osrs-btn text-[7px]">Save All Bio</button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Contact Info</h2>
        <div className="space-y-2">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Phone</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. (916) 555-0100"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Email</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. garret@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>LinkedIn Username</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. garretperez"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
            />
          </div>
          <button onClick={saveContact} className="osrs-btn text-[7px]">Save Contact</button>
        </div>
      </div>
    </div>
  )
}
