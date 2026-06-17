'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════════════
   PIRATE CARNAGE — Twisted Metal x Vampire Survivors on the ocean.
   Self-contained canvas game. No assets. Synthesized Web Audio.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── constants ── */
const VW = 960, VH = 600          // viewport
const WW = 2400, WH = 1600        // world / arena
const BOSS_AT = 28                // kills before the Kraken surfaces
const TAU = Math.PI * 2
const LEV_SEGS = 13, LEV_SPACING = 4  // Leviathan serpent body segments / trail sampling

/* ── math ── */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)
const angTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2(by - ay, bx - ax)
const normAng = (a: number) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a }
const angLerp = (a: number, b: number, t: number) => a + normAng(b - a) * t

/* ═══ SOUND — synthesized Web Audio (no files) ═══ */
const Sfx = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null   // mute gate → destination
  let sfxBus: GainNode | null = null    // dry SFX bus (also feeds reverb)
  let muted = false
  let vol = 0.34   // master volume (0..1) — driven by the in-game volume slider
  const last: Record<string, number> = {}
  // synthetic impulse response (exponentially-decaying noise) for a cheap convolution reverb
  function makeIR(c: AudioContext, dur: number, decay: number): AudioBuffer {
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(2, n, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) }
    return buf
  }
  function ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : vol; master.connect(ctx.destination)
      // SFX bus → master (dry) + a reverb tail for ocean-cavern space
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master)
      const rev = ctx.createConvolver(); rev.buffer = makeIR(ctx, 1.1, 3.2)
      const wet = ctx.createGain(); wet.gain.value = 0.16
      sfxBus.connect(rev); rev.connect(wet); wet.connect(master)
    }
    return ctx
  }
  function resume() { const c = ensure(); if (c && c.state === 'suspended') void c.resume() }
  function setMuted(m: boolean) { muted = m; if (master && ctx) master.gain.setTargetAtTime(m ? 0 : vol, ctx.currentTime, 0.02) }
  function isMuted() { return muted }
  function setVolume(v: number) { vol = Math.max(0, Math.min(1, v)); if (master && ctx && !muted) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02) }
  function getVolume() { return vol }
  function ok(key?: string, ms?: number): AudioContext | null {
    const c = ensure(); if (!c || !sfxBus || muted) return null
    if (key && ms) { const now = c.currentTime * 1000; if (last[key] && now - last[key] < ms) return null; last[key] = now }
    return c
  }
  function blip(c: AudioContext, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(sfxBus!); o.start(t); o.stop(t + dur + 0.03)
  }
  function noise(c: AudioContext, dur: number, vol: number, filt: BiquadFilterType, freq: number, q = 1, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf
    const f = c.createBiquadFilter(); f.type = filt; f.frequency.setValueAtTime(freq, t); f.Q.value = q
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f); f.connect(g); g.connect(sfxBus!); src.start(t); src.stop(t + dur)
  }

  /* ── procedural music engine: layered loops with tape-echo lead, pad, kick/snare/hats ── */
  let musicBus: GainNode | null = null   // all music → master (duckable)
  let leadBus: GainNode | null = null     // melody → echo → musicBus
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let curTrack = '', mstep = 0, nextTime = 0, lastRoot = 0
  function ensureMusic() {
    const c = ensure(); if (!c || musicBus) return
    musicBus = c.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master!)
    leadBus = c.createGain(); leadBus.gain.value = 1; leadBus.connect(musicBus)
    // feedback delay (tape echo) on the lead — that cinematic game-music shimmer
    const dly = c.createDelay(0.6); dly.delayTime.value = 0.255
    const fb = c.createGain(); fb.gain.value = 0.33
    const dw = c.createGain(); dw.gain.value = 0.5
    leadBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(dw); dw.connect(musicBus)
  }
  function mnote(c: AudioContext, freq: number, time: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, time)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(vol, time + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + dur + 0.04)
  }
  function mkick(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(46, time + 0.12)
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.17)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + 0.19)
  }
  function msnare(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.13)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.4)
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.13)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.14)
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, time)
    const go = c.createGain(); go.gain.setValueAtTime(vol * 0.5, time); go.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    o.connect(go); go.connect(dest); o.start(time); o.stop(time + 0.11)
  }
  function mhat(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.03)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7800
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.03)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.04)
  }
  const D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98, A2 = 110, Bb2 = 116.54, C3 = 130.81, F3 = 174.61, G3 = 196, A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392, A4 = 440, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46
  type Trk = { bpm: number; bass: (number | null)[]; lead: (number | null)[]; kick: number[]; leadType: OscillatorType; snare?: number[]; soft?: boolean; padVol?: number }
  const TRACKS: Record<string, Trk> = {
    battle: {
      bpm: 150, leadType: 'sawtooth',
      bass: [D2, null, D2, D2, F2, null, C3, null, A2, null, A2, A2, G2, null, F2, null],
      lead: [D4, A3, F4, A3, E4, A3, C4, E4, A3, E4, F4, A3, G3, A3, F3, A3],
      kick: [0, 4, 6, 8, 10, 12, 14], snare: [4, 12],
    },
    boss: {
      bpm: 168, leadType: 'square',
      bass: [D2, D2, D2, F2, G2, G2, F2, E2, D2, D2, F2, A2, C3, C3, A2, G2],
      lead: [D5, A4, F4, A4, C5, A4, E5, C5, D5, F4, A4, D5, C5, A4, G4, F4],
      kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12],
    },
    // calm minor sea-shanty for the menu / between-battle screens
    menu: {
      bpm: 96, leadType: 'triangle', soft: true, padVol: 0.06,
      bass: [D2, null, null, null, Bb2, null, null, null, F2, null, null, null, C3, null, null, null],
      lead: [D4, null, F4, null, E4, null, null, null, F4, null, A4, null, G4, null, F4, null],
      kick: [0, 8],
    },
    // bright triumphant fanfare looped on the victory screen
    victory: {
      bpm: 128, leadType: 'square', padVol: 0.05,
      bass: [F2, F2, C3, C3, A2, A2, D2, D2, Bb2, Bb2, F2, F2, C3, C3, C3, C3],
      lead: [C5, F4, A4, C5, F5, C5, A4, C5, D5, A4, F4, A4, C5, A4, G4, F4],
      kick: [0, 4, 8, 12], snare: [4, 12],
    },
    // slow somber dirge on defeat
    defeat: {
      bpm: 62, leadType: 'triangle', soft: true, padVol: 0.07,
      bass: [D2, null, null, null, null, null, null, null, A2, null, null, null, null, null, null, null],
      lead: [D4, null, null, null, F4, null, E4, null, D4, null, null, null, A3, null, null, null],
      kick: [0],
    },
  }
  function duck(on: boolean) { if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? 0.13 : 0.5, ctx.currentTime, 0.08) }
  function startScheduler() {
    if (musicTimer) return
    const c = ensure(); if (!c || !musicBus || !leadBus) return
    nextTime = c.currentTime + 0.08
    musicTimer = setInterval(() => {
      const cc = ctx; const mb = musicBus, lb = leadBus; if (!cc || !mb || !lb) return
      const tk = TRACKS[curTrack]; if (!tk) return
      const stepDur = 60 / tk.bpm / 2
      while (nextTime < cc.currentTime + 0.12) {
        const s = mstep % 16
        const b = tk.bass[s]
        if (b) {
          lastRoot = b
          mnote(cc, b, nextTime, stepDur * 1.1, 'sawtooth', tk.soft ? 0.10 : 0.16, mb)
          mnote(cc, b / 2, nextTime, stepDur * 1.1, 'sine', tk.soft ? 0.08 : 0.10, mb)
        }
        // sustained pad chord (octave + fifth above the current root) every bar — harmonic glue
        if (s % 4 === 0 && lastRoot && tk.padVol) {
          mnote(cc, lastRoot * 2, nextTime, stepDur * 4, 'triangle', tk.padVol, mb)
          mnote(cc, lastRoot * 3, nextTime, stepDur * 4, 'triangle', tk.padVol * 0.6, mb)
        }
        const l = tk.lead[s]; if (l) mnote(cc, l, nextTime, stepDur * 0.85, tk.leadType, tk.soft ? 0.05 : 0.06, lb)
        if (tk.kick.includes(s)) mkick(cc, nextTime, mb, tk.soft ? 0.18 : 0.34)
        if (tk.snare?.includes(s)) msnare(cc, nextTime, mb, 0.16)
        if (!tk.soft && s % 2 === 1) mhat(cc, nextTime, mb, 0.05)
        else if (tk.soft && s % 4 === 2) mhat(cc, nextTime, mb, 0.03)
        mstep++; nextTime += stepDur
      }
    }, 25)
  }
  function playMusic(name: string) {
    const c = ensure(); if (!c) return
    ensureMusic()
    if (curTrack === name && musicTimer) return
    curTrack = name; mstep = 0; lastRoot = 0; nextTime = c.currentTime + 0.08
    duck(false)
    startScheduler()
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null } curTrack = '' }

  return {
    resume, setMuted, isMuted, setVolume, getVolume, playMusic, stopMusic, duck,
    // layered cannon: a square crack, a sub-bass thump, and a filtered smoke-puff
    cannon() { const c = ok('cannon', 45); if (!c) return; blip(c, 200, 0.09, 'square', 0.10, 80); blip(c, 80, 0.18, 'sine', 0.16, 42); noise(c, 0.12, 0.12, 'lowpass', 1400, 1, 300) },
    fireCannon() { const c = ok('fcannon', 45); if (!c) return; blip(c, 170, 0.11, 'sawtooth', 0.10, 66); blip(c, 70, 0.20, 'sine', 0.14, 38); noise(c, 0.16, 0.12, 'bandpass', 1000, 1.5, 500); noise(c, 0.18, 0.06, 'highpass', 3200, 1, 1200, 0.02) },
    zap() { const c = ok('zap', 40); if (!c) return; blip(c, 1100, 0.07, 'sawtooth', 0.06, 2600); blip(c, 1420, 0.06, 'square', 0.04, 3100, 0.01); noise(c, 0.07, 0.06, 'highpass', 4500) },
    hit() { const c = ok('hit', 28); if (!c) return; blip(c, 340, 0.05, 'square', 0.05, 170); noise(c, 0.04, 0.03, 'bandpass', 2600, 2) },
    crit() { const c = ok('crit', 50); if (!c) return; blip(c, 560, 0.09, 'square', 0.09, 220); blip(c, 840, 0.08, 'square', 0.06, 360, 0.03); noise(c, 0.06, 0.05, 'highpass', 4200) },
    explosion() { const c = ok('exp', 40); if (!c) return; noise(c, 0.42, 0.26, 'lowpass', 900, 1, 120); blip(c, 95, 0.34, 'sine', 0.20, 34); blip(c, 60, 0.50, 'sine', 0.16, 28, 0.02); noise(c, 0.25, 0.10, 'highpass', 2200, 1, 400, 0.03) },
    bigExp() { const c = ok('bexp', 60); if (!c) return; noise(c, 0.75, 0.34, 'lowpass', 650, 1, 80); blip(c, 72, 0.65, 'sine', 0.26, 28); blip(c, 48, 0.85, 'sine', 0.20, 22, 0.03); noise(c, 0.50, 0.16, 'highpass', 1800, 1, 300, 0.05) },
    boost() { const c = ok('boost', 120); if (!c) return; noise(c, 0.30, 0.12, 'bandpass', 600, 1.5, 1600) },
    pickup() { const c = ok('pick', 30); if (!c) return; blip(c, 640, 0.08, 'triangle', 0.10, 960); blip(c, 960, 0.10, 'triangle', 0.08, 1440, 0.05) },
    powerBig() { const c = ok('pbig', 60); if (!c) return;[440, 660, 880, 1320].forEach((f, i) => blip(c, f, 0.13, 'square', 0.09, undefined, i * 0.05)); blip(c, 1760, 0.22, 'sine', 0.05, undefined, 0.20) },
    ult() { const c = ok('ult', 100); if (!c) return; blip(c, 110, 0.50, 'sawtooth', 0.18, 440); blip(c, 73, 0.60, 'sine', 0.16, 55); noise(c, 0.50, 0.18, 'bandpass', 700, 1.5, 2200); blip(c, 220, 0.40, 'square', 0.12, 660, 0.05);[330, 440, 550].forEach((f, i) => blip(c, f, 0.30, 'square', 0.07, undefined, 0.10 + i * 0.06)) },
    torp() { const c = ok('torp', 60); if (!c) return; blip(c, 140, 0.20, 'sine', 0.12, 280); noise(c, 0.28, 0.10, 'bandpass', 500, 2, 1400); noise(c, 0.30, 0.05, 'highpass', 2600, 1, 900, 0.04) },
    hurt() { const c = ok('hurt', 60); if (!c) return; blip(c, 240, 0.16, 'sawtooth', 0.14, 70); noise(c, 0.14, 0.10, 'lowpass', 700) },
    roar() { const c = ok('roar', 200); if (!c) return; blip(c, 68, 0.85, 'sawtooth', 0.22, 128); blip(c, 52, 0.95, 'square', 0.14, 104, 0.05); blip(c, 40, 1.00, 'sine', 0.16, 30); noise(c, 0.80, 0.16, 'lowpass', 520, 1, 180) },
    slam() { const c = ok('slam', 60); if (!c) return; blip(c, 100, 0.30, 'sine', 0.20, 40); blip(c, 55, 0.40, 'sine', 0.16, 28, 0.02); noise(c, 0.35, 0.20, 'lowpass', 600, 1, 120) },
    warn() { const c = ok('warn', 120); if (!c) return; blip(c, 740, 0.10, 'square', 0.07, 740); blip(c, 740, 0.10, 'square', 0.07, 740, 0.15); noise(c, 0.05, 0.03, 'highpass', 5000) },
    thunder() { const c = ok('thndr', 80); if (!c) return; noise(c, 0.60, 0.28, 'lowpass', 1400, 1, 200); blip(c, 1200, 0.10, 'sawtooth', 0.10, 200); blip(c, 60, 0.50, 'sine', 0.18, 30, 0.04) },
    win() { const c = ok('win'); if (!c) return;[523, 659, 784, 1047].forEach((f, i) => blip(c, f, 0.30, 'square', 0.12, undefined, i * 0.13)) },
    lose() { const c = ok('lose'); if (!c) return;[330, 262, 196, 131].forEach((f, i) => blip(c, f, 0.40, 'sawtooth', 0.12, undefined, i * 0.16)) },
    dodge() { const c = ok('dodge', 60); if (!c) return; noise(c, 0.16, 0.08, 'bandpass', 1200, 2, 400) },
  }
})()

/* ═══ TYPES ═══ */
interface Player {
  id: number; build: Build; dead: boolean; respawn: number
  x: number; y: number; vx: number; vy: number; heading: number
  hp: number; maxHp: number; boost: number; boostMax: number; boosting: boolean
  primaryCd: number; secAmmo: number; secCd: number
  ult: number; ultMax: number; ultTimer: number; ultFireCd: number
  iframe: number; dmgBuff: number; rapid: number; shield: number; nitro: number
  recoil: number
}
interface Enemy {
  type: string; x: number; y: number; vx: number; vy: number; heading: number
  hp: number; maxHp: number; radius: number; fireCd: number; hitFlash: number
  burn: number; burnDps: number; spawnT: number; orbitDir: number
}
interface Bullet {
  x: number; y: number; vx: number; vy: number; dmg: number; friendly: boolean
  life: number; type: string; radius: number; pierce: number; burn: boolean; trail: number
}
interface PowerUp { x: number; y: number; kind: string; bob: number; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: string; spin: number }
interface Beam { ax: number; ay: number; bx: number; by: number; life: number; color: string }
interface Tentacle { x: number; y: number; state: string; t: number; radius: number; ang: number; sway: number }
interface Boss {
  kind: string // 'kraken' | 'leviathan'
  x: number; y: number; vx: number; vy: number; hp: number; maxHp: number
  atkCd: number; hitFlash: number; aimAng: number; dying: number
  // leviathan serpent state
  mode?: string; modeT?: number; swimAng?: number
  trail?: { x: number; y: number }[]; tx?: number; ty?: number
  shock?: { ox: number; oy: number; t: number; max: number; hit: boolean }
}
interface FloatText { x: number; y: number; txt: string; life: number; color: string; vy: number; size: number }
interface Rock { x: number; y: number; r: number; seed: number }
interface Foam { x: number; y: number; len: number; ph: number }
interface Build { id: string; name: string; icon: string; color: string; accent: string; hp: number; speed: number; accel: number; boostMax: number; dmg: number; fireRate: number; range: number; armor: number; desc: string; weapon: string }
interface GS {
  players: Player[]; enemies: Enemy[]; bullets: Bullet[]; powerups: PowerUp[]
  particles: Particle[]; beams: Beam[]; tentacles: Tentacle[]; texts: FloatText[]
  rocks: Rock[]; foam: Foam[]; bosses: Boss[]
  cam: { x: number; y: number }; shake: number; time: number
  kills: number; score: number; wave: number; spawnCd: number; bossSpawned: boolean
  state: string; lightCd: number; lightning: { x: number; y: number; t: number; state: string } | null
  banner: { txt: string; sub: string; life: number } | null; flash: number; hitStop: number
}

/* ═══ BUILDS ═══ */
const BUILDS: Build[] = [
  { id: 'fire', name: 'INFERNO', icon: '🔥', color: '#ff6b2b', accent: '#ffcf6b', hp: 130, speed: 330, accel: 1500, boostMax: 100, dmg: 15, fireRate: 0.23, range: 540, armor: 1.0, weapon: 'Fire Cannon', desc: 'Cannonballs ignite enemies with burning damage over time.' },
  { id: 'storm', name: 'TEMPEST', icon: '⚡', color: '#4fd1ff', accent: '#bff0ff', hp: 115, speed: 345, accel: 1550, boostMax: 110, dmg: 12, fireRate: 0.27, range: 580, armor: 1.05, weapon: 'Lightning Cannon', desc: 'Bolts chain between nearby foes. Glass-cannon range.' },
  { id: 'tank', name: 'IRONCLAD', icon: '🛡️', color: '#aebfd0', accent: '#eaf2fb', hp: 200, speed: 285, accel: 1200, boostMax: 130, dmg: 13, fireRate: 0.32, range: 500, armor: 0.6, weapon: 'Triple Cannon', desc: 'Heavy armor, triple broadsides, devastating boost-ram.' },
  { id: 'speed', name: 'CUTLASS', icon: '💨', color: '#5be08a', accent: '#c8ffd9', hp: 100, speed: 410, accel: 1750, boostMax: 150, dmg: 10, fireRate: 0.15, range: 510, armor: 1.15, weapon: 'Chain Cannon', desc: 'Blazing-fast rapid fire that pierces. Hit and run.' },
]

/* ═══ ENEMY DEFS ═══ */
interface EDef { hp: number; speed: number; radius: number; color: string; accent: string; score: number; fire: number; contact: number; size: number; kamikaze?: boolean; triple?: boolean; keepDist?: number }
const EDEF: Record<string, EDef> = {
  sloop: { hp: 24, speed: 215, radius: 16, color: '#b07a4a', accent: '#e0b884', score: 10, fire: 2.6, contact: 8, size: 0.85 },
  frigate: { hp: 58, speed: 135, radius: 22, color: '#8a6a9a', accent: '#c9aed8', score: 22, fire: 1.7, contact: 10, size: 1.05, keepDist: 320 },
  warship: { hp: 140, speed: 92, radius: 30, color: '#5a6a7a', accent: '#9fb3c4', score: 45, fire: 2.2, contact: 14, size: 1.35, triple: true, keepDist: 360 },
  suicide: { hp: 18, speed: 275, radius: 15, color: '#c0392b', accent: '#ff8a6a', score: 15, fire: 0, contact: 0, size: 0.8, kamikaze: true },
  cult: { hp: 50, speed: 150, radius: 20, color: '#7b4fc0', accent: '#caa8ff', score: 28, fire: 1.9, contact: 10, size: 1.0, keepDist: 300 },
}

/* ═══ POWER-UPS ═══ */
const PUPS: Record<string, { icon: string; color: string; label: string }> = {
  repair: { icon: '➕', color: '#4fe07a', label: 'REPAIR' },
  damage: { icon: '⚔', color: '#ff5d5d', label: '2X DMG' },
  shield: { icon: '🛡', color: '#5db8ff', label: 'SHIELD' },
  nitro: { icon: '🔥', color: '#ffb13d', label: 'NITRO' },
  rapid: { icon: '⚡', color: '#ffe14d', label: 'RAPID' },
  torpedo: { icon: '🚀', color: '#ff8a3d', label: '+TORPEDO' },
}
const PUP_KINDS = Object.keys(PUPS)

/* ═══ STATE FACTORY ═══ */
function mkPlayer(id: number, build: Build, x: number, y: number): Player {
  return {
    id, build, dead: false, respawn: 0,
    x, y, vx: 0, vy: 0, heading: -Math.PI / 2,
    hp: build.hp, maxHp: build.hp, boost: build.boostMax, boostMax: build.boostMax, boosting: false,
    primaryCd: 0, secAmmo: 4, secCd: 0, ult: 0, ultMax: 100, ultTimer: 0, ultFireCd: 0,
    iframe: 1.2, dmgBuff: 0, rapid: 0, shield: 0, nitro: 0, recoil: 0,
  }
}
function mkState(builds: Build[]): GS {
  const rocks: Rock[] = []
  const tryRock = (x: number, y: number, r: number) => {
    if (dist(x, y, WW / 2, WH / 2) < 280) return // keep spawn clear
    for (const o of rocks) if (dist(x, y, o.x, o.y) < o.r + r + 120) return
    rocks.push({ x, y, r, seed: rnd(0, 1000) })
  }
  for (let i = 0; i < 8; i++) tryRock(rnd(200, WW - 200), rnd(200, WH - 200), rnd(40, 80))
  const foam: Foam[] = []
  for (let i = 0; i < 150; i++) foam.push({ x: rnd(0, WW), y: rnd(0, WH), len: rnd(10, 26), ph: rnd(0, TAU) })
  const players = builds.map((bd, i) =>
    mkPlayer(i, bd, WW / 2 + (builds.length > 1 ? (i === 0 ? -70 : 70) : 0), WH / 2))
  return {
    players,
    enemies: [], bullets: [], powerups: [], particles: [], beams: [], tentacles: [], texts: [],
    rocks, foam, bosses: [], cam: { x: 0, y: 0 }, shake: 0, time: 0,
    kills: 0, score: 0, wave: 1, spawnCd: 1.0, bossSpawned: false,
    state: 'playing', lightCd: 6, lightning: null,
    banner: { txt: 'SET SAIL', sub: 'DESTROY EVERYTHING', life: 2.2 }, flash: 0, hitStop: 0,
  }
}

/* ═══ PARTICLE / EFFECT HELPERS ═══ */
function burst(g: GS, x: number, y: number, color: string, n: number, spd: number, kind = 'spark', size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(spd * 0.3, spd)
    g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.8), max: 0.8, size: rnd(size * 0.6, size), color, kind, spin: rnd(-8, 8) })
  }
  if (g.particles.length > 520) g.particles.splice(0, g.particles.length - 520)
}
function ftext(g: GS, x: number, y: number, txt: string, color: string, size = 11) {
  g.texts.push({ x, y, txt, life: 0.9, color, vy: -34, size })
  if (g.texts.length > 40) g.texts.shift()
}
function explode(g: GS, x: number, y: number, radius: number, dmg: number, friendly: boolean, big = false) {
  burst(g, x, y, big ? '#ffd27a' : '#ffae4a', big ? 34 : 18, big ? 360 : 240, 'fire', big ? 5 : 4)
  burst(g, x, y, '#6b5a4a', big ? 18 : 10, 160, 'smoke', big ? 8 : 5)
  g.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: radius, color: big ? '#ffeebb' : '#ffd27a', kind: 'ring', spin: 0 })
  g.shake = Math.min(28, g.shake + (big ? 18 : 9))
  if (big) Sfx.bigExp(); else Sfx.explosion()
  // damage enemies
  for (const e of g.enemies) { if (dist(x, y, e.x, e.y) < radius + e.radius) damageEnemy(g, e, dmg, x, y) }
  if (dmg > 0) { const h = bossHitTest(g, x, y, radius); if (h) damageBoss(g, h.b, dmg * h.mult, x, y) }
  if (!friendly) {
    for (const p of g.players) {
      if (p.dead) continue
      const d = dist(x, y, p.x, p.y)
      if (d < radius + 18) hurtPlayer(g, p, dmg * (1 - d / (radius + 40)))
    }
  }
}

/* ═══ PLAYER HELPERS ═══ */
const aliveP = (g: GS): Player[] => g.players.filter(p => !p.dead)
function nearestPlayer(g: GS, x: number, y: number): Player | null {
  let best: Player | null = null, bd = Infinity
  for (const p of g.players) { if (p.dead) continue; const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = p } }
  return best
}
// the player a boss/enemy should target — nearest living, falling back to any
const targetPlayer = (g: GS, x: number, y: number): Player => nearestPlayer(g, x, y) ?? g.players[0]

/* ═══ DAMAGE ═══ */
function damageEnemy(g: GS, e: Enemy, dmg: number, fromX: number, fromY: number, crit = false) {
  e.hp -= dmg; e.hitFlash = 0.12
  if (crit) { Sfx.crit(); ftext(g, e.x, e.y - e.radius, Math.round(dmg) + '!', '#ffe14d', 13) }
  else Sfx.hit()
  burst(g, fromX, fromY, '#ffd27a', 4, 120, 'spark', 2.5)
  if (e.hp <= 0) killEnemy(g, e)
}
function killEnemy(g: GS, e: Enemy) {
  const def = EDEF[e.type]
  e.hp = -999 // mark dead
  g.kills++; g.score += def.score
  for (const pl of aliveP(g)) pl.ult = Math.min(pl.ultMax, pl.ult + (def.score / 10) * 1.4)
  ftext(g, e.x, e.y - e.radius, '+' + def.score, '#c89b3c', 12)
  explode(g, e.x, e.y, e.radius + 8, 0, true)
  burst(g, e.x, e.y, def.color, 12, 160, 'debris', 4)
  if (def.kamikaze) explode(g, e.x, e.y, 90, 26, false) // suicide ships detonate
  // loot drop
  if (Math.random() < 0.20) dropPower(g, e.x, e.y)
}
function dropPower(g: GS, x: number, y: number) {
  g.powerups.push({ x, y, kind: pick(PUP_KINDS), bob: rnd(0, TAU), life: 14 })
}
// is the boss currently a valid target?
function bossVulnerable(b: Boss): boolean {
  if (b.dying > 0) return false
  if (b.kind === 'leviathan' && (b.mode === 'submerge' || b.mode === 'rise')) return false
  if (b.kind === 'dutchman' && (b.mode === 'arrive' || b.mode === 'phaseOut' || b.mode === 'phaseIn')) return false
  return true
}
// per-boss geometry test → damage multiplier or null (ignores vulnerability)
// Leviathan: head is a 1.6x weak point, body segments take 0.5x.
function bossPointMult(b: Boss, x: number, y: number, r: number): number | null {
  if (b.kind === 'kraken') return dist(x, y, b.x, b.y) < 78 + r ? 1 : null
  if (b.kind === 'dutchman') return dist(x, y, b.x, b.y) < 66 + r ? 1 : null
  // leviathan
  if (dist(x, y, b.x, b.y) < 32 + r) return 1.6 // head weak point
  const trail = b.trail || []
  for (let j = 1; j <= LEV_SEGS; j++) {
    const pt = trail[Math.min(j * LEV_SPACING, trail.length - 1)]
    if (!pt) break
    const sr = 26 - (j / LEV_SEGS) * 16
    if (dist(x, y, pt.x, pt.y) < sr + r) return 0.5
  }
  return null
}
// finds the first vulnerable boss overlapping (x,y,r)
function bossHitTest(g: GS, x: number, y: number, r: number): { b: Boss; mult: number } | null {
  for (const b of g.bosses) {
    if (!bossVulnerable(b)) continue
    const m = bossPointMult(b, x, y, r)
    if (m != null) return { b, mult: m }
  }
  return null
}
function damageBoss(g: GS, b: Boss, dmg: number, fromX: number, fromY: number) {
  if (b.dying > 0) return
  b.hp -= dmg; b.hitFlash = 0.1
  burst(g, fromX, fromY, '#a8ffb0', 4, 120, 'spark', 3)
  for (const pl of aliveP(g)) pl.ult = Math.min(pl.ultMax, pl.ult + dmg * 0.05)
  if (b.hp <= 0) startBossDeath(g, b)
}
function hurtPlayer(g: GS, p: Player, dmg: number) {
  if (p.dead || p.shield > 0 || p.iframe > 0 || g.state !== 'playing') return
  dmg *= p.build.armor
  p.hp -= dmg; p.iframe = 0.55; g.shake = Math.min(26, g.shake + 8); g.flash = 0.25; g.hitStop = 0.05
  Sfx.hurt(); burst(g, p.x, p.y, '#ff5d5d', 10, 180, 'spark', 4)
  if (p.hp <= 0) downPlayer(g, p)
}
function downPlayer(g: GS, p: Player) {
  p.hp = 0; p.dead = true; p.respawn = 6
  explode(g, p.x, p.y, 70, 0, true, true); g.shake = Math.max(g.shake, 24)
  ftext(g, p.x, p.y - 30, 'P' + (p.id + 1) + ' DOWN', '#ff5d5d', 13)
  if (aliveP(g).length === 0) defeat(g) // all crews sunk
}
function defeat(g: GS) {
  g.state = 'defeat'; g.shake = 30
  Sfx.lose(); Sfx.playMusic('defeat')
}

/* ═══ FIRING ═══ */
function spawnBullet(g: GS, x: number, y: number, ang: number, spd: number, dmg: number, type: string, friendly: boolean, opts: Partial<Bullet> = {}) {
  g.bullets.push({
    x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, friendly,
    life: opts.life ?? 1.6, type, radius: opts.radius ?? 5, pierce: opts.pierce ?? 0, burn: opts.burn ?? false, trail: 0,
  })
}
function nearestTarget(g: GS, x: number, y: number, range: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bd = range
  for (const e of g.enemies) { if (e.hp <= 0) continue; const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; best = e } }
  for (const bo of g.bosses) { if (!bossVulnerable(bo)) continue; const d = dist(x, y, bo.x, bo.y); if (d < bd) { bd = d; best = bo } }
  return best
}
function firePrimary(g: GS, p: Player) {
  const b = p.build
  const tgt = nearestTarget(g, p.x, p.y, b.range)
  if (!tgt) return
  const baseAng = angTo(p.x, p.y, tgt.x, tgt.y)
  const dmg = b.dmg * (p.dmgBuff > 0 ? 2 : 1)
  const muzzle = { x: p.x + Math.cos(p.heading) * 22, y: p.y + Math.sin(p.heading) * 22 }
  p.recoil = 1
  if (b.id === 'tank') {
    for (const off of [-0.18, 0, 0.18]) spawnBullet(g, p.x, p.y, baseAng + off, 640, dmg, 'ball', true, { radius: 6, life: 1.3 })
    Sfx.cannon()
  } else if (b.id === 'fire') {
    spawnBullet(g, p.x, p.y, baseAng + rnd(-0.04, 0.04), 660, dmg, 'fire', true, { radius: 7, burn: true, life: 1.4 })
    Sfx.fireCannon()
  } else if (b.id === 'storm') {
    spawnBullet(g, p.x, p.y, baseAng, 820, dmg, 'lightning', true, { radius: 5, life: 1.1, pierce: 0 })
    Sfx.zap()
  } else { // speed — chain cannon, piercing
    spawnBullet(g, p.x, p.y, baseAng + rnd(-0.05, 0.05), 760, dmg, 'ball', true, { radius: 4, pierce: 1, life: 1.0 })
    Sfx.cannon()
  }
  burst(g, muzzle.x, muzzle.y, b.accent, 4, 130, 'spark', 2)
  // muzzle flash pointed at the target
  const fm = { x: p.x + Math.cos(baseAng) * 24, y: p.y + Math.sin(baseAng) * 24 }
  g.particles.push({ x: fm.x, y: fm.y, vx: Math.cos(baseAng) * 24, vy: Math.sin(baseAng) * 24, life: 0.11, max: 0.11, size: 13, color: '#fff3c4', kind: 'flash', spin: 0 })
}
function fireSecondary(g: GS, p: Player) {
  if (p.secAmmo <= 0 || p.secCd > 0) return
  const tgt = nearestTarget(g, p.x, p.y, 900)
  const ang = tgt ? angTo(p.x, p.y, tgt.x, tgt.y) : p.heading
  p.secAmmo--; p.secCd = 0.5
  spawnBullet(g, p.x, p.y, ang, 520, 70 + p.build.dmg, 'torpedo', true, { radius: 8, life: 2.2 })
  Sfx.torp()
}
function fireUlt(g: GS, p: Player) {
  if (p.ult < p.ultMax || p.ultTimer > 0) return
  p.ult = 0; p.ultTimer = 1.3; p.ultFireCd = 0
  g.banner = { txt: 'P' + (p.id + 1) + ' BROADSIDE STORM', sub: '', life: 1.4 }
  Sfx.ult(); g.shake = 16
}

/* ═══ ENEMY SPAWN ═══ */
function spawnEnemy(g: GS, type: string) {
  const def = EDEF[type]
  const p = targetPlayer(g, WW / 2, WH / 2)
  let x = 0, y = 0, tries = 0
  do {
    const a = rnd(0, TAU), r = rnd(620, 820)
    x = clamp(p.x + Math.cos(a) * r, 60, WW - 60)
    y = clamp(p.y + Math.sin(a) * r, 60, WH - 60)
    tries++
  } while (tries < 12 && g.rocks.some(ro => dist(x, y, ro.x, ro.y) < ro.r + 60))
  g.enemies.push({
    type, x, y, vx: 0, vy: 0, heading: angTo(x, y, p.x, p.y),
    hp: def.hp, maxHp: def.hp, radius: def.radius, fireCd: rnd(0.5, def.fire || 2),
    hitFlash: 0, burn: 0, burnDps: 0, spawnT: 0.5, orbitDir: Math.random() < 0.5 ? 1 : -1,
  })
}
// the legendary beasts arrive one at a time — a boss gauntlet
function spawnBoss(g: GS) {
  g.bossSpawned = true
  g.bosses.push({ kind: 'kraken', x: WW / 2, y: WH / 2 - 200, vx: 0, vy: 0, hp: 2200, maxHp: 2200, atkCd: 2.5, hitFlash: 0, aimAng: 0, dying: 0 })
  g.banner = { txt: 'THE KRAKEN RISES', sub: 'SINK THE BEAST', life: 3 }
  g.shake = 24; Sfx.roar(); Sfx.playMusic('boss')
  g.enemies = g.enemies.filter(e => e.type === 'warship')
}
function spawnLeviathan(g: GS) {
  const ex = g.players[0].x < WW / 2 ? WW - 60 : 60 // surface from the far side
  g.bosses.push({
    kind: 'leviathan', x: ex, y: WH / 2, vx: 0, vy: 0, hp: 2400, maxHp: 2400,
    atkCd: 1.2, hitFlash: 0, aimAng: 0, dying: 0,
    mode: 'rise', modeT: 1.6, swimAng: angTo(ex, WH / 2, g.players[0].x, g.players[0].y), trail: [], tx: 0, ty: 0,
  })
  g.banner = { txt: 'THE LEVIATHAN SURFACES', sub: 'THE TRUE BEAST OF THE DEEP', life: 3 }
  g.shake = 26; Sfx.roar(); g.enemies = []
}
function spawnDutchman(g: GS) {
  g.bosses.push({
    kind: 'dutchman', x: WW / 2, y: WH * 0.15, vx: 0, vy: 0, hp: 2800, maxHp: 2800,
    atkCd: 1.0, hitFlash: 0, aimAng: 0, dying: 0,
    mode: 'arrive', modeT: 1.6, swimAng: Math.PI / 2, tx: 0, ty: 0,
  })
  g.banner = { txt: 'THE FLYING DUTCHMAN', sub: 'THE LEGENDARY GHOST SHIP', life: 3 }
  g.shake = 26; Sfx.roar(); g.enemies = []
}
function startBossDeath(g: GS, b: Boss) {
  b.dying = 2.4; b.hp = 0
  const slainTxt = b.kind === 'dutchman' ? 'FLYING DUTCHMAN SUNK' : b.kind === 'leviathan' ? 'LEVIATHAN SLAIN' : 'KRAKEN SLAIN'
  g.banner = { txt: slainTxt, sub: '', life: 2.5 }
  Sfx.roar()
}

/* ═══ PER-PLAYER UPDATE ═══ */
function tickPlayer(g: GS, p: Player, dt: number, keys: Set<string>, edge: PlayerEdge) {
  const b = p.build
  const twoP = g.players.length > 1

  /* — input / movement (P1 = WASD/Shift, P2 = Arrows/'/' ) — */
  let ix = 0, iy = 0
  if (p.id === 0) {
    if (keys.has('a') || (!twoP && keys.has('arrowleft'))) ix -= 1
    if (keys.has('d') || (!twoP && keys.has('arrowright'))) ix += 1
    if (keys.has('w') || (!twoP && keys.has('arrowup'))) iy -= 1
    if (keys.has('s') || (!twoP && keys.has('arrowdown'))) iy += 1
  } else {
    if (keys.has('arrowleft')) ix -= 1
    if (keys.has('arrowright')) ix += 1
    if (keys.has('arrowup')) iy -= 1
    if (keys.has('arrowdown')) iy += 1
  }
  const im = Math.hypot(ix, iy) || 1; ix /= im; iy /= im
  const moving = (ix !== 0 || iy !== 0)

  // boost
  const boostKey = p.id === 0 ? keys.has('shift') : keys.has('/')
  const wantBoost = boostKey && p.boost > 4 && moving
  p.boosting = wantBoost
  if (wantBoost) { p.boost = Math.max(0, p.boost - 42 * dt); if (Math.random() < 0.6) Sfx.boost() }
  else p.boost = Math.min(p.boostMax, p.boost + (p.nitro > 0 ? 60 : 22) * dt)

  const boostMul = p.boosting ? 1.85 : 1
  const nitroMul = p.nitro > 0 ? 1.25 : 1
  const accel = b.accel * boostMul * nitroMul
  const maxSpd = b.speed * boostMul * nitroMul
  if (moving) { p.vx += ix * accel * dt; p.vy += iy * accel * dt }
  const fr = Math.pow(0.0008, dt)
  p.vx *= fr; p.vy *= fr
  const sp = Math.hypot(p.vx, p.vy)
  if (sp > maxSpd) { p.vx = p.vx / sp * maxSpd; p.vy = p.vy / sp * maxSpd }
  p.x = clamp(p.x + p.vx * dt, 30, WW - 30)
  p.y = clamp(p.y + p.vy * dt, 30, WH - 30)
  if (sp > 30) p.heading = angLerp(p.heading, Math.atan2(p.vy, p.vx), 1 - Math.pow(0.0001, dt))
  // wake
  if (sp > 60 && Math.random() < (p.boosting ? 0.9 : 0.4)) {
    const back = p.heading + Math.PI
    g.particles.push({ x: p.x + Math.cos(back) * 16, y: p.y + Math.sin(back) * 16, vx: Math.cos(back) * 40 + rnd(-20, 20), vy: Math.sin(back) * 40 + rnd(-20, 20), life: 0.6, max: 0.6, size: rnd(3, 6), color: p.boosting ? b.accent : '#cfe6ff', kind: 'wake', spin: 0 })
  }
  // rock collision
  for (const ro of g.rocks) {
    const d = dist(p.x, p.y, ro.x, ro.y)
    if (d < ro.r + 18) {
      const a = angTo(ro.x, ro.y, p.x, p.y)
      p.x = ro.x + Math.cos(a) * (ro.r + 18); p.y = ro.y + Math.sin(a) * (ro.r + 18)
      p.vx *= 0.3; p.vy *= 0.3
      if (p.boosting) burst(g, p.x, p.y, '#cfe6ff', 6, 120, 'spark', 3)
    }
  }

  // timers
  p.iframe = Math.max(0, p.iframe - dt)
  p.dmgBuff = Math.max(0, p.dmgBuff - dt)
  p.rapid = Math.max(0, p.rapid - dt)
  p.shield = Math.max(0, p.shield - dt)
  p.nitro = Math.max(0, p.nitro - dt)
  p.recoil = Math.max(0, p.recoil - dt * 6)
  p.secCd = Math.max(0, p.secCd - dt)

  // boost ram damage
  if (p.boosting) {
    for (const e of g.enemies) {
      if (e.hp <= 0) continue
      if (dist(p.x, p.y, e.x, e.y) < e.radius + 22) {
        damageEnemy(g, e, (b.id === 'tank' ? 60 : 34) * dt * 6, e.x, e.y)
        const a = angTo(p.x, p.y, e.x, e.y); e.vx += Math.cos(a) * 320; e.vy += Math.sin(a) * 320
      }
    }
    { const h = bossHitTest(g, p.x, p.y, 22); if (h) damageBoss(g, h.b, (b.id === 'tank' ? 50 : 30) * dt * 6 * h.mult, p.x, p.y) }
  }

  // primary auto-fire
  p.primaryCd -= dt
  if (p.primaryCd <= 0) {
    const before = g.bullets.length
    firePrimary(g, p)
    if (g.bullets.length > before) p.primaryCd = b.fireRate / (p.rapid > 0 ? 2 : 1)
    else p.primaryCd = 0.1
  }
  // secondary / ultimate (edge-triggered)
  if (edge.sec) fireSecondary(g, p)
  if (edge.ult) fireUlt(g, p)
  // ultimate broadside burst
  if (p.ultTimer > 0) {
    p.ultTimer -= dt; p.ultFireCd -= dt
    if (p.ultFireCd <= 0) {
      p.ultFireCd = 0.13
      const n = 20, base = g.time * 4
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * TAU
        spawnBullet(g, p.x, p.y, a, 600, b.dmg * 1.2, b.id === 'fire' ? 'fire' : 'ball', true, { radius: 6, burn: b.id === 'fire', life: 1.0 })
      }
      Sfx.cannon(); g.shake = Math.min(20, g.shake + 4)
    }
  }
}
function revivePlayer(g: GS, p: Player) {
  const ally = aliveP(g)[0]
  if (!ally) { p.respawn = 0.5; return }
  p.dead = false; p.hp = Math.round(p.maxHp * 0.5)
  p.x = ally.x + rnd(-50, 50); p.y = ally.y + rnd(-50, 50); p.vx = 0; p.vy = 0
  p.iframe = 2.2; p.boost = p.boostMax; p.ultTimer = 0
  ftext(g, p.x, p.y - 30, 'P' + (p.id + 1) + ' RETURNS!', '#5be08a', 13)
  burst(g, p.x, p.y, p.build.color, 18, 220, 'spark', 4); Sfx.powerBig()
}

/* ═══ TICK ═══ */
interface PlayerEdge { sec: boolean; ult: boolean }
function tick(g: GS, dt: number, keys: Set<string>, edges: PlayerEdge[]) {
  if (g.state !== 'playing') { dt = Math.min(dt, 0.033); stepFx(g, dt); return }
  if (g.hitStop > 0) { g.hitStop -= dt; dt *= 0.25 }
  dt = Math.min(dt, 0.033)
  g.time += dt

  /* — players — */
  for (const p of g.players) {
    if (p.dead) { p.respawn -= dt; if (p.respawn <= 0) revivePlayer(g, p); continue }
    tickPlayer(g, p, dt, keys, edges[p.id] ?? { sec: false, ult: false })
  }

  /* — enemies — */
  const aliveCount = g.enemies.filter(e => e.hp > 0).length
  for (const e of g.enemies) {
    if (e.hp <= 0) continue
    const def = EDEF[e.type]
    e.spawnT = Math.max(0, e.spawnT - dt)
    e.hitFlash = Math.max(0, e.hitFlash - dt)
    // burn dot
    if (e.burn > 0) { e.burn -= dt; e.hp -= e.burnDps * dt; if (Math.random() < 0.4) burst(g, e.x, e.y, '#ff8a3d', 1, 50, 'fire', 3); if (e.hp <= 0) { killEnemy(g, e); continue } }
    const tp = targetPlayer(g, e.x, e.y) // nearest living captain
    const dToP = dist(e.x, e.y, tp.x, tp.y)
    const aToP = angTo(e.x, e.y, tp.x, tp.y)
    e.heading = angLerp(e.heading, aToP, 1 - Math.pow(0.02, dt))
    // movement AI
    let tx = 0, ty = 0
    if (def.kamikaze || def.keepDist === undefined) {
      tx = Math.cos(aToP); ty = Math.sin(aToP) // charge
    } else {
      const keep = def.keepDist
      if (dToP > keep + 50) { tx = Math.cos(aToP); ty = Math.sin(aToP) }
      else if (dToP < keep - 50) { tx = -Math.cos(aToP); ty = -Math.sin(aToP) }
      else { tx = Math.cos(aToP + e.orbitDir * 1.4); ty = Math.sin(aToP + e.orbitDir * 1.4) } // strafe
    }
    e.vx += tx * def.speed * 4 * dt; e.vy += ty * def.speed * 4 * dt
    const efr = Math.pow(0.01, dt); e.vx *= efr; e.vy *= efr
    const esp = Math.hypot(e.vx, e.vy); if (esp > def.speed) { e.vx = e.vx / esp * def.speed; e.vy = e.vy / esp * def.speed }
    e.x = clamp(e.x + e.vx * dt, 30, WW - 30); e.y = clamp(e.y + e.vy * dt, 30, WH - 30)
    // rock collision
    for (const ro of g.rocks) { const d = dist(e.x, e.y, ro.x, ro.y); if (d < ro.r + e.radius) { const a = angTo(ro.x, ro.y, e.x, e.y); e.x = ro.x + Math.cos(a) * (ro.r + e.radius); e.y = ro.y + Math.sin(a) * (ro.r + e.radius) } }
    // contact
    if (dToP < e.radius + 20) {
      if (def.kamikaze) { killEnemy(g, e); continue }
      else if (e.spawnT <= 0) { hurtPlayer(g, tp, def.contact * dt * 4) }
    }
    // firing
    if (def.fire > 0 && e.spawnT <= 0 && dToP < 620) {
      e.fireCd -= dt
      if (e.fireCd <= 0) {
        e.fireCd = def.fire * rnd(0.8, 1.2)
        const lead = angTo(e.x, e.y, tp.x + tp.vx * 0.25, tp.y + tp.vy * 0.25)
        if (def.triple) { for (const o of [-0.16, 0, 0.16]) spawnBullet(g, e.x, e.y, lead + o, 300, 12, 'eball', false, { radius: 6, life: 2.4 }) }
        else if (e.type === 'cult') spawnBullet(g, e.x, e.y, lead, 280, 10, 'ink', false, { radius: 7, life: 2.6 })
        else spawnBullet(g, e.x, e.y, lead, 320, 9, 'eball', false, { radius: 5, life: 2.4 })
        Sfx.cannon()
      }
    }
  }
  // cleanup dead enemies
  if (g.enemies.some(e => e.hp <= 0)) g.enemies = g.enemies.filter(e => e.hp > 0)

  /* — spawning / waves — */
  g.wave = 1 + Math.floor(g.kills / 8)
  if (!g.bossSpawned) {
    if (g.kills >= BOSS_AT) spawnBoss(g)
    else {
      const target = Math.min(20, 5 + g.wave * 2)
      g.spawnCd -= dt
      if (g.spawnCd <= 0 && aliveCount < target) {
        g.spawnCd = Math.max(0.35, 1.4 - g.wave * 0.08)
        const roll = Math.random(), w = g.wave
        let type = 'sloop'
        if (w >= 2 && roll < 0.18) type = 'suicide'
        else if (w >= 2 && roll < 0.42) type = 'frigate'
        else if (w >= 3 && roll < 0.55) type = 'warship'
        else if (w >= 3 && roll < 0.68) type = 'cult'
        else type = 'sloop'
        spawnEnemy(g, type)
      }
    }
  } else if (g.bosses.some(bo => bo.dying <= 0 && bo.kind === 'kraken')) {
    // the Kraken keeps a trickle of adds coming during the melee
    g.spawnCd -= dt
    if (g.spawnCd <= 0 && aliveCount < 7) { g.spawnCd = 3.0; spawnEnemy(g, pick(['sloop', 'cult', 'suicide'])) }
  }

  /* — boss logic — */
  if (g.bosses.length) tickBoss(g, dt)

  /* — bullets — */
  for (const bu of g.bullets) {
    bu.life -= dt; bu.trail += dt
    bu.x += bu.vx * dt; bu.y += bu.vy * dt
    if (bu.type === 'torpedo' && Math.random() < 0.8) g.particles.push({ x: bu.x, y: bu.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.4, max: 0.4, size: rnd(2, 4), color: '#cfe6ff', kind: 'wake', spin: 0 })
    if (bu.x < -40 || bu.x > WW + 40 || bu.y < -40 || bu.y > WH + 40) bu.life = 0
    // rock hit
    for (const ro of g.rocks) { if (dist(bu.x, bu.y, ro.x, ro.y) < ro.r) { if (bu.type === 'torpedo') explode(g, bu.x, bu.y, 90, bu.life > 0 ? 0 : 0, true); burst(g, bu.x, bu.y, '#8a7a6a', 4, 80, 'debris', 3); bu.life = 0; break } }
    if (bu.life <= 0) { if (bu.type === 'torpedo') explode(g, bu.x, bu.y, 95, bu.dmg, true); continue }
    if (bu.friendly) {
      // vs enemies
      for (const e of g.enemies) {
        if (e.hp <= 0) continue
        if (dist(bu.x, bu.y, e.x, e.y) < e.radius + bu.radius) {
          if (bu.type === 'torpedo') { explode(g, bu.x, bu.y, 95, bu.dmg, true); bu.life = 0; break }
          const crit = Math.random() < 0.12
          damageEnemy(g, e, bu.dmg * (crit ? 1.8 : 1), bu.x, bu.y, crit)
          if (bu.burn) { e.burn = 3; e.burnDps = Math.max(e.burnDps, bu.dmg * 0.5) }
          if (bu.type === 'lightning') chainLightning(g, e, bu.dmg * 0.6, 2)
          if (bu.pierce > 0) { bu.pierce--; } else { bu.life = 0; break }
        }
      }
      // vs boss
      if (bu.life > 0) {
        const h = bossHitTest(g, bu.x, bu.y, bu.radius)
        if (h) {
          if (bu.type === 'torpedo') { explode(g, bu.x, bu.y, 95, bu.dmg, true); damageBoss(g, h.b, 70 * h.mult, bu.x, bu.y); bu.life = 0 }
          else { const crit = Math.random() < 0.12; damageBoss(g, h.b, bu.dmg * (crit ? 1.8 : 1) * h.mult, bu.x, bu.y); if (bu.pierce > 0) bu.pierce--; else bu.life = 0 }
        }
      }
    } else {
      // enemy bullet vs any living player
      for (const tp of g.players) {
        if (tp.dead) continue
        if (dist(bu.x, bu.y, tp.x, tp.y) < 18 + bu.radius) { hurtPlayer(g, tp, bu.dmg); bu.life = 0; break }
      }
    }
  }
  g.bullets = g.bullets.filter(b2 => b2.life > 0)

  /* — power-ups — */
  for (const pu of g.powerups) {
    pu.life -= dt; pu.bob += dt * 4
    const tp = nearestPlayer(g, pu.x, pu.y)
    if (tp) {
      const d = dist(pu.x, pu.y, tp.x, tp.y)
      if (d < 120) { pu.x += (tp.x - pu.x) * Math.min(1, dt * 6); pu.y += (tp.y - pu.y) * Math.min(1, dt * 6) } // magnet
      if (d < 26) { applyPower(g, tp, pu.kind); pu.life = 0 }
    }
  }
  g.powerups = g.powerups.filter(pu => pu.life > 0)

  /* — lightning hazard (Storm Reef) — */
  g.lightCd -= dt
  if (g.lightning) {
    g.lightning.t -= dt
    if (g.lightning.state === 'warn' && g.lightning.t <= 0) {
      g.lightning.state = 'strike'; g.lightning.t = 0.3
      Sfx.thunder(); g.shake = 14; g.flash = 0.4
      burst(g, g.lightning.x, g.lightning.y, '#bff0ff', 24, 300, 'spark', 4)
      const lx = g.lightning.x, ly = g.lightning.y
      for (const tp of g.players) if (!tp.dead && dist(lx, ly, tp.x, tp.y) < 70) hurtPlayer(g, tp, 26)
      for (const e of g.enemies) if (e.hp > 0 && dist(lx, ly, e.x, e.y) < 70) damageEnemy(g, e, 60, e.x, e.y)
      { const h = bossHitTest(g, lx, ly, 70); if (h) damageBoss(g, h.b, 40 * h.mult, h.b.x, h.b.y) }
    } else if (g.lightning.state === 'strike' && g.lightning.t <= 0) g.lightning = null
  } else if (g.lightCd <= 0) {
    g.lightCd = rnd(5, 9)
    const sp = targetPlayer(g, WW / 2, WH / 2)
    g.lightning = { x: clamp(sp.x + rnd(-300, 300), 60, WW - 60), y: clamp(sp.y + rnd(-300, 300), 60, WH - 60), t: 1.1, state: 'warn' }
    Sfx.warn()
  }

  stepFx(g, dt)

  // camera follows the midpoint of all living ships; living ships are leashed on-screen
  const live = aliveP(g); const frame = live.length ? live : g.players
  let mx = 0, my = 0; for (const pp of frame) { mx += pp.x; my += pp.y }
  mx /= frame.length; my /= frame.length
  g.cam.x = clamp(mx - VW / 2, 0, WW - VW)
  g.cam.y = clamp(my - VH / 2, 0, WH - VH)
  for (const pp of live) {
    pp.x = clamp(pp.x, g.cam.x + 40, g.cam.x + VW - 40)
    pp.y = clamp(pp.y, g.cam.y + 40, g.cam.y + VH - 40)
  }
}

function chainLightning(g: GS, from: Enemy, dmg: number, jumps: number) {
  let src = from
  const hit = new Set<Enemy>([from])
  for (let j = 0; j < jumps; j++) {
    let best: Enemy | null = null, bd = 200
    for (const e of g.enemies) { if (e.hp <= 0 || hit.has(e)) continue; const d = dist(src.x, src.y, e.x, e.y); if (d < bd) { bd = d; best = e } }
    if (!best) break
    g.beams.push({ ax: src.x, ay: src.y, bx: best.x, by: best.y, life: 0.18, color: '#bff0ff' })
    damageEnemy(g, best, dmg, best.x, best.y)
    hit.add(best); src = best
    Sfx.zap()
  }
}

function applyPower(g: GS, p: Player, kind: string) {
  if (kind === 'repair') { p.hp = Math.min(p.maxHp, p.hp + 40); ftext(g, p.x, p.y - 30, '+40 HP', '#4fe07a', 13); Sfx.powerBig() }
  else if (kind === 'damage') { p.dmgBuff = 12; ftext(g, p.x, p.y - 30, '2X DAMAGE', '#ff5d5d', 13); Sfx.powerBig() }
  else if (kind === 'shield') { p.shield = 6; ftext(g, p.x, p.y - 30, 'SHIELD', '#5db8ff', 13); Sfx.powerBig() }
  else if (kind === 'nitro') { p.nitro = 6; p.boost = p.boostMax; ftext(g, p.x, p.y - 30, 'NITRO', '#ffb13d', 13); Sfx.powerBig() }
  else if (kind === 'rapid') { p.rapid = 10; ftext(g, p.x, p.y - 30, 'RAPID FIRE', '#ffe14d', 13); Sfx.powerBig() }
  else if (kind === 'torpedo') { p.secAmmo += 3; ftext(g, p.x, p.y - 30, '+3 TORPEDO', '#ff8a3d', 13); Sfx.pickup() }
  burst(g, p.x, p.y, PUPS[kind].color, 14, 200, 'spark', 4)
}

/* ═══ BOSS dispatcher ═══ */
function tickBoss(g: GS, dt: number) {
  for (const b of [...g.bosses]) {
    b.hitFlash = Math.max(0, b.hitFlash - dt)
    if (b.dying > 0) { handleBossDying(g, b, dt); continue }
    if (b.kind === 'leviathan') tickLeviathan(g, b, dt)
    else if (b.kind === 'dutchman') tickDutchman(g, b, dt)
    else tickKraken(g, b, dt)
  }
}
function handleBossDying(g: GS, b: Boss, dt: number) {
  b.dying -= dt
  if (Math.random() < 0.5) explode(g, b.x + rnd(-70, 70), b.y + rnd(-70, 70), 40, 0, true)
  if (b.dying <= 0) {
    explode(g, b.x, b.y, 200, 0, true, true); g.shake = 34
    const reward = b.kind === 'dutchman' ? 3500 : b.kind === 'leviathan' ? 2500 : 1500
    g.score += reward; ftext(g, b.x, b.y, '+' + reward, '#c89b3c', 22)
    if (b.kind === 'kraken') g.tentacles = []
    g.bosses = g.bosses.filter(o => o !== b)
    // gauntlet: the next beast arrives, or victory after the Dutchman
    if (b.kind === 'kraken') spawnLeviathan(g)
    else if (b.kind === 'leviathan') spawnDutchman(g)
    else { g.state = 'victory'; Sfx.win(); Sfx.playMusic('victory') }
  }
}

/* ═══ BOSS 1 — Kraken ═══ */
function tickKraken(g: GS, b: Boss, dt: number) {
  const p = targetPlayer(g, b.x, b.y)
  // drift slowly, stay roughly center-ish
  const target = { x: WW / 2 + Math.sin(g.time * 0.3) * 260, y: WH / 2 + Math.cos(g.time * 0.4) * 180 }
  b.x += (target.x - b.x) * Math.min(1, dt * 0.6); b.y += (target.y - b.y) * Math.min(1, dt * 0.6)
  b.aimAng = angTo(b.x, b.y, p.x, p.y)
  // tentacles
  for (const t of g.tentacles) {
    t.t -= dt; t.sway += dt * 4
    if (t.state === 'warn' && t.t <= 0) {
      t.state = 'strike'; t.t = 0.5; Sfx.slam(); g.shake = 12
      burst(g, t.x, t.y, '#5b8c6a', 16, 220, 'debris', 5)
      for (const tp of g.players) if (!tp.dead && dist(t.x, t.y, tp.x, tp.y) < t.radius) hurtPlayer(g, tp, 28)
      for (const e of g.enemies) if (e.hp > 0 && dist(t.x, t.y, e.x, e.y) < t.radius) damageEnemy(g, e, 40, e.x, e.y)
    } else if (t.state === 'strike' && t.t <= 0) t.state = 'retract'
    else if (t.state === 'retract' && t.t <= -0.5) t.t = -999
  }
  g.tentacles = g.tentacles.filter(t => t.t > -900)
  // attack cycle
  b.atkCd -= dt
  if (b.atkCd <= 0) {
    const phase = b.hp / b.maxHp
    b.atkCd = phase < 0.4 ? 1.7 : phase < 0.7 ? 2.2 : 2.8
    const r = Math.random()
    if (r < 0.45) { // tentacle slam — some near player
      const n = phase < 0.5 ? 5 : 3
      for (let i = 0; i < n; i++) {
        const nearP = i === 0
        const x = nearP ? p.x + rnd(-60, 60) + p.vx * 0.3 : clamp(p.x + rnd(-500, 500), 80, WW - 80)
        const y = nearP ? p.y + rnd(-60, 60) + p.vy * 0.3 : clamp(p.y + rnd(-500, 500), 80, WH - 80)
        g.tentacles.push({ x: clamp(x, 80, WW - 80), y: clamp(y, 80, WH - 80), state: 'warn', t: phase < 0.5 ? 0.85 : 1.05, radius: 78, ang: rnd(0, TAU), sway: rnd(0, TAU) })
      }
      Sfx.warn()
    } else if (r < 0.78) { // ink spray ring
      const n = phase < 0.5 ? 24 : 16
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + g.time; spawnBullet(g, b.x, b.y, a, 240, 14, 'ink', false, { radius: 8, life: 3 }) }
      Sfx.roar(); g.shake = 10
    } else if (g.bosses.length > 1) { // skip summons during the all-boss melee — extra ink instead
      const n = phase < 0.5 ? 24 : 16
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - g.time; spawnBullet(g, b.x, b.y, a, 240, 14, 'ink', false, { radius: 8, life: 3 }) }
      Sfx.roar(); g.shake = 10
    } else { // summon adds
      for (let i = 0; i < (phase < 0.5 ? 3 : 2); i++) spawnEnemy(g, pick(['sloop', 'cult']))
      Sfx.warn()
    }
  }
}

/* ═══ BOSS 2 — Leviathan (sea serpent) ═══ */
function pickSwimTarget(g: GS, b: Boss) {
  const p = targetPlayer(g, b.x, b.y)
  const a = angTo(b.x, b.y, p.x, p.y) + rnd(-1.2, 1.2)
  const r = rnd(280, 460)
  b.tx = clamp(p.x + Math.cos(a) * r, 90, WW - 90)
  b.ty = clamp(p.y + Math.sin(a) * r, 90, WH - 90)
}
function swimMove(g: GS, b: Boss, dt: number, spd: number) {
  if (dist(b.x, b.y, b.tx!, b.ty!) < 80) pickSwimTarget(g, b)
  const desired = angTo(b.x, b.y, b.tx!, b.ty!)
  const wiggle = Math.sin(g.time * 4) * 0.5
  b.swimAng = angLerp(b.swimAng!, desired + wiggle, 1 - Math.pow(0.06, dt))
  b.x = clamp(b.x + Math.cos(b.swimAng!) * spd * dt, 70, WW - 70)
  b.y = clamp(b.y + Math.sin(b.swimAng!) * spd * dt, 70, WH - 70)
}
function startDive(g: GS, b: Boss) {
  b.mode = 'submerge'; b.modeT = b.hp / b.maxHp < 0.5 ? 1.0 : 1.3
  Sfx.warn(); burst(g, b.x, b.y, '#3a6a8a', 16, 200, 'wake', 6)
}
function startVenomRing(g: GS, b: Boss, phase: number) {
  const n = phase < 0.5 ? 26 : 18
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + g.time; spawnBullet(g, b.x, b.y, a, 230, 13, 'venom', false, { radius: 8, life: 3.2 }) }
  Sfx.roar(); g.shake = 10
  b.mode = 'swim'; b.modeT = rnd(2, 3); b.atkCd = 0.7; pickSwimTarget(g, b)
}
function startSlam(g: GS, b: Boss) { b.mode = 'slamWarn'; b.modeT = 0.85; Sfx.warn() }

function tickLeviathan(g: GS, b: Boss, dt: number) {
  const p = targetPlayer(g, b.x, b.y)
  b.modeT = (b.modeT ?? 0) - dt
  // maintain serpent trail (newest first)
  b.trail!.unshift({ x: b.x, y: b.y })
  if (b.trail!.length > LEV_SEGS * LEV_SPACING + 6) b.trail!.pop()
  const phase = b.hp / b.maxHp
  b.aimAng = angTo(b.x, b.y, p.x, p.y)

  // expanding shockwave from a slam — damages once as the ring sweeps over the player
  if (b.shock) {
    b.shock.t += dt
    const ringR = (b.shock.t / b.shock.max) * 470
    for (const tp of g.players) if (!tp.dead && Math.abs(dist(b.shock.ox, b.shock.oy, tp.x, tp.y) - ringR) < 34) hurtPlayer(g, tp, 26)
    if (b.shock.t >= b.shock.max) b.shock = undefined
  }

  if (b.mode === 'rise') {
    b.x += (WW / 2 - b.x) * Math.min(1, dt * 1.4)
    b.y += (WH * 0.42 - b.y) * Math.min(1, dt * 1.4)
    b.swimAng = angLerp(b.swimAng!, b.aimAng, 1 - Math.pow(0.05, dt))
    if (Math.random() < 0.4) burst(g, b.x + rnd(-40, 40), b.y + rnd(-40, 40), '#bfe8d0', 2, 120, 'wake', 5)
    if (b.modeT <= 0) { b.mode = 'swim'; b.modeT = rnd(2.4, 3.4); b.atkCd = 0.8; pickSwimTarget(g, b) }
    return
  }
  if (b.mode === 'swim') {
    swimMove(g, b, dt, phase < 0.5 ? 230 : 190)
    b.atkCd -= dt
    if (b.atkCd <= 0) {
      b.atkCd = phase < 0.5 ? 1.0 : 1.5
      const aim = angTo(b.x, b.y, p.x + p.vx * 0.2, p.y + p.vy * 0.2)
      const n = phase < 0.5 ? 5 : 3
      for (let i = 0; i < n; i++) spawnBullet(g, b.x, b.y, aim + (i - (n - 1) / 2) * 0.16, 300, 12, 'venom', false, { radius: 7, life: 3 })
      Sfx.cannon()
    }
    if (b.modeT <= 0) {
      const r = Math.random()
      if (r < (phase < 0.5 ? 0.6 : 0.45)) startDive(g, b)
      else if (r < 0.82) startVenomRing(g, b, phase)
      else startSlam(g, b)
    }
    return
  }
  if (b.mode === 'submerge') { // homing shadow tracking the player
    b.swimAng = angLerp(b.swimAng!, angTo(b.x, b.y, p.x, p.y), 1 - Math.pow(0.02, dt))
    b.x = clamp(b.x + Math.cos(b.swimAng!) * 250 * dt, 50, WW - 50)
    b.y = clamp(b.y + Math.sin(b.swimAng!) * 250 * dt, 50, WH - 50)
    if (Math.random() < 0.6) burst(g, b.x + rnd(-20, 20), b.y + rnd(-20, 20), '#3a6a8a', 1, 60, 'wake', 6)
    if (b.modeT <= 0) { // lock direction and erupt toward the player
      b.mode = 'burst'; b.modeT = 0.7
      b.swimAng = angTo(b.x, b.y, p.x, p.y); b.tx = Math.cos(b.swimAng); b.ty = Math.sin(b.swimAng)
      Sfx.roar(); g.shake = 16; burst(g, b.x, b.y, '#cfe6ff', 24, 280, 'wake', 7)
    }
    return
  }
  if (b.mode === 'burst') { // charge along the locked line
    b.x += b.tx! * 760 * dt; b.y += b.ty! * 760 * dt
    if (Math.random() < 0.9) burst(g, b.x, b.y, '#cfe6ff', 2, 100, 'wake', 6)
    for (const tp of g.players) if (!tp.dead && dist(b.x, b.y, tp.x, tp.y) < 62) hurtPlayer(g, tp, 30)
    const out = b.x < 50 || b.x > WW - 50 || b.y < 50 || b.y > WH - 50
    if (out || b.modeT <= 0) {
      b.x = clamp(b.x, 60, WW - 60); b.y = clamp(b.y, 60, WH - 60); g.shake = Math.max(g.shake, 12)
      b.mode = 'swim'; b.modeT = rnd(1.8, 2.6); b.atkCd = 0.5; pickSwimTarget(g, b)
    }
    return
  }
  if (b.mode === 'slamWarn') { // rear up, then unleash the shockwave
    if (b.modeT <= 0) {
      b.shock = { ox: b.x, oy: b.y, t: 0, max: 0.85, hit: false }
      Sfx.slam(); g.shake = 18; burst(g, b.x, b.y, '#bfe8d0', 22, 260, 'debris', 6)
      b.mode = 'swim'; b.modeT = rnd(2, 3); b.atkCd = 0.6; pickSwimTarget(g, b)
    }
    return
  }
}

/* ═══ BOSS 3 — Flying Dutchman (legendary ghost ship) ═══ */
function pickSailTarget(g: GS, b: Boss) {
  const p = targetPlayer(g, b.x, b.y); const a = rnd(0, TAU); const r = rnd(300, 460)
  b.tx = clamp(p.x + Math.cos(a) * r, 110, WW - 110)
  b.ty = clamp(p.y + Math.sin(a) * r, 110, WH - 110)
}
function startBroadside(g: GS, b: Boss) { b.mode = 'broadsideTele'; b.modeT = 0.9; Sfx.warn() }
function startPhase(g: GS, b: Boss) {
  b.mode = 'phaseOut'; b.modeT = 0.55
  Sfx.dodge(); burst(g, b.x, b.y, '#6effc0', 22, 220, 'spark', 5)
}
function startArmada(g: GS, b: Boss, phase: number) {
  if (g.bosses.length > 1) { startPhase(g, b); return } // no armada during the all-boss melee
  for (let i = 0; i < (phase < 0.5 ? 4 : 3); i++) spawnEnemy(g, pick(['sloop', 'cult', 'suicide']))
  Sfx.warn(); g.banner = { txt: 'GHOST ARMADA', sub: '', life: 1.4 }
  b.mode = 'sail'; b.modeT = rnd(2, 2.8); b.atkCd = 0.7; pickSailTarget(g, b)
}
function tickDutchman(g: GS, b: Boss, dt: number) {
  const p = targetPlayer(g, b.x, b.y)
  b.modeT = (b.modeT ?? 0) - dt
  const phase = b.hp / b.maxHp
  b.aimAng = angTo(b.x, b.y, p.x, p.y)
  if (b.mode === 'sail' && Math.random() < 0.3) burst(g, b.x + rnd(-34, 34), b.y + rnd(-34, 34), '#6effc0', 1, 50, 'wake', 6)

  if (b.mode === 'arrive') {
    b.x += (WW / 2 - b.x) * Math.min(1, dt * 1.2); b.y += (WH * 0.4 - b.y) * Math.min(1, dt * 1.2)
    b.swimAng = angLerp(b.swimAng!, b.aimAng, 1 - Math.pow(0.05, dt))
    if (b.modeT <= 0) { b.mode = 'sail'; b.modeT = rnd(2.2, 3.0); b.atkCd = 0.8; pickSailTarget(g, b) }
    return
  }
  if (b.mode === 'sail') {
    if (dist(b.x, b.y, b.tx!, b.ty!) < 90) pickSailTarget(g, b)
    b.swimAng = angLerp(b.swimAng!, angTo(b.x, b.y, b.tx!, b.ty!), 1 - Math.pow(0.2, dt))
    const spd = phase < 0.5 ? 155 : 125
    b.x = clamp(b.x + Math.cos(b.swimAng!) * spd * dt, 100, WW - 100)
    b.y = clamp(b.y + Math.sin(b.swimAng!) * spd * dt, 100, WH - 100)
    b.atkCd -= dt
    if (b.atkCd <= 0) {
      b.atkCd = phase < 0.5 ? 1.2 : 1.8
      const aim = angTo(b.x, b.y, p.x + p.vx * 0.2, p.y + p.vy * 0.2)
      for (const o of [-0.12, 0, 0.12]) spawnBullet(g, b.x, b.y, aim + o, 330, 12, 'ghost', false, { radius: 7, life: 3 })
      Sfx.cannon()
    }
    if (b.modeT <= 0) {
      const r = Math.random()
      if (r < 0.4) startBroadside(g, b)
      else if (r < 0.74) startPhase(g, b)
      else startArmada(g, b, phase)
    }
    return
  }
  if (b.mode === 'broadsideTele') { // turn the hull broadside-on to the player (telegraph)
    b.swimAng = angLerp(b.swimAng!, b.aimAng + Math.PI / 2, 1 - Math.pow(0.06, dt))
    if (b.modeT <= 0) { b.mode = 'broadside'; b.modeT = 0.7; b.atkCd = 0 }
    return
  }
  if (b.mode === 'broadside') { // unload a wall of cursed cannonfire from the flank
    b.atkCd -= dt
    if (b.atkCd <= 0) {
      b.atkCd = 0.09
      const aim = angTo(b.x, b.y, p.x, p.y); const perp = aim + Math.PI / 2
      const n = phase < 0.5 ? 3 : 2
      for (let i = 0; i < n; i++) {
        const off = rnd(-55, 55)
        const ox = b.x + Math.cos(perp) * off, oy = b.y + Math.sin(perp) * off
        spawnBullet(g, ox, oy, aim + rnd(-0.16, 0.16), 360, 12, 'ghost', false, { radius: 6, life: 3 })
      }
      Sfx.cannon(); g.shake = Math.max(g.shake, 6)
    }
    if (b.modeT <= 0) { b.mode = 'sail'; b.modeT = rnd(1.8, 2.6); b.atkCd = 0.6; pickSailTarget(g, b) }
    return
  }
  if (b.mode === 'phaseOut') { // vanish, then reappear near the player
    if (b.modeT <= 0) {
      const a = rnd(0, TAU), r = rnd(260, 360)
      b.x = clamp(p.x + Math.cos(a) * r, 100, WW - 100)
      b.y = clamp(p.y + Math.sin(a) * r, 100, WH - 100)
      b.swimAng = angTo(b.x, b.y, p.x, p.y)
      b.mode = 'phaseIn'; b.modeT = 0.5; Sfx.warn()
      burst(g, b.x, b.y, '#6effc0', 22, 220, 'spark', 5)
    }
    return
  }
  if (b.mode === 'phaseIn') { // reappear with a radial cannon burst
    if (b.modeT <= 0) {
      const n = phase < 0.5 ? 20 : 14
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + g.time; spawnBullet(g, b.x, b.y, a, 270, 12, 'ghost', false, { radius: 6, life: 3 }) }
      Sfx.roar(); g.shake = 12
      b.mode = 'sail'; b.modeT = rnd(1.6, 2.4); b.atkCd = 0.5; pickSailTarget(g, b)
    }
    return
  }
}

/* ═══ FX step (runs even when paused/ended) ═══ */
function stepFx(g: GS, dt: number) {
  g.shake *= Math.pow(0.0015, dt)
  if (g.shake < 0.3) g.shake = 0
  g.flash = Math.max(0, g.flash - dt * 2)
  if (g.banner) { g.banner.life -= dt; if (g.banner.life <= 0) g.banner = null }
  for (const pt of g.particles) {
    pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt
    pt.vx *= Math.pow(0.2, dt); pt.vy *= Math.pow(0.2, dt)
  }
  g.particles = g.particles.filter(pt => pt.life > 0)
  for (const tx of g.texts) { tx.life -= dt; tx.y += tx.vy * dt; tx.vy *= Math.pow(0.4, dt) }
  g.texts = g.texts.filter(t => t.life > 0)
  for (const bm of g.beams) bm.life -= dt
  g.beams = g.beams.filter(bm => bm.life > 0)
}

/* ═══════════════════ RENDER ═══════════════════ */
function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, size: number, hull: string, accent: string, flash: number, sail = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(heading)
  const len = 26 * size, w = 11 * size
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 4, len * 1.05, w * 1.1, 0, 0, TAU); ctx.fill()
  // hull
  ctx.fillStyle = flash > 0 ? '#ffffff' : hull
  ctx.beginPath()
  ctx.moveTo(len, 0)
  ctx.bezierCurveTo(len * 0.55, -w, -len * 0.6, -w, -len, -w * 0.45)
  ctx.lineTo(-len, w * 0.45)
  ctx.bezierCurveTo(-len * 0.6, w, len * 0.55, w, len, 0)
  ctx.closePath(); ctx.fill()
  // deck
  ctx.fillStyle = flash > 0 ? '#ffd2d2' : 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(-len * 0.05, 0, len * 0.62, w * 0.6, 0, 0, TAU); ctx.fill()
  // accent stripe
  ctx.strokeStyle = accent; ctx.lineWidth = 1.6 * size; ctx.globalAlpha = 0.9
  ctx.beginPath(); ctx.moveTo(len * 0.92, 0); ctx.bezierCurveTo(len * 0.5, -w * 0.92, -len * 0.55, -w * 0.92, -len * 0.95, -w * 0.4); ctx.stroke()
  ctx.globalAlpha = 1
  if (sail) {
    // mast + sail
    ctx.fillStyle = flash > 0 ? '#fff' : 'rgba(245,240,225,0.92)'
    ctx.beginPath(); ctx.moveTo(len * 0.12, -w * 0.9); ctx.lineTo(len * 0.12, w * 0.9); ctx.lineTo(-len * 0.4, 0); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(len * 0.12, 0, 2.4 * size, 0, TAU); ctx.fill()
  }
  ctx.restore()
}

function render(ctx: CanvasRenderingContext2D, g: GS) {
  const sh = g.shake
  const shx = sh ? rnd(-sh, sh) : 0, shy = sh ? rnd(-sh, sh) : 0
  const cx = g.cam.x + shx, cy = g.cam.y + shy
  const w2s = (x: number, y: number) => ({ x: x - cx, y: y - cy })

  /* — ocean — */
  const grd = ctx.createLinearGradient(0, 0, 0, VH)
  grd.addColorStop(0, '#0a2438'); grd.addColorStop(0.5, '#0d3350'); grd.addColorStop(1, '#0a2a44')
  ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH)
  // soft sun-shimmer highlight on the water
  const sun = ctx.createRadialGradient(VW * 0.32, VH * 0.16, 20, VW * 0.32, VH * 0.16, VH * 0.95)
  sun.addColorStop(0, 'rgba(120,185,225,0.12)'); sun.addColorStop(1, 'rgba(120,185,225,0)')
  ctx.fillStyle = sun; ctx.fillRect(0, 0, VW, VH)
  // moving caustic glints
  ctx.save()
  ctx.globalAlpha = 0.10; ctx.strokeStyle = '#5fb0e0'; ctx.lineWidth = 2
  for (const f of g.foam) {
    const sx = ((f.x - cx) % WW + WW) % WW
    const sy = ((f.y - cy) % WH + WH) % WH
    if (sx < -30 || sx > VW + 30 || sy < -30 || sy > VH + 30) continue
    const bob = Math.sin(g.time * 1.4 + f.ph) * 4
    ctx.beginPath(); ctx.moveTo(sx, sy + bob); ctx.lineTo(sx + f.len, sy + bob + 2); ctx.stroke()
  }
  ctx.restore()

  /* — rocks / islands — */
  for (const ro of g.rocks) {
    const s = w2s(ro.x, ro.y)
    if (s.x < -ro.r - 40 || s.x > VW + ro.r + 40 || s.y < -ro.r - 40 || s.y > VH + ro.r + 40) continue
    // foam ring
    ctx.fillStyle = 'rgba(180,220,240,0.18)'; ctx.beginPath(); ctx.arc(s.x, s.y, ro.r + 10 + Math.sin(g.time * 2 + ro.seed) * 3, 0, TAU); ctx.fill()
    ctx.fillStyle = '#2a3340'; ctx.beginPath(); ctx.arc(s.x, s.y, ro.r, 0, TAU); ctx.fill()
    ctx.fillStyle = '#39434f'; ctx.beginPath(); ctx.arc(s.x - ro.r * 0.25, s.y - ro.r * 0.25, ro.r * 0.6, 0, TAU); ctx.fill()
    ctx.fillStyle = '#1c232c'; ctx.beginPath(); ctx.arc(s.x + ro.r * 0.3, s.y + ro.r * 0.3, ro.r * 0.4, 0, TAU); ctx.fill()
  }

  /* — power-ups — */
  for (const pu of g.powerups) {
    const s = w2s(pu.x, pu.y); const meta = PUPS[pu.kind]
    const yo = Math.sin(pu.bob) * 4
    const fade = pu.life < 3 ? (Math.sin(pu.life * 12) > 0 ? 1 : 0.3) : 1
    ctx.save(); ctx.globalAlpha = fade
    ctx.shadowColor = meta.color; ctx.shadowBlur = 16
    ctx.fillStyle = '#11151c'; ctx.strokeStyle = meta.color; ctx.lineWidth = 2
    roundRect(ctx, s.x - 14, s.y - 14 + yo, 28, 28, 6); ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(meta.icon, s.x, s.y + yo + 1)
    ctx.restore()
  }

  /* — boss tentacles (warn rings under everything) — */
  for (const t of g.tentacles) {
    const s = w2s(t.x, t.y)
    if (t.state === 'warn') {
      const k = 1 - clamp(t.t / 1.05, 0, 1)
      ctx.strokeStyle = `rgba(120,255,160,${0.4 + k * 0.4})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(s.x, s.y, t.radius, 0, TAU); ctx.stroke()
      ctx.fillStyle = `rgba(60,160,90,${0.12 + k * 0.18})`; ctx.beginPath(); ctx.arc(s.x, s.y, t.radius * k, 0, TAU); ctx.fill()
    }
  }

  /* — bullets — */
  for (const bu of g.bullets) {
    const s = w2s(bu.x, bu.y)
    if (s.x < -30 || s.x > VW + 30 || s.y < -30 || s.y > VH + 30) continue
    if (bu.type === 'lightning') {
      ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 3; ctx.shadowColor = '#4fd1ff'; ctx.shadowBlur = 8
      const a = Math.atan2(bu.vy, bu.vx)
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(a) * 12, s.y - Math.sin(a) * 12); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.shadowBlur = 0
    } else if (bu.type === 'fire') {
      ctx.fillStyle = '#ff8a3d'; ctx.shadowColor = '#ff5d1a'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius, 0, TAU); ctx.fill()
      ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius * 0.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
    } else if (bu.type === 'torpedo') {
      const a = Math.atan2(bu.vy, bu.vx)
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a)
      ctx.fillStyle = '#cfd8e0'; roundRect(ctx, -10, -4, 20, 8, 3); ctx.fill()
      ctx.fillStyle = '#ff5d3d'; ctx.beginPath(); ctx.arc(8, 0, 4, 0, TAU); ctx.fill(); ctx.restore()
    } else if (bu.type === 'ink') {
      ctx.fillStyle = '#7b4fc0'; ctx.shadowColor = '#5b2f9a'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
    } else if (bu.type === 'venom') {
      ctx.fillStyle = '#6ddf8a'; ctx.shadowColor = '#2fae5a'; ctx.shadowBlur = 9
      ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius, 0, TAU); ctx.fill()
      ctx.fillStyle = '#d8ffe2'; ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius * 0.45, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
    } else if (bu.type === 'ghost') {
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#7effc8'; ctx.shadowColor = '#3affb0'; ctx.shadowBlur = 11
      ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius, 0, TAU); ctx.fill()
      ctx.fillStyle = '#eafff5'; ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius * 0.4, 0, TAU); ctx.fill()
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    } else { // ball (friendly gold, enemy red)
      ctx.fillStyle = bu.friendly ? '#ffd27a' : '#ff6a5a'
      ctx.shadowColor = bu.friendly ? '#c89b3c' : '#ff3a2a'; ctx.shadowBlur = 7
      ctx.beginPath(); ctx.arc(s.x, s.y, bu.radius, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
    }
  }

  /* — beams (chain lightning) — */
  for (const bm of g.beams) {
    const a = w2s(bm.ax, bm.ay), b2 = w2s(bm.bx, bm.by)
    ctx.strokeStyle = bm.color; ctx.lineWidth = 2 + bm.life * 10; ctx.globalAlpha = clamp(bm.life * 5, 0, 1)
    ctx.shadowColor = bm.color; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(a.x, a.y)
    const mx = (a.x + b2.x) / 2 + rnd(-12, 12), my = (a.y + b2.y) / 2 + rnd(-12, 12)
    ctx.lineTo(mx, my); ctx.lineTo(b2.x, b2.y); ctx.stroke()
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
  }

  /* — enemies — */
  for (const e of g.enemies) {
    const s = w2s(e.x, e.y); const def = EDEF[e.type]
    if (s.x < -60 || s.x > VW + 60 || s.y < -60 || s.y > VH + 60) continue
    drawShip(ctx, s.x, s.y, e.heading, def.size, e.hitFlash > 0 ? '#fff' : def.color, def.accent, e.hitFlash, e.type !== 'suicide')
    if (e.type === 'suicide') { // barrel
      ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#7a3a2a'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, TAU); ctx.fill()
      ctx.fillStyle = '#ffae4a'; ctx.beginPath(); ctx.arc(s.x, s.y - 6, 2 + Math.sin(g.time * 16) * 1, 0, TAU); ctx.fill()
    }
    if (e.burn > 0 && Math.random() < 0.5) { ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(s.x + rnd(-8, 8), s.y + rnd(-8, 8), rnd(1, 3), 0, TAU); ctx.fill() }
    // hp bar
    if (e.hp < e.maxHp) {
      const bw = def.radius * 1.8
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(s.x - bw / 2, s.y - def.radius - 12, bw, 4)
      ctx.fillStyle = '#ff5d5d'; ctx.fillRect(s.x - bw / 2, s.y - def.radius - 12, bw * (e.hp / e.maxHp), 4)
    }
  }

  /* — boss — */
  g.bosses.forEach((bo, i) => {
    if (bo.kind === 'leviathan') drawLeviathan(ctx, bo, g, w2s, i)
    else if (bo.kind === 'dutchman') drawDutchman(ctx, bo, g, w2s, i)
    else drawKraken(ctx, bo, g, w2s, i)
  })

  /* — tentacle strike visuals (above water) — */
  for (const t of g.tentacles) {
    if (t.state === 'warn') continue
    const s = w2s(t.x, t.y)
    const rise = t.state === 'strike' ? clamp(1 - t.t / 0.5, 0, 1) : clamp(0.5 + t.t / 0.5, 0, 1)
    drawTentacle(ctx, s.x, s.y, t, rise, g.time)
  }

  /* — players — */
  for (const p of g.players) {
    const ps = w2s(p.x, p.y)
    const ring = p.id === 0 ? '#ffd34d' : '#4fd1ff' // P1 gold, P2 cyan
    if (p.dead) {
      // downed marker + respawn countdown (if a teammate can revive)
      if (g.players.length > 1) {
        ctx.globalAlpha = 0.5 + Math.sin(g.time * 8) * 0.2
        ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.arc(ps.x, ps.y, 18, 0, TAU); ctx.stroke(); ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.fillStyle = ring; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('P' + (p.id + 1) + ' ' + Math.ceil(p.respawn), ps.x, ps.y)
      }
      continue
    }
    const bd = p.build
    // shield
    if (p.shield > 0) { ctx.strokeStyle = `rgba(93,184,255,${0.5 + Math.sin(g.time * 10) * 0.2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ps.x, ps.y, 30, 0, TAU); ctx.stroke() }
    // boost glow
    if (p.boosting) { ctx.fillStyle = 'rgba(255,200,90,0.25)'; ctx.beginPath(); ctx.arc(ps.x, ps.y, 34, 0, TAU); ctx.fill() }
    const blink = p.iframe > 0 && Math.sin(g.time * 30) < 0
    if (!blink) {
      // player-id ring so the two ships are easy to tell apart
      if (g.players.length > 1) { ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(ps.x, ps.y, 26, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1 }
      // recoil kick — the hull lurches back briefly when the cannons fire
      const rk = p.recoil * 5
      const drawX = ps.x - Math.cos(p.heading) * rk, drawY = ps.y - Math.sin(p.heading) * rk
      ctx.save(); ctx.shadowColor = bd.color; ctx.shadowBlur = 14
      drawShip(ctx, drawX, drawY, p.heading, 1.15, bd.color, bd.accent, 0)
      ctx.restore()
      // flag
      ctx.fillStyle = p.dmgBuff > 0 ? '#ff5d5d' : ring
      ctx.save(); ctx.translate(drawX, drawY); ctx.rotate(p.heading)
      ctx.beginPath(); ctx.moveTo(4, -13); ctx.lineTo(4 + 9, -16); ctx.lineTo(4, -19); ctx.closePath(); ctx.fill(); ctx.restore()
    }
  }

  /* — particles — */
  for (const pt of g.particles) {
    const s = w2s(pt.x, pt.y); const a = clamp(pt.life / pt.max, 0, 1)
    if (pt.kind === 'ring') {
      ctx.strokeStyle = pt.color; ctx.globalAlpha = a * 0.8; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(s.x, s.y, pt.size * (1 - a + 0.2) * 2.4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
    } else if (pt.kind === 'smoke') {
      ctx.fillStyle = pt.color; ctx.globalAlpha = a * 0.5
      ctx.beginPath(); ctx.arc(s.x, s.y, pt.size * (2 - a), 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    } else if (pt.kind === 'wake') {
      ctx.fillStyle = pt.color; ctx.globalAlpha = a * 0.5
      ctx.beginPath(); ctx.arc(s.x, s.y, pt.size * a, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    } else if (pt.kind === 'flash') {
      ctx.globalAlpha = a; ctx.fillStyle = pt.color; ctx.shadowColor = '#ffcf6b'; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(s.x, s.y, pt.size * (0.5 + a * 0.8), 0, TAU); ctx.fill()
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    } else {
      ctx.fillStyle = pt.color; ctx.globalAlpha = a
      ctx.beginPath(); ctx.arc(s.x, s.y, pt.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    }
  }

  /* — lightning hazard — */
  if (g.lightning) {
    const s = w2s(g.lightning.x, g.lightning.y)
    if (g.lightning.state === 'warn') {
      const k = 1 - clamp(g.lightning.t / 1.1, 0, 1)
      ctx.strokeStyle = `rgba(180,240,255,${0.5 + k * 0.4})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, TAU); ctx.stroke()
      ctx.fillStyle = `rgba(120,200,255,${0.1 + k * 0.2})`; ctx.beginPath(); ctx.arc(s.x, s.y, 70 * k, 0, TAU); ctx.fill()
    } else {
      ctx.strokeStyle = '#dffaff'; ctx.lineWidth = 5; ctx.shadowColor = '#4fd1ff'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.moveTo(s.x, s.y - VH)
      let yy = s.y - VH; while (yy < s.y) { yy += 40; ctx.lineTo(s.x + rnd(-18, 18), yy) }
      ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(200,240,255,0.4)'; ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, TAU); ctx.fill()
    }
  }

  /* — floating texts — */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const tx of g.texts) {
    const s = w2s(tx.x, tx.y)
    ctx.globalAlpha = clamp(tx.life / 0.9, 0, 1); ctx.font = `bold ${tx.size}px "Press Start 2P", monospace`
    ctx.fillStyle = '#000'; ctx.fillText(tx.txt, s.x + 1, s.y + 1)
    ctx.fillStyle = tx.color; ctx.fillText(tx.txt, s.x, s.y); ctx.globalAlpha = 1
  }

  /* — screen flash (damage / lightning) — */
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,80,80,${g.flash * 0.4})`; ctx.fillRect(0, 0, VW, VH) }

  /* — vignette (focuses the eye on the action) — */
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.98)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH)

  drawHUD(ctx, g)
}

function drawTentacle(ctx: CanvasRenderingContext2D, x: number, y: number, t: Tentacle, rise: number, time: number) {
  const h = 120 * rise
  ctx.save(); ctx.translate(x, y)
  ctx.fillStyle = '#2f5a40'
  ctx.beginPath()
  const sway = Math.sin(t.sway) * 18 * rise
  const segs = 8
  ctx.moveTo(-16, 0)
  for (let i = 0; i <= segs; i++) { const k = i / segs; const sx = -16 + (16 - 16 * k) + Math.sin(time * 6 + k * 4) * 4 + sway * k; ctx.lineTo(sx - (8 - 8 * k), -h * k) }
  for (let i = segs; i >= 0; i--) { const k = i / segs; const sx = 16 - (16 - 16 * k) + Math.sin(time * 6 + k * 4) * 4 + sway * k; ctx.lineTo(sx + (8 - 8 * k), -h * k) }
  ctx.closePath(); ctx.fill()
  // suckers
  ctx.fillStyle = '#7fbf95'
  for (let i = 1; i < segs; i++) { const k = i / segs; ctx.beginPath(); ctx.arc(sway * k + Math.sin(time * 6 + k * 4) * 4, -h * k, 2.5, 0, TAU); ctx.fill() }
  ctx.restore()
}

function drawKraken(ctx: CanvasRenderingContext2D, b: Boss, g: GS, w2s: (x: number, y: number) => { x: number; y: number }, idx: number) {
  const s = w2s(b.x, b.y); const t = g.time
  // body shadow / mass
  ctx.save()
  ctx.shadowColor = '#1a3a28'; ctx.shadowBlur = 30
  ctx.fillStyle = b.hitFlash > 0 ? '#dfffe8' : '#274d38'
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 84, 76, 0, 0, TAU); ctx.fill()
  ctx.shadowBlur = 0
  // mantle highlight
  ctx.fillStyle = b.hitFlash > 0 ? '#fff' : '#356b4c'
  ctx.beginPath(); ctx.ellipse(s.x - 14, s.y - 20, 50, 42, 0, 0, TAU); ctx.fill()
  // writhing arms around body
  ctx.strokeStyle = '#274d38'; ctx.lineCap = 'round'
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.sin(t * 0.8 + i) * 0.2
    ctx.lineWidth = 16
    ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * 60, s.y + Math.sin(a) * 56)
    const ex = s.x + Math.cos(a) * (110 + Math.sin(t * 3 + i) * 16)
    const ey = s.y + Math.sin(a) * (104 + Math.cos(t * 3 + i) * 16)
    const mx = s.x + Math.cos(a + 0.4) * 90, my = s.y + Math.sin(a + 0.4) * 86
    ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke()
  }
  // eye (weak point)
  const blink = Math.sin(t * 0.7) > -0.9
  ctx.fillStyle = '#0c1a12'; ctx.beginPath(); ctx.arc(s.x + 6, s.y - 4, 26, 0, TAU); ctx.fill()
  if (blink) {
    ctx.fillStyle = b.hitFlash > 0 ? '#fff' : '#ffd34d'; ctx.beginPath(); ctx.arc(s.x + 6, s.y - 4, 20, 0, TAU); ctx.fill()
    ctx.fillStyle = '#1a0c00'; const tp = targetPlayer(g, b.x, b.y); const pa = angTo(b.x, b.y, tp.x, tp.y); ctx.beginPath(); ctx.ellipse(s.x + 6 + Math.cos(pa) * 7, s.y - 4 + Math.sin(pa) * 7, 5, 11, pa, 0, TAU); ctx.fill()
  }
  ctx.restore()
  drawBossBar(ctx, b, '🦑 THE KRAKEN', '#7b2f9a', '#c0392b', idx)
}

function drawBossBar(ctx: CanvasRenderingContext2D, b: Boss, label: string, c0: string, c1: string, idx: number) {
  const bw = 360, bx = VW / 2 - bw / 2, by = 18 + idx * 24
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(ctx, bx - 4, by - 4, bw + 8, 24, 6); ctx.fill()
  ctx.fillStyle = '#2a1414'; roundRect(ctx, bx, by, bw, 16, 4); ctx.fill()
  const hpk = clamp(b.hp / b.maxHp, 0, 1)
  const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0); hg.addColorStop(0, c0); hg.addColorStop(1, c1)
  ctx.fillStyle = hg; roundRect(ctx, bx, by, bw * hpk, 16, 4); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, VW / 2, by + 8)
}

function drawLeviathan(ctx: CanvasRenderingContext2D, b: Boss, g: GS, w2s: (x: number, y: number) => { x: number; y: number }, idx: number) {
  const t = g.time
  const submerged = b.mode === 'submerge' || b.mode === 'rise'
  const trail = b.trail || []

  // expanding shockwave ring
  if (b.shock) {
    const o = w2s(b.shock.ox, b.shock.oy); const r = (b.shock.t / b.shock.max) * 470
    ctx.strokeStyle = `rgba(150,230,200,${clamp(1 - b.shock.t / b.shock.max, 0, 1) * 0.9})`; ctx.lineWidth = 14
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, TAU); ctx.stroke()
  }
  // slam telegraph (rear-up warning)
  if (b.mode === 'slamWarn') {
    const s = w2s(b.x, b.y); const k = 1 - clamp((b.modeT ?? 0) / 0.85, 0, 1)
    ctx.strokeStyle = `rgba(255,210,90,${0.4 + k * 0.5})`; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(s.x, s.y, 90 + k * 30, 0, TAU); ctx.stroke()
  }

  ctx.save()
  ctx.globalAlpha = submerged ? 0.4 : 1
  // body segments (tail → head) so the head sits on top
  for (let j = LEV_SEGS; j >= 1; j--) {
    const pt = trail[Math.min(j * LEV_SPACING, trail.length - 1)]; if (!pt) continue
    const s = w2s(pt.x, pt.y); const r = 26 - (j / LEV_SEGS) * 16
    ctx.fillStyle = submerged ? '#1c3a4a' : (b.hitFlash > 0 ? '#dfffe8' : '#1f5c4a')
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill()
    // dorsal ridge highlight
    ctx.fillStyle = submerged ? '#244a5e' : '#2f7d62'
    ctx.beginPath(); ctx.arc(s.x, s.y - r * 0.3, r * 0.55, 0, TAU); ctx.fill()
    // fins every few segments
    if (!submerged && j % 3 === 0 && j > 2) {
      const prev = trail[Math.min((j + 1) * LEV_SPACING, trail.length - 1)] || pt
      const fa = angTo(prev.x, prev.y, pt.x, pt.y) + Math.PI / 2
      ctx.fillStyle = '#6ddf8a'
      for (const dir of [1, -1]) {
        ctx.beginPath(); ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + Math.cos(fa) * dir * (r + 10), s.y + Math.sin(fa) * dir * (r + 10))
        ctx.lineTo(s.x + Math.cos(fa) * dir * r * 0.4 + Math.cos(fa + 1.4) * dir * 6, s.y + Math.sin(fa) * dir * r * 0.4 + Math.sin(fa + 1.4) * dir * 6)
        ctx.closePath(); ctx.fill()
      }
    }
  }
  // head
  const hs = w2s(b.x, b.y); const ha = b.swimAng ?? 0
  ctx.translate(hs.x, hs.y); ctx.rotate(ha)
  ctx.fillStyle = submerged ? '#244a5e' : (b.hitFlash > 0 ? '#fff' : '#256b54')
  ctx.shadowColor = submerged ? '#0a2a3a' : '#1a3a28'; ctx.shadowBlur = submerged ? 12 : 22
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 26, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
  if (!submerged) {
    // jaw
    ctx.fillStyle = '#143a2e'
    ctx.beginPath(); ctx.moveTo(28, -4); ctx.lineTo(44, -2); ctx.lineTo(44, 6); ctx.lineTo(26, 10); ctx.closePath(); ctx.fill()
    // teeth
    ctx.fillStyle = '#eafff2'
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 4, 2); ctx.lineTo(32 + i * 4, 8); ctx.lineTo(34 + i * 4, 2); ctx.closePath(); ctx.fill() }
    // horns
    ctx.strokeStyle = '#163b30'; ctx.lineWidth = 4; ctx.lineCap = 'round'
    for (const dir of [1, -1]) { ctx.beginPath(); ctx.moveTo(-10, dir * 14); ctx.quadraticCurveTo(-26, dir * 24, -34, dir * 16); ctx.stroke() }
    // eyes (weak point glow)
    const eyeOn = b.hitFlash > 0 || Math.sin(t * 6) > -0.6
    for (const dir of [1, -1]) {
      ctx.fillStyle = '#0c1a12'; ctx.beginPath(); ctx.arc(8, dir * 11, 7, 0, TAU); ctx.fill()
      if (eyeOn) { ctx.fillStyle = b.hitFlash > 0 ? '#fff' : '#ffd34d'; ctx.beginPath(); ctx.arc(8, dir * 11, 4.5, 0, TAU); ctx.fill() }
    }
  } else {
    // glowing eyes peering from underwater
    for (const dir of [1, -1]) { ctx.fillStyle = 'rgba(120,220,180,0.8)'; ctx.beginPath(); ctx.arc(8, dir * 10, 4, 0, TAU); ctx.fill() }
  }
  ctx.restore()

  drawBossBar(ctx, b, '🐉 THE LEVIATHAN', '#1f7d62', '#2fae5a', idx)
}

function drawDutchman(ctx: CanvasRenderingContext2D, b: Boss, g: GS, w2s: (x: number, y: number) => { x: number; y: number }, idx: number) {
  const s = w2s(b.x, b.y); const t = g.time
  // spectral fade per state
  let alpha = 0.9
  if (b.mode === 'arrive') alpha = 0.9 * (1 - clamp((b.modeT ?? 0) / 1.6, 0, 1))
  else if (b.mode === 'phaseOut') alpha = 0.9 * clamp((b.modeT ?? 0) / 0.55, 0, 1)
  else if (b.mode === 'phaseIn') alpha = 0.9 * (1 - clamp((b.modeT ?? 0) / 0.5, 0, 1))

  // broadside telegraph — glowing firing arc along the flank
  if (b.mode === 'broadsideTele') {
    const k = 1 - clamp((b.modeT ?? 0) / 0.9, 0, 1)
    const aim = b.aimAng
    ctx.strokeStyle = `rgba(126,255,200,${0.3 + k * 0.5})`; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(s.x, s.y, 90, aim - 0.5, aim + 0.5); ctx.stroke()
  }

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(s.x, s.y); ctx.rotate(b.swimAng ?? 0)
  ctx.shadowColor = '#6effc0'; ctx.shadowBlur = 26
  const L = 92, W = 34
  const hull = b.hitFlash > 0 ? '#eafff2' : '#11332b'
  // hull
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(L, 0)
  ctx.bezierCurveTo(L * 0.55, -W, -L * 0.72, -W, -L, -W * 0.5)
  ctx.lineTo(-L, W * 0.5)
  ctx.bezierCurveTo(-L * 0.72, W, L * 0.55, W, L, 0)
  ctx.closePath(); ctx.fill()
  // glowing rim
  ctx.strokeStyle = '#6effc0'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.stroke()
  ctx.shadowBlur = 0
  // deck
  ctx.fillStyle = 'rgba(40,90,75,0.7)'
  ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.6, W * 0.62, 0, 0, TAU); ctx.fill()
  // gun ports (glowing cannon mouths along both flanks)
  ctx.fillStyle = b.mode === 'broadside' ? '#fff0b0' : '#3a8a6e'
  for (let i = -2; i <= 2; i++) {
    for (const dir of [-1, 1]) { ctx.beginPath(); ctx.arc(i * 22, dir * (W * 0.82), 3.2, 0, TAU); ctx.fill() }
  }
  // three tattered masts/sails across the beam
  const masts = [38, -2, -46]
  for (let m = 0; m < masts.length; m++) {
    const hx = masts[m]; const sH = (m === 1 ? W * 1.5 : W * 1.25)
    const billow = Math.sin(t * 2 + m) * 4
    ctx.fillStyle = `rgba(210,255,235,${0.42 + Math.sin(t * 2 + m) * 0.05})`
    ctx.beginPath()
    ctx.moveTo(hx, -sH)
    ctx.quadraticCurveTo(hx - 10 + billow, 0, hx, sH)
    // ragged trailing edge
    ctx.lineTo(hx + 6, sH * 0.6); ctx.lineTo(hx + 1, sH * 0.3)
    ctx.lineTo(hx + 7, 0); ctx.lineTo(hx + 1, -sH * 0.3); ctx.lineTo(hx + 6, -sH * 0.6)
    ctx.closePath(); ctx.fill()
    // mast pole
    ctx.strokeStyle = 'rgba(20,50,40,0.8)'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(hx, -sH); ctx.lineTo(hx, sH); ctx.stroke()
  }
  // skull emblem on the main sail
  ctx.fillStyle = `rgba(235,255,245,${0.7})`
  ctx.beginPath(); ctx.arc(-2, 0, 7, 0, TAU); ctx.fill()
  ctx.fillStyle = '#11332b'
  ctx.beginPath(); ctx.arc(-4, -1.5, 1.6, 0, TAU); ctx.arc(0, -1.5, 1.6, 0, TAU); ctx.fill()
  ctx.fillRect(-4, 3, 4, 1.4)
  ctx.restore()

  drawBossBar(ctx, b, '☠ THE FLYING DUTCHMAN', '#2f8a6e', '#1a5a8a', idx)
}

const P_KEYS = [
  { boost: '[SHIFT]', torp: '[SPACE]', ult: '[E]' },
  { boost: '[/]', torp: '[.]', ult: '[,]' },
]
function drawPlayerHUD(ctx: CanvasRenderingContext2D, p: Player, rightSide: boolean) {
  const w = 210, x = rightSide ? VW - 18 - w : 18, by = VH - 86
  const keys = P_KEYS[p.id] ?? P_KEYS[0]
  const tag = 'P' + (p.id + 1)
  if (p.dead) {
    bar(ctx, x, by, w, 16, 0, '#ff5d5d', '#3a1414', `${tag} SUNK`)
    ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#ff9a9a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText('RESPAWN IN ' + Math.ceil(p.respawn), x + 5, by + 30)
    return
  }
  bar(ctx, x, by, w, 16, p.hp / p.maxHp, '#ff5d5d', '#3a1414', `${tag} HULL ${Math.ceil(p.hp)}`)
  bar(ctx, x, by + 24, w, 12, p.boost / p.boostMax, '#ffc83d', '#3a3014', 'BOOST ' + keys.boost)
  const ultk = p.ultTimer > 0 ? 1 : p.ult / p.ultMax
  bar(ctx, x, by + 44, w, 12, ultk, p.ult >= p.ultMax ? '#5be0ff' : '#3a7a8a', '#143038', p.ult >= p.ultMax ? 'ULT READY ' + keys.ult : 'ULTIMATE')
  ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#ffae4a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('🚀 x' + p.secAmmo + ' ' + keys.torp, x, by + 70)
  let bxi = x + 118
  const bi = (cond: boolean, icon: string, col: string) => { if (!cond) return; ctx.font = '13px serif'; ctx.fillStyle = col; ctx.fillText(icon, bxi, by + 70); bxi += 18 }
  bi(p.dmgBuff > 0, '⚔', '#ff5d5d'); bi(p.shield > 0, '🛡', '#5db8ff'); bi(p.rapid > 0, '⚡', '#ffe14d'); bi(p.nitro > 0, '🔥', '#ffb13d')
}
function drawHUD(ctx: CanvasRenderingContext2D, g: GS) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  // per-player panels (P1 bottom-left, P2 bottom-right)
  for (const p of g.players) drawPlayerHUD(ctx, p, p.id === 1)

  // top-left score / wave
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(ctx, 14, 14, 200, 56, 6); ctx.fill()
  ctx.font = '14px "Press Start 2P", monospace'; ctx.fillStyle = '#c89b3c'; ctx.textAlign = 'left'
  ctx.fillText(String(g.score).padStart(5, '0'), 26, 32)
  ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#a09880'
  ctx.fillText(g.bossSpawned ? 'BOSS FIGHT' : 'WAVE ' + g.wave, 26, 52)
  ctx.fillStyle = '#8a8270'; ctx.fillText('KILLS ' + g.kills, 120, 52)

  // minimap (top-right) — shifts below the stacked boss bars
  const mmw = 150, mmh = 100, mmx = VW - mmw - 14, mmy = g.bosses.length ? 26 + g.bosses.length * 24 : 14
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.strokeStyle = '#2a3340'; ctx.lineWidth = 1
  roundRect(ctx, mmx, mmy, mmw, mmh, 4); ctx.fill(); ctx.stroke()
  const sx = mmw / WW, sy = mmh / WH
  for (const ro of g.rocks) { ctx.fillStyle = '#3a4450'; ctx.beginPath(); ctx.arc(mmx + ro.x * sx, mmy + ro.y * sy, Math.max(2, ro.r * sx), 0, TAU); ctx.fill() }
  for (const e of g.enemies) { if (e.hp <= 0) continue; ctx.fillStyle = e.type === 'suicide' ? '#ff5d3d' : '#ff8a6a'; ctx.fillRect(mmx + e.x * sx - 1, mmy + e.y * sy - 1, 3, 3) }
  for (const pu of g.powerups) { ctx.fillStyle = '#5be08a'; ctx.fillRect(mmx + pu.x * sx - 1, mmy + pu.y * sy - 1, 2, 2) }
  for (const bo of g.bosses) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(mmx + bo.x * sx, mmy + bo.y * sy, 4, 0, TAU); ctx.fill() }
  for (const p of g.players) { if (p.dead) continue; ctx.fillStyle = p.id === 0 ? '#ffd34d' : '#4fd1ff'; ctx.beginPath(); ctx.arc(mmx + p.x * sx, mmy + p.y * sy, 3, 0, TAU); ctx.fill() }

  // banner
  if (g.banner) {
    const a = clamp(g.banner.life, 0, 1) * clamp((g.banner.life > 0.3 ? 1 : g.banner.life / 0.3), 0, 1)
    ctx.globalAlpha = clamp(a, 0, 1); ctx.textAlign = 'center'
    ctx.font = '26px "Press Start 2P", monospace'; ctx.fillStyle = '#000'; ctx.fillText(g.banner.txt, VW / 2 + 2, 150 + 2)
    ctx.fillStyle = '#c89b3c'; ctx.fillText(g.banner.txt, VW / 2, 150)
    if (g.banner.sub) { ctx.font = '11px "Press Start 2P", monospace'; ctx.fillStyle = '#e8e6e0'; ctx.fillText(g.banner.sub, VW / 2, 182) }
    ctx.globalAlpha = 1
  }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, col: string, bg: string, label: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 4); ctx.fill()
  ctx.fillStyle = bg; roundRect(ctx, x, y, w, h, 3); ctx.fill()
  ctx.fillStyle = col; roundRect(ctx, x, y, w * clamp(k, 0, 1), h, 3); ctx.fill()
  ctx.font = '7px "Press Start 2P", monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 5, y + h / 2 + 1)
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/* ═══════════════════ REACT COMPONENT ═══════════════════ */
export default function PirateCarnage() {
  const [screen, setScreen] = useState<'menu' | 'playing' | 'victory' | 'defeat'>('menu')
  const [playerCount, setPlayerCount] = useState(1)
  const [b1, setB1] = useState(0)   // Player 1 ship index
  const [b2, setB2] = useState(3)   // Player 2 ship index
  const [activeTab, setActiveTab] = useState(0) // which player you're picking for (2P)
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(0.34)
  const [finalScore, setFinalScore] = useState(0)
  const [finalKills, setFinalKills] = useState(0)
  const [xpDone, setXpDone] = useState(false)
  const [paused, setPaused] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GS | null>(null)
  const rafRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  const edgeRef = useRef<PlayerEdge[]>([{ sec: false, ult: false }, { sec: false, ult: false }])
  const lastRef = useRef(0)
  const pausedRef = useRef(false)
  const screenRef = useRef(screen)
  screenRef.current = screen
  pausedRef.current = paused

  const claimXp = useCallback(async () => {
    setXpDone(true)
    try { await fetch('/api/minigame/win', { method: 'POST' }) } catch { /* ignore */ }
  }, [])

  const startGame = useCallback((count: number, i1: number, i2: number) => {
    Sfx.resume(); Sfx.playMusic('battle')
    const builds = count === 2 ? [BUILDS[i1], BUILDS[i2]] : [BUILDS[i1]]
    gsRef.current = mkState(builds)
    setFinalScore(0); setFinalKills(0); setXpDone(false); setPaused(false)
    setScreen('playing')
  }, [])

  // keyboard (P1: WASD + Shift/Space/E · P2: Arrows + / . ,)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', '/'].includes(k)) e.preventDefault()
      if (screenRef.current !== 'playing') return
      const E = edgeRef.current
      if (k === ' ') { if (!keysRef.current.has(' ')) E[0].sec = true }
      if (k === 'e') { if (!keysRef.current.has('e')) E[0].ult = true }
      if (k === '.') { if (!keysRef.current.has('.')) E[1].sec = true }
      if (k === ',') { if (!keysRef.current.has(',')) E[1].ult = true }
      if (k === 'p' || k === 'escape') setPaused(v => !v)
      keysRef.current.add(k === ' ' ? ' ' : k)
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase() === ' ' ? ' ' : e.key.toLowerCase()) }
    const blur = () => keysRef.current.clear()
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])

  // game loop
  useEffect(() => {
    if (screen !== 'playing') { cancelAnimationFrame(rafRef.current); return }
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    lastRef.current = performance.now()
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop)
      const g = gsRef.current; if (!g) return
      let dt = (now - lastRef.current) / 1000; lastRef.current = now
      if (dt > 0.05) dt = 0.05
      if (!pausedRef.current) {
        const E = edgeRef.current
        tick(g, dt, keysRef.current, E)
        E[0].sec = E[0].ult = false; E[1].sec = E[1].ult = false
      }
      render(ctx, g)
      if (pausedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH)
        ctx.fillStyle = '#c89b3c'; ctx.font = '28px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('PAUSED', VW / 2, VH / 2 - 10)
        ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = '#a09880'
        ctx.fillText('PRESS P TO RESUME', VW / 2, VH / 2 + 30)
      }
      if (g.state === 'victory' || g.state === 'defeat') {
        setFinalScore(g.score); setFinalKills(g.kills)
        setScreen(g.state)
      }
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen])

  useEffect(() => () => { Sfx.stopMusic() }, [])

  // duck the music while paused
  useEffect(() => { Sfx.duck(paused && screen === 'playing') }, [paused, screen])

  // gentle menu/shanty music — only after a user gesture (browser autoplay policy)
  const startMenuMusic = useCallback(() => { Sfx.resume(); Sfx.playMusic('menu') }, [])

  const toggleMute = () => { const m = !muted; setMuted(m); Sfx.setMuted(m) }
  // volume slider — turning it up unmutes
  const onVolume = (v: number) => {
    setVol(v); Sfx.resume(); Sfx.setVolume(v)
    if (muted && v > 0) { setMuted(false); Sfx.setMuted(false) }
  }

  const activeIdx = playerCount === 2 ? (activeTab === 0 ? b1 : b2) : b1
  const pickShip = (i: number) => {
    Sfx.resume()
    if (playerCount === 2 && activeTab === 1) setB2(i)
    else setB1(i)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 24px' }}>
      <style>{`
        @keyframes pc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pc-pop { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
        .pc-wrap { position:relative; width:100%; max-width:960px; }
        .pc-canvas { width:100%; height:auto; display:block; image-rendering:auto; border:2px solid #2a2820; border-radius:10px; box-shadow:0 0 40px rgba(0,0,0,0.6); background:#0a2438; }
        .pc-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border-radius:10px; }
        .pc-btn { font-family:"Press Start 2P",monospace; cursor:pointer; transition:transform .1s,filter .1s; }
        .pc-btn:hover { transform:translateY(-2px); filter:brightness(1.12); }
        .pc-build { animation:pc-pop .25s ease; }
        .pc-vol { -webkit-appearance:none; appearance:none; height:6px; border-radius:3px; background:#2a2820; outline:none; accent-color:#c89b3c; }
        .pc-vol::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:#c89b3c; border:1px solid #8b6914; cursor:pointer; box-shadow:0 0 6px rgba(200,155,60,0.6); }
        .pc-vol::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:#c89b3c; border:1px solid #8b6914; cursor:pointer; box-shadow:0 0 6px rgba(200,155,60,0.6); }
        .pc-vol::-moz-range-track { height:6px; border-radius:3px; background:#2a2820; }
      `}</style>

      <div className="pc-wrap">
        <canvas ref={canvasRef} width={VW} height={VH} className="pc-canvas" />

        {/* MENU */}
        {screen === 'menu' && (
          <div className="pc-overlay" onMouseDown={startMenuMusic} style={{ background: 'radial-gradient(circle at 50% 30%, rgba(20,40,70,0.92), rgba(8,16,28,0.97))', padding: 20, overflow: 'auto' }}>
            <div style={{ fontSize: 'clamp(26px,6vw,46px)', color: '#c89b3c', fontFamily: '"Press Start 2P",monospace', letterSpacing: 3, textShadow: '0 0 18px rgba(200,155,60,0.5)', lineHeight: 1.2 }}>PIRATE</div>
            <div style={{ fontSize: 'clamp(26px,6vw,46px)', color: '#ff6b2b', fontFamily: '"Press Start 2P",monospace', letterSpacing: 3, textShadow: '0 0 18px rgba(255,107,43,0.5)', lineHeight: 1.2, marginBottom: 4 }}>CARNAGE</div>
            {/* player count */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[1, 2].map(n => (
                <button key={n} className="pc-btn" onClick={() => { Sfx.resume(); setPlayerCount(n); setActiveTab(0) }}
                  style={{
                    background: playerCount === n ? 'linear-gradient(135deg,#c89b3c,#8b6914)' : '#13131c',
                    border: `2px solid ${playerCount === n ? '#c89b3c' : '#2a2820'}`, color: playerCount === n ? '#0d0d14' : '#a09880',
                    padding: '8px 18px', borderRadius: 6, fontSize: 10,
                  }}>{n === 1 ? '1 PLAYER' : '2 PLAYERS (CO-OP)'}</button>
              ))}
            </div>

            {/* player tabs (2P only) */}
            {playerCount === 2 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[0, 1].map(t => {
                  const sel = activeTab === t; const col = t === 0 ? '#ffd34d' : '#4fd1ff'
                  return (
                    <button key={t} className="pc-btn" onClick={() => setActiveTab(t)}
                      style={{ background: sel ? `${col}22` : '#0d0d14', border: `2px solid ${sel ? col : '#2a2820'}`, color: col, padding: '6px 14px', borderRadius: 6, fontSize: 9 }}>
                      P{t + 1}: {BUILDS[t === 0 ? b1 : b2].name}
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ color: '#a09880', fontSize: 10, fontFamily: '"Press Start 2P",monospace', marginBottom: 12 }}>
              {playerCount === 2 ? `CHOOSE SHIP FOR PLAYER ${activeTab + 1}` : 'CHOOSE YOUR SHIP'}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 760 }}>
              {BUILDS.map((bd, i) => (
                <div key={bd.id} onClick={() => pickShip(i)}
                  className="pc-btn"
                  style={{
                    width: 168, padding: '14px 12px', borderRadius: 10, textAlign: 'left',
                    background: i === activeIdx ? `linear-gradient(160deg, ${bd.color}33, #0d0d14)` : '#0d0d14',
                    border: `2px solid ${i === activeIdx ? bd.color : '#2a2820'}`,
                    boxShadow: i === activeIdx ? `0 0 22px ${bd.color}55` : 'none',
                  }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{bd.icon}</div>
                  <div style={{ color: bd.color, fontFamily: '"Press Start 2P",monospace', fontSize: 13, marginBottom: 6 }}>{bd.name}</div>
                  <div style={{ color: '#a09880', fontSize: 11, lineHeight: 1.45, fontFamily: 'Inter,sans-serif', marginBottom: 8 }}>{bd.desc}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Stat label="HULL" v={bd.hp} max={200} c={bd.color} />
                    <Stat label="SPD" v={bd.speed} max={410} c={bd.color} />
                    <Stat label="DMG" v={bd.dmg} max={15} c={bd.color} />
                  </div>
                  <div style={{ color: '#605848', fontSize: 9, fontFamily: '"Press Start 2P",monospace', marginTop: 8 }}>{bd.weapon}</div>
                </div>
              ))}
            </div>

            <button className="pc-btn" onClick={() => startGame(playerCount, b1, b2)}
              style={{ marginTop: 18, background: `linear-gradient(135deg,${BUILDS[b1].color},#8b4a14)`, border: 'none', color: '#0d0d14', padding: '16px 52px', borderRadius: 8, fontSize: 14, letterSpacing: 2 }}>
              ⚓ SET SAIL
            </button>
            <div style={{ color: '#605848', fontSize: 9, fontFamily: '"Press Start 2P",monospace', marginTop: 14, lineHeight: 1.8 }}>
              {playerCount === 2 ? (
                <>
                  P1 &nbsp;WASD · SHIFT · SPACE · E<br />
                  P2 &nbsp;ARROWS · / · . · ,&nbsp; (boost · torpedo · ult)<br />
                </>
              ) : (
                <>
                  MOVE: WASD / ARROWS &nbsp;·&nbsp; BOOST: SHIFT<br />
                  TORPEDO: SPACE &nbsp;·&nbsp; ULTIMATE: E &nbsp;·&nbsp; PAUSE: P<br />
                </>
              )}
              <span style={{ color: '#a09880' }}>Cannons auto-fire — focus on dodging & ramming!</span>
            </div>
          </div>
        )}

        {/* VICTORY */}
        {screen === 'victory' && (
          <div className="pc-overlay" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(40,70,40,0.92), rgba(8,16,12,0.97))', padding: 24 }}>
            <div style={{ fontSize: 'clamp(28px,7vw,52px)', color: '#5be08a', fontFamily: '"Press Start 2P",monospace', textShadow: '0 0 20px rgba(91,224,138,0.6)' }}>VICTORY</div>
            <div style={{ color: '#c89b3c', fontFamily: '"Press Start 2P",monospace', fontSize: 13, marginTop: 8 }}>THE DEEP IS CONQUERED!</div>
            <div style={{ color: '#e8e6e0', fontFamily: '"Press Start 2P",monospace', fontSize: 16, marginTop: 18 }}>SCORE {finalScore}</div>
            <div style={{ color: '#a09880', fontFamily: '"Press Start 2P",monospace', fontSize: 11, marginTop: 8 }}>{finalKills} SHIPS SUNK</div>
            {!xpDone ? (
              <button className="pc-btn" onClick={claimXp} style={{ marginTop: 20, background: 'linear-gradient(135deg,#c89b3c,#8b6914)', border: 'none', color: '#0d0d14', padding: '14px 40px', borderRadius: 8, fontSize: 12 }}>CLAIM +25 FUN XP</button>
            ) : (
              <div style={{ marginTop: 20, color: '#5be08a', fontFamily: '"Press Start 2P",monospace', fontSize: 11 }}>✓ +25 FUN XP AWARDED</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="pc-btn" onClick={() => startGame(playerCount, b1, b2)} style={menuBtn}>SAIL AGAIN</button>
              <button className="pc-btn" onClick={() => { setScreen('menu'); Sfx.playMusic('menu') }} style={menuBtnAlt}>CHANGE SHIP</button>
            </div>
          </div>
        )}

        {/* DEFEAT */}
        {screen === 'defeat' && (
          <div className="pc-overlay" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(70,20,20,0.92), rgba(16,8,8,0.97))', padding: 24 }}>
            <div style={{ fontSize: 'clamp(26px,6vw,48px)', color: '#ff5d5d', fontFamily: '"Press Start 2P",monospace', textShadow: '0 0 20px rgba(255,93,93,0.6)' }}>SUNK!</div>
            <div style={{ color: '#a09880', fontFamily: '"Press Start 2P",monospace', fontSize: 11, marginTop: 10 }}>Your ship rests with Davy Jones.</div>
            <div style={{ color: '#e8e6e0', fontFamily: '"Press Start 2P",monospace', fontSize: 16, marginTop: 18 }}>SCORE {finalScore}</div>
            <div style={{ color: '#a09880', fontFamily: '"Press Start 2P",monospace', fontSize: 11, marginTop: 8 }}>{finalKills} SHIPS SUNK</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="pc-btn" onClick={() => startGame(playerCount, b1, b2)} style={menuBtn}>TRY AGAIN</button>
              <button className="pc-btn" onClick={() => { setScreen('menu'); Sfx.playMusic('menu') }} style={menuBtnAlt}>CHANGE SHIP</button>
            </div>
          </div>
        )}

        {/* top controls — volume + mute are always available so sound can be tuned anywhere */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6, zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(13,13,20,0.8)', border: '1px solid #2a2820', borderRadius: 6, padding: '6px 10px' }}>
            <span style={{ fontSize: 12 }}>{muted || vol === 0 ? '🔇' : vol < 0.4 ? '🔉' : '🔊'}</span>
            <input
              className="pc-vol"
              type="range" min={0} max={1} step={0.01}
              value={muted ? 0 : vol}
              onChange={e => onVolume(parseFloat(e.target.value))}
              title="Volume"
              style={{ width: 84, cursor: 'pointer' }}
            />
          </div>
          <button className="pc-btn" onClick={toggleMute} style={iconBtn} title={muted ? 'Sound off' : 'Sound on'}>{muted ? '🔇' : '🔊'}</button>
          {screen === 'playing' && (
            <button className="pc-btn" onClick={() => setPaused(v => !v)} style={iconBtn} title={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '⏸'}</button>
          )}
        </div>
      </div>

      <p style={{ color: '#605848', fontSize: 12, fontFamily: 'Inter,sans-serif', textAlign: 'center', maxWidth: 640, lineHeight: 1.6 }}>
        Twisted Metal on the high seas — solo or <span style={{ color: '#c89b3c' }}>2-player local co-op</span>. Pick a ship, boost through the chaos, grab power-ups, and survive the boss gauntlet — the Kraken, then the Leviathan, then the Flying Dutchman. Win to earn <span style={{ color: '#c89b3c' }}>+25 Fun XP</span>.
      </p>
    </div>
  )
}

function Stat({ label, v, max, c }: { label: string; v: number; max: number; c: string }) {
  return (
    <div style={{ flex: 1, minWidth: 38 }}>
      <div style={{ color: '#605848', fontSize: 7, fontFamily: '"Press Start 2P",monospace', marginBottom: 2 }}>{label}</div>
      <div style={{ height: 5, background: '#1e1c18', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (v / max) * 100)}%`, background: c }} />
      </div>
    </div>
  )
}

const menuBtn: React.CSSProperties = { fontFamily: '"Press Start 2P",monospace', background: 'linear-gradient(135deg,#c89b3c,#8b6914)', border: 'none', color: '#0d0d14', padding: '12px 28px', borderRadius: 8, fontSize: 11 }
const menuBtnAlt: React.CSSProperties = { fontFamily: '"Press Start 2P",monospace', background: '#13131c', border: '2px solid #2a2820', color: '#a09880', padding: '12px 24px', borderRadius: 8, fontSize: 11 }
const iconBtn: React.CSSProperties = { fontFamily: '"Press Start 2P",monospace', background: 'rgba(13,13,20,0.8)', border: '1px solid #2a2820', color: '#c89b3c', padding: '8px 12px', borderRadius: 6, fontSize: 14 }
