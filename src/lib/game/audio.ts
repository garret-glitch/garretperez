let _ctx: AudioContext | null = null

function ctx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null
    if (!_ctx) _ctx = new AudioContext()
    return _ctx
  } catch { return null }
}

function tone(freq: number, dur: number, gain = 0.07, type: OscillatorType = 'sine') {
  const c = ctx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const g   = c.createGain()
    osc.connect(g); g.connect(c.destination)
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    osc.start(); osc.stop(c.currentTime + dur)
  } catch { /* ignore */ }
}

export function playClick()   { tone(880, 0.04, 0.055) }
export function playConnect() { tone(660, 0.13, 0.08)  }
export function playBadMove() { tone(160, 0.18, 0.07, 'sawtooth') }

export function playHint() {
  tone(700, 0.1, 0.05)
  setTimeout(() => tone(900, 0.1, 0.05), 110)
  setTimeout(() => tone(1100, 0.2, 0.05), 220)
}

export function playLevelComplete() {
  const m = [523, 659, 784, 1047, 784, 1047, 1319]
  m.forEach((f, i) => setTimeout(() => tone(f, 0.3, 0.1), i * 110))
}

export function playNewHighScore() {
  const m = [523, 659, 784, 1047, 1319, 1047, 1319, 1568]
  m.forEach((f, i) => setTimeout(() => tone(f, 0.28, 0.1), i * 85))
}
