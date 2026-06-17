// Client-side God Mode flag (super admins only). Backed by localStorage so it
// persists across games/navigations, with a custom event so live games react.
const KEY = 'sa-godmode'
const EVENT = 'sa-godmode-change'

export function isGodModeOn(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setGodMode(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
    window.dispatchEvent(new Event(EVENT))
  } catch { /* ignore */ }
}

export const GODMODE_EVENT = EVENT
