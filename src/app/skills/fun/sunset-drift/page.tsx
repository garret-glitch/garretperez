'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════
   SUNSET DRIFT — a fun-first arcade street racer.
   Top-down, rotating-camera (your car points up). Drift, nitrous, rivals
   with personality, traffic, jumps, shortcuts, and an unlock-&-customize
   garage. Self-contained client component. No assets. Synthesized Web Audio.
   Sunset coastal-highway theme.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── constants ── */
const VW = 900, VH = 600
const TAU = Math.PI * 2

/* ── math ── */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)
const angTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2(by - ay, bx - ax)
const normAng = (a: number) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a }

interface V2 { x: number; y: number }

/* ═══ SOUND — synthesized Web Audio (no files) ═══ */
const Sfx = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let sfxBus: GainNode | null = null
  let muted = false
  let vol = 0.4
  const last: Record<string, number> = {}
  // persistent engine drone nodes
  let engOsc: OscillatorNode | null = null
  let engSub: OscillatorNode | null = null
  let engGain: GainNode | null = null
  let screechSrc: AudioBufferSourceNode | null = null
  let screechGain: GainNode | null = null

  function ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : vol; master.connect(ctx.destination)
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master)
    }
    return ctx
  }
  function resume() { const c = ensure(); if (c && c.state === 'suspended') void c.resume() }
  function setMuted(m: boolean) { muted = m; if (master && ctx) master.gain.setTargetAtTime(m ? 0 : vol, ctx.currentTime, 0.02) }
  function isMuted() { return muted }
  function setVolume(v: number) { vol = clamp(v, 0, 1); if (master && ctx && !muted) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02) }
  function getVolume() { return vol }
  function ok(key?: string, ms?: number): AudioContext | null {
    const c = ensure(); if (!c || !sfxBus || muted) return null
    if (key && ms) { const now = c.currentTime * 1000; if (last[key] && now - last[key] < ms) return null; last[key] = now }
    return c
  }
  function blip(c: AudioContext, freq: number, dur: number, type: OscillatorType, v: number, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.012, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(sfxBus!); o.start(t); o.stop(t + dur + 0.03)
  }
  function noise(c: AudioContext, dur: number, v: number, filt: BiquadFilterType, freq: number, q = 1, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf
    const f = c.createBiquadFilter(); f.type = filt; f.frequency.setValueAtTime(freq, t); f.Q.value = q
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f); f.connect(g); g.connect(sfxBus!); src.start(t); src.stop(t + dur)
  }

  /* ── persistent engine drone — frequency tracks rpm ── */
  function engineStart() {
    const c = ensure(); if (!c || !sfxBus || engOsc) return
    engGain = c.createGain(); engGain.gain.value = 0.0
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
    engOsc = c.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 70
    engSub = c.createOscillator(); engSub.type = 'square'; engSub.frequency.value = 46
    const subG = c.createGain(); subG.gain.value = 0.5
    engOsc.connect(engGain); engSub.connect(subG); subG.connect(engGain)
    engGain.connect(lp); lp.connect(sfxBus)
    engOsc.start(); engSub.start()
  }
  function engineSet(rpm: number) {
    if (!engOsc || !engSub || !engGain || !ctx) return
    const f = 58 + rpm * 240
    engOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.06)
    engSub.frequency.setTargetAtTime(f * 0.5, ctx.currentTime, 0.06)
    engGain.gain.setTargetAtTime(0.05 + rpm * 0.10, ctx.currentTime, 0.08)
  }
  function engineStop() {
    if (engOsc && ctx) { try { engGain!.gain.setTargetAtTime(0, ctx.currentTime, 0.05); engOsc.stop(ctx.currentTime + 0.2); engSub!.stop(ctx.currentTime + 0.2) } catch { /* noop */ } }
    engOsc = engSub = null; engGain = null
  }
  /* ── continuous tyre screech while drifting ── */
  function screechSet(amt: number) {
    const c = ensure(); if (!c || !sfxBus) return
    if (amt > 0.02) {
      if (!screechSrc) {
        const n = Math.floor(c.sampleRate * 0.5); const buf = c.createBuffer(1, n, c.sampleRate)
        const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
        screechSrc = c.createBufferSource(); screechSrc.buffer = buf; screechSrc.loop = true
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.2
        screechGain = c.createGain(); screechGain.gain.value = 0
        screechSrc.connect(f); f.connect(screechGain); screechGain.connect(sfxBus)
        screechSrc.start()
      }
      if (screechGain && !muted) screechGain.gain.setTargetAtTime(clamp(amt, 0, 1) * 0.16, c.currentTime, 0.05)
    } else if (screechGain) {
      screechGain.gain.setTargetAtTime(0, c.currentTime, 0.08)
    }
  }
  function screechStop() {
    if (screechSrc) { try { screechSrc.stop() } catch { /* noop */ } }
    screechSrc = null; screechGain = null
  }

  /* ── procedural music engine ── */
  let musicBus: GainNode | null = null
  let leadBus: GainNode | null = null
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let curTrack = '', mstep = 0, nextTime = 0, lastRoot = 0
  function ensureMusic() {
    const c = ensure(); if (!c || musicBus) return
    musicBus = c.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master!)
    leadBus = c.createGain(); leadBus.gain.value = 1; leadBus.connect(musicBus)
    const dly = c.createDelay(0.6); dly.delayTime.value = 0.21
    const fb = c.createGain(); fb.gain.value = 0.3
    const dw = c.createGain(); dw.gain.value = 0.45
    leadBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(dw); dw.connect(musicBus)
  }
  function mnote(c: AudioContext, freq: number, time: number, dur: number, type: OscillatorType, v: number, dest: AudioNode) {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, time)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + dur + 0.04)
  }
  function mkick(c: AudioContext, time: number, dest: AudioNode, v: number) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(46, time + 0.12)
    const g = c.createGain(); g.gain.setValueAtTime(v, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.17)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + 0.19)
  }
  function msnare(c: AudioContext, time: number, dest: AudioNode, v: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.13)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.4)
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500
    const g = c.createGain(); g.gain.setValueAtTime(v, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.13)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.14)
  }
  function mhat(c: AudioContext, time: number, dest: AudioNode, v: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.03)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8200
    const g = c.createGain(); g.gain.setValueAtTime(v, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.03)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.04)
  }
  const D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98, A2 = 110, B2 = 123.47, C3 = 130.81, E3 = 164.81, A3 = 220, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25
  type Trk = { bpm: number; bass: (number | null)[]; lead: (number | null)[]; kick: number[]; leadType: OscillatorType; snare?: number[]; soft?: boolean; padVol?: number }
  const TRACKS: Record<string, Trk> = {
    // warm synthwave cruise for the menu / garage
    menu: {
      bpm: 100, leadType: 'triangle', soft: true, padVol: 0.06,
      bass: [A2, null, E2, null, F2, null, C3, null, G2, null, D2, null, F2, null, E2, null],
      lead: [E4, null, A4, null, C5, null, B4, null, A4, null, G4, null, E4, null, D4, null],
      kick: [0, 8], snare: [4, 12],
    },
    // driving outrun beat for the race
    race: {
      bpm: 152, leadType: 'sawtooth', padVol: 0.05,
      bass: [A2, A2, A2, A2, F2, F2, F2, F2, C3, C3, C3, C3, G2, G2, G2, G2],
      lead: [A4, E4, A4, C5, B4, G4, B4, D5, C5, G4, C5, E5, D5, B4, A4, B4],
      kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12],
    },
    // double-time intensity while boosting (faster snare)
    turbo: {
      bpm: 168, leadType: 'square', padVol: 0.04,
      bass: [A2, A2, C3, C3, F2, F2, A2, A2, G2, G2, B2, B2, E2, E2, G2, G2],
      lead: [A4, C5, E5, C5, A4, C5, E5, C5, G4, B4, D5, B4, G4, B4, D5, B4],
      kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [2, 6, 10, 14],
    },
    victory: {
      bpm: 132, leadType: 'square', padVol: 0.05,
      bass: [F2, F2, C3, C3, A2, A2, F2, F2, G2, G2, C3, C3, F2, F2, F2, F2],
      lead: [C5, F4, A4, C5, F5_(), C5, A4, C5, D5, A4, F4, A4, C5, A4, G4, F4],
      kick: [0, 4, 8, 12], snare: [4, 12],
    },
    defeat: {
      bpm: 78, leadType: 'triangle', soft: true, padVol: 0.07,
      bass: [A2, null, null, null, F2, null, null, null, E2, null, null, null, D2, null, null, null],
      lead: [A3, null, null, null, C4, null, B3, null, A3, null, null, null, E3, null, null, null],
      kick: [0],
    },
  }
  function F5_() { return 698.46 }
  function duck(on: boolean) { if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? 0.12 : 0.42, ctx.currentTime, 0.08) }
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
          mnote(cc, b, nextTime, stepDur * 1.1, 'sawtooth', tk.soft ? 0.09 : 0.14, mb)
          mnote(cc, b / 2, nextTime, stepDur * 1.1, 'sine', tk.soft ? 0.07 : 0.09, mb)
        }
        if (s % 4 === 0 && lastRoot && tk.padVol) {
          mnote(cc, lastRoot * 2, nextTime, stepDur * 4, 'triangle', tk.padVol, mb)
          mnote(cc, lastRoot * 3, nextTime, stepDur * 4, 'triangle', tk.padVol * 0.6, mb)
        }
        const l = tk.lead[s]; if (l) mnote(cc, l, nextTime, stepDur * 0.85, tk.leadType, tk.soft ? 0.045 : 0.055, lb)
        if (tk.kick.includes(s)) mkick(cc, nextTime, mb, tk.soft ? 0.16 : 0.3)
        if (tk.snare?.includes(s)) msnare(cc, nextTime, mb, 0.15)
        if (!tk.soft && s % 2 === 1) mhat(cc, nextTime, mb, 0.045)
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
    duck(false); startScheduler()
  }
  function setMusic(name: string) { if (curTrack !== name) playMusic(name) }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null } curTrack = '' }

  return {
    resume, setMuted, isMuted, setVolume, getVolume, playMusic, setMusic, stopMusic, duck,
    engineStart, engineSet, engineStop, screechSet, screechStop,
    nitro() { const c = ok('nitro', 80); if (!c) return; blip(c, 320, 0.45, 'sawtooth', 0.16, 760); noise(c, 0.5, 0.18, 'highpass', 3200, 1, 6000); blip(c, 90, 0.5, 'sine', 0.14, 50) },
    turboFlutter() { const c = ok('flut', 70); if (!c) return; noise(c, 0.14, 0.10, 'bandpass', 2400, 2.5, 1100) },
    backfire() { const c = ok('back', 90); if (!c) return; blip(c, 160, 0.10, 'square', 0.16, 70); noise(c, 0.12, 0.14, 'highpass', 2400, 1, 700) },
    gearShift() { const c = ok('gear', 60); if (!c) return; blip(c, 240, 0.06, 'sawtooth', 0.07, 150); noise(c, 0.05, 0.04, 'bandpass', 1600, 2) },
    bump() { const c = ok('bump', 50); if (!c) return; blip(c, 130, 0.12, 'sine', 0.18, 60); noise(c, 0.1, 0.1, 'lowpass', 700) },
    crash() { const c = ok('crash', 80); if (!c) return; noise(c, 0.3, 0.22, 'lowpass', 1200, 1, 200); blip(c, 110, 0.25, 'square', 0.16, 50); noise(c, 0.18, 0.12, 'highpass', 3000, 1, 900, 0.02) },
    land() { const c = ok('land', 60); if (!c) return; blip(c, 90, 0.2, 'sine', 0.2, 44); noise(c, 0.18, 0.16, 'lowpass', 800, 1, 200); noise(c, 0.25, 0.1, 'bandpass', 1800, 1.2, 700) },
    whoosh() { const c = ok('whoosh', 120); if (!c) return; noise(c, 0.35, 0.12, 'bandpass', 900, 1.5, 2600) },
    nearmiss() { const c = ok('near', 120); if (!c) return; noise(c, 0.28, 0.14, 'bandpass', 1400, 1.2, 3200); blip(c, 880, 0.12, 'triangle', 0.05, 1320) },
    beep() { const c = ok('beep', 30); if (!c) return; blip(c, 660, 0.14, 'square', 0.12, 660) },
    go() { const c = ok('go', 30); if (!c) return; blip(c, 990, 0.4, 'square', 0.16, 990); blip(c, 1320, 0.4, 'square', 0.1, 1320, 0.04) },
    cheer() { const c = ok('cheer', 200); if (!c) return; noise(c, 0.9, 0.16, 'bandpass', 1100, 0.7, 1400); noise(c, 0.7, 0.1, 'highpass', 2600, 1, 3400, 0.05) },
    coin() { const c = ok('coin', 40); if (!c) return; blip(c, 740, 0.08, 'square', 0.1, 1100); blip(c, 1100, 0.1, 'square', 0.08, 1480, 0.05) },
    unlock() { const c = ok('unlock', 60); if (!c) return;[523, 659, 784, 1047].forEach((f, i) => blip(c, f, 0.22, 'square', 0.1, undefined, i * 0.09)) },
    win() { const c = ok('win'); if (!c) return;[523, 659, 784, 1047, 1318].forEach((f, i) => blip(c, f, 0.3, 'square', 0.12, undefined, i * 0.12)) },
    lose() { const c = ok('lose'); if (!c) return;[392, 330, 262, 196].forEach((f, i) => blip(c, f, 0.42, 'sawtooth', 0.12, undefined, i * 0.17)) },
    ui() { const c = ok('ui', 30); if (!c) return; blip(c, 520, 0.05, 'square', 0.06, 720) },
  }
})()

/* ═══════════════════════════════════════════════════════════════════════
   CUSTOMIZATION DATA
   ═══════════════════════════════════════════════════════════════════════ */
const PAINTS = ['#e23b3b', '#f08a24', '#f4cf3a', '#3ec46d', '#2bb6d6', '#3a6cf0', '#8b5cf6', '#ec4899', '#f5f3ee', '#16181d', '#c89b3c', '#0a8f6e', '#9a1f2e', '#5b6470']
const FINISHES = ['Matte', 'Metallic', 'Pearl'] as const
const RIM_STYLES = ['5-Spoke', 'Mesh', 'Deep Dish'] as const
const RIM_COLORS = ['#cfcfcf', '#1a1a1a', '#c89b3c', '#d65b5b', '#2bb6d6', '#9a7bff']
const SPOILERS = ['None', 'Lip', 'GT Wing', 'Ducktail'] as const
const KITS = ['Stock', 'Street', 'Widebody'] as const
const HOODS = ['Stock', 'Scoop', 'Vented'] as const
const UNDERGLOWS = ['Off', '#ff3b6b', '#2bd6ff', '#9a5cff', '#39ff88', '#ffd23a', '#ff7a18'] as const
const VINYLS = ['None', 'Twin Stripe', 'Race Number', 'Flames'] as const
const TINTS = ['None', 'Light', 'Dark'] as const
const HEADLIGHTS = ['White', 'Amber', 'Ice Blue'] as const
const HL_COLORS: Record<string, string> = { White: '#fff6da', Amber: '#ffb74a', 'Ice Blue': '#bfe6ff' }

// performance parts: each level adds a stat bonus & costs coins
const PERF_COST = [0, 600, 1200, 2200]
interface Garage {
  car: number
  paint: number; finish: number; rim: number; rimColor: number
  spoiler: number; kit: number; hood: number; underglow: number
  vinyl: number; tint: number; headlight: number
  engine: number; tires: number; turbo: number; weight: number
}
function defaultGarage(): Garage {
  return { car: 0, paint: 0, finish: 1, rim: 0, rimColor: 0, spoiler: 0, kit: 0, hood: 0, underglow: 0, vinyl: 0, tint: 0, headlight: 0, engine: 0, tires: 0, turbo: 0, weight: 0 }
}

/* ═══ PLAYER CARS ═══ */
interface CarDef { name: string; blurb: string; accel: number; topSpeed: number; grip: number; driftEase: number; nitro: number; weight: number; baseColor: number }
const CARS: CarDef[] = [
  { name: 'Comet', blurb: 'Balanced all-rounder. Friendly to drive.', accel: 1.0, topSpeed: 1.0, grip: 1.0, driftEase: 1.0, nitro: 1.0, weight: 1.0, baseColor: 4 },
  { name: 'Sidewinder', blurb: 'Grippy coupe. Corners like itʼs on rails.', accel: 0.96, topSpeed: 0.98, grip: 1.18, driftEase: 0.86, nitro: 1.0, weight: 0.92, baseColor: 11 },
  { name: 'Brawler', blurb: 'Heavy muscle. Huge top end, loose tail.', accel: 1.08, topSpeed: 1.12, grip: 0.82, driftEase: 1.22, nitro: 1.1, weight: 1.3, baseColor: 12 },
]
const CAR_COST = [0, 9000, 14000]

/* ═══ RIVALS ═══ */
interface RivalDef { name: string; phrase: string; color: number; rim: number; spoiler: number; kit: number; underglow: number; style: 'drift' | 'blocker' | 'nitro' | 'tech'; skill: number; carBlurb: string }
const RIVALS: RivalDef[] = [
  { name: 'MIRAGE', phrase: 'Catch me in the corners.', color: 4, rim: 0, spoiler: 3, kit: 1, underglow: 2, style: 'drift', skill: 0.92, carBlurb: 'teal drift machine' },
  { name: 'BRUNO', phrase: 'Nobody passes.', color: 1, rim: 1, spoiler: 0, kit: 2, underglow: 6, style: 'blocker', skill: 0.95, carBlurb: 'rust-orange muscle' },
  { name: 'VOLT', phrase: 'Blink and youʼll miss me.', color: 6, rim: 5, spoiler: 2, kit: 1, underglow: 3, style: 'nitro', skill: 0.98, carBlurb: 'electric-purple rocket' },
  { name: 'APEX', phrase: 'Perfection has a price.', color: 10, rim: 2, spoiler: 2, kit: 2, underglow: 5, style: 'tech', skill: 1.04, carBlurb: 'golden track weapon' },
]

/* ═══════════════════════════════════════════════════════════════════════
   TRACKS
   ═══════════════════════════════════════════════════════════════════════ */
interface TrackTheme { skyTop: string; skyBot: string; ground: string; road: string; edge: string; sand: string; water?: string; accent: string }
interface TrackDef {
  name: string; laps: number; width: number; pts: V2[]
  jumps: number[]                          // segment indices that act as ramps
  shortcut?: { from: number; to: number; pts: V2[] }
  trafficCount: number
  obstacles?: { x: number; y: number; r: number }[]
  theme: TrackTheme
}
const COAST_THEME: TrackTheme = { skyTop: '#3a2350', skyBot: '#ff9e57', ground: '#2a6f4e', road: '#3b3a44', edge: '#e8e4d8', sand: '#e6c879', water: '#2f7fb0', accent: '#ffce6b' }
const DOCK_THEME: TrackTheme = { skyTop: '#241a3a', skyBot: '#e0633f', ground: '#48433a', road: '#34333c', edge: '#d9d3c2', sand: '#7a6f55', water: '#27506f', accent: '#ff8a3d' }

const TRACK_DEFS: TrackDef[] = [
  {
    name: 'Coast Loop', laps: 2, width: 150,
    pts: [
      { x: 600, y: 320 }, { x: 980, y: 300 }, { x: 1380, y: 360 }, { x: 1720, y: 560 },
      { x: 1840, y: 920 }, { x: 1660, y: 1240 }, { x: 1280, y: 1340 }, { x: 880, y: 1300 },
      { x: 560, y: 1140 }, { x: 360, y: 860 }, { x: 360, y: 560 },
    ],
    jumps: [3], // long sweep into a coastal gap jump
    shortcut: { from: 9, to: 0, pts: [{ x: 360, y: 860 }, { x: 300, y: 620 }, { x: 420, y: 400 }, { x: 600, y: 320 }] },
    trafficCount: 7,
    obstacles: [{ x: 1500, y: 1320, r: 26 }, { x: 760, y: 360, r: 24 }],
    theme: COAST_THEME,
  },
  {
    name: 'Pier Sprint', laps: 2, width: 132,
    pts: [
      { x: 500, y: 380 }, { x: 900, y: 320 }, { x: 1240, y: 420 }, { x: 1360, y: 720 },
      { x: 1560, y: 980 }, { x: 1420, y: 1240 }, { x: 1060, y: 1280 }, { x: 820, y: 1100 },
      { x: 940, y: 860 }, { x: 760, y: 660 }, { x: 440, y: 700 }, { x: 340, y: 520 },
    ],
    jumps: [4],
    shortcut: { from: 7, to: 10, pts: [{ x: 820, y: 1100 }, { x: 620, y: 980 }, { x: 480, y: 820 }, { x: 440, y: 700 }] },
    trafficCount: 9,
    obstacles: [{ x: 1300, y: 560, r: 24 }, { x: 980, y: 1180, r: 26 }, { x: 600, y: 760, r: 22 }],
    theme: DOCK_THEME,
  },
]

/* built (precomputed) track */
interface BuiltTrack {
  def: TrackDef; cum: number[]; total: number; nodeAlong: number[]
  sc?: { pts: V2[]; cum: number[]; total: number; alongFrom: number; alongTo: number }
}
function buildPath(pts: V2[], closed: boolean): { cum: number[]; total: number } {
  const cum: number[] = [0]
  let t = 0
  const n = pts.length
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n]
    cum.push(t)
    t += dist(a.x, a.y, b.x, b.y)
  }
  // cum currently has segs+1 entries with a leading 0 duplicate; rebuild cleanly
  const clean: number[] = []
  let acc = 0
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    clean.push(acc)
    const a = pts[i], b = pts[(i + 1) % n]
    acc += dist(a.x, a.y, b.x, b.y)
  }
  return { cum: clean, total: acc }
}
function buildTrack(def: TrackDef): BuiltTrack {
  const { cum, total } = buildPath(def.pts, true)
  // along-position of each node (== cum since cum[i] is distance to node i)
  const nodeAlong = cum.slice()
  nodeAlong.push(total)
  let sc: BuiltTrack['sc']
  if (def.shortcut) {
    const sp = buildPath(def.shortcut.pts, false)
    sc = { pts: def.shortcut.pts, cum: sp.cum, total: sp.total, alongFrom: nodeAlong[def.shortcut.from], alongTo: nodeAlong[def.shortcut.to] }
  }
  return { def, cum, total, nodeAlong, sc }
}
// nearest projection onto a polyline; returns perpendicular dist + along distance
function projPath(pts: V2[], cum: number[], closed: boolean, x: number, y: number) {
  let bd = Infinity, balong = 0, bseg = 0
  const n = pts.length
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    let t = ((x - a.x) * dx + (y - a.y) * dy) / len2
    t = clamp(t, 0, 1)
    const px = a.x + dx * t, py = a.y + dy * t
    const d = Math.hypot(x - px, y - py)
    if (d < bd) { bd = d; balong = cum[i] + Math.hypot(dx, dy) * t; bseg = i }
  }
  return { d: bd, along: balong, seg: bseg }
}
function pointAtAlong(bt: BuiltTrack, a: number): V2 {
  const total = bt.total
  const aa = ((a % total) + total) % total
  const pts = bt.def.pts, n = pts.length
  for (let i = 0; i < n; i++) {
    const segStart = bt.cum[i]
    const segEnd = i + 1 < n ? bt.cum[i + 1] : total
    if (aa >= segStart && aa <= segEnd) {
      const t = (aa - segStart) / (segEnd - segStart || 1)
      const A = pts[i], B = pts[(i + 1) % n]
      return { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) }
    }
  }
  return { ...pts[0] }
}
// progress + on-road, considering the optional shortcut
function progress(bt: BuiltTrack, x: number, y: number): { along: number; onRoad: boolean; d: number; onShortcut: boolean } {
  const m = projPath(bt.def.pts, bt.cum, true, x, y)
  let along = m.along, d = m.d, onShortcut = false
  if (bt.sc) {
    const s = projPath(bt.sc.pts, bt.sc.cum, false, x, y)
    if (s.d < d) {
      const f = bt.sc.total ? s.along / bt.sc.total : 0
      along = lerp(bt.sc.alongFrom, bt.sc.alongTo, f)
      d = s.d; onShortcut = true
    }
  }
  return { along, onRoad: d <= bt.def.width * 0.55, d, onShortcut }
}

/* ═══════════════════════════════════════════════════════════════════════
   GAME STATE
   ═══════════════════════════════════════════════════════════════════════ */
interface Racer {
  isPlayer: boolean
  name: string
  // visuals
  car: CarDef; garage: Garage; rivalColor?: number
  // physics
  x: number; y: number; heading: number; vx: number; vy: number
  z: number; vz: number                       // jump height
  spinT: number; spinDir: number              // crash spin
  drift: number                               // current slide amount 0..1
  nitro: number; nitroOn: boolean             // 0..100 meter
  // racing
  along: number; prevAlong: number; lap: number; raceDist: number
  place: number; finished: boolean; finishT: number
  offRoadT: number
  // ai
  ai?: { profile: RivalDef; biasT: number; bias: number; nitroT: number }
  skidTrail: { x: number; y: number; a: number }[]
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; col: string; kind: 'smoke' | 'spark' | 'dust' | 'confetti' | 'flame' }
interface Traffic { along: number; lane: number; speed: number; color: number; near: boolean; hit: boolean }
interface Popup { x: number; y: number; t: number; text: string; col: string }
interface GS {
  bt: BuiltTrack
  racers: Racer[]
  traffic: Traffic[]
  parts: Particle[]
  popups: Popup[]
  cam: { x: number; y: number; zoom: number }
  shake: number; flash: number; nitroFlash: number; hitStop: number
  phase: 'countdown' | 'racing' | 'finished'
  countdown: number; raceT: number
  finishOrder: Racer[]
  playerPlace: number
  time: number
  totalRacers: number
  finishLineT: number          // slow-mo timer at finish
}

function statFor(car: CarDef, g: Garage) {
  return {
    accel: car.accel * (1 + g.engine * 0.09),
    topSpeed: car.topSpeed * (1 + g.engine * 0.05 + g.turbo * 0.02),
    grip: car.grip * (1 + g.tires * 0.08),
    driftEase: car.driftEase,
    nitro: car.nitro * (1 + g.turbo * 0.14),
    weight: car.weight * (1 - g.weight * 0.06),
  }
}

function mkRacer(isPlayer: boolean, name: string, car: CarDef, garage: Garage, bt: BuiltTrack, gridSlot: number, rival?: RivalDef): Racer {
  // place on the grid just behind the start line, staggered + laned
  const startAlong = ((-30 - gridSlot * 26) % bt.total + bt.total) % bt.total
  const pos = pointAtAlong(bt, startAlong)
  const ahead = pointAtAlong(bt, startAlong + 24)
  const heading = angTo(pos.x, pos.y, ahead.x, ahead.y)
  const right = heading + Math.PI / 2
  const lane = (gridSlot % 2 === 0 ? -1 : 1) * bt.def.width * 0.2
  return {
    isPlayer, name, car, garage, rivalColor: rival?.color,
    x: pos.x + Math.cos(right) * lane, y: pos.y + Math.sin(right) * lane,
    heading, vx: 0, vy: 0, z: 0, vz: 0, spinT: 0, spinDir: 1,
    drift: 0, nitro: isPlayer ? 35 : 50, nitroOn: false,
    along: startAlong, prevAlong: startAlong, lap: -1, raceDist: -bt.total + startAlong,
    place: gridSlot + 1, finished: false, finishT: 0, offRoadT: 0,
    ai: rival ? { profile: rival, biasT: 0, bias: 0, nitroT: rnd(2, 6) } : undefined,
    skidTrail: [],
  }
}

function mkState(trackIdx: number, playerCar: CarDef, garage: Garage, rivalIdxs: number[]): GS {
  const bt = buildTrack(TRACK_DEFS[trackIdx])
  const racers: Racer[] = []
  racers.push(mkRacer(true, 'YOU', playerCar, garage, bt, 0))
  rivalIdxs.forEach((ri, i) => {
    const r = RIVALS[ri]
    const g = defaultGarage()
    g.paint = r.color; g.rim = r.rim; g.spoiler = r.spoiler; g.kit = r.kit; g.finish = 1
    g.underglow = r.underglow
    g.engine = 2; g.tires = 2; g.turbo = 2
    const car = CARS[r.style === 'blocker' ? 2 : r.style === 'tech' ? 1 : 0]
    racers.push(mkRacer(false, r.name, car, g, bt, i + 1, r))
  })
  const traffic: Traffic[] = []
  for (let i = 0; i < bt.def.trafficCount; i++) {
    traffic.push({ along: (i / bt.def.trafficCount) * bt.total + rnd(-40, 40), lane: (Math.random() < 0.5 ? -1 : 1) * rnd(0.18, 0.34), speed: rnd(70, 120), color: Math.floor(rnd(0, PAINTS.length)), near: false, hit: false })
  }
  return {
    bt, racers, traffic, parts: [], popups: [],
    cam: { x: racers[0].x, y: racers[0].y, zoom: 1 },
    shake: 0, flash: 0, nitroFlash: 0, hitStop: 0,
    phase: 'countdown', countdown: 3.99, raceT: 0,
    finishOrder: [], playerPlace: 0, time: 0, totalRacers: racers.length, finishLineT: 0,
  }
}

/* ── physics tuning ── */
const BASE_TOP = 560          // px/s
const BASE_ACCEL = 560
const BASE_TURN = 2.7
const NITRO_BOOST = 1.42

function spawnParts(g: GS, x: number, y: number, kind: Particle['kind'], n: number, col: string, spd = 60) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU)
    g.parts.push({ x, y, vx: Math.cos(a) * rnd(10, spd), vy: Math.sin(a) * rnd(10, spd), life: 0, max: rnd(0.4, 1.0), r: rnd(2, 6), col, kind })
  }
  if (g.parts.length > 420) g.parts.splice(0, g.parts.length - 420)
}

function tickRacer(g: GS, r: Racer, dt: number, input: { gas: boolean; brake: boolean; steer: number; hand: boolean; nitro: boolean }) {
  const st = statFor(r.car, r.garage)
  const speed = Math.hypot(r.vx, r.vy)
  const fwd = { x: Math.cos(r.heading), y: Math.sin(r.heading) }
  const fdotV = r.vx * fwd.x + r.vy * fwd.y
  const goingFwd = fdotV >= -10

  // ── spin (after a crash): lose control briefly ──
  if (r.spinT > 0) {
    r.spinT -= dt
    r.heading += r.spinDir * 7 * dt
    r.vx *= Math.pow(0.2, dt); r.vy *= Math.pow(0.2, dt)
  } else if (r.z <= 0) {
    // ── steering (turn rate scales down at very high speed) ──
    const spd01 = clamp(speed / BASE_TOP, 0, 1.4)
    const turn = BASE_TURN * (0.5 + 0.7 * Math.min(1, speed / 160)) * (1 - spd01 * 0.18)
    const driftSteer = input.hand ? 1.5 : 1
    r.heading += input.steer * turn * driftSteer * dt * (goingFwd ? 1 : -1)

    // ── engine / brake ──
    const topSpeed = BASE_TOP * st.topSpeed * (r.nitroOn ? NITRO_BOOST : 1)
    if (input.gas && speed < topSpeed) {
      const acc = BASE_ACCEL * st.accel * (r.nitroOn ? 1.7 : 1)
      r.vx += fwd.x * acc * dt; r.vy += fwd.y * acc * dt
    }
    if (input.brake) {
      if (fdotV > 20) { r.vx -= r.vx * 2.2 * dt; r.vy -= r.vy * 2.2 * dt }
      else { r.vx -= fwd.x * BASE_ACCEL * 0.5 * dt; r.vy -= fwd.y * BASE_ACCEL * 0.5 * dt }
    }
  }

  // ── grip: damp lateral velocity (less when drifting) ──
  const rx = -fwd.y, ry = fwd.x
  let fd = r.vx * fwd.x + r.vy * fwd.y
  let sd = r.vx * rx + r.vy * ry
  const baseGrip = 7.5 * st.grip
  const latDamp = (input.hand ? 1.6 : baseGrip) / (r.car.driftEase)
  sd *= Math.pow(Math.max(0.001, 1 - latDamp * dt), 1)
  // recombine
  r.vx = fwd.x * fd + rx * sd
  r.vy = fwd.y * fd + ry * sd
  r.drift = clamp(Math.abs(sd) / 220, 0, 1)

  // rolling drag
  const drag = r.z > 0 ? 0.06 : 0.5
  r.vx *= Math.pow(Math.max(0.001, 1 - drag * dt), 1)
  r.vy *= Math.pow(Math.max(0.001, 1 - drag * dt), 1)
  fd = r.vx * fwd.x + r.vy * fwd.y; sd = r.vx * rx + r.vy * ry

  // ── nitrous ──
  if (input.nitro && r.nitro > 1 && !r.nitroOn) { r.nitroOn = true; if (r.isPlayer) { Sfx.nitro(); g.nitroFlash = 0.5; g.shake = Math.min(20, g.shake + 10) } }
  if (r.nitroOn) {
    r.nitro -= 34 * dt
    if (r.isPlayer && Math.random() < 0.4) Sfx.turboFlutter()
    if (r.nitro <= 0) { r.nitro = 0; r.nitroOn = false; if (r.isPlayer) Sfx.backfire() }
  } else if (!input.nitro) {
    // refill from clean drifting + just driving fast
    r.nitro = clamp(r.nitro + (r.drift * 22 + (speed > 300 ? 4 : 0)) * dt, 0, 100)
  }
  // drifting also tops up a little even mid-nitro
  if (r.drift > 0.3 && !r.nitroOn) r.nitro = clamp(r.nitro + r.drift * 6 * dt, 0, 100)

  // ── jump / gravity ──
  if (r.z > 0 || r.vz > 0) {
    r.z += r.vz * dt
    r.vz -= 1500 * dt
    if (r.z <= 0) {
      r.z = 0; r.vz = 0
      if (r.isPlayer) { Sfx.land(); g.shake = Math.min(22, g.shake + 12); spawnParts(g, r.x, r.y, 'dust', 14, '#d8c89a', 90) }
    }
  }

  // ── integrate position ──
  r.x += r.vx * dt; r.y += r.vy * dt

  // ── track progress + off-road penalty ──
  const pr = progress(g.bt, r.x, r.y)
  if (!pr.onRoad && r.z <= 0) {
    r.offRoadT += dt
    // sand/grass: scrub speed
    r.vx *= Math.pow(0.55, dt); r.vy *= Math.pow(0.55, dt)
    if (r.isPlayer && Math.random() < 0.5) spawnParts(g, r.x, r.y, 'dust', 1, g.bt.def.theme.sand, 50)
  } else r.offRoadT = 0

  // lap / race distance with wrap handling
  const total = g.bt.total
  const delta = pr.along - r.prevAlong
  if (delta < -total * 0.5) r.lap++
  else if (delta > total * 0.5) r.lap--
  r.prevAlong = pr.along; r.along = pr.along
  r.raceDist = r.lap * total + pr.along

  // ── ramp launch ──
  if (r.z <= 0 && speed > 240) {
    const seg = projPath(g.bt.def.pts, g.bt.cum, true, r.x, r.y).seg
    if (g.bt.def.jumps.includes(seg) && pr.onRoad) {
      r.vz = 360 + Math.min(260, speed * 0.5)
      r.z = 1
      if (r.isPlayer) { Sfx.whoosh(); g.popups.push({ x: r.x, y: r.y - 30, t: 0, text: 'AIRBORNE!', col: '#ffe08a' }); r.nitro = clamp(r.nitro + 18, 0, 100) }
    }
  }

  // skid trail (while drifting on ground)
  if (r.drift > 0.34 && r.z <= 0 && speed > 120) {
    r.skidTrail.push({ x: r.x, y: r.y, a: r.heading })
    if (r.skidTrail.length > 60) r.skidTrail.shift()
    if (r.isPlayer && Math.random() < 0.6) spawnParts(g, r.x - fwd.x * 14, r.y - fwd.y * 14, 'smoke', 1, 'rgba(220,220,220,0.5)', 30)
  }

  // exhaust flames during nitro
  if (r.nitroOn && Math.random() < 0.7) {
    const ex = UNDERGLOWS[r.garage.underglow]
    const fl = r.garage.underglow > 0 ? ex : '#ff8a2a'
    spawnParts(g, r.x - fwd.x * 18, r.y - fwd.y * 18, 'flame', 1, fl, 120)
  }
}

function aiInput(g: GS, r: Racer): { gas: boolean; brake: boolean; steer: number; hand: boolean; nitro: boolean } {
  const ai = r.ai!; const bt = g.bt
  // look ahead along the racing line; technical/drift cut closer to apex
  const speed = Math.hypot(r.vx, r.vy)
  const look = 70 + speed * 0.28
  const target = pointAtAlong(bt, r.along + look)
  // apex bias wobble for personality
  ai.biasT -= 1 / 60
  if (ai.biasT <= 0) { ai.biasT = rnd(0.6, 1.4); ai.bias = rnd(-1, 1) * (ai.profile.style === 'tech' ? 8 : 22) }
  const desired = angTo(r.x, r.y, target.x, target.y)
  let steer = clamp(normAng(desired - r.heading) * 2.4, -1, 1)

  // measure upcoming curvature to decide braking / drifting
  const t1 = pointAtAlong(bt, r.along + 60), t2 = pointAtAlong(bt, r.along + 160)
  const a1 = angTo(r.x, r.y, t1.x, t1.y), a2 = angTo(t1.x, t1.y, t2.x, t2.y)
  const curve = Math.abs(normAng(a2 - a1))

  // rubber-band: chase the leader, ease off if way ahead
  const player = g.racers[0]
  const gap = player.raceDist - r.raceDist
  const band = clamp(1 + gap * 0.00018, 0.86, 1.14) * ai.profile.skill

  const targetSpeed = BASE_TOP * statFor(r.car, r.garage).topSpeed * band * (1 - clamp(curve * 1.5, 0, 0.5))
  const gas = speed < targetSpeed
  const brake = speed > targetSpeed * 1.18 && curve > 0.25
  const hand = (ai.profile.style === 'drift' && curve > 0.18) || curve > 0.42

  // nitro usage by personality
  ai.nitroT -= 1 / 60
  let nitro = false
  if (ai.nitroT <= 0 && r.nitro > 30 && curve < 0.2) {
    nitro = true
    ai.nitroT = ai.profile.style === 'nitro' ? rnd(2.5, 4) : rnd(5, 9)
  }
  if (!nitro && !r.nitroOn) r.nitro = clamp(r.nitro + 16 / 60, 0, 100)

  // blocker swerves toward the player when close & behind-ish
  if (ai.profile.style === 'blocker' && Math.abs(gap) < 60) {
    const toP = angTo(r.x, r.y, player.x, player.y)
    steer = clamp(steer + normAng(toP - r.heading) * 0.5, -1, 1)
  }
  steer = clamp(steer + ai.bias * 0.01, -1, 1)
  return { gas, brake, steer, hand, nitro }
}

function tick(g: GS, dt: number, keys: Set<string>, edges: { nitro: boolean }) {
  if (g.hitStop > 0) { g.hitStop -= dt; dt *= 0.2 }
  g.time += dt

  if (g.phase === 'countdown') {
    const prev = Math.ceil(g.countdown)
    g.countdown -= dt
    const now = Math.ceil(g.countdown)
    if (now !== prev && now >= 1 && now <= 3) Sfx.beep()
    if (g.countdown <= 0) { g.phase = 'racing'; Sfx.go() }
  }

  const player = g.racers[0]
  for (const r of g.racers) {
    if (r.finished) {
      // coast to a stop after finishing
      tickRacer(g, r, dt, { gas: false, brake: true, steer: 0, hand: false, nitro: false })
      continue
    }
    if (g.phase === 'countdown') {
      // engines revving, no movement
      r.vx *= Math.pow(0.1, dt); r.vy *= Math.pow(0.1, dt)
      continue
    }
    let inp
    if (r.isPlayer) {
      const gas = keys.has('arrowup') || keys.has('w')
      const brake = keys.has('arrowdown') || keys.has('s')
      const steer = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
      const hand = keys.has(' ')
      inp = { gas, brake, steer, hand, nitro: keys.has('shift') || edges.nitro }
    } else inp = aiInput(g, r)
    tickRacer(g, r, dt, inp)
  }

  // ── traffic ──
  if (g.phase === 'racing') {
    for (const tf of g.traffic) {
      tf.along = (tf.along + tf.speed * dt) % g.bt.total
      const base = pointAtAlong(g.bt, tf.along)
      const ahead = pointAtAlong(g.bt, tf.along + 14)
      const h = angTo(base.x, base.y, ahead.x, ahead.y)
      const right = h + Math.PI / 2
      const tx = base.x + Math.cos(right) * tf.lane * g.bt.def.width * 0.5
      const ty = base.y + Math.sin(right) * tf.lane * g.bt.def.width * 0.5
      // collision vs every racer
      for (const r of g.racers) {
        if (r.z > 0.5) continue
        const d = dist(r.x, r.y, tx, ty)
        if (d < 30) {
          if (!tf.hit || r.isPlayer) {
            r.spinT = Math.max(r.spinT, 0.5); r.spinDir = Math.sign(normAng(angTo(r.x, r.y, tx, ty) - r.heading)) || 1
            r.vx *= 0.35; r.vy *= 0.35
            tf.hit = true
            if (r.isPlayer) { Sfx.crash(); g.shake = Math.min(26, g.shake + 16); g.flash = 0.3; g.hitStop = 0.08; spawnParts(g, r.x, r.y, 'spark', 12, '#ffd27a', 140); g.popups.push({ x: r.x, y: r.y - 26, t: 0, text: 'CRASH!', col: '#ff7a6b' }) }
          }
        } else if (d < 76 && r.isPlayer && Math.hypot(r.vx, r.vy) > 280 && !tf.near) {
          tf.near = true
          r.nitro = clamp(r.nitro + 10, 0, 100)
          Sfx.nearmiss()
          g.popups.push({ x: r.x, y: r.y - 26, t: 0, text: 'NEAR MISS! +N₂O', col: '#8af0ff' })
        }
        if (d > 120) { tf.hit = false; tf.near = false }
      }
    }
    // static obstacles
    if (g.bt.def.obstacles) {
      for (const o of g.bt.def.obstacles) {
        for (const r of g.racers) {
          if (r.z > 0.5) continue
          if (dist(r.x, r.y, o.x, o.y) < o.r + 14) {
            r.spinT = Math.max(r.spinT, 0.4); r.vx *= 0.4; r.vy *= 0.4
            if (r.isPlayer) { Sfx.bump(); g.shake = Math.min(20, g.shake + 10); spawnParts(g, r.x, r.y, 'spark', 8, '#ffb86b', 110) }
          }
        }
      }
    }
  }

  // ── racer-vs-racer light contact ──
  for (let i = 0; i < g.racers.length; i++) for (let j = i + 1; j < g.racers.length; j++) {
    const a = g.racers[i], b = g.racers[j]
    if (a.z > 0.5 || b.z > 0.5) continue
    const d = dist(a.x, a.y, b.x, b.y)
    if (d < 34 && d > 0.1) {
      const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d
      const push = (34 - d) * 0.5
      a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push
      a.vx += nx * 40; a.vy += ny * 40; b.vx -= nx * 40; b.vy -= ny * 40
      if ((a.isPlayer || b.isPlayer)) { Sfx.bump(); g.shake = Math.min(14, g.shake + 5) }
    }
  }

  // ── standings + finish ──
  const order = [...g.racers].sort((p, q) => q.raceDist - p.raceDist)
  order.forEach((r, i) => { r.place = i + 1 })
  const need = g.bt.def.laps * g.bt.total
  for (const r of g.racers) {
    if (!r.finished && r.raceDist >= need && g.phase === 'racing') {
      r.finished = true; r.finishT = g.time
      g.finishOrder.push(r)
      if (r.isPlayer) {
        g.playerPlace = g.finishOrder.length
        g.phase = 'finished'; g.finishLineT = 2.2
        if (g.playerPlace === 1) { Sfx.win(); Sfx.cheer() } else Sfx.lose()
        // confetti
        for (let k = 0; k < 60; k++) g.parts.push({ x: r.x + rnd(-60, 60), y: r.y + rnd(-60, 60), vx: rnd(-60, 60), vy: rnd(-140, -40), life: 0, max: rnd(1, 2), r: rnd(3, 6), col: PAINTS[Math.floor(rnd(0, PAINTS.length))], kind: 'confetti' })
      }
    }
  }

  // ── camera (rotating cam handled in render; here just track player pos & zoom) ──
  const speed = Math.hypot(player.vx, player.vy)
  g.cam.x = player.x; g.cam.y = player.y
  const targetZoom = 1 - clamp(speed / BASE_TOP, 0, 1) * 0.12 - (player.nitroOn ? 0.06 : 0)
  g.cam.zoom = lerp(g.cam.zoom, g.finishLineT > 0 ? 1.25 : targetZoom, dt * 4)

  // engine + screech audio follow the player
  Sfx.engineSet(clamp(speed / (BASE_TOP * 1.1), 0.05, 1) * (player.nitroOn ? 1.15 : 1))
  Sfx.screechSet(player.drift > 0.35 && player.z <= 0 ? player.drift : 0)

  // ── fx decay ──
  g.shake *= Math.pow(0.0025, dt); if (g.shake < 0.2) g.shake = 0
  g.flash = Math.max(0, g.flash - dt * 2.2)
  g.nitroFlash = Math.max(0, g.nitroFlash - dt * 1.8)
  if (g.finishLineT > 0) g.finishLineT -= dt
  for (const p of g.parts) {
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt
    if (p.kind === 'flame') { p.vy -= 30 * dt }
    if (p.kind === 'confetti') { p.vy += 120 * dt; p.vx *= Math.pow(0.4, dt) }
    else { p.vx *= Math.pow(0.2, dt); p.vy *= Math.pow(0.2, dt) }
  }
  g.parts = g.parts.filter(p => p.life < p.max)
  for (const p of g.popups) p.t += dt
  g.popups = g.popups.filter(p => p.t < 1.4)
}

/* ═══════════════════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════════════════ */
function shadeHex(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex
  const n = parseInt(m[1], 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255
  const f = amt < 0 ? 1 + amt : 1, add = amt > 0 ? amt * 255 : 0
  r = Math.max(0, Math.min(255, Math.round(r * f + add)))
  gg = Math.max(0, Math.min(255, Math.round(gg * f + add)))
  b = Math.max(0, Math.min(255, Math.round(b * f + add)))
  return `rgb(${r},${gg},${b})`
}

// draw a top-down customizable car at (0,0) facing +x (caller handles transform)
function drawCar(ctx: CanvasRenderingContext2D, gcfg: Garage, size: number, dyn: { drift: number; nitroOn: boolean; brake: boolean; steer: number; headlights: boolean; rivalColor?: number }) {
  const paint = PAINTS[dyn.rivalColor ?? gcfg.paint]
  const kitW = KITS[gcfg.kit] === 'Widebody' ? 1.18 : KITS[gcfg.kit] === 'Street' ? 1.07 : 1
  const len = 26 * size, w = 11 * size * kitW

  // underglow
  if (gcfg.underglow > 0) {
    const ug = UNDERGLOWS[gcfg.underglow]
    ctx.save(); ctx.globalAlpha = dyn.nitroOn ? 0.85 : 0.6
    ctx.shadowColor = ug; ctx.shadowBlur = 18
    ctx.fillStyle = ug
    ctx.beginPath(); ctx.ellipse(0, 0, len * 0.95, w * 1.05, 0, 0, TAU); ctx.fill()
    ctx.restore()
  }

  // headlight beams (forward)
  if (dyn.headlights) {
    const hc = HL_COLORS[HEADLIGHTS[gcfg.headlight]]
    ctx.fillStyle = `${hc}40`
    for (const dir of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(len * 0.45, dir * w * 0.5)
      ctx.lineTo(len * 2.4, dir * w * 1.6); ctx.lineTo(len * 2.4, dir * w * 0.1); ctx.closePath(); ctx.fill()
    }
  }

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(0, 0, len * 1.02, w * 1.08, 0, 0, TAU); ctx.fill()

  // exhaust flames (nitro)
  if (dyn.nitroOn) {
    const fc = gcfg.underglow > 0 ? UNDERGLOWS[gcfg.underglow] : '#ff8a2a'
    ctx.save(); ctx.globalAlpha = 0.85
    for (const dir of [-1, 1]) {
      ctx.fillStyle = fc
      ctx.beginPath(); ctx.moveTo(-len * 0.9, dir * w * 0.4)
      ctx.lineTo(-len * (1.2 + Math.random() * 0.4), dir * w * 0.25)
      ctx.lineTo(-len * 0.9, dir * w * 0.1); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }

  // body
  const grad = ctx.createLinearGradient(0, -w, 0, w)
  const sheen = FINISHES[gcfg.finish] === 'Pearl' ? 0.5 : FINISHES[gcfg.finish] === 'Metallic' ? 0.3 : 0.12
  grad.addColorStop(0, shadeHex(paint, sheen)); grad.addColorStop(0.5, paint); grad.addColorStop(1, shadeHex(paint, -0.34))
  ctx.fillStyle = grad
  rr(ctx, -len * 0.92, -w, len * 1.84, w * 2, w * 0.7); ctx.fill()
  // hood/nose taper highlight
  ctx.fillStyle = shadeHex(paint, sheen * 0.6)
  ctx.beginPath(); ctx.moveTo(len * 0.9, 0); ctx.lineTo(len * 0.5, -w * 0.86); ctx.lineTo(len * 0.5, w * 0.86); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = shadeHex(paint, -0.5); ctx.lineWidth = 1.1 * size
  rr(ctx, -len * 0.92, -w, len * 1.84, w * 2, w * 0.7); ctx.stroke()

  // hood detail
  if (HOODS[gcfg.hood] === 'Scoop') { ctx.fillStyle = shadeHex(paint, -0.5); rr(ctx, len * 0.18, -w * 0.28, len * 0.3, w * 0.56, 3); ctx.fill() }
  else if (HOODS[gcfg.hood] === 'Vented') {
    ctx.fillStyle = shadeHex(paint, -0.55)
    for (let i = 0; i < 3; i++) { rr(ctx, len * 0.12 + i * 7 * size, -w * 0.3, 3 * size, w * 0.6, 1.5); ctx.fill() }
  }

  // wheels
  const steerA = dyn.steer * 0.4
  const drawWheel = (wx: number, wy: number, turn: boolean) => {
    ctx.save(); ctx.translate(wx, wy); if (turn) ctx.rotate(steerA)
    ctx.fillStyle = '#15151a'; rr(ctx, -4.4 * size, -2.6 * size, 8.8 * size, 5.2 * size, 1.6); ctx.fill()
    ctx.fillStyle = RIM_COLORS[gcfg.rimColor]
    ctx.beginPath(); ctx.arc(0, 0, 2.4 * size, 0, TAU); ctx.fill()
    ctx.strokeStyle = shadeHex(RIM_COLORS[gcfg.rimColor], -0.4); ctx.lineWidth = 0.7 * size
    const sp = RIM_STYLES[gcfg.rim] === 'Mesh' ? 6 : RIM_STYLES[gcfg.rim] === 'Deep Dish' ? 4 : 5
    for (let i = 0; i < sp; i++) { const a = (i / sp) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 2.2 * size, Math.sin(a) * 2.2 * size); ctx.stroke() }
    ctx.restore()
  }
  drawWheel(len * 0.5, -w * 0.92, true); drawWheel(len * 0.5, w * 0.92, true)
  drawWheel(-len * 0.52, -w * 0.92, false); drawWheel(-len * 0.52, w * 0.92, false)

  // cabin / windshield with tint
  const tintA = TINTS[gcfg.tint] === 'Dark' ? 0.82 : TINTS[gcfg.tint] === 'Light' ? 0.55 : 0.38
  ctx.fillStyle = `rgba(20,28,40,${tintA})`
  rr(ctx, -len * 0.4, -w * 0.72, len * 0.78, w * 1.44, w * 0.4); ctx.fill()
  // windshield glints
  ctx.fillStyle = `rgba(150,200,255,${0.5 - tintA * 0.3})`
  ctx.beginPath(); ctx.moveTo(len * 0.3, -w * 0.5); ctx.lineTo(len * 0.12, -w * 0.6); ctx.lineTo(len * 0.12, w * 0.6); ctx.lineTo(len * 0.3, w * 0.5); ctx.closePath(); ctx.fill()

  // vinyl on roof
  if (VINYLS[gcfg.vinyl] === 'Twin Stripe') {
    ctx.fillStyle = shadeHex(paint, 0.6)
    rr(ctx, -len * 0.9, -w * 0.28, len * 1.8, w * 0.16, 1); ctx.fill()
    rr(ctx, -len * 0.9, w * 0.12, len * 1.8, w * 0.16, 1); ctx.fill()
  } else if (VINYLS[gcfg.vinyl] === 'Race Number') {
    ctx.fillStyle = '#f5f3ee'; ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, TAU); ctx.fill()
    ctx.fillStyle = '#16181d'; ctx.font = `bold ${Math.round(w * 0.8)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillText('7', 0, 0); ctx.restore()
  } else if (VINYLS[gcfg.vinyl] === 'Flames') {
    ctx.fillStyle = '#ff7a18'
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(len * 0.4, i * w * 0.5); ctx.quadraticCurveTo(0, i * w * 0.7, -len * 0.5, i * w * 0.3); ctx.quadraticCurveTo(-len * 0.1, i * w * 0.2, len * 0.4, i * w * 0.5); ctx.fill() }
  }

  // spoiler
  if (SPOILERS[gcfg.spoiler] !== 'None') {
    ctx.fillStyle = shadeHex(paint, -0.2)
    if (SPOILERS[gcfg.spoiler] === 'GT Wing') {
      rr(ctx, -len * 1.0, -w * 1.05, len * 0.16, w * 2.1, 2); ctx.fill()
      ctx.fillStyle = '#15151a'; rr(ctx, -len * 0.86, -w * 0.7, 3 * size, w * 0.4, 1); ctx.fill(); rr(ctx, -len * 0.86, w * 0.3, 3 * size, w * 0.4, 1); ctx.fill()
    } else if (SPOILERS[gcfg.spoiler] === 'Ducktail') {
      ctx.beginPath(); ctx.moveTo(-len * 0.86, -w * 0.9); ctx.lineTo(-len * 1.0, -w * 0.7); ctx.lineTo(-len * 1.0, w * 0.7); ctx.lineTo(-len * 0.86, w * 0.9); ctx.closePath(); ctx.fill()
    } else { rr(ctx, -len * 0.94, -w * 0.9, len * 0.08, w * 1.8, 1); ctx.fill() }
  }

  // taillights
  ctx.fillStyle = dyn.brake ? '#ff2a2a' : '#b81e1e'
  ctx.save(); if (dyn.brake) { ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 10 }
  rr(ctx, -len * 0.92, -w * 0.78, 3 * size, w * 0.4, 1); ctx.fill()
  rr(ctx, -len * 0.92, w * 0.38, 3 * size, w * 0.4, 1); ctx.fill()
  ctx.restore()
  // headlight lamps
  ctx.fillStyle = HL_COLORS[HEADLIGHTS[gcfg.headlight]]
  rr(ctx, len * 0.82, -w * 0.72, 3 * size, w * 0.34, 1); ctx.fill()
  rr(ctx, len * 0.82, w * 0.38, 3 * size, w * 0.34, 1); ctx.fill()
}
// rounded-rect path helper
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function render(ctx: CanvasRenderingContext2D, g: GS) {
  const p = g.racers[0]
  const th = g.bt.def.theme

  // sky gradient backdrop (screen-space)
  const sky = ctx.createLinearGradient(0, 0, 0, VH)
  sky.addColorStop(0, th.skyTop); sky.addColorStop(0.55, shadeHex(th.skyBot, 0.1)); sky.addColorStop(1, th.skyBot)
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH)
  // sun glow
  const sun = ctx.createRadialGradient(VW / 2, VH * 0.34, 10, VW / 2, VH * 0.34, 260)
  sun.addColorStop(0, 'rgba(255,240,200,0.55)'); sun.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = sun; ctx.fillRect(0, 0, VW, VH)

  // ── world transform (rotating cam: player points up) ──
  ctx.save()
  const sh = g.shake
  const shx = sh ? rnd(-sh, sh) : 0, shy = sh ? rnd(-sh, sh) : 0
  ctx.translate(VW / 2 + shx, VH * 0.62 + shy)
  ctx.scale(g.cam.zoom, g.cam.zoom)
  const rot = -Math.PI / 2 - p.heading
  ctx.rotate(rot)
  ctx.translate(-g.cam.x, -g.cam.y)

  // ground
  ctx.fillStyle = th.ground
  ctx.fillRect(g.cam.x - 1600, g.cam.y - 1400, 3200, 2800)

  drawRoad(ctx, g)

  // obstacles
  if (g.bt.def.obstacles) {
    for (const o of g.bt.def.obstacles) {
      ctx.fillStyle = '#d6452f'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill()
      ctx.fillStyle = '#f0f0e6'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.6, 0, TAU); ctx.fill()
      ctx.fillStyle = '#d6452f'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.32, 0, TAU); ctx.fill()
    }
  }

  // skid trails
  ctx.strokeStyle = 'rgba(20,18,22,0.34)'; ctx.lineWidth = 5
  for (const r of g.racers) {
    if (r.skidTrail.length < 2) continue
    ctx.beginPath()
    for (let i = 0; i < r.skidTrail.length; i++) { const s = r.skidTrail[i]; if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y) }
    ctx.stroke()
  }

  // particles (under cars)
  for (const pt of g.parts) {
    if (pt.kind === 'confetti') continue
    const a = 1 - pt.life / pt.max
    ctx.globalAlpha = pt.kind === 'flame' ? a * 0.9 : a * 0.7
    ctx.fillStyle = pt.col
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (pt.kind === 'smoke' ? (1 + (1 - a)) : 1), 0, TAU); ctx.fill()
  }
  ctx.globalAlpha = 1

  // traffic cars
  for (const tf of g.traffic) {
    const base = pointAtAlong(g.bt, tf.along)
    const ahead = pointAtAlong(g.bt, tf.along + 14)
    const h = angTo(base.x, base.y, ahead.x, ahead.y)
    const right = h + Math.PI / 2
    const tx = base.x + Math.cos(right) * tf.lane * g.bt.def.width * 0.5
    const ty = base.y + Math.sin(right) * tf.lane * g.bt.def.width * 0.5
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(h)
    const cg = defaultGarage(); cg.paint = tf.color; cg.finish = 1
    drawCar(ctx, cg, 0.92, { drift: 0, nitroOn: false, brake: false, steer: 0, headlights: false })
    ctx.restore()
  }

  // racers (rivals then player on top), with jump scaling
  const drawList = [...g.racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0))
  for (const r of drawList) {
    const jumpScale = 1 + r.z / 600
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.heading + r.drift * 0.18 * Math.sign(r.vx * -Math.sin(r.heading) + r.vy * Math.cos(r.heading)))
    ctx.scale(jumpScale, jumpScale)
    drawCar(ctx, r.garage, 1.05, {
      drift: r.drift, nitroOn: r.nitroOn, brake: false, steer: 0,
      headlights: true, rivalColor: r.rivalColor,
    })
    ctx.restore()
    // place tag above rivals
    if (!r.isPlayer) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(-rot)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, -26, -52, 52, 16, 4); ctx.fill()
      ctx.fillStyle = PAINTS[r.rivalColor ?? 0]; ctx.font = 'bold 9px "Press Start 2P",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(r.name, 0, -44)
      ctx.restore()
    }
  }

  // confetti (above)
  for (const pt of g.parts) {
    if (pt.kind !== 'confetti') continue
    const a = 1 - pt.life / pt.max
    ctx.globalAlpha = a
    ctx.fillStyle = pt.col
    ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.life * 8); ctx.fillRect(-pt.r / 2, -pt.r / 2, pt.r, pt.r * 0.6); ctx.restore()
  }
  ctx.globalAlpha = 1

  ctx.restore() // end world transform

  // ── screen-space FX ──
  // speed blur (radial streaks at edges)
  const speed = Math.hypot(p.vx, p.vy)
  const sb = clamp(speed / BASE_TOP, 0, 1.3) * (p.nitroOn ? 1.3 : 1)
  if (sb > 0.35) {
    ctx.save(); ctx.globalAlpha = (sb - 0.35) * 0.5
    const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VW * 0.25, VW / 2, VH * 0.55, VW * 0.62)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, p.nitroOn ? 'rgba(120,180,255,0.5)' : 'rgba(0,0,0,0.5)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH); ctx.restore()
  }
  if (g.nitroFlash > 0) { ctx.fillStyle = `rgba(150,200,255,${g.nitroFlash * 0.3})`; ctx.fillRect(0, 0, VW, VH) }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,120,80,${g.flash * 0.5})`; ctx.fillRect(0, 0, VW, VH) }

  // floating world popups (NEAR MISS!, AIRBORNE!, CRASH!)
  drawWorldPopups(ctx, g, rot)

  renderHUD(ctx, g)
  renderMinimap(ctx, g)

  if (g.phase === 'countdown') renderCountdown(ctx, g)
}

function drawRoad(ctx: CanvasRenderingContext2D, g: GS) {
  const th = g.bt.def.theme
  const pts = g.bt.def.pts
  const W = g.bt.def.width
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  // road base
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath() }
  ctx.strokeStyle = th.edge; ctx.lineWidth = W + 14; path(); ctx.stroke()
  ctx.strokeStyle = th.road; ctx.lineWidth = W; path(); ctx.stroke()
  // centre dashes
  ctx.strokeStyle = 'rgba(245,225,150,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([26, 26]); path(); ctx.stroke(); ctx.setLineDash([])
  // shortcut
  if (g.bt.sc) {
    const sp = g.bt.sc.pts
    const spath = () => { ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i].x, sp[i].y) }
    ctx.strokeStyle = shadeHex(th.sand, -0.1); ctx.lineWidth = W * 0.62 + 10; spath(); ctx.stroke()
    ctx.strokeStyle = th.sand; ctx.lineWidth = W * 0.62; spath(); ctx.stroke()
    // SHORTCUT marker
    const mid = sp[Math.floor(sp.length / 2)]
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.save(); ctx.translate(mid.x, mid.y)
    ctx.fillStyle = th.accent; ctx.font = 'bold 16px "Press Start 2P",monospace'; ctx.textAlign = 'center'
    ctx.fillText('▲', 0, 0); ctx.restore()
  }
  // start/finish line (at node 0)
  const a = pts[0], b = pts[1]
  const h = angTo(a.x, a.y, b.x, b.y); const perp = h + Math.PI / 2
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(perp)
  const half = W / 2
  for (let i = -Math.floor(half / 10); i < Math.floor(half / 10); i++) {
    ctx.fillStyle = (i % 2 === 0) ? '#f5f3ee' : '#16181d'
    ctx.fillRect(i * 10, -8, 10, 8)
    ctx.fillStyle = (i % 2 === 0) ? '#16181d' : '#f5f3ee'
    ctx.fillRect(i * 10, 0, 10, 8)
  }
  ctx.restore()
  // jump ramps
  for (const seg of g.bt.def.jumps) {
    const A = pts[seg], B = pts[(seg + 1) % pts.length]
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2
    const hh = angTo(A.x, A.y, B.x, B.y)
    ctx.save(); ctx.translate(mx, my); ctx.rotate(hh)
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffce6b' : '#16181d'; ctx.fillRect(-30 + i * 15, -W * 0.4, 15, W * 0.8) }
    ctx.fillStyle = th.accent; ctx.font = 'bold 14px "Press Start 2P",monospace'; ctx.textAlign = 'center'
    ctx.fillText('JUMP', 0, -W * 0.5 - 6); ctx.restore()
  }
}

function drawWorldPopups(ctx: CanvasRenderingContext2D, g: GS, rot: number) {
  // re-apply transform per popup to draw upright text in world
  for (const pu of g.popups) {
    const a = clamp(1 - pu.t / 1.4, 0, 1)
    ctx.save()
    ctx.translate(VW / 2, VH * 0.62)
    ctx.scale(g.cam.zoom, g.cam.zoom)
    ctx.rotate(rot)
    ctx.translate(-g.cam.x, -g.cam.y)
    ctx.translate(pu.x, pu.y - pu.t * 36)
    ctx.rotate(-rot)
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.font = 'bold 13px "Press Start 2P",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const wpx = ctx.measureText(pu.text).width
    rr(ctx, -wpx / 2 - 6, -12, wpx + 12, 22, 5); ctx.fill()
    ctx.fillStyle = pu.col; ctx.fillText(pu.text, 0, 0)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

function renderCountdown(ctx: CanvasRenderingContext2D, g: GS) {
  const n = Math.ceil(g.countdown)
  const frac = g.countdown - Math.floor(g.countdown)
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const big = n <= 0 ? 'GO!' : String(n)
  const scale = 1 + (1 - frac) * 0.6
  ctx.translate(VW / 2, VH * 0.4)
  ctx.scale(scale, scale)
  ctx.globalAlpha = clamp(frac * 1.4, 0, 1)
  ctx.fillStyle = n <= 0 ? '#39ff88' : '#ffce6b'
  ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 24
  ctx.font = 'bold 90px "Press Start 2P",monospace'
  ctx.fillText(big, 0, 0)
  ctx.restore()
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GS) {
  const p = g.racers[0]
  const speed = Math.hypot(p.vx, p.vy)
  // speedo
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, VW - 168, VH - 88, 156, 76, 10); ctx.fill()
  ctx.fillStyle = '#ffce6b'; ctx.font = 'bold 30px "Press Start 2P",monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(String(Math.round(speed / 2.6)), VW - 56, VH - 34)
  ctx.fillStyle = '#a09880'; ctx.font = '9px "Press Start 2P",monospace'; ctx.fillText('KM/H', VW - 22, VH - 34)

  // nitro bar
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, 12, VH - 40, 220, 26, 8); ctx.fill()
  const nw = (p.nitro / 100) * 210
  const ng = ctx.createLinearGradient(16, 0, 16 + 210, 0)
  ng.addColorStop(0, '#2bd6ff'); ng.addColorStop(1, p.nitroOn ? '#fff' : '#9a5cff')
  ctx.fillStyle = ng; rr(ctx, 16, VH - 36, Math.max(0, nw), 18, 6); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = '9px "Press Start 2P",monospace'; ctx.textAlign = 'left'; ctx.fillText('N₂O', 20, VH - 22)

  // lap + position (top-left)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, 12, 12, 150, 56, 8); ctx.fill()
  ctx.fillStyle = '#f5f3ee'; ctx.font = 'bold 13px "Press Start 2P",monospace'; ctx.textAlign = 'left'
  const dispLap = clamp(p.lap + 1, 1, g.bt.def.laps)
  ctx.fillText(`LAP ${dispLap}/${g.bt.def.laps}`, 22, 34)
  ctx.fillStyle = p.place === 1 ? '#ffce6b' : '#a09880'
  const ord = ['1ST', '2ND', '3RD', '4TH', '5TH']
  ctx.fillText(`POS ${ord[p.place - 1] || p.place + 'TH'}/${g.totalRacers}`, 22, 58)

  // track name (top-center)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.textAlign = 'center'
  ctx.font = '10px "Press Start 2P",monospace'; ctx.fillStyle = '#ffce6b'
  ctx.fillText(g.bt.def.name.toUpperCase(), VW / 2, 26)
  // timer
  ctx.fillStyle = '#e8e6e0'; ctx.font = '11px "Press Start 2P",monospace'
  ctx.fillText(g.time.toFixed(1) + 's', VW / 2, 44)
}

function renderMinimap(ctx: CanvasRenderingContext2D, g: GS) {
  const mw = 150, mh = 110, mx = VW - mw - 12, my = 12
  // bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pt of g.bt.def.pts) { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y) }
  const pad = 60; minX -= pad; minY -= pad; maxX += pad; maxY += pad
  const sx = mw / (maxX - minX), sy = mh / (maxY - minY); const s = Math.min(sx, sy)
  const tx = (x: number) => mx + (x - minX) * s + (mw - (maxX - minX) * s) / 2
  const ty = (y: number) => my + (y - minY) * s + (mh - (maxY - minY) * s) / 2
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8); ctx.fill()
  ctx.strokeStyle = 'rgba(245,225,150,0.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'
  ctx.beginPath(); g.bt.def.pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(tx(pt.x), ty(pt.y)); else ctx.lineTo(tx(pt.x), ty(pt.y)) }); ctx.closePath(); ctx.stroke()
  for (const r of g.racers) {
    ctx.fillStyle = r.isPlayer ? '#fff' : PAINTS[r.rivalColor ?? 0]
    ctx.beginPath(); ctx.arc(tx(r.x), ty(r.y), r.isPlayer ? 4 : 3, 0, TAU); ctx.fill()
    if (r.isPlayer) { ctx.strokeStyle = '#16181d'; ctx.lineWidth = 1; ctx.stroke() }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   PERSISTENCE
   ═══════════════════════════════════════════════════════════════════════ */
const SAVE_KEY = 'sd-save', SOUND_KEY = 'sd-sound'
interface SaveData { coins: number; stage: number; cars: number[]; owned: string[]; garages: Garage[] }
function defaultSave(): SaveData {
  return { coins: 0, stage: 0, cars: [0], owned: [], garages: [defaultGarage(), { ...defaultGarage(), car: 1, paint: 11 }, { ...defaultGarage(), car: 2, paint: 12 }] }
}
function loadSave(): SaveData {
  if (typeof window === 'undefined') return defaultSave()
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return defaultSave(); const s = JSON.parse(raw); return { ...defaultSave(), ...s, garages: s.garages || defaultSave().garages } } catch { return defaultSave() }
}
function persist(s: SaveData) { if (typeof window === 'undefined') return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)) } catch { /* ignore */ } }

/* career ladder: each event = track + rivals + a guaranteed cosmetic unlock */
interface CareerEvent { track: number; rivals: number[]; unlock: string; unlockLabel: string; reward: number }
const CAREER: CareerEvent[] = [
  { track: 0, rivals: [0], unlock: 'spoiler:1', unlockLabel: 'Lip Spoiler', reward: 800 },
  { track: 1, rivals: [0, 1], unlock: 'underglow:2', unlockLabel: 'Cyan Underglow', reward: 1100 },
  { track: 0, rivals: [1, 2], unlock: 'kit:2', unlockLabel: 'Widebody Kit', reward: 1500 },
  { track: 1, rivals: [0, 1, 2], unlock: 'rim:2', unlockLabel: 'Deep Dish Rims', reward: 1900 },
  { track: 0, rivals: [1, 2, 3], unlock: 'car:1', unlockLabel: 'Sidewinder (car)', reward: 2600 },
  { track: 1, rivals: [0, 1, 2, 3], unlock: 'car:2', unlockLabel: 'Brawler (car)', reward: 4000 },
]

/* ═══════════════════════════════════════════════════════════════════════
   REACT COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
type Screen = 'menu' | 'garage' | 'select' | 'taunt' | 'playing' | 'finish'

export default function SunsetDrift() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [save, setSave] = useState<SaveData | null>(null)
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(0.4)
  const [paused, setPaused] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  // race setup
  const [trackIdx, setTrackIdx] = useState(0)
  const [eventRivals, setEventRivals] = useState<number[]>([0])
  const [eventIdx, setEventIdx] = useState(0)         // career stage being played, or -1 for free race
  const [freeRace, setFreeRace] = useState(false)
  const [tauntRival, setTauntRival] = useState(0)

  // finish results
  const [result, setResult] = useState<{ place: number; rewards: string[]; coins: number; advanced: boolean } | null>(null)

  // garage editing car
  const [gcar, setGcar] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GS | null>(null)
  const rafRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  const edgeRef = useRef<{ nitro: boolean }>({ nitro: false })
  const lastRef = useRef(0)
  const pausedRef = useRef(false)
  const screenRef = useRef(screen)
  screenRef.current = screen
  pausedRef.current = paused

  // load save + sound prefs
  useEffect(() => {
    const s = loadSave(); setSave(s); setGcar(s.cars.includes(s.garages[s.garages.length - 1]?.car) ? 0 : 0)
    try { const m = localStorage.getItem(SOUND_KEY); if (m === '0') { setMuted(true); Sfx.setMuted(true) } } catch { /* ignore */ }
  }, [])
  useEffect(() => { if (save) persist(save) }, [save])
  useEffect(() => { setIsTouch(('ontouchstart' in window) || navigator.maxTouchPoints > 0) }, [])

  /* ── start a race ── */
  const beginRace = useCallback((tIdx: number, rivals: number[]) => {
    if (!save) return
    Sfx.resume(); Sfx.engineStart(); Sfx.setMusic('race')
    const garage = save.garages[gcar] || defaultGarage()
    const car = CARS[garage.car]
    gsRef.current = mkState(tIdx, car, garage, rivals)
    setPaused(false); setResult(null)
    setScreen('playing')
  }, [save, gcar])

  /* ── keyboard ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(k)) e.preventDefault()
      if (screenRef.current !== 'playing') return
      if (k === 'shift' && !keysRef.current.has('shift')) edgeRef.current.nitro = true
      if (k === 'p' || k === 'escape') setPaused(v => !v)
      keysRef.current.add(k === ' ' ? ' ' : k)
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase() === ' ' ? ' ' : e.key.toLowerCase()) }
    const blur = () => { keysRef.current.clear(); if (screenRef.current === 'playing') setPaused(true) }
    const onHide = () => { if (document.hidden) { keysRef.current.clear(); if (screenRef.current === 'playing') setPaused(true) } }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', onHide) }
  }, [])

  /* ── game loop ── */
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
        tick(g, dt, keysRef.current, edgeRef.current)
        edgeRef.current.nitro = false
      }
      render(ctx, g)
      if (pausedRef.current) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffce6b'; ctx.font = 'bold 22px "Press Start 2P",monospace'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', VW / 2, VH / 2) }
      if (g.phase === 'finished' && g.finishLineT <= 0) finishRace(g)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  useEffect(() => () => { Sfx.stopMusic(); Sfx.engineStop(); Sfx.screechStop() }, [])
  useEffect(() => { Sfx.duck(paused && screen === 'playing') }, [paused, screen])

  /* ── compute finish result, award coins/unlocks ── */
  const finishedRef = useRef(false)
  const finishRace = useCallback((g: GS) => {
    if (finishedRef.current) return
    finishedRef.current = true
    Sfx.engineStop(); Sfx.screechStop()
    cancelAnimationFrame(rafRef.current)
    const place = g.playerPlace
    setSave(prev => {
      if (!prev) return prev
      const s: SaveData = { ...prev, owned: [...prev.owned], cars: [...prev.cars], garages: prev.garages.map(x => ({ ...x })) }
      const rewards: string[] = []
      // base coins by placement
      const placeCoin = place === 1 ? 1000 : place === 2 ? 600 : place === 3 ? 400 : 250
      let coins = placeCoin
      if (!freeRace) {
        const ev = CAREER[eventIdx]
        if (ev && place === 1) {
          coins += ev.reward
          rewards.push(`+${ev.reward} coins (event win)`)
          // unlock
          const [k, vi] = ev.unlock.split(':')
          if (k === 'car') { const ci = parseInt(vi); if (!s.cars.includes(ci)) { s.cars.push(ci); rewards.push(`Unlocked car: ${ev.unlockLabel}`) } }
          else { if (!s.owned.includes(ev.unlock)) { s.owned.push(ev.unlock); rewards.push(`Unlocked: ${ev.unlockLabel}`) } }
          if (eventIdx >= s.stage) s.stage = Math.min(CAREER.length, eventIdx + 1)
        }
      }
      rewards.unshift(`+${placeCoin} coins (${place === 1 ? 'win' : place + getOrdSuffix(place)})`)
      s.coins = prev.coins + coins
      setResult({ place, rewards, coins, advanced: !freeRace && place === 1 })
      Sfx.coin(); if (rewards.some(r => r.startsWith('Unlocked'))) Sfx.unlock()
      return s
    })
    setScreen('finish')
  }, [eventIdx, freeRace])
  // reset the finished guard whenever we (re)enter a race
  useEffect(() => { if (screen === 'playing') finishedRef.current = false }, [screen])

  const toggleMute = () => { const m = !muted; setMuted(m); Sfx.setMuted(m); try { localStorage.setItem(SOUND_KEY, m ? '0' : '1') } catch { /* ignore */ } }
  const onVol = (v: number) => { setVol(v); Sfx.resume(); Sfx.setVolume(v); if (muted && v > 0) { setMuted(false); Sfx.setMuted(false) } }

  const quitToMenu = () => { cancelAnimationFrame(rafRef.current); Sfx.engineStop(); Sfx.screechStop(); setPaused(false); setScreen('menu'); Sfx.setMusic('menu') }
  const startMenuMusic = () => { Sfx.resume(); Sfx.setMusic('menu') }

  if (!save) return <div style={{ padding: 40, textAlign: 'center', color: '#a09880', fontFamily: '"Press Start 2P",monospace', fontSize: 10 }}>Loading garage…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 24px' }}>
      <style>{`
        .sd-wrap { position:relative; width:100%; max-width:900px; }
        .sd-canvas { width:100%; height:auto; display:block; border:2px solid #2a2820; border-radius:10px; box-shadow:0 0 40px rgba(0,0,0,0.6); background:#3a2350; }
        .sd-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border-radius:10px; overflow:auto; }
        .sd-btn { font-family:"Press Start 2P",monospace; cursor:pointer; transition:transform .1s,filter .1s; border:2px solid #c89b3c; background:linear-gradient(180deg,#3a2f16,#241c0c); color:#ffce6b; padding:12px 22px; border-radius:8px; font-size:11px; }
        .sd-btn:hover { transform:translateY(-2px); filter:brightness(1.15); }
        .sd-btn.sec { border-color:#5b6470; background:linear-gradient(180deg,#23262d,#15171b); color:#cdd3dc; }
        .sd-chip { font-family:"Press Start 2P",monospace; cursor:pointer; border:2px solid #2a2820; background:#15171b; color:#cdd3dc; padding:7px 9px; border-radius:6px; font-size:8px; transition:all .1s; }
        .sd-chip:hover { border-color:#c89b3c; }
        .sd-chip.on { border-color:#c89b3c; background:#3a2f16; color:#ffce6b; }
        .sd-chip.lock { opacity:0.7; }
        .sd-vol { -webkit-appearance:none; appearance:none; height:10px; border-radius:6px; background:#2a2820; outline:none; width:120px; }
        .sd-vol::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:#c89b3c; border:2px solid #8b6914; cursor:pointer; }
        .sd-vol::-moz-range-thumb { width:22px; height:22px; border-radius:50%; background:#c89b3c; border:2px solid #8b6914; cursor:pointer; }
        .sd-title { font-family:"Press Start 2P",monospace; letter-spacing:2px; }
      `}</style>

      <div className="sd-wrap">
        <canvas ref={canvasRef} width={VW} height={VH} className="sd-canvas" />

        {/* ── MENU ── */}
        {screen === 'menu' && (
          <div className="sd-overlay" onMouseDown={startMenuMusic} onTouchStart={startMenuMusic}
            style={{ background: 'linear-gradient(180deg,rgba(58,35,80,0.95),rgba(255,158,87,0.5)), radial-gradient(circle at 50% 30%, rgba(255,220,160,0.4), rgba(20,16,28,0.9))', padding: 18 }}>
            <div className="sd-title" style={{ fontSize: 'clamp(28px,7vw,52px)', color: '#ffd98a', textShadow: '0 0 22px rgba(255,180,90,0.6)' }}>SUNSET</div>
            <div className="sd-title" style={{ fontSize: 'clamp(28px,7vw,52px)', color: '#ff6f91', textShadow: '0 0 22px rgba(255,80,120,0.5)', marginBottom: 6 }}>DRIFT</div>
            <div style={{ fontFamily: 'Inter,sans-serif', color: '#f0e6d8', fontSize: 13, marginBottom: 18, maxWidth: 440 }}>Arcade street racing. Drift, boost, win, and build your dream car.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
              <button className="sd-btn" onClick={() => { Sfx.ui(); const stage = Math.min(save.stage, CAREER.length - 1); const ev = CAREER[stage]; setEventIdx(stage); setFreeRace(false); setTrackIdx(ev.track); setEventRivals(ev.rivals); setTauntRival(ev.rivals[ev.rivals.length - 1]); setScreen('taunt') }}>
                {save.stage >= CAREER.length ? 'CAREER ✓ (replay)' : `CAREER · EVENT ${Math.min(save.stage + 1, CAREER.length)}`}
              </button>
              <button className="sd-btn sec" onClick={() => { Sfx.ui(); setFreeRace(true); setScreen('select') }}>FREE RACE</button>
              <button className="sd-btn sec" onClick={() => { Sfx.ui(); setGcar(save.garages.findIndex(g => save.cars.includes(g.car)) >= 0 ? save.garages.findIndex(g => save.cars.includes(g.car)) : 0); setScreen('garage') }}>🔧 GARAGE</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
              <button className="sd-chip" onClick={toggleMute}>{muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}</button>
              <input className="sd-vol" type="range" min={0} max={1} step={0.01} value={vol} onChange={e => onVol(parseFloat(e.target.value))} />
              <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#ffce6b' }}>💰 {save.coins}</span>
            </div>
          </div>
        )}

        {/* ── FREE RACE SELECT ── */}
        {screen === 'select' && (
          <div className="sd-overlay" style={{ background: 'rgba(16,14,24,0.95)', padding: 20, gap: 14 }}>
            <div className="sd-title" style={{ fontSize: 20, color: '#ffce6b' }}>FREE RACE</div>
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#a09880' }}>CHOOSE A TRACK</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {TRACK_DEFS.map((t, i) => (
                <button key={i} className={`sd-chip ${trackIdx === i ? 'on' : ''}`} style={{ fontSize: 10, padding: '12px 14px' }} onClick={() => { Sfx.ui(); setTrackIdx(i) }}>{t.name}</button>
              ))}
            </div>
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#a09880', marginTop: 6 }}>RIVALS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
              {RIVALS.map((r, i) => {
                const on = eventRivals.includes(i)
                return <button key={i} className={`sd-chip ${on ? 'on' : ''}`} onClick={() => { Sfx.ui(); setEventRivals(prev => on ? prev.filter(x => x !== i) : [...prev, i].slice(0, 4)) }} style={{ color: on ? PAINTS[r.color] : undefined }}>{r.name}</button>
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="sd-btn sec" onClick={() => { Sfx.ui(); setScreen('menu') }}>← BACK</button>
              <button className="sd-btn" onClick={() => { Sfx.ui(); beginRace(trackIdx, eventRivals.length ? eventRivals : [0]) }}>RACE ▶</button>
            </div>
          </div>
        )}

        {/* ── TAUNT (pre-race) ── */}
        {screen === 'taunt' && (() => {
          const r = RIVALS[tauntRival]
          return (
            <div className="sd-overlay" style={{ background: `linear-gradient(180deg,rgba(16,14,24,0.92),${PAINTS[r.color]}22)`, padding: 24, gap: 12 }}>
              <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 10, color: '#a09880' }}>EVENT {Math.min(eventIdx + 1, CAREER.length)} · {TRACK_DEFS[trackIdx].name.toUpperCase()}</div>
              <RivalPortrait rival={r} />
              <div className="sd-title" style={{ fontSize: 26, color: PAINTS[r.color], textShadow: `0 0 18px ${PAINTS[r.color]}88` }}>{r.name}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontStyle: 'italic', color: '#f0e6d8', fontSize: 15, maxWidth: 420 }}>&ldquo;{r.phrase}&rdquo;</div>
              <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#a09880' }}>{styleLabel(r.style)} · {r.carBlurb}</div>
              {eventRivals.length > 1 && <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#cdd3dc' }}>+ {eventRivals.length - 1} more rival{eventRivals.length > 2 ? 's' : ''}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="sd-btn sec" onClick={() => { Sfx.ui(); setScreen('menu') }}>← BACK</button>
                <button className="sd-btn" onClick={() => { Sfx.ui(); beginRace(trackIdx, eventRivals) }}>TO THE LINE ▶</button>
              </div>
            </div>
          )
        })()}

        {/* ── GARAGE ── */}
        {screen === 'garage' && (
          <GaragePanel save={save} setSave={setSave} gcar={gcar} setGcar={setGcar} onExit={() => { Sfx.ui(); setScreen('menu') }} />
        )}

        {/* ── FINISH ── */}
        {screen === 'finish' && result && (
          <div className="sd-overlay" style={{ background: result.place === 1 ? 'linear-gradient(180deg,rgba(20,16,28,0.92),rgba(200,155,60,0.35))' : 'rgba(16,14,24,0.94)', padding: 24, gap: 10 }}>
            <div className="sd-title" style={{ fontSize: 'clamp(26px,6vw,44px)', color: result.place === 1 ? '#ffd98a' : '#cdd3dc', textShadow: result.place === 1 ? '0 0 22px rgba(255,200,100,0.6)' : 'none' }}>
              {result.place === 1 ? '🏆 WIN!' : `${result.place}${getOrdSuffix(result.place).toUpperCase()} PLACE`}
            </div>
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#a09880' }}>FINISHED {result.place} OF {gsRef.current?.totalRacers}</div>
            <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '12px 18px', minWidth: 280 }}>
              {result.rewards.map((rw, i) => (
                <div key={i} style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: rw.startsWith('Unlocked') ? '#39ff88' : '#ffce6b', margin: '6px 0' }}>{rw}</div>
              ))}
              <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 10, color: '#fff', marginTop: 8, borderTop: '1px solid #2a2820', paddingTop: 8 }}>💰 TOTAL {save.coins}</div>
            </div>
            {result.advanced && eventIdx + 1 < CAREER.length && <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#39ff88' }}>NEXT EVENT UNLOCKED!</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="sd-btn sec" onClick={() => { Sfx.ui(); quitToMenu() }}>MENU</button>
              <button className="sd-btn sec" onClick={() => { Sfx.ui(); setScreen('garage') }}>🔧 GARAGE</button>
              <button className="sd-btn" onClick={() => { Sfx.ui(); beginRace(trackIdx, eventRivals) }}>RACE AGAIN ▶</button>
            </div>
          </div>
        )}

        {/* ── pause menu (during play) ── */}
        {screen === 'playing' && paused && (
          <div className="sd-overlay" style={{ background: 'rgba(10,8,16,0.6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="sd-btn" onClick={() => setPaused(false)}>RESUME</button>
              <button className="sd-btn sec" onClick={quitToMenu}>QUIT TO MENU</button>
            </div>
          </div>
        )}

        {/* touch controls */}
        {screen === 'playing' && isTouch && <TouchControls keysRef={keysRef} edgeRef={edgeRef} onPause={() => setPaused(v => !v)} />}
      </div>

      {/* controls help + back link */}
      {screen === 'menu' && (
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: '#a09880', textAlign: 'center', maxWidth: 560, lineHeight: 1.6 }}>
          <b style={{ color: '#ffce6b' }}>Drive:</b> ↑/W gas · ↓/S brake · ←→/A D steer · <b style={{ color: '#ffce6b' }}>Space</b> handbrake-drift · <b style={{ color: '#ffce6b' }}>Shift</b> nitrous · P pause.
          Drift &amp; near-misses fill your N₂O. Hit ramps for big air. Take the sand shortcut to cut the lead.
        </div>
      )}
      <Link href="/skills/fun" style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#a09880' }}>← Back to Fun Zone</Link>
    </div>
  )
}

function getOrdSuffix(n: number) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th' }
function styleLabel(s: RivalDef['style']) { return s === 'drift' ? 'DRIFT SPECIALIST' : s === 'blocker' ? 'AGGRESSIVE BLOCKER' : s === 'nitro' ? 'NITROUS EXPERT' : 'TECHNICAL MASTER' }

/* ── small rival portrait (top-down car drawn to a mini canvas) ── */
function RivalPortrait({ rival }: { rival: RivalDef }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, 120, 120)
    ctx.save(); ctx.translate(60, 60); ctx.rotate(-Math.PI / 2); ctx.scale(1.7, 1.7)
    const g = defaultGarage(); g.paint = rival.color; g.rim = rival.rim; g.spoiler = rival.spoiler; g.kit = rival.kit; g.underglow = rival.underglow; g.finish = 2
    drawCar(ctx, g, 1.2, { drift: 0, nitroOn: false, brake: false, steer: 0, headlights: true })
    ctx.restore()
  }, [rival])
  return <canvas ref={ref} width={120} height={120} style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
}

/* ═══ GARAGE PANEL ═══ */
function GaragePanel({ save, setSave, gcar, setGcar, onExit }: {
  save: SaveData; setSave: React.Dispatch<React.SetStateAction<SaveData | null>>; gcar: number; setGcar: (n: number) => void; onExit: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const garage = save.garages[gcar] || defaultGarage()
  const [tab, setTab] = useState<'style' | 'perf'>('style')

  // live preview
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return
    const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#241a3a'); g.addColorStop(1, '#3a2350')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 300, 200)
    ctx.fillStyle = 'rgba(255,220,160,0.15)'; ctx.beginPath(); ctx.ellipse(150, 150, 130, 30, 0, 0, TAU); ctx.fill()
    ctx.save(); ctx.translate(150, 105); ctx.rotate(-Math.PI / 2); ctx.scale(2.4, 2.4)
    drawCar(ctx, garage, 1.3, { drift: 0, nitroOn: false, brake: false, steer: 0, headlights: true })
    ctx.restore()
  }, [garage])

  const update = (patch: Partial<Garage>) => {
    Sfx.ui()
    setSave(prev => { if (!prev) return prev; const gs = prev.garages.map(x => ({ ...x })); gs[gcar] = { ...gs[gcar], ...patch }; return { ...prev, garages: gs } })
  }
  // cosmetic: option idx 0 is free; others must be owned or bought
  const tryEquip = (key: keyof Garage, idx: number, price: number) => {
    const okey = `${key}:${idx}`
    const free = idx === 0 || key === 'finish' || key === 'rimColor' || key === 'paint' || key === 'headlight' || key === 'tint' || key === 'hood'
    if (free || save.owned.includes(okey)) { update({ [key]: idx } as Partial<Garage>); return }
    if (save.coins >= price) {
      Sfx.coin()
      setSave(prev => { if (!prev) return prev; const gs = prev.garages.map(x => ({ ...x })); gs[gcar] = { ...gs[gcar], [key]: idx }; return { ...prev, coins: prev.coins - price, owned: [...prev.owned, okey], garages: gs } })
    } else Sfx.lose()
  }
  const buyPerf = (key: 'engine' | 'tires' | 'turbo' | 'weight') => {
    const cur = garage[key]; if (cur >= 3) return
    const price = PERF_COST[cur + 1]
    if (save.coins >= price) {
      Sfx.unlock()
      setSave(prev => { if (!prev) return prev; const gs = prev.garages.map(x => ({ ...x })); gs[gcar] = { ...gs[gcar], [key]: cur + 1 }; return { ...prev, coins: prev.coins - price, garages: gs } })
    } else Sfx.lose()
  }

  const COSMETIC_PRICE = 700
  const cosRow = (label: string, key: keyof Garage, opts: readonly string[], colorize?: (i: number) => string) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#a09880', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {opts.map((o, i) => {
          const owned = i === 0 || save.owned.includes(`${String(key)}:${i}`) || ['finish', 'rimColor', 'paint', 'headlight', 'tint', 'hood'].includes(String(key))
          const sel = garage[key] === i
          return (
            <button key={i} className={`sd-chip ${sel ? 'on' : ''} ${owned ? '' : 'lock'}`} onClick={() => tryEquip(key, i, COSMETIC_PRICE)}
              style={colorize ? { background: colorize(i), color: '#fff', borderColor: sel ? '#fff' : '#2a2820', minWidth: 26, minHeight: 26 } : undefined}>
              {colorize ? (sel ? '✓' : '') : o}{!owned && !colorize ? ' 🔒' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )

  const perfRow = (label: string, key: 'engine' | 'tires' | 'turbo' | 'weight') => {
    const lvl = garage[key]; const next = lvl < 3 ? PERF_COST[lvl + 1] : null
    return (
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#cdd3dc', width: 70 }}>{label}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 22, height: 12, borderRadius: 2, background: i <= lvl ? '#39ff88' : '#2a2820' }} />)}
        </div>
        {next !== null
          ? <button className="sd-chip" onClick={() => buyPerf(key)} style={{ marginLeft: 'auto' }}>UPG 💰{next}</button>
          : <span style={{ marginLeft: 'auto', fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#39ff88' }}>MAX</span>}
      </div>
    )
  }

  return (
    <div className="sd-overlay" style={{ background: 'rgba(14,12,20,0.97)', padding: 14, alignItems: 'stretch', justifyContent: 'flex-start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="sd-title" style={{ fontSize: 16, color: '#ffce6b' }}>🔧 GARAGE</span>
        <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 10, color: '#ffce6b' }}>💰 {save.coins}</span>
      </div>
      {/* car picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {CARS.map((c, i) => {
          const owned = save.cars.includes(i)
          const sel = garage.car === i
          const gi = save.garages.findIndex(g => g.car === i)
          return <button key={i} className={`sd-chip ${sel ? 'on' : ''} ${owned ? '' : 'lock'}`} onClick={() => {
            if (owned) { Sfx.ui(); setGcar(gi >= 0 ? gi : 0) }
            else if (save.coins >= CAR_COST[i]) { Sfx.unlock(); setSave(prev => prev ? { ...prev, coins: prev.coins - CAR_COST[i], cars: [...prev.cars, i] } : prev); setGcar(gi >= 0 ? gi : 0) }
            else Sfx.lose()
          }}>{c.name}{!owned ? ` 🔒${CAR_COST[i]}` : ''}</button>
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* preview + stats */}
        <div style={{ flex: '0 0 300px' }}>
          <canvas ref={ref} width={300} height={200} style={{ width: '100%', maxWidth: 300, borderRadius: 8, border: '1px solid #2a2820' }} />
          <div style={{ marginTop: 6 }}>
            {([['ACCEL', 'accel'], ['SPEED', 'topSpeed'], ['GRIP', 'grip'], ['NITRO', 'nitro']] as const).map(([lab, k]) => {
              const v = statFor(CARS[garage.car], garage)[k as keyof ReturnType<typeof statFor>]
              return <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
                <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 7, color: '#a09880', width: 48 }}>{lab}</span>
                <div style={{ flex: 1, height: 8, background: '#2a2820', borderRadius: 4 }}><div style={{ width: `${clamp(v / 1.6 * 100, 5, 100)}%`, height: 8, background: '#ffce6b', borderRadius: 4 }} /></div>
              </div>
            })}
          </div>
        </div>
        {/* options */}
        <div style={{ flex: 1, minWidth: 260, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button className={`sd-chip ${tab === 'style' ? 'on' : ''}`} onClick={() => { Sfx.ui(); setTab('style') }} style={{ fontSize: 9 }}>STYLE</button>
            <button className={`sd-chip ${tab === 'perf' ? 'on' : ''}`} onClick={() => { Sfx.ui(); setTab('perf') }} style={{ fontSize: 9 }}>PERFORMANCE</button>
          </div>
          {tab === 'style' ? <>
            {cosRow('PAINT', 'paint', PAINTS, i => PAINTS[i])}
            {cosRow('FINISH', 'finish', FINISHES)}
            {cosRow('RIMS', 'rim', RIM_STYLES)}
            {cosRow('RIM COLOR', 'rimColor', RIM_COLORS, i => RIM_COLORS[i])}
            {cosRow('BODY KIT', 'kit', KITS)}
            {cosRow('SPOILER', 'spoiler', SPOILERS)}
            {cosRow('HOOD', 'hood', HOODS)}
            {cosRow('UNDERGLOW', 'underglow', UNDERGLOWS, i => i === 0 ? '#15171b' : UNDERGLOWS[i])}
            {cosRow('VINYL', 'vinyl', VINYLS)}
            {cosRow('WINDOW TINT', 'tint', TINTS)}
            {cosRow('HEADLIGHTS', 'headlight', HEADLIGHTS)}
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: '#605848', marginTop: 4 }}>🔒 items cost 💰{COSMETIC_PRICE} — bought once, kept forever.</div>
          </> : <>
            {perfRow('ENGINE', 'engine')}
            {perfRow('TIRES', 'tires')}
            {perfRow('TURBO', 'turbo')}
            {perfRow('WEIGHT', 'weight')}
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: '#605848' }}>Engine = accel/top speed · Tires = grip · Turbo = nitrous · Weight = handling. Upgrades are per-car.</div>
          </>}
        </div>
      </div>
      <button className="sd-btn" onClick={onExit} style={{ marginTop: 10, alignSelf: 'center' }}>DONE</button>
    </div>
  )
}

/* ═══ TOUCH CONTROLS ═══ */
function TouchControls({ keysRef, edgeRef, onPause }: { keysRef: React.MutableRefObject<Set<string>>; edgeRef: React.MutableRefObject<{ nitro: boolean }>; onPause: () => void }) {
  const [steer, setSteer] = useState(0)
  const setKeyFromSteer = (dx: number) => {
    const k = keysRef.current; k.delete('arrowleft'); k.delete('arrowright')
    if (dx < -18) k.add('arrowleft'); else if (dx > 18) k.add('arrowright')
    setSteer(clamp(dx, -50, 50))
  }
  const baseRef = useRef<HTMLDivElement>(null)
  const handle = (e: React.PointerEvent) => {
    const el = baseRef.current; if (!el) return; const r = el.getBoundingClientRect()
    setKeyFromSteer(e.clientX - (r.left + r.width / 2))
  }
  const round: React.CSSProperties = { borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Press Start 2P",monospace', userSelect: 'none', touchAction: 'none' }
  const press = (k: string, on: boolean) => { if (on) keysRef.current.add(k); else keysRef.current.delete(k) }
  return (
    <>
      {/* steering pad bottom-left */}
      <div ref={baseRef} onPointerDown={e => { e.preventDefault(); baseRef.current?.setPointerCapture(e.pointerId); handle(e) }}
        onPointerMove={e => { if (e.buttons) handle(e) }} onPointerUp={() => setKeyFromSteer(0)} onPointerCancel={() => setKeyFromSteer(0)}
        style={{ position: 'absolute', left: 12, bottom: 12, width: 120, height: 60, background: 'rgba(13,13,20,0.4)', border: '2px solid rgba(200,155,60,0.5)', borderRadius: 30, zIndex: 6, touchAction: 'none' }}>
        <div style={{ position: 'absolute', top: 14, left: 44, width: 32, height: 32, borderRadius: '50%', background: 'rgba(200,155,60,0.85)', transform: `translateX(${steer * 0.6}px)`, pointerEvents: 'none' }} />
      </div>
      {/* right cluster */}
      <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end', zIndex: 6 }}>
        <button onPointerDown={e => { e.preventDefault(); press('arrowdown', true) }} onPointerUp={() => press('arrowdown', false)} onPointerLeave={() => press('arrowdown', false)}
          style={{ ...round, width: 56, height: 56, border: '2px solid #5b6470', background: 'rgba(20,22,28,0.6)', color: '#cdd3dc', fontSize: 9 }}>BRK</button>
        <button onPointerDown={e => { e.preventDefault(); press(' ', true) }} onPointerUp={() => press(' ', false)} onPointerLeave={() => press(' ', false)}
          style={{ ...round, width: 56, height: 56, border: '2px solid #9a5cff', background: 'rgba(40,20,60,0.6)', color: '#caa8ff', fontSize: 8 }}>DRIFT</button>
        <button onPointerDown={e => { e.preventDefault(); edgeRef.current.nitro = true; keysRef.current.add('shift') }} onPointerUp={() => keysRef.current.delete('shift')} onPointerLeave={() => keysRef.current.delete('shift')}
          style={{ ...round, width: 66, height: 66, border: '2px solid #2bd6ff', background: 'rgba(10,40,55,0.6)', color: '#9fe9ff', fontSize: 9 }}>N₂O</button>
        <button onPointerDown={e => { e.preventDefault(); press('arrowup', true) }} onPointerUp={() => press('arrowup', false)} onPointerLeave={() => press('arrowup', false)}
          style={{ ...round, width: 78, height: 78, border: '2px solid #c89b3c', background: 'rgba(60,40,10,0.6)', color: '#ffce6b', fontSize: 11 }}>GAS</button>
      </div>
      <button onClick={onPause} style={{ position: 'absolute', top: 10, right: 170, zIndex: 6, fontFamily: '"Press Start 2P",monospace', fontSize: 8, padding: '6px 8px', borderRadius: 6, border: '2px solid #5b6470', background: 'rgba(20,22,28,0.6)', color: '#cdd3dc' }}>⏸</button>
    </>
  )
}
