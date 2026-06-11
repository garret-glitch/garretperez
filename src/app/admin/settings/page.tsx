'use client'
import { useEffect, useState } from 'react'

export default function AdminSettingsPage() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings?.headshot) setPhotoPreview(data.settings.headshot)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
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
      showMsg('Profile photo saved! Reload the homepage to see it.')
    } catch {
      showMsg('Failed to save photo.', 'err')
    }
    setPhotoSaving(false)
  }

  async function removePhoto() {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'headshot', value: '' }),
      })
      setPhotoPreview(null)
      showMsg('Photo removed.')
    } catch {
      showMsg('Failed to remove.', 'err')
    }
  }

  async function resetXp() {
    if (!confirm('Reset ALL your skill XP to 0 (level 1)? This cannot be undone.')) return
    try {
      const res = await fetch('/api/admin/reset-xp', { method: 'POST' })
      const data = await res.json()
      showMsg(data.message ?? data.error ?? 'XP reset.')
    } catch {
      showMsg('Reset failed.', 'err')
    }
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
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>⚙️ Settings</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>Site settings and admin tools.</p>
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
        <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>
          This photo appears on your homepage hero. Max 4 MB, JPG or PNG.
        </p>
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold"
            style={{ border: '2px solid var(--border-lit)', background: 'var(--bg-page)', color: 'var(--gold)' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Current profile photo" className="w-full h-full object-cover" />
              : 'GP'}
          </div>
          <div className="flex-1 space-y-2">
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

      {/* Danger Zone */}
      <div
        className="osrs-panel-dark rounded-xl space-y-3"
        style={{ border: '1px solid #8a4a4a' }}
      >
        <h2 className="text-[9px] font-bold" style={{ color: '#e09090' }}>⚠️ Danger Zone</h2>
        <div>
          <p className="text-[8px] font-bold mb-1" style={{ color: 'var(--text-1)' }}>Reset My XP</p>
          <p className="text-[7px] mb-2" style={{ color: 'var(--text-2)' }}>
            Sets all your skill XP to 0 (level 1). Affects only your account. Cannot be undone.
          </p>
          <button
            onClick={resetXp}
            className="text-[6px] px-2 py-1.5 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
          >
            ⚠️ Reset All My XP to Level 1
          </button>
        </div>
      </div>
    </div>
  )
}
