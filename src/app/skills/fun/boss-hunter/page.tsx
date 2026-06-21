'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import GodModeToggle, { useGodMode } from '@/components/GodModeToggle'

/* ═══ CONSTANTS ═══ */
const CW = 960, CH = 600, WW = 2400, WH = 1500
const IFRAME_DUR = 0.45, DODGE_DUR = 0.30, DODGE_CD = 1.4, CHAIN_HIT_RESET = 3.0

/* ═══ MATH ═══ */
interface V2 { x: number; y: number }
const v = (x: number, y: number): V2 => ({ x, y })
const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
const norm = (d: V2): V2 => { const m = Math.hypot(d.x, d.y) || 1; return v(d.x / m, d.y / m) }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const rndI = (a: number, b: number) => Math.floor(rnd(a, b + 0.99))
const hexA = (hex: string, a: number) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})` }

/* ═══ SOUND — synthesized Web Audio SFX (no asset files) ═══ */
const Sfx = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false
  const last: Record<string, number> = {}
  const VOL = 0.32
  function ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : VOL; master.connect(ctx.destination)
    }
    return ctx
  }
  function resume() { const c = ensure(); if (c && c.state === 'suspended') void c.resume() }
  function setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : VOL }
  function isMuted() { return muted }
  // returns the context if a sound may play (honours mute + per-key throttle)
  function ok(key?: string, ms?: number): AudioContext | null {
    const c = ensure(); if (!c || !master || muted) return null
    if (key && ms) { const now = c.currentTime * 1000; if (last[key] && now - last[key] < ms) return null; last[key] = now }
    return c
  }
  function blip(c: AudioContext, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.25))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(master!); o.start(t); o.stop(t + dur + 0.03)
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
    src.connect(f); f.connect(g); g.connect(master!); src.start(t); src.stop(t + dur)
  }

  /* ═══ MUSIC — procedural chiptune tracks, scheduled on the AudioContext clock ═══ */
  let musicGain: GainNode | null = null
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let curTrack = '', mstep = 0, nextTime = 0
  function mnote(c: AudioContext, freq: number, time: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, time)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(vol, time + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + dur + 0.04)
  }
  function mkick(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, time); o.frequency.exponentialRampToValueAtTime(46, time + 0.11)
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.16)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + 0.18)
  }
  function mhat(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.04)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.06)
  }
  function msnare(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.09)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.09)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.1)
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, time)
    const og = c.createGain(); og.gain.setValueAtTime(vol * 0.5, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    o.connect(og); og.connect(dest); o.start(time); o.stop(time + 0.08)
  }
  const D2=73.42, E2=82.41, F2=87.31, G2=98, A2=110, Bb2=116.54, B2=123.47, C3=130.81, D3=146.83, E3=164.81, G3=196, A3=220, Bb3=233.08, B3=246.94, C4=261.63, Cs4=277.18, D4=293.66, E4=329.63, F4=349.23, G4=392, A4=440, As4=466.16, B4=493.88, C5=523.25, Cs5=554.37, D5=587.33, E5=659.25, F5=698.46, Fs5=739.99, G5=783.99, A5=880
  type Voice = { steps: (number | null)[]; type: OscillatorType; vol: number; dur: number }
  type Trk = { stepDur: number; len: number; voices: Voice[]; kick: number[]; hat: number[]; snare?: number[] }
  const TRACKS: Record<string, Trk> = (() => {
    const T: Record<string, Trk> = {}
    // generic battle-band builder: section roots + per-section arp, 8 steps/section
    const band = (bpm: number, roots: number[], arps: number[][], o?: { bt?: OscillatorType; lt?: OscillatorType; lv?: number; heavy?: boolean; mel?: (number | null)[][]; melType?: OscillatorType; melVol?: number; melDur?: number; snare?: boolean }): Trk => {
      const len = roots.length * 8
      const bass: (number | null)[] = [], lead: (number | null)[] = [], pad: (number | null)[] = [], mel: (number | null)[] = [], kick: number[] = [], hat: number[] = [], snare: number[] = []
      for (let s = 0; s < len; s++) { const sec = Math.floor(s / 8), b = s % 8, ar = arps[sec]
        bass.push(b % 2 === 0 ? roots[sec] : (b === 5 ? roots[sec] : null)); lead.push(ar[b % ar.length]); pad.push(b === 0 ? roots[sec] * 2 : null)
        mel.push(o?.mel ? (o.mel[sec]?.[b] ?? null) : null)
        kick.push(o?.heavy ? ((b % 2 === 0) ? 1 : 0) : ((b === 0 || b === 4) ? 1 : 0)); hat.push(b % 2 === 1 ? 1 : 0); snare.push((b === 2 || b === 6) ? 1 : 0) }
      const voices: Voice[] = [{ steps: bass, type: o?.bt ?? 'sawtooth', vol: 0.26, dur: 0.2 }, { steps: lead, type: o?.lt ?? 'square', vol: o?.lv ?? 0.12, dur: 0.17 }, { steps: pad, type: 'triangle', vol: 0.1, dur: 1.7 }]
      if (o?.mel) voices.push({ steps: mel, type: o.melType ?? 'square', vol: o.melVol ?? 0.14, dur: o.melDur ?? 0.34 })
      return { stepDur: 60 / bpm / 2, len, voices, kick, hat, snare: o?.snare ? snare : undefined }
    }
    T.battle = band(144, [A2, F2, C3, G2], [[A4, C5, E5, C5], [F4, A4, C5, A4], [C5, E5, G5, E5], [G4, B3, D5, B3]])

    // ════ SPIDER — "Lair of the Weaver": eerie crawling D-minor, haunting lead ════
    const spiderRoots = [D2, Bb2, G2, A2, D2, Bb2, A2, A2]
    const spiderArp = [[D4, F4, A4, F4], [Bb3, D4, F4, D4], [G3, Bb3, D4, Bb3], [A3, Cs4, E4, Cs4], [D4, F4, A4, F4], [Bb3, D4, F4, D4], [A3, Cs4, E4, Cs4], [A3, E4, Cs4, E4]]
    const spiderMel: (number | null)[][] = [
      [D5, null, F5, null, E5, null, D5, null], [C5, null, D5, null, As4, null, null, null],
      [As4, null, D5, null, C5, null, As4, null], [A4, null, C5, null, B4, null, Cs5, null],
      [F5, null, E5, null, F5, null, A5, null], [G5, null, F5, null, E5, null, D5, null],
      [Cs5, null, E5, null, A4, null, Cs5, null], [A4, null, Cs5, null, E5, null, A5, null]]
    T.battle_spider = band(124, spiderRoots, spiderArp, { lt: 'triangle', lv: 0.12, mel: spiderMel, melType: 'sine', melVol: 0.12, melDur: 0.42 })
    T.battle_spider_rage = band(148, spiderRoots, spiderArp, { lt: 'sawtooth', lv: 0.15, heavy: true, snare: true, mel: spiderMel, melType: 'triangle', melVol: 0.16, melDur: 0.3 })

    // ════ DRAKE — "Molten Wyrm": heavy pounding A-minor, brass-menace lead ════
    const drakeRoots = [A2, A2, F2, G2, A2, A2, E2, E2]
    const drakeArp = [[A4, C5, E5, C5], [A4, E5, C5, E5], [F4, A4, C5, A4], [G4, B3, D5, B3], [A4, C5, E5, C5], [A4, E5, C5, E5], [E4, G4, B4, G4], [E4, B4, G4, B4]]
    const drakeMel: (number | null)[][] = [
      [A4, null, A4, C5, null, A4, null, E4], [A4, null, C5, null, E5, null, C5, null],
      [F4, null, A4, null, C5, null, A4, null], [G4, null, B4, null, D5, null, G4, null],
      [A4, C5, E5, null, A5, null, E5, null], [A5, null, G5, null, E5, null, C5, null],
      [E4, null, G4, null, B4, null, E5, null], [E5, null, D5, null, C5, null, B4, null]]
    T.battle_drake = band(130, drakeRoots, drakeArp, { bt: 'sawtooth', heavy: true, mel: drakeMel, melType: 'square', melVol: 0.13, melDur: 0.3 })
    T.battle_drake_rage = band(152, drakeRoots, drakeArp, { bt: 'sawtooth', heavy: true, snare: true, mel: drakeMel, melType: 'sawtooth', melVol: 0.16, melDur: 0.26 })

    // ════ GRIFFIN — "Tempest's Wing": fast electric E-minor, soaring lead ════
    const griffinRoots = [E3, C3, G2, D3, E3, A2, B2, B2]
    const griffinArp = [[E5, G5, B4, G5], [C5, E5, G5, E5], [G4, B4, D5, B4], [D5, Fs5, A4, Fs5], [E5, G5, B4, G5], [A4, C5, E5, C5], [B4, D5, Fs5, D5], [B4, Fs5, D5, Fs5]]
    const griffinMel: (number | null)[][] = [
      [E5, G5, B4, null, E5, null, G5, null], [C5, E5, G5, null, C5, null, E5, null],
      [G4, B4, D5, null, G5, null, D5, null], [D5, Fs5, A5, null, Fs5, null, D5, null],
      [E5, null, G5, B4, null, E5, null, B4], [A4, C5, E5, null, A5, null, E5, null],
      [B4, D5, Fs5, null, B4, null, Fs5, null], [Fs5, null, E5, null, D5, null, B4, null]]
    T.battle_griffin = band(156, griffinRoots, griffinArp, { lt: 'square', lv: 0.13, mel: griffinMel, melType: 'square', melVol: 0.12, melDur: 0.22 })
    T.battle_griffin_rage = band(178, griffinRoots, griffinArp, { lt: 'square', lv: 0.15, heavy: true, snare: true, mel: griffinMel, melType: 'square', melVol: 0.15, melDur: 0.2 })

    // ════ FROST WYRM — "Glacial Hymn": cold, vast D-minor with a crystalline bell lead ════
    const wyrmRoots = [D2, A2, Bb2, F2, D2, A2, G2, A2]
    const wyrmArp = [[D4, A4, F4, A4], [A3, E4, Cs4, E4], [Bb3, F4, D4, F4], [F4, C5, A4, C5], [D4, A4, F4, A4], [A3, E4, Cs4, E4], [G3, D4, Bb3, D4], [A3, E4, Cs4, E4]]
    const wyrmMel: (number | null)[][] = [
      [D5, null, A4, null, F5, null, E5, null], [E5, null, Cs5, null, A4, null, null, null],
      [F5, null, D5, null, As4, null, D5, null], [A5, null, F5, null, C5, null, A4, null],
      [D5, null, F5, null, A5, null, F5, null], [E5, null, A5, null, Cs5, null, E5, null],
      [D5, null, As4, null, G4, null, As4, null], [Cs5, null, E5, null, A4, null, Cs5, null]]
    T.battle_wyrm = band(122, wyrmRoots, wyrmArp, { lt: 'sine', lv: 0.11, mel: wyrmMel, melType: 'triangle', melVol: 0.13, melDur: 0.5 })
    T.battle_wyrm_rage = band(150, wyrmRoots, wyrmArp, { bt: 'sawtooth', lt: 'triangle', lv: 0.14, heavy: true, snare: true, mel: wyrmMel, melType: 'square', melVol: 0.16, melDur: 0.3 })

    // FINAL PHASE — frantic, double-time, full kit
    const finalMel: (number | null)[][] = [[A4, C5, E5, A5, null, E5, null, C5], [A5, null, E5, null, C5, null, A4, null], [F4, A4, C5, F5, null, C5, null, A4], [E4, G4, B4, E5, null, B4, null, G4]]
    T.battle_final = band(172, [A2, A2, F2, E2], [[A4, C5, E5, A5], [A4, E5, C5, A5], [F4, A4, C5, F5], [E4, G4, B4, E5]], { heavy: true, lv: 0.14, snare: true, mel: finalMel, melType: 'sawtooth', melVol: 0.16, melDur: 0.22 })
    // PREP — anticipatory pre-fight loop on the hunt-select screen
    T.prep = band(104, [A2, F2, D3, E3], [[A4, E5, C5, E5], [F4, C5, A4, C5], [D4, A4, F4, A4], [E4, B4, G4, B4]], { lt: 'sine', lv: 0.1 })
    // MENU — "Hunter's Rest": warm cinematic minor title theme (Am–F–C–G), melodic hook over a shimmer arp
    { const roots = [A2, F2, C3, G2]
      const arps = [[A4, C5, E5, C5], [F4, A4, C5, A4], [C5, E5, G5, E5], [G4, B4, D5, B4]]
      const melo: (number | null)[][] = [
        [A4, null, null, null, C5, null, B4, null],
        [A4, null, null, null, G4, null, A4, null],
        [C5, null, null, null, E5, null, D5, null],
        [B4, null, null, null, D5, null, G4, B4]]
      const len = 32
      const bass: (number | null)[] = [], pad: (number | null)[] = [], arp: (number | null)[] = [], lead: (number | null)[] = []
      for (let s = 0; s < len; s++) { const sec = Math.floor(s / 8), b = s % 8
        bass.push((b === 0 || b === 4) ? roots[sec] : null)
        pad.push(b === 0 ? roots[sec] * 2 : null)
        arp.push(b % 2 === 1 ? arps[sec][((b - 1) / 2) % 4] : null)   // soft shimmer on the offbeats
        lead.push(melo[sec][b]) }
      T.menu = { stepDur: 60 / 82 / 2, len, voices: [
        { steps: pad, type: 'sawtooth', vol: 0.05, dur: 3.4 },
        { steps: bass, type: 'triangle', vol: 0.2, dur: 1.6 },
        { steps: arp, type: 'sine', vol: 0.07, dur: 0.5 },
        { steps: lead, type: 'triangle', vol: 0.14, dur: 1.1 },
      ], kick: new Array(len).fill(0), hat: new Array(len).fill(0) } }
    // VICTORY — "Triumph": bright C-major fanfare, heroic rising hook + full kit
    const victoryArps = [[C5, E5, G5, E5], [B4, D5, G5, D5], [A4, C5, E5, C5], [F4, A4, C5, A4]]
    const victoryMel: (number | null)[][] = [
      [G4, null, C5, null, E5, null, G5, null],
      [D5, null, B4, null, D5, null, G5, null],
      [E5, null, C5, null, A4, null, C5, null],
      [F5, null, E5, null, D5, null, G5, null]]
    T.victory = band(128, [C3, G2, A2, F2], victoryArps, { lt: 'square', lv: 0.12, snare: true, mel: victoryMel, melType: 'square', melVol: 0.16, melDur: 0.28 })
    // DEFEAT — "Fallen Hunter": slow cinematic lament (Am–F–Dm–E), mournful sighing lead over a drone
    { const roots = [A2, F2, D3, E2]
      const chord = [[C4, E4], [A3, C4], [D4, A3], [B3, E4]]
      const melo: (number | null)[][] = [
        [E5, null, D5, null, C5, null, B4, null],
        [A4, null, null, null, C5, null, A4, null],
        [D5, null, C5, null, A4, null, F4, null],
        [E4, null, G4, null, B4, null, E4, null]]
      const len = 32
      const pad: (number | null)[] = [], bass: (number | null)[] = [], harm: (number | null)[] = [], lead: (number | null)[] = []
      for (let s = 0; s < len; s++) { const sec = Math.floor(s / 8), b = s % 8
        pad.push(b === 0 ? roots[sec] * 2 : null)
        bass.push(b === 0 ? roots[sec] : null)
        harm.push(b === 0 ? chord[sec][0] : b === 4 ? chord[sec][1] : null)   // slow tolling inner harmony
        lead.push(melo[sec][b]) }
      T.defeat = { stepDur: 60 / 66 / 2, len, voices: [
        { steps: pad, type: 'sawtooth', vol: 0.05, dur: 3.8 },
        { steps: bass, type: 'triangle', vol: 0.18, dur: 3.4 },
        { steps: harm, type: 'sine', vol: 0.07, dur: 1.8 },
        { steps: lead, type: 'sine', vol: 0.12, dur: 1.2 },
      ], kick: new Array(len).fill(0), hat: new Array(len).fill(0) } }
    return T
  })()
  function playStep(tr: Trk, s: number, time: number) {
    if (!musicGain || !ctx) return
    for (const v of tr.voices) { const f = v.steps[s]; if (f) mnote(ctx, f, time, v.dur, v.type, v.vol, musicGain) }
    if (tr.kick[s]) mkick(ctx, time, musicGain, 0.55); if (tr.hat[s]) mhat(ctx, time, musicGain, 0.16)
    if (tr.snare && tr.snare[s]) msnare(ctx, time, musicGain, 0.28)
  }
  function schedule() {
    const c = ctx; if (!c || !musicGain || !curTrack) return
    if (c.state !== 'running') { nextTime = c.currentTime; return }
    const tr = TRACKS[curTrack]; if (!tr) return
    while (nextTime < c.currentTime + 0.12) { playStep(tr, mstep % tr.len, nextTime); nextTime += tr.stepDur; mstep++ }
  }
  function playMusic(name: string) {
    const c = ensure(); if (!c || !master) return
    if (curTrack === name) return
    curTrack = name; mstep = 0; nextTime = c.currentTime
    if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = 0; musicGain.connect(master) }
    const now = c.currentTime
    musicGain.gain.cancelScheduledValues(now); musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now); musicGain.gain.linearRampToValueAtTime(1.25, now + 0.8)
    if (!musicTimer) musicTimer = setInterval(schedule, 25)
  }
  function stopMusic() {
    curTrack = ''
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null }
    if (musicGain && ctx) { const now = ctx.currentTime; musicGain.gain.cancelScheduledValues(now); musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now); musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.5) }
  }

  return {
    resume, setMuted, isMuted, playMusic, stopMusic,
    uiClick() { const c = ok('ui', 30); if (!c) return; blip(c, 660, 0.06, 'square', 0.12, 880) },
    heartbeat() { const c = ok('hb', 680); if (!c) return; blip(c, 72, 0.12, 'sine', 0.3, 54); blip(c, 64, 0.14, 'sine', 0.26, 48, 0.17) },
    swing() { const c = ok('swing', 60); if (!c) return; noise(c, 0.14, 0.5, 'bandpass', 1400, 0.8, 600); blip(c, 220, 0.1, 'triangle', 0.18, 120) },
    shot() { const c = ok('shot', 45); if (!c) return; blip(c, 900, 0.12, 'triangle', 0.22, 260); noise(c, 0.05, 0.3, 'highpass', 2200) },
    cast() { const c = ok('cast', 50); if (!c) return; blip(c, 420, 0.18, 'sine', 0.2, 760); blip(c, 630, 0.18, 'sine', 0.12, 1140) },
    bossHit() { const c = ok('bhit', 35); if (!c) return; blip(c, 180, 0.09, 'square', 0.18, 90); noise(c, 0.05, 0.25, 'lowpass', 900) },
    crit() { const c = ok('crit', 55); if (!c) return; blip(c, 520, 0.14, 'square', 0.24, 1000); blip(c, 880, 0.12, 'sawtooth', 0.16, 1500, 0.02); noise(c, 0.08, 0.3, 'highpass', 3000) },
    hurt() { const c = ok('hurt', 70); if (!c) return; blip(c, 150, 0.22, 'sawtooth', 0.3, 70); noise(c, 0.12, 0.35, 'lowpass', 700, 1, 200) },
    dodge() { const c = ok('dodge', 80); if (!c) return; noise(c, 0.22, 0.4, 'bandpass', 700, 1.2, 2400) },
    warn() { const c = ok('warn', 90); if (!c) return; blip(c, 700, 0.1, 'square', 0.15); blip(c, 700, 0.1, 'square', 0.13, undefined, 0.12) },
    warnBig() { const c = ok('warnB', 90); if (!c) return; blip(c, 340, 0.2, 'sawtooth', 0.22, 300); blip(c, 250, 0.26, 'sawtooth', 0.2, 210, 0.16); noise(c, 0.3, 0.12, 'lowpass', 500, 1, 220, 0.05) },
    roar() { const c = ok('roar', 200); if (!c) return; blip(c, 140, 0.6, 'sawtooth', 0.3, 60); blip(c, 90, 0.7, 'square', 0.18, 48); noise(c, 0.6, 0.25, 'lowpass', 600, 0.7, 180) },
    death() { const c = ok('death', 200); if (!c) return; blip(c, 240, 0.9, 'sawtooth', 0.32, 40); blip(c, 120, 1.0, 'square', 0.22, 30); noise(c, 0.9, 0.3, 'lowpass', 800, 1, 80) },
    tooClose() { const c = ok('tc', 480); if (!c) return; blip(c, 320, 0.06, 'square', 0.1, 200) },
    summon() { const c = ok('summon', 120); if (!c) return; blip(c, 300, 0.3, 'sawtooth', 0.18, 520); blip(c, 200, 0.34, 'square', 0.14, 360, 0.04); noise(c, 0.25, 0.16, 'bandpass', 1200, 1.4, 600) },
    minionDeath() { const c = ok('mdeath', 40); if (!c) return; blip(c, 380, 0.12, 'square', 0.16, 120); noise(c, 0.08, 0.2, 'highpass', 1800) },
    phaseShift() { const c = ok('phase', 200); if (!c) return; blip(c, 160, 0.7, 'sawtooth', 0.32, 70); blip(c, 320, 0.5, 'square', 0.18, 540, 0.05); noise(c, 0.6, 0.28, 'lowpass', 900, 0.8, 200) },
    gust() { const c = ok('gust', 110); if (!c) return; noise(c, 0.32, 0.3, 'bandpass', 900, 0.7, 2600); blip(c, 600, 0.18, 'sine', 0.08, 1200) },
    playerDeath() { const c = ok('pdeath', 500); if (!c) return; blip(c, 220, 1.3, 'sawtooth', 0.34, 28); blip(c, 95, 1.5, 'square', 0.22, 22, 0.06); noise(c, 1.1, 0.3, 'lowpass', 480, 1, 60); blip(c, 70, 0.5, 'sine', 0.32, 48); blip(c, 70, 0.5, 'sine', 0.3, 48, 0.6) },
    fireCast() { const c = ok('fcast', 50); if (!c) return; blip(c, 200, 0.22, 'sawtooth', 0.14, 560); noise(c, 0.22, 0.2, 'bandpass', 1500, 0.7, 3400) },
    firebolt() { const c = ok('fbolt', 45); if (!c) return; blip(c, 520, 0.14, 'sawtooth', 0.18, 200); noise(c, 0.12, 0.2, 'bandpass', 1900, 0.7, 600) },
    fireball() { const c = ok('fball', 70); if (!c) return; blip(c, 300, 0.32, 'sawtooth', 0.24, 90); blip(c, 150, 0.36, 'square', 0.16, 70, 0.04); noise(c, 0.3, 0.3, 'lowpass', 1300, 0.8, 380) },
    explosion() { const c = ok('expl', 55); if (!c) return; blip(c, 120, 0.4, 'sawtooth', 0.3, 38); noise(c, 0.35, 0.34, 'lowpass', 950, 1, 130); blip(c, 70, 0.5, 'sine', 0.22, 30, 0.02) },
    meteorCast() { const c = ok('mcast', 200); if (!c) return; blip(c, 90, 0.7, 'sawtooth', 0.2, 230); noise(c, 0.7, 0.16, 'bandpass', 700, 0.6, 1700) },
    meteorImpact() { const c = ok('mimp', 150); if (!c) return; blip(c, 150, 0.8, 'sawtooth', 0.34, 28); blip(c, 60, 1.0, 'square', 0.26, 22, 0.04); noise(c, 0.8, 0.4, 'lowpass', 820, 1, 80) },
    ability() { const c = ok('abil', 40); if (!c) return; blip(c, 520, 0.2, 'sine', 0.2, 980); blip(c, 780, 0.2, 'triangle', 0.12, 1400) },
    victory() { const c = ok('vic', 300); if (!c) return;[523, 659, 784, 1047].forEach((f, i) => blip(c, f, 0.22, 'triangle', 0.22, undefined, i * 0.12)) },
    loot() { const c = ok('loot', 120); if (!c) return; blip(c, 880, 0.1, 'triangle', 0.18, 1320); blip(c, 1320, 0.12, 'sine', 0.14, undefined, 0.08) },
    // ── ability-specific SFX ──
    slam() { const c = ok('slam', 60); if (!c) return; blip(c, 90, 0.34, 'sawtooth', 0.3, 40); noise(c, 0.3, 0.34, 'lowpass', 800, 1, 120); blip(c, 60, 0.4, 'sine', 0.22, 30, 0.02) },
    rage() { const c = ok('rage', 200); if (!c) return; blip(c, 110, 0.5, 'sawtooth', 0.28, 330); blip(c, 165, 0.5, 'square', 0.16, 495, 0.05); noise(c, 0.4, 0.16, 'bandpass', 700, 0.7, 1800) },
    charge() { const c = ok('charge', 80); if (!c) return; noise(c, 0.3, 0.32, 'bandpass', 600, 0.8, 2600); blip(c, 180, 0.26, 'sawtooth', 0.16, 420) },
    chargeHit() { const c = ok('chit', 60); if (!c) return; blip(c, 120, 0.3, 'square', 0.3, 50); noise(c, 0.22, 0.34, 'lowpass', 1100, 1, 200); blip(c, 70, 0.34, 'sine', 0.2, 36, 0.02) },
    whirl() { const c = ok('whirl', 150); if (!c) return; noise(c, 0.28, 0.22, 'bandpass', 1200, 1.1, 520) },
    powerShot() { const c = ok('pshot', 80); if (!c) return; blip(c, 700, 0.16, 'sawtooth', 0.26, 180); blip(c, 1200, 0.14, 'square', 0.14, 400, 0.02); noise(c, 0.1, 0.3, 'highpass', 2600) },
    trapSet() { const c = ok('tset', 90); if (!c) return; blip(c, 420, 0.07, 'square', 0.16, 240); blip(c, 300, 0.06, 'square', 0.12, 180, 0.05) },
    trapSnap() { const c = ok('tsnap', 80); if (!c) return; blip(c, 600, 0.06, 'square', 0.2, 160); noise(c, 0.14, 0.26, 'bandpass', 1400, 1.4, 500); blip(c, 220, 0.2, 'sawtooth', 0.14, 500, 0.04) },
    rainArrows() { const c = ok('rain', 150); if (!c) return; noise(c, 0.5, 0.24, 'bandpass', 1600, 0.6, 700); for (let i = 0; i < 4; i++) blip(c, 900, 0.08, 'triangle', 0.1, 300, i * 0.08) },
    arcaneBolt() { const c = ok('abolt', 50); if (!c) return; blip(c, 700, 0.2, 'sine', 0.2, 1500); blip(c, 1050, 0.2, 'triangle', 0.12, 2100, 0.02); noise(c, 0.1, 0.14, 'highpass', 3000) },
    shieldUp() { const c = ok('shup', 120); if (!c) return; blip(c, 300, 0.4, 'sine', 0.18, 760); blip(c, 600, 0.5, 'triangle', 0.1, 900); blip(c, 900, 0.3, 'sine', 0.08, 1200, 0.06) },
    shieldHit() { const c = ok('shit', 50); if (!c) return; blip(c, 1200, 0.1, 'sine', 0.18, 700); blip(c, 1800, 0.08, 'triangle', 0.1, 1100) },
    blink() { const c = ok('blink', 60); if (!c) return; blip(c, 1200, 0.12, 'sine', 0.16, 300); blip(c, 300, 0.12, 'sine', 0.14, 1200, 0.02); noise(c, 0.1, 0.16, 'bandpass', 2000, 1.5, 600) },
    // ── elemental / ambient SFX ──
    thunder() { const c = ok('thndr', 70); if (!c) return; noise(c, 0.3, 0.32, 'lowpass', 1200, 0.8, 200); blip(c, 200, 0.18, 'sawtooth', 0.2, 1400); blip(c, 80, 0.4, 'sine', 0.2, 40, 0.04) },
    zap() { const c = ok('zap', 40); if (!c) return; blip(c, 1400, 0.07, 'sawtooth', 0.16, 600); noise(c, 0.05, 0.18, 'highpass', 4000) },
    webShot() { const c = ok('webs', 50); if (!c) return; blip(c, 360, 0.12, 'triangle', 0.14, 140); noise(c, 0.1, 0.18, 'bandpass', 1100, 1.2, 400) },
    poisonHit() { const c = ok('pois', 220); if (!c) return; blip(c, 180, 0.18, 'sine', 0.12, 110); noise(c, 0.2, 0.1, 'bandpass', 600, 1.6, 300) },
    lavaBubble() { const c = ok('lava', 300); if (!c) return; blip(c, 90, 0.22, 'sine', 0.14, 150); noise(c, 0.16, 0.07, 'lowpass', 500, 1, 200) },
    wingFlap() { const c = ok('wing', 200); if (!c) return; noise(c, 0.22, 0.2, 'lowpass', 700, 0.8, 300); blip(c, 140, 0.16, 'sine', 0.09, 90) },
    emberSizzle() { const c = ok('ember', 90); if (!c) return; noise(c, 0.2, 0.18, 'bandpass', 2400, 0.8, 800) },
    // ── UI / progression ──
    unlock() { const c = ok('unlock', 200); if (!c) return;[523, 659, 784, 1047].forEach((f, i) => blip(c, f, 0.14, 'triangle', 0.16, undefined, i * 0.07)) },
    uiHover() { const c = ok('hover', 50); if (!c) return; blip(c, 520, 0.04, 'sine', 0.07, 700) },
  }
})()

/* ═══ TYPES ═══ */
type WeaponId = 'sword' | 'bow' | 'staff'
type BossId = 0 | 1 | 2 | 3
type GearId = 'spider_fang' | 'venom_bow' | 'web_amulet' | 'drake_sword' | 'fire_staff' | 'ember_armor' | 'thunder_blade' | 'storm_bow' | 'feather_boots' | 'wyrm_scale'

interface WeaponDef {
  id: WeaponId; name: string; icon: string; color: string
  element: 'lightning' | 'fire' | 'arcane'
  dmg: number; range: number; atkCd: number
  desc: string; abilities: AbilityDef[]
}
interface AbilityDef { key: string; name: string; desc: string; cd: number; icon: string }
interface BossDef {
  id: BossId; name: string; color: string; icon: string
  element: 'poison' | 'fire' | 'lightning' | 'ice'; lore: string
  hp: number; size: number; enrageAt: number
  rewards: GearId[]; arenaType: 'spider' | 'drake' | 'griffin' | 'wyrm'
}
interface GearDef { id: GearId; name: string; icon: string; desc: string }
interface Projectile {
  id: number; pos: V2; vel: V2; dmg: number; radius: number
  fromBoss: boolean; life: number; color: string
  aoe?: number; poison?: boolean; isWeb?: boolean
  isPowerShot?: boolean; isFireball?: boolean; isLightning?: boolean; isFeather?: boolean; isVenom?: boolean; isArrow?: boolean; isArcane?: boolean; isFirebolt?: boolean; isIce?: boolean
  trail?: V2[]
}
interface BossAttack { type: string; telegraphTime: number; elapsed: number; active: boolean; data: AttackData }
interface AttackData {
  targetPos?: V2; angle?: number; coneAngle?: number; coneRange?: number; radius?: number
  projSpeed?: number; dmg?: number; count?: number; duration?: number; elapsed?: number; strikeIndex?: number
}
interface DamageNumber { id: number; pos: V2; val: number; life: number; maxLife: number; isPlayer: boolean; crit?: boolean; vx?: number; text?: string }
interface Particle { id: number; pos: V2; vel: V2; life: number; maxLife: number; color: string; size: number }
interface SlowTrap { id: number; pos: V2; life: number; fromPlayer: boolean; col?: string; zone?: 'poison' | 'fire' | 'lightning' | null }
interface HazardZone { id: number; pos: V2; radius: number; type: 'poison' | 'fire' | 'lightning' | 'web' | 'ice'; dps: number; life: number; maxLife: number }
interface AttackFlash { angle: number; timer: number; maxTimer: number; type: 'slash' | 'slam' | 'shot' | 'magic' | 'shadow' | 'power_shot' | 'greatslash'; color: string }
// Transient ability visual-effects layer (shockwaves, novas, muzzle stars, cast runes)
interface Fx { id: number; type: 'shock' | 'nova' | 'star' | 'rune'; pos: V2; timer: number; maxTimer: number; color: string; radius: number; rot: number }
interface SkyArrow { id: number; targetPos: V2; warnTimer: number; hit: boolean; dmg: number; kind?: 'arrow' | 'meteor'; col?: string; zone?: 'poison' | 'fire' | 'lightning' | null }
interface EnvObject { type: 'rock' | 'bone' | 'skull' | 'web' | 'ruin' | 'crystal' | 'nest' | 'claw'; pos: V2; size: number; angle: number; variant: number }
interface Minion { id: number; pos: V2; vel: V2; hp: number; maxHp: number; hitFlash: number; atkCd: number; legPhase: number; spawnAnim: number }
interface GS {
  phase: 'playing' | 'dying' | 'player_dying' | 'victory' | 'defeat'
  player: PlayerState; boss: BossState
  projectiles: Projectile[]; bossAttack: BossAttack | null; nextAttackTimer: number
  damageNums: DamageNumber[]; particles: Particle[]; slowTraps: SlowTrap[]; zones: HazardZone[]
  attackFlash: AttackFlash | null; screenShake: number; bossDeathAnim: number; playerDeathAnim: number
  meleeHit: { timer: number; maxTimer: number; dmg: number; reach: number; arc: number; angle: number; hit: boolean; proc: boolean } | null
  lavaParticles: Particle[]; skyArrows: SkyArrow[]; envObjects: EnvObject[]
  nextProjId: number; nextDmgId: number; nextPartId: number; nextTrapId: number; nextZoneId: number
  gtime: number; bossEnraged: boolean; poisonTimer: number; playerDmgFlash: number; tooCloseFlash: number; hpBarFlash: number
  chainHits: number; chainResetTimer: number
  rageActive: boolean; rageTimer: number
  bullChargeDash: { active: boolean; vel: V2; timer: number }
  whirlwindActive: boolean; whirlwindTimer: number
  camX: number; camY: number
  webProcAnim: { timer: number; pos: V2 } | null
  bossFlightAngle: number; bossFlightSpeed: number
  bossFlightRadius: number; bossFlightCenter: V2
  griffinState: { mode: number; timer: number; dive: V2; shotT: number }
  bossFleeTimer: number
  tailWhipCd: number
  snakeTrail: Array<{x: number; y: number}>
  minions: Minion[]; nextMinionId: number
  bossDesperate: boolean; phaseBanner: { text: string; sub: string; timer: number } | null
  sigTimer: number
  mageCircle: number
  bossDmgTakenMult: number   // <1 hardens the boss (Spider stage-3 carapace)
  fx: Fx[]                   // transient ability effects
  manaShieldTimer: number    // staff W — glowing dome around the player while active
  god: boolean   // super-admin God Mode — player takes no damage
  hitstop: number            // brief simulation freeze on heavy impacts (game feel)
  bossHpDisplay: number      // lagging "chip damage" ghost of the boss HP bar
  playerHpDisplay: number    // lagging "chip damage" ghost of the player HP bar
  combo: number; comboTimer: number; maxCombo: number; totalHits: number   // hit-chain combo meter
  introTimer: number         // cinematic boss-intro overlay countdown
  comboQueue: string[]       // queued follow-up attacks for multi-hit boss combos
  dmgGate: 'both' | 'melee' | 'ranged'   // Frost Wyrm: which damage type can hurt the boss right now
  wyrmFlying: boolean        // Frost Wyrm aerial (ranged-only) vs grounded (melee-only) stance
  wyrmPhaseTimer: number     // minimum time to hold a stance before it can swap
  wyrmStagger: number        // damage dealt in the current stance; fills to force a stance swap
  wyrmStaggerMax: number     // stance-swap damage threshold (you MUST hurt it in this stance to flip it)
  wyrmWing: number           // 0 = wings folded (grounded/melee) → 1 = wings spread (airborne/ranged)
  zoom: number               // camera zoom (<1 = zoomed out for a grander scale, e.g. the Frost Wyrm)
  playerScale: number        // render scale of the hunter (smaller vs a colossal boss)
  immuneFxCd: number         // throttle for "IMMUNE" deflect feedback
  activeSlot: number         // dual-weapon loadout: 0 = melee, 1 = ranged (set by the component each frame)
  altWeapon: { name: string; color: string; melee: boolean } | null   // the stowed weapon, for the HUD swap indicator
}
interface PlayerState {
  pos: V2; vel: V2; targetPos: V2 | null
  hp: number; maxHp: number; atkTimer: number
  iframeTimer: number; dodgeTimer: number; dodgeCd: number; dodgeVel: V2; dodgeTrail: V2[]
  hitFlash: number; abilityCds: number[]; abilityReadyFlash: number[]; slowTimer: number; knockbackVel: V2
  featherCharges: number; featherRecharge: number[]
  webTrapPlaced: boolean; dodgeChargeMode: boolean; facing: number
  gearHitCount: number; webProcCd: number
  shadowDashTrail: Array<{ pos: V2; a: number }>
  walkPhase: number; moving: boolean
}
interface BossState {
  pos: V2; hp: number; maxHp: number; stunTimer: number; slowTimer: number
  reflectDmg: number; angle: number; legPhase: number; spinePulse: number; lightningPhase: number; hitFlash: number
}

/* ═══ WEAPON DEFINITIONS ═══ */
const WEAPON_DEFS: WeaponDef[] = [
  {
    id: 'sword', name: 'Starter Sword', icon: '⚔️', color: '#E74C3C', element: 'fire',
    dmg: 48, range: 100, atkCd: 0.66,
    desc: 'Aggressive melee fighter. Close the distance and unleash devastating slams, rages, and charges.',
    abilities: [
      { key: 'Q', name: 'Ground Slam', desc: 'Shockwave — 130 dmg AOE, 130px radius', cd: 6, icon: 'slam' },
      { key: 'W', name: 'Rage', desc: '+60% damage for 8s', cd: 18, icon: 'rage' },
      { key: 'E', name: 'Bull Charge', desc: 'Rush toward cursor — 150 dmg on boss impact', cd: 9, icon: 'charge' },
      { key: 'R', name: 'Whirlwind', desc: 'Spin 3s — 70 dmg/s within 100px', cd: 25, icon: 'whirl' },
    ],
  },
  {
    id: 'bow', name: 'Starter Bow', icon: '🏹', color: '#2ECC71', element: 'lightning',
    dmg: 35, range: 480, atkCd: 0.46,
    desc: 'Precision long-range archer. Rain death from afar with power shots, traps, and sky arrows.',
    abilities: [
      { key: 'Q', name: 'Power Shot', desc: 'Massive gold arrow — 120 dmg, stuns boss 0.6s', cd: 5, icon: 'powershot' },
      { key: 'W', name: 'Trap', desc: 'Snap trap at cursor — 130 dmg + 3s slow on trigger', cd: 10, icon: 'trap' },
      { key: 'E', name: 'Shadow Dash', desc: 'Dash in move direction with full invulnerability', cd: 7, icon: 'dash' },
      { key: 'R', name: 'Rain of Arrows', desc: '3 sky arrows — 80 dmg each at cursor', cd: 20, icon: 'rain' },
    ],
  },
  {
    id: 'staff', name: 'Starter Staff', icon: '🔮', color: '#9B59B6', element: 'arcane',
    dmg: 36, range: 540, atkCd: 0.62,
    desc: 'Arcane artillery. Longest range in the game with rapid, hard-hitting bolts and devastating spells. Master positioning to dominate.',
    abilities: [
      { key: 'Q', name: 'Arcane Bolt', desc: 'Fast arcane missile — 185 dmg toward cursor', cd: 5, icon: 'bolt' },
      { key: 'W', name: 'Mana Shield', desc: '2.5s bubble — blocks ALL incoming damage', cd: 14, icon: 'shield' },
      { key: 'E', name: 'Arcane Surge', desc: 'Blink toward cursor and erupt — 175 dmg nova on arrival', cd: 8, icon: 'surge' },
      { key: 'R', name: 'Meteor', desc: 'Giant meteor — 430 dmg in 110px AOE at cursor', cd: 22, icon: 'meteor' },
    ],
  },
]

/* ═══ BOSS DEFINITIONS ═══ */
const BOSS_DEFS: BossDef[] = [
  {
    id: 0, name: 'Spider Queen', color: '#8E44AD', icon: '🕷️', element: 'poison',
    lore: 'Ancient arachnid empress of the deep caverns. Her venom melts armor. Her webs trap the bravest hunters.',
    hp: 4300, size: 90, enrageAt: 0.40,
    rewards: ['spider_fang', 'venom_bow', 'web_amulet'], arenaType: 'spider',
  },
  {
    id: 1, name: 'Lava Drake', color: '#E67E22', icon: '🐉', element: 'fire',
    lore: 'Born in the molten core. Ancient and enormous. Her fire melts stone. Her claws split mountains.',
    hp: 8400, size: 115, enrageAt: 0.38,
    rewards: ['drake_sword', 'fire_staff', 'ember_armor'], arenaType: 'drake',
  },
  {
    id: 2, name: 'Storm Griffin', color: '#F1C40F', icon: '🦅', element: 'lightning',
    lore: 'Skyborn predator. Commands the storms. Every wingbeat calls lightning from dark thunderheads.',
    hp: 10200, size: 100, enrageAt: 0.30,
    rewards: ['thunder_blade', 'storm_bow', 'feather_boots'], arenaType: 'griffin',
  },
  {
    id: 3, name: 'Frost Wyrm', color: '#7fd4ff', icon: '🐲', element: 'ice',
    lore: 'An eternal frost-dragon of the frozen peaks. Grounded, its scales turn every arrow; aloft, no blade can reach it. Strike when it shows its weakness.',
    hp: 5200, size: 150, enrageAt: 0.42,
    rewards: ['wyrm_scale'], arenaType: 'wyrm',
  },
]

/* ═══ GEAR DEFINITIONS ═══ */
const GEAR_DEFS: Record<GearId, GearDef> = {
  spider_fang:   { id: 'spider_fang',   name: 'Spider Fang Daggers', icon: '🗡️', desc: 'Dual daggers — attack ~50% faster (Spider-tier upgrade)' },
  venom_bow:     { id: 'venom_bow',     name: 'Venom Bow',           icon: '🏹', desc: '+12% damage and arrows inflict 32 dmg/s poison for 5s (Spider-tier upgrade)' },
  web_amulet:    { id: 'web_amulet',    name: 'Web Armour',          icon: '🕸️', desc: 'Webbed plating — reduces incoming damage by 22%, plus 10% chance on hit to web-stun the boss 1.5s' },
  drake_sword:   { id: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️', desc: '+88% damage, 15% chance to stun boss on hit (Drake-tier upgrade)' },
  fire_staff:    { id: 'fire_staff',    name: 'Fire Staff',          icon: '🔥', desc: 'Casts 20% faster. Basics become splashing firebolts (+75% dmg, scorch the ground). Q hurls a Fireball — 120px AOE, 270 dmg (Drake-tier upgrade)' },
  ember_armor:   { id: 'ember_armor',   name: 'Ember Armour',        icon: '🛡️', desc: 'Heavy ember plate — reduces all incoming damage by 45% and grants +30 max HP' },
  thunder_blade: { id: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡', desc: '+34% damage; every 3rd hit calls a lightning strike (+150 bonus dmg) (Griffin-tier upgrade)' },
  storm_bow:     { id: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️', desc: '+34% damage; arrows are lightning bolts — 50 dmg AOE on impact (Griffin-tier upgrade)' },
  feather_boots: { id: 'feather_boots', name: 'Feather Armour',      icon: '🪶', desc: 'Feather-light — +22% move speed. No damage reduction.' },
  wyrm_scale:    { id: 'wyrm_scale',    name: 'Wyrm Scale Armour',   icon: '❄️', desc: 'Frost-forged dragon plate — reduces all incoming damage by 40% and makes you immune to slows (Wyrm-tier upgrade)' },
}
const GEAR_CATEGORY: Record<GearId, 'attack' | 'defense'> = {
  spider_fang: 'attack', venom_bow: 'attack', web_amulet: 'defense',
  drake_sword: 'attack', fire_staff: 'attack', ember_armor: 'defense',
  thunder_blade: 'attack', storm_bow: 'attack', feather_boots: 'defense',
  wyrm_scale: 'defense',
}

/* ═══ WEAPON SELECT (base weapons + unlocked weapon rewards) ═══ */
interface LoadoutWeapon { id: string; base: WeaponId; gear: GearId | null; unlock: GearId | null; name: string; icon: string; color: string; sub: string }
const LOADOUT_WEAPONS: LoadoutWeapon[] = [
  { id: 'sword',         base: 'sword', gear: null,            unlock: null,            name: 'Starter Sword',       icon: '⚔️', color: '#E74C3C', sub: 'Melee • balanced' },
  { id: 'bow',           base: 'bow',   gear: null,            unlock: null,            name: 'Starter Bow',         icon: '🏹', color: '#2ECC71', sub: 'Ranged • precise' },
  { id: 'staff',         base: 'staff', gear: null,            unlock: null,            name: 'Starter Staff',       icon: '🔮', color: '#9B59B6', sub: 'Ranged • arcane' },
  { id: 'spider_fang',   base: 'sword', gear: 'spider_fang',   unlock: 'spider_fang',   name: 'Spider Fang Daggers', icon: '🗡️', color: '#8E44AD', sub: 'Melee • +40% attack speed' },
  { id: 'venom_bow',     base: 'bow',   gear: 'venom_bow',     unlock: 'venom_bow',     name: 'Venom Bow',           icon: '🏹', color: '#8E44AD', sub: 'Ranged • poison DoT' },
  { id: 'drake_sword',   base: 'sword', gear: 'drake_sword',   unlock: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️', color: '#E67E22', sub: 'Melee • +35% dmg, stun' },
  { id: 'fire_staff',    base: 'staff', gear: 'fire_staff',    unlock: 'fire_staff',    name: 'Fire Staff',          icon: '🔥', color: '#E67E22', sub: 'Ranged • splash firebolts + fireball Q' },
  { id: 'thunder_blade', base: 'sword', gear: 'thunder_blade', unlock: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡', color: '#F1C40F', sub: 'Melee • lightning every 3rd hit' },
  { id: 'storm_bow',     base: 'bow',   gear: 'storm_bow',     unlock: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️', color: '#F1C40F', sub: 'Ranged • AOE lightning bolts' },
]
// PIECE_2_START

/* ═══ INITIAL STATE ═══ */
function generateEnvObjects(bossId: BossId): EnvObject[] {
  const objs: EnvObject[] = []
  const typesByBoss: Array<EnvObject['type'][]> = [
    ['bone','skull','web','rock','nest','claw'],
    ['rock','crystal','bone','ruin'],
    ['rock','ruin','bone','claw'],
    ['crystal','rock','ruin','crystal'],
  ]
  const types = typesByBoss[bossId]
  for (let i = 0; i < 50; i++) {
    const seed = i * 137 + bossId * 1013
    const angle = (seed % 628) / 100
    const radius = 320 + (seed % 650)
    const cx = WW / 2 + Math.cos(angle) * radius + (seed % 200 - 100)
    const cy = WH / 2 + Math.sin(angle) * radius + ((seed * 7) % 200 - 100)
    const pos = v(clamp(cx, 120, WW - 120), clamp(cy, 120, WH - 120))
    if (dist(pos, v(WW / 2, 350)) < 220) continue
    if (dist(pos, v(WW / 2, WH - 250)) < 180) continue
    objs.push({ type: types[i % types.length], pos, size: 18 + (seed % 38), angle: (seed % 314) / 100, variant: i % 3 })
  }
  return objs
}

function mkState(wpn: WeaponDef, boss: BossDef, gear: GearId[]): GS {
  void gear
  const featherMode = false   // armours no longer grant dash charges; all dodges share one cooldown
  const sx = WW / 2, sy = WH - 250
  // weapon-path durability: melee tankiest, bow balanced, magic glass cannon
  let baseHp = wpn.id === 'sword' ? 180 : wpn.id === 'staff' ? 150 : 150
  if (gear.includes('ember_armor')) baseHp += 30   // ember plate also grants bonus HP (buff)
  return {
    phase: 'playing',
    player: {
      pos: v(sx, sy), vel: v(0, 0), targetPos: null,
      hp: baseHp, maxHp: baseHp, atkTimer: 0,
      iframeTimer: 0, dodgeTimer: 0, dodgeCd: 0, dodgeVel: v(0, 0), dodgeTrail: [],
      hitFlash: 0, abilityCds: [0, 0, 0, 0], abilityReadyFlash: [0, 0, 0, 0], slowTimer: 0, knockbackVel: v(0, 0),
      featherCharges: featherMode ? 3 : 1, featherRecharge: featherMode ? [0, 0, 0] : [0],
      webTrapPlaced: false, dodgeChargeMode: featherMode, facing: -Math.PI / 2,
      gearHitCount: 0, webProcCd: 0, shadowDashTrail: [],
      walkPhase: 0, moving: false,
    },
    boss: {
      pos: v(WW / 2, 350), hp: boss.hp, maxHp: boss.hp,
      stunTimer: 0, slowTimer: 0, reflectDmg: 0,
      angle: Math.PI / 2, legPhase: 0, spinePulse: 0, lightningPhase: 0, hitFlash: 0,
    },
    projectiles: [], bossAttack: null, nextAttackTimer: 3.5,
    damageNums: [], particles: [], slowTraps: [], zones: [],
    attackFlash: null, screenShake: 0, bossDeathAnim: 0, playerDeathAnim: 0, meleeHit: null,
    lavaParticles: [], skyArrows: [], envObjects: generateEnvObjects(boss.id),
    nextProjId: 0, nextDmgId: 0, nextPartId: 0, nextTrapId: 0, nextZoneId: 0,
    gtime: 0, bossEnraged: false, poisonTimer: 0, playerDmgFlash: 0, tooCloseFlash: 0, hpBarFlash: 0,
    chainHits: 0, chainResetTimer: 0,
    rageActive: false, rageTimer: 0,
    bullChargeDash: { active: false, vel: v(0, 0), timer: 0 },
    whirlwindActive: false, whirlwindTimer: 0,
    camX: clamp(sx - CW / 2, 0, WW - CW), camY: clamp(sy - CH / 2, 0, WH - CH),
    webProcAnim: null,
    bossFlightAngle: boss.id === 1 ? Math.PI * 0.75 : boss.id === 2 ? Math.PI * 0.25 : 0,
    bossFlightSpeed: boss.id === 2 ? 0.52 : 0,
    bossFlightRadius: boss.id === 2 ? 240 : 0,
    bossFlightCenter: v(WW / 2, WH / 2 - 80),
    bossFleeTimer: 0,
    tailWhipCd: 0,
    snakeTrail: [],
    minions: [], nextMinionId: 0,
    bossDesperate: false, phaseBanner: null,
    sigTimer: 0,
    mageCircle: 0,
    bossDmgTakenMult: 1,
    fx: [],
    manaShieldTimer: 0,
    god: false,
    hitstop: 0,
    bossHpDisplay: boss.hp, playerHpDisplay: baseHp,
    combo: 0, comboTimer: 0, maxCombo: 0, totalHits: 0,
    introTimer: 2.6,
    comboQueue: [],
    dmgGate: boss.id === 3 ? 'melee' : 'both',   // Wyrm opens grounded (melee-only); others always take all damage
    wyrmFlying: false, wyrmPhaseTimer: 2.5, wyrmStagger: 0, wyrmStaggerMax: boss.id === 3 ? boss.hp * 0.15 : 0, wyrmWing: 0,
    zoom: boss.id === 3 ? 0.78 : 1.0, playerScale: boss.id === 3 ? 0.82 : 1.0, immuneFxCd: 0,
    activeSlot: 0, altWeapon: null,
    griffinState: { mode: 0, timer: 3.0, dive: v(1, 0), shotT: 0 },
  }
}

/* ═══ HELPERS ═══ */
let _pid = 0
function spawnParticles(g: GS, pos: V2, count: number, color: string, speed = 120, life = 0.5) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = rnd(speed * 0.4, speed)
    g.particles.push({ id: ++_pid, pos: { ...pos }, vel: v(Math.cos(a) * spd, Math.sin(a) * spd), life, maxLife: life, color, size: rnd(2, 5.5) })
  }
  g.nextPartId = _pid
}

function dealDmgToPlayer(g: GS, dmg: number, wpn: WeaponDef, gear: GearId[], knockDir?: V2) {
  const p = g.player
  if (g.god) return // God Mode — invincible
  if (g.manaShieldTimer > 0) { Sfx.shieldHit(); return } // Mana Shield — blocks ALL damage while up
  if (p.iframeTimer > 0) return
  let fd = dmg
  if (g.rageActive) fd = Math.round(fd * 1.2)
  // weapon-path defense: melee tanky, bow neutral, magic glass cannon (takes extra)
  if (wpn.id === 'sword') fd = Math.round(fd * 0.80)
  else if (wpn.id === 'staff') fd = Math.round(fd * 1.05)
  if (gear.includes('ember_armor')) fd = Math.round(fd * 0.55)       // heavy ember plate — best mitigation (buffed)
  else if (gear.includes('wyrm_scale')) fd = Math.round(fd * 0.60)   // frost dragon plate — heavy mitigation
  else if (gear.includes('web_amulet')) fd = Math.round(fd * 0.78)   // webbing — light mitigation
  // feather: NO damage reduction — its perk is pure speed
  p.hp = Math.max(0, p.hp - fd)
  p.hitFlash = 0.45; p.iframeTimer = 0.5
  g.playerDmgFlash = 0.9
  g.hpBarFlash = 0.6   // flashes the player HP bar so the hit is unmistakable
  if (knockDir && wpn.id !== 'sword') p.knockbackVel = v(knockDir.x * 160, knockDir.y * 160)
  spawnParticles(g, p.pos, 16, '#FF4444', 160)
  Sfx.hurt(); if (gear.includes('ember_armor')) Sfx.emberSizzle()
  g.screenShake = Math.max(g.screenShake, 0.5)
  g.hitstop = Math.max(g.hitstop, fd >= 22 ? 0.07 : 0.035)   // a beat of freeze sells every hit
  g.combo = 0   // taking a hit breaks the player's offensive chain
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-20, 20), y: p.pos.y - 20 }, val: Math.round(fd), life: 1.2, maxLife: 1.2, isPlayer: true, vx: rnd(-14, 14) })
  if (p.hp <= 0) killPlayer(g)
}

function spawnZone(g: GS, pos: V2, type: HazardZone['type'], radius: number, dps: number, life: number) {
  g.zones.push({ id: ++g.nextZoneId, pos: { ...pos }, radius, type, dps, life, maxLife: life })
}

function spawnFx(g: GS, type: Fx['type'], pos: V2, color: string, radius: number, dur: number, rot = 0) {
  g.fx.push({ id: ++g.nextZoneId, type, pos: { ...pos }, timer: dur, maxTimer: dur, color, radius, rot })
}

function explodeFireball(g: GS, pos: V2) {
  spawnZone(g, { ...pos }, 'fire', 66, 13, 2.2)
  spawnParticles(g, pos, 18, '#FF5500', 230); spawnParticles(g, pos, 8, '#FFCC33', 150)
  g.screenShake = Math.max(g.screenShake, 0.35)
}

function killPlayer(g: GS) {
  if (g.phase !== 'playing') return
  g.phase = 'player_dying'
  g.playerDeathAnim = 2.6
  g.bossAttack = null
  g.screenShake = 1.4
  spawnParticles(g, g.player.pos, 46, '#E74C3C', 380, 1.3)
  spawnParticles(g, g.player.pos, 20, '#FFFFFF', 480, 0.9)
  spawnParticles(g, g.player.pos, 14, '#8B0000', 200, 1.6)
  Sfx.playerDeath(); Sfx.roar()
}

// the Frost Wyrm deflects the wrong damage type for its current stance — show feedback, deal nothing
function bossImmune(g: GS, src: 'melee' | 'ranged') {
  const b = g.boss
  b.hitFlash = Math.max(b.hitFlash, 0.05)
  if (g.immuneFxCd > 0) return
  g.immuneFxCd = 0.5
  const col = g.dmgGate === 'melee' ? '#7fd4ff' : '#cfe9ff'
  spawnParticles(g, b.pos, 7, col, 130)
  spawnFx(g, 'nova', { ...b.pos }, col, 36, 0.22)
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: b.pos.x + rnd(-20, 20), y: b.pos.y - 54 }, val: 0, life: 0.9, maxLife: 0.9, isPlayer: false, vx: rnd(-12, 12), text: src === 'melee' ? 'TOO HIGH!' : 'IMMUNE' })
  Sfx.shieldHit()
}

function dealDmgToBoss(g: GS, baseDmg: number, gear: GearId[], src: 'melee' | 'ranged' = 'ranged') {
  const b = g.boss, p = g.player
  // Frost Wyrm damage-type gate: grounded = melee only, airborne = ranged/mage only
  if (g.dmgGate === 'melee' && src !== 'melee') { bossImmune(g, src); return }
  if (g.dmgGate === 'ranged' && src !== 'ranged') { bossImmune(g, src); return }
  let dmg = baseDmg
  let crit = false
  // drake_sword's damage bonus lives in the basic-hit multiplier now; here it only stuns
  if (gear.includes('drake_sword') && Math.random() < 0.15) b.stunTimer = Math.max(b.stunTimer, 1.5)
  if (g.rageActive) dmg = Math.round(dmg * 1.6)
  if (gear.includes('thunder_blade')) {
    p.gearHitCount++
    g.chainResetTimer = CHAIN_HIT_RESET
    if (p.gearHitCount % 3 === 0) {
      dmg += 150
      spawnParticles(g, b.pos, 14, '#F1C40F', 260)
      g.screenShake = Math.max(g.screenShake, 0.45)
      Sfx.crit(); crit = true
    }
  }
  if (gear.includes('web_amulet') && p.webProcCd <= 0 && Math.random() < 0.10) {
    b.stunTimer = Math.max(b.stunTimer, 1.5)
    p.webProcCd = 4.0
    g.webProcAnim = { timer: 0.9, pos: { ...b.pos } }
    spawnParticles(g, b.pos, 18, '#8E44AD', 160)
  }
  if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 5.0
  dmg = Math.round(dmg * g.bossDmgTakenMult)
  if (baseDmg >= 110) crit = true   // heavy ability strikes register as crits
  b.hp = Math.max(0, b.hp - dmg)
  if (g.dmgGate !== 'both') g.wyrmStagger += dmg   // Wyrm: hurting it in this stance forces it to swap
  b.hitFlash = crit ? 0.18 : 0.12
  Sfx.bossHit()
  // ── combo meter: every connected hit extends the chain ──
  g.combo++; g.comboTimer = 2.0; g.totalHits++
  if (g.combo > g.maxCombo) g.maxCombo = g.combo
  // ── damage number (crits pop bigger + gold) ──
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: b.pos.x + rnd(-26, 26), y: b.pos.y - 46 }, val: Math.round(dmg), life: crit ? 1.2 : 0.95, maxLife: crit ? 1.2 : 0.95, isPlayer: false, crit, vx: rnd(-16, 16) })
  // ── impact spark at the contact edge, facing away from the player ──
  const hitDir = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
  const hitPos = v(b.pos.x - hitDir.x * 26, b.pos.y - hitDir.y * 26)
  spawnFx(g, 'star', hitPos, crit ? '#FFE08A' : '#FFFFFF', crit ? 34 : 18, crit ? 0.30 : 0.18, Math.atan2(hitDir.y, hitDir.x))
  spawnParticles(g, hitPos, crit ? 8 : 4, crit ? '#FFD24A' : '#FFFFFF', crit ? 150 : 90)
  if (crit) { spawnFx(g, 'nova', hitPos, '#FFD24A', 40, 0.24); g.hitstop = Math.max(g.hitstop, 0.055); g.screenShake = Math.max(g.screenShake, 0.3) }
}

const MINION_CAP = 7
function spawnSpiderlings(g: GS, count: number) {
  const b = g.boss
  for (let i = 0; i < count; i++) {
    if (g.minions.length >= MINION_CAP) break
    const a = rnd(0, Math.PI * 2), d = rnd(30, 70)
    g.minions.push({
      id: ++g.nextMinionId,
      pos: v(clamp(b.pos.x + Math.cos(a) * d, 40, WW - 40), clamp(b.pos.y + Math.sin(a) * d, 40, WH - 40)),
      vel: v(0, 0), hp: 55, maxHp: 55, hitFlash: 0, atkCd: rnd(0.3, 0.9), legPhase: rnd(0, 6.28), spawnAnim: 0.45,
    })
    spawnParticles(g, g.minions[g.minions.length - 1].pos, 8, '#8E44AD', 130, 0.5)
  }
  Sfx.summon()
}
function fireFeatherVolley(g: GS, count: number, speed: number, dmg: number, phaseOffset: number) {
  const b = g.boss
  for (let i = 0; i < count; i++) {
    const a = phaseOffset + (i / count) * Math.PI * 2
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * speed, Math.sin(a) * speed), dmg, radius: 8, fromBoss: true, life: 4.0, color: '#cfe9ff', isFeather: true, trail: [] })
  }
  spawnParticles(g, b.pos, 10, '#9fc0ff', 150, 0.4)
  Sfx.gust()
}
function dealDmgToMinion(g: GS, m: Minion, dmg: number) {
  m.hp = Math.max(0, m.hp - dmg); m.hitFlash = 0.12
  Sfx.bossHit()
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: m.pos.x + rnd(-10, 10), y: m.pos.y - 16 }, val: Math.round(dmg), life: 0.8, maxLife: 0.8, isPlayer: false, vx: rnd(-10, 10) })
  if (m.hp <= 0) { spawnParticles(g, m.pos, 14, '#8E44AD', 180, 0.6); Sfx.minionDeath() }
}

/* ═══ BOSS AI ═══ */
/* ── ATTACK PACING & COMBOS — keeps the boss constantly pressuring with dodgeable, telegraphed chains ── */
const CHANNELED = new Set(['thunderstorm', 'chain_lightning', 'lightning_barrage', 'lava_barrage', 'flame_wave', 'fire_breath', 'web_spiral', 'fire_sweep', 'storm_rings', 'frost_breath'])
const COMBOS: Record<number, string[][]> = {
  0: [['venom_spit', 'web_spray'], ['leg_sweep', 'venom_spit'], ['spider_charge', 'web_burst'], ['web_shot', 'web_shot', 'venom_spit'], ['summon', 'venom_geyser'], ['web_spray', 'spider_leap'], ['venom_spit', 'venom_spit', 'web_burst']],
  1: [['fireball', 'tail_slam'], ['stomp', 'fire_fan'], ['fire_line', 'fireball'], ['ember_barrage', 'lava_puddle'], ['fire_fan', 'stomp'], ['tail_swipe', 'ember_barrage'], ['fireball', 'fire_fan', 'tail_slam']],
  2: [['wind_blade', 'lightning_strike'], ['gale_ring', 'dive_bomb'], ['lightning_strike', 'wind_blade'], ['wind_buffet', 'wind_blade'], ['wind_blade', 'wind_blade', 'dive_bomb'], ['talon_dive', 'gale_ring']],
  3: [],   // Frost Wyrm gets variety from its ground/flight phase mechanic instead of combos
}
// gap until the next attack: snappy inside a combo, brisk between fresh attacks (scales with phase)
// Griffin gets longer gaps + fewer combos because its flight state-machine (swoops/barrage) already pressures.
function attackGap(g: GS, bossId: BossId): number {
  if (g.comboQueue.length) return rnd(0.28, 0.5)
  const phase = g.bossDesperate ? 1.95 : g.bossEnraged ? 1.5 : 1.0
  const base = bossId === 1 ? rnd(1.5, 2.45) : bossId === 2 ? rnd(2.0, 3.2) : bossId === 3 ? rnd(1.35, 2.25) : rnd(1.15, 2.0)
  return base / phase
}
function comboChance(g: GS, bossId: BossId): number {
  if (bossId === 3) return 0
  const c = g.bossDesperate ? 0.72 : g.bossEnraged ? 0.5 : 0.32
  return bossId === 2 ? c * 0.3 : c
}

function selectBossAttack(bossId: BossId, enraged: boolean, desperate: boolean, d2p: number, flying = false): string {
  if (bossId === 3) {
    // ── FROST WYRM — different pool per stance (grounded = melee-only, airborne = ranged-only) ──
    if (flying) {
      const pool = ['ice_shards', 'frost_nova', 'icicle_rain', 'glacier_dive', 'ice_shards']
      if (enraged) pool.push('frost_nova', 'icicle_rain')
      if (desperate) pool.push('frost_nova', 'glacier_dive', 'ice_shards')
      return pool[rndI(0, pool.length - 1)]
    }
    const pool = ['frost_breath', 'frost_stomp', 'frost_bite', 'tail_frost', 'frost_bite']
    if (enraged) pool.push('frost_stomp', 'frost_breath')
    if (desperate) pool.push('frost_bite', 'frost_stomp', 'tail_frost', 'frost_breath')
    return pool[rndI(0, pool.length - 1)]
  }
  if (bossId === 0) {
    // ── SPIDER QUEEN — escalating stages ──
    const pool = d2p < 150 ? ['leg_sweep', 'venom_spit', 'web_spray', 'toxic_cloud', 'summon', 'web_wall'] : ['venom_spit', 'toxic_cloud', 'web_spray', 'web_shot', 'leg_sweep', 'summon', 'web_wall', 'spider_charge']
    if (enraged) pool.push('spider_leap', 'venom_burst', 'web_spray', 'summon', 'spider_charge', 'web_burst', 'venom_geyser', 'web_spiral')   // stage 2 unlocks burst patterns
    if (desperate) pool.push('web_burst', 'venom_geyser', 'spider_leap', 'venom_burst', 'summon', 'web_spiral')   // stage 3: the lair turns lethal
    return pool[rndI(0, pool.length - 1)]
  }
  if (bossId === 1) {
    // ── LAVA DRAKE — escalating stages ──
    const pool = d2p < 150 ? ['stomp', 'tail_swipe', 'tail_slam', 'fire_breath', 'fire_line', 'fireball'] : ['fire_breath', 'flame_wave', 'fire_line', 'stomp', 'fireball', 'tail_slam', 'lava_puddle', 'lava_barrage']
    if (enraged) pool.push('ember_barrage', 'fireball', 'lava_puddle', 'magma_geyser', 'fire_fan', 'lava_barrage', 'fire_sweep')   // stage 2 unlocks eruptions
    if (desperate) pool.push('magma_geyser', 'fire_fan', 'flame_wave', 'fireball', 'ember_barrage', 'lava_barrage', 'fire_sweep')   // stage 3: relentless fire
    return pool[rndI(0, pool.length - 1)]
  }
  // ── STORM GRIFFIN — escalating stages ──
  const pool = d2p < 160 ? ['talon_dive', 'wind_buffet', 'dive_bomb', 'lightning_strike', 'lightning_barrage'] : ['lightning_strike', 'chain_lightning', 'wind_blade', 'lightning_barrage', 'dive_bomb', 'wind_buffet', 'static_field']
  if (enraged) pool.push('thunderstorm', 'wind_blade', 'chain_lightning', 'gale_ring', 'thunder_cross', 'storm_rings')   // stage 2 unlocks storm patterns
  if (desperate) pool.push('gale_ring', 'thunder_cross', 'thunderstorm', 'lightning_barrage', 'wind_blade', 'storm_rings')   // stage 3: the full tempest
  return pool[rndI(0, pool.length - 1)]
}

function startBossAttack(g: GS, bossId: BossId, type: string) {
  const p = g.player, b = g.boss
  const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
  const telegraphs: Record<string, number> = {
    venom_spit: 0.95, web_shot: 0.95, web_spray: 0.95, leg_sweep: 1.0, spider_leap: 1.15, toxic_cloud: 0.95, venom_burst: 1.2, summon: 1.05, web_wall: 1.15, spider_charge: 1.0, web_burst: 1.0, venom_geyser: 1.2,
    fire_breath: 1.2, stomp: 0.95, tail_swipe: 0.95, ember_barrage: 0.95, flame_wave: 1.05, lava_puddle: 0.95, fire_line: 1.5, lava_barrage: 1.0,
    fireball: 1.05, tail_slam: 1.0, magma_geyser: 1.2, fire_fan: 1.0, gale_ring: 1.05, thunder_cross: 1.35,
    lightning_strike: 1.05, talon_dive: 1.0, wind_buffet: 0.95, thunderstorm: 1.0, static_field: 0.95, chain_lightning: 1.0, lightning_barrage: 0.95,
    wind_blade: 1.0, dive_bomb: 1.05,
    web_spiral: 1.0, fire_sweep: 1.1, storm_rings: 1.0,
    frost_breath: 1.2, frost_stomp: 1.1, frost_bite: 1.0, tail_frost: 1.0, ice_shards: 0.95, frost_nova: 1.1, icicle_rain: 1.15, glacier_dive: 1.2,
  }
  const data: AttackData = { targetPos: { ...p.pos }, angle, dmg: 0 }
  if (type === 'venom_spit') { data.dmg = 10; data.count = 3; data.projSpeed = 260 }
  else if (type === 'web_shot') { data.dmg = 8; data.projSpeed = 160 }
  else if (type === 'leg_sweep') { data.dmg = 20; data.coneAngle = Math.PI; data.coneRange = 160; data.angle = angle }
  else if (type === 'spider_leap') { data.dmg = 30; data.radius = 130 }
  else if (type === 'toxic_cloud') { data.dmg = 0; data.count = 3 }
  else if (type === 'venom_burst') { data.dmg = 32; data.radius = 180 }
  else if (type === 'summon') { data.count = g.bossDesperate ? 4 : 3 }
  else if (type === 'fire_breath') { data.dmg = 20; data.coneAngle = 48 * Math.PI / 180; data.coneRange = 290; data.angle = angle; data.duration = 2.2; data.elapsed = 0 }
  else if (type === 'stomp') { data.dmg = 29; data.radius = 0; data.duration = 1.2 }
  else if (type === 'tail_swipe') { data.dmg = 29; data.coneAngle = 270 * Math.PI / 180; data.coneRange = 185; data.angle = angle + Math.PI }
  else if (type === 'ember_barrage') { data.dmg = 11; data.count = 8; data.projSpeed = 345 }
  else if (type === 'flame_wave') { data.dmg = 21; data.coneAngle = 58 * Math.PI / 180; data.coneRange = 340; data.angle = angle; data.duration = 1.6; data.elapsed = 0 }
  else if (type === 'lava_puddle') { data.dmg = 0; data.count = 3 }
  else if (type === 'lightning_strike') { data.dmg = 32; data.radius = 75 }
  else if (type === 'talon_dive') { data.dmg = 35; data.angle = angle; data.projSpeed = 440 }
  else if (type === 'wind_buffet') { data.dmg = 16; data.coneAngle = 80 * Math.PI / 180; data.coneRange = 230; data.angle = angle }
  else if (type === 'thunderstorm') { data.dmg = 25; data.count = 8; data.strikeIndex = 0 }
  else if (type === 'static_field') { data.dmg = 0; data.count = 2 }
  else if (type === 'chain_lightning') { data.dmg = 22; data.count = 6; data.strikeIndex = 0 }
  else if (type === 'web_spray') { data.dmg = 9; data.count = 7; data.projSpeed = 195; data.angle = angle }
  else if (type === 'fire_line') { data.dmg = 19; data.angle = b.angle + Math.PI / 2 }
  else if (type === 'lightning_barrage') { data.dmg = 30; data.count = 8; data.strikeIndex = 0; data.elapsed = 0 }
  else if (type === 'fireball') { data.dmg = 18; data.count = g.bossEnraged ? 4 : 3; data.projSpeed = 320; data.angle = angle }
  else if (type === 'tail_slam') { data.dmg = 36; data.radius = 215; data.targetPos = { ...b.pos } }
  else if (type === 'wind_blade') { data.dmg = 12; data.count = g.bossEnraged ? 6 : 5; data.projSpeed = 330; data.angle = angle }
  else if (type === 'dive_bomb') { data.dmg = 36; data.radius = 130 }
  else if (type === 'web_wall') { data.dmg = 0; data.angle = b.angle + Math.PI / 2 }
  else if (type === 'spider_charge') { data.dmg = 26; data.angle = angle }
  else if (type === 'magma_geyser') { data.dmg = 27; data.radius = 122; data.targetPos = { ...p.pos } }
  else if (type === 'fire_fan') { data.dmg = 17; data.count = g.bossEnraged ? 9 : 6; data.projSpeed = 285; data.angle = angle }
  else if (type === 'gale_ring') { data.dmg = 12; data.count = g.bossEnraged ? 14 : 11; data.projSpeed = 250 }
  else if (type === 'thunder_cross') { data.dmg = 24; data.angle = angle }
  else if (type === 'web_burst') { data.dmg = 9; data.count = g.bossEnraged ? 14 : 11; data.projSpeed = 205 }
  else if (type === 'venom_geyser') { data.dmg = 0; data.radius = 120; data.targetPos = { ...p.pos } }
  else if (type === 'lava_barrage') { data.dmg = 22; data.count = g.bossEnraged ? 12 : 9; data.strikeIndex = 0; data.elapsed = 0 }
  // ── NEW "keep-moving" channelled patterns ──
  else if (type === 'web_spiral') { data.dmg = 9; data.duration = g.bossDesperate ? 1.8 : 1.4; data.elapsed = 0; data.strikeIndex = 0; data.angle = rnd(0, Math.PI * 2) }
  else if (type === 'fire_sweep') { const dir = Math.random() < 0.5 ? 1 : -1; data.dmg = 17; data.coneAngle = 44 * Math.PI / 180; data.coneRange = 330; data.duration = 2.2; data.elapsed = 0; data.count = dir; data.angle = angle - dir * 1.45 }
  else if (type === 'storm_rings') { data.dmg = 11; data.count = 3; data.strikeIndex = 0; data.elapsed = 0 }
  // ── FROST WYRM attacks ──
  else if (type === 'frost_breath') { data.dmg = 15; data.coneAngle = 56 * Math.PI / 180; data.coneRange = 380; data.angle = angle; data.duration = 2.2; data.elapsed = 0 }
  else if (type === 'frost_stomp') { data.dmg = 22; data.radius = 192; data.count = g.bossEnraged ? 16 : 13; data.targetPos = { ...b.pos }; data.projSpeed = 245 }
  else if (type === 'frost_bite') { data.dmg = 24; data.angle = angle }
  else if (type === 'tail_frost') { data.dmg = 25; data.coneAngle = 285 * Math.PI / 180; data.coneRange = 235; data.angle = angle + Math.PI }
  else if (type === 'ice_shards') { data.dmg = 11; data.count = g.bossEnraged ? 9 : 7; data.projSpeed = 300; data.angle = angle }
  else if (type === 'frost_nova') { data.dmg = 9; data.count = g.bossEnraged ? 18 : 14; data.projSpeed = 250 }
  else if (type === 'icicle_rain') { data.dmg = 0; data.count = g.bossEnraged ? 7 : 5 }
  else if (type === 'glacier_dive') { data.dmg = 28; data.radius = 154; data.targetPos = { ...p.pos } }
  g.bossAttack = { type, telegraphTime: telegraphs[type] ?? 1.0, elapsed: 0, active: false, data }
  // ── telegraph: audio warning + charge-up burst (readability/fairness) ──
  const BIG_ATTACKS = ['spider_leap', 'venom_burst', 'fire_line', 'flame_wave', 'fire_breath', 'lava_puddle', 'lightning_barrage', 'lava_barrage', 'thunderstorm', 'meteor', 'talon_dive', 'fireball', 'tail_slam', 'dive_bomb', 'spider_charge', 'magma_geyser', 'thunder_cross', 'gale_ring', 'venom_geyser', 'web_burst', 'web_spiral', 'fire_sweep', 'storm_rings', 'frost_breath', 'frost_stomp', 'frost_bite', 'frost_nova', 'icicle_rain', 'glacier_dive']
  if (BIG_ATTACKS.includes(type)) Sfx.warnBig(); else Sfx.warn()
  const chargeCol = bossId === 0 ? '#B370E0' : bossId === 1 ? '#FF7A1A' : '#5fe6ff'
  // Drake gathers its fire at the snout during the wind-up
  const chargeAt = bossId === 1
    ? v(b.pos.x + Math.cos(b.angle) * BOSS_DEFS[1].size * 0.58, b.pos.y + Math.sin(b.angle) * BOSS_DEFS[1].size * 0.58)
    : b.pos
  spawnParticles(g, chargeAt, BIG_ATTACKS.includes(type) ? 16 : 9, chargeCol, 70, (telegraphs[type] ?? 1.0) * 0.7)
}

function resolveBossAttack(g: GS, bossId: BossId, wpn: WeaponDef, gear: GearId[]) {
  const atk = g.bossAttack!, p = g.player, b = g.boss
  const type = atk.type, d = atk.data
  const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
  // Drake fires from its snout, not its body centre — anchor projectiles/embers at the mouth tip
  const muzzle = bossId === 1
    ? v(b.pos.x + Math.cos(b.angle) * BOSS_DEFS[1].size * 0.58, b.pos.y + Math.sin(b.angle) * BOSS_DEFS[1].size * 0.58)
    : b.pos

  if (type === 'venom_spit' || type === 'ember_barrage' || type === 'ice_shards') {
    const count = d.count ?? 3
    const baseAngle = Math.atan2(p.pos.y - muzzle.y, p.pos.x - muzzle.x)
    const ice = type === 'ice_shards'
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.28
      const a = baseAngle + spread
      const color = type === 'venom_spit' ? '#8E44AD' : ice ? '#9fe8ff' : '#E67E22'
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...muzzle }, vel: v(Math.cos(a) * (d.projSpeed ?? 250), Math.sin(a) * (d.projSpeed ?? 250)), dmg: d.dmg ?? 22, radius: ice ? 11 : 9, fromBoss: true, life: 5.0, color, isIce: ice, trail: ice ? [] : undefined })
    }
    if (type === 'ember_barrage') spawnParticles(g, muzzle, 14, '#FF7700', 150)
    if (ice) { spawnParticles(g, b.pos, 16, '#cfe9ff', 200); spawnParticles(g, b.pos, 8, '#FFFFFF', 130, 0.4); Sfx.shot() }
  } else if (type === 'frost_nova') {
    // Frost Wyrm: a sweeping double-ring blizzard of icicles — thread the shifting gaps
    const count = d.count ?? 14, sp = d.projSpeed ?? 250, off = g.gtime
    for (let i = 0; i < count; i++) { const a = off + i / count * Math.PI * 2
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * sp, Math.sin(a) * sp), dmg: d.dmg ?? 10, radius: 10, fromBoss: true, life: 5.0, color: '#9fe8ff', isIce: true, trail: [] }) }
    const inner = Math.round(count * 0.65)
    for (let i = 0; i < inner; i++) { const a = off + Math.PI / count + i / inner * Math.PI * 2
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * sp * 0.62, Math.sin(a) * sp * 0.62), dmg: d.dmg ?? 10, radius: 9, fromBoss: true, life: 5.0, color: '#bfe9f7', isIce: true, trail: [] }) }
    spawnParticles(g, b.pos, 30, '#cfe9ff', 260); spawnParticles(g, b.pos, 16, '#FFFFFF', 170)
    spawnFx(g, 'shock', { ...b.pos }, '#7fd4ff', 130, 0.4); g.screenShake = Math.max(g.screenShake, 0.5); Sfx.shot()
  } else if (type === 'frost_stomp') {
    // Frost Wyrm: a huge frost shockwave that flings a ring of ice shards + freezes the rim
    const r = d.radius ?? 210
    if (dist(p.pos, b.pos) <= r) { dealDmgToPlayer(g, d.dmg ?? 24, wpn, gear, toPlayer); p.slowTimer = Math.max(p.slowTimer, 2.2) }
    const count = d.count ?? 13
    for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2 + g.gtime
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 245), Math.sin(a) * (d.projSpeed ?? 245)), dmg: Math.round((d.dmg ?? 24) * 0.5), radius: 9, fromBoss: true, life: 4.2, color: '#9fe8ff', isIce: true, trail: [] }) }
    // a ring of frozen ground at the shockwave's edge (cosmetic + slow)
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * r * 0.8, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * r * 0.8, 80, WH - 80)), 'ice', 56, 0, 2.0) }
    spawnParticles(g, b.pos, 44, '#cfe9ff', 340); spawnParticles(g, b.pos, 18, '#FFFFFF', 220)
    spawnFx(g, 'shock', { ...b.pos }, '#7fd4ff', r, 0.55); spawnFx(g, 'nova', { ...b.pos }, '#e8f7ff', r * 0.5, 0.3); g.screenShake = Math.max(g.screenShake, 0.85); Sfx.slam()
  } else if (type === 'icicle_rain') {
    // Frost Wyrm: a heavy scatter of crashing ice patches around the player — keep moving
    for (let i = 0; i < (d.count ?? 5); i++) {
      const tx = clamp(p.pos.x + rnd(-260, 260), 90, WW - 90), ty = clamp(p.pos.y + rnd(-260, 260), 90, WH - 90)
      spawnZone(g, v(tx, ty), 'ice', 76, 13, 4.0)
      spawnParticles(g, v(tx, ty), 18, '#9fe8ff', 240, 0.8); spawnParticles(g, v(tx, ty), 8, '#FFFFFF', 150, 0.5)
      spawnFx(g, 'star', v(tx, ty), '#cfeeff', 34, 0.3, rnd(0, 6.28))
    }
    g.screenShake = Math.max(g.screenShake, 0.5); Sfx.slam()
  } else if (type === 'web_shot') {
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(toPlayer.x * (d.projSpeed ?? 160), toPlayer.y * (d.projSpeed ?? 160)), dmg: d.dmg ?? 16, radius: 11, fromBoss: true, life: 6.0, color: '#8E44AD' })
    Sfx.webShot()
  } else if (type === 'fireball') {
    // Drake: slow aimed fireballs that explode into a lingering fire pool on impact
    const count = d.count ?? 2, baseA = d.angle ?? Math.atan2(p.pos.y - muzzle.y, p.pos.x - muzzle.x)
    for (let i = 0; i < count; i++) {
      const a = baseA + (i - (count - 1) / 2) * 0.16
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...muzzle }, vel: v(Math.cos(a) * (d.projSpeed ?? 235), Math.sin(a) * (d.projSpeed ?? 235)), dmg: d.dmg ?? 22, radius: 14, fromBoss: true, life: 3.2, color: '#FF6600', isFireball: true, aoe: 70, trail: [] })
    }
    spawnParticles(g, muzzle, 12, '#FF7700', 150)
  } else if (type === 'wind_blade') {
    // Griffin: a fan of fast crescent wind blades — sidestep the gaps
    const count = d.count ?? 5, baseA = d.angle ?? Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const a = baseA + (i - (count - 1) / 2) * 0.20
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 330), Math.sin(a) * (d.projSpeed ?? 330)), dmg: d.dmg ?? 16, radius: 9, fromBoss: true, life: 4.0, color: '#bfe4ff', isFeather: true, trail: [] })
    }
    Sfx.gust()
  } else if (type === 'tail_slam') {
    // Drake: heavy radial slam around her body — knockback + scattered embers
    const r = d.radius ?? 200
    if (dist(p.pos, b.pos) <= r) { dealDmgToPlayer(g, d.dmg ?? 34, wpn, gear, toPlayer); p.knockbackVel = v(toPlayer.x * 300, toPlayer.y * 300) }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * r * 0.7, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * r * 0.7, 80, WH - 80)), 'fire', 50, 12, 2.5) }
    spawnParticles(g, b.pos, 30, '#FF6600', 320); g.screenShake = Math.max(g.screenShake, 0.8)
  } else if (type === 'dive_bomb' || type === 'glacier_dive') {
    // a targeted crashing strike — walk out of the marked zone
    const target = d.targetPos!, r = d.radius ?? 130, ice = type === 'glacier_dive'
    if (dist(p.pos, target) <= r) { dealDmgToPlayer(g, d.dmg ?? 36, wpn, gear, norm(v(p.pos.x - target.x, p.pos.y - target.y))); if (ice) p.slowTimer = Math.max(p.slowTimer, 2.4) }
    spawnParticles(g, target, ice ? 40 : 26, ice ? '#9fe8ff' : '#5fe6ff', ice ? 340 : 280)
    if (ice) {
      spawnParticles(g, target, 16, '#FFFFFF', 220); spawnZone(g, { ...target }, 'ice', 96, 12, 3.2)
      // a ring of ice shards bursts out from the impact
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.projectiles.push({ id: ++g.nextProjId, pos: { ...target }, vel: v(Math.cos(a) * 230, Math.sin(a) * 230), dmg: Math.round((d.dmg ?? 30) * 0.4), radius: 9, fromBoss: true, life: 3.4, color: '#9fe8ff', isIce: true, trail: [] }) }
      spawnFx(g, 'shock', { ...target }, '#7fd4ff', r, 0.55); spawnFx(g, 'nova', { ...target }, '#e8f7ff', r * 0.6, 0.32)
    }
    g.screenShake = Math.max(g.screenShake, ice ? 0.8 : 0.55); Sfx.slam()
  } else if (type === 'magma_geyser') {
    // Drake: a ring of lava geysers erupts around the player — sprint to the centre or out of the band
    const target = d.targetPos!, r = d.radius ?? 122
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, zx = clamp(target.x + Math.cos(a) * r, 80, WW - 80), zy = clamp(target.y + Math.sin(a) * r, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'fire', 50, 16, 2.6); spawnParticles(g, v(zx, zy), 9, '#FF6600', 220, 0.8) }
    g.screenShake = Math.max(g.screenShake, 0.6); Sfx.explosion()
  } else if (type === 'fire_fan') {
    // Drake: a wide sweeping fan of slow exploding fireballs
    const count = d.count ?? 5, baseA = d.angle ?? Math.atan2(p.pos.y - muzzle.y, p.pos.x - muzzle.x)
    for (let i = 0; i < count; i++) { const a = baseA + (i - (count - 1) / 2) * 0.27
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...muzzle }, vel: v(Math.cos(a) * (d.projSpeed ?? 215), Math.sin(a) * (d.projSpeed ?? 215)), dmg: d.dmg ?? 22, radius: 13, fromBoss: true, life: 3.4, color: '#FF6600', isFireball: true, aoe: 60, trail: [] }) }
    spawnParticles(g, muzzle, 14, '#FF7700', 170); Sfx.fireball()
  } else if (type === 'gale_ring') {
    // Griffin: a full-circle burst of wind blades — thread the gaps
    fireFeatherVolley(g, d.count ?? 11, d.projSpeed ?? 250, d.dmg ?? 16, g.gtime)
    fireFeatherVolley(g, Math.round((d.count ?? 11) / 2), (d.projSpeed ?? 250) * 0.7, d.dmg ?? 16, g.gtime + 0.3)   // inner slower ring
    g.screenShake = Math.max(g.screenShake, 0.45)
  } else if (type === 'thunder_cross') {
    // Griffin: a crackling cross of lightning carves the arena
    const a0 = d.angle ?? 0
    for (const la of [a0, a0 + Math.PI / 2]) for (let i = 0; i < 14; i++) { const t2 = (i / 13) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(la) * 760 * t2, 80, WW - 80), zy = clamp(b.pos.y + Math.sin(la) * 760 * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'lightning', 52, 18, 3.0); if (i % 3 === 0) spawnParticles(g, v(zx, zy), 4, '#00EEFF', 150, 0.5) }
    g.screenShake = Math.max(g.screenShake, 0.7); Sfx.explosion()
  } else if (type === 'web_burst') {
    // Spider: a full-circle spray of sticky web bolts — thread the gaps or get rooted
    const count = d.count ?? 11, sp = d.projSpeed ?? 205, off = g.gtime
    for (let i = 0; i < count; i++) { const a = off + i / count * Math.PI * 2
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * sp, Math.sin(a) * sp), dmg: d.dmg ?? 12, radius: 11, fromBoss: true, life: 5.0, color: '#8E44AD', isWeb: true }) }
    spawnParticles(g, b.pos, 16, '#8E44AD', 170); g.screenShake = Math.max(g.screenShake, 0.4); Sfx.summon()
  } else if (type === 'venom_geyser') {
    // Spider: a ring of venom geysers erupts around the player — flee to the centre or out of the band
    const target = d.targetPos!, r = d.radius ?? 120
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, zx = clamp(target.x + Math.cos(a) * r, 80, WW - 80), zy = clamp(target.y + Math.sin(a) * r, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'poison', 50, 13, 3.0); spawnParticles(g, v(zx, zy), 9, '#8E44AD', 200, 0.8) }
    g.screenShake = Math.max(g.screenShake, 0.55)
  } else if (type === 'web_wall') {
    // Spider: weaves a wall of sticky web across the arena — slows and chips on contact
    const lineAngle = d.angle ?? 0, lineLen = 760, lineCount = 16
    for (let i = 0; i < lineCount; i++) {
      const t2 = (i / (lineCount - 1)) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(lineAngle) * lineLen * t2, 80, WW - 80)
      const zy = clamp(b.pos.y + Math.sin(lineAngle) * lineLen * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'web', 50, 8, 4.5)
      if (i % 3 === 0) spawnParticles(g, v(zx, zy), 4, '#8E44AD', 90, 0.6)
    }
  } else if (type === 'spider_charge' || type === 'frost_bite') {
    // a fast lunge along a lane — sidestep out of the path
    const ice = type === 'frost_bite'
    const a = d.angle ?? 0, dirL = v(Math.cos(a), Math.sin(a)), lunge = ice ? 340 : 300, sz = BOSS_DEFS[bossId].size
    const rel = v(p.pos.x - b.pos.x, p.pos.y - b.pos.y)
    const along = rel.x * dirL.x + rel.y * dirL.y
    const perpSigned = -rel.x * dirL.y + rel.y * dirL.x
    if (along > -30 && along < lunge + sz && Math.abs(perpSigned) < sz + 26) {
      const sgn = perpSigned >= 0 ? 1 : -1
      const pushDir = norm(v(-dirL.y * sgn, dirL.x * sgn))
      dealDmgToPlayer(g, d.dmg ?? 30, wpn, gear, pushDir)
      if (wpn.id !== 'sword') p.knockbackVel = v(pushDir.x * 280, pushDir.y * 280)
    }
    const startX = b.pos.x, startY = b.pos.y
    b.pos.x = clamp(b.pos.x + dirL.x * lunge, 90, WW - 90); b.pos.y = clamp(b.pos.y + dirL.y * lunge, 90, WH - 90)
    if (ice) {
      for (let k = 1; k <= 5; k++) { const px = clamp(startX + dirL.x * lunge * (k / 5), 80, WW - 80), py = clamp(startY + dirL.y * lunge * (k / 5), 80, WH - 80)
        spawnZone(g, v(px, py), 'ice', 56, 0, 2.0); spawnParticles(g, v(px, py), 6, '#9fe8ff', 160, 0.5) }   // freezing wake (cosmetic)
      spawnParticles(g, b.pos, 30, '#cfe9ff', 300); spawnParticles(g, b.pos, 12, '#FFFFFF', 200); spawnFx(g, 'shock', { ...b.pos }, '#7fd4ff', 120, 0.45); Sfx.slam()
    } else spawnParticles(g, b.pos, 18, '#8E44AD', 240)
    g.screenShake = Math.max(g.screenShake, ice ? 0.6 : 0.5)
  } else if (type === 'leg_sweep' || type === 'tail_swipe' || type === 'wind_buffet' || type === 'tail_frost') {
    const angle = d.angle ?? 0, halfCone = (d.coneAngle ?? Math.PI) / 2, range = d.coneRange ?? 150
    if (dist(p.pos, b.pos) <= range) {
      const pAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let diff = Math.abs(pAngle - angle); while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2)
      if (diff <= halfCone) {
        dealDmgToPlayer(g, d.dmg ?? 22, wpn, gear, type === 'wind_buffet' ? toPlayer : undefined)
        if (type === 'wind_buffet' && wpn.id !== 'sword') p.knockbackVel = v(toPlayer.x * 240, toPlayer.y * 240)
        if (type === 'tail_frost') p.slowTimer = Math.max(p.slowTimer, 1.8)
      }
    }
    // tail_frost: a wide arc of ice spray + scattered shards across the swept cone
    if (type === 'tail_frost') {
      for (let k = 0; k < 22; k++) { const a = angle + rnd(-halfCone, halfCone), dd2 = rnd(40, range)
        spawnParticles(g, v(b.pos.x + Math.cos(a) * dd2, b.pos.y + Math.sin(a) * dd2), 1, ['#9fe8ff', '#cfe9ff', '#FFFFFF'][rndI(0, 2)], 70, 0.5) }
      for (let i = 0; i < 5; i++) { const a = angle + (i / 4 - 0.5) * halfCone * 1.6
        g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * 240, Math.sin(a) * 240), dmg: Math.round((d.dmg ?? 26) * 0.45), radius: 9, fromBoss: true, life: 3.2, color: '#9fe8ff', isIce: true, trail: [] }) }
      spawnFx(g, 'shock', { ...b.pos }, '#7fd4ff', range * 0.7, 0.4); g.screenShake = Math.max(g.screenShake, 0.5); Sfx.slam()
    }
  } else if (type === 'toxic_cloud') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = clamp(b.pos.x + rnd(-300, 300), 100, WW - 100), ty = clamp(b.pos.y + rnd(-250, 250), 100, WH - 100)
      spawnZone(g, v(tx, ty), 'poison', 65, 12, 6.0)
      spawnParticles(g, v(tx, ty), 12, '#8E44AD', 90, 0.9)
    }
  } else if (type === 'summon') {
    spawnSpiderlings(g, d.count ?? 3)
    g.screenShake = Math.max(g.screenShake, 0.3)
  } else if (type === 'venom_burst') {
    const r = d.radius ?? 180
    if (dist(p.pos, b.pos) <= r) { dealDmgToPlayer(g, d.dmg ?? 38, wpn, gear, toPlayer); p.slowTimer = 2.5 }
    spawnParticles(g, b.pos, 35, '#8E44AD', 300); g.screenShake = Math.max(g.screenShake, 0.8)
  } else if (type === 'lava_puddle') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = clamp(p.pos.x + rnd(-200, 200), 100, WW - 100), ty = clamp(p.pos.y + rnd(-200, 200), 100, WH - 100)
      spawnZone(g, v(tx, ty), 'fire', 75, 16, 5.5)
      spawnParticles(g, v(tx, ty), 16, '#FF4500', 110, 0.65)
    }
    g.screenShake = Math.max(g.screenShake, 0.35)
  } else if (type === 'static_field') {
    for (let i = 0; i < (d.count ?? 2); i++) {
      const off = v(rnd(-90, 90), rnd(-90, 90))
      spawnZone(g, v(p.pos.x + off.x, p.pos.y + off.y), 'lightning', 60, 18, 4.0)
      spawnParticles(g, v(p.pos.x + off.x, p.pos.y + off.y), 14, '#F1C40F', 170)
    }
  } else if (type === 'spider_leap' || type === 'lightning_strike') {
    const target = d.targetPos!, r = d.radius ?? 120
    if (dist(p.pos, target) <= r) dealDmgToPlayer(g, d.dmg ?? 32, wpn, gear, norm(v(p.pos.x - target.x, p.pos.y - target.y)))
    spawnParticles(g, target, 24, bossId === 0 ? '#8E44AD' : '#F1C40F', 220)
    g.screenShake = Math.max(g.screenShake, 0.6)
    if (bossId === 0) b.pos = { x: clamp(target.x, 90, WW - 90), y: clamp(target.y, 90, WH - 90) }
  } else if (type === 'stomp') {
    if (dist(p.pos, b.pos) <= 155) dealDmgToPlayer(g, d.dmg ?? 28, wpn, gear, toPlayer)
    g.screenShake = Math.max(g.screenShake, 0.7); spawnParticles(g, b.pos, 28, '#E67E22', 260)
  } else if (type === 'talon_dive') {
    const target = { ...d.targetPos! }
    b.pos = { x: clamp(target.x, 90, WW - 90), y: clamp(target.y, 90, WH - 90) }
    if (dist(p.pos, b.pos) < 90) dealDmgToPlayer(g, d.dmg ?? 35, wpn, gear, toPlayer)
    spawnParticles(g, b.pos, 18, '#F1C40F', 220); g.screenShake = Math.max(g.screenShake, 0.45)
  } else if (type === 'web_spray') {
    const count = d.count ?? 7, baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * 0.38
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 195), Math.sin(a) * (d.projSpeed ?? 195)), dmg: d.dmg ?? 12, radius: 12, fromBoss: true, life: 5.5, color: '#8E44AD', isWeb: true })
    }
    spawnParticles(g, b.pos, 14, '#8E44AD', 160); Sfx.webShot()
  } else if (type === 'fire_line') {
    const lineAngle = d.angle ?? 0, lineLen = 820
    const lineCount = 18
    for (let i = 0; i < lineCount; i++) {
      const t2 = (i / (lineCount - 1)) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(lineAngle) * lineLen * t2, 80, WW - 80)
      const zy = clamp(b.pos.y + Math.sin(lineAngle) * lineLen * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'fire', 52, d.dmg ?? 22, 3.5)
      if (i % 3 === 0) spawnParticles(g, v(zx, zy), 5, '#FF4500', 110, 0.55)
    }
    g.screenShake = Math.max(g.screenShake, 0.75)
  }
}

/* ═══ TICK ═══ */
function tick(g: GS, dt: number, wpn: WeaponDef, bossId: BossId, gear: GearId[], mousePos: V2, keys: Set<string>, abilityTarget: V2, pendingAbility: number | null) {
  void keys; void mousePos
  if (g.phase !== 'playing' && g.phase !== 'dying' && g.phase !== 'player_dying') return
  const p = g.player, b = g.boss, bossDef = BOSS_DEFS[bossId]
  const wTheme = weaponTheme(getWeaponId(wpn, gear))

  if (g.phase === 'player_dying') {
    g.gtime += dt; g.playerDeathAnim -= dt; g.screenShake = Math.max(0, g.screenShake - dt * 0.8)
    // rising soul embers drifting up from the fallen hunter
    if (Math.random() < dt * 24) {
      const ox = rnd(-22, 22)
      spawnParticles(g, v(p.pos.x + ox, p.pos.y + rnd(-10, 10)), 1, ['#E74C3C', '#8B0000', '#FFFFFF', '#C0392B'][rndI(0, 3)], rnd(20, 90), rnd(0.8, 1.8))
    }
    g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt - 16 * dt; pt.vel.x *= Math.pow(0.2, dt); pt.vel.y *= Math.pow(0.2, dt); return pt.life > 0 })
    g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 30 * dt; d2.pos.x += (d2.vx ?? 0) * dt; if (d2.vx) d2.vx *= Math.pow(0.05, dt); return d2.life > 0 })
    if (g.playerDeathAnim <= 0) g.phase = 'defeat'
    return
  }

  if (g.phase === 'dying') {
    g.gtime += dt; g.bossDeathAnim -= dt; g.screenShake = Math.max(0, g.screenShake - dt * 1.5)
    const intensity = 1 - Math.max(0, g.bossDeathAnim / 3.0)
    if (Math.random() < dt * (20 + intensity * 50)) {
      const ox = rnd(-110, 110), oy = rnd(-110, 110)
      const colors = ['#F1C40F', '#FFFFFF', bossDef.color, '#FF4500']
      spawnParticles(g, v(b.pos.x + ox, b.pos.y + oy), rndI(10, 20), colors[rndI(0, colors.length - 1)], rnd(200, 500), rnd(0.4, 1.6))
    }
    if (Math.random() < dt * 5) g.screenShake = Math.max(g.screenShake, rnd(0.5, 1.2))
    g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; pt.vel.x *= Math.pow(0.15, dt); pt.vel.y *= Math.pow(0.15, dt); return pt.life > 0 })
    g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 30 * dt; d2.pos.x += (d2.vx ?? 0) * dt; if (d2.vx) d2.vx *= Math.pow(0.05, dt); return d2.life > 0 })
    if (g.bossDeathAnim <= 0) g.phase = 'victory'
    return
  }

  g.gtime += dt

  // Camera smooth follow
  const viewW = CW / g.zoom, viewH = CH / g.zoom   // zoom < 1 shows more of the arena
  const tcx = clamp(p.pos.x - viewW / 2, 0, Math.max(0, WW - viewW)), tcy = clamp(p.pos.y - viewH / 2, 0, Math.max(0, WH - viewH))
  g.camX += (tcx - g.camX) * Math.min(1, dt * 8)
  g.camY += (tcy - g.camY) * Math.min(1, dt * 8)

  // Timers
  p.atkTimer = Math.max(0, p.atkTimer - dt); p.iframeTimer = Math.max(0, p.iframeTimer - dt)
  p.dodgeCd = Math.max(0, p.dodgeCd - dt); p.hitFlash = Math.max(0, p.hitFlash - dt)
  p.slowTimer = Math.max(0, p.slowTimer - dt); p.webProcCd = Math.max(0, p.webProcCd - dt)
  if (gear.includes('wyrm_scale')) p.slowTimer = 0   // frost plate — immune to slows
  b.stunTimer = Math.max(0, b.stunTimer - dt); b.slowTimer = Math.max(0, b.slowTimer - dt)
  b.hitFlash = Math.max(0, b.hitFlash - dt)
  b.legPhase += dt * (b.stunTimer > 0 ? 0.5 : g.bossEnraged ? 3.8 : 2.4)
  b.spinePulse += dt * 2.2; b.lightningPhase += dt * 4.5
  g.screenShake = Math.max(0, g.screenShake - dt * 3); g.nextAttackTimer = Math.max(0, g.nextAttackTimer - dt)
  g.playerDmgFlash = Math.max(0, g.playerDmgFlash - dt * 2.8)
  g.hpBarFlash = Math.max(0, g.hpBarFlash - dt * 2.2)
  g.tooCloseFlash = Math.max(0, g.tooCloseFlash - dt * 2.0)
  g.mageCircle = Math.max(0, g.mageCircle - dt)
  g.manaShieldTimer = Math.max(0, g.manaShieldTimer - dt)
  g.immuneFxCd = Math.max(0, g.immuneFxCd - dt)
  if (bossId === 3) g.wyrmWing += ((g.wyrmFlying ? 1 : 0) - g.wyrmWing) * Math.min(1, dt * 3.2)   // unfurl/fold wings on stance change
  g.fx = g.fx.filter(f => { f.timer -= dt; return f.timer > 0 })
  if (p.hp > 0 && p.hp / p.maxHp < 0.25) Sfx.heartbeat()   // critical-HP heartbeat (throttled)
  if (g.rageTimer > 0) { g.rageTimer = Math.max(0, g.rageTimer - dt); if (g.rageTimer <= 0) g.rageActive = false }
  if (g.poisonTimer > 0) { g.poisonTimer = Math.max(0, g.poisonTimer - dt); if (g.dmgGate !== 'melee') b.hp = Math.max(0, b.hp - 32 * dt) }
  if (g.chainResetTimer > 0) { g.chainResetTimer = Math.max(0, g.chainResetTimer - dt); if (g.chainResetTimer <= 0) g.chainHits = 0 }
  if (g.bossFleeTimer > 0) g.bossFleeTimer = Math.max(0, g.bossFleeTimer - dt)
  if (g.webProcAnim) { g.webProcAnim.timer -= dt; if (g.webProcAnim.timer <= 0) g.webProcAnim = null }
  for (let i = 0; i < p.abilityCds.length; i++) {
    const was = p.abilityCds[i]
    p.abilityCds[i] = Math.max(0, was - dt)
    if (was > 0 && p.abilityCds[i] <= 0) { p.abilityReadyFlash[i] = 0.55; Sfx.uiClick() }   // ability ready feedback
    p.abilityReadyFlash[i] = Math.max(0, p.abilityReadyFlash[i] - dt)
  }
  // combo meter decay — let the chain lapse if you stop connecting hits
  if (g.comboTimer > 0) { g.comboTimer = Math.max(0, g.comboTimer - dt); if (g.comboTimer <= 0) g.combo = 0 }
  // chip-damage bars ease toward the true values for that satisfying delayed drain
  g.bossHpDisplay += (b.hp - g.bossHpDisplay) * Math.min(1, dt * 3.2)
  if (b.hp > g.bossHpDisplay) g.bossHpDisplay = b.hp
  g.playerHpDisplay += (p.hp - g.playerHpDisplay) * Math.min(1, dt * 3.2)
  if (p.hp > g.playerHpDisplay) g.playerHpDisplay = p.hp
  if (g.introTimer > 0) g.introTimer = Math.max(0, g.introTimer - dt)

  // Shadow dash trail fade
  p.shadowDashTrail = p.shadowDashTrail.filter(t => { t.a -= dt * 3; return t.a > 0 })

  // Sky arrows
  g.skyArrows = g.skyArrows.filter(arrow => {
    if (arrow.hit) return false
    arrow.warnTimer -= dt
    if (arrow.warnTimer <= 0) {
      if (dist(b.pos, arrow.targetPos) < bossDef.size + 60) dealDmgToBoss(g, arrow.dmg, gear)
      g.minions.forEach(m => { if (m.hp > 0 && dist(m.pos, arrow.targetPos) < 80) dealDmgToMinion(g, m, arrow.dmg) })
      if (arrow.kind === 'meteor') {
        // huge fiery impact — shockwave, scattered lava, burning crater
        spawnParticles(g, arrow.targetPos, 34, '#FF4500', 360, 0.9); spawnParticles(g, arrow.targetPos, 16, '#FFD24A', 230)
        spawnParticles(g, arrow.targetPos, 10, '#5a4a44', 90, 1.5)   // smoke
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; spawnParticles(g, v(arrow.targetPos.x + Math.cos(a) * 50, arrow.targetPos.y + Math.sin(a) * 50), 2, '#FF6A1A', 240, 0.7) }
        spawnZone(g, arrow.targetPos, 'fire', 78, 16, 2.8)
        spawnFx(g, 'shock', arrow.targetPos, '#FF6A1A', 150, 0.55); spawnFx(g, 'nova', arrow.targetPos, '#FFD24A', 110, 0.35)
        g.screenShake = Math.max(g.screenShake, 1.0); Sfx.meteorImpact()
      } else {
        const ac = arrow.col ?? '#F1C40F'
        spawnParticles(g, arrow.targetPos, 20, ac, 260, 0.75); g.screenShake = Math.max(g.screenShake, 0.4)
        spawnFx(g, 'shock', arrow.targetPos, ac, 80, 0.4); spawnFx(g, 'star', arrow.targetPos, ac, 30, 0.3)
        if (arrow.zone) spawnZone(g, { ...arrow.targetPos }, arrow.zone, 50, 0, 1.4)
      }
      arrow.hit = true; return false
    }
    return true
  })

  // Feather boots recharge
  if (p.dodgeChargeMode) {
    for (let i = 0; i < p.featherRecharge.length; i++) {
      if (p.featherCharges < 3 && p.featherRecharge[i] > 0) {
        p.featherRecharge[i] = Math.max(0, p.featherRecharge[i] - dt)
        if (p.featherRecharge[i] <= 0 && p.featherCharges < 3) p.featherCharges++
      }
    }
  }

  // Dodge roll
  if (p.dodgeTimer > 0) {
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt)
    p.pos.x += p.dodgeVel.x * dt; p.pos.y += p.dodgeVel.y * dt
    p.pos.x = clamp(p.pos.x, 20, WW - 20); p.pos.y = clamp(p.pos.y, 20, WH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, p.dodgeTimer)
    p.dodgeTrail.push({ ...p.pos }); if (p.dodgeTrail.length > 6) p.dodgeTrail.shift()
  } else { p.dodgeTrail = []; p.webTrapPlaced = false }

  // Bull charge
  if (g.bullChargeDash.active) {
    g.bullChargeDash.timer = Math.max(0, g.bullChargeDash.timer - dt)
    p.pos.x += g.bullChargeDash.vel.x * dt; p.pos.y += g.bullChargeDash.vel.y * dt
    p.pos.x = clamp(p.pos.x, 20, WW - 20); p.pos.y = clamp(p.pos.y, 20, WH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, g.bullChargeDash.timer)
    spawnParticles(g, p.pos, 2, wTheme.particle, 70, 0.3)   // themed charge trail (fire / venom / spark)
    if (dist(p.pos, b.pos) < bossDef.size + 22) {
      dealDmgToBoss(g, 150, gear, 'melee'); g.screenShake = Math.max(g.screenShake, 0.6)
      themedBurst(g, b.pos, wTheme, 150, true)
      Sfx.chargeHit(); famSfx(wTheme, 'impact')
      g.bullChargeDash.active = false
    }
    if (g.bullChargeDash.timer <= 0) g.bullChargeDash.active = false
  }

  // Whirlwind
  if (g.whirlwindActive) {
    g.whirlwindTimer -= dt; p.iframeTimer = Math.max(p.iframeTimer, 0.1)
    Sfx.whirl()   // looping swish (throttled internally)
    if (g.whirlwindTimer <= 0) { g.whirlwindActive = false }
    else { spawnParticles(g, p.pos, 1, wTheme.accent, 150, 0.3)   // themed vortex motes
      if (dist(p.pos, b.pos) < 110 && g.dmgGate !== 'ranged') { b.hp = Math.max(0, b.hp - 70 * dt); spawnParticles(g, b.pos, 2, wTheme.particle, 100) }
      g.minions.forEach(m => { if (m.hp > 0 && dist(p.pos, m.pos) < 110) { m.hp = Math.max(0, m.hp - 90 * dt); if (m.hp <= 0) { spawnParticles(g, m.pos, 12, '#8E44AD', 170); Sfx.minionDeath() } } }) }
  }

  // Player movement
  const speedMult = (p.slowTimer > 0 ? 0.45 : 1) * (wpn.id === 'staff' ? 1.15 : 1) * (gear.includes('feather_boots') ? 1.22 : 1)   // mages kite a bit; feather armour = pure speed
  const speed = 170 * speedMult
  p.moving = false
  if (!p.dodgeTimer && !g.bullChargeDash.active && !g.whirlwindActive && p.targetPos) {
    const d2t = dist(p.pos, p.targetPos)
    if (d2t > 4) {
      const dir = norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
      const ms = speed * dt
      p.pos.x = clamp(p.pos.x + dir.x * Math.min(ms, d2t), 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * Math.min(ms, d2t), 20, WH - 20)
      p.moving = true; p.walkPhase += dt * 14
    } else { p.targetPos = null }
  }
  if (p.dodgeTimer > 0 || g.bullChargeDash.active) { p.moving = true; p.walkPhase += dt * 20 }

  // Knockback
  if (Math.hypot(p.knockbackVel.x, p.knockbackVel.y) > 1) {
    p.pos.x = clamp(p.pos.x + p.knockbackVel.x * dt, 20, WW - 20)
    p.pos.y = clamp(p.pos.y + p.knockbackVel.y * dt, 20, WH - 20)
    p.knockbackVel.x *= Math.pow(0.04, dt); p.knockbackVel.y *= Math.pow(0.04, dt)
  }

  // Boss collision push
  const minBd = bossDef.size + 20
  if (dist(p.pos, b.pos) < minBd) {
    const push = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
    p.pos.x = b.pos.x + push.x * minBd; p.pos.y = b.pos.y + push.y * minBd
  }

  // Facing
  if (p.targetPos) p.facing = Math.atan2(p.targetPos.y - p.pos.y, p.targetPos.x - p.pos.x)
  else p.facing = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x)

  // Auto-attack — weapon rules: ranged needs spacing, melee reach varies by weapon
  const dToBoss = dist(p.pos, b.pos)
  const wid = getWeaponId(wpn, gear)
  const isRangedAtk = wpn.id !== 'sword' && !gear.includes('spider_fang')
  // melee reach per weapon: dagger short, sword balanced, greatsword long+wide, thunder mid
  const meleeReach = wid === 'dagger' ? 70 : wid === 'greatsword' ? 160 : wid === 'thunder_sword' ? 108 : 100
  const meleeArc = wid === 'greatsword' ? 2.0 : wid === 'dagger' ? 1.2 : 1.6   // swing cone half-width *2
  const weaponReach = isRangedAtk ? wpn.range : meleeReach
  // target the nearest threat: boss by default, or a closer spiderling if one is swarming
  let tgtMinion: Minion | null = null, tgtDist = dToBoss
  for (const m of g.minions) { if (m.hp <= 0) continue; const dm = dist(p.pos, m.pos); if (dm < tgtDist) { tgtDist = dm; tgtMinion = m } }
  const tgtPos = tgtMinion ? tgtMinion.pos : b.pos
  const tgtSize = tgtMinion ? 16 : bossDef.size
  const atkRange = weaponReach + tgtSize
  // ranged weapons cannot fire at point-blank — must keep a gap beyond the boss body (not vs small minions)
  const minRange = (isRangedAtk && !tgtMinion) ? bossDef.size + 72 : 0
  let atkCd = wpn.atkCd
  if (gear.includes('spider_fang')) atkCd *= 0.66   // Spider Fang — fast dual daggers
  if (gear.includes('fire_staff')) atkCd *= 0.80    // Fire Staff channels flame faster than the arcane staff
  // ── weapon-tier basic-damage multiplier (the backbone of progression: Starter < Spider < Drake < Griffin) ──
  // Starter = base weapon dmg (1.0). Each upgrade weapon scales its basic hit by its tier multiplier.
  // (fire_staff scales via its firebolt boltDmg below; spider_fang scales via attack speed above.)
  const gearDmgMult = gear.includes('drake_sword') ? 1.88
    : gear.includes('thunder_blade') ? 1.34
    : gear.includes('storm_bow') ? 1.34
    : gear.includes('venom_bow') ? 1.12
    : 1.0
  const basicDmg = Math.round(wpn.dmg * gearDmgMult)
  const flashColor = gear.includes('fire_staff') ? '#FF4500' : gear.includes('venom_bow') ? '#8E44AD' : gear.includes('storm_bow') ? '#7DFFB0' : wpn.color
  if (p.atkTimer <= 0 && !p.dodgeTimer && !g.bullChargeDash.active) {
    if (isRangedAtk && !tgtMinion && dToBoss < minRange && dToBoss <= atkRange) {
      // too close to fire — flash a warning and nudge a soft "miss" click
      g.tooCloseFlash = 0.55; Sfx.tooClose(); p.atkTimer = 0.18
    } else if (tgtDist <= atkRange && tgtDist >= minRange) {
      p.atkTimer = atkCd
      const atkAngle = Math.atan2(tgtPos.y - p.pos.y, tgtPos.x - p.pos.x)
      const flashType = wid === 'greatsword' ? 'greatslash' : (wid === 'dagger' || wid === 'sword' || wid === 'thunder_sword') ? 'slash' : isRangedAtk ? 'shot' : 'slam'
      const flashDur = wid === 'greatsword' ? 0.34 : wid === 'sword' ? 0.28 : wid === 'thunder_sword' ? 0.24 : 0.22
      g.attackFlash = { angle: atkAngle, timer: flashDur, maxTimer: flashDur, type: flashType, color: flashColor }
      if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 5.0
      if (isRangedAtk) {
        const dir = v(Math.cos(atkAngle), Math.sin(atkAngle))
        const isStorm = gear.includes('storm_bow')
        const isVenom = gear.includes('venom_bow')
        const isFireStaff = gear.includes('fire_staff')
        const isFirebolt = isFireStaff
        const isArcane = wpn.id === 'staff' && !isFireStaff
        const projColor = isFireStaff ? '#FF6A1A' : wpn.id === 'staff' ? '#9B59B6' : isVenom ? '#9B59B6' : isStorm ? '#7DFFB0' : '#27AE60'
        const isArrow = wpn.id === 'bow' && !isStorm && !isVenom
        const projSpeed = wpn.id === 'staff' ? (isFireStaff ? 500 : 420) : 440
        // Fire Staff bolts hit harder, fly faster and burst with a splash (vs the plain arcane bolt)
        const boltDmg = isFirebolt ? Math.round(basicDmg * 1.75) : basicDmg
        g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * projSpeed, dir.y * projSpeed), dmg: boltDmg, radius: isFirebolt ? 8.5 : isArcane ? 8 : 6, fromBoss: false, life: 4.0, color: projColor, aoe: isStorm ? 40 : isFirebolt ? 52 : undefined, isLightning: isStorm, isVenom, isArrow, isArcane, isFirebolt, trail: [] })
        if (wpn.id === 'staff') g.mageCircle = Math.max(g.mageCircle, 0.4)
        if (isFireStaff) Sfx.firebolt(); else if (wpn.id === 'staff') Sfx.cast(); else Sfx.shot()
      } else {
        // melee: damage is deferred — it only lands when the blade sweeps through the target (see meleeHit)
        g.meleeHit = { timer: flashDur, maxTimer: flashDur, dmg: basicDmg, reach: meleeReach, arc: meleeArc, angle: atkAngle, hit: false, proc: gear.includes('thunder_blade') && (p.gearHitCount % 3) === 2 }
        Sfx.swing()
      }
    }
  }

  // Melee contact — damage lands only when the swinging blade actually touches the target
  if (g.meleeHit) {
    const mh = g.meleeHit
    mh.timer = Math.max(0, mh.timer - dt)
    const sp = 1 - mh.timer / mh.maxTimer
    if (!mh.hit && sp >= 0.28 && sp <= 0.74) {
      const reaches = (pos: V2, size: number) => {
        if (dist(p.pos, pos) > mh.reach + size) return false
        let da = Math.abs(Math.atan2(pos.y - p.pos.y, pos.x - p.pos.x) - mh.angle)
        while (da > Math.PI) da = Math.abs(da - Math.PI * 2)
        return da <= mh.arc / 2
      }
      let landed = false
      if (reaches(b.pos, bossDef.size)) {
        dealDmgToBoss(g, mh.dmg, gear, 'melee')
        spawnParticles(g, v(p.pos.x + Math.cos(mh.angle) * mh.reach * 0.6, p.pos.y + Math.sin(mh.angle) * mh.reach * 0.6), 6, '#FFFFFF', 110)
        landed = true
      }
      for (const m of g.minions) { if (m.hp > 0 && reaches(m.pos, 16)) { dealDmgToMinion(g, m, mh.dmg); landed = true } }
      if (landed) mh.hit = true
    }
    if (mh.timer <= 0) g.meleeHit = null
  }

  // Ability activation
  if (pendingAbility !== null && pendingAbility >= 0 && pendingAbility < 4) {
    const idx = pendingAbility, abDef = wpn.abilities[idx]
    if (p.abilityCds[idx] <= 0) { p.abilityCds[idx] = abDef.cd; activateAbility(g, idx, wpn, gear, abilityTarget, bossId) }
  }

  // Boss movement
  if (g.bossFlightSpeed > 0 && b.stunTimer <= 0) {
    // ── STORM GRIFFIN — aerial predator: orbit, telegraphed swoop dives, and a hovering lightning barrage ──
    const gs = g.griffinState
    // orbit centre drifts slowly toward the player (loose, so it keeps its distance)
    const trackRate = Math.min(1, dt * 1.1)
    g.bossFlightCenter.x += (p.pos.x - g.bossFlightCenter.x) * trackRate
    g.bossFlightCenter.y += (p.pos.y - g.bossFlightCenter.y) * trackRate
    g.bossFlightCenter.x = clamp(g.bossFlightCenter.x, 150, WW - 150)
    g.bossFlightCenter.y = clamp(g.bossFlightCenter.y, 130, WH - 130)
    gs.timer -= dt
    if (gs.mode === 2) {
      // SWOOP DIVE — a committed dash along the PRE-LOCKED line (just step off it)
      const spd = g.bossEnraged ? 520 : 440
      b.pos.x = clamp(b.pos.x + gs.dive.x * spd * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + gs.dive.y * spd * dt, 80, WH - 80)
      if (dist(b.pos, p.pos) < bossDef.size + 14 && p.iframeTimer <= 0) { dealDmgToPlayer(g, g.bossEnraged ? 15 : 11, wpn, gear, gs.dive); spawnParticles(g, p.pos, 12, '#5fe6ff', 240) }
      if (gs.timer <= 0) { gs.mode = 0; gs.timer = rnd(3.4, 5.0) / (g.bossDesperate ? 1.4 : g.bossEnraged ? 1.2 : 1.0); g.bossFlightAngle = Math.atan2(b.pos.y - g.bossFlightCenter.y, b.pos.x - g.bossFlightCenter.x) }
    } else if (gs.mode === 1) {
      // WIND-UP — the dive line is LOCKED on entry; griffin just rises/pulls back so you can read & sidestep it
      const away = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
      b.pos.x = clamp(b.pos.x + away.x * 60 * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + away.y * 60 * dt - 32 * dt, 80, WH - 80)
      if (gs.timer <= 0) { gs.mode = 2; gs.timer = g.bossEnraged ? 0.72 : 0.85; Sfx.gust(); Sfx.wingFlap(); g.screenShake = Math.max(g.screenShake, 0.22) }
    } else if (gs.mode === 3) {
      // HOVER & BARRAGE — nearly stationary, rains aimed lightning bolts at the player
      const toC = v(g.bossFlightCenter.x - b.pos.x, g.bossFlightCenter.y - b.pos.y)
      b.pos.x = clamp(b.pos.x + toC.x * 0.5 * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + toC.y * 0.5 * dt + Math.sin(g.gtime * 2.4) * 10 * dt, 80, WH - 80)
      gs.shotT -= dt
      if (gs.shotT <= 0) {
        gs.shotT = g.bossEnraged ? 0.5 : 0.62
        const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(dir.x * 330, dir.y * 330), dmg: g.bossEnraged ? 11 : 8, radius: 8, fromBoss: true, life: 4.0, color: '#00EEFF', isLightning: true, trail: [] })
        spawnParticles(g, b.pos, 6, '#7DFFB0', 150); Sfx.shot()
      }
      if (gs.timer <= 0) { gs.mode = 0; gs.timer = rnd(3.4, 5.0) / (g.bossDesperate ? 1.4 : g.bossEnraged ? 1.2 : 1.0); g.bossFlightAngle = Math.atan2(b.pos.y - g.bossFlightCenter.y, b.pos.x - g.bossFlightCenter.x) }
    } else {
      // DYNAMIC ORBIT — gentle breathing radius, mild speed variation, occasional direction flips + vertical bob
      const dir = Math.sin(g.gtime * 0.4) >= 0 ? 1 : -1
      const breathe = 1 + 0.28 * Math.sin(g.gtime * 0.8)
      const spd = g.bossFlightSpeed * (g.bossEnraged ? 1.2 : 0.9) * (b.slowTimer > 0 ? 0.3 : 1.0) * (1 + 0.25 * Math.sin(g.gtime * 1.1))
      g.bossFlightAngle += spd * dir * dt
      const r = g.bossFlightRadius * breathe, fc = g.bossFlightCenter
      b.pos.x = clamp(fc.x + Math.cos(g.bossFlightAngle) * r, 80, WW - 80)
      b.pos.y = clamp(fc.y + Math.sin(g.bossFlightAngle) * r * 0.6 + Math.sin(g.gtime * 2.4) * 14, 80, WH - 80)
      if (gs.timer <= 0) {
        if (Math.random() < 0.5) {   // ── hover & barrage ──
          gs.mode = 3; gs.timer = g.bossEnraged ? 3.4 : 2.8; gs.shotT = 0.45
          spawnParticles(g, b.pos, 16, '#00EEFF', 200); Sfx.warn()
        } else {                      // ── swoop dive: lock the line NOW ──
          gs.mode = 1; gs.timer = g.bossEnraged ? 0.85 : 1.05
          gs.dive = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        }
      }
    }
  } else if (bossId === 1 && b.stunTimer <= 0) {
    // Drake: snake locomotion — head slithers toward player with sinusoidal lateral weave
    const snakeSpeed = (g.bossEnraged ? 215 : 166) * (b.slowTimer > 0 ? 0.28 : 1.0)
    const toP = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
    const perp = v(-toP.y, toP.x)
    const wiggle = Math.sin(g.gtime * 1.85) * 0.5
    const mdx = toP.x + perp.x * wiggle, mdy = toP.y + perp.y * wiggle
    const mlen = Math.sqrt(mdx*mdx + mdy*mdy) || 1
    b.pos.x = clamp(b.pos.x + (mdx/mlen) * snakeSpeed * dt, 90, WW - 90)
    b.pos.y = clamp(b.pos.y + (mdy/mlen) * snakeSpeed * dt, 90, WH - 90)
    // Smoothly rotate head angle toward actual movement direction
    const tgtAng = Math.atan2(mdy/mlen, mdx/mlen)
    let dAng = (tgtAng - b.angle) % (Math.PI * 2)
    if (dAng > Math.PI) dAng -= Math.PI * 2
    if (dAng < -Math.PI) dAng += Math.PI * 2
    b.angle += dAng * Math.min(1, dt * 8)
    // Append head position to trail for body-follows-head movement
    const tl = g.snakeTrail
    if (tl.length === 0 || dist(b.pos, tl[tl.length-1]) >= 8) {
      tl.push({x: b.pos.x, y: b.pos.y})
      if (tl.length > 400) tl.shift()
    }
  } else if (bossId === 0) {
    // Spider: stalk player at preferred range — chase when far, back away when too close, strafe in between
    const bossSpeed = (g.bossEnraged ? 155 : 105) * (b.slowTimer > 0 ? 0.4 : 1)
    const d2p = dist(b.pos, p.pos)
    const PREF_MIN = 150, PREF_MAX = 270
    if (b.stunTimer <= 0) {
      if (d2p > PREF_MAX) {
        // Chase at full speed
        const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        b.pos.x = clamp(b.pos.x + dir.x * bossSpeed * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + dir.y * bossSpeed * dt, 90, WH - 90)
      } else if (d2p < PREF_MIN) {
        // Back away smoothly (no teleport)
        const away = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
        b.pos.x = clamp(b.pos.x + away.x * bossSpeed * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + away.y * bossSpeed * dt, 90, WH - 90)
      } else {
        // In preferred range: strafe laterally around player (direction toggles via gtime)
        const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        const strafeSign = Math.sin(g.gtime * 0.75) >= 0 ? 1 : -1
        const strafe = v(-toPlayer.y * strafeSign, toPlayer.x * strafeSign)
        b.pos.x = clamp(b.pos.x + strafe.x * bossSpeed * 0.65 * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + strafe.y * bossSpeed * 0.65 * dt, 90, WH - 90)
      }
    }
  } else if (bossId === 3 && b.stunTimer <= 0) {
    // ── FROST WYRM — alternates grounded (melee-only) and airborne (ranged-only) stances ──
    if (!g.bossDesperate) {
      // stance only swaps once you've hurt it ENOUGH in the current stance — so you must wield both
      g.wyrmPhaseTimer -= dt   // minimum hold time, prevents instant whiplash on burst
      if (g.wyrmStagger >= g.wyrmStaggerMax && g.wyrmPhaseTimer <= 0) {
        g.wyrmFlying = !g.wyrmFlying
        g.dmgGate = g.wyrmFlying ? 'ranged' : 'melee'
        g.wyrmStagger = 0; g.wyrmPhaseTimer = 2.5
        g.bossAttack = null; g.comboQueue = []; g.nextAttackTimer = 0.5
        g.screenShake = Math.max(g.screenShake, 0.6); Sfx.roar()
        g.phaseBanner = g.wyrmFlying
          ? { text: 'THE WYRM TAKES FLIGHT', sub: 'Switch to ranged (TAB) — only spells & arrows reach it now!', timer: 2.6 }
          : { text: 'THE WYRM LANDS', sub: 'Switch to melee (TAB) — close in and strike!', timer: 2.6 }
        spawnParticles(g, b.pos, 30, '#cfe9ff', 320)
      }
    }
    const speed = (g.bossEnraged ? 170 : 125) * (b.slowTimer > 0 ? 0.4 : 1)
    if (g.wyrmFlying) {
      // aerial: orbit the player at range, hard to reach with melee
      g.bossFlightAngle += (g.bossEnraged ? 0.7 : 0.5) * dt
      const r = 300, cx2 = clamp(p.pos.x, 320, WW - 320), cy2 = clamp(p.pos.y, 320, WH - 320)
      const tx = cx2 + Math.cos(g.bossFlightAngle) * r, ty = cy2 + Math.sin(g.bossFlightAngle) * r * 0.7
      b.pos.x = clamp(b.pos.x + (tx - b.pos.x) * Math.min(1, dt * 1.7), 80, WW - 80)
      b.pos.y = clamp(b.pos.y + (ty - b.pos.y) * Math.min(1, dt * 1.7), 80, WH - 80)
    } else {
      // grounded: stalk toward the player so melee can connect
      const d2p = dist(b.pos, p.pos)
      if (d2p > 150) { const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y)); b.pos.x = clamp(b.pos.x + dir.x * speed * dt, 90, WW - 90); b.pos.y = clamp(b.pos.y + dir.y * speed * dt, 90, WH - 90) }
      else if (d2p < 110) { const away = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y)); b.pos.x = clamp(b.pos.x + away.x * speed * 0.5 * dt, 90, WW - 90); b.pos.y = clamp(b.pos.y + away.y * speed * 0.5 * dt, 90, WH - 90) }
    }
  }
  if (bossId !== 1) b.angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
  if (g.attackFlash) { g.attackFlash.timer = Math.max(0, g.attackFlash.timer - dt); if (g.attackFlash.timer <= 0) g.attackFlash = null }
  if (g.phaseBanner) { g.phaseBanner.timer -= dt; if (g.phaseBanner.timer <= 0) g.phaseBanner = null }

  // ── Spiderling minions: swarm the player, separate from each other, contact-damage ──
  if (g.minions.length) {
    const mspeed = (g.bossDesperate ? 152 : g.bossEnraged ? 132 : 110)
    g.minions = g.minions.filter(m => {
      if (m.hp <= 0) return false
      if (m.spawnAnim > 0) m.spawnAnim = Math.max(0, m.spawnAnim - dt)
      m.hitFlash = Math.max(0, m.hitFlash - dt); m.atkCd = Math.max(0, m.atkCd - dt); m.legPhase += dt * 9
      const toP = norm(v(p.pos.x - m.pos.x, p.pos.y - m.pos.y))
      let sx = 0, sy = 0
      for (const o of g.minions) { if (o === m) continue; const dd = dist(m.pos, o.pos); if (dd < 28 && dd > 0.01) { sx += (m.pos.x - o.pos.x) / dd; sy += (m.pos.y - o.pos.y) / dd } }
      const mvx = toP.x + sx * 0.5, mvy = toP.y + sy * 0.5, ml = Math.hypot(mvx, mvy) || 1
      if (m.spawnAnim <= 0) {
        m.pos.x = clamp(m.pos.x + (mvx / ml) * mspeed * dt, 20, WW - 20)
        m.pos.y = clamp(m.pos.y + (mvy / ml) * mspeed * dt, 20, WH - 20)
      }
      if (dist(m.pos, p.pos) < 26 && m.atkCd <= 0 && p.iframeTimer <= 0) {
        dealDmgToPlayer(g, g.bossEnraged ? 10 : 8, wpn, gear, toP); m.atkCd = 1.1; spawnParticles(g, m.pos, 5, '#8E44AD', 120)
      }
      return true
    })
  }

  // Hazard zones
  g.zones = g.zones.filter(zone => {
    zone.life -= dt; if (zone.life <= 0) return false
    if (dist(p.pos, zone.pos) < zone.radius + 14) {
      if (zone.type === 'web' || zone.type === 'ice') p.slowTimer = Math.max(p.slowTimer, 1.8)
      if (p.iframeTimer <= 0 && zone.dps > 0 && !g.god && g.manaShieldTimer <= 0) {
        const tick2 = zone.dps * dt; p.hp = Math.max(0, p.hp - tick2); p.hitFlash = Math.max(p.hitFlash, 0.06)
        if (zone.type === 'poison' && Math.random() < dt * 2) g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-14, 14), y: p.pos.y - 18 }, val: Math.round(tick2), life: 0.8, maxLife: 0.8, isPlayer: true, vx: rnd(-8, 8) })
        if (p.hp <= 0) killPlayer(g)
      }
    }
    return true
  })

  // Slow traps
  g.slowTraps = g.slowTraps.filter(trap => {
    trap.life -= dt; if (trap.life <= 0) return false
    if (!trap.fromPlayer && dist(p.pos, trap.pos) < 30) p.slowTimer = 3.0
    if (trap.fromPlayer && dist(b.pos, trap.pos) < bossDef.size + 18) { b.slowTimer = 3.0; spawnParticles(g, trap.pos, 12, trap.col ?? '#8E44AD', 130); spawnFx(g, 'shock', { ...trap.pos }, trap.col ?? '#8E44AD', 70, 0.4); if (trap.zone) spawnZone(g, { ...trap.pos }, trap.zone, 42, 0, 1.4); Sfx.trapSnap(); famSfx(wTheme, 'impact'); return false }
    return true
  })

  // Projectiles
  g.projectiles = g.projectiles.filter(proj => {
    proj.life -= dt
    if (proj.life <= 0) { if (proj.fromBoss && proj.isFireball) explodeFireball(g, proj.pos); return false }
    if (proj.trail) { proj.trail.push({ ...proj.pos }); if (proj.trail.length > 8) proj.trail.shift() }
    proj.pos.x += proj.vel.x * dt; proj.pos.y += proj.vel.y * dt
    if (proj.pos.x < 0 || proj.pos.x > WW || proj.pos.y < 0 || proj.pos.y > WH) { if (proj.fromBoss && proj.isFireball) explodeFireball(g, proj.pos); return false }
    if (proj.fromBoss && p.iframeTimer <= 0 && dist(proj.pos, p.pos) < proj.radius + 14) {
      if (g.bossAttack?.type === 'web_shot' || proj.isWeb) p.slowTimer = Math.max(p.slowTimer, 3.0)
      if (proj.isIce) p.slowTimer = Math.max(p.slowTimer, 1.6)
      dealDmgToPlayer(g, proj.dmg, wpn, gear, norm(v(p.pos.x - proj.pos.x, p.pos.y - proj.pos.y)))
      if (proj.isFireball) explodeFireball(g, proj.pos)
      spawnParticles(g, proj.pos, 9, proj.color, 130); return false
    }
    if (!proj.fromBoss && g.minions.length) {
      const mHit = g.minions.find(m => m.hp > 0 && dist(proj.pos, m.pos) < proj.radius + 16)
      if (mHit) {
        dealDmgToMinion(g, mHit, proj.dmg)
        if ((proj.aoe && proj.isLightning) || (proj.isFireball && proj.aoe) || (proj.isFirebolt && proj.aoe)) g.minions.forEach(m2 => { if (m2 !== mHit && m2.hp > 0 && dist(m2.pos, proj.pos) < (proj.aoe ?? 0)) dealDmgToMinion(g, m2, 30) })
        spawnParticles(g, proj.pos, 6, proj.color, 110); return false
      }
    }
    if (!proj.fromBoss && dist(proj.pos, b.pos) < proj.radius + bossDef.size) {
      dealDmgToBoss(g, proj.dmg, gear)
      if (proj.isPowerShot) { b.stunTimer = Math.max(b.stunTimer, 0.7); themedBurst(g, proj.pos, wTheme, 90, false); g.screenShake = Math.max(g.screenShake, 0.5); if (wTheme.fam === 'spider' && g.poisonTimer <= 0) g.poisonTimer = 5.0 }
      if (proj.aoe && proj.isLightning) { spawnParticles(g, proj.pos, 14, '#7DFFB0', 180); g.screenShake = Math.max(g.screenShake, 0.22); Sfx.zap(); if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 50, gear) }
      if (proj.isFireball && proj.aoe) {
        // big explosion + smoke + burning ground
        spawnParticles(g, proj.pos, 26, '#FF4500', 300); spawnParticles(g, proj.pos, 14, '#FFD24A', 190); spawnParticles(g, proj.pos, 7, '#FFF7C0', 120, 0.4)
        spawnParticles(g, proj.pos, 8, '#5a4a44', 70, 1.3)   // smoke
        spawnZone(g, proj.pos, 'fire', 58, 14, 2.4)          // burning ground
        g.screenShake = Math.max(g.screenShake, 0.55); Sfx.explosion()
        if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 80, gear)
      } else if (proj.isFirebolt) {
        // firebolt bursts into embers, splashes nearby foes, and scorches the ground (Fire Staff)
        spawnParticles(g, proj.pos, 16, '#FF6A1A', 220); spawnParticles(g, proj.pos, 8, '#FFD24A', 150); spawnParticles(g, proj.pos, 4, '#FFF7C0', 100, 0.35)
        spawnZone(g, proj.pos, 'fire', 54, 16, 2.4)   // scorched ground keeps burning whatever stands here
        if (proj.aoe) g.minions.forEach(m2 => { if (m2.hp > 0 && dist(m2.pos, proj.pos) < proj.aoe!) dealDmgToMinion(g, m2, Math.round(proj.dmg * 0.6)) })
        g.screenShake = Math.max(g.screenShake, 0.22); Sfx.firebolt()
      } else {
        spawnParticles(g, proj.pos, 6, proj.color, 100)
      }
      return false
    }
    return true
  })

  // Boss attack logic
  if (g.bossAttack) {
    const atk = g.bossAttack; atk.elapsed += dt
    if ((atk.type === 'thunderstorm' || atk.type === 'chain_lightning' || atk.type === 'lightning_barrage') && atk.active) {
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const interval = atk.type === 'lightning_barrage' ? 0.18 : 0.4
      const newIdx = Math.floor((d2.elapsed ?? 0) / interval)
      if (newIdx > (d2.strikeIndex ?? 0) && newIdx <= (d2.count ?? 7)) {
        d2.strikeIndex = newIdx
        // lightning_barrage aims tightly at player — must keep moving to dodge
        const spread = atk.type === 'lightning_barrage' ? 55 : 220
        const hitR = atk.type === 'lightning_barrage' ? 70 : 65
        const tx = p.pos.x + rnd(-spread, spread), ty = p.pos.y + rnd(-spread, spread)
        if (dist(p.pos, v(tx, ty)) < hitR) dealDmgToPlayer(g, d2.dmg ?? 25, wpn, gear, norm(v(p.pos.x - tx, p.pos.y - ty)))
        const lColor = atk.type === 'lightning_barrage' ? '#00EEFF' : '#F1C40F'
        spawnParticles(g, v(tx, ty), atk.type === 'lightning_barrage' ? 22 : 18, lColor, 240); g.screenShake = Math.max(g.screenShake, 0.35)
        if (atk.type === 'lightning_barrage') { spawnParticles(g, v(tx, ty), 8, '#FFFFFF', 160); g.screenShake = Math.max(g.screenShake, 0.5) }
      }
      if ((d2.elapsed ?? 0) >= ((d2.count ?? 7) * interval + 0.25)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'lava_barrage' && atk.active) {
      // Drake: a chain of magma eruptions that re-target the player every beat — must keep moving + leaves a lava trail
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const interval = g.bossEnraged ? 0.2 : 0.24
      const newIdx = Math.floor((d2.elapsed ?? 0) / interval)
      if (newIdx > (d2.strikeIndex ?? 0) && newIdx <= (d2.count ?? 8)) {
        d2.strikeIndex = newIdx
        const tx = clamp(p.pos.x + rnd(-44, 44), 80, WW - 80), ty = clamp(p.pos.y + rnd(-44, 44), 80, WH - 80)
        spawnZone(g, v(tx, ty), 'fire', 56, 16, 1.7)
        if (dist(p.pos, v(tx, ty)) < 62) dealDmgToPlayer(g, d2.dmg ?? 20, wpn, gear, norm(v(p.pos.x - tx, p.pos.y - ty)))
        spawnParticles(g, v(tx, ty), 14, '#FF6600', 230); g.screenShake = Math.max(g.screenShake, 0.4); Sfx.explosion()
      }
      if ((d2.elapsed ?? 0) >= ((d2.count ?? 8) * interval + 0.3)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'flame_wave' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const a2 = atk.data.angle ?? 0, hc = (atk.data.coneAngle ?? 0.5) / 2, rng = atk.data.coneRange ?? 320
      const pa = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df = Math.abs(pa - a2); while (df > Math.PI) df = Math.abs(df - Math.PI * 2)
      if (df <= hc && dist(p.pos, b.pos) < rng) dealDmgToPlayer(g, (atk.data.dmg ?? 20) * dt * 2.5, wpn, gear)
      // visible roaring flame fan — erupts from the snout
      { const mz = BOSS_DEFS[1].size * 0.55, mx = b.pos.x + Math.cos(a2) * mz, my = b.pos.y + Math.sin(a2) * mz
        for (let k = 0; k < 5; k++) { const fa = a2 + rnd(-hc, hc), fd = rnd(0, rng); spawnParticles(g, v(mx + Math.cos(fa) * fd, my + Math.sin(fa) * fd), 1, ['#FF6600', '#FFAA00', '#FF3000'][rndI(0, 2)], 50, 0.4) } }
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 1.6)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'fire_breath' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const a3 = atk.data.angle ?? 0, hc2 = (atk.data.coneAngle ?? 0.4) / 2, rng2 = atk.data.coneRange ?? 260
      const pa2 = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df2 = Math.abs(pa2 - a3); while (df2 > Math.PI) df2 = Math.abs(df2 - Math.PI * 2)
      if (df2 <= hc2 && dist(p.pos, b.pos) < rng2) dealDmgToPlayer(g, (atk.data.dmg ?? 18) * dt * 1.5, wpn, gear)
      // breath jet pouring from the maw
      { const mz = BOSS_DEFS[1].size * 0.55, mx = b.pos.x + Math.cos(a3) * mz, my = b.pos.y + Math.sin(a3) * mz
        for (let k = 0; k < 6; k++) { const fa = a3 + rnd(-hc2, hc2), fd = rnd(0, rng2); spawnParticles(g, v(mx + Math.cos(fa) * fd, my + Math.sin(fa) * fd), 1, ['#FF6600', '#FFAA00', '#FF3000', '#FFD24A'][rndI(0, 3)], 50, 0.4) } }
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 2.2)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'frost_breath' && atk.active) {
      // Frost Wyrm: a freezing breath cone that chills and leaves ice underfoot
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const a3 = d2.angle ?? 0, hc2 = (d2.coneAngle ?? 0.5) / 2, rng2 = d2.coneRange ?? 300
      const pa2 = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df2 = Math.abs(pa2 - a3); while (df2 > Math.PI) df2 = Math.abs(df2 - Math.PI * 2)
      if (df2 <= hc2 && dist(p.pos, b.pos) < rng2) { dealDmgToPlayer(g, (d2.dmg ?? 18) * dt * 1.5, wpn, gear); p.slowTimer = Math.max(p.slowTimer, 1.4) }
      for (let k = 0; k < 8; k++) { const fa = a3 + rnd(-hc2, hc2), fd = rnd(40, rng2); spawnParticles(g, v(b.pos.x + Math.cos(fa) * fd, b.pos.y + Math.sin(fa) * fd), 1, ['#9fe8ff', '#cfe9ff', '#e8f7ff', '#FFFFFF'][rndI(0, 3)], 80, 0.5) }
      if (rndI(0, 5) === 0) { const fa = a3 + rnd(-hc2, hc2), fd = rnd(80, rng2); spawnZone(g, v(b.pos.x + Math.cos(fa) * fd, b.pos.y + Math.sin(fa) * fd), 'ice', 60, 10, 2.4) }
      if ((d2.elapsed ?? 0) >= (d2.duration ?? 2.0)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'web_spiral' && atk.active) {
      // Spider: a spinning pinwheel of web bolts — circle the boss to stay in the gaps
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const idx = Math.floor((d2.elapsed ?? 0) / 0.09)
      if (idx > (d2.strikeIndex ?? 0)) {
        d2.strikeIndex = idx
        const base = (d2.angle ?? 0) + (d2.elapsed ?? 0) * 5.4
        for (const off of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
          const a = base + off
          g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * 205, Math.sin(a) * 205), dmg: d2.dmg ?? 9, radius: 9, fromBoss: true, life: 3.0, color: '#8E44AD', isWeb: true })
        }
        Sfx.webShot()
      }
      if ((d2.elapsed ?? 0) >= (d2.duration ?? 1.4)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'fire_sweep' && atk.active) {
      // Drake: a flamethrower cone that sweeps the arena — run around behind it
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      d2.angle = (d2.angle ?? 0) + (d2.count ?? 1) * 1.45 * dt
      const a = d2.angle ?? 0, hc = (d2.coneAngle ?? 0.77) / 2, rng = d2.coneRange ?? 330
      const pa = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df = Math.abs(pa - a); while (df > Math.PI) df = Math.abs(df - Math.PI * 2)
      if (df <= hc && dist(p.pos, b.pos) < rng) dealDmgToPlayer(g, (d2.dmg ?? 17) * dt * 2.4, wpn, gear)
      // flamethrower jet sweeping from the snout
      { const mz = BOSS_DEFS[1].size * 0.55, mx = b.pos.x + Math.cos(a) * mz, my = b.pos.y + Math.sin(a) * mz
        for (let k = 0; k < 6; k++) { const fa = a + rnd(-hc, hc), fd = rnd(0, rng); spawnParticles(g, v(mx + Math.cos(fa) * fd, my + Math.sin(fa) * fd), 1, ['#FF6600', '#FFAA00', '#FF3000', '#FFD24A'][rndI(0, 3)], 60, 0.45) } }
      if (rndI(0, 30) === 0) Sfx.fireCast()
      if ((d2.elapsed ?? 0) >= (d2.duration ?? 2.2)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (atk.type === 'storm_rings' && atk.active) {
      // Griffin: expanding rings of lightning with shifting gaps — weave outward
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const interval = 0.55, total = d2.count ?? 3
      const idx = Math.floor((d2.elapsed ?? 0) / interval)
      if (idx > (d2.strikeIndex ?? 0) && idx <= total) {
        d2.strikeIndex = idx
        const n = 10, off = idx * 0.3
        for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2; g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * 235, Math.sin(a) * 235), dmg: d2.dmg ?? 10, radius: 8, fromBoss: true, life: 3.2, color: '#00EEFF', isLightning: true, trail: [] }) }
        spawnParticles(g, b.pos, 12, '#7DFFB0', 180); g.screenShake = Math.max(g.screenShake, 0.3); Sfx.thunder()
      }
      if ((d2.elapsed ?? 0) >= (total * interval + 0.3)) { g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId) }
      return
    }
    if (!atk.active && atk.elapsed >= atk.telegraphTime) {
      atk.active = true
      if (!CHANNELED.has(atk.type)) {
        resolveBossAttack(g, bossId, wpn, gear); g.bossAttack = null; g.nextAttackTimer = attackGap(g, bossId)
      }
    }
  } else if (g.nextAttackTimer <= 0 && b.stunTimer <= 0 && !(bossId === 2 && g.griffinState.mode === 3)) {
    let next: string
    if (g.comboQueue.length) next = g.comboQueue.shift()!
    else {
      next = selectBossAttack(bossId, g.bossEnraged, g.bossDesperate, dist(p.pos, b.pos), g.wyrmFlying)
      // chain a fresh (non-channelled) attack into a telegraphed multi-hit combo
      if (!CHANNELED.has(next) && COMBOS[bossId].length && Math.random() < comboChance(g, bossId)) {
        const tpl = COMBOS[bossId][rndI(0, COMBOS[bossId].length - 1)]
        next = tpl[0]
        for (let i = 1; i < tpl.length; i++) g.comboQueue.push(tpl[i])
      }
    }
    startBossAttack(g, bossId, next)
  }

  const hpFrac = b.hp / b.maxHp
  // ── PHASE 2 — Enrage ──
  if (!g.bossEnraged && hpFrac <= bossDef.enrageAt) {
    g.bossEnraged = true; g.screenShake = 0.95; g.hitstop = Math.max(g.hitstop, 0.08); spawnParticles(g, b.pos, 40, '#FF4444', 360)
    Sfx.roar()
    const p2Sub = bossId === 0 ? 'Venom floods the lair' : bossId === 1 ? 'The molten core ignites' : bossId === 3 ? 'The blizzard rises' : 'The storm answers her call'
    g.phaseBanner = { text: 'PHASE 2 — ENRAGED', sub: p2Sub, timer: 2.6 }
  }
  // ── PHASE 3 — Desperate (final stand at low HP) ──
  if (!g.bossDesperate && hpFrac <= bossDef.enrageAt * 0.45) {
    g.bossDesperate = true; g.bossEnraged = true
    g.bossAttack = null            // cancel any wind-up
    g.comboQueue = []              // fresh start for the final stand
    g.nextAttackTimer = 0.6        // attack again quickly
    g.screenShake = 1.4; g.hitstop = Math.max(g.hitstop, 0.10)
    spawnParticles(g, b.pos, 60, '#FFFFFF', 480); spawnParticles(g, b.pos, 40, bossDef.color, 420)
    Sfx.phaseShift()
    // shockwave nova — punishes anyone hugging the boss at the transition
    const novaR = bossDef.size + 150
    if (dist(p.pos, b.pos) < novaR && p.iframeTimer <= 0) dealDmgToPlayer(g, 26, wpn, gear, norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y)))
    const p3Sub = bossId === 0 ? 'She calls her brood!' : bossId === 1 ? 'The arena turns to magma!' : bossId === 3 ? 'It crashes down — now vulnerable to all!' : 'A storm of blades takes wing!'
    g.phaseBanner = { text: 'PHASE 3 — DESPERATE', sub: p3Sub, timer: 3.0 }
    // ── signature phase-3 openers ──
    if (bossId === 0) {
      g.bossDmgTakenMult = 0.55             // Spider hardens her carapace — far tankier in her final stand
      spawnSpiderlings(g, 4)               // Spider: flood the arena with brood
    } else if (bossId === 1) {
      // Drake: eruption — a ring of lava erupts around her, then a molten wake follows (see below)
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, rr = bossDef.size + 92
        spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * rr, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * rr, 80, WH - 80)), 'fire', 60, 14, 4.5)
        spawnParticles(g, v(b.pos.x + Math.cos(a) * rr, b.pos.y + Math.sin(a) * rr), 8, '#FF6600', 130, 0.6)
      }
      g.sigTimer = 0.36
    } else if (bossId === 3) {
      // Frost Wyrm: crashes to earth and drops its scale-guard — every weapon can now hurt it
      g.wyrmFlying = false; g.dmgGate = 'both'
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = bossDef.size + 90
        spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * rr, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * rr, 80, WH - 80)), 'ice', 56, 12, 4.0)
        spawnParticles(g, v(b.pos.x + Math.cos(a) * rr, b.pos.y + Math.sin(a) * rr), 8, '#9fe8ff', 150, 0.6) }
      g.sigTimer = 0.5
    } else {
      // Griffin: takes wing and looses a feather storm; flies faster and more erratically
      fireFeatherVolley(g, 14, 240, 13, g.gtime)
      g.bossFlightSpeed *= 1.32
      g.sigTimer = 1.2
    }
  }

  // ── Phase-3 signature mechanics (ongoing): drake molten wake / griffin feather storm ──
  if (g.bossDesperate && b.stunTimer <= 0 && g.phase === 'playing') {
    g.sigTimer -= dt
    if (g.sigTimer <= 0) {
      if (bossId === 1) {
        // Drake leaves a trail of fire under her body as she slithers — area denial that evolves
        spawnZone(g, { x: b.pos.x, y: b.pos.y }, 'fire', 56, 14, 3.0)
        spawnParticles(g, b.pos, 4, '#FF7700', 90, 0.5)
        g.sigTimer = 0.36
      } else if (bossId === 2) {
        // Griffin rains radial feather volleys — keep moving to thread the gaps
        fireFeatherVolley(g, g.bossEnraged ? 12 : 10, 250, 12, g.gtime * 1.3)
        g.sigTimer = 1.5
      } else {
        g.sigTimer = 1.0
      }
    }
  }

  // Boss death
  if (b.hp <= 0 && g.phase === 'playing') {
    g.phase = 'dying'; g.bossDeathAnim = 3.0; g.bossAttack = null; g.screenShake = 1.5; g.hitstop = 0.16; g.minions = []
    spawnParticles(g, b.pos, 90, '#F1C40F', 400); spawnParticles(g, b.pos, 45, bossDef.color, 320); spawnParticles(g, b.pos, 22, '#FFFFFF', 550)
    Sfx.death()
  }

  // Decay
  g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 30 * dt; d2.pos.x += (d2.vx ?? 0) * dt; if (d2.vx) d2.vx *= Math.pow(0.05, dt); return d2.life > 0 })
  g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; pt.vel.x *= Math.pow(0.15, dt); pt.vel.y *= Math.pow(0.15, dt); return pt.life > 0 })
  if (bossId === 1) {
    const spawnRate = g.bossEnraged ? 26 : 16
    if (Math.random() < dt * spawnRate) {
      const side = Math.random() > 0.5 ? 1 : -1
      const cols = ['#FF6600','#FF4500','#E67E22','#FFAA00','#FF2200','#FF7700']
      g.lavaParticles.push({ id: ++g.nextPartId, pos: v(b.pos.x + rnd(-bossDef.size*0.9, bossDef.size*0.9), b.pos.y + rnd(-bossDef.size*0.3, bossDef.size*0.55)), vel: v(rnd(-28, 28) + side * rnd(8, 36), rnd(-95, -28)), life: rnd(0.5, 1.5), maxLife: 1.5, color: cols[Math.floor(Math.random()*cols.length)], size: rnd(2.5, 7) })
      Sfx.lavaBubble()   // ambient molten blub (throttled internally)
    }
    g.lavaParticles = g.lavaParticles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; return pt.life > 0 })
    // Tail whip — player takes damage if they touch the tail tip
    if (g.tailWhipCd > 0) { g.tailWhipCd -= dt } else if (p.iframeTimer <= 0) {
      // Walk the trail backward from head to find the tail tip position
      const tl2 = g.snakeTrail
      const BODY_LEN = bossDef.size * 3.5  // total snake body length in px
      let tailX = b.pos.x, tailY = b.pos.y
      if (tl2.length > 0) {
        let walked = 0, wpx2 = b.pos.x, wpy2 = b.pos.y
        for (let ti2 = tl2.length - 1; ti2 >= 0; ti2--) {
          const dx2 = tl2[ti2].x - wpx2, dy2 = tl2[ti2].y - wpy2
          const d2 = Math.sqrt(dx2*dx2 + dy2*dy2)
          if (walked + d2 >= BODY_LEN) {
            const fr3 = (BODY_LEN - walked) / d2
            tailX = wpx2 + dx2*fr3; tailY = wpy2 + dy2*fr3; break
          }
          walked += d2; wpx2 = tl2[ti2].x; wpy2 = tl2[ti2].y
          if (ti2 === 0) { tailX = tl2[0].x; tailY = tl2[0].y }
        }
      }
      if (dist(p.pos, v(tailX, tailY)) < 50) {
        dealDmgToPlayer(g, 10, wpn, gear, norm(v(p.pos.x - tailX, p.pos.y - tailY)))
        g.tailWhipCd = 1.1
        spawnParticles(g, v(tailX, tailY), 6, '#FF6600', 110)
      }
    }
  }
}

/* ═══ WEAPON FAMILY THEMING — drives ability colours, particles, lingering FX & layered SFX per loadout ═══ */
type WFam = 'starter' | 'spider' | 'drake' | 'griffin'
interface WTheme { fam: WFam; main: string; accent: string; particle: string; zone: 'poison' | 'fire' | 'lightning' | null }
function weaponTheme(wid: string): WTheme {
  switch (wid) {
    case 'dagger':        return { fam: 'spider',  main: '#8E44AD', accent: '#9ACD00', particle: '#A569BD', zone: 'poison' }
    case 'venom_bow':     return { fam: 'spider',  main: '#8E44AD', accent: '#9ACD00', particle: '#7FBA00', zone: 'poison' }
    case 'greatsword':    return { fam: 'drake',   main: '#E67E22', accent: '#FFD24A', particle: '#FF6600', zone: 'fire' }
    case 'fire_staff':    return { fam: 'drake',   main: '#FF4500', accent: '#FFB02A', particle: '#FF6A1A', zone: 'fire' }
    case 'thunder_sword': return { fam: 'griffin', main: '#F1C40F', accent: '#FFFFFF', particle: '#FFF080', zone: 'lightning' }
    case 'storm_bow':     return { fam: 'griffin', main: '#5fe0ff', accent: '#FFFFFF', particle: '#7DFFB0', zone: 'lightning' }
    case 'bow':           return { fam: 'starter', main: '#2ECC71', accent: '#A9DFBF', particle: '#27AE60', zone: null }
    case 'staff':         return { fam: 'starter', main: '#9B59B6', accent: '#CE9EE8', particle: '#9B59B6', zone: null }
    default:              return { fam: 'starter', main: '#E74C3C', accent: '#FFD24A', particle: '#E74C3C', zone: null }
  }
}
// layered family-flavour sound on top of an ability's base SFX (starters stay clean & simple)
function famSfx(th: WTheme, kind: 'cast' | 'impact' | 'whoosh') {
  if (th.fam === 'spider') { if (kind === 'impact') Sfx.poisonHit(); else if (kind === 'cast') Sfx.webShot(); else Sfx.gust() }
  else if (th.fam === 'drake') { if (kind === 'impact') Sfx.explosion(); else if (kind === 'cast') Sfx.fireCast(); else Sfx.emberSizzle() }
  else if (th.fam === 'griffin') { if (kind === 'impact') Sfx.thunder(); else if (kind === 'cast') Sfx.zap(); else Sfx.gust() }
}
// themed ability impact — shockwave/nova/particles in the family palette + a lingering COSMETIC (dps 0) pool
function themedBurst(g: GS, pos: V2, th: WTheme, radius: number, big: boolean) {
  spawnFx(g, 'shock', { ...pos }, th.main, radius, big ? 0.55 : 0.42)
  spawnFx(g, 'nova', { ...pos }, th.accent, radius * 0.55, 0.3)
  if (th.fam === 'griffin') spawnFx(g, 'star', { ...pos }, th.accent, radius * 0.5, 0.3, 0.6)
  spawnParticles(g, pos, big ? 22 : 13, th.particle, big ? 280 : 200)
  spawnParticles(g, pos, big ? 9 : 5, th.accent, big ? 180 : 130, 0.4)
  if (th.zone) spawnZone(g, { ...pos }, th.zone, radius * 0.5, 0, big ? 1.6 : 1.1)
}

/* ═══ ABILITIES ═══ */
function activateAbility(g: GS, idx: number, wpn: WeaponDef, gear: GearId[], abilityTarget: V2, bossId: BossId) {
  const p = g.player, b = g.boss
  const th = weaponTheme(getWeaponId(wpn, gear))
  if (wpn.id === 'sword') Sfx.swing(); else if (wpn.id === 'bow') Sfx.shot()
  if (wpn.id === 'staff') g.mageCircle = Math.max(g.mageCircle, 0.6)

  if (idx === 0 && gear.includes('fire_staff')) {
    const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 420, dir.y * 420), dmg: 270, radius: 16, fromBoss: false, life: 4.0, color: '#FF4500', aoe: 120, isFireball: true, trail: [] })
    spawnParticles(g, p.pos, 18, '#FF6A1A', 200); spawnParticles(g, p.pos, 8, '#FFF7C0', 130, 0.35)
    spawnFx(g, 'rune', p.pos, '#FF6A1A', 40, 0.5); spawnFx(g, 'star', p.pos, '#FFD24A', 26, 0.26, Math.atan2(dir.y, dir.x))
    Sfx.fireCast(); Sfx.fireball()
    return
  }

  if (wpn.id === 'bow') {
    if (idx === 0) { // Power Shot
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const ps = gear.includes('storm_bow') ? '#5fe0ff' : gear.includes('venom_bow') ? '#9B59B6' : '#F1C40F'
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 560, dir.y * 560), dmg: 120, radius: 14, fromBoss: false, life: 4.0, color: ps, isPowerShot: true, trail: [] })
      spawnParticles(g, p.pos, 18, ps, 200)
      const psA = Math.atan2((abilityTarget.y - p.pos.y), (abilityTarget.x - p.pos.x))
      g.attackFlash = { angle: psA, timer: 0.4, maxTimer: 0.4, type: 'power_shot', color: ps }
      spawnFx(g, 'star', p.pos, ps, 30, 0.26, psA); g.screenShake = Math.max(g.screenShake, 0.22)
      Sfx.powerShot(); famSfx(th, 'cast')
    } else if (idx === 1) { // Trap
      g.slowTraps.push({ id: ++g.nextTrapId, pos: { ...abilityTarget }, life: 20.0, fromPlayer: true, col: th.main, zone: th.zone })
      if (dist(b.pos, abilityTarget) < BOSS_DEFS[bossId].size + 22) { dealDmgToBoss(g, 130, gear); b.slowTimer = 3.0 }
      spawnParticles(g, abilityTarget, 10, th.particle, 90, 0.65)
      spawnFx(g, 'rune', { ...abilityTarget }, th.main, 26, 0.5)
      Sfx.trapSet(); famSfx(th, 'cast')
    } else if (idx === 2) { // Shadow Dash
      const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      p.dodgeTimer = 0.38; p.dodgeVel = v(dir.x * 540, dir.y * 540); p.iframeTimer = 0.38
      for (let i = 0; i < 6; i++) p.shadowDashTrail.push({ pos: { ...p.pos }, a: 0.7 - i * 0.08 })
      spawnParticles(g, p.pos, 12, th.particle, 130, 0.4)
      spawnFx(g, 'nova', p.pos, th.main, 42, 0.3)
      Sfx.dodge(); famSfx(th, 'whoosh')
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.25, maxTimer: 0.25, type: 'shadow', color: th.main }
    } else if (idx === 3) { // Rain of Arrows
      for (let i = 0; i < 3; i++) {
        const perp = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x) + Math.PI / 2
        const tx = clamp(abilityTarget.x + Math.cos(perp) * (i - 1) * 100, 50, WW - 50)
        const ty = clamp(abilityTarget.y + Math.sin(perp) * (i - 1) * 100, 50, WH - 50)
        g.skyArrows.push({ id: ++g.nextProjId, targetPos: v(tx, ty), warnTimer: 1.2 + i * 0.25, hit: false, dmg: 80, col: th.main, zone: th.zone })
      }
      spawnParticles(g, p.pos, 10, th.particle, 120, 0.4)
      spawnFx(g, 'rune', p.pos, th.main, 34, 0.5); spawnFx(g, 'star', p.pos, th.accent, 26, 0.28)
      Sfx.rainArrows(); famSfx(th, 'cast')
    }
  } else if (wpn.id === 'sword') {
    if (idx === 0) { // Ground Slam
      if (dist(p.pos, b.pos) < 140) { dealDmgToBoss(g, 130, gear, 'melee'); g.screenShake = Math.max(g.screenShake, 0.7) }
      g.minions.forEach(m => { if (m.hp > 0 && dist(p.pos, m.pos) < 140) dealDmgToMinion(g, m, 130) })
      themedBurst(g, p.pos, th, 150, true)
      Sfx.slam(); famSfx(th, 'impact')
    } else if (idx === 1) { // Rage
      g.rageActive = true; g.rageTimer = 8.0; spawnParticles(g, p.pos, 22, th.particle, 190)
      spawnFx(g, 'nova', p.pos, th.accent, 62, 0.4); spawnFx(g, 'shock', p.pos, th.main, 72, 0.45)
      Sfx.rage(); famSfx(th, 'cast')
    } else if (idx === 2) { // Bull Charge
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.bullChargeDash = { active: true, vel: v(dir.x * 640, dir.y * 640), timer: 0.4 }; p.iframeTimer = 0.4
      spawnFx(g, 'star', p.pos, th.main, 32, 0.28, Math.atan2(dir.y, dir.x)); spawnParticles(g, p.pos, 12, th.particle, 150)
      Sfx.charge(); famSfx(th, 'whoosh')
    } else if (idx === 3) { // Whirlwind
      g.whirlwindActive = true; g.whirlwindTimer = 3.0; spawnParticles(g, p.pos, 22, th.particle, 190)
      spawnFx(g, 'shock', p.pos, th.main, 120, 0.42)
      Sfx.whirl(); famSfx(th, 'whoosh')
    }
  } else { // staff
    if (idx === 0) { // Arcane Bolt
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 600, dir.y * 600), dmg: 185, radius: 13, fromBoss: false, life: 4.0, color: '#9B59B6', isArcane: true, trail: [] })
      spawnParticles(g, p.pos, 14, '#9B59B6', 180); Sfx.arcaneBolt()
      spawnFx(g, 'rune', p.pos, '#9B59B6', 34, 0.45); spawnFx(g, 'star', p.pos, '#CE9EE8', 24, 0.24, Math.atan2(dir.y, dir.x))
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.35, maxTimer: 0.35, type: 'magic', color: '#9B59B6' }
    } else if (idx === 1) { // Mana Shield — blocks ALL incoming damage for its duration
      g.manaShieldTimer = 2.5
      p.iframeTimer = Math.max(p.iframeTimer, 2.5)
      spawnParticles(g, p.pos, 22, th.particle, 150); spawnFx(g, 'rune', p.pos, th.main, 30, 0.5); Sfx.shieldUp()
      if (th.fam === 'drake') Sfx.fireCast()
      g.screenShake = Math.max(g.screenShake, 0.12)
    } else if (idx === 2) { // Arcane Surge — blink toward cursor and erupt in a nova on arrival
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const fire = gear.includes('fire_staff'), col = fire ? '#FF6A1A' : '#9B59B6'
      const blinkDist = Math.min(dist(p.pos, abilityTarget), 300)
      const origin = { ...p.pos }
      spawnFx(g, 'nova', origin, col, 48, 0.3); spawnParticles(g, origin, 12, col, 200); Sfx.blink()   // implosion at the departure point
      for (let i = 0; i < 6; i++) p.shadowDashTrail.push({ pos: { ...p.pos }, a: 0.7 - i * 0.1 })
      p.pos.x = clamp(p.pos.x + dir.x * blinkDist, 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * blinkDist, 20, WH - 20)
      p.iframeTimer = Math.max(p.iframeTimer, 0.4)
      const novaR = 130, novaDmg = 175
      if (dist(b.pos, p.pos) < novaR + BOSS_DEFS[bossId].size) dealDmgToBoss(g, novaDmg, gear)
      g.minions.forEach(m => { if (m.hp > 0 && dist(m.pos, p.pos) < novaR) { dealDmgToMinion(g, m, novaDmg); const kd = norm(v(m.pos.x - p.pos.x, m.pos.y - p.pos.y)); m.pos.x += kd.x * 42; m.pos.y += kd.y * 42 } })
      spawnParticles(g, p.pos, 30, col, 340); spawnParticles(g, p.pos, 14, '#FFFFFF', 210)
      spawnFx(g, 'shock', p.pos, col, novaR, 0.5); spawnFx(g, 'nova', p.pos, fire ? '#FFD24A' : '#CE9EE8', 95, 0.32)
      if (fire) { spawnParticles(g, p.pos, 10, '#FFD24A', 170); spawnZone(g, p.pos, 'fire', 72, 12, 1.8); Sfx.fireCast(); Sfx.explosion() } else { Sfx.ability() }
      g.screenShake = Math.max(g.screenShake, 0.5); g.mageCircle = Math.max(g.mageCircle, 0.5)
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.3, maxTimer: 0.3, type: 'shadow', color: col }
    } else if (idx === 3) { // Meteor
      g.skyArrows.push({ id: ++g.nextProjId, targetPos: { ...abilityTarget }, warnTimer: 1.2, hit: false, dmg: 430, kind: 'meteor' })
      spawnParticles(g, p.pos, 12, gear.includes('fire_staff') ? '#FF6A1A' : '#9B59B6', 130, 0.5)
      spawnFx(g, 'rune', p.pos, gear.includes('fire_staff') ? '#FF6A1A' : '#9B59B6', 42, 0.6); Sfx.meteorCast()
    }
  }
}
// PIECE_3_START

/* ═══ RENDERERS ═══ */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}

function renderArena(ctx: CanvasRenderingContext2D, arenaType: 'spider'|'drake'|'griffin'|'wyrm', t: number, g: GS) {
  ctx.save()
  if (arenaType === 'spider') {
    const bg = ctx.createLinearGradient(0, 0, WW, WH)
    bg.addColorStop(0, '#060210'); bg.addColorStop(1, '#0d0420')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, WW, WH)
    ctx.strokeStyle = 'rgba(130,80,190,0.07)'; ctx.lineWidth = 1
    const cx = WW/2, cy = WH/2
    for (let r2 = 80; r2 < 1200; r2 += 80) { ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.stroke() }
    for (let a = 0; a < Math.PI*2; a += 0.25) {
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a)*1300, cy + Math.sin(a)*1300); ctx.stroke()
    }
    const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,600)
    grd.addColorStop(0,'rgba(80,20,140,0.12)'); grd.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = grd; ctx.fillRect(0,0,WW,WH)
  } else if (arenaType === 'drake') {
    const bg = ctx.createLinearGradient(0,0,0,WH)
    bg.addColorStop(0,'#1a0600'); bg.addColorStop(0.5,'#2a0e00'); bg.addColorStop(1,'#1a0600')
    ctx.fillStyle = bg; ctx.fillRect(0,0,WW,WH)
    ctx.strokeStyle = `rgba(255,90,0,${0.08 + 0.04*Math.sin(t*0.8)})`; ctx.lineWidth = 4
    const cracks: number[][] = [[300,WH,450,WH*0.5,380,WH*0.2],[WW-280,WH,WW-420,WH*0.55,WW-350,WH*0.3],[WW*0.4,WH,WW*0.45,WH*0.6],[WW*0.7,WH,WW*0.65,WH*0.65]]
    cracks.forEach(pts => {
      if (pts.length < 4) return
      ctx.beginPath(); ctx.moveTo(pts[0],pts[1])
      for (let i=2;i<pts.length;i+=2) ctx.lineTo(pts[i],pts[i+1]); ctx.stroke()
    })
    const glow2 = ctx.createRadialGradient(WW/2,WH,0,WW/2,WH,600)
    glow2.addColorStop(0,'rgba(255,80,0,0.15)'); glow2.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = glow2; ctx.fillRect(0,0,WW,WH)
    g.lavaParticles.forEach(pt => {
      const a2 = pt.life/pt.maxLife; ctx.save(); ctx.globalAlpha = a2 * 0.90
      ctx.shadowColor = pt.color; ctx.shadowBlur = 9
      ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.size * (0.65 + a2 * 0.35), 0, Math.PI*2); ctx.fill(); ctx.restore()
    })
  } else if (arenaType === 'griffin') {
    const bg = ctx.createLinearGradient(0,0,0,WH)
    bg.addColorStop(0,'#05090f'); bg.addColorStop(1,'#0e1528')
    ctx.fillStyle = bg; ctx.fillRect(0,0,WW,WH)
    ctx.strokeStyle = 'rgba(160,190,255,0.05)'; ctx.lineWidth = 14
    for (let i=0;i<8;i++) {
      ctx.beginPath(); ctx.moveTo(-120,60+i*130)
      ctx.bezierCurveTo(WW*0.3,40+i*130,WW*0.65,85+i*130,WW+120,60+i*130); ctx.stroke()
    }
    const glow3 = ctx.createRadialGradient(WW/2,WH/2,0,WW/2,WH/2,700)
    glow3.addColorStop(0,'rgba(80,120,255,0.06)'); glow3.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = glow3; ctx.fillRect(0,0,WW,WH)
  } else {
    // ── FROZEN PEAK — pale icy cavern with frost cracks and a cold glow ──
    const bg = ctx.createLinearGradient(0,0,WW,WH)
    bg.addColorStop(0,'#071420'); bg.addColorStop(0.5,'#0a2030'); bg.addColorStop(1,'#06121c')
    ctx.fillStyle = bg; ctx.fillRect(0,0,WW,WH)
    // frost cracks radiating across the ice
    ctx.strokeStyle = `rgba(150,220,255,${0.06+0.03*Math.sin(t*0.7)})`; ctx.lineWidth = 2
    const cx = WW/2, cy = WH/2
    for (let i=0;i<14;i++){ const a=i/14*Math.PI*2 + i*0.3
      ctx.beginPath(); ctx.moveTo(cx,cy)
      let x=cx, y=cy
      for (let s=0;s<5;s++){ const seg=(120+s*120); x=cx+Math.cos(a+Math.sin(s*1.7)*0.2)*seg; y=cy+Math.sin(a+Math.sin(s*1.7)*0.2)*seg; ctx.lineTo(x,y) }
      ctx.stroke() }
    // scattered snow glints
    ctx.fillStyle = 'rgba(200,235,255,0.5)'
    for (let i=0;i<70;i++){ const seed=i*149; const x=(seed*7)%WW, y=(seed*13)%WH, r=0.6+(seed%3); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill() }
    const glow4 = ctx.createRadialGradient(cx,cy,0,cx,cy,700)
    glow4.addColorStop(0,'rgba(120,210,255,0.08)'); glow4.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = glow4; ctx.fillRect(0,0,WW,WH)
  }
  void t
  ctx.restore()
}

function renderEnvObjects(ctx: CanvasRenderingContext2D, g: GS, arenaType: 'spider'|'drake'|'griffin'|'wyrm', t: number) {
  for (const obj of g.envObjects) {
    ctx.save(); ctx.translate(obj.pos.x, obj.pos.y); ctx.rotate(obj.angle)
    if (obj.type === 'rock') {
      ctx.fillStyle = arenaType==='drake' ? '#3a2010' : arenaType==='griffin' ? '#4a5060' : arenaType==='wyrm' ? '#2b4a5e' : '#2a1a3a'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6
      ctx.beginPath()
      const sides = 5+obj.variant
      for (let i=0;i<sides;i++) { const a=i/sides*Math.PI*2, r2=obj.size*(0.7+0.3*Math.sin(a*2.3+obj.variant)); if(i===0) ctx.moveTo(Math.cos(a)*r2,Math.sin(a)*r2); else ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2) }
      ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke()
    } else if (obj.type === 'bone') {
      ctx.strokeStyle = 'rgba(200,190,165,0.55)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-obj.size*0.5,0); ctx.lineTo(obj.size*0.5,0); ctx.stroke()
      ctx.fillStyle = 'rgba(200,190,165,0.5)'
      ctx.beginPath(); ctx.arc(-obj.size*0.5,0,5,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(obj.size*0.5,0,5,0,Math.PI*2); ctx.fill()
    } else if (obj.type === 'skull') {
      ctx.fillStyle = 'rgba(185,175,155,0.5)'; ctx.beginPath(); ctx.arc(0,0,obj.size*0.5,0,Math.PI*2); ctx.fill()
      ctx.fillStyle = '#060210'
      ctx.beginPath(); ctx.arc(-obj.size*0.14,-obj.size*0.04,obj.size*0.1,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(obj.size*0.14,-obj.size*0.04,obj.size*0.1,0,Math.PI*2); ctx.fill()
    } else if (obj.type === 'web') {
      const alpha = 0.18 + 0.08*Math.sin(t*1.8+obj.variant*1.4)
      ctx.strokeStyle = `rgba(170,150,210,${alpha})`; ctx.lineWidth = 0.8
      for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*obj.size,Math.sin(a)*obj.size); ctx.stroke() }
      for (let ring=1;ring<=4;ring++) { const r2=ring/4*obj.size; ctx.beginPath(); for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; if(i===0) ctx.moveTo(Math.cos(a)*r2,Math.sin(a)*r2); else ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2) } ctx.closePath(); ctx.stroke() }
    } else if (obj.type === 'crystal') {
      const ice = arenaType === 'wyrm'
      const glow = ctx.createRadialGradient(0,0,0,0,0,obj.size)
      if (ice) { glow.addColorStop(0,'rgba(140,220,255,0.5)'); glow.addColorStop(1,'rgba(80,160,230,0.05)') }
      else { glow.addColorStop(0,'rgba(255,130,30,0.5)'); glow.addColorStop(1,'rgba(255,80,0,0.05)') }
      ctx.fillStyle = glow; ctx.strokeStyle = ice ? 'rgba(170,230,255,0.7)' : 'rgba(255,150,60,0.7)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0,-obj.size); ctx.lineTo(obj.size*0.4,-obj.size*0.2); ctx.lineTo(obj.size*0.25,obj.size*0.6); ctx.lineTo(-obj.size*0.25,obj.size*0.6); ctx.lineTo(-obj.size*0.4,-obj.size*0.2); ctx.closePath()
      ctx.fill(); ctx.stroke()
    } else if (obj.type === 'ruin') {
      ctx.fillStyle = arenaType==='griffin'?'rgba(60,75,100,0.55)':'rgba(50,40,28,0.55)'
      ctx.fillRect(-obj.size*0.35,-obj.size,obj.size*0.7,obj.size); ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;ctx.strokeRect(-obj.size*0.35,-obj.size,obj.size*0.7,obj.size)
    } else if (obj.type === 'nest') {
      ctx.strokeStyle = 'rgba(130,95,55,0.4)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0,0,obj.size,0,Math.PI*2); ctx.stroke()
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(130,95,55,0.25)'; ctx.beginPath(); ctx.arc(0,0,obj.size*0.6,0,Math.PI*2); ctx.stroke()
    } else if (obj.type === 'claw') {
      ctx.strokeStyle = 'rgba(170,155,75,0.5)'; ctx.lineWidth = 3
      for (let i=0;i<3;i++) { const a=Math.PI+(i-1)*0.38; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*obj.size,Math.sin(a)*obj.size); ctx.stroke() }
    }
    ctx.restore()
  }
  void t
}

function renderBoss(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId, t: number) {
  const b = g.boss, bossDef = BOSS_DEFS[bossId]
  ctx.save(); ctx.translate(b.pos.x, b.pos.y)
  const hitW = b.hitFlash > 0 && Math.sin(b.hitFlash*80)>0

  if (bossId === 0) {
    // ── SPIDER QUEEN ── enlarged, web-dripping horror
    ctx.shadowColor = g.bossEnraged ? '#FF0055' : '#8E44AD'; ctx.shadowBlur = g.bossEnraged ? 55 : 32
    const sz = bossDef.size
    // 8 animated legs with 2 segments each
    for (let i=0;i<8;i++) {
      const side = i<4?-1:1, li=i%4
      const baseA = (side===-1?Math.PI:0)+(li-1.5)*0.44
      const wave = Math.sin(b.legPhase+i*0.85)*0.4
      const knee = v(Math.cos(baseA+wave)*sz*1.0, Math.sin(baseA+wave)*sz*1.0)
      const tip  = v(Math.cos(baseA+wave*1.7)*sz*2.5, Math.sin(baseA+wave*1.7+0.5)*sz*2.5)
      // outer glow
      ctx.strokeStyle = g.bossEnraged?'rgba(220,0,100,0.25)':'rgba(100,30,160,0.2)'; ctx.lineWidth=10+li
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(knee.x,knee.y,tip.x,tip.y); ctx.stroke()
      // main leg
      ctx.strokeStyle = g.bossEnraged?'#7A1848':'#3D1560'; ctx.lineWidth=4.5-li*0.3
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(knee.x,knee.y,tip.x,tip.y); ctx.stroke()
      // claw tip
      ctx.fillStyle = g.bossEnraged?'#FF0066':'#6A20A0'
      ctx.beginPath(); ctx.arc(tip.x,tip.y,4,0,Math.PI*2); ctx.fill()
    }
    // abdomen
    const abdGr = ctx.createRadialGradient(-sz*0.3,-sz*0.2,0,0,sz*0.15,sz*1.15)
    abdGr.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#5C0025':'#2A0850'))
    abdGr.addColorStop(0.5,hitW?'#EEE':(g.bossEnraged?'#7A1848':'#4A1275'))
    abdGr.addColorStop(1,hitW?'#CCC':(g.bossEnraged?'#3A0020':'#1A0535'))
    ctx.fillStyle=abdGr; ctx.beginPath(); ctx.ellipse(0,sz*0.2,sz*0.95,sz*1.05,0,0,Math.PI*2); ctx.fill()
    // skull pattern on abdomen
    if (!hitW) {
      ctx.strokeStyle=g.bossEnraged?'rgba(255,0,60,0.35)':'rgba(160,60,220,0.3)'; ctx.lineWidth=1.5
      for (let i=0;i<3;i++) { const oa=i*Math.PI*2/3+t*0.4; ctx.beginPath(); ctx.arc(Math.cos(oa)*sz*0.35,sz*0.2+Math.sin(oa)*sz*0.35,sz*0.12,0,Math.PI*2); ctx.stroke() }
    }
    // cephalothorax
    const headGr = ctx.createRadialGradient(-5,-sz*0.5,0,0,-sz*0.45,sz*0.58)
    headGr.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#7A1848':'#5D1E8A')); headGr.addColorStop(1,hitW?'#EEE':'#1A0535')
    ctx.fillStyle=headGr; ctx.beginPath(); ctx.ellipse(0,-sz*0.5,sz*0.55,sz*0.48,0,0,Math.PI*2); ctx.fill()
    // chelicerae (fangs)
    ctx.strokeStyle=g.bossEnraged?'#FF3366':'#7A20B0'; ctx.lineWidth=3
    ctx.beginPath(); ctx.moveTo(-8,-sz*0.75); ctx.quadraticCurveTo(-18,-sz*0.95,-10,-sz*1.1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo( 8,-sz*0.75); ctx.quadraticCurveTo( 18,-sz*0.95, 10,-sz*1.1); ctx.stroke()
    // venom drip
    if (!hitW) {
      ctx.fillStyle=`rgba(${g.bossEnraged?'255,0,80':'120,30,200'},${0.5+0.3*Math.sin(t*3.5)})`
      for (let i=0;i<3;i++) { const dx=(i-1)*sz*0.28; ctx.beginPath(); ctx.ellipse(dx,sz*0.62+Math.sin(t*2.2+i)*7,4,11+Math.sin(t*4+i)*5,0,0,Math.PI*2); ctx.fill() }
    }
    // 8 red eyes
    const eyePts=[v(-18,-sz*0.56),v(-7,-sz*0.63),v(7,-sz*0.63),v(18,-sz*0.56),v(-20,-sz*0.45),v(-8,-sz*0.43),v(8,-sz*0.43),v(20,-sz*0.45)]
    eyePts.forEach((ep,ei) => {
      const ep2=0.6+0.4*Math.sin(t*6+ei*0.8)
      ctx.shadowColor='#FF0000'; ctx.shadowBlur=14*ep2
      ctx.fillStyle=hitW?'#FFF':(g.bossEnraged?'#FF0000':'#CC0000')
      ctx.beginPath(); ctx.arc(ep.x,ep.y,3.8*ep2,0,Math.PI*2); ctx.fill()
    })
    if (g.bossEnraged) { ctx.fillStyle=`rgba(200,0,80,${0.14+0.08*Math.sin(t*7)})`; ctx.beginPath(); ctx.arc(0,0,sz*1.3,0,Math.PI*2); ctx.fill() }
    if (g.webProcAnim && dist(g.webProcAnim.pos,b.pos)<50) { ctx.strokeStyle=`rgba(200,160,255,${g.webProcAnim.timer})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,sz+15,0,Math.PI*2); ctx.stroke() }

  } else if (bossId === 1) {
    // ── LAVA DRAKE ── trail-following serpentine snake
    const sz = bossDef.size
    const pulse = Math.sin(t * 4.2)
    const enr = g.bossEnraged

    // ── Sample body segment positions from snake trail (b.pos-relative world coords, no rotation) ──
    const N2 = 8
    const SEG_SPACING = sz * 0.50   // arc-length between segment anchors
    const bw2 = [ sz*0.76, sz*0.64, sz*0.53, sz*0.43, sz*0.34, sz*0.24, sz*0.15, sz*0.07 ]
    const px2: number[] = [0]   // segment 0 = head = origin in b.pos-relative context
    const py2: number[] = [0]
    {
      const tl = g.snakeTrail
      let remain = SEG_SPACING, spx = b.pos.x, spy = b.pos.y, ti = tl.length - 1
      while (px2.length < N2) {
        if (ti < 0) {
          // Trail too short — extrapolate linearly behind last segment
          const li = px2.length - 1
          const bkx = li > 0 ? px2[li]-px2[li-1] : -Math.cos(b.angle)*SEG_SPACING
          const bky = li > 0 ? py2[li]-py2[li-1] : -Math.sin(b.angle)*SEG_SPACING
          const bklen = Math.sqrt(bkx*bkx+bky*bky) || SEG_SPACING
          px2.push(px2[li] + bkx/bklen*SEG_SPACING)
          py2.push(py2[li] + bky/bklen*SEG_SPACING)
          continue
        }
        const tp = tl[ti]
        const dx = tp.x - spx, dy = tp.y - spy
        const d = Math.sqrt(dx*dx+dy*dy)
        if (d < remain) {
          remain -= d; spx = tp.x; spy = tp.y; ti--
        } else {
          const frac2 = remain/d
          spx += dx*frac2; spy += dy*frac2
          px2.push(spx - b.pos.x); py2.push(spy - b.pos.y)
          remain = SEG_SPACING
        }
      }
    }
    // Segment start/end using midpoint quadratic technique
    const sS = (i: number) => i === 0 ? {x: px2[0], y: py2[0]} : {x: (px2[i-1]+px2[i])/2, y: (py2[i-1]+py2[i])/2}
    const sE = (i: number) => i >= N2-2 ? {x: px2[N2-1], y: py2[N2-1]} : {x: (px2[i]+px2[i+1])/2, y: (py2[i]+py2[i+1])/2}

    // Pass 1: outer glow
    if (!hitW) {
      ctx.shadowColor = enr ? '#FF1100' : '#FF5500'; ctx.shadowBlur = enr ? 32 : 20
      for (let i = 0; i < N2-1; i++) {
        const s2 = sS(i), e2 = sE(i)
        ctx.strokeStyle = enr ? 'rgba(255,28,0,0.14)' : 'rgba(210,72,0,0.11)'
        ctx.lineWidth = bw2[i]+22; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
      }
      ctx.shadowBlur = 0
    }
    // Pass 2: dark outline
    for (let i = 0; i < N2-1; i++) {
      const s2 = sS(i), e2 = sE(i)
      ctx.strokeStyle = hitW ? '#FFF' : (enr ? '#900D00' : '#570900')
      ctx.lineWidth = bw2[i]+8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
    }
    // Pass 3: main body color — bright orange-red at head, darker toward tail
    for (let i = 0; i < N2-1; i++) {
      const s2 = sS(i), e2 = sE(i)
      const frac = i / Math.max(1, N2-2)
      const rv = Math.round(hitW ? 255 : enr ? 228-frac*54 : 182-frac*52)
      const gv = Math.round(hitW ? 255 : enr ? 50-frac*20 : 28-frac*14)
      ctx.strokeStyle = hitW ? '#FFF' : `rgb(${rv},${gv},0)`
      ctx.lineWidth = bw2[i]; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
    }
    // Pass 4: bright inner highlight stripe
    if (!hitW) {
      for (let i = 0; i < N2-1; i++) {
        const s2 = sS(i), e2 = sE(i)
        const al = Math.max(0, 0.62 - (i / Math.max(1,N2-2)) * 0.52)
        ctx.strokeStyle = enr ? `rgba(255,152,18,${al})` : `rgba(255,172,28,${al})`
        ctx.lineWidth = bw2[i]*0.40; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
      }
    }
    // ── TAIL TIP — permanent glowing yellow orb (also flares when ready to whip) ──
    {
      const tipX2 = px2[N2-1], tipY2 = py2[N2-1]
      const tipPulse = 0.5 + 0.5*Math.sin(t * 5.5)
      const flare = g.tailWhipCd <= 0.3 ? 1.0 : 0.5
      ctx.shadowColor = '#FFEE00'; ctx.shadowBlur = (20 + tipPulse*16) * flare
      ctx.fillStyle = `rgb(255,${Math.round(210+45*tipPulse)},${Math.round(20*tipPulse)})`
      ctx.beginPath(); ctx.arc(tipX2, tipY2, bw2[N2-1]*2.4 + tipPulse*5, 0, Math.PI*2); ctx.fill()
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 10 * flare
      ctx.fillStyle = `rgba(255,255,${Math.round(160+95*tipPulse)},${0.75+tipPulse*0.25})`
      ctx.beginPath(); ctx.arc(tipX2, tipY2, bw2[N2-1]*1.1 + tipPulse*2, 0, Math.PI*2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // ── SEGMENT BANDS — visible dark rings marking body divisions ──
    if (!hitW) {
      for (let i = 1; i < N2-1; i++) {
        const dxa = px2[Math.min(i+1,N2-1)]-px2[Math.max(i-1,0)]
        const dya = py2[Math.min(i+1,N2-1)]-py2[Math.max(i-1,0)]
        const pa = Math.atan2(dya, dxa)
        const r = bw2[i]*0.76
        ctx.strokeStyle = enr ? `rgba(55,3,0,0.65)` : `rgba(38,4,0,0.58)`
        ctx.lineWidth = bw2[i]*0.18
        ctx.beginPath(); ctx.arc(px2[i], py2[i], r, pa+Math.PI*0.22, pa+Math.PI*0.78); ctx.stroke()
        ctx.beginPath(); ctx.arc(px2[i], py2[i], r, pa-Math.PI*0.78, pa-Math.PI*0.22); ctx.stroke()
      }
    }

    // ── LEGS — 4 pairs, thin dark sticks with 3-claw tips ──
    ctx.lineCap = 'round'
    for (const li of [2, 4]) {
      if (li >= N2-1) continue
      const dxl = px2[Math.min(li+1,N2-1)]-px2[Math.max(li-1,0)]
      const dyl = py2[Math.min(li+1,N2-1)]-py2[Math.max(li-1,0)]
      const bAng = Math.atan2(dyl, dxl)
      for (const sd of [-1, 1]) {
        const pAng = bAng + Math.PI/2*sd
        const anim = Math.sin(t*2.6+li*1.3+sd*0.7)*0.18
        const baseX = px2[li]+Math.cos(pAng)*bw2[li]*0.44
        const baseY = py2[li]+Math.sin(pAng)*bw2[li]*0.44
        const kAng = pAng + anim
        const kx = baseX+Math.cos(kAng)*sz*0.40, ky = baseY+Math.sin(kAng)*sz*0.40
        const fAng = kAng + 0.44
        const fx = kx+Math.cos(fAng)*sz*0.30, fy = ky+Math.sin(fAng)*sz*0.30
        ctx.strokeStyle = hitW?'#FFF':(enr?'#5A0C00':'#2C0800'); ctx.lineWidth = sz*0.10
        ctx.beginPath(); ctx.moveTo(baseX,baseY); ctx.lineTo(kx,ky); ctx.stroke()
        ctx.strokeStyle = hitW?'#EEE':(enr?'#7A1600':'#481000'); ctx.lineWidth = sz*0.07
        ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(fx,fy); ctx.stroke()
        ctx.lineCap = 'butt'; ctx.lineWidth = 1.6
        ctx.strokeStyle = hitW?'#FFF':(enr?'#FF5500':'#CC3300')
        for (let c = 0; c < 3; c++) {
          ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+Math.cos(fAng-0.36+c*0.34)*sz*0.16, fy+Math.sin(fAng-0.36+c*0.34)*sz*0.16); ctx.stroke()
        }
        ctx.lineCap = 'round'
      }
    }
    ctx.lineCap = 'butt'

    // ── HEAD — polygon dragon head (wedge skull + jaw + teeth + horns) ──
    ctx.save(); ctx.rotate(b.angle)
    const hx = 0   // head center = b.pos in rotated frame
    const hGrad = ctx.createLinearGradient(hx-sz*0.50, 0, hx+sz*0.60, 0)
    hGrad.addColorStop(0,    hitW?'#CCC':(enr?'#7A0E00':'#4A0E00'))
    hGrad.addColorStop(0.42, hitW?'#FFF':(enr?'#DD2200':'#AA2000'))
    hGrad.addColorStop(0.80, hitW?'#FFF':(enr?'#FF3800':'#CC2A00'))
    hGrad.addColorStop(1,    hitW?'#EEE':(enr?'#CC2200':'#A01800'))
    // Upper skull + snout wedge (wide back → pointed snout)
    ctx.fillStyle = hGrad
    ctx.beginPath()
    ctx.moveTo(hx-sz*0.50, -sz*0.36)
    ctx.quadraticCurveTo(hx-sz*0.06, -sz*0.45, hx+sz*0.22, -sz*0.13)
    ctx.lineTo(hx+sz*0.62,  sz*0.02)
    ctx.lineTo(hx+sz*0.60,  sz*0.10)
    ctx.lineTo(hx+sz*0.26,  sz*0.22)
    ctx.lineTo(hx-sz*0.06,  sz*0.28)
    ctx.lineTo(hx-sz*0.50,  sz*0.26)
    ctx.closePath(); ctx.fill()
    // Lower jaw
    ctx.fillStyle = hitW?'#CCC':(enr?'#AA1800':'#7A1200')
    ctx.beginPath()
    ctx.moveTo(hx-sz*0.12,  sz*0.26)
    ctx.lineTo(hx+sz*0.30,  sz*0.22)
    ctx.lineTo(hx+sz*0.50,  sz*0.40)
    ctx.lineTo(hx+sz*0.14,  sz*0.54)
    ctx.lineTo(hx-sz*0.14,  sz*0.50)
    ctx.closePath(); ctx.fill()
    // Upper teeth
    ctx.fillStyle = hitW?'#FFF':'#E8DFC2'
    for (let i = 0; i < 5; i++) {
      const tx = hx+sz*0.54-i*sz*0.13, ty = sz*0.10+i*sz*0.022
      ctx.beginPath(); ctx.moveTo(tx-sz*0.05,ty); ctx.lineTo(tx,ty+sz*(0.11-i*0.014)); ctx.lineTo(tx+sz*0.05,ty); ctx.closePath(); ctx.fill()
    }
    // Lower teeth
    ctx.fillStyle = hitW?'#EEE':'#D4CAB2'
    for (let i = 0; i < 4; i++) {
      const tx = hx+sz*0.44-i*sz*0.11, ty = sz*0.34-i*sz*0.016
      ctx.beginPath(); ctx.moveTo(tx-sz*0.04,ty); ctx.lineTo(tx,ty-sz*(0.09-i*0.012)); ctx.lineTo(tx+sz*0.04,ty); ctx.closePath(); ctx.fill()
    }
    // Skull armor plates
    if (!hitW) {
      ctx.fillStyle = enr?'rgba(80,6,0,0.52)':'rgba(52,4,0,0.48)'
      for (let i = 0; i < 4; i++) {
        const hpx=hx-sz*0.38+i*sz*0.20, hpy=-sz*0.28+i*sz*0.05
        ctx.beginPath(); ctx.moveTo(hpx,hpy); ctx.lineTo(hpx+sz*0.14,hpy+sz*0.04); ctx.lineTo(hpx+sz*0.10,hpy+sz*0.15); ctx.lineTo(hpx-sz*0.04,hpy+sz*0.11); ctx.closePath(); ctx.fill()
      }
    }
    // Brow ridge
    ctx.fillStyle = hitW?'#BBB':'#5A3808'
    ctx.beginPath(); ctx.moveTo(hx-sz*0.18,-sz*0.20); ctx.lineTo(hx+sz*0.14,-sz*0.15); ctx.lineTo(hx+sz*0.10,-sz*0.06); ctx.lineTo(hx-sz*0.22,-sz*0.10); ctx.closePath(); ctx.fill()
    // Swept-back horns
    ctx.fillStyle = hitW?'#FFF':'#8A6510'
    ctx.beginPath(); ctx.moveTo(hx-sz*0.30,-sz*0.30); ctx.quadraticCurveTo(hx-sz*0.54,-sz*0.82,hx-sz*0.68,-sz*0.92); ctx.quadraticCurveTo(hx-sz*0.50,-sz*0.76,hx-sz*0.22,-sz*0.22); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(hx-sz*0.15,-sz*0.24); ctx.quadraticCurveTo(hx-sz*0.36,-sz*0.72,hx-sz*0.46,-sz*0.80); ctx.quadraticCurveTo(hx-sz*0.30,-sz*0.62,hx-sz*0.10,-sz*0.17); ctx.closePath(); ctx.fill()
    // Glowing nostril
    if (!hitW) {
      ctx.fillStyle=`rgba(255,${110+Math.floor(pulse*70)},0,${0.55+pulse*0.25})`
      ctx.shadowColor='#FF5500'; ctx.shadowBlur=12
      ctx.beginPath(); ctx.ellipse(hx+sz*0.54,sz*0.00,5,3.5,0.20,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur=0
    }
    // Single glowing green eye
    const ep=0.68+0.32*Math.sin(t*5.2)
    ctx.shadowColor=enr?'#FF0000':'#00FF88'; ctx.shadowBlur=26*ep
    ctx.fillStyle=enr?`rgb(255,${Math.floor(80+90*ep)},0)`:'#22FF88'
    ctx.beginPath(); ctx.arc(hx+sz*0.06,-sz*0.24,9,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#000'; ctx.shadowBlur=0
    ctx.beginPath(); ctx.ellipse(hx+sz*0.07,-sz*0.24,2.5,5.5,0.14,0,Math.PI*2); ctx.fill()
    ctx.restore()  // end head rotation


    // ── ENRAGE AURA ──
    if (enr) {
      const ar=bossDef.size*1.65+pulse*12
      const aura=ctx.createRadialGradient(0,0,ar*0.62,0,0,ar)
      aura.addColorStop(0,`rgba(255,70,0,${0.24+pulse*0.14})`); aura.addColorStop(1,'rgba(200,0,0,0)')
      ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,ar,0,Math.PI*2); ctx.fill()
      ctx.shadowColor='#FF4400'; ctx.shadowBlur=14
      for (let i=0;i<8;i++) {
        const ea=t*4.0+i*Math.PI*0.25, er=bossDef.size*1.42+Math.sin(t*4.5+i)*16
        ctx.fillStyle=`rgba(255,${90+Math.floor(Math.sin(t*5.5+i)*75)},0,${0.72+0.28*Math.sin(t*6+i)})`
        ctx.beginPath(); ctx.arc(Math.cos(ea)*er,Math.sin(ea)*er,5.0,0,Math.PI*2); ctx.fill()
      }
      ctx.shadowBlur=0
    }

  } else if (bossId === 2) {
    // ── STORM GRIFFIN ── majestic feathered raptor-lion, storm-charged wings
    const sz = bossDef.size
    const enr = g.bossEnraged
    const flap = Math.sin(t * 3.0)               // wing-flap cycle (-1..1)
    const charge = 0.5 + 0.5 * Math.sin(t * 5.0) // storm-charge pulse (0..1)

    // ── palette ──
    const cDark   = hitW ? '#FFFFFF' : (enr ? '#27324d' : '#2b3043')
    const cMid    = hitW ? '#FFFFFF' : (enr ? '#52688f' : '#535b73')
    const cLight  = hitW ? '#FFFFFF' : (enr ? '#d4ecff' : '#c6cee0')
    const cEdge   = enr ? '#62e6ff' : '#a4c2ff'
    const cGlow   = enr ? '#00d6ff' : '#7099ff'
    const cViolet = enr ? '#b388ff' : '#9d86e0'
    const cGold   = hitW ? '#FFF' : '#dcad3c'
    const cGoldDk = hitW ? '#DDD' : '#7d5811'

    // ── lighting/feather helpers ──
    const feather = (cx: number, cy: number, ang: number, len: number, wid: number, base: string, tip: string, lit: boolean) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang)
      const gr = ctx.createLinearGradient(0, 0, len, 0)
      gr.addColorStop(0, base); gr.addColorStop(0.62, tip); gr.addColorStop(1, lit ? cEdge : tip)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(len * 0.45, -wid, len, -wid * 0.16)
      ctx.quadraticCurveTo(len * 1.06, 0, len, wid * 0.16)
      ctx.quadraticCurveTo(len * 0.45, wid, 0, 0)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = lit ? cEdge : 'rgba(18,22,38,0.5)'; ctx.lineWidth = Math.max(1, wid * 0.12)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.95, 0); ctx.stroke()
      ctx.restore()
    }
    const bolt = (x1: number, y1: number, x2: number, y2: number, segs: number, jit: number, col: string, w: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x1, y1)
      const nx = -(y2 - y1), ny = (x2 - x1), nl = Math.hypot(nx, ny) || 1
      for (let s = 1; s < segs; s++) {
        const f = s / segs, mx = x1 + (x2 - x1) * f, my = y1 + (y2 - y1) * f
        const off = (Math.sin(t * 22 + s * 2.3 + x1 * 0.05) + Math.cos(s * 3.7 + y1 * 0.05)) * jit
        ctx.lineTo(mx + nx / nl * off, my + ny / nl * off)
      }
      ctx.lineTo(x2, y2); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineCap = 'butt'
    }

    // ── storm backlight (unrotated) ──
    {
      const ar = sz * (2.0 + charge * 0.22)
      const bg = ctx.createRadialGradient(0, 0, sz * 0.3, 0, 0, ar)
      bg.addColorStop(0, enr ? `rgba(0,200,255,${0.20 + charge * 0.12})` : `rgba(95,135,235,${0.12 + charge * 0.06})`)
      bg.addColorStop(1, 'rgba(40,30,80,0)')
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, ar, 0, Math.PI * 2); ctx.fill()
    }

    ctx.shadowColor = enr ? '#00ccff' : '#7a9cff'; ctx.shadowBlur = enr ? 32 : 16
    ctx.save(); ctx.rotate(b.angle)   // head faces +x (toward player)

    // ── wings (behind body) ──
    const drawWing = (side: number) => {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const lenScale = 0.90 + Math.max(0, flap) * 0.14
      const flapAng = side * flap * 0.20
      const N = 11
      // back layer — darker, longer, for depth
      for (let i = 0; i < N; i++) {
        const frac = i / (N - 1)
        feather(shX, shY, side * (Math.PI / 2 - 0.66 + frac * 1.62) + flapAng, sz * (1.45 + frac * 1.45) * lenScale, sz * (0.40 - frac * 0.16), cDark, cMid, false)
      }
      // front layer — lighter, glowing outer primaries
      for (let i = 0; i < N; i++) {
        const frac = i / (N - 1)
        feather(shX + side * sz * 0.02, shY, side * (Math.PI / 2 - 0.60 + frac * 1.54) + flapAng, sz * (1.18 + frac * 1.30) * lenScale, sz * (0.30 - frac * 0.11), cMid, cLight, i >= N - 4)
      }
      // shoulder coverts
      for (let i = 0; i < 6; i++) {
        const frac = i / 5
        feather(shX, shY, side * (Math.PI / 2 - 0.5 + frac * 1.3) + flapAng * 0.5, sz * (0.55 + frac * 0.3), sz * 0.20, cDark, cMid, false)
      }
    }
    drawWing(-1); drawWing(1)
    ctx.shadowBlur = 0

    // ── tail feathers (bird rectrices, fanned back) ──
    {
      const sway = Math.sin(t * 2.0) * 0.12
      const baseX = -sz * 0.66, tN = 7
      // back row — darker, longer (depth)
      for (let i = 0; i < tN; i++) {
        const fr = i / (tN - 1) - 0.5
        feather(baseX, fr * sz * 0.08, Math.PI + fr * 1.0 + sway, sz * (1.12 - Math.abs(fr) * 0.40), sz * 0.17, cDark, cMid, false)
      }
      // front row — lighter, glowing center plumes
      for (let i = 0; i < tN; i++) {
        const fr = i / (tN - 1) - 0.5
        feather(baseX + sz * 0.04, fr * sz * 0.06, Math.PI + fr * 0.9 + sway, sz * (0.95 - Math.abs(fr) * 0.34), sz * 0.13, cMid, cLight, Math.abs(fr) < 0.2)
      }
      // electric tip glow on the central plume
      const ta = Math.PI + sway, tl = sz * 0.95
      ctx.fillStyle = cEdge; ctx.shadowColor = cGlow; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(baseX + sz * 0.04 + Math.cos(ta) * tl, Math.sin(ta) * tl, sz * 0.07 + charge * sz * 0.02, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // ── body (eagle breast → lion rear) — slim torso ──
    const bodyG = ctx.createLinearGradient(sz * 0.5, -sz * 0.34, -sz * 0.6, sz * 0.34)
    bodyG.addColorStop(0, cLight); bodyG.addColorStop(0.55, cMid); bodyG.addColorStop(1, cDark)
    ctx.fillStyle = bodyG; ctx.beginPath(); ctx.ellipse(-sz * 0.02, 0, sz * 0.84, sz * 0.46, 0, 0, Math.PI * 2); ctx.fill()
    if (!hitW) {
      // breast feather scallops
      ctx.strokeStyle = enr ? 'rgba(185,238,255,0.4)' : 'rgba(195,210,240,0.32)'; ctx.lineWidth = 1.6
      for (let r = 0; r < 4; r++) for (let cI = -2; cI <= 2; cI++) {
        const bxp = sz * (0.18 + r * 0.16), byp = cI * sz * 0.12 + (r % 2) * sz * 0.06
        if (Math.hypot(bxp, byp) > sz * 0.66) continue
        ctx.beginPath(); ctx.arc(bxp, byp, sz * 0.09, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke()
      }
      // lion fur lines (rear)
      ctx.strokeStyle = 'rgba(18,22,38,0.35)'; ctx.lineWidth = 1.4
      for (let i = 0; i < 5; i++) { const fy = -sz * 0.24 + i * sz * 0.12; ctx.beginPath(); ctx.moveTo(-sz * 0.18, fy); ctx.lineTo(-sz * 0.62, fy + Math.sign(fy || 1) * sz * 0.05); ctx.stroke() }
    }
    // storm-charge core glow on chest
    {
      const cg = ctx.createRadialGradient(sz * 0.22, 0, 0, sz * 0.22, 0, sz * 0.52)
      cg.addColorStop(0, enr ? `rgba(120,240,255,${0.5 + charge * 0.3})` : `rgba(155,195,255,${0.32 + charge * 0.2})`)
      cg.addColorStop(1, 'rgba(60,90,180,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sz * 0.22, 0, sz * 0.52, 0, Math.PI * 2); ctx.fill()
    }

    // ── neck ruff + head (front-facing fierce raptor) ──
    const hx = sz * 0.72
    // neck ruff feathers fanning around base of skull
    if (!hitW) for (let i = 0; i < 9; i++) {
      const fr = (i / 8 - 0.5)
      feather(sz * 0.40, fr * sz * 0.72, fr * 1.1, sz * (0.40 - Math.abs(fr) * 0.12), sz * 0.13, cDark, cLight, false)
    }
    // crest feathers (swept back over crown)
    for (let i = 0; i < 7; i++) {
      const fr = (i / 6 - 0.5)
      feather(hx - sz * 0.18, fr * sz * 0.22, Math.PI + fr * 0.9 + flap * 0.05, sz * (0.52 - Math.abs(fr) * 0.18), sz * 0.11, cMid, cEdge, Math.abs(fr) < 0.2)
    }
    // skull — triangular raptor face (wide crown -> apex at the beak)
    const headG = ctx.createRadialGradient(hx + sz * 0.06, -sz * 0.06, 0, hx, 0, sz * 0.42)
    headG.addColorStop(0, cLight); headG.addColorStop(1, cMid)
    ctx.fillStyle = headG
    ctx.beginPath()
    ctx.moveTo(hx + sz * 0.40, 0)                                   // apex toward beak (front)
    ctx.quadraticCurveTo(hx + sz * 0.06, -sz * 0.30, hx - sz * 0.30, -sz * 0.40)  // top edge to crown corner
    ctx.quadraticCurveTo(hx - sz * 0.42, 0, hx - sz * 0.30, sz * 0.40)            // wide back of skull
    ctx.quadraticCurveTo(hx + sz * 0.06, sz * 0.30, hx + sz * 0.40, 0)            // bottom edge to apex
    ctx.closePath(); ctx.fill()
    // fierce brow ridges (a frowning ">  <")
    ctx.fillStyle = cDark
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx - sz * 0.02, side * sz * 0.02)
      ctx.quadraticCurveTo(hx + sz * 0.18, side * sz * 0.04, hx + sz * 0.26, side * sz * 0.24)
      ctx.quadraticCurveTo(hx + sz * 0.12, side * sz * 0.13, hx - sz * 0.02, side * sz * 0.16)
      ctx.closePath(); ctx.fill()
    }
    // ── hooked beak (centered, pointing +x) ──
    ctx.fillStyle = cGold
    ctx.beginPath()
    ctx.moveTo(hx + sz * 0.14, -sz * 0.12)
    ctx.quadraticCurveTo(hx + sz * 0.56, -sz * 0.05, hx + sz * 0.6, sz * 0.0)
    ctx.quadraticCurveTo(hx + sz * 0.5, sz * 0.12, hx + sz * 0.42, sz * 0.04)   // hook underside
    ctx.quadraticCurveTo(hx + sz * 0.56, sz * 0.05, hx + sz * 0.14, sz * 0.12)
    ctx.closePath(); ctx.fill()
    // beak ridge shading + dark hook tip
    ctx.fillStyle = cGoldDk
    ctx.beginPath(); ctx.moveTo(hx + sz * 0.42, -sz * 0.02); ctx.quadraticCurveTo(hx + sz * 0.62, sz * 0.0, hx + sz * 0.42, sz * 0.05); ctx.quadraticCurveTo(hx + sz * 0.5, sz * 0.02, hx + sz * 0.42, -sz * 0.02); ctx.closePath(); ctx.fill()
    // mouth line + cere nostrils
    ctx.strokeStyle = 'rgba(20,15,5,0.55)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(hx + sz * 0.16, 0); ctx.lineTo(hx + sz * 0.5, 0); ctx.stroke()
    ctx.fillStyle = 'rgba(20,15,5,0.7)'
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sz * 0.2, side * sz * 0.05, sz * 0.025, sz * 0.018, 0, 0, Math.PI * 2); ctx.fill() }
    // ── glowing eyes ──
    const eg = 0.6 + 0.4 * Math.sin(t * 4.5)
    for (const side of [-1, 1]) {
      const ex = hx + sz * 0.04, ey = side * sz * 0.13
      ctx.fillStyle = cDark; ctx.beginPath(); ctx.ellipse(ex, ey, sz * 0.1, sz * 0.085, 0, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = cGlow; ctx.shadowBlur = 22 * eg
      ctx.fillStyle = enr ? '#7af6ff' : '#bfe4ff'
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.06, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#05060a'
      ctx.beginPath(); ctx.ellipse(ex + sz * 0.012, ey, sz * 0.022, sz * 0.04, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex - sz * 0.02, ey - sz * 0.02, sz * 0.016, 0, Math.PI * 2); ctx.fill()
    }

    // ── storm lighting overlays ──
    // wingtip positions (back primary of each wing)
    const tipOf = (side: number) => {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const ang = side * (Math.PI / 2 - 0.66 + 1.62) + side * flap * 0.20
      const len = sz * (1.45 + 1.45) * (0.90 + Math.max(0, flap) * 0.14)
      return { x: shX + Math.cos(ang) * len, y: shY + Math.sin(ang) * len }
    }
    const wl = tipOf(-1), wr = tipOf(1)
    // rim light along leading edge of each wing
    ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 16 : 9
    ctx.strokeStyle = enr ? 'rgba(130,246,255,0.9)' : 'rgba(175,205,255,0.7)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const a = side * (Math.PI / 2 - 0.66) + side * flap * 0.20
      const l = sz * 1.45 * (0.90 + Math.max(0, flap) * 0.14)
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(shX + Math.cos(a) * l, shY + Math.sin(a) * l); ctx.stroke()
    }
    ctx.shadowBlur = 0; ctx.lineCap = 'butt'
    // crackle from wingtips toward the head
    const arcA = enr ? 0.85 : 0.4
    bolt(wl.x, wl.y, hx + sz * 0.2, 0, 6, sz * 0.1, `rgba(150,225,255,${arcA})`, enr ? 2.4 : 1.5)
    bolt(wr.x, wr.y, hx + sz * 0.2, 0, 6, sz * 0.1, `rgba(150,225,255,${arcA})`, enr ? 2.4 : 1.5)
    if (enr) {
      const vio = cViolet === '#b388ff' ? '179,136,255' : '157,134,224'
      bolt(wl.x, wl.y, wl.x - sz * 0.3, wl.y + sz * 0.4, 5, sz * 0.12, `rgba(${vio},0.75)`, 1.6)
      bolt(wr.x, wr.y, wr.x + sz * 0.3, wr.y + sz * 0.4, 5, sz * 0.12, `rgba(${vio},0.75)`, 1.6)
    }
    // ── extra storm crackle — leaps along the wing primaries + spits from the chest core (both phases, flickering with the charge pulse) ──
    const wingPt = (side: number, frac: number) => {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const ang = side * (Math.PI / 2 - 0.66 + frac * 1.62) + side * flap * 0.20
      const len = sz * (1.45 + frac * 1.45) * (0.90 + Math.max(0, flap) * 0.14)
      return { x: shX + Math.cos(ang) * len, y: shY + Math.sin(ang) * len }
    }
    if (charge > 0.35 || enr) for (const side of [-1, 1]) {
      const a = wingPt(side, 0.25), bpt = wingPt(side, 0.62), c = wingPt(side, 1.0)
      const col = enr ? 'rgba(140,245,255,0.75)' : `rgba(175,210,255,${0.3 + charge * 0.35})`
      bolt(a.x, a.y, bpt.x, bpt.y, 5, sz * 0.1, col, enr ? 1.9 : 1.3)
      bolt(bpt.x, bpt.y, c.x, c.y, 6, sz * 0.13, col, enr ? 1.9 : 1.3)
    }
    { const n = enr ? 4 : 2; for (let i = 0; i < n; i++) { const a = t * 5.5 + i * (Math.PI * 2 / n), cxp = sz * 0.22
        bolt(cxp + Math.cos(a) * sz * 0.14, Math.sin(a) * sz * 0.14, cxp + Math.cos(a + 0.6) * sz * 0.4, Math.sin(a + 0.6) * sz * 0.4, 4, sz * 0.07, enr ? 'rgba(120,240,255,0.6)' : `rgba(160,195,255,${0.35 + charge * 0.25})`, 1.3) } }
    // a charged bolt arcing wingtip-to-wingtip across the back (subtle in normal, bright when enraged)
    bolt(wl.x, wl.y, wr.x, wr.y, enr ? 11 : 8, sz * (enr ? 0.2 : 0.13), `rgba(150,235,255,${enr ? 0.82 : 0.3 + charge * 0.25})`, enr ? 2.3 : 1.5)
    ctx.restore()   // end rotated frame

    // ── orbiting storm sparks + halo (unrotated) ──
    const sparkN = enr ? 7 : 4
    ctx.shadowColor = cGlow; ctx.shadowBlur = 12
    for (let i = 0; i < sparkN; i++) {
      const sa = t * (enr ? 3.2 : 2.0) + i * (Math.PI * 2 / sparkN)
      const sr = sz * 1.15 + Math.sin(t * 4 + i) * sz * 0.1
      ctx.fillStyle = enr ? `rgba(120,240,255,${0.5 + 0.4 * Math.sin(t * 6 + i)})` : `rgba(155,185,255,${0.45 + 0.35 * Math.sin(t * 6 + i)})`
      ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, enr ? 4.5 : 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.shadowBlur = 0
    { const nb = enr ? 7 : 3
      for (let i = 0; i < nb; i++) { const a = t * 4 + i * (Math.PI * 2 / nb)
        bolt(Math.cos(a) * sz * 1.05, Math.sin(a) * sz * 1.05, Math.cos(a + 0.4) * sz * 1.5, Math.sin(a + 0.4) * sz * 1.5, 4, sz * 0.08, enr ? 'rgba(100,230,255,0.6)' : `rgba(150,190,255,${0.32 + charge * 0.2})`, 1.6) } }
    // ── periodic sky-lightning strike crashing down onto the griffin ──
    { const period = enr ? 1.5 : 2.8, ph = (t % period) / period, flash = ph < 0.12 ? 1 - ph / 0.12 : 0
      if (flash > 0) {
        const seed = Math.floor(t / period), rx = (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * sz * 0.7, ix = rx * 0.35
        ctx.globalAlpha = flash
        bolt(rx, -sz * 3.4, ix, -sz * 0.1, 10, sz * 0.24, 'rgba(190,245,255,0.95)', 3.4)
        bolt(rx, -sz * 3.4, ix, -sz * 0.1, 10, sz * 0.24, 'rgba(255,255,255,0.85)', 1.5)
        bolt(rx * 0.7, -sz * 1.7, rx * 0.7 - sz * 0.5, -sz * 1.1, 4, sz * 0.12, 'rgba(170,235,255,0.8)', 1.8)
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        const ig = ctx.createRadialGradient(ix, -sz * 0.1, 0, ix, -sz * 0.1, sz * 0.95)
        ig.addColorStop(0, `rgba(205,245,255,${0.55 * flash})`); ig.addColorStop(1, 'rgba(120,200,255,0)')
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, -sz * 0.1, sz * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore()
        ctx.globalAlpha = 1
      }
    }
  } else {
    // ── FROST WYRM ── a colossal winged frost-dragon. Wings SPREAD = airborne (ranged-only); FOLDED = grounded (melee-only).
    const sz = bossDef.size, enr = g.bossEnraged
    const spread = clamp(g.wyrmWing, 0, 1)
    const flap = Math.sin(t * 3.2)
    const breatheCy = 0.5 + 0.5 * Math.sin(t * 1.45)        // lung cycle 0..1
    const breath = (breatheCy - 0.5) * sz * 0.04            // body heave (±)
    const idleBob = Math.sin(t * 1.45) * sz * 0.02          // gentle whole-body bob
    const headNod = Math.sin(t * 1.2) * sz * 0.03           // head dips & rises
    const headTurn = Math.sin(t * 0.6) * 0.07               // slow side-to-side scan
    const brScale = 1 + breatheCy * 0.02                    // subtle breathing swell
    const blink = (t % 3.4) < 0.13 ? 0.12 : 1               // occasional eye blink
    const lift = spread * (24 + flap * 9) + idleBob * 0.6
    const cDark = hitW ? '#FFF' : (enr ? '#155878' : '#1c4459')
    const cMid  = hitW ? '#FFF' : (enr ? '#3f93c2' : '#3a78a0')
    const cLite = hitW ? '#FFF' : (enr ? '#bdeeff' : '#9fdcff')
    const cMem  = enr ? 'rgba(120,232,255,0.46)' : 'rgba(150,222,255,0.38)'
    const cMemEdge = enr ? '#bdf0ff' : '#dff3ff'
    const cEdge = enr ? '#9fe8ff' : '#cfeeff'
    const cGlow = enr ? '#00d6ff' : '#7fd4ff'
    const cHorn = hitW ? '#FFF' : '#eaf6fc'
    const cIce  = hitW ? '#FFF' : '#bfe9f7'
    // ── ground frost ring + shadow (unrotated) ──
    ctx.save(); ctx.globalAlpha = 0.45 - spread * 0.3; ctx.strokeStyle = cGlow; ctx.lineWidth = 2; ctx.shadowColor = cGlow; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.ellipse(0, sz * 0.55 + 8, sz * 1.2, sz * 0.46, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 0.22 - spread * 0.16; ctx.lineWidth = 1.2
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * sz * 0.45, sz * 0.55 + 8 + Math.sin(a) * sz * 0.18); ctx.lineTo(Math.cos(a) * sz * 1.15, sz * 0.55 + 8 + Math.sin(a) * sz * 0.44); ctx.stroke() }
    ctx.restore()
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.ellipse(0, sz * 0.55 + 8, sz * (0.95 - spread * 0.25), sz * (0.34 - spread * 0.13), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    // ── vast cold aura ──
    ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 50 : 30
    { const ar = sz * (2.0 + spread * 0.5), bg = ctx.createRadialGradient(0, -lift, sz * 0.4, 0, -lift, ar); bg.addColorStop(0, enr ? 'rgba(0,200,255,0.20)' : 'rgba(120,200,255,0.11)'); bg.addColorStop(1, 'rgba(30,50,90,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, -lift, ar, 0, Math.PI * 2); ctx.fill() }
    ctx.shadowBlur = 0
    // ── drifting frost mist / snow ──
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 18; i++) { const ph = (t * 0.22 + i * 0.39) % 1, a = i * 2.39 + t * 0.3, rr = sz * (0.5 + ph * 1.5)
      ctx.fillStyle = `rgba(205,238,255,${(1 - ph) * 0.5})`; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, -lift + Math.sin(a) * rr * 0.55 - ph * sz * 0.35, (1 - ph) * 2.4 + 0.5, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()

    ctx.save(); ctx.translate(0, -lift); ctx.rotate(b.angle); ctx.scale(brScale, brScale)
    // ── WINGS — true bat/dragon wings: arm → wrist → finger digits with a scalloped membrane ──
    const drawWing = (side: number) => {
      ctx.save(); ctx.translate(sz * 0.2, side * sz * 0.1)   // attach high on the body, at the shoulder
      const Lp = (a: number, b: number) => a + (b - a) * spread
      const wob = flap * 0.07 * spread + Math.sin(t * 1.1 + side * 0.6) * 0.012   // beats when open, subtle flutter when folded
      const pt = (fx: number, fy: number, ox: number, oy: number, w = 0): number[] => [Lp(fx, ox) * sz, (Lp(fy, oy) + w * wob) * sz * side]
      const S = [0, 0]
      const W = pt(-0.4, 0.18, 0.04, 0.78, 0.3)    // wrist (where the digits fan out)
      const T1 = pt(-0.96, 0.2, 0.2, 2.45, 1.0)    // wingtip (long leading finger)
      const T2 = pt(-0.86, 0.26, -0.48, 2.1, 0.85)
      const T3 = pt(-0.72, 0.3, -1.06, 1.6, 0.6)
      const T4 = pt(-0.52, 0.32, -1.46, 1.02, 0.4) // rear digit
      const R = pt(-0.2, 0.26, -0.66, 0.42)        // trailing membrane root on the body
      const scallop = (a: number[], b: number[]) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; ctx.quadraticCurveTo(mx + (W[0] - mx) * 0.26, my + (W[1] - my) * 0.26, b[0], b[1]) }
      // membrane with a sagging, scalloped trailing edge
      ctx.fillStyle = cMem; ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 16 : 9
      ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(W[0], W[1]); ctx.lineTo(T1[0], T1[1])
      scallop(T1, T2); scallop(T2, T3); scallop(T3, T4); ctx.lineTo(R[0], R[1]); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
      // membrane creases (wrist → each scallop valley)
      ctx.strokeStyle = 'rgba(190,233,247,0.16)'; ctx.lineWidth = 1
      for (const [a, b] of [[T1, T2], [T2, T3], [T3, T4]]) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(mx + (W[0] - mx) * 0.34, my + (W[1] - my) * 0.34); ctx.stroke() }
      // finger bones + arm bone
      ctx.strokeStyle = cMid; ctx.lineCap = 'round'
      ctx.lineWidth = sz * 0.045; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(W[0], W[1]); ctx.stroke()
      ctx.lineWidth = sz * 0.03
      for (const Tn of [T1, T2, T3, T4]) { ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(Tn[0], Tn[1]); ctx.stroke() }
      ctx.lineCap = 'butt'
      // glowing leading edge
      ctx.strokeStyle = spread > 0.3 ? cMemEdge : cEdge; ctx.lineWidth = 2.5; ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 12 : 6
      ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(W[0], W[1]); ctx.lineTo(T1[0], T1[1]); ctx.stroke(); ctx.shadowBlur = 0
      // wrist claw + ice wingtip when open
      if (spread > 0.25) {
        ctx.globalAlpha = spread; ctx.fillStyle = cHorn
        const cw = sz * 0.09; ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(W[0] + cw, W[1] + side * cw * 0.15); ctx.lineTo(W[0] + cw * 0.35, W[1] - side * cw * 0.35); ctx.closePath(); ctx.fill()
        ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 10
        ctx.beginPath(); ctx.moveTo(T1[0] + sz * 0.05, T1[1]); ctx.lineTo(T1[0], T1[1] - side * sz * 0.07); ctx.lineTo(T1[0] - sz * 0.05, T1[1]); ctx.lineTo(T1[0], T1[1] + side * sz * 0.07); ctx.closePath(); ctx.fill()
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
      }
      ctx.restore()
    }
    drawWing(-1); drawWing(1)
    // ── TAIL — thick serpentine length down to a spinning frozen morningstar ──
    {
      const tailAt = (u: number) => ({ x: -sz * (0.5 + u * 1.42), y: Math.sin(t * 1.8 - u * 1.7) * sz * 0.42 * u })
      const wOf = (u: number) => sz * (0.22 * (1 - u) + 0.035)
      const SEG = 16
      // dark outline pass
      ctx.fillStyle = cDark
      for (let i = 0; i <= SEG; i++) { const u = i / SEG, p = tailAt(u); ctx.beginPath(); ctx.arc(p.x, p.y, wOf(u) + 2.5, 0, Math.PI * 2); ctx.fill() }
      // body pass (lighter near the base, darker toward the tip)
      for (let i = 0; i <= SEG; i++) { const u = i / SEG, p = tailAt(u); ctx.fillStyle = u < 0.45 ? cMid : cDark; ctx.beginPath(); ctx.arc(p.x, p.y, wOf(u), 0, Math.PI * 2); ctx.fill() }
      // glowing dorsal crack down the spine
      ctx.strokeStyle = cEdge; ctx.lineWidth = 2; ctx.globalAlpha = 0.45; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
      ctx.beginPath(); for (let i = 0; i <= SEG; i++) { const p = tailAt(i / SEG); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) } ctx.stroke()
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      // a ridge of ice spikes riding the tail
      ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
      for (let i = 3; i <= 14; i += 2) { const u = i / SEG, p = tailAt(u), p2 = tailAt(u + 0.05), ang = Math.atan2(p2.y - p.y, p2.x - p.x), w = wOf(u)
        const px = Math.cos(ang - Math.PI / 2), py = Math.sin(ang - Math.PI / 2)
        ctx.beginPath(); ctx.moveTo(p.x - px * w * 0.5, p.y - py * w * 0.5); ctx.lineTo(p.x + px * (w + sz * 0.15), p.y + py * (w + sz * 0.15)); ctx.lineTo(p.x + Math.cos(ang) * w * 1.4, p.y + Math.sin(ang) * w * 1.4); ctx.closePath(); ctx.fill() }
      ctx.shadowBlur = 0
      // ── frozen morningstar at the tip ──
      const tip = tailAt(1), spin = t * 0.7
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 24 : 15
      ctx.fillStyle = cIce
      for (let i = 0; i < 8; i++) { const a = spin + i / 8 * Math.PI * 2, len = sz * (0.36 + (i % 2) * 0.12), wd = sz * 0.06
        const bx1 = Math.cos(a + Math.PI / 2) * wd, by1 = Math.sin(a + Math.PI / 2) * wd, bx2 = Math.cos(a - Math.PI / 2) * wd, by2 = Math.sin(a - Math.PI / 2) * wd
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * len, Math.sin(a) * len); ctx.lineTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.closePath(); ctx.fill() }
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.15); cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(0.5, cMemEdge); cg.addColorStop(1, cMid)
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, sz * 0.14, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.055, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
      ctx.shadowBlur = 0; ctx.restore()
    }
    // ── LIMBS — four legs in an animated diagonal-trot gait (stride + foot pick-up + knee bend); recede when airborne ──
    const baseAlpha = 1 - spread * 0.45
    ctx.globalAlpha = baseAlpha
    const drawLimb = (lx: number, dir: number) => {
      const isFront = dir > 0
      for (const side of [-1, 1]) {
        // diagonal gait — front-left strides with back-right, front-right with back-left
        const diag = (isFront === (side < 0)) ? 0 : Math.PI
        const gait = t * 2.4 + diag
        const stride = Math.sin(gait)               // −1 push back … +1 reach forward
        const lift = Math.max(0, Math.cos(gait))    // 0 planted … 1 foot lifted
        const hipX = lx, hipY = side * sz * 0.27
        // foot traces a stepping path: strides fore/aft and pulls inward as it lifts
        const footX = lx + dir * (sz * 0.3 + stride * sz * 0.13)
        const footY = side * (sz * 0.5 - lift * sz * 0.11)
        // knee/elbow: midway, kicked outward, rises a touch on lift
        const elbowX = hipX + (footX - hipX) * 0.5 + dir * sz * 0.05
        const elbowY = side * (sz * 0.4) - side * lift * sz * 0.05
        ctx.lineCap = 'round'
        // dark outline — beefy upper arm, slimmer forearm
        ctx.strokeStyle = cDark; ctx.lineWidth = sz * 0.2
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(elbowX, elbowY); ctx.stroke()
        ctx.lineWidth = sz * 0.14; ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(footX, footY); ctx.stroke()
        // muscle colour
        ctx.strokeStyle = cMid; ctx.lineWidth = sz * 0.145
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(elbowX, elbowY); ctx.stroke()
        ctx.lineWidth = sz * 0.09; ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(footX, footY); ctx.stroke()
        // sheen running down the upper arm
        ctx.strokeStyle = cLite; ctx.globalAlpha = baseAlpha * 0.4; ctx.lineWidth = sz * 0.045
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(elbowX, elbowY); ctx.stroke(); ctx.globalAlpha = baseAlpha
        // shoulder joint knob
        ctx.fillStyle = cMid; ctx.beginPath(); ctx.arc(hipX, hipY, sz * 0.12, 0, Math.PI * 2); ctx.fill()
        // dark foot pad
        ctx.fillStyle = cDark; ctx.beginPath(); ctx.ellipse(footX, footY, sz * 0.085, sz * 0.07, 0, 0, Math.PI * 2); ctx.fill()
        ctx.lineCap = 'butt'
        // three curved ice talons fanning outward & forward
        ctx.shadowColor = cGlow; ctx.shadowBlur = 6
        const baseAng = Math.atan2(side, dir)
        for (const c of [-1, 0, 1]) {
          const ang = baseAng + c * 0.42 * side
          const tx = footX + Math.cos(ang) * sz * 0.17, ty = footY + Math.sin(ang) * sz * 0.17
          const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2)
          const tg = ctx.createLinearGradient(footX, footY, tx, ty); tg.addColorStop(0, cMid); tg.addColorStop(1, cHorn)
          ctx.fillStyle = hitW ? '#FFF' : tg
          ctx.beginPath(); ctx.moveTo(footX + nx * sz * 0.028, footY + ny * sz * 0.028); ctx.lineTo(tx, ty); ctx.lineTo(footX - nx * sz * 0.028, footY - ny * sz * 0.028); ctx.closePath(); ctx.fill()
        }
        ctx.shadowBlur = 0
      }
    }
    drawLimb(-sz * 0.3, -1)   // hind legs (drawn first, behind)
    drawLimb(sz * 0.34, 1)    // forelimbs
    ctx.globalAlpha = 1
    // ── BODY — slender segmented ice-spine: a tapered chain of glowing crystalline vertebrae ──
    const bx0 = sz * 0.32, bx1 = -sz * 0.56
    const segAt = (u: number) => bx0 + (bx1 - bx0) * u
    const segH = (u: number) => sz * (0.3 - u * 0.18)          // across half-width, tapering to the tail
    const segL = (u: number) => sz * (0.14 - u * 0.055)        // along half-length of each plate
    const NB = 7
    // 1) dark connective spindle so the plates read as one continuous creature
    ctx.fillStyle = cDark
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) { const u = i / 24, x = segAt(u), y = breath - (segH(u) + 2.5); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) }
    for (let i = 24; i >= 0; i--) { const u = i / 24, x = segAt(u), y = breath + (segH(u) + 2.5); ctx.lineTo(x, y) }
    ctx.closePath(); ctx.fill()
    // 2) glowing diamond vertebra plates, brightest at the chest
    for (let i = 0; i < NB; i++) {
      const u = (i + 0.5) / NB, cx = segAt(u), h = segH(u), l = segL(u)
      ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 22 : 14
      const pg = ctx.createRadialGradient(cx, breath - h * 0.25, 0, cx, breath, h * 1.15)
      pg.addColorStop(0, hitW ? '#FFF' : cLite); pg.addColorStop(0.55, cMid); pg.addColorStop(1, cDark)
      ctx.fillStyle = hitW ? '#FFF' : pg
      ctx.beginPath()
      ctx.moveTo(cx + l, breath)
      ctx.quadraticCurveTo(cx + l * 0.35, breath - h * 0.78, cx, breath - h)
      ctx.quadraticCurveTo(cx - l * 0.35, breath - h * 0.78, cx - l, breath)
      ctx.quadraticCurveTo(cx - l * 0.35, breath + h * 0.78, cx, breath + h)
      ctx.quadraticCurveTo(cx + l * 0.35, breath + h * 0.78, cx + l, breath)
      ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0
      // bright frozen core — the chest plate pulses like a heart
      const pulse = i === 0 ? 0.65 + 0.35 * Math.sin(t * 2.4) : 0.5
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse
      const cg2 = ctx.createRadialGradient(cx, breath, 0, cx, breath, l)
      cg2.addColorStop(0, '#eafaff'); cg2.addColorStop(0.5, enr ? '#8fe6ff' : '#bfeaff'); cg2.addColorStop(1, 'rgba(120,210,255,0)')
      ctx.fillStyle = cg2; ctx.beginPath(); ctx.ellipse(cx, breath, l * 0.85, h * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      // crisp edge highlight on the leading half of each plate
      ctx.strokeStyle = enr ? 'rgba(189,243,255,0.55)' : 'rgba(207,238,255,0.45)'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(cx, breath - h); ctx.quadraticCurveTo(cx + l * 0.35, breath - h * 0.78, cx + l, breath)
      ctx.quadraticCurveTo(cx + l * 0.35, breath + h * 0.78, cx, breath + h); ctx.stroke()
    }
    // 3) prominent dorsal ice fins cresting the spine
    ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 9
    for (let i = 0; i < NB; i++) { const u = (i + 0.5) / NB, cx = segAt(u), h = segH(u), finH = sz * (0.22 - u * 0.1)
      const fg = ctx.createLinearGradient(cx, breath - h * 0.55, cx, breath - h - finH); fg.addColorStop(0, cMid); fg.addColorStop(1, cIce)
      ctx.fillStyle = hitW ? '#FFF' : fg
      ctx.beginPath(); ctx.moveTo(cx - sz * 0.055, breath - h * 0.5); ctx.lineTo(cx - sz * 0.012, breath - h - finH); ctx.lineTo(cx + sz * 0.055, breath - h * 0.5); ctx.closePath(); ctx.fill() }
    ctx.shadowBlur = 0
    // ── NECK — long arched column that flares from the chest and tapers to a slim head ──
    const headFwd = sz * 0.13   // push the head out so the neck reads long & serpentine
    {
      const nSEG = 16
      const sway = Math.sin(t * 1.3) * sz * 0.012
      const neckEndX = sz * 0.8 + headFwd
      const neckAt = (u: number) => ({ x: sz * 0.06 + u * (neckEndX - sz * 0.06), y: breath * 0.4 * (1 - u) + sway * u })
      const neckW = (u: number) => sz * (0.075 + 0.165 * Math.pow(1 - u, 1.4))   // slim, gently flaring at the chest
      const band = (pad: number) => { ctx.beginPath()
        for (let i = 0; i <= nSEG; i++) { const u = i / nSEG, p = neckAt(u), w = neckW(u) + pad; if (i === 0) ctx.moveTo(p.x, p.y - w); else ctx.lineTo(p.x, p.y - w) }
        for (let i = nSEG; i >= 0; i--) { const u = i / nSEG, p = neckAt(u), w = neckW(u) + pad; ctx.lineTo(p.x, p.y + w) }
        ctx.closePath() }
      // dark outline
      ctx.fillStyle = cDark; band(2.5); ctx.fill()
      // muscle gradient
      const ng = ctx.createLinearGradient(0, -sz * 0.32, 0, sz * 0.18); ng.addColorStop(0, cLite); ng.addColorStop(0.5, cMid); ng.addColorStop(1, cDark)
      ctx.fillStyle = ng; band(0); ctx.fill()
      // lighter throat underside
      ctx.save(); band(0); ctx.clip(); ctx.globalAlpha = 0.4; ctx.fillStyle = cLite
      ctx.beginPath(); for (let i = 0; i <= nSEG; i++) { const u = i / nSEG, p = neckAt(u), w = neckW(u); if (i === 0) ctx.moveTo(p.x, p.y + w * 0.2); else ctx.lineTo(p.x, p.y + w * 0.2) }
      for (let i = nSEG; i >= 0; i--) { const u = i / nSEG, p = neckAt(u), w = neckW(u); ctx.lineTo(p.x, p.y + w) } ctx.closePath(); ctx.fill(); ctx.restore()
      // a few plated scale divisions bowing toward the head (sparse, for a smooth neck)
      ctx.strokeStyle = 'rgba(18,40,55,0.4)'; ctx.lineWidth = 1.2
      for (let i = 2; i < nSEG; i += 3) { const u = i / nSEG, p = neckAt(u), w = neckW(u) * 0.88
        ctx.beginPath(); ctx.moveTo(p.x, p.y - w); ctx.quadraticCurveTo(p.x + w * 0.5, p.y, p.x, p.y + w); ctx.stroke() }
      // glowing dorsal spine line
      ctx.strokeStyle = cEdge; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.4; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
      ctx.beginPath(); for (let i = 0; i <= nSEG; i++) { const u = i / nSEG, p = neckAt(u), w = neckW(u); const x = p.x, y = p.y - w * 0.4; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) } ctx.stroke()
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      // delicate dorsal spikes along the crest of the neck
      ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
      for (let i = 2; i <= nSEG - 1; i += 2) { const u = i / nSEG, p = neckAt(u), w = neckW(u), h = sz * (0.1 - u * 0.04)
        ctx.beginPath(); ctx.moveTo(p.x - sz * 0.03, p.y - w * 0.85); ctx.lineTo(p.x - sz * 0.01, p.y - w - h); ctx.lineTo(p.x + sz * 0.03, p.y - w * 0.85); ctx.closePath(); ctx.fill() }
      ctx.shadowBlur = 0
    }

    // ── MASSIVE HEAD (fierce top-down skull) — nods & scans for life ──
    ctx.save(); ctx.translate(sz * 0.82 + headFwd, headNod); ctx.rotate(headTurn); ctx.translate(-sz * 0.82, 0)
    // 1) frozen CROWN — a fan of ice horns swept back over the skull (drawn first, behind it)
    // two great curved horns sweeping back, plus a small central frill
    for (const side of [-1, 1]) {
      const bx = sz * 0.84, by = side * sz * 0.12
      const hg = ctx.createLinearGradient(bx, by, sz * 0.26, side * sz * 0.42); hg.addColorStop(0, cMid); hg.addColorStop(0.55, cHorn); hg.addColorStop(1, cIce)
      ctx.fillStyle = hitW ? '#FFF' : hg; ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 12 : 8
      ctx.beginPath()
      ctx.moveTo(bx, by - side * sz * 0.055)
      ctx.quadraticCurveTo(sz * 0.55, side * sz * 0.3, sz * 0.26, side * sz * 0.42)   // outer edge to the swept tip
      ctx.quadraticCurveTo(sz * 0.5, side * sz * 0.32, sz * 0.62, side * sz * 0.2)     // tip back down the inner edge
      ctx.quadraticCurveTo(sz * 0.72, side * sz * 0.12, bx, by + side * sz * 0.055)
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
      // ridge notches along the horn
      ctx.strokeStyle = 'rgba(30,70,95,0.5)'; ctx.lineWidth = 1.5
      for (const u of [0.42, 0.68]) { const rx = bx + (sz * 0.3 - bx) * u, ry = by + (side * sz * 0.4 - by) * u; ctx.beginPath(); ctx.moveTo(rx, ry - side * sz * 0.035); ctx.lineTo(rx + sz * 0.035, ry + side * sz * 0.02); ctx.stroke() }
    }
    // small central frill spikes between the horns
    ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
    for (let i = -1; i <= 1; i++) { const bx = sz * 0.84, by = i * sz * 0.055; ctx.beginPath(); ctx.moveTo(bx, by - sz * 0.028); ctx.lineTo(bx - sz * (0.2 - Math.abs(i) * 0.06), by + i * sz * 0.05); ctx.lineTo(bx, by + sz * 0.028); ctx.closePath(); ctx.fill() }
    ctx.shadowBlur = 0
    // 2) skull — arrowhead wedge, wide cheeks tapering to a pointed snout
    const headG = ctx.createRadialGradient(sz * 1.0, -sz * 0.06, 0, sz * 0.98, 0, sz * 0.46); headG.addColorStop(0, cLite); headG.addColorStop(0.7, cMid); headG.addColorStop(1, cDark)
    ctx.fillStyle = headG
    ctx.beginPath(); ctx.moveTo(sz * 1.46, 0)
    ctx.quadraticCurveTo(sz * 1.2, -sz * 0.1, sz * 1.0, -sz * 0.17)
    ctx.quadraticCurveTo(sz * 0.82, -sz * 0.2, sz * 0.78, -sz * 0.05)
    ctx.lineTo(sz * 0.78, sz * 0.05)
    ctx.quadraticCurveTo(sz * 0.82, sz * 0.2, sz * 1.0, sz * 0.17)
    ctx.quadraticCurveTo(sz * 1.2, sz * 0.1, sz * 1.46, 0)
    ctx.closePath(); ctx.fill()
    // cheek ice spikes (jaw frill)
    ctx.fillStyle = cIce; ctx.shadowColor = cGlow; ctx.shadowBlur = 6
    for (const side of [-1, 1]) for (let i = 0; i < 2; i++) { const bx = sz * (1.02 + i * 0.1), by = side * sz * (0.15 - i * 0.04); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - sz * 0.05, by + side * sz * 0.08); ctx.lineTo(bx + sz * 0.03, by + side * sz * 0.02); ctx.closePath(); ctx.fill() }
    ctx.shadowBlur = 0
    // 3) fierce brow ridges over the eyes
    ctx.fillStyle = cDark
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sz * 0.86, side * sz * 0.03); ctx.lineTo(sz * 1.02, side * sz * 0.05); ctx.lineTo(sz * 1.05, side * sz * 0.19); ctx.lineTo(sz * 0.9, side * sz * 0.16); ctx.closePath(); ctx.fill() }
    // 4) glowing frost rune on the brow
    { const rp = 0.5 + 0.5 * Math.sin(t * 3); ctx.save(); ctx.globalAlpha = 0.4 + 0.4 * rp; ctx.strokeStyle = cEdge; ctx.lineWidth = 1.5; ctx.shadowColor = cGlow; ctx.shadowBlur = 8
      ctx.translate(sz * 0.9, 0); ctx.beginPath(); ctx.moveTo(0, -sz * 0.055); ctx.lineTo(sz * 0.035, 0); ctx.lineTo(0, sz * 0.055); ctx.lineTo(-sz * 0.035, 0); ctx.closePath(); ctx.stroke(); ctx.restore() }
    // 5) fierce angled glowing slit-eyes
    const ep = 0.6 + 0.4 * Math.sin(t * 4)
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(sz * 0.99, side * sz * 0.1); ctx.rotate(side * -0.5)
      const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.09); eg.addColorStop(0, '#FFFFFF'); eg.addColorStop(0.4, enr ? '#bdf3ff' : '#9fe8ff'); eg.addColorStop(1, enr ? '#1788bd' : '#27607f')
      ctx.shadowColor = cGlow; ctx.shadowBlur = 20 * ep; ctx.fillStyle = hitW ? '#FFF' : eg
      ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.09, sz * 0.045 * blink, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      ctx.fillStyle = '#06121a'; ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.016, sz * 0.036 * blink, 0, 0, Math.PI * 2); ctx.fill()
      if (blink > 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-sz * 0.022, -sz * 0.014, sz * 0.013, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
    // 6) nostrils + drifting frost vapor
    ctx.fillStyle = cDark
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sz * 1.3, side * sz * 0.05, sz * 0.022, sz * 0.013, 0.3 * side, 0, Math.PI * 2); ctx.fill() }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i * 0.33 + side * 0.12) % 1; const vx = sz * 1.32 + ph * sz * 0.28, vy = side * sz * 0.05 + Math.sin(ph * 6 + side) * sz * 0.02
      ctx.fillStyle = `rgba(205,240,255,${(1 - ph) * 0.4})`; ctx.beginPath(); ctx.arc(vx, vy, (1 - ph) * sz * 0.045 + 1, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
    // 7) open maw + fangs
    ctx.fillStyle = '#0a1a24'; ctx.beginPath(); ctx.moveTo(sz * 1.3, -sz * 0.06); ctx.lineTo(sz * 1.46, 0); ctx.lineTo(sz * 1.3, sz * 0.06); ctx.closePath(); ctx.fill()
    ctx.fillStyle = cHorn
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sz * 1.31, side * sz * 0.05); ctx.lineTo(sz * 1.42, side * sz * 0.018); ctx.lineTo(sz * 1.34, side * sz * 0.004); ctx.closePath(); ctx.fill() }
    ctx.restore()   // end head nod/scan
    ctx.restore()   // end rotate + lift
    // ── orbiting ice shards (enraged) ──
    if (enr) { ctx.save(); ctx.shadowColor = cGlow; ctx.shadowBlur = 12
      for (let i = 0; i < 6; i++) { const a = t * 1.6 + i * (Math.PI / 3), rr = sz * (1.35 + 0.1 * Math.sin(t * 3 + i)), x = Math.cos(a) * rr, y = -lift + Math.sin(a) * rr * 0.6
        ctx.fillStyle = cIce; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 4.5, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 4.5, y); ctx.closePath(); ctx.fill() }
      ctx.restore() }
    // ── damage-gate shimmer: hardened scales (ranged-immune) shown as a deflecting aura ──
    if (g.dmgGate === 'melee') {
      const sp = 0.5 + 0.5 * Math.sin(t * 4); ctx.save(); ctx.globalAlpha = 0.28 + 0.22 * sp
      ctx.strokeStyle = cEdge; ctx.lineWidth = 2.5; ctx.shadowColor = cGlow; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(0, -lift, sz * 1.05 + sp * 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

function getWeaponId(wpn: WeaponDef, gear: GearId[]): string {
  if (gear.includes('spider_fang')) return 'dagger'
  if (gear.includes('fire_staff')) return 'fire_staff'
  if (gear.includes('drake_sword')) return 'greatsword'
  if (gear.includes('thunder_blade')) return 'thunder_sword'
  if (gear.includes('storm_bow')) return 'storm_bow'
  if (gear.includes('venom_bow')) return 'venom_bow'
  return wpn.id
}

function renderPlayer(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, gear: GearId[], t: number) {
  const p = g.player
  const facing = g.bullChargeDash.active ? Math.atan2(g.bullChargeDash.vel.y, g.bullChargeDash.vel.x) : p.facing
  const wid = getWeaponId(wpn, gear)
  const th = weaponTheme(wid)

  // ── mage casting circle (a glowing rune ring under the caster) ──
  if (g.mageCircle > 0) {
    const fire = gear.includes('fire_staff')
    const a = Math.min(1, g.mageCircle * 2.2)
    const col = fire ? '255,120,30' : '170,110,230'
    ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.globalAlpha = a
    ctx.rotate(t * 1.2)
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 2; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 14
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2); ctx.stroke()
    // rune ticks around the ring
    for (let i = 0; i < 8; i++) { const ra = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 24, Math.sin(ra) * 11); ctx.lineTo(Math.cos(ra) * 30, Math.sin(ra) * 14); ctx.stroke() }
    ctx.rotate(-t * 2.4)
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke()
    ctx.restore()
  }

  p.shadowDashTrail.forEach(tr => {
    ctx.save(); ctx.globalAlpha = tr.a * 0.55
    ctx.fillStyle = th.main; ctx.shadowColor = th.main; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(tr.pos.x, tr.pos.y, 13, 0, Math.PI*2); ctx.fill()
    ctx.restore()
  })

  if (p.dodgeTrail.length > 1) {
    p.dodgeTrail.forEach((tp, i) => {
      ctx.save(); ctx.globalAlpha = (i / p.dodgeTrail.length)*0.3
      ctx.fillStyle = th.main; ctx.beginPath(); ctx.arc(tp.x,tp.y,13,0,Math.PI*2); ctx.fill(); ctx.restore()
    })
  }

  if (g.attackFlash && g.attackFlash.timer > 0) {
    const af = g.attackFlash, prog = 1 - af.timer/af.maxTimer, alpha = 1-prog
    ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(af.angle); ctx.globalAlpha = alpha*0.9
    if (af.type === 'power_shot') {
      ctx.shadowColor = af.color; ctx.shadowBlur = 24
      ctx.strokeStyle = af.color; ctx.lineWidth = 5+alpha*4
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(60+prog*50),0); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 12
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(35+prog*30),0); ctx.stroke()
    } else if (af.type==='shadow') {
      const r2 = 52+prog*22, arc = 1.3
      ctx.strokeStyle = af.color; ctx.lineWidth = 3+(1-prog)*3; ctx.shadowColor = af.color; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(0,0,r2,-arc/2,arc/2); ctx.stroke()
    } else if (af.type === 'slam') {
      const rr = 24+prog*70; ctx.strokeStyle=af.color; ctx.lineWidth=5-prog*3; ctx.shadowColor=af.color; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(28,0,rr*0.5,0,Math.PI*2); ctx.stroke()
      ctx.globalAlpha=alpha*0.35; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(28,0,rr,0,Math.PI*2); ctx.stroke()
    } else if (af.type === 'shot' && wid !== 'storm_bow' && wid !== 'venom_bow' && wid !== 'bow') {
      const len = 32+prog*45; ctx.strokeStyle=af.color; ctx.lineWidth=3; ctx.shadowColor=af.color; ctx.shadowBlur=10
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+len,0); ctx.stroke()
    }
    ctx.restore()
  }

  ctx.save(); ctx.translate(p.pos.x, p.pos.y)
  if (g.playerScale !== 1) ctx.scale(g.playerScale, g.playerScale)   // a smaller hunter vs a colossal boss
  // the character's whole look is driven by armour (4 looks: basic + 3)
  const armour = gear.includes('ember_armor')?'ember':gear.includes('web_amulet')?'web':gear.includes('feather_boots')?'feather':gear.includes('wyrm_scale')?'frost':'basic'
  const armGlow = armour==='ember'?'#FF6A1A':armour==='web'?'#9B59B6':armour==='feather'?'#9fc0ff':armour==='frost'?'#7fd4ff':'#caa84a'
  // ground shadow under the character
  ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 13, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  if (p.hitFlash>0) { ctx.shadowColor='#FF0000'; ctx.shadowBlur=24 } else { ctx.shadowColor=armGlow; ctx.shadowBlur=14 }

  if (g.whirlwindActive) {
    const sa = t*13; ctx.save(); ctx.globalCompositeOperation='lighter'
    // outer vortex ring
    ctx.save(); ctx.rotate(sa)
    ctx.strokeStyle=th.main; ctx.lineWidth=2.5; ctx.globalAlpha=0.5; ctx.setLineDash([14,8]); ctx.shadowColor=th.main; ctx.shadowBlur=10
    ctx.beginPath(); ctx.arc(0,0,108,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()
    // four sweeping blade arcs with motion-blur ghosts
    for (let k=0;k<4;k++) {
      const ba = sa + k*(Math.PI/2)
      for (let gh=2; gh>=0; gh--) {
        const a0 = ba - gh*0.32
        ctx.globalAlpha = (0.55 - gh*0.16)
        ctx.strokeStyle = gh===0 ? th.accent : th.main; ctx.lineWidth = 4 - gh
        ctx.shadowColor=th.main; ctx.shadowBlur=12
        ctx.beginPath(); ctx.arc(0,0,72, a0-0.5, a0+0.5); ctx.stroke()
      }
      // blade tip glint
      ctx.globalAlpha=0.8; ctx.fillStyle=th.accent; ctx.beginPath(); ctx.arc(Math.cos(ba+0.5)*72, Math.sin(ba+0.5)*72, 3, 0, Math.PI*2); ctx.fill()
    }
    // inner spin spokes
    for (let i=0;i<3;i++) { const ba=sa*1.3+i*(Math.PI*2/3); ctx.globalAlpha=0.5; ctx.strokeStyle=th.particle; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(Math.cos(ba)*14,Math.sin(ba)*14); ctx.lineTo(Math.cos(ba)*40,Math.sin(ba)*40); ctx.stroke() }
    ctx.restore()
  }

  if (g.rageActive) {
    const rp = 0.5+0.5*Math.sin(t*8)
    ctx.save()
    for (let i=0;i<6;i++) { const fa=(t*3+i*Math.PI/3)%(Math.PI*2), fr=24+Math.sin(t*5+i)*5; ctx.globalAlpha=i%2===0?rp*0.5:rp*0.3; ctx.fillStyle=i%2===0?th.particle:th.accent; ctx.beginPath(); ctx.arc(Math.cos(fa)*fr,Math.sin(fa)*fr,4+rp*3,0,Math.PI*2); ctx.fill() }
    ctx.globalAlpha=rp*0.18; ctx.fillStyle=th.main; ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.fill()
    ctx.restore()
  }

  const hw = p.hitFlash>0&&Math.sin(p.hitFlash*80)>0

  ctx.save(); ctx.rotate(facing)
  // ── CHARACTER — appearance driven entirely by armour (basic / ember / web / feather) ──
  {
    const L = armour==='ember'   ? { rl:'#cf5740', rm:'#a93226', rd:'#5a1a10', cl:'#7a1d12', pl:'#c0392b', plt:'#e8714e', tr:'#FF8A1A', gl:'#FF6A1A' }
            : armour==='web'     ? { rl:'#5D2E86', rm:'#4A235A', rd:'#2c1240', cl:'#3b1560', pl:'#5D2E86', plt:'#7D3C98', tr:'#C39BD3', gl:'#9B59B6' }
            : armour==='feather' ? { rl:'#f2f6fb', rm:'#cfd8e6', rd:'#9aa6bc', cl:'#c2ccdd', pl:'#e8eef6', plt:'#ffffff', tr:'#aaccff', gl:'#9fc0ff' }
            : armour==='frost'   ? { rl:'#9fd8ef', rm:'#4a87a8', rd:'#234a5e', cl:'#1f4254', pl:'#356f8a', plt:'#bfe9f7', tr:'#cfeeff', gl:'#7fd4ff' }
            :                      { rl:'#C9A876', rm:'#9C7B4F', rd:'#6B5436', cl:'#4a3826', pl:'', plt:'', tr:'#caa84a', gl:'#caa84a' }
    const W = (c: string) => hw ? '#FFF' : c
    const wp = p.walkPhase
    const stride = p.moving ? Math.sin(wp)*5 : 0
    const bob = p.moving ? Math.abs(Math.sin(wp*0.5))*1.4 : Math.sin(t*2)*0.5
    ctx.translate(0, -bob)
    const sway = Math.sin(wp)*3
    // cloak
    ctx.fillStyle = W(L.cl)
    ctx.beginPath(); ctx.moveTo(-3,-9); ctx.quadraticCurveTo(-16,-13+sway,-24,-12+sway); ctx.lineTo(-21,sway*0.4); ctx.lineTo(-24,12-sway); ctx.quadraticCurveTo(-16,13-sway,-3,9); ctx.closePath(); ctx.fill()
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(-3,-7); ctx.lineTo(-18,sway*0.3); ctx.lineTo(-3,7); ctx.closePath(); ctx.fill()
    if (armour==='web'){ ctx.strokeStyle='rgba(200,160,255,0.4)'; ctx.lineWidth=0.8; for(let i=1;i<=3;i++){ctx.beginPath(); ctx.moveTo(-3,-9*i/3); ctx.lineTo(-22,-10*i/3+sway); ctx.stroke()} ctx.beginPath(); ctx.moveTo(-10,-6); ctx.lineTo(-10,6); ctx.moveTo(-16,-7); ctx.lineTo(-16,7); ctx.stroke() }
    // boots
    for (const side of [-1,1]) { const lx=-2+(side===-1?stride:-stride); ctx.fillStyle=W(armour==='feather'?'#aab4c6':'#33231a'); ctx.beginPath(); ctx.ellipse(lx, side*6.5, 4, 2.6, 0,0,Math.PI*2); ctx.fill() }
    // torso / robe
    const bg = ctx.createRadialGradient(-3,-3,0,0,0,16)
    bg.addColorStop(0,W(L.rl)); bg.addColorStop(0.55,W(L.rm)); bg.addColorStop(1,W(L.rd))
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,0,13.5,14.5,0,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-9,4.5); ctx.lineTo(9,4.5); ctx.stroke()
    ctx.strokeStyle=W(L.tr); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-9,4.5); ctx.lineTo(9,4.5); ctx.stroke()
    // arms — staves gripped with both hands
    ctx.strokeStyle=W(L.rm); ctx.lineWidth=4; ctx.lineCap='round'
    if (wpn.id==='staff') {
      // staff arms are drawn together with the carried staff (held across the body) below
    } else {
      ctx.beginPath(); ctx.moveTo(3,-8); ctx.lineTo(11,-5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(3,8); ctx.lineTo(9,6); ctx.stroke()
    }
    ctx.lineCap='butt'
    // head
    ctx.fillStyle=W('#E8B98C'); ctx.beginPath(); ctx.arc(5,0,6.5,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=W('#3a2718'); ctx.beginPath(); ctx.arc(3.5,0,6.5,Math.PI*0.45,Math.PI*1.55); ctx.fill()
    // ── armour-specific pieces ──
    if (armour==='basic') {
      ctx.strokeStyle=W('#6B5436'); ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-7,-7); ctx.lineTo(7,8); ctx.stroke()
      ctx.fillStyle=W('#caa84a'); ctx.beginPath(); ctx.arc(0,-8.5,2,0,Math.PI*2); ctx.arc(0,8.5,2,0,Math.PI*2); ctx.fill()
    } else if (armour==='ember') {
      const ff = 0.55 + 0.45*Math.sin(t*9)
      // heat-glow aura behind the plate
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.18+0.12*ff
      ctx.fillStyle='#FF6A1A'; ctx.shadowColor='#FF3000'; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.restore()
      // heavy riveted pauldrons with a licking flame on each
      ctx.shadowColor=L.gl; ctx.shadowBlur=10
      for (const side of [-1,1]){
        ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.ellipse(2, side*10, 6.3, 4.9, side*0.35, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle=W('#2a0e06'); ctx.beginPath(); ctx.arc(3, side*11, 1, 0, Math.PI*2); ctx.fill()   // rivet
        ctx.fillStyle=`rgba(255,${140+Math.round(ff*90)},25,0.92)`
        ctx.beginPath(); ctx.moveTo(0,side*11); ctx.lineTo(-2,side*(13+ff*3.5)); ctx.lineTo(2,side*12.5); ctx.closePath(); ctx.fill()
      }
      ctx.shadowBlur=0
      // breastplate + pulsing molten cracks
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,8.0,9.0,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=`rgba(255,${90+Math.round(ff*100)},10,${0.6+0.4*ff})`; ctx.lineWidth=1.3; ctx.shadowColor=L.gl; ctx.shadowBlur=8
      ctx.beginPath(); ctx.moveTo(-1,-8); ctx.lineTo(-3,-2); ctx.lineTo(0,1); ctx.lineTo(-2,6); ctx.moveTo(0,1); ctx.lineTo(4,-2); ctx.lineTo(3,-7); ctx.stroke(); ctx.shadowBlur=0
      // helm + brow flame crest
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7.5,Math.PI*0.46,Math.PI*1.54); ctx.fill()
      ctx.fillStyle=`rgba(255,${150+Math.round(ff*80)},30,1)`; ctx.shadowColor=L.gl; ctx.shadowBlur=12
      ctx.beginPath(); ctx.moveTo(3,-2); ctx.lineTo(-1,-12-ff*3); ctx.lineTo(2,-4); ctx.lineTo(4,-12-ff*3); ctx.lineTo(6,-2); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
    } else if (armour==='web') {
      const wz = 0.5+0.5*Math.sin(t*6)
      // jagged spider-leg shoulder spikes
      ctx.fillStyle=W(L.pl); ctx.shadowColor=L.gl; ctx.shadowBlur=5
      for (const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(-2,side*5); ctx.lineTo(3,side*15); ctx.lineTo(7,side*9); ctx.lineTo(9.5,side*14); ctx.lineTo(8,side*6); ctx.lineTo(2,side*4); ctx.closePath(); ctx.fill() }
      ctx.shadowBlur=0
      // chest carapace
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.6,8.6,0,0,Math.PI*2); ctx.fill()
      // radial web net woven over the carapace
      ctx.strokeStyle=`rgba(220,200,255,${0.5+0.3*wz})`; ctx.lineWidth=0.8; ctx.shadowColor='#C39BD3'; ctx.shadowBlur=4
      for (let i=0;i<8;i++){ const a=i/8*Math.PI*2; ctx.beginPath(); ctx.moveTo(-1,-1); ctx.lineTo(-1+Math.cos(a)*8,-1+Math.sin(a)*8); ctx.stroke() }
      for (let r=2.6;r<=7.4;r+=2.4){ ctx.beginPath(); for(let i=0;i<=8;i++){const a=i/8*Math.PI*2,x=-1+Math.cos(a)*r,y=-1+Math.sin(a)*r; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y)} ctx.stroke() }
      ctx.shadowBlur=0
      // fanged helm
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7.2,Math.PI*0.48,Math.PI*1.52); ctx.fill()
      ctx.strokeStyle=W(L.plt); ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(5,-4); ctx.lineTo(12,-9); ctx.moveTo(5,4); ctx.lineTo(12,9); ctx.stroke(); ctx.lineCap='butt'
      // four glowing spider eyes that pulse
      ctx.fillStyle=`rgba(255,40,58,${0.7+0.3*wz})`; ctx.shadowColor='#FF0000'; ctx.shadowBlur=9
      ctx.beginPath(); ctx.arc(7,-2.6,1.4,0,Math.PI*2); ctx.arc(7,2.6,1.4,0,Math.PI*2); ctx.arc(9.2,-1.2,1,0,Math.PI*2); ctx.arc(9.2,1.2,1,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
    } else if (armour==='feather') {
      const fl = 0.5+0.5*Math.sin(t*4)
      // speed streaks trailing the runner when moving
      if (p.moving){ ctx.strokeStyle='rgba(159,192,255,0.4)'; ctx.lineWidth=1.5; ctx.shadowColor=L.gl; ctx.shadowBlur=6
        for(let i=0;i<3;i++){ const y=(i-1)*5; ctx.beginPath(); ctx.moveTo(-9-i*3,y); ctx.lineTo(-22-i*7,y); ctx.stroke() } ctx.shadowBlur=0 }
      // large layered wings flaring from the shoulders (flap with stride)
      ctx.shadowColor=L.gl; ctx.shadowBlur=8
      for (const side of [-1,1]){
        const flap = 1 + (p.moving ? 0.28*Math.abs(Math.sin(wp)) : 0.1*fl)
        for (let k=0;k<4;k++){
          ctx.fillStyle=W(k%2===0?L.plt:L.pl)
          ctx.beginPath(); ctx.ellipse(-1-k*0.6, side*(7+k*2.3), (6.6-k*1.05)*flap, 2.4, side*(0.5+k*0.13), 0, Math.PI*2); ctx.fill()
        }
      }
      ctx.shadowBlur=0
      // breastplate
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.2,8.2,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=L.tr; ctx.lineWidth=1.3; ctx.shadowColor=L.gl; ctx.shadowBlur=5; ctx.beginPath(); ctx.moveTo(-1,-8); ctx.lineTo(-1,6); ctx.stroke(); ctx.shadowBlur=0
      // winged helm
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7,Math.PI*0.52,Math.PI*1.48); ctx.fill()
      ctx.fillStyle=W('#f2f6fb'); for (const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(6,side*4); ctx.lineTo(14,side*3); ctx.lineTo(8,side*8); ctx.closePath(); ctx.fill() }
      // ethereal speed aura
      ctx.strokeStyle=`rgba(159,192,255,${0.35+0.35*fl})`; ctx.lineWidth=1.4; ctx.shadowColor=L.gl; ctx.shadowBlur=10; ctx.beginPath(); ctx.ellipse(2,0,11,6,0,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0
    } else if (armour==='frost') {
      const fz = 0.5+0.5*Math.sin(t*5)
      // layered dragon-scale pauldrons
      ctx.shadowColor=L.gl; ctx.shadowBlur=7
      for (const side of [-1,1]){ ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.ellipse(2, side*10, 6.4, 5.0, side*0.3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(3, side*10, 3.0, 2.4, side*0.3, 0, Math.PI*2); ctx.fill() }
      ctx.shadowBlur=0
      // scaled breastplate
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.8,8.8,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=`rgba(120,210,250,${0.45+0.3*fz})`; ctx.lineWidth=0.9
      for (let r=2.4;r<=7;r+=2.3){ ctx.beginPath(); for(let i=0;i<=8;i++){const a=i/8*Math.PI*2,x=-1+Math.cos(a)*r,y=-1+Math.sin(a)*r; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y)} ctx.stroke() }
      // horned frost helm
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7.3,Math.PI*0.48,Math.PI*1.52); ctx.fill()
      ctx.fillStyle=W('#e3f1f9'); for (const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(3,side*5); ctx.quadraticCurveTo(-2,side*12,-6,side*11); ctx.quadraticCurveTo(0,side*7,2,side*4); ctx.closePath(); ctx.fill() }
      // frost crystal crest
      ctx.fillStyle=`rgba(190,233,247,${0.7+0.3*fz})`; ctx.shadowColor=L.gl; ctx.shadowBlur=10
      ctx.beginPath(); ctx.moveTo(5,-2); ctx.lineTo(3,-12-fz*3); ctx.lineTo(7,-3); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
    }
  }

  if (wid === 'dagger') {
    // ── SPIDER FANG DAGGERS — animated dual-blade flurry ──
    // draw one curved fang dagger pivoting at (px,py), rotated by ang, blade length len
    const drawFang = (px: number, py: number, ang: number, len: number, col: string, glow: number) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang)
      ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = glow
      // curved fang blade (slight inward hook)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(5, -2.8)
      ctx.quadraticCurveTo(len * 0.6, -3.2, len, -0.6)
      ctx.quadraticCurveTo(len + 2, 0, len, 0.8)
      ctx.quadraticCurveTo(len * 0.55, 3.2, 5, 2.8)
      ctx.closePath(); ctx.fill()
      // bright edge line
      ctx.strokeStyle = 'rgba(225,185,255,0.85)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(6, -1.1); ctx.quadraticCurveTo(len * 0.6, -1.4, len - 1, 0); ctx.stroke()
      // crossguard + hilt
      ctx.fillStyle = '#2c113f'; ctx.fillRect(1, -4, 4, 8)
      ctx.fillStyle = '#7a4fae'; ctx.fillRect(-6, -1.7, 7, 3.4)
      ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      // fast crossing X-slash: blades snap from a wide guard to crossed + thrust, then back
      const p = 1 - slash.timer / slash.maxTimer
      const tri = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5          // 0→1→0
      const open = 1.08, cross = -0.30
      // one symmetric pose at a given sweep value e (0 wide .. 1 crossed)
      const pose = (e: number, alpha: number, glow: number) => {
        const ang = open + (cross - open) * e
        const reach = 24 + e * 22
        const pyA = -7 + e * 6, pyB = 7 - e * 6
        ctx.globalAlpha = alpha
        drawFang(4, pyA, ang, reach, hw ? '#FFF' : '#9B59B6', glow)   // upper fang
        drawFang(4, pyB, -ang, reach, hw ? '#FFF' : '#8E44AD', glow)  // lower fang (mirror)
      }
      // motion-blur ghosts trailing the strike
      for (let i = 3; i >= 1; i--) pose(Math.max(0, tri - i * 0.18), 0.10 * (4 - i), 4)
      // crossing swoosh arcs
      if (tri > 0.15) {
        ctx.globalAlpha = tri * 0.7; ctx.strokeStyle = 'rgba(190,140,255,0.9)'; ctx.lineWidth = 2.5
        ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.arc(4, 0, 40, -open, -cross); ctx.stroke()
        ctx.beginPath(); ctx.arc(4, 0, 40, cross, open); ctx.stroke()
      }
      // main blades
      pose(tri, 1, 12)
      // bright crossing spark at the apex of the strike
      if (tri > 0.55) {
        const sp = (tri - 0.55) / 0.45
        ctx.globalAlpha = sp; ctx.fillStyle = '#EBD2FF'; ctx.shadowColor = '#C39BD3'; ctx.shadowBlur = 22
        ctx.beginPath(); ctx.arc(40, 0, 3.5 + sp * 4, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = `rgba(235,210,255,${sp})`; ctx.lineWidth = 2
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40 + Math.cos(a) * (8 + sp * 8), Math.sin(a) * (8 + sp * 8)); ctx.stroke() }
      }
      ctx.globalAlpha = 1
    } else {
      // idle ready-guard with a subtle breathing bob
      const bob = Math.sin(t * 4) * 1.2
      drawFang(6, -8 + bob, 0.34, 26, hw ? '#FFF' : '#9B59B6', 10)
      drawFang(6, 8 - bob, -0.34, 26, hw ? '#FFF' : '#8E44AD', 10)
    }
  } else if (wid === 'sword') {
    // ── STARTER SWORD — steel blade with a sweeping crescent slash ──
    const drawBlade = (rot: number, len: number, alpha: number, glow: number) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = '#E74C3C'; ctx.shadowBlur = glow
      const grad = ctx.createLinearGradient(10, 0, len, 0)
      grad.addColorStop(0, hw ? '#FFF' : '#AEB8C4'); grad.addColorStop(0.5, hw ? '#FFF' : '#D8E0EA'); grad.addColorStop(1, hw ? '#FFF' : '#F2F6FB')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(9, -3.6); ctx.lineTo(len - 8, -2.6); ctx.lineTo(len, 0); ctx.lineTo(len - 8, 2.6); ctx.lineTo(9, 3.6); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -1.3); ctx.lineTo(len - 5, 0); ctx.stroke()
      // crossguard
      ctx.fillStyle = hw ? '#FFF' : '#7a1d12'; ctx.fillRect(5, -8, 5, 16)
      ctx.fillStyle = hw ? '#FFF' : '#E74C3C'; ctx.fillRect(5, -8, 2.5, 16)
      // grip + pommel
      ctx.strokeStyle = '#3a1510'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(5, 0); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#C0392B'; ctx.beginPath(); ctx.arc(-2, 0, 3.4, 0, Math.PI * 2); ctx.fill()
      ctx.lineCap = 'butt'; ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      const p = 1 - slash.timer / slash.maxTimer
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2   // ease, fast through the middle
      const startR = -1.15, endR = 1.2, rot = startR + (endR - startR) * e
      const len = 54, r0 = 16, r1 = len + 8
      // crescent slash trail from start angle to current
      ctx.save()
      ctx.globalAlpha = (1 - Math.abs(e - 0.5) * 1.2) * 0.65
      ctx.fillStyle = 'rgba(255,120,90,0.5)'; ctx.shadowColor = '#E74C3C'; ctx.shadowBlur = 18
      ctx.beginPath(); ctx.arc(0, 0, r1, startR, rot); ctx.arc(0, 0, r0, rot, startR, true); ctx.closePath(); ctx.fill()
      // bright leading edge of the crescent
      ctx.globalAlpha = 1 - Math.abs(e - 0.5); ctx.strokeStyle = 'rgba(255,238,205,0.95)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, r1, rot - 0.28, rot); ctx.stroke()
      ctx.restore()
      // motion-blur ghost blades
      for (let i = 3; i >= 1; i--) drawBlade(startR + (endR - startR) * Math.max(0, e - i * 0.12), len, 0.10 * (4 - i), 5)
      // main blade
      drawBlade(rot, len, 1, 14)
      // contact spark as the edge passes mid-swing
      if (e > 0.42 && e < 0.72) {
        const spv = 1 - Math.abs(e - 0.57) / 0.15
        ctx.globalAlpha = Math.max(0, spv); ctx.fillStyle = '#FFE3B0'; ctx.shadowColor = '#FFAA66'; ctx.shadowBlur = 20
        ctx.beginPath(); ctx.arc(Math.cos(rot) * len * 0.82, Math.sin(rot) * len * 0.82, 4 + spv * 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      drawBlade(0.5 + Math.sin(t * 3.5) * 0.05, 52, 1, 12)   // idle ready stance
    }
  } else if (wid === 'greatsword') {
    // ── MASSIVE Drake Greatsword — heavy wind-up into an explosive overhead cleave ──
    const drawBig = (rot: number, alpha: number, glow: number) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = '#E67E22'; ctx.shadowBlur = glow
      ctx.strokeStyle = hw ? '#FFF' : '#3A2410'; ctx.lineWidth = 7; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(18, 0); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#8A6510'; ctx.beginPath(); ctx.arc(-4, 0, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = hw ? '#FFF' : '#8A6510'; ctx.fillRect(16, -20, 8, 40)
      ctx.fillStyle = hw ? '#FFF' : '#C8881E'; ctx.fillRect(16, -20, 4, 40)
      const bladeGrad = ctx.createLinearGradient(24, 0, 118, 0)
      bladeGrad.addColorStop(0, hw ? '#FFF' : '#C0651A'); bladeGrad.addColorStop(0.5, hw ? '#FFF' : '#E67E22'); bladeGrad.addColorStop(1, hw ? '#FFF' : '#F6B24A')
      ctx.fillStyle = bladeGrad
      ctx.beginPath(); ctx.moveTo(24, -17); ctx.lineTo(104, -12); ctx.lineTo(122, 0); ctx.lineTo(104, 12); ctx.lineTo(24, 17); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = hw ? '#EEE' : 'rgba(120,50,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(106, 0); ctx.stroke()
      ctx.strokeStyle = hw ? '#FFF' : 'rgba(255,210,120,0.85)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(24, -17); ctx.lineTo(104, -12); ctx.lineTo(122, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(24, 17); ctx.lineTo(104, 12); ctx.lineTo(122, 0); ctx.stroke()
      ctx.lineCap = 'butt'; ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'greatslash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    const half = 1.3, backR = -half - 0.55   // raised/wound-up angle
    if (slash) {
      const p = 1 - slash.timer / slash.maxTimer
      let rot: number, cleave: number
      if (p < 0.34) { rot = -half + (backR - -half) * (p / 0.34); cleave = 0 }   // slow heavy wind-up overhead
      else { const e = (p - 0.34) / 0.66; cleave = 1 - Math.pow(1 - e, 2.4); rot = backR + cleave * (2 * half + 0.55) }   // explosive cleave across
      // huge crescent slash trail during the cleave
      if (cleave > 0.02) {
        const r0 = 22, r1 = 128
        ctx.save()
        ctx.globalAlpha = Math.min(1, cleave * 1.4) * 0.5
        const tg = ctx.createRadialGradient(0, 0, r0, 0, 0, r1)
        tg.addColorStop(0, 'rgba(255,140,40,0)'); tg.addColorStop(1, 'rgba(255,160,60,0.7)')
        ctx.fillStyle = tg; ctx.shadowColor = '#FF7A1A'; ctx.shadowBlur = 26
        ctx.beginPath(); ctx.arc(0, 0, r1, backR, rot); ctx.arc(0, 0, r0, rot, backR, true); ctx.closePath(); ctx.fill()
        ctx.globalAlpha = Math.min(1, cleave * 1.6); ctx.strokeStyle = 'rgba(255,240,200,0.95)'; ctx.lineWidth = 5
        ctx.beginPath(); ctx.arc(0, 0, r1, rot - 0.34, rot); ctx.stroke()
        ctx.restore()
      }
      // motion-blur ghost blades trailing the cleave
      for (let i = 3; i >= 1; i--) { const grot = rot - i * 0.26 * cleave; if (grot > backR - 0.05) drawBig(grot, 0.10 * (4 - i), 8) }
      drawBig(rot, 1, 26)
      // impact flash at the blade tip as the cleave bottoms out
      if (cleave > 0.72) {
        const sv = (cleave - 0.72) / 0.28
        ctx.globalAlpha = sv; ctx.fillStyle = '#FFE3B0'; ctx.shadowColor = '#FF9A33'; ctx.shadowBlur = 26
        ctx.beginPath(); ctx.arc(Math.cos(rot) * 120, Math.sin(rot) * 120, 6 + sv * 8, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      drawBig(-0.18 + Math.sin(t * 2.0) * 0.05, 1, 16)   // idle: shouldered, slow heavy bob
    }
  } else if (wid === 'thunder_sword') {
    // ── THUNDER BLADE — crackling electric slash; charges + discharges a bolt on the 3rd hit ──
    const lp = 0.5 + 0.5 * Math.sin(t * 10)
    const drawTBlade = (rot: number, alpha: number, glow: number, charged: boolean) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = charged ? '#FFFFFF' : '#F1C40F'; ctx.shadowBlur = glow
      const len = 50
      const grad = ctx.createLinearGradient(8, 0, len, 0)
      grad.addColorStop(0, hw ? '#FFF' : '#C8A81E'); grad.addColorStop(0.6, hw ? '#FFF' : (charged ? '#FFF7C0' : '#F1C40F')); grad.addColorStop(1, hw ? '#FFF' : '#FFF7C0')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(len - 6, -2.2); ctx.lineTo(len, 0); ctx.lineTo(len - 6, 2.2); ctx.lineTo(8, 3); ctx.closePath(); ctx.fill()
      // crossguard + grip
      ctx.fillStyle = hw ? '#FFF' : '#5A4410'; ctx.fillRect(4, -7, 4, 14)
      ctx.strokeStyle = '#2a2008'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.lineCap = 'butt'
      // crackling arcs hugging the blade
      ctx.strokeStyle = charged ? 'rgba(255,255,255,0.9)' : `rgba(255,240,150,${0.5 + lp * 0.4})`
      ctx.lineWidth = charged ? 2 : 1.3; ctx.shadowColor = charged ? '#FFFFFF' : '#FFEE66'; ctx.shadowBlur = charged ? 14 : 8
      for (let s = 0; s < 2; s++) {
        ctx.beginPath(); ctx.moveTo(10, 0)
        for (let k = 1; k <= 4; k++) { const f = k / 4; ctx.lineTo(10 + (len - 12) * f, Math.sin(t * 30 + k * 2.1 + s * 3) * (3 + (charged ? 2 : 0))) }
        ctx.stroke()
      }
      ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      const procNow = !!(g.meleeHit && g.meleeHit.proc)
      const p = 1 - slash.timer / slash.maxTimer
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      const startR = -1.1, endR = 1.15, rot = startR + (endR - startR) * e
      const r0 = 14, r1 = 58
      // electric crescent trail
      ctx.save(); ctx.globalAlpha = (1 - Math.abs(e - 0.5) * 1.2) * 0.7
      ctx.fillStyle = procNow ? 'rgba(255,255,255,0.55)' : 'rgba(255,235,120,0.5)'; ctx.shadowColor = procNow ? '#FFFFFF' : '#F1C40F'; ctx.shadowBlur = 18
      ctx.beginPath(); ctx.arc(0, 0, r1, startR, rot); ctx.arc(0, 0, r0, rot, startR, true); ctx.closePath(); ctx.fill()
      ctx.restore()
      // jagged lightning along the leading edge
      ctx.save(); ctx.globalAlpha = 1 - Math.abs(e - 0.5)
      ctx.strokeStyle = procNow ? '#FFFFFF' : '#FFF080'; ctx.lineWidth = procNow ? 3 : 2; ctx.shadowColor = procNow ? '#FFFFFF' : '#FFEE66'; ctx.shadowBlur = procNow ? 20 : 12
      ctx.beginPath()
      for (let k = 0; k <= 5; k++) { const a = startR + (rot - startR) * (k / 5); const rr = r1 + (k % 2 === 0 ? 4 : -4) + Math.sin(t * 40 + k) * (procNow ? 5 : 3); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
      ctx.stroke(); ctx.restore()
      // motion-blur ghost blades
      for (let i = 3; i >= 1; i--) drawTBlade(startR + (endR - startR) * Math.max(0, e - i * 0.11), 0.10 * (4 - i), 5, false)
      drawTBlade(rot, 1, procNow ? 22 : 14, procNow)
      // proc swing: a big forked bolt discharges down the blade mid-swing
      if (procNow && e > 0.38 && e < 0.82) {
        const sv = 1 - Math.abs(e - 0.6) / 0.22
        ctx.save(); ctx.globalAlpha = Math.max(0, sv); ctx.rotate(rot)
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 24
        ctx.beginPath(); ctx.moveTo(6, 0)
        for (let k = 1; k <= 5; k++) ctx.lineTo(6 + 44 * (k / 5), Math.sin(t * 60 + k * 2) * 6)
        ctx.stroke()
        ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 28; ctx.beginPath(); ctx.arc(52, 0, 4 + sv * 5, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
    } else {
      const willProc = (g.player.gearHitCount % 3) === 2
      drawTBlade(0.45 + Math.sin(t * 3.5) * 0.05, 1, willProc ? 18 : 12, willProc)
      if (willProc) {   // charged orb at the tip, ready to discharge
        ctx.save(); ctx.rotate(0.45 + Math.sin(t * 3.5) * 0.05); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 12)
        ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 18
        ctx.beginPath(); ctx.arc(52, 0, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      }
    }
  } else if (wid === 'fire_staff') {
    // ── FIRE STAFF — a living flame churns at the tip, swelling as it charges and erupting on cast ──
    const cd = (wpn.atkCd || 0.64) * 0.78   // matches the Fire Staff's faster cast cadence
    const fp = 0.6 + 0.4 * Math.sin(t * 8)
    const flick = 0.78 + 0.22 * Math.sin(t * 23 + Math.sin(t * 7) * 2)   // fast fire flicker
    const draw = clamp(1 - p.atkTimer / cd, 0, 1)                 // 0 just-cast -> 1 charged
    const release = clamp((p.atkTimer - (cd - 0.16)) / 0.16, 0, 1) // 1 right after a cast
    const ox = 53                                                  // orb centre x
    // ── carry the staff HORIZONTALLY across the body (held in both hands), not aimed like a spear ──
    ctx.save()
    const fl = Math.cos(facing) < 0 ? -1 : 1
    ctx.rotate(-facing); ctx.scale(fl, 1); ctx.translate(-22, 8)
    { const ac = hw ? '#FFF' : (armour === 'ember' ? '#a93226' : armour === 'web' ? '#4A235A' : armour === 'feather' ? '#cfd8e6' : '#9C7B4F')
      ctx.strokeStyle = ac; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(10, 1); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(30, 1); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#E8B98C'; ctx.beginPath(); ctx.arc(10, 1, 2.7, 0, Math.PI * 2); ctx.arc(30, 1, 2.7, 0, Math.PI * 2); ctx.fill()
      ctx.lineCap = 'butt' }
    // ── ornate charred shaft ──
    ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 8
    ctx.strokeStyle = hw ? '#FFF' : '#4A1E00'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(43, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#EEE' : '#7A3A10'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(42, -1); ctx.stroke()
    // glowing ember crack running up the wood — brightens with charge
    ctx.strokeStyle = `rgba(255,${90 + Math.round(fp * 90 + draw * 40)},0,${0.5 + 0.45 * fp})`; ctx.lineWidth = 1.2; ctx.shadowColor = '#FF6A1A'; ctx.shadowBlur = 6 + draw * 6
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, -1.5); ctx.lineTo(20, 0.5); ctx.lineTo(27, -1.2); ctx.lineTo(34, 0.4); ctx.stroke(); ctx.shadowBlur = 8
    // leather grip wrap near the base
    ctx.strokeStyle = hw ? '#FFF' : '#2a1606'; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(16, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#DDD' : '#160a03'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const gx = 3 + i * 3; ctx.beginPath(); ctx.moveTo(gx, -3); ctx.lineTo(gx + 2, 3); ctx.stroke() }
    // brass bands
    ctx.strokeStyle = hw ? '#FFF' : '#C8881E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, -3.2); ctx.lineTo(22, 3.2); ctx.moveTo(40, -3.5); ctx.lineTo(40, 3.5); ctx.stroke()
    // pommel counterweight
    ctx.fillStyle = hw ? '#FFF' : '#8a4a10'; ctx.beginPath(); ctx.arc(-5, 0, 3.6, 0, Math.PI * 2); ctx.fill()
    // brass claw head cradling the orb
    ctx.strokeStyle = hw ? '#FFF' : '#9a5a14'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(43, -2); ctx.quadraticCurveTo(50, -10, 58, -4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(43, 2); ctx.quadraticCurveTo(50, 10, 58, 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(49, 0); ctx.stroke(); ctx.lineCap = 'butt'
    // ── the fire itself (additive, glowing) ──
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const orbR = (4 + draw * 5.5 + release * 5) * flick
    // outer heat haze
    ctx.shadowColor = '#FF3000'; ctx.shadowBlur = 22 + draw * 18 + release * 16
    const halo = ctx.createRadialGradient(ox, 0, 0, ox, 0, orbR + 13)
    halo.addColorStop(0, 'rgba(255,200,90,0.55)'); halo.addColorStop(0.5, 'rgba(255,90,10,0.30)'); halo.addColorStop(1, 'rgba(200,30,0,0)')
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ox, 0, (orbR + 13) * fp, 0, Math.PI * 2); ctx.fill()
    // leaping flame tongues (teardrop plumes) that lick outward, longer when charged
    const tongues = 5 + Math.round(draw * 4)
    for (let i = 0; i < tongues; i++) {
      const a = t * 4.5 + i * (Math.PI * 2 / tongues) + Math.sin(t * 6 + i) * 0.3
      const len = orbR * (1.3 + 0.7 * Math.abs(Math.sin(t * 9 + i * 1.7))) + draw * 3
      const bx = ox + Math.cos(a) * orbR * 0.5, by = Math.sin(a) * orbR * 0.5
      const tx = ox + Math.cos(a) * (orbR + len), ty = Math.sin(a) * (orbR + len)
      const pxp = -Math.sin(a) * orbR * 0.32, pyp = Math.cos(a) * orbR * 0.32
      const tg = ctx.createLinearGradient(bx, by, tx, ty)
      tg.addColorStop(0, 'rgba(255,225,120,0.9)'); tg.addColorStop(0.6, 'rgba(255,110,20,0.6)'); tg.addColorStop(1, 'rgba(255,40,0,0)')
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(bx + pxp, by + pyp); ctx.quadraticCurveTo(ox + Math.cos(a) * orbR, Math.sin(a) * orbR, tx, ty); ctx.quadraticCurveTo(ox + Math.cos(a) * orbR, Math.sin(a) * orbR, bx - pxp, by - pyp); ctx.closePath(); ctx.fill()
    }
    // molten core orb
    const og = ctx.createRadialGradient(ox, 0, 0, ox, 0, orbR + 5)
    og.addColorStop(0, '#FFFFFF'); og.addColorStop(0.35, '#FFE07A'); og.addColorStop(0.7, release > 0 ? '#FFB02A' : '#FF7A1A'); og.addColorStop(1, 'rgba(255,50,0,0)')
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, 0, orbR + 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ox, 0, orbR * 0.4, 0, Math.PI * 2); ctx.fill()
    // rising embers shedding off the flame
    for (let i = 0; i < 4 + Math.round(draw * 3); i++) {
      const ph = (t * 1.4 + i * 0.37) % 1
      const ex = ox + Math.sin(t * 5 + i * 2) * (3 + i), ey = -ph * (12 + draw * 10)
      ctx.fillStyle = `rgba(255,${160 + Math.round(ph * 80)},40,${(1 - ph) * 0.85})`
      ctx.beginPath(); ctx.arc(ex, ey, (1 - ph) * 2 + 0.5, 0, Math.PI * 2); ctx.fill()
    }
    // cast eruption — a bright burst bloom right after firing
    if (release > 0) { ctx.shadowColor = '#FFB02A'; ctx.shadowBlur = 30; ctx.globalAlpha = release; ctx.fillStyle = '#FFE8A0'; ctx.beginPath(); ctx.arc(ox + 4, 0, 7 + (1 - release) * 14, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }
    ctx.restore()
    ctx.restore()   // end across-body carry frame
  } else if (wid === 'staff') {
    // ── STARTER STAFF — gathers arcane energy at the tip, soft flare on cast (calmer than fire) ──
    const ap = 0.6 + 0.4 * Math.sin(t * 7)
    const cd = wpn.atkCd || 0.64
    const draw = clamp(1 - p.atkTimer / cd, 0, 1)
    const release = clamp((p.atkTimer - (cd - 0.16)) / 0.16, 0, 1)
    // ── carry the staff HORIZONTALLY across the body (held in both hands), not aimed like a spear ──
    ctx.save()
    const fl = Math.cos(facing) < 0 ? -1 : 1
    ctx.rotate(-facing); ctx.scale(fl, 1); ctx.translate(-22, 8)
    { const ac = hw ? '#FFF' : (armour === 'ember' ? '#a93226' : armour === 'web' ? '#4A235A' : armour === 'feather' ? '#cfd8e6' : '#9C7B4F')
      ctx.strokeStyle = ac; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(10, 1); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(30, 1); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#E8B98C'; ctx.beginPath(); ctx.arc(10, 1, 2.7, 0, Math.PI * 2); ctx.arc(30, 1, 2.7, 0, Math.PI * 2); ctx.fill()
      ctx.lineCap = 'butt' }
    // ── ornate arcane shaft ──
    ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 8
    ctx.strokeStyle = hw ? '#FFF' : '#3A1D49'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(44, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#EEE' : '#5E2E73'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(43, -1); ctx.stroke()
    // leather grip wrap near the base
    ctx.strokeStyle = hw ? '#FFF' : '#241030'; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(16, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#DDD' : '#160a20'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const gx = 3 + i * 3; ctx.beginPath(); ctx.moveTo(gx, -3); ctx.lineTo(gx + 2, 3); ctx.stroke() }
    // silver bands
    ctx.strokeStyle = hw ? '#FFF' : '#B0A8C0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(23, -3.2); ctx.lineTo(23, 3.2); ctx.moveTo(41, -3.5); ctx.lineTo(41, 3.5); ctx.stroke()
    // pommel gem
    ctx.fillStyle = hw ? '#FFF' : '#6C3483'; ctx.beginPath(); ctx.arc(-5, 0, 3.3, 0, Math.PI * 2); ctx.fill()
    // silver prongs cradling the orb
    ctx.strokeStyle = hw ? '#FFF' : '#9E86B8'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(44, -2); ctx.quadraticCurveTo(51, -9, 58, -3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(44, 2); ctx.quadraticCurveTo(51, 9, 58, 3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(45, 0); ctx.lineTo(50, 0); ctx.stroke(); ctx.lineCap = 'butt'
    // arcane orb at the tip — grows with charge
    const orbR = 3.5 + draw * 4 + release * 3
    ctx.shadowColor = '#CE9EE8'; ctx.shadowBlur = 12 + draw * 10
    const og = ctx.createRadialGradient(53, 0, 0, 53, 0, orbR + 4)
    og.addColorStop(0, '#F4ECFF'); og.addColorStop(0.45, '#9B59B6'); og.addColorStop(1, 'rgba(123,46,160,0)')
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(53, 0, (orbR + 4) * (0.85 + ap * 0.15), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(53, 0, orbR * 0.4, 0, Math.PI * 2); ctx.fill()
    // a couple of orbiting sparkles (fewer than the fire staff)
    const sp = 2 + Math.round(draw * 2)
    ctx.fillStyle = `rgba(220,170,255,${0.5 + draw * 0.4})`
    for (let i = 0; i < sp; i++) { const a = t * 4 + i * (Math.PI * 2 / sp), rr = orbR + 3 + Math.sin(t * 6 + i) * 1.5; ctx.beginPath(); ctx.arc(53 + Math.cos(a) * rr, Math.sin(a) * rr, 1.4, 0, Math.PI * 2); ctx.fill() }
    // modest release flare
    if (release > 0) { ctx.save(); ctx.globalAlpha = release; ctx.fillStyle = '#E8D0FF'; ctx.shadowColor = '#CE9EE8'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(56, 0, 4 + (1 - release) * 7, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    ctx.restore()   // end across-body carry frame
  } else if (wid === 'venom_bow') {
    // ── VENOM BOW — organic thorned bow that drips toxin; nocks, draws and looses a venom arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 6)
    const bx = 16, limb = 19
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)
    const drawD = 3 + draw * 16, charge = draw, nockX = bx - drawD
    const col = hw ? '#FFF' : '#8E44AD'
    // thorned limbs (recurve, with barbs)
    ctx.shadowColor = '#7D3C98'; ctx.shadowBlur = 10 + hum * 6; ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 6, -limb * 0.5, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 6, limb * 0.5, bx, limb); ctx.stroke()
    // barbs along the limbs
    ctx.lineWidth = 1.6; ctx.strokeStyle = hw ? '#FFF' : '#6A2C84'
    for (const sd of [-1, 1]) for (let k = 1; k <= 3; k++) { const yy = sd * limb * (k / 3.4); const xx = bx + 5 - 5 * (k / 3.4); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 5, yy + sd * 4); ctx.stroke() }
    // grip
    ctx.lineCap = 'round'; ctx.strokeStyle = hw ? '#FFF' : '#3a1d49'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(8, 5); ctx.stroke(); ctx.lineCap = 'butt'
    // sickly green-purple string
    ctx.strokeStyle = `rgba(170,210,90,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.6; ctx.shadowColor = '#9ACD00'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // venom dripping from the limbs (idle + drawn)
    for (const sd of [-1, 1]) { const dy = sd * limb + Math.sin(t * 3 + sd) * 2 + 4 + charge * 3; ctx.fillStyle = `rgba(140,200,20,${0.4 + 0.3 * Math.sin(t * 4 + sd)})`; ctx.beginPath(); ctx.ellipse(bx - 1, dy, 1.8, 3, 0, 0, Math.PI * 2); ctx.fill() }
    // nocked venom arrow, drawn back
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#7D3C98'; ctx.lineWidth = 2.3; ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 10
      const aLen = 26; ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + aLen, 0); ctx.stroke()
      ctx.fillStyle = '#9ACD00'; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.moveTo(nockX + aLen + 4, 0); ctx.lineTo(nockX + aLen - 4, -4); ctx.lineTo(nockX + aLen - 1, 0); ctx.lineTo(nockX + aLen - 4, 4); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // toxic glob gathering at the nock
    if (charge > 0.45) {
      ctx.save(); ctx.globalAlpha = (charge - 0.45) / 0.55; ctx.fillStyle = '#B6E61A'; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(nockX, 0, 2 + charge * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    // release: venom splash burst + arrow streak
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#B6E61A'; ctx.lineWidth = 2.6; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 28 + (1 - release) * 46, 0); ctx.stroke()
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.2; ctx.fillStyle = `rgba(150,205,0,${release})`; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 11, Math.sin(a) * 11, 2, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
  } else if (wid === 'storm_bow') {
    // ── STORM BOW — recurve storm bow that nocks, draws, and releases a lightning arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 9)
    const bx = 16, limb = 20
    // draw cycle from the attack cooldown: 0 just-fired (relaxed) -> 1 fully drawn (ready)
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)   // 1 right after a shot -> 0
    const drawD = 3 + draw * 16, charge = draw, nockX = bx - drawD
    const col = hw ? '#FFF' : '#5fe0ff'
    // recurve limbs
    ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 12 + hum * 8; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, -limb * 0.55, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, limb * 0.55, bx, limb); ctx.stroke()
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.quadraticCurveTo(bx - 5, -limb - 4, bx - 8, -limb - 1); ctx.moveTo(bx, limb); ctx.quadraticCurveTo(bx - 5, limb + 4, bx - 8, limb + 1); ctx.stroke()
    // grip
    ctx.strokeStyle = hw ? '#FFF' : '#14323f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(8, 5); ctx.stroke(); ctx.lineCap = 'butt'
    // lightning crackle across the limbs while charged
    if (charge > 0.35) {
      ctx.strokeStyle = `rgba(170,240,255,${charge * 0.75})`; ctx.lineWidth = 1.3; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.moveTo(bx, -limb); for (let k = 1; k <= 5; k++) ctx.lineTo(bx - 4 + Math.sin(t * 40 + k * 2) * 4 * charge, -limb + 2 * limb * (k / 5)); ctx.stroke()
    }
    // electric string (V when drawn)
    ctx.strokeStyle = `rgba(220,250,255,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.6; ctx.shadowColor = '#CFF6FF'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // nocked lightning arrow, drawn back with the string
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#EAFBFF'; ctx.lineWidth = 2.3; ctx.shadowColor = '#5fe0ff'; ctx.shadowBlur = 12
      const aLen = 26
      ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + aLen * 0.35, -3); ctx.lineTo(nockX + aLen * 0.62, 2.5); ctx.lineTo(nockX + aLen, 0); ctx.stroke()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(nockX + aLen, 0); ctx.lineTo(nockX + aLen - 6, -4); ctx.lineTo(nockX + aLen - 6, 4); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    // charge orb gathering at the nock
    if (charge > 0.45) {
      ctx.save(); ctx.globalAlpha = (charge - 0.45) / 0.55; ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(nockX, 0, 2 + charge * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    // release: forward streak + spark burst
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowColor = '#5fe0ff'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 32 + (1 - release) * 50, 0); ctx.stroke()
      for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.3; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + Math.cos(a) * 12, Math.sin(a) * 12); ctx.stroke() }
      ctx.restore()
    }
  } else if (wid === 'bow') {
    // ── STARTER BOW — simple wooden recurve that nocks, draws and looses an arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 5)
    const bx = 15, limb = 18
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)
    const drawD = 3 + draw * 15, charge = draw, nockX = bx - drawD
    // wooden limbs
    ctx.shadowColor = '#27AE60'; ctx.shadowBlur = 8; ctx.strokeStyle = hw ? '#FFF' : '#8B5A2B'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, -limb * 0.55, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, limb * 0.55, bx, limb); ctx.stroke()
    // green limb-tip wraps
    ctx.strokeStyle = hw ? '#FFF' : '#2ECC71'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(bx - 3, -limb + 4); ctx.moveTo(bx, limb); ctx.lineTo(bx - 3, limb - 4); ctx.stroke()
    // grip
    ctx.strokeStyle = hw ? '#FFF' : '#5a3a1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(8, 4); ctx.stroke(); ctx.lineCap = 'butt'
    // string
    ctx.strokeStyle = `rgba(210,255,225,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.4; ctx.shadowColor = '#A9DFBF'; ctx.shadowBlur = 5
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // nocked wooden arrow, drawn back
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#caa472'; ctx.lineWidth = 2; ctx.shadowColor = '#27AE60'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + 26, 0); ctx.stroke()
      ctx.fillStyle = '#E8F8F0'; ctx.shadowColor = '#A9DFBF'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(nockX + 30, 0); ctx.lineTo(nockX + 24, -3.5); ctx.lineTo(nockX + 24, 3.5); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    // release: string twang + arrow streak
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#D5FFE6'; ctx.lineWidth = 2; ctx.shadowColor = '#2ECC71'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 26 + (1 - release) * 40, 0); ctx.stroke(); ctx.restore()
    }
  } else {
    ctx.strokeStyle='#5A5040'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(38,0); ctx.stroke()
    ctx.fillStyle=hw?'#FFF':'#8A8070'; ctx.beginPath(); ctx.moveTo(36,-4); ctx.lineTo(44,0); ctx.lineTo(36,4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle='rgba(180,160,130,0.4)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(16,-9); ctx.lineTo(16,9); ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

function renderTelegraph(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId, t: number) {
  const atk = g.bossAttack; if (!atk || atk.active) return
  const progress = atk.elapsed/atk.telegraphTime, pulse = 0.4+0.6*progress, b = g.boss
  const bossDef = BOSS_DEFS[bossId]
  const BIG = ['spider_leap','venom_burst','fire_line','flame_wave','fire_breath','lava_puddle','lightning_barrage','lava_barrage','thunderstorm','talon_dive','fireball','tail_slam','dive_bomb','spider_charge','magma_geyser','thunder_cross','gale_ring','venom_geyser','web_burst','web_spiral','fire_sweep','storm_rings'].includes(atk.type)
  const dCol = bossId===0 ? '180,112,224' : bossId===1 ? '255,122,26' : '95,230,255'
  ctx.save()
  // ── boss charge-up aura (every telegraph): pulsing ring that fills as the attack nears ──
  {
    const cr = bossDef.size + 14 + Math.sin(t*16)*3
    ctx.save()
    ctx.strokeStyle = `rgba(${dCol},${0.25+0.5*progress})`; ctx.lineWidth = 2.5 + progress*3
    ctx.shadowColor = `rgba(${dCol},0.9)`; ctx.shadowBlur = (BIG?22:12)*pulse
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, cr, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress); ctx.stroke()
    // gathering energy sparks spiralling into the boss
    ctx.shadowBlur = 0
    const sparks = BIG ? 5 : 3
    for (let i=0;i<sparks;i++) {
      const sa = t*6 + i*(Math.PI*2/sparks), sd = cr + 30 - progress*38
      ctx.fillStyle = `rgba(${dCol},${0.5+0.4*Math.sin(t*9+i)})`
      ctx.beginPath(); ctx.arc(b.pos.x+Math.cos(sa)*sd, b.pos.y+Math.sin(sa)*sd, BIG?3.2:2.2, 0, Math.PI*2); ctx.fill()
    }
    // floating warning mark above the boss for dangerous attacks
    if (BIG) {
      ctx.globalAlpha = 0.45+0.55*Math.abs(Math.sin(t*9))
      ctx.fillStyle = `rgba(${dCol},1)`; ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=12
      ctx.font = 'bold 30px "Press Start 2P", monospace'; ctx.textAlign='center'
      ctx.fillText('!', b.pos.x, b.pos.y - bossDef.size - 22)
    }
    ctx.restore()
  }
  if (atk.type==='venom_spit'||atk.type==='ember_barrage'||atk.type==='fireball'||atk.type==='wind_blade'||atk.type==='fire_fan') {
    const count=atk.data.count??3, baseA=atk.data.angle??0
    const spread=atk.type==='fireball'?0.16:atk.type==='wind_blade'?0.20:atk.type==='fire_fan'?0.27:0.28
    for (let i=0;i<count;i++) { const a=baseA+(i-(count-1)/2)*spread; ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=atk.type==='fireball'?3:2; ctx.setLineDash([6,4]); ctx.shadowColor=`rgba(${dCol},0.7)`; ctx.shadowBlur=8*pulse; ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*520,b.pos.y+Math.sin(a)*520); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur=0 }
  } else if (atk.type==='web_shot'||atk.type==='talon_dive') {
    const a=atk.data.angle??0; ctx.strokeStyle=`rgba(255,100,200,${pulse})`; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*600,b.pos.y+Math.sin(a)*600); ctx.stroke(); ctx.setLineDash([])
  } else if (atk.type==='leg_sweep'||atk.type==='tail_swipe'||atk.type==='wind_buffet'||atk.type==='fire_breath'||atk.type==='fire_sweep') {
    const angle=atk.data.angle??0, half=(atk.data.coneAngle??Math.PI)/2, range=atk.data.coneRange??150
    // base cone outline + a sweep that fills toward the edge as it nears firing
    ctx.fillStyle=`rgba(${dCol},${pulse*0.16})`; ctx.strokeStyle=`rgba(${dCol},${pulse*0.8})`; ctx.lineWidth=2
    ctx.shadowColor=`rgba(${dCol},0.8)`; ctx.shadowBlur=10*pulse
    ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.arc(b.pos.x,b.pos.y,range,angle-half,angle+half); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.shadowBlur=0
    ctx.fillStyle=`rgba(${dCol},${0.30+0.4*progress})`
    ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.arc(b.pos.x,b.pos.y,range*progress,angle-half,angle+half); ctx.closePath(); ctx.fill()
    // directional chevrons down the cone centre
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=3
    for (let k=1;k<=3;k++){ const cd=range*(k/3.6); const cx=b.pos.x+Math.cos(angle)*cd, cy=b.pos.y+Math.sin(angle)*cd
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(angle+2.5)*12,cy+Math.sin(angle+2.5)*12); ctx.lineTo(cx,cy); ctx.lineTo(cx+Math.cos(angle-2.5)*12,cy+Math.sin(angle-2.5)*12); ctx.stroke() }
  } else if (atk.type==='spider_leap'||atk.type==='lightning_strike'||atk.type==='stomp'||atk.type==='tail_slam'||atk.type==='dive_bomb') {
    const target=atk.data.targetPos!, r=atk.data.radius??(atk.type==='stomp'?155:120)
    // filling ground indicator — the fill reaches the edge exactly when the attack lands
    ctx.fillStyle=`rgba(${dCol},${0.12+0.10*pulse})`; ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=`rgba(${dCol},${0.32})`; ctx.beginPath(); ctx.arc(target.x,target.y,r*progress,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=`rgba(${dCol},${0.5+0.5*pulse})`; ctx.lineWidth=2.5+progress*2.5; ctx.shadowColor=`rgba(${dCol},0.9)`; ctx.shadowBlur=12*pulse
    ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0
  } else if (atk.type==='venom_burst') {
    const r=atk.data.radius??180
    ctx.fillStyle=`rgba(90,20,130,${0.10+pulse*0.14})`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=`rgba(142,68,173,0.28)`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r*progress,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=`rgba(142,68,173,${pulse})`; ctx.lineWidth=3+progress*3; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r,0,Math.PI*2); ctx.stroke()
  } else if (atk.type==='web_spray') {
    const count=atk.data.count??7, baseA=Math.atan2((atk.data.targetPos?.y??b.pos.y)-b.pos.y,(atk.data.targetPos?.x??b.pos.x)-b.pos.x)
    for (let i=0;i<count;i++) { const a=baseA+(i-(count-1)/2)*0.38; ctx.strokeStyle=`rgba(180,80,255,${pulse*0.75})`; ctx.lineWidth=1.8; ctx.setLineDash([5,5]); ctx.shadowColor='#8E44AD'; ctx.shadowBlur=8*pulse; ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*520,b.pos.y+Math.sin(a)*520); ctx.stroke(); ctx.setLineDash([]) }
  } else if (atk.type==='fire_line') {
    const lineA=atk.data.angle??0, len=850
    ctx.save()
    ctx.shadowColor='#FF6600'; ctx.shadowBlur=30*pulse
    ctx.strokeStyle=`rgba(255,${100+Math.round(progress*80)},0,${pulse*0.85})`; ctx.lineWidth=10+progress*14
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke()
    ctx.globalAlpha=0.18*pulse; ctx.strokeStyle='#FFAA00'; ctx.lineWidth=32+progress*20
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke()
    ctx.restore()
  } else if (atk.type==='lightning_barrage'||atk.type==='lava_barrage') {
    ctx.strokeStyle=`rgba(${dCol},${pulse*0.9})`; ctx.lineWidth=2+progress*2; ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=16*pulse
    ctx.setLineDash([8,4]); ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,80*(0.5+0.5*progress),0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle=`rgba(${dCol},${pulse*0.12})`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,80,0,Math.PI*2); ctx.fill()
  } else if (atk.type==='web_wall') {
    const lineA=atk.data.angle??0, len=760
    ctx.save(); ctx.shadowColor='#8E44AD'; ctx.shadowBlur=16*pulse
    ctx.strokeStyle=`rgba(${dCol},${pulse*0.85})`; ctx.lineWidth=8+progress*10; ctx.setLineDash([14,8])
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()
  } else if (atk.type==='spider_charge') {
    const a=atk.data.angle??0, len=360, halfW=70
    const ex=b.pos.x+Math.cos(a)*len, ey=b.pos.y+Math.sin(a)*len
    const px2=-Math.sin(a)*halfW, py2=Math.cos(a)*halfW
    ctx.save(); ctx.shadowColor=`rgba(${dCol},0.8)`; ctx.shadowBlur=12*pulse
    ctx.fillStyle=`rgba(${dCol},${0.12+pulse*0.18})`
    ctx.beginPath(); ctx.moveTo(b.pos.x+px2,b.pos.y+py2); ctx.lineTo(ex+px2,ey+py2); ctx.lineTo(ex-px2,ey-py2); ctx.lineTo(b.pos.x-px2,b.pos.y-py2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=3
    for (let k=1;k<=3;k++){ const cd=len*(k/3.6); const cx=b.pos.x+Math.cos(a)*cd, cy=b.pos.y+Math.sin(a)*cd; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a+2.5)*14,cy+Math.sin(a+2.5)*14); ctx.lineTo(cx,cy); ctx.lineTo(cx+Math.cos(a-2.5)*14,cy+Math.sin(a-2.5)*14); ctx.stroke() }
    ctx.restore()
  } else if (atk.type==='magma_geyser'||atk.type==='venom_geyser') {
    // ring of eruptions — danger band, safe centre
    const target=atk.data.targetPos!, r=atk.data.radius??122
    ctx.save(); ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=14*pulse
    ctx.strokeStyle=`rgba(${dCol},${0.5+0.5*pulse})`; ctx.lineWidth=4+progress*4
    ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.stroke()
    ctx.fillStyle=`rgba(${dCol},${0.10+0.12*pulse})`; ctx.beginPath(); ctx.arc(target.x,target.y,r+22,0,Math.PI*2); ctx.arc(target.x,target.y,r-22,0,Math.PI*2,true); ctx.fill()
    for (let i=0;i<11;i++){ const a=i/11*Math.PI*2; ctx.fillStyle=`rgba(${dCol},${pulse})`; ctx.beginPath(); ctx.arc(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,3+progress*3,0,Math.PI*2); ctx.fill() }
    ctx.restore()
  } else if (atk.type==='thunder_cross') {
    // two perpendicular lightning lines through the boss
    const a0=atk.data.angle??0, len=780
    ctx.save(); ctx.shadowColor='#00EEFF'; ctx.shadowBlur=18*pulse
    ctx.strokeStyle=`rgba(120,235,255,${pulse*0.9})`; ctx.lineWidth=6+progress*8; ctx.setLineDash([16,8])
    for (const la of [a0, a0+Math.PI/2]) { ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(la)*len,b.pos.y-Math.sin(la)*len); ctx.lineTo(b.pos.x+Math.cos(la)*len,b.pos.y+Math.sin(la)*len); ctx.stroke() }
    ctx.setLineDash([]); ctx.restore()
  } else if (atk.type==='gale_ring'||atk.type==='web_burst'||atk.type==='web_spiral'||atk.type==='storm_rings') {
    // expanding ring warning around the boss (radial burst incoming)
    ctx.save(); ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=12*pulse
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=2.5+progress*2
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,40+progress*120,0,Math.PI*2); ctx.stroke()
    ctx.strokeStyle=`rgba(${dCol},${pulse*0.5})`; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,40+progress*60,0,Math.PI*2); ctx.stroke()
    ctx.restore()
  }
  void t
  ctx.restore()
}

function renderHazards(ctx: CanvasRenderingContext2D, g: GS) {
  const ZONE_COLORS: Record<string,[string,string]> = { poison:['#8E44AD','#5D1E7A'], fire:['#FF6600','#AA2200'], lightning:['#F1C40F','#8B6914'], web:['#6C3483','#3B1560'], ice:['#9fe8ff','#3a6e9a'] }
  g.zones.forEach(zone => {
    const [bright,dark] = ZONE_COLORS[zone.type]??['#FFF','#888']
    const lp=zone.life/zone.maxLife, pulse=0.55+0.45*Math.sin(g.gtime*4+zone.id*1.3)
    ctx.save(); ctx.globalAlpha=Math.min(lp*2,0.85)*(0.7+0.3*pulse)
    const gr=ctx.createRadialGradient(zone.pos.x,zone.pos.y,0,zone.pos.x,zone.pos.y,zone.radius)
    gr.addColorStop(0,dark+'CC'); gr.addColorStop(0.6,bright+'44'); gr.addColorStop(1,bright+'00')
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(zone.pos.x,zone.pos.y,zone.radius,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=bright; ctx.lineWidth=1.5+pulse; ctx.globalAlpha=0.55*pulse*lp
    ctx.beginPath(); ctx.arc(zone.pos.x,zone.pos.y,zone.radius*(0.85+0.15*pulse),0,Math.PI*2); ctx.stroke()
    ctx.restore()
  })
}

function renderSlowTraps(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  g.slowTraps.forEach(trap => {
    const pulse = 0.5+0.5*Math.sin(t*5+trap.id)
    ctx.save(); ctx.globalAlpha=Math.min(1,trap.life*0.5)*(0.7+0.3*pulse)
    const col = trap.fromPlayer ? '#8E44AD' : '#27AE60'
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.shadowColor=col; ctx.shadowBlur=8
    ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(trap.pos.x,trap.pos.y,20,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    if (trap.fromPlayer) {
      ctx.globalAlpha*=0.7
      for (let i=0;i<6;i++) { const a=i/6*Math.PI*2+pulse*0.5; ctx.beginPath(); ctx.moveTo(trap.pos.x+Math.cos(a)*14,trap.pos.y+Math.sin(a)*14); ctx.lineTo(trap.pos.x+Math.cos(a)*22,trap.pos.y+Math.sin(a)*22); ctx.stroke() }
      // counter-rotating inner rune triangle so the armed trap reads at a glance
      ctx.save(); ctx.translate(trap.pos.x,trap.pos.y); ctx.rotate(-t*1.6); ctx.globalAlpha=0.6+0.3*pulse; ctx.lineWidth=1.5
      ctx.beginPath(); for (let i=0;i<3;i++){ const a=i/3*Math.PI*2; const x=Math.cos(a)*11,y=Math.sin(a)*11; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y) } ctx.closePath(); ctx.stroke(); ctx.restore()
    }
    ctx.restore()
  })
}

function renderProjectiles(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.projectiles.forEach(proj => {
    ctx.save()
    if (proj.trail && proj.trail.length > 1) {
      for (let i=1;i<proj.trail.length;i++) {
        const a=(i/proj.trail.length)*0.5
        ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle=proj.color; ctx.lineWidth=(proj.isPowerShot?8:proj.isFireball?7:proj.isFirebolt?5:3)*(i/proj.trail.length)
        ctx.shadowColor=proj.color; ctx.shadowBlur=6
        ctx.beginPath(); ctx.moveTo(proj.trail[i-1].x,proj.trail[i-1].y); ctx.lineTo(proj.trail[i].x,proj.trail[i].y); ctx.stroke(); ctx.restore()
      }
    }
    ctx.shadowColor=proj.color; ctx.shadowBlur=proj.isPowerShot?28:proj.isFireball?24:proj.isLightning?20:12
    if (proj.isPowerShot) {
      const a = Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a)
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.moveTo(-20,-5); ctx.lineTo(10,-5); ctx.lineTo(10,-10); ctx.lineTo(24,0); ctx.lineTo(10,10); ctx.lineTo(10,5); ctx.lineTo(-20,5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1; ctx.stroke(); ctx.restore()
    } else if (proj.isFireball) {
      // roaring fireball — additive flame ball, swirling petals, comet flame-trail off the tail, white-hot core
      const ang = Math.atan2(proj.vel.y, proj.vel.x)
      const fr = 0.72 + 0.28 * Math.sin(proj.life * 26)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      // trailing flame plume streaming opposite the velocity
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(ang)
      const plume = ctx.createLinearGradient(0, 0, -(proj.radius * 4.2), 0)
      plume.addColorStop(0, 'rgba(255,210,90,0.85)'); plume.addColorStop(0.5, 'rgba(255,90,10,0.45)'); plume.addColorStop(1, 'rgba(200,20,0,0)')
      ctx.fillStyle = plume; ctx.shadowColor = '#FF3000'; ctx.shadowBlur = 22
      const wob = Math.sin(proj.life * 30) * proj.radius * 0.3
      ctx.beginPath(); ctx.moveTo(0, -proj.radius * 0.9); ctx.quadraticCurveTo(-proj.radius * 2.2, wob, -proj.radius * 4.4, 0); ctx.quadraticCurveTo(-proj.radius * 2.2, -wob, 0, proj.radius * 0.9); ctx.closePath(); ctx.fill()
      ctx.restore()
      // heat halo
      ctx.shadowColor = '#FF3000'; ctx.shadowBlur = 30
      const fg = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 12)
      fg.addColorStop(0, '#FFFFFF'); fg.addColorStop(0.4, '#FFB838'); fg.addColorStop(0.75, '#FF5A0A'); fg.addColorStop(1, 'rgba(200,20,0,0)')
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 12) * fr, 0, Math.PI * 2); ctx.fill()
      // counter-rotating flame petals
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(proj.life * 6)
      ctx.fillStyle = 'rgba(255,150,30,0.8)'
      for (let s = 0; s < 6; s++) { ctx.rotate(Math.PI * 2 / 6); ctx.beginPath(); ctx.ellipse(proj.radius * 0.8, 0, proj.radius * 0.78, proj.radius * 0.32, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.rotate(-proj.life * 11); ctx.fillStyle = 'rgba(255,220,120,0.6)'
      for (let s = 0; s < 5; s++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(proj.radius * 0.55, 0, proj.radius * 0.5, proj.radius * 0.22, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
      // white-hot core
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.46 * (0.9 + 0.1 * Math.sin(proj.life * 40)), 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else if (proj.isFirebolt) {
      // darting firebolt — additive flame dart with a teardrop body, white-hot core, sparks
      const ang = Math.atan2(proj.vel.y, proj.vel.x)
      const fr = 0.7 + 0.3 * Math.sin(proj.life * 34)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 16
      // teardrop flame body pointing along travel
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(ang)
      const body = ctx.createLinearGradient(proj.radius * 1.4, 0, -proj.radius * 2.6, 0)
      body.addColorStop(0, 'rgba(255,245,180,0.95)'); body.addColorStop(0.45, 'rgba(255,130,25,0.7)'); body.addColorStop(1, 'rgba(255,40,0,0)')
      const wob = Math.sin(proj.life * 36) * proj.radius * 0.28
      ctx.fillStyle = body
      ctx.beginPath(); ctx.moveTo(proj.radius * 1.5, 0); ctx.quadraticCurveTo(0, proj.radius * 0.9, -proj.radius * 2.6, wob); ctx.quadraticCurveTo(0, -proj.radius * 0.9, proj.radius * 1.5, 0); ctx.closePath(); ctx.fill()
      ctx.restore()
      // glowing halo
      const fg = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 6)
      fg.addColorStop(0, '#FFFFFF'); fg.addColorStop(0.4, '#FFC24A'); fg.addColorStop(1, 'rgba(255,40,0,0)')
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 6) * fr, 0, Math.PI * 2); ctx.fill()
      // white-hot core
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.42, 0, Math.PI * 2); ctx.fill()
      // flickering sparks shed around the bolt
      for (let s = 0; s < 4; s++) { const a = proj.life * 12 + s * 1.7; const rr = proj.radius * (0.8 + 0.25 * Math.sin(proj.life * 20 + s)); ctx.fillStyle = `rgba(255,${180 + s * 15},60,0.85)`; ctx.beginPath(); ctx.arc(proj.pos.x + Math.cos(a) * rr, proj.pos.y + Math.sin(a) * rr, 1.6, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    } else if (proj.isLightning) {
      const a2=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a2)
      // glowing core
      ctx.fillStyle='rgba(180,245,255,0.9)'; ctx.shadowColor='#00CCFF'; ctx.shadowBlur=18
      ctx.beginPath(); ctx.arc(0,0,3.5,0,Math.PI*2); ctx.fill()
      // white-hot jagged bolt body
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=2.4; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-5,-4); ctx.lineTo(2,2); ctx.lineTo(9,-3); ctx.lineTo(16,0); ctx.stroke()
      // cyan crackle strand
      ctx.strokeStyle='rgba(120,225,255,0.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-4,3); ctx.lineTo(4,-3); ctx.lineTo(16,0); ctx.stroke()
      // arrowhead
      ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(10,-4); ctx.lineTo(10,4); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (proj.isVenom) {
      const av=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(av)
      ctx.shadowColor='#8E44AD'; ctx.shadowBlur=12
      // purple shaft
      ctx.strokeStyle='#7D3C98'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(8,0); ctx.stroke()
      // fletching
      ctx.strokeStyle='#C39BD3'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-16,-3); ctx.moveTo(-12,0); ctx.lineTo(-16,3); ctx.stroke()
      // barbed venom head (toxic green)
      ctx.fillStyle='#9ACD00'; ctx.shadowColor='#7FBA00'; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(7,-5); ctx.lineTo(10,0); ctx.lineTo(7,5); ctx.closePath(); ctx.fill()
      // dripping venom glob
      ctx.fillStyle=`rgba(127,186,0,${0.6+0.4*Math.sin(proj.life*18)})`
      ctx.beginPath(); ctx.arc(11,4+Math.sin(proj.life*14)*1.5,2,0,Math.PI*2); ctx.fill()
      ctx.restore()
    } else if (proj.isArcane) {
      // glowing arcane missile — pulsing orb, white core, orbiting sparks
      const pul = 0.7 + 0.3 * Math.sin(proj.life * 22)
      ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 18
      const ag = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 4)
      ag.addColorStop(0, '#F4ECFF'); ag.addColorStop(0.45, '#C39BD3'); ag.addColorStop(1, 'rgba(123,46,160,0)')
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 4) * pul, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.42, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(220,170,255,0.9)'
      for (let s = 0; s < 3; s++) { const a = proj.life * 7 + s * (Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(proj.pos.x + Math.cos(a) * (proj.radius + 3), proj.pos.y + Math.sin(a) * (proj.radius + 3), 1.6, 0, Math.PI * 2); ctx.fill() }
    } else if (proj.isArrow) {
      const aa=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(aa)
      ctx.shadowColor='#27AE60'; ctx.shadowBlur=8
      // wooden shaft
      ctx.strokeStyle='#caa472'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(9,0); ctx.stroke()
      // green fletching
      ctx.strokeStyle='#2ECC71'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(-17,-3); ctx.moveTo(-13,0); ctx.lineTo(-17,3); ctx.moveTo(-10,0); ctx.lineTo(-14,-2.5); ctx.moveTo(-10,0); ctx.lineTo(-14,2.5); ctx.stroke()
      // steel arrowhead
      ctx.fillStyle='#E8F8F0'; ctx.shadowColor='#A9DFBF'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(7,-3.5); ctx.lineTo(9,0); ctx.lineTo(7,3.5); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (proj.isFeather) {
      const a4=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a4)
      ctx.fillStyle=proj.color
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-6,-4.5); ctx.lineTo(-3,0); ctx.lineTo(-6,4.5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-6,0); ctx.stroke()
      ctx.restore()
    } else if (proj.isIce) {
      // sharp icicle shard pointing along travel
      const ai=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(ai)
      ctx.shadowColor='#9fe8ff'; ctx.shadowBlur=12
      const ig=ctx.createLinearGradient(-9,0,11,0); ig.addColorStop(0,'rgba(120,200,255,0.2)'); ig.addColorStop(0.5,'#bfeeff'); ig.addColorStop(1,'#ffffff')
      ctx.fillStyle=ig
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-3,-4); ctx.lineTo(-9,0); ctx.lineTo(-3,4); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-5,0); ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.arc(proj.pos.x,proj.pos.y,proj.radius,0,Math.PI*2); ctx.fill()
    }
    ctx.restore()
  })
}

function renderSkyArrows(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.skyArrows.forEach(arrow => {
    if (arrow.hit) return
    const isMet = arrow.kind === 'meteor'
    const prog = clamp(1 - arrow.warnTimer / (isMet ? 1.2 : 1.8), 0, 1), pulse = 0.4 + 0.6 * prog
    const tx = arrow.targetPos.x, ty = arrow.targetPos.y
    ctx.save()
    if (isMet) {
      const R = 62
      // fiery danger circle that fills as impact nears
      ctx.fillStyle = `rgba(255,80,0,${0.08 + pulse * 0.12})`; ctx.beginPath(); ctx.arc(tx, ty, R, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,120,0,0.28)'; ctx.beginPath(); ctx.arc(tx, ty, R * prog, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(255,140,30,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2.5 + prog * 2.5; ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 14 * pulse
      ctx.beginPath(); ctx.arc(tx, ty, R, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255,160,40,${pulse * 0.5})`; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(tx - R * 0.7, ty); ctx.lineTo(tx + R * 0.7, ty); ctx.moveTo(tx, ty - R * 0.7); ctx.lineTo(tx, ty + R * 0.7); ctx.stroke()
      // accelerating fall
      const my = ty - (1 - prog) * (1 - prog) * 540, mr = 13 + prog * 11
      ctx.strokeStyle = 'rgba(255,120,20,0.5)'; ctx.lineWidth = mr * 0.9; ctx.lineCap = 'round'; ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.moveTo(tx, my - 64); ctx.lineTo(tx, my); ctx.stroke(); ctx.lineCap = 'butt'
      const mg = ctx.createRadialGradient(tx, my, 0, tx, my, mr + 6)
      mg.addColorStop(0, '#FFF7C0'); mg.addColorStop(0.5, '#FF7A1A'); mg.addColorStop(1, 'rgba(150,20,0,0)')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(tx, my, mr + 6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#3a1408'; ctx.beginPath(); ctx.arc(tx, my, mr * 0.7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,190,60,0.85)'; ctx.beginPath(); ctx.arc(tx - mr * 0.25, my - mr * 0.25, mr * 0.28, 0, Math.PI * 2); ctx.fill()
    } else {
      const col = arrow.col ?? '#F1C40F'
      ctx.strokeStyle = hexA(col, pulse * 0.9); ctx.lineWidth = 3 + prog * 2
      ctx.shadowColor = col; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(tx, ty, 45 * (0.4 + 0.6 * prog), 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = hexA(col, pulse * 0.12); ctx.beginPath(); ctx.arc(tx, ty, 45, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = hexA(col, pulse); ctx.lineWidth = 3
      const iy = ty - 80 + prog * 50
      ctx.beginPath(); ctx.moveTo(tx, iy); ctx.lineTo(tx, ty - 50); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(tx - 10, iy + 15); ctx.lineTo(tx, iy); ctx.lineTo(tx + 10, iy + 15); ctx.stroke()
    }
    ctx.restore()
  })
}

function renderFx(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  g.fx.forEach(f => {
    const prog = 1 - f.timer / f.maxTimer       // 0 -> 1
    const fade = f.timer / f.maxTimer           // 1 -> 0
    const eo = 1 - Math.pow(1 - prog, 3)        // ease-out expansion
    ctx.save(); ctx.translate(f.pos.x, f.pos.y); ctx.globalCompositeOperation = 'lighter'
    if (f.type === 'shock') {
      const r = f.radius * eo
      ctx.shadowColor = f.color; ctx.shadowBlur = 18
      ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = f.color; ctx.lineWidth = 6 * fade + 1.5
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = fade; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5 * fade
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.7 * 0.42, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = fade * 0.55; ctx.strokeStyle = f.color; ctx.lineWidth = 2
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 * 0.42); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.42); ctx.stroke() }
    } else if (f.type === 'nova') {
      const r = f.radius * (0.3 + 0.7 * eo)
      ctx.globalAlpha = fade
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.4, f.color); gr.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
    } else if (f.type === 'star') {
      ctx.rotate(f.rot); ctx.globalAlpha = fade; ctx.shadowColor = f.color; ctx.shadowBlur = 16
      const reach = f.radius * (0.6 + 0.8 * eo)
      ctx.strokeStyle = f.color; ctx.lineWidth = 2.5 * fade + 1
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const len = i % 2 === 0 ? reach : reach * 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke() }
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 3 * fade + 1, 0, Math.PI * 2); ctx.fill()
    } else if (f.type === 'rune') {
      ctx.globalAlpha = fade * 0.95; ctx.shadowColor = f.color; ctx.shadowBlur = 12; ctx.rotate(prog * 2.2 + t * 0.5)
      const r = f.radius * (0.7 + 0.4 * eo)
      ctx.strokeStyle = f.color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.66, r * 0.33, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.lineWidth = 1.5
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.33); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5); ctx.stroke() }
    }
    ctx.restore()
  })
}

function renderParticles(ctx: CanvasRenderingContext2D, g: GS) {
  g.particles.forEach(pt => {
    const a=pt.life/pt.maxLife; ctx.save(); ctx.globalAlpha=a
    ctx.fillStyle=pt.color; ctx.shadowColor=pt.color; ctx.shadowBlur=4
    ctx.beginPath(); ctx.arc(pt.pos.x,pt.pos.y,pt.size*a,0,Math.PI*2); ctx.fill(); ctx.restore()
  })
}

function renderDamageNumbers(ctx: CanvasRenderingContext2D, g: GS) {
  g.damageNums.forEach(dn => {
    const prog = 1 - dn.life / dn.maxLife
    const alpha = Math.min(1, dn.life * 2.4)
    // pop: overshoot to ~1.6x at spawn, settle to 1.0 over the first 15% of life
    const scale = 1.6 - 0.6 * Math.min(1, prog / 0.15)
    // damage-gate feedback ("IMMUNE" / "TOO HIGH!") — icy, no number
    if (dn.text) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(dn.pos.x, dn.pos.y); ctx.scale(scale, scale)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '11px "Press Start 2P",monospace'
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(dn.text, 0, 0)
      ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 12; ctx.fillStyle = '#cfeeff'; ctx.fillText(dn.text, 0, 0)
      ctx.restore(); return
    }
    const txt = (dn.isPlayer ? '-' : '') + dn.val
    const sz = dn.isPlayer ? 22 : dn.crit ? 22 : 14
    const col = dn.isPlayer ? '#FF3B3B' : dn.crit ? '#FFD24A' : '#FFFFFF'
    const glow = dn.isPlayer ? '#FF0000' : dn.crit ? '#FF8A1A' : '#C89B3C'
    ctx.save(); ctx.globalAlpha = alpha
    ctx.translate(dn.pos.x, dn.pos.y); ctx.scale(scale, scale)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `${sz}px "Press Start 2P",monospace`
    // black outline keeps numbers legible over bright effects
    ctx.lineWidth = dn.crit || dn.isPlayer ? 4.5 : 3; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineJoin = 'round'
    ctx.strokeText(txt, 0, 0)
    ctx.shadowColor = glow; ctx.shadowBlur = dn.crit ? 18 : dn.isPlayer ? 18 : 7
    ctx.fillStyle = col; ctx.fillText(txt, 0, 0)
    // player hits get a red down-arrow so they read instantly as damage taken
    if (dn.isPlayer) { ctx.font = '12px "Press Start 2P",monospace'; ctx.fillStyle = '#FF7777'; ctx.fillText('▼', sz * 0.62, -sz * 0.32) }
    // crit gets a little "!" flourish
    if (dn.crit) { ctx.font = '11px "Press Start 2P",monospace'; ctx.fillStyle = '#FFF7C0'; ctx.fillText('!', sz * 0.7, -sz * 0.34) }
    ctx.restore()
  })
  ctx.textBaseline = 'alphabetic'
}

function renderBossDeath(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId) {
  const b=g.boss, bossDef=BOSS_DEFS[bossId], totalDur=3.0, prog=Math.max(0,Math.min(1,1-g.bossDeathAnim/totalDur))
  const alpha = prog<0.5?1:Math.max(0,1-((prog-0.5)*2)**2)
  for (let ring=0;ring<6;ring++) {
    const rp=Math.max(0,Math.min(1,(prog-ring*0.15)/0.7)); if(rp<=0) continue
    const rr=rp*(280+ring*55), ra=(1-rp)*0.65
    ctx.save(); ctx.globalAlpha=ra; ctx.strokeStyle=ring%2===0?'#F1C40F':bossDef.color; ctx.lineWidth=5-ring*0.5; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=20
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,Math.max(0,rr),0,Math.PI*2); ctx.stroke(); ctx.restore()
  }
  if (prog<0.3) { ctx.save(); ctx.globalAlpha=(1-prog/0.3)*0.75; ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,WW,WH); ctx.restore() }
  if (alpha>0.02) {
    ctx.save(); ctx.translate(b.pos.x,b.pos.y); ctx.rotate(prog*Math.PI*12); const sc=Math.max(0.05,1-prog*0.93); ctx.scale(sc,sc); ctx.globalAlpha=alpha
    ctx.shadowColor=bossDef.color; ctx.shadowBlur=44+prog*30; ctx.fillStyle=prog<0.25&&Math.floor(g.gtime*28)%2===0?'#FFFFFF':bossDef.color
    ctx.beginPath(); ctx.arc(0,0,bossDef.size,0,Math.PI*2); ctx.fill()
    for (let i=0;i<8;i++) { const ca=i/8*Math.PI*2+prog*Math.PI*3, cd=prog*(110+i*22), ca2=(1-prog)*0.6; if(ca2<0.02) continue; ctx.save(); ctx.translate(Math.cos(ca)*cd,Math.sin(ca)*cd); ctx.globalAlpha=ca2; ctx.fillStyle=i%2===0?bossDef.color:'#F1C40F'; ctx.beginPath(); ctx.arc(0,0,Math.max(1,bossDef.size*0.22*(1-prog*0.7)),0,Math.PI*2); ctx.fill(); ctx.restore() }
    ctx.restore()
  }
  if (prog>0.5) {
    const ta=Math.min(1,(prog-0.5)*3); ctx.save(); ctx.globalAlpha=ta; ctx.font='22px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.shadowColor='#F1C40F'; ctx.shadowBlur=28; ctx.fillStyle='#F1C40F'; ctx.fillText('BOSS SLAIN',CW/2,CH/2-22)
    ctx.font='11px "Press Start 2P",monospace'; ctx.fillStyle=bossDef.color; ctx.shadowColor=bossDef.color; ctx.fillText(bossDef.name.toUpperCase()+' DEFEATED',CW/2,CH/2+18)
    ctx.restore()
  }
}

// ── hand-drawn vector ability glyphs (no emoji) — drawn centred at (cx,cy), ±11 unit box scaled by s ──
function drawAbilityIcon(ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, s: number, col: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 11, s / 11)
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowColor = col; ctx.shadowBlur = 5
  if (id === 'slam') {
    // impact burst — 8-point spiked star
    ctx.beginPath()
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 === 0 ? 11 : 4.5; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) }
    ctx.closePath(); ctx.fill()
  } else if (id === 'rage') {
    // rising flames
    ctx.beginPath()
    for (const fx of [-6.5, 0, 6.5]) { const h = fx === 0 ? 11 : 7.5; ctx.moveTo(fx, 9); ctx.quadraticCurveTo(fx - 4, 1, fx - 1.5, -h); ctx.quadraticCurveTo(fx, -h - 1.5, fx + 1.5, -h); ctx.quadraticCurveTo(fx + 4, 1, fx, 9) }
    ctx.fill()
  } else if (id === 'charge') {
    // blunt aggressive arrow + speed lines
    ctx.beginPath(); ctx.moveTo(-11, -5); ctx.lineTo(-6, -5); ctx.moveTo(-11, 5); ctx.lineTo(-6, 5); ctx.stroke()
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(3, 0); ctx.stroke(); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(3, -6.5); ctx.lineTo(3, 6.5); ctx.closePath(); ctx.fill()
  } else if (id === 'whirl') {
    // circular spin arrow + inner blades
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 8, -2.5, 1.9); ctx.stroke()
    const ea = 1.9, ex = Math.cos(ea) * 8, ey = Math.sin(ea) * 8
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ea + Math.PI / 2)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, -3.2); ctx.lineTo(-5, 3.2); ctx.closePath(); ctx.fill(); ctx.restore()
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-3.5, -3.5); ctx.lineTo(3.5, 3.5); ctx.moveTo(3.5, -3.5); ctx.lineTo(-3.5, 3.5); ctx.stroke()
  } else if (id === 'powershot') {
    // archer arrow (diagonal) with fletching
    ctx.save(); ctx.rotate(-Math.PI / 4); ctx.lineWidth = 2.2
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(5, -4.5); ctx.lineTo(5, 4.5); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-13, -4); ctx.moveTo(-10, 0); ctx.lineTo(-13, 4); ctx.moveTo(-7, 0); ctx.lineTo(-10, -3.5); ctx.moveTo(-7, 0); ctx.lineTo(-10, 3.5); ctx.stroke()
    ctx.restore()
  } else if (id === 'trap') {
    // snare ring with inward fangs
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke()
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5); ctx.lineTo(Math.cos(a) * 4.5, Math.sin(a) * 4.5); ctx.stroke() }
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill()
  } else if (id === 'dash') {
    // three speed chevrons
    ctx.lineWidth = 2.4
    for (let k = 0; k < 3; k++) { const x = -8 + k * 7; ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x + 5, 0); ctx.lineTo(x, 6); ctx.stroke() }
  } else if (id === 'rain') {
    // three falling arrows (staggered)
    const cols = [[-7, -2], [0, -9], [7, -2]]
    for (const c of cols) { const x = c[0], ty = c[1]; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x, ty + 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, ty + 12); ctx.lineTo(x - 3.5, ty + 7); ctx.moveTo(x, ty + 12); ctx.lineTo(x + 3.5, ty + 7); ctx.stroke() }
  } else if (id === 'bolt') {
    // arcane 4-point sparkle
    const pts = [[0, -11], [3, -3], [11, 0], [3, 3], [0, 11], [-3, 3], [-11, 0], [-3, -3]]
    ctx.beginPath(); pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]) }); ctx.closePath(); ctx.fill()
  } else if (id === 'shield') {
    // heater shield
    ctx.lineWidth = 2.2
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8.5, -5.5); ctx.lineTo(8, 3); ctx.quadraticCurveTo(4, 9.5, 0, 11); ctx.quadraticCurveTo(-4, 9.5, -8, 3); ctx.lineTo(-8.5, -5.5); ctx.closePath(); ctx.stroke()
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -6.5); ctx.lineTo(0, 9); ctx.stroke()
  } else if (id === 'surge') {
    // blink sparkle + orbiting motes
    const pts = [[0, -7], [2, -2], [7, 0], [2, 2], [0, 7], [-2, 2], [-7, 0], [-2, -2]]
    ctx.beginPath(); pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]) }); ctx.closePath(); ctx.fill()
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 10, Math.sin(a) * 10, 1.4, 0, Math.PI * 2); ctx.fill() }
  } else if (id === 'meteor') {
    // falling fireball with comet streaks
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(2, 2); ctx.moveTo(-6.5, -11); ctx.lineTo(3.5, -1); ctx.moveTo(-11, -6.5); ctx.lineTo(-1, 3.5); ctx.stroke()
    ctx.beginPath(); ctx.arc(5, 5, 5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, bossDef: BossDef, gear: GearId[], t: number) {
  void gear
  const p=g.player, b=g.boss
  const barW=540,barH=22,barX=(CW-barW)/2,barY=14
  ctx.fillStyle='rgba(4,4,14,0.92)'; rrect(ctx,barX-12,barY-9,barW+24,barH+24,8); ctx.fill()
  ctx.strokeStyle='rgba(200,155,60,0.38)'; ctx.lineWidth=1.5; ctx.stroke()
  ctx.font='10px "Press Start 2P",monospace'; ctx.fillStyle='#C89B3C'; ctx.textAlign='center'; ctx.fillText(bossDef.name.toUpperCase(),CW/2,barY+2)
  ctx.fillStyle='#1a0808'; ctx.fillRect(barX,barY+7,barW,barH-7)
  const enX=barX+barW*bossDef.enrageAt; ctx.strokeStyle='#FF4444'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(enX,barY+4); ctx.lineTo(enX,barY+barH+2); ctx.stroke()
  const hpRat=b.hp/b.maxHp, hpCol=g.bossEnraged?'#FF1111':hpRat>0.6?'#E74C3C':hpRat>0.3?'#E67E22':'#FF4444'
  const ghostRat=clamp(g.bossHpDisplay/b.maxHp,0,1)
  if (ghostRat>hpRat+0.001) { ctx.fillStyle='rgba(255,235,150,0.65)'; ctx.fillRect(barX+barW*hpRat,barY+7,barW*(ghostRat-hpRat),barH-7) }
  ctx.fillStyle=hpCol; ctx.fillRect(barX,barY+7,barW*hpRat,barH-7)
  // glossy top highlight for a more finished bar
  ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(barX,barY+7,barW*hpRat,(barH-7)*0.4)
  if (g.bossEnraged) { const p2=0.5+0.5*Math.sin(t*6); ctx.fillStyle=`rgba(255,0,0,${p2*0.22})`; ctx.fillRect(barX,barY+7,barW*hpRat,barH-7); ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#FF4444'; ctx.textAlign='right'; ctx.fillText('ENRAGED',barX+barW-2,barY+barH+2) }
  if (b.stunTimer>0) { ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#F1C40F'; ctx.textAlign='left'; ctx.fillText('STUNNED',barX+2,barY+barH+2) }
  // Frost Wyrm damage-gate banner above the bar
  if (g.dmgGate !== 'both') {
    const gp=0.55+0.45*Math.sin(t*5)
    ctx.font='9px "Press Start 2P",monospace'; ctx.textAlign='center'
    ctx.fillStyle=`rgba(159,232,255,${gp})`; ctx.shadowColor='#7fd4ff'; ctx.shadowBlur=10
    ctx.fillText(g.dmgGate==='melee'?'⚔ MELEE ONLY — RANGED DEFLECTED':'✷ RANGED ONLY — MELEE CANNOT REACH', CW/2, barY+barH+27)
    ctx.shadowBlur=0
    // stance-break meter: fill it (with the right weapon) to force the Wyrm to swap stance
    const sf=clamp(g.wyrmStagger/(g.wyrmStaggerMax||1),0,1), sbw=190, sbx=CW/2-sbw/2, sby=barY+barH+33
    ctx.fillStyle='rgba(4,4,14,0.7)'; ctx.fillRect(sbx,sby,sbw,5)
    ctx.fillStyle='#9fe8ff'; ctx.fillRect(sbx,sby,sbw*sf,5)
    ctx.strokeStyle='rgba(159,232,255,0.5)'; ctx.lineWidth=1; ctx.strokeRect(sbx,sby,sbw,5)
    ctx.font='6px "Press Start 2P",monospace'; ctx.fillStyle='rgba(159,232,255,0.7)'; ctx.fillText('STANCE BREAK', CW/2, sby+13)
  }
  ctx.font='7px "Press Start 2P",monospace'; ctx.fillStyle='rgba(200,155,60,0.5)'; ctx.textAlign='center'
  ctx.fillText(`${Math.ceil(b.hp).toLocaleString()} / ${b.maxHp.toLocaleString()}`,CW/2,barY+barH+14)

  // ── combo meter — builds as you chain hits, escalates in colour, pops on each hit ──
  if (g.combo >= 2) {
    const sinceHit = 2.0 - g.comboTimer
    const pop = 1 + Math.max(0, 1 - sinceHit / 0.13) * 0.5
    const fade = clamp(g.comboTimer / 0.6, 0, 1)
    const cc = g.combo >= 20 ? '#FFF7C0' : g.combo >= 10 ? '#FF5566' : g.combo >= 5 ? '#FF9A3C' : '#C89B3C'
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(CW / 2, barY + barH + 40); ctx.scale(pop, pop); ctx.textAlign = 'center'
    ctx.font = '16px "Press Start 2P",monospace'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'
    ctx.shadowColor = cc; ctx.shadowBlur = 12; ctx.fillStyle = cc
    ctx.strokeText(`${g.combo} HIT`, 0, 0); ctx.fillText(`${g.combo} HIT`, 0, 0)
    ctx.shadowBlur = 0; ctx.font = '6px "Press Start 2P",monospace'; ctx.fillStyle = '#A09880'; ctx.fillText('COMBO', 0, 12)
    ctx.restore()
  }
  ctx.textAlign = 'left'

  const pBW=200,pBH=14,pBX=14,pBY=CH-90
  ctx.fillStyle='rgba(4,4,14,0.92)'; rrect(ctx,pBX-6,pBY-20,pBW+12,pBH+36,8); ctx.fill()
  ctx.strokeStyle=`${wpn.color}66`; ctx.lineWidth=1.5; ctx.stroke()
  ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle=wpn.color; ctx.textAlign='left'; ctx.fillText(wpn.icon+' '+wpn.name.toUpperCase(),pBX,pBY-8)
  ctx.fillStyle='#1a0808'; ctx.fillRect(pBX,pBY,pBW,pBH)
  const ph=p.hp/p.maxHp
  const pGhost=clamp(g.playerHpDisplay/p.maxHp,0,1)
  if (pGhost>ph+0.001) { ctx.fillStyle='rgba(255,235,150,0.6)'; ctx.fillRect(pBX+pBW*ph,pBY,pBW*(pGhost-ph),pBH) }
  ctx.fillStyle=ph>0.5?'#27AE60':ph>0.25?'#F39C12':'#E74C3C'; ctx.fillRect(pBX,pBY,pBW*ph,pBH)
  if (ph<0.25) { const lp=0.5+0.5*Math.sin(t*9); ctx.fillStyle=`rgba(255,40,40,${lp*0.3})`; ctx.fillRect(pBX,pBY,pBW*ph,pBH) }   // low-HP danger pulse
  ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(pBX,pBY,pBW*ph,pBH*0.4)
  // ── on-hit HP-bar flash: bright red wash + glowing border so a hit is impossible to miss ──
  if (g.hpBarFlash > 0) {
    const f = clamp(g.hpBarFlash / 0.6, 0, 1)
    ctx.save()
    ctx.fillStyle = `rgba(255,30,30,${f * 0.55})`; ctx.fillRect(pBX, pBY, pBW, pBH)
    ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.6 * f})`; ctx.lineWidth = 2.5; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16 * f
    ctx.strokeRect(pBX - 2, pBY - 2, pBW + 4, pBH + 4)
    ctx.restore()
  }
  ctx.font='8px "Press Start 2P",monospace'; ctx.fillStyle = g.hpBarFlash > 0.05 ? '#FF6666' : '#A09880'; ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`,pBX,pBY+pBH+12)
  // ── dual-weapon swap indicator (shows the stowed weapon) ──
  if (g.altWeapon) {
    ctx.font='7px "Press Start 2P",monospace'; ctx.textAlign='left'
    ctx.fillStyle='rgba(180,170,150,0.65)'; ctx.fillText('TAB ⇄', pBX, pBY+pBH+26)
    ctx.fillStyle=g.altWeapon.color; ctx.fillText(g.altWeapon.name.toUpperCase(), pBX+42, pBY+pBH+26)
    // "wrong stance" prompt — flashes when your active weapon can't hurt the boss (Frost Wyrm)
    const mismatch = (g.dmgGate==='melee' && g.activeSlot!==0) || (g.dmgGate==='ranged' && g.activeSlot===0)
    if (mismatch) {
      const sp=0.5+0.5*Math.sin(t*8)
      ctx.font='10px "Press Start 2P",monospace'; ctx.textAlign='center'
      ctx.fillStyle=`rgba(255,220,120,${0.55+0.45*sp})`; ctx.shadowColor='#FFD24A'; ctx.shadowBlur=12
      ctx.fillText('⇄ SWAP WEAPON! (TAB)', CW/2, barY+barH+58); ctx.shadowBlur=0
    }
    ctx.textAlign='left'
  }

  const dCX=pBX+pBW+46, dBW=68, dBH=28, dBY=pBY-1
  const canD=p.dodgeChargeMode?p.featherCharges>0:p.dodgeCd<=0
  ctx.save()
  ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center'
  ctx.fillStyle=canD?'#C89B3C':'#3a3020'
  if (canD) { ctx.shadowColor='#C89B3C'; ctx.shadowBlur=8 }
  ctx.fillText('DODGE',dCX,dBY-3)
  ctx.shadowBlur=0
  if (canD) { ctx.shadowColor='#C89B3C'; ctx.shadowBlur=16 }
  ctx.fillStyle=canD?'#1e1608':'#090910'
  rrect(ctx,dCX-dBW/2,dBY,dBW,dBH,5); ctx.fill()
  ctx.strokeStyle=canD?'#C89B3C':'#2a2010'; ctx.lineWidth=canD?2:1; ctx.stroke()
  ctx.shadowBlur=0
  ctx.font='8px "Press Start 2P",monospace'
  ctx.fillStyle=canD?'#F1C40F':'#3a3020'
  ctx.fillText('SPACE',dCX,dBY+dBH/2+3)
  ctx.restore()
  if (!p.dodgeChargeMode && p.dodgeCd>0) {
    ctx.font='7px "Press Start 2P",monospace'; ctx.fillStyle='#E74C3C'; ctx.textAlign='center'
    ctx.fillText(p.dodgeCd.toFixed(1)+'s',dCX,dBY+dBH+11)
  }
  if (p.dodgeChargeMode) { for (let i=0;i<3;i++) { ctx.fillStyle=i<p.featherCharges?'#C89B3C':'rgba(200,155,60,0.18)'; ctx.beginPath(); ctx.arc(dCX-14+i*14,dBY+dBH+9,5,0,Math.PI*2); ctx.fill() } }

  const slW=54,slH=54,slY=CH-90, tsW=4*slW+3*7, slX=CW/2-tsW/2
  const kkeys=['Q','W','E','R']
  wpn.abilities.forEach((ab,i) => {
    const sx=slX+i*(slW+7), cx=sx+slW/2, cy=slY+slH/2
    const cd=p.abilityCds[i], cdPct=clamp(cd/ab.cd,0,1), ready=cd<=0
    const rf=p.abilityReadyFlash[i]
    // slot background
    ctx.fillStyle='rgba(4,4,14,0.93)'; rrect(ctx,sx,slY,slW,slH,8); ctx.fill()
    // border — steady glow when ready, bright pulse the moment it comes off cooldown
    ctx.save()
    if (ready) { ctx.shadowColor=wpn.color; ctx.shadowBlur=10+(rf>0?rf*36:0); ctx.strokeStyle=rf>0?'#FFFFFF':`${wpn.color}DD`; ctx.lineWidth=rf>0?2.6:1.6 }
    else { ctx.strokeStyle='rgba(70,55,35,0.6)'; ctx.lineWidth=1.5 }
    rrect(ctx,sx,slY,slW,slH,8); ctx.stroke(); ctx.restore()
    // ability icon (hand-drawn vector glyph)
    ctx.save(); ctx.globalAlpha=ready?1:0.4
    drawAbilityIcon(ctx, ab.icon, cx, cy-3, 11, ready?wpn.color:'#7a6a48')
    ctx.restore()
    // key badge (top-left)
    ctx.font='8px "Press Start 2P",monospace'; ctx.textAlign='left'; ctx.textBaseline='top'
    ctx.fillStyle=ready?wpn.color:'#6a5a40'; ctx.fillText(kkeys[i],sx+4,slY+4)
    // ability name (bottom)
    ctx.font='5px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.textBaseline='alphabetic'
    ctx.fillStyle=ready?'#A09880':'#504030'; ctx.fillText(ab.name.toUpperCase(),cx,slY+slH-5)
    // cooldown: radial dark sweep + seconds remaining
    if (!ready) {
      ctx.save(); ctx.beginPath(); rrect(ctx,sx,slY,slW,slH,8); ctx.clip()
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(cx,cy)
      ctx.arc(cx,cy,slW,-Math.PI/2,-Math.PI/2+Math.PI*2*cdPct,false); ctx.closePath(); ctx.fill(); ctx.restore()
      ctx.font='13px "Press Start 2P",monospace'; ctx.fillStyle='#E8D9A8'; ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText(Math.ceil(cd).toString(),cx,cy)
    }
  })
  ctx.textBaseline='alphabetic'; ctx.textAlign='left'

  let stX=14; const stY=CH-102
  if (g.rageActive) { ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#E74C3C'; ctx.fillText(`RAGE ${Math.ceil(g.rageTimer)}s`,stX,stY); stX+=88 }
  if (p.slowTimer>0) { ctx.fillStyle='#8BC8FF'; ctx.fillText(`SLOWED ${Math.ceil(p.slowTimer)}s`,stX,stY); stX+=98 }
  if (g.poisonTimer>0) { ctx.fillStyle='#7FBA00'; ctx.fillText(`POISON ${Math.ceil(g.poisonTimer)}s`,stX,stY) }
  void stX

  const mmX=CW-88,mmY=CH-72,mmW=78,mmH=60
  ctx.fillStyle='rgba(4,4,14,0.78)'; ctx.strokeStyle='rgba(200,155,60,0.25)'; ctx.lineWidth=1
  ctx.fillRect(mmX,mmY,mmW,mmH); ctx.strokeRect(mmX,mmY,mmW,mmH)
  const mx=(p.pos.x/WW)*mmW, my=(p.pos.y/WH)*mmH
  ctx.fillStyle=wpn.color; ctx.beginPath(); ctx.arc(mmX+mx,mmY+my,3,0,Math.PI*2); ctx.fill()
  const bx2=(g.boss.pos.x/WW)*mmW, by2=(g.boss.pos.y/WH)*mmH
  ctx.fillStyle='#E74C3C'; ctx.beginPath(); ctx.arc(mmX+bx2,mmY+by2,4,0,Math.PI*2); ctx.fill()
}

function renderMinions(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.minions.forEach(m => {
    const hw = m.hitFlash > 0 && Math.sin(m.hitFlash * 80) > 0
    const sc = m.spawnAnim > 0 ? clamp(1 - m.spawnAnim / 0.45, 0.1, 1) : 1
    ctx.save(); ctx.translate(m.pos.x, m.pos.y); ctx.scale(sc, sc)
    ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 8
    // 8 scuttling legs
    ctx.strokeStyle = hw ? '#FFF' : '#5B2C7A'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, li = i % 4
      const baseA = (side === -1 ? Math.PI : 0) + (li - 1.5) * 0.5
      const wave = Math.sin(m.legPhase + i * 0.7) * 0.35
      const kx = Math.cos(baseA + wave) * 9, ky = Math.sin(baseA + wave) * 9
      const tx = Math.cos(baseA + wave * 1.6) * 15, ty = Math.sin(baseA + wave * 1.6) * 15
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(kx, ky, tx, ty); ctx.stroke()
    }
    ctx.lineCap = 'butt'
    ctx.fillStyle = hw ? '#FFF' : '#3D1560'; ctx.beginPath(); ctx.ellipse(2, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = hw ? '#FFF' : '#5D1E8A'; ctx.beginPath(); ctx.arc(-6, 0, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FF3355'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(-8, -2, 1.6, 0, Math.PI * 2); ctx.arc(-8, 2, 1.6, 0, Math.PI * 2); ctx.fill()
    if (m.hp < m.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-10, -16, 20, 3); ctx.fillStyle = '#C0392B'; ctx.fillRect(-10, -16, 20 * (m.hp / m.maxHp), 3) }
    ctx.restore()
  })
}

function renderPlayerDeath(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  const p = g.player, total = 2.6, prog = clamp(1 - g.playerDeathAnim / total, 0, 1)
  const x = p.pos.x, y = p.pos.y
  // dark pool spreading beneath the fallen hunter
  ctx.save(); ctx.globalAlpha = Math.min(0.7, prog * 1.2)
  const pool = ctx.createRadialGradient(x, y + 8, 2, x, y + 8, 32 + prog * 44)
  pool.addColorStop(0, 'rgba(95,0,0,0.9)'); pool.addColorStop(1, 'rgba(40,0,0,0)')
  ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(x, y + 8, 32 + prog * 44, 14 + prog * 20, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // body — collapsing, fading, reddening, sinking
  const sink = prog * 9, r = Math.max(1, 16 * (1 - prog * 0.5))
  ctx.save(); ctx.globalAlpha = 1 - prog * 0.78
  ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16
  const bg = ctx.createRadialGradient(x - 3, y - 3 + sink, 0, x, y + sink, r)
  bg.addColorStop(0, '#F1948A'); bg.addColorStop(0.6, '#C0392B'); bg.addColorStop(1, '#5b0a0a')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y + sink, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = (1 - prog) * 0.8; ctx.strokeStyle = '#2a0000'; ctx.lineWidth = 1.5
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + prog; ctx.beginPath(); ctx.moveTo(x, y + sink); ctx.lineTo(x + Math.cos(a) * r, y + sink + Math.sin(a) * r); ctx.stroke() }
  ctx.restore()
  // soul wisp drifting up
  ctx.save(); ctx.globalAlpha = Math.max(0, 0.65 - prog * 0.65)
  ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(x + Math.sin(t * 3) * 6, y - prog * 64, 4 * (1 - prog), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function render(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, bossId: BossId, gear: GearId[], t: number) {
  ctx.save()
  if (g.screenShake>0.05) ctx.translate(rnd(-g.screenShake*8,g.screenShake*8),rnd(-g.screenShake*8,g.screenShake*8))
  const bossDef=BOSS_DEFS[bossId]
  ctx.save(); ctx.scale(g.zoom, g.zoom); ctx.translate(-g.camX,-g.camY)
  renderArena(ctx,bossDef.arenaType,t,g)
  renderEnvObjects(ctx,g,bossDef.arenaType,t)
  if (g.phase==='dying') {
    renderParticles(ctx,g); renderBossDeath(ctx,g,bossId)
    renderPlayer(ctx,g,wpn,gear,t); renderDamageNumbers(ctx,g)
  } else if (g.phase==='player_dying') {
    renderHazards(ctx,g); renderProjectiles(ctx,g,t)
    renderBoss(ctx,g,bossId,t); renderMinions(ctx,g,t)
    renderParticles(ctx,g); renderPlayerDeath(ctx,g,t)
  } else {
    renderHazards(ctx,g); renderSlowTraps(ctx,g,t); renderTelegraph(ctx,g,bossId,t)
    renderSkyArrows(ctx,g,t); renderParticles(ctx,g); renderProjectiles(ctx,g,t)
    if (bossId===2 && g.griffinState.mode===1) {
      // griffin swoop-dive telegraph (where it will dive)
      const b2=g.boss, gd=g.griffinState.dive, pl=0.5+0.5*Math.sin(t*18)
      ctx.save(); ctx.strokeStyle=`rgba(120,235,255,${0.5+0.4*pl})`; ctx.lineWidth=3+pl*2; ctx.setLineDash([16,9]); ctx.shadowColor='#00EEFF'; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(b2.pos.x,b2.pos.y); ctx.lineTo(b2.pos.x+gd.x*620,b2.pos.y+gd.y*620); ctx.stroke(); ctx.setLineDash([])
      const ex=b2.pos.x+gd.x*620, ey=b2.pos.y+gd.y*620, aa=Math.atan2(gd.y,gd.x)
      ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex-Math.cos(aa-0.4)*22,ey-Math.sin(aa-0.4)*22); ctx.moveTo(ex,ey); ctx.lineTo(ex-Math.cos(aa+0.4)*22,ey-Math.sin(aa+0.4)*22); ctx.stroke()
      ctx.restore()
    }
    renderBoss(ctx,g,bossId,t); renderMinions(ctx,g,t); renderPlayer(ctx,g,wpn,gear,t)
    renderFx(ctx,g,t)
    if (g.manaShieldTimer > 0) {
      const p = g.player, sp = 0.6 + 0.4 * Math.sin(t * 10), a = Math.min(1, g.manaShieldTimer * 2)
      const dth = weaponTheme(getWeaponId(wpn, gear))
      ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.globalCompositeOperation = 'lighter'
      ctx.shadowColor = dth.main; ctx.shadowBlur = 16
      const gr = ctx.createRadialGradient(0, 0, 8, 0, 0, 30)
      gr.addColorStop(0, hexA(dth.main, 0)); gr.addColorStop(0.7, hexA(dth.main, 0.12)); gr.addColorStop(1, hexA(dth.accent, 0.5 * sp))
      ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = a * 0.85; ctx.strokeStyle = dth.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) { const aa = t * 0.6 + i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(aa) * 28, Math.sin(aa) * 28); ctx.stroke() }
      ctx.restore()
    }
    renderDamageNumbers(ctx,g)
    if (g.tooCloseFlash > 0) {
      const p = g.player, a = Math.min(1, g.tooCloseFlash * 1.6)
      ctx.save(); ctx.globalAlpha = a
      ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 2; ctx.setLineDash([5,4])
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 24, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#FF7777'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8
      ctx.font = 'bold 9px "Press Start 2P", monospace'; ctx.textAlign = 'center'
      ctx.fillText('TOO CLOSE', p.pos.x, p.pos.y - 34)
      ctx.restore()
    }
  }
  ctx.restore()
  if (g.phase==='playing') renderHUD(ctx,g,wpn,bossDef,gear,t)
  // ── cinematic death sequence overlay ──
  if (g.phase==='player_dying') {
    const total = 2.6, prog = clamp(1 - g.playerDeathAnim / total, 0, 1)
    if (prog < 0.14) { ctx.fillStyle = `rgba(170,18,18,${(0.14-prog)/0.14*0.6})`; ctx.fillRect(0,0,CW,CH) }   // impact flash
    const vg = ctx.createRadialGradient(CW/2, CH/2, CH*0.10, CW/2, CH/2, CH*0.98)
    vg.addColorStop(0, `rgba(24,0,0,${0.10+prog*0.45})`); vg.addColorStop(1, `rgba(0,0,0,${0.35+prog*0.6})`)
    ctx.fillStyle = vg; ctx.fillRect(0,0,CW,CH)
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, prog*0.65)})`; ctx.fillRect(0, CH*0.5-56, CW, 112)
    const tShow = clamp((prog-0.30)/0.32, 0, 1)
    if (tShow > 0) {
      ctx.save(); ctx.textAlign='center'; ctx.globalAlpha = tShow
      ctx.translate(CW/2, CH/2); ctx.scale(1.14 - tShow*0.14, 1.14 - tShow*0.14)
      ctx.fillStyle = '#8a0e0e'; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 28
      ctx.font = 'bold 30px "Press Start 2P", monospace'; ctx.fillText('YOU DIED', 0, 8)
      ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(180,30,30,${tShow})`; ctx.lineWidth = 2
      const ul = tShow*210; ctx.beginPath(); ctx.moveTo(-ul, 30); ctx.lineTo(ul, 30); ctx.stroke()
      ctx.restore(); ctx.textAlign='left'
    }
    if (prog > 0.82) { ctx.fillStyle = `rgba(0,0,0,${(prog-0.82)/0.18})`; ctx.fillRect(0,0,CW,CH) }   // fade to black handoff
  }
  if (g.playerDmgFlash > 0) {
    const a = Math.min(0.85, g.playerDmgFlash * 0.75)
    const vgn = ctx.createRadialGradient(CW/2, CH/2, CH*0.05, CW/2, CH/2, CH*0.82)
    vgn.addColorStop(0, 'rgba(220,0,0,0)')
    vgn.addColorStop(0.55, `rgba(225,10,10,${a*0.45})`)
    vgn.addColorStop(1, `rgba(225,10,10,${a})`)
    ctx.fillStyle = vgn; ctx.fillRect(0, 0, CW, CH)
    // punchy full-screen flash on the frame of impact, then it falls off fast
    const impact = Math.max(0, g.playerDmgFlash - 0.5)
    if (impact > 0) { ctx.fillStyle = `rgba(255,70,70,${impact * 0.7})`; ctx.fillRect(0, 0, CW, CH) }
  }
  if (g.phaseBanner) {
    const pb = g.phaseBanner, a = Math.min(1, pb.timer / 0.5)
    const isP3 = pb.text.includes('3')
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'
    ctx.fillStyle = isP3 ? 'rgba(40,4,10,0.6)' : 'rgba(34,12,4,0.55)'
    ctx.fillRect(0, CH * 0.28, CW, 66)
    ctx.fillStyle = isP3 ? '#FF5566' : '#FF9A3C'; ctx.shadowColor = isP3 ? '#FF0033' : '#FF6600'; ctx.shadowBlur = 16
    ctx.font = 'bold 20px "Press Start 2P", monospace'
    ctx.fillText(pb.text, CW / 2, CH * 0.28 + 30)
    ctx.shadowBlur = 0; ctx.fillStyle = '#E8E6E0'; ctx.font = '9px "Press Start 2P", monospace'
    ctx.fillText(pb.sub, CW / 2, CH * 0.28 + 52)
    ctx.restore(); ctx.textAlign = 'left'
  }
  // ── cinematic boss intro — slams the boss name on screen as the fight opens ──
  if (g.introTimer > 0 && g.phase === 'playing') {
    const total = 2.6, it = g.introTimer
    const inP = clamp((total - it) / 0.45, 0, 1)   // slam/scale in
    const outA = clamp(it / 0.6, 0, 1)             // fade out near the end
    const a = Math.min(inP, outA)
    const ec = bossDef.element === 'poison' ? '#b370e0' : bossDef.element === 'fire' ? '#ff8a1a' : '#5fe6ff'
    const topY = CH * 0.30
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, topY, CW, 96)
    ctx.fillStyle = ec; ctx.shadowColor = ec; ctx.shadowBlur = 5
    ctx.fillRect(0, topY, CW * inP, 2); ctx.fillRect(CW * (1 - inP), topY + 94, CW * inP, 2)
    ctx.shadowBlur = 0
    ctx.font = '7px "Press Start 2P",monospace'; ctx.fillStyle = '#A09880'
    ctx.fillText('— NOW ENTERING —', CW / 2, topY + 24)
    ctx.save(); ctx.translate(CW / 2, topY + 54); const sc = 1.28 - 0.28 * inP; ctx.scale(sc, sc)
    ctx.font = 'bold 26px "Press Start 2P",monospace'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.shadowColor = ec; ctx.shadowBlur = 22
    ctx.strokeText(bossDef.name.toUpperCase(), 0, 0); ctx.fillStyle = ec; ctx.fillText(bossDef.name.toUpperCase(), 0, 0)
    ctx.restore()
    ctx.font = '8px "Press Start 2P",monospace'; ctx.shadowBlur = 0; ctx.fillStyle = '#E8E6E0'
    ctx.fillText(`${bossDef.element.toUpperCase()}  ⚔  THE HUNT BEGINS`, CW / 2, topY + 82)
    ctx.restore(); ctx.textAlign = 'left'
  }
  ctx.restore()
}
/* ═══ FASTEST-KILL LEADERBOARD ═══ */
function fmtKillTime(ms: number): string {
  const t = ms / 1000
  if (t < 60) return t.toFixed(1) + 's'
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

interface BossRunRow { rank: number; username: string; timeMs: number; isCurrentUser: boolean }
function BossLeaderboard({ boss, refreshKey = 0, highlightRank }: { boss: number; refreshKey?: number; highlightRank?: number | null }) {
  const [rows, setRows] = useState<BossRunRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/boss-hunter/leaderboard/${boss}`)
      .then(r => r.json())
      .then(d => { if (alive) { setRows(Array.isArray(d) ? d : []); setLoading(false) } })
      .catch(() => { if (alive) { setRows([]); setLoading(false) } })
    return () => { alive = false }
  }, [boss, refreshKey])
  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #C89B3C40', borderRadius: 8, padding: '12px 14px', fontFamily: '"Press Start 2P",monospace' }}>
      <div style={{ fontSize: 8, color: '#C89B3C', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>🏆 FASTEST KILLS</div>
      {loading ? (
        <div style={{ fontSize: 7, color: '#a09880', textAlign: 'center' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 7, color: '#a09880', textAlign: 'center', lineHeight: 1.9 }}>No kills yet —<br />be the first!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(r => {
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`
            const hot = r.isCurrentUser && highlightRank === r.rank
            return (
              <div key={r.rank} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 7.5,
                color: r.isCurrentUser ? '#C89B3C' : '#d8d2c4',
                background: hot ? 'rgba(200,155,60,0.16)' : 'transparent',
                borderRadius: 4, padding: hot ? '2px 4px' : 0,
              }}>
                <span style={{ width: 20, textAlign: 'center' }}>{medal}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}{r.isCurrentUser ? ' ★' : ''}</span>
                <span style={{ color: r.rank <= 3 ? '#fff' : '#a8e0b0' }}>{fmtKillTime(r.timeMs)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══ PREPARE-SCREEN VECTOR ART — hand-drawn inline SVG (crisp & scalable, no emoji) ═══ */
function prepIcon(size: number, color: string, body: JSX.Element): JSX.Element {
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', filter: `drop-shadow(0 0 7px ${color}bb)` }}>{body}</svg>
}
function bossSvg(bossId: number, color: string, size: number): JSX.Element {
  if (bossId === 0) return prepIcon(size, color, <g>
    <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 46 L30 34 L16 40" /><path d="M50 50 L28 50 L12 55" /><path d="M50 55 L30 62 L16 72" /><path d="M50 60 L33 70 L21 82" />
      <path d="M50 46 L70 34 L84 40" /><path d="M50 50 L72 50 L88 55" /><path d="M50 55 L70 62 L84 72" /><path d="M50 60 L67 70 L79 82" />
    </g>
    <ellipse cx="50" cy="60" rx="16" ry="20" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2.5" />
    <ellipse cx="50" cy="39" rx="11" ry="10" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
    <path d="M46 47 L44 55 M54 47 L56 55" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <g fill="#ff4757"><circle cx="45.5" cy="37" r="2" /><circle cx="54.5" cy="37" r="2" /><circle cx="42" cy="41" r="1.5" /><circle cx="58" cy="41" r="1.5" /></g>
  </g>)
  if (bossId === 1) return prepIcon(size, color, <g strokeLinejoin="round">
    <path d="M46 30 Q34 12 22 8 Q40 18 50 34 Z" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2" />
    <path d="M28 42 Q40 28 58 38 L86 50 L83 56 L58 58 L36 60 Q26 54 28 42 Z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2.5" />
    <path d="M44 60 L80 56 L70 70 L46 67 Z" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2.5" />
    <path d="M58 58 l3 6 l3 -6 z M66 57 l3 6 l3 -6 z" fill="#f0ead6" />
    <circle cx="44" cy="47" r="4" fill="#fff" /><circle cx="44" cy="47" r="2.2" fill={color} />
    <circle cx="82" cy="52" r="2" fill={color} />
  </g>)
  if (bossId === 2) return prepIcon(size, color, <g strokeLinejoin="round">
    <path d="M50 52 Q24 30 8 44 Q24 44 34 54 Q16 52 12 66 Q34 58 50 60 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
    <path d="M50 52 Q76 30 92 44 Q76 44 66 54 Q84 52 88 66 Q66 58 50 60 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
    <path d="M44 58 L42 82 L58 82 L56 58 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M44 34 L40 22 M50 32 L50 20 M56 34 L60 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="44" r="10" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
    <path d="M59 41 L72 45 L59 49 Z" fill="#dcad3c" stroke="#7d5811" strokeWidth="1" />
    <circle cx="52" cy="42" r="2" fill="#fff" />
  </g>)
  // Frost Wyrm — winged western dragon with horns
  return prepIcon(size, color, <g strokeLinejoin="round">
    {/* wings */}
    <path d="M40 46 Q16 26 6 40 Q20 42 28 50 Q12 50 10 62 Q28 54 42 54 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
    <path d="M60 46 Q84 26 94 40 Q80 42 72 50 Q88 50 90 62 Q72 54 58 54 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
    {/* body + tail */}
    <ellipse cx="50" cy="54" rx="14" ry="17" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2.5" />
    <path d="M50 70 Q46 84 54 88 Q49 80 54 72 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
    {/* legs */}
    <path d="M40 64 L32 76 M60 64 L68 76" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* horned head */}
    <path d="M42 26 Q38 14 32 10 Q40 18 44 28 Z M58 26 Q62 14 68 10 Q60 18 56 28 Z" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5" />
    <path d="M50 24 Q40 30 42 40 Q50 44 58 40 Q60 30 50 24 Z" fill={color} fillOpacity="0.32" stroke={color} strokeWidth="2.5" />
    <path d="M44 42 L50 50 L56 42 Z" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
    {/* glowing eyes */}
    <circle cx="46" cy="34" r="2" fill="#fff" /><circle cx="54" cy="34" r="2" fill="#fff" />
  </g>)
}
function weaponSvg(id: string, color: string, size: number): JSX.Element {
  const steel = '#d6deea', steelMid = '#9aa3b2'
  if (id === 'spider_fang') return prepIcon(size, color, <g>
    {[-1, 1].map(s => (
      <g key={s} transform={`rotate(${s * 30} 50 50)`}>
        <path d="M50 12 L55 26 L52 60 L48 60 L45 26 Z" fill="#e6d2f5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="43" y="60" width="14" height="4" rx="1" fill={color} />
        <rect x="47" y="64" width="6" height="12" rx="1" fill="#3a2a4a" />
      </g>
    ))}
  </g>)
  if (id === 'drake_sword') return prepIcon(size, color, <g strokeLinejoin="round">
    <path d="M50 8 L61 24 L57 60 L43 60 L39 24 Z" fill="#f0c674" stroke={color} strokeWidth="2" />
    <line x1="50" y1="20" x2="50" y2="56" stroke="#b07a20" strokeWidth="2" />
    <path d="M26 60 L74 60 L66 69 L34 69 Z" fill={color} />
    <rect x="45" y="69" width="10" height="19" fill="#3a2410" />
    <circle cx="50" cy="90" r="5.5" fill={color} />
  </g>)
  if (id === 'thunder_blade') return prepIcon(size, color, <g strokeLinejoin="round">
    <path d="M50 12 L57 26 L54 62 L46 62 L43 26 Z" fill="#fbeaa0" stroke={color} strokeWidth="2" />
    <path d="M50 22 L45 34 L53 40 L46 52 L51 58" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <rect x="35" y="62" width="30" height="6" rx="2" fill={color} />
    <rect x="46" y="68" width="8" height="16" fill="#2a2008" />
    <circle cx="50" cy="87" r="5" fill={color} />
  </g>)
  if (id === 'sword') return prepIcon(size, color, <g strokeLinejoin="round">
    <path d="M50 12 L56 24 L54 64 L46 64 L44 24 Z" fill={steel} stroke={steelMid} strokeWidth="2" />
    <line x1="50" y1="22" x2="50" y2="60" stroke="#aab3c2" strokeWidth="1.5" />
    <rect x="35" y="64" width="30" height="6" rx="2" fill={color} />
    <rect x="46" y="70" width="8" height="16" fill="#5a3a1a" />
    <circle cx="50" cy="89" r="5" fill={color} />
  </g>)
  if (id === 'venom_bow') return prepIcon(size, color, <g fill="none" strokeLinecap="round">
    <path d="M64 12 Q88 50 64 88" stroke="#6A2C84" strokeWidth="5" />
    <path d="M64 12 L52 50 L64 88" stroke="#aad24a" strokeWidth="1.6" />
    <path d="M70 22 L80 18 M73 40 L84 38 M73 60 L84 62 M70 78 L80 82" stroke={color} strokeWidth="2" />
    <line x1="18" y1="50" x2="58" y2="50" stroke={color} strokeWidth="2.5" />
    <path d="M18 50 L26 45 L26 55 Z" fill="#9ACD00" stroke="none" />
    <circle cx="64" cy="91" r="3" fill="#9ACD00" stroke="none" />
  </g>)
  if (id === 'storm_bow') return prepIcon(size, color, <g fill="none" strokeLinecap="round">
    <path d="M64 12 Q88 50 64 88" stroke={color} strokeWidth="5" />
    <path d="M64 12 L56 32 L62 42 L54 58 L64 88" stroke="#cffaff" strokeWidth="1.8" />
    <path d="M16 50 L34 50 L28 46 L42 50 L28 54 L34 50 L58 50" stroke="#fff" strokeWidth="2" />
    <path d="M16 50 L24 45 M16 50 L24 55" stroke={color} strokeWidth="2" />
  </g>)
  if (id === 'bow') return prepIcon(size, color, <g fill="none" strokeLinecap="round">
    <path d="M64 12 Q86 50 64 88" stroke="#8B5A2B" strokeWidth="5" />
    <path d="M64 12 Q58 16 60 22 M64 88 Q58 84 60 78" stroke={color} strokeWidth="3" />
    <path d="M64 12 L54 50 L64 88" stroke="#d2e8d2" strokeWidth="1.5" />
    <line x1="18" y1="50" x2="58" y2="50" stroke="#caa472" strokeWidth="2.5" />
    <path d="M18 50 L26 45 L26 55 Z" fill={color} stroke="none" />
    <path d="M54 50 L60 46 M54 50 L60 54" stroke={color} strokeWidth="1.8" />
  </g>)
  if (id === 'fire_staff') return prepIcon(size, color, <g>
    <line x1="50" y1="92" x2="50" y2="34" stroke="#4A1E00" strokeWidth="5" strokeLinecap="round" />
    <line x1="45" y1="50" x2="55" y2="50" stroke="#C8881E" strokeWidth="3" />
    <line x1="45" y1="66" x2="55" y2="66" stroke="#C8881E" strokeWidth="3" />
    <path d="M50 34 Q40 26 45 14 Q47 21 52 16 Q49 7 58 4 Q52 16 60 18 Q63 28 50 34 Z" fill={color} stroke="#FFB02A" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="51" cy="20" r="3" fill="#fff" />
  </g>)
  return prepIcon(size, color, <g>
    <line x1="50" y1="92" x2="50" y2="32" stroke="#3A1D49" strokeWidth="5" strokeLinecap="round" />
    <line x1="45" y1="50" x2="55" y2="50" stroke="#B0A8C0" strokeWidth="3" />
    <path d="M43 30 Q41 20 50 17 M57 30 Q59 20 50 17" fill="none" stroke="#9E86B8" strokeWidth="2.5" />
    <circle cx="50" cy="22" r="9" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="2" />
    <circle cx="50" cy="22" r="3.5" fill="#fff" />
  </g>)
}
function armourSvg(id: GearId | null, size: number): JSX.Element {
  const c = id === 'web_amulet' ? '#9B59B6' : id === 'ember_armor' ? '#FF6A1A' : id === 'feather_boots' ? '#9fc0ff' : id === 'wyrm_scale' ? '#7fd4ff' : '#5a6470'
  if (id === 'wyrm_scale') return prepIcon(size, c, <g strokeLinejoin="round">
    <path d="M28 30 Q50 23 72 30 L69 60 Q50 80 31 60 Z" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="3" />
    {/* overlapping dragon scales */}
    {[0, 1, 2].map(row => [0, 1, 2, 3].map(col => { const x = 34 + col * 11 - (row % 2) * 5.5, y = 36 + row * 12; if (Math.hypot(x - 50, (y - 48) * 1.1) > 24) return null; return <path key={`${row}-${col}`} d={`M${x} ${y} q5 5 0 9 q-5 -4 0 -9 z`} fill={c} fillOpacity="0.3" stroke={c} strokeWidth="1" /> }))}
    {/* frost crystal centre */}
    <path d="M50 40 L54 48 L50 58 L46 48 Z" fill="#e8f7ff" stroke={c} strokeWidth="1.2" />
  </g>)
  if (id === 'web_amulet') return prepIcon(size, c, <g fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round">
    <circle cx="50" cy="50" r="30" fill={c} fillOpacity="0.16" strokeWidth="3" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2; return <line key={i} x1="50" y1="50" x2={50 + Math.cos(a) * 30} y2={50 + Math.sin(a) * 30} /> })}
    {[12, 21, 30].map(r => <polygon key={r} fill="none" points={[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2; return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}` }).join(' ')} />)}
  </g>)
  if (id === 'ember_armor') return prepIcon(size, c, <g strokeLinejoin="round">
    <path d="M28 30 Q50 23 72 30 L69 60 Q50 80 31 60 Z" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="3" />
    <path d="M50 38 Q43 48 48 58 Q50 51 52 56 Q57 47 50 38 Z" fill={c} stroke="#FFD24A" strokeWidth="1.2" />
    <circle cx="36" cy="36" r="2" fill={c} /><circle cx="64" cy="36" r="2" fill={c} />
  </g>)
  if (id === 'feather_boots') return prepIcon(size, c, <g strokeLinejoin="round">
    <path d="M38 82 Q44 40 72 16 Q60 46 44 78 Z" fill={c} fillOpacity="0.22" stroke={c} strokeWidth="2.5" />
    <line x1="44" y1="76" x2="68" y2="22" stroke={c} strokeWidth="1.4" />
    {[0, 1, 2, 3].map(i => <line key={i} x1={47 + i * 5} y1={70 - i * 12} x2={57 + i * 5} y2={64 - i * 12} stroke={c} strokeWidth="1.2" />)}
  </g>)
  return prepIcon(size, c, <g strokeLinejoin="round">
    <path d="M50 16 L78 26 L74 56 Q60 78 50 84 Q40 78 26 56 L22 26 Z" fill={c} fillOpacity="0.18" stroke={c} strokeWidth="2.5" />
    <line x1="50" y1="24" x2="50" y2="78" stroke={c} strokeWidth="1.4" />
  </g>)
}

/* ═══ REACT COMPONENT ═══ */
export default function BossHunter() {
  const [screen, setScreen] = useState<'menu'|'hunt_select'|'playing'|'victory'|'defeat'>('menu')
  const [selWeapon, setSelWeapon] = useState<string>('bow')    // single equipped weapon (bosses 0-2)
  const [selMelee, setSelMelee] = useState<string>('sword')    // Wyrm only: equipped melee loadout id
  const [selRanged, setSelRanged] = useState<string>('bow')    // Wyrm only: equipped ranged loadout id
  const [selBoss, setSelBoss] = useState<BossId>(0)
  const [unlockedGear, setUnlockedGear] = useState<GearId[]>([])
  const [selArmour, setSelArmour] = useState<GearId | null>(null)
  const activeSlotRef = useRef(0)   // 0 = melee, 1 = ranged (swapped live with Tab)

  // Admins start with every weapon and armour unlocked
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN'
  const { on: godOn } = useGodMode()
  const godRef = useRef(false)
  godRef.current = godOn
  useEffect(() => {
    if (isAdmin) setUnlockedGear(Object.keys(GEAR_DEFS) as GearId[])
  }, [isAdmin])
  const [victoryBoss, setVictoryBoss] = useState(0)
  const [victoryTimeMs, setVictoryTimeMs] = useState(0)
  const [victoryStats, setVictoryStats] = useState<{ hits: number; combo: number }>({ hits: 0, combo: 0 })
  const [defeatInfo, setDefeatInfo] = useState<{ hpPct: number; combo: number }>({ hpPct: 100, combo: 0 })
  const [victoryRank, setVictoryRank] = useState<number | null>(null)
  const submittedRunRef = useRef(false)
  const [lastUnlockedGear, setLastUnlockedGear] = useState<GearId | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const menuCanvasRef = useRef<HTMLCanvasElement>(null)
  const playWrapRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [muted, setMuted] = useState(false)
  const gsRef = useRef<GS|null>(null)
  const rafRef = useRef<number>(0)
  const mouseWorldRef = useRef<V2>({x:CW/2,y:CH/2})
  const lastTRef = useRef<number>(0)
  const pendingAbilityRef = useRef<number|null>(null)
  const pendingDodgeRef = useRef(false)

  const getWpn = useCallback((wid: WeaponId) => WEAPON_DEFS.find(w => w.id === wid)!, [])

  // the equipped pair: a melee weapon (slot 0) + a ranged weapon (slot 1), sharing the armour
  const loadoutPair = useCallback(() => {
    const ml = LOADOUT_WEAPONS.find(w => w.id === selMelee) ?? LOADOUT_WEAPONS[0]
    const rl = LOADOUT_WEAPONS.find(w => w.id === selRanged) ?? LOADOUT_WEAPONS[1]
    return {
      ml, rl,
      meleeWpn: getWpn(ml.base), rangedWpn: getWpn(rl.base),
      meleeGear: [ml.gear, selArmour].filter(Boolean) as GearId[],
      rangedGear: [rl.gear, selArmour].filter(Boolean) as GearId[],
    }
  }, [selMelee, selRanged, selArmour, getWpn])

  const startGame = useCallback(() => {
    activeSlotRef.current = 0
    if (selBoss === 3) {
      // Frost Wyrm: dual-wield (melee + ranged), fixed HP; defense varies by the active weapon path
      const { meleeWpn, meleeGear } = loadoutPair()
      const g = mkState(meleeWpn, BOSS_DEFS[selBoss], meleeGear)
      g.player.hp = g.player.maxHp = 165 + (selArmour === 'ember_armor' ? 30 : 0)
      gsRef.current = g
    } else {
      // all other bosses: a single equipped weapon, normal per-weapon HP
      const lw = LOADOUT_WEAPONS.find(w => w.id === selWeapon) ?? LOADOUT_WEAPONS[1]
      gsRef.current = mkState(getWpn(lw.base), BOSS_DEFS[selBoss], [lw.gear, selArmour].filter(Boolean) as GearId[])
    }
    submittedRunRef.current = false
    Sfx.resume(); Sfx.roar()
    setScreen('playing')
  }, [loadoutPair, selBoss, selArmour, selWeapon, getWpn])

  const toggleFullscreen = useCallback(() => {
    const el = playWrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const fsEl = document.fullscreenElement || doc.webkitFullscreenElement
    if (!fsEl) {
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    }
  }, [])

  const fitCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    // Measure the true visible viewport, independent of the overlay element.
    const de = document.documentElement
    const vw = Math.min(window.innerWidth || Infinity, de.clientWidth || Infinity)
    const vh = Math.min(window.innerHeight || Infinity, de.clientHeight || Infinity)
    if (!isFinite(vw) || !isFinite(vh)) return
    const s = Math.min(vw / CW, vh / CH)
    c.style.width = Math.floor(CW * s) + 'px'
    c.style.height = Math.floor(CH * s) + 'px'
  }, [])

  useEffect(() => {
    if (screen !== 'playing' && screen !== 'hunt_select') return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    fitCanvas()
    const raf = requestAnimationFrame(fitCanvas)
    window.addEventListener('resize', fitCanvas)
    document.addEventListener('fullscreenchange', fitCanvas)
    document.addEventListener('webkitfullscreenchange', fitCanvas)
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fitCanvas)
      document.removeEventListener('fullscreenchange', fitCanvas)
      document.removeEventListener('webkitfullscreenchange', fitCanvas)
    }
  }, [screen, fitCanvas])

  // ── menu backdrop: a single STATIC poster of a looming boss in a glowing cavern ──
  // (rendered once + on resize, not animated per-frame — keeps the menu lag-free)
  useEffect(() => {
    if (screen !== 'menu') return
    const canvas = menuCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const bossId = Math.floor(Math.random() * 4) as BossId
    const g = mkState(WEAPON_DEFS[0], BOSS_DEFS[bossId], [])
    g.bossEnraged = true
    if (bossId === 1) g.boss.angle = -Math.PI / 2
    const T = bossId === 0 ? { g0: 'rgba(120,45,170,0.5)', g1: 'rgba(45,12,75,0.5)', rune: '#b370e0', emb: '155,89,182' }
          : bossId === 1 ? { g0: 'rgba(185,55,0,0.55)', g1: 'rgba(85,18,0,0.5)', rune: '#ff8a1a', emb: '255,95,26' }
          :                { g0: 'rgba(40,135,215,0.46)', g1: 'rgba(18,40,95,0.5)', rune: '#5fe6ff', emb: '122,160,255' }
    const embers = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, fl: Math.random() * 6.28 }))
    // frozen at a pleasant pose
    const t = 1.4
    g.gtime = t; g.boss.legPhase = t * 3.0; g.boss.spinePulse = t * 2.2; g.boss.lightningPhase = t * 4.5
    const draw = () => {
      const w = canvas.width = canvas.clientWidth || window.innerWidth
      const h = canvas.height = canvas.clientHeight || window.innerHeight
      const cx = w * 0.5, cy = h * 0.42
      ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, w, h)
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.9)
      gr.addColorStop(0, T.g0); gr.addColorStop(0.5, T.g1); gr.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h)
      // embers (static spread)
      ctx.shadowColor = `rgb(${T.emb})`; ctx.shadowBlur = 6
      embers.forEach(e => { ctx.fillStyle = `rgba(${T.emb},${0.35 + 0.4 * Math.sin(t * 4 + e.fl)})`
        ctx.beginPath(); ctx.arc(e.x * w, e.y * h, e.s, 0, Math.PI * 2); ctx.fill() })
      ctx.shadowBlur = 0
      // boss (loom)
      g.boss.pos.x = cx; g.boss.pos.y = cy - h * 0.04
      if (bossId === 1) { const segs = []; for (let i = 0; i < 30; i++) { const tt = i / 29; segs.push({ x: g.boss.pos.x + Math.sin((1 - tt) * 3) * 46 * (1 - tt), y: g.boss.pos.y + (1 - tt) * 190 }) } g.snakeTrail = segs }
      const sc = Math.min(w / 960, h / 600) * 1.85
      ctx.save(); ctx.translate(g.boss.pos.x, g.boss.pos.y); ctx.scale(sc, sc); ctx.translate(-g.boss.pos.x, -g.boss.pos.y)
      try { renderBoss(ctx, g, bossId, t) } catch { /* keep the menu alive */ }
      ctx.restore()
      // magic rune circle on the ground (foreground)
      const R = Math.min(w, h) * 0.2, rx = cx, ry = h * 0.78
      ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.4); ctx.globalAlpha = 0.85
      ctx.strokeStyle = T.rune; ctx.shadowColor = T.rune; ctx.shadowBlur = 22
      ctx.rotate(t * 0.25); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke()
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke()
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke() }
      ctx.rotate(-t * 0.5)
      for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = off + i * Math.PI * 2 / 3 - Math.PI / 2, px = Math.cos(a) * R * 0.62, py = Math.sin(a) * R * 0.62; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) } ctx.closePath(); ctx.stroke() }
      ctx.restore()
      // vignette
      const vg = ctx.createRadialGradient(cx, h * 0.5, h * 0.18, cx, h * 0.5, Math.max(w, h) * 0.72)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.88)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
    }
    draw(); window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [screen])

  // ── unlock audio on first interaction (browser autoplay policy) ──
  useEffect(() => {
    const unlock = () => Sfx.resume()
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  // ── background music keyed to the current screen / boss ──
  useEffect(() => {
    const track = screen === 'playing' ? `battle_${(['spider','drake','griffin','wyrm'] as const)[selBoss]}`
      : screen === 'hunt_select' ? 'prep'
      : screen === 'victory' ? 'victory' : screen === 'defeat' ? 'defeat' : 'menu'
    Sfx.playMusic(track)
  }, [screen, selBoss])
  useEffect(() => () => { Sfx.stopMusic() }, [])

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element }
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  const beginHunt = useCallback(() => {
    Sfx.resume(); Sfx.uiClick()
    startGame()
  }, [startGame])

  useEffect(() => {
    if (screen !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dual = selBoss === 3   // weapon swapping is a Frost-Wyrm-only mechanic
    const { ml, rl, meleeWpn, rangedWpn, meleeGear, rangedGear } = loadoutPair()
    const singleLw = LOADOUT_WEAPONS.find(w => w.id === selWeapon) ?? LOADOUT_WEAPONS[1]
    const singleWpn = getWpn(singleLw.base), singleGear = [singleLw.gear, selArmour].filter(Boolean) as GearId[]
    // the live-active weapon — for the Wyrm, slot 0=melee / slot 1=ranged (Tab-swapped); otherwise the single weapon
    const active = () => !dual ? { wpn: singleWpn, gear: singleGear }
      : activeSlotRef.current === 0 ? { wpn: meleeWpn, gear: meleeGear }
      : { wpn: rangedWpn, gear: rangedGear }

    const triggerDodge = () => {
      const g = gsRef.current; if (!g) return
      const p = g.player
      if (p.dodgeChargeMode ? p.featherCharges <= 0 : p.dodgeCd > 0) return
      if (p.dodgeTimer > 0) return
      const b = g.boss
      const dir = p.targetPos
        ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
        : norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      p.dodgeTimer = DODGE_DUR; p.iframeTimer = IFRAME_DUR
      p.dodgeVel = v(dir.x * 480, dir.y * 480)
      Sfx.dodge()
      if (p.dodgeChargeMode) {
        p.featherCharges = Math.max(0, p.featherCharges - 1)
        const slot = p.featherRecharge.findIndex(t => t <= 0)
        if (slot >= 0) p.featherRecharge[slot] = 5.0
      } else {
        p.dodgeCd = DODGE_CD
      }
    }

    const handleKey = (e: KeyboardEvent, dn: boolean) => {
      if (!dn) return
      Sfx.resume()
      if (e.repeat) return
      const g = gsRef.current; if (!g || g.phase !== 'playing') return
      if (e.code === 'Space') { e.preventDefault(); triggerDodge() }
      if (e.code === 'Tab' || e.code === 'KeyF') {   // swap melee ⇄ ranged (Frost Wyrm only)
        e.preventDefault()
        if (dual) {
          activeSlotRef.current = activeSlotRef.current === 0 ? 1 : 0
          g.player.atkTimer = Math.max(g.player.atkTimer, 0.3)   // brief swap recovery
          g.meleeHit = null; g.attackFlash = null
          spawnParticles(g, g.player.pos, 10, activeSlotRef.current === 0 ? '#E74C3C' : '#5fe0ff', 150, 0.4)
          Sfx.dodge()
        }
      }
      if (e.code === 'KeyQ') pendingAbilityRef.current = 0
      if (e.code === 'KeyW') pendingAbilityRef.current = 1
      if (e.code === 'KeyE') pendingAbilityRef.current = 2
      if (e.code === 'KeyR') pendingAbilityRef.current = 3
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const sx = (e.clientX - rect.left) * (CW / rect.width)
      const sy = (e.clientY - rect.top) * (CH / rect.height)
      const g = gsRef.current
      mouseWorldRef.current = g ? { x: sx / g.zoom + g.camX, y: sy / g.zoom + g.camY } : { x: sx, y: sy }
    }

    const handleClick = (e: MouseEvent) => {
      Sfx.resume()
      const g = gsRef.current; if (!g || g.phase !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const sx = (e.clientX - rect.left) * (CW / rect.width)
      const sy = (e.clientY - rect.top) * (CH / rect.height)
      g.player.targetPos = { x: sx / g.zoom + g.camX, y: sy / g.zoom + g.camY }
    }

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true)
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    lastTRef.current = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTRef.current) / 1000, 0.05)
      lastTRef.current = now
      const g = gsRef.current
      if (!g) { rafRef.current = requestAnimationFrame(loop); return }

      // resolve the live-active weapon + expose the stowed one for the HUD swap indicator (Wyrm only)
      const a = active()
      g.activeSlot = activeSlotRef.current
      if (dual) { const inactive = activeSlotRef.current === 0 ? rl : ml; g.altWeapon = { name: inactive.name, color: inactive.color, melee: activeSlotRef.current === 1 } }
      else g.altWeapon = null

      // ── hitstop: briefly freeze the simulation on heavy impacts (still renders) ──
      if (g.hitstop > 0 && (g.phase === 'playing' || g.phase === 'dying' || g.phase === 'player_dying')) {
        g.hitstop = Math.max(0, g.hitstop - dt)
        render(ctx, g, a.wpn, selBoss, a.gear, g.gtime)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const pending = pendingAbilityRef.current
      pendingAbilityRef.current = null
      pendingDodgeRef.current = false

      g.god = godRef.current
      tick(g, dt, a.wpn, selBoss, a.gear, mouseWorldRef.current, new Set(), mouseWorldRef.current, pending)

      if (g.phase === 'playing') {
        // music escalates with the fight: per-boss theme → per-boss enrage → shared frantic finale
        const bn = (['spider', 'drake', 'griffin', 'wyrm'] as const)[selBoss]
        if (g.bossDesperate) Sfx.playMusic('battle_final')
        else if (g.bossEnraged) Sfx.playMusic(`battle_${bn}_rage`)
        else Sfx.playMusic(`battle_${bn}`)
      }

      if (g.phase === 'victory') {
        const killMs = Math.round(g.gtime * 1000)
        setVictoryBoss(selBoss)
        setVictoryTimeMs(killMs)
        setVictoryStats({ hits: g.totalHits, combo: g.maxCombo })
        setVictoryRank(null)
        const newGear = BOSS_DEFS[selBoss].rewards.filter(r => !unlockedGear.includes(r)) as GearId[]
        const toUnlock = newGear.length > 0 ? newGear[Math.floor(Math.random() * newGear.length)] : null
        if (toUnlock) setUnlockedGear(prev => [...prev, toUnlock])
        setLastUnlockedGear(toUnlock)
        Sfx.victory(); if (toUnlock) Sfx.loot()
        setScreen('victory')
        // record fastest-kill run (logged-in players); a player may rank more than once
        if (!submittedRunRef.current) {
          submittedRunRef.current = true
          fetch('/api/boss-hunter/run', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boss: selBoss, timeMs: killMs }),
          }).then(r => r.ok ? r.json() : null).then(d => { if (d?.rank) setVictoryRank(d.rank) }).catch(() => {})
        }
        return
      }
      if (g.phase === 'defeat') {
        setDefeatInfo({ hpPct: Math.max(1, Math.round((g.boss.hp / g.boss.maxHp) * 100)), combo: g.maxCombo })
        setScreen('defeat'); return
      }

      render(ctx, g, a.wpn, selBoss, a.gear, g.gtime)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [screen, selWeapon, selMelee, selRanged, selBoss, selArmour, unlockedGear, getWpn, loadoutPair])

  // ─── MENU ───
  if (screen === 'menu') return (
    <div style={{background:'#05030a',minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:'"Press Start 2P",monospace',position:'relative',overflow:'hidden'}}>
      <style>{`
        @keyframes bh-pulse{0%,100%{text-shadow:0 0 20px #C89B3C,0 0 40px #C89B3C55}50%{text-shadow:0 0 50px #C89B3C,0 0 100px #C89B3Caa,0 0 160px #C89B3C44}}
        @keyframes bh-flicker{0%,100%{opacity:1}91%{opacity:1}93%{opacity:0.2}95%{opacity:1}97%{opacity:0.4}99%{opacity:1}}
        @keyframes bh-btn{0%,100%{box-shadow:0 0 20px #C89B3C55,0 4px 20px rgba(0,0,0,0.6)}50%{box-shadow:0 0 48px #C89B3Ccc,0 4px 32px rgba(0,0,0,0.9)}}
        .bh-title-1{animation:bh-pulse 2.5s ease-in-out infinite}
        .bh-title-2{animation:bh-pulse 2.5s 0.4s ease-in-out infinite}
        .bh-begin{animation:bh-btn 2s ease-in-out infinite}
      `}</style>

      <canvas ref={menuCanvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0,display:'block'}}/>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(to bottom,transparent 49%,rgba(200,155,60,0.03) 50%,transparent 51%)',backgroundSize:'100% 4px',zIndex:1}}/>

      <div style={{position:'relative',zIndex:2,textAlign:'center',padding:'7px',fontSize:7,color:'#c0392b',letterSpacing:2,animation:'bh-flicker 5s 1s infinite'}}>
        ⚠ WARNING — DANGEROUS BOSSES AHEAD — ENTER AT YOUR OWN RISK ⚠
      </div>

      <div style={{position:'relative',zIndex:2,textAlign:'center',paddingTop:'clamp(16px,3vh,34px)'}}>
        <div style={{fontSize:8,color:'#a07ad0',letterSpacing:4,marginBottom:14,textShadow:'0 0 10px #00000088'}}>◆ GARRET&apos;S WORLD PRESENTS ◆</div>
        <div className="bh-title-1" style={{fontSize:'clamp(40px,9vw,72px)',color:'#C89B3C',letterSpacing:6,lineHeight:1.04}}>BOSS</div>
        <div className="bh-title-2" style={{fontSize:'clamp(40px,9vw,72px)',color:'#C89B3C',letterSpacing:6,lineHeight:1.04}}>HUNTER</div>
      </div>

      <div style={{flex:1}}/>

      <div style={{position:'relative',zIndex:2,textAlign:'center',paddingBottom:'clamp(20px,4vh,40px)'}}>
        <button className="bh-begin" onClick={()=>{Sfx.resume(); Sfx.uiClick(); setScreen('hunt_select')}} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'2px solid #C89B3C44',color:'#0d0d14',padding:'16px 56px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'"Press Start 2P",monospace',letterSpacing:3}}>
          ▶&nbsp;BEGIN HUNT
        </button>
        <div style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap',marginTop:22}}>
          {([['🖱️','Move'],['SPACE','Dodge'],['Q W E R','Abilities'],['💀','Loot']] as [string,string][]).map(([k,v],i)=>(
            <div key={i} style={{fontSize:7,color:'#8a7a78',textShadow:'0 0 8px #000'}}><span style={{color:'#caa84a'}}>{k}</span>&nbsp;{v}</div>
          ))}
        </div>
        {unlockedGear.length > 0 && (
          <div style={{fontSize:7,color:'#6a5a58',marginTop:16,textShadow:'0 0 8px #000'}}>
            GEAR COLLECTED: <span style={{color:'#C89B3C'}}>{unlockedGear.length}</span>
            <span style={{color:'#8a7a78'}}> &bull; LOADOUT: {selBoss===3 ? `${(LOADOUT_WEAPONS.find(w=>w.id===selMelee)??LOADOUT_WEAPONS[0]).icon}${(LOADOUT_WEAPONS.find(w=>w.id===selRanged)??LOADOUT_WEAPONS[1]).icon}` : (LOADOUT_WEAPONS.find(w=>w.id===selWeapon)??LOADOUT_WEAPONS[1]).icon}{selArmour?' '+GEAR_DEFS[selArmour].icon:''}</span>
          </div>
        )}
      </div>
    </div>
  )

  // ─── PREPARE YOUR HUNT (carousel cards) ───
  if (screen === 'hunt_select') {
    const availWeapons = LOADOUT_WEAPONS.filter(w => !w.unlock || unlockedGear.includes(w.unlock))
    const availMelee = availWeapons.filter(w => w.base === 'sword')
    const availRanged = availWeapons.filter(w => w.base !== 'sword')
    let selMIdx = availMelee.findIndex(w => w.id === selMelee); if (selMIdx < 0) selMIdx = 0
    let selRIdx = availRanged.findIndex(w => w.id === selRanged); if (selRIdx < 0) selRIdx = 0
    const selML = availMelee[selMIdx], selRL = availRanged[selRIdx]
    const selMBase = WEAPON_DEFS.find(w => w.id === selML.base)!, selRBase = WEAPON_DEFS.find(w => w.id === selRL.base)!
    const selB = BOSS_DEFS[selBoss]

    const prevBoss = () => setSelBoss(((selBoss - 1 + 4) % 4) as BossId)
    const nextBoss = () => setSelBoss(((selBoss + 1) % 4) as BossId)
    const prevMelee = () => setSelMelee(availMelee[(selMIdx - 1 + availMelee.length) % availMelee.length].id)
    const nextMelee = () => setSelMelee(availMelee[(selMIdx + 1) % availMelee.length].id)
    const prevRanged = () => setSelRanged(availRanged[(selRIdx - 1 + availRanged.length) % availRanged.length].id)
    const nextRanged = () => setSelRanged(availRanged[(selRIdx + 1) % availRanged.length].id)
    // single-weapon selection (all bosses except the Frost Wyrm)
    const dual = selBoss === 3
    let selWIdx = availWeapons.findIndex(w => w.id === selWeapon); if (selWIdx < 0) selWIdx = 0
    const selLW = availWeapons[selWIdx], selWBase = WEAPON_DEFS.find(w => w.id === selLW.base)!
    const prevWeapon = () => setSelWeapon(availWeapons[(selWIdx - 1 + availWeapons.length) % availWeapons.length].id)
    const nextWeapon = () => setSelWeapon(availWeapons[(selWIdx + 1) % availWeapons.length].id)
    // shared weapon-card body builder
    const weaponCardBody = (lw: typeof selML, base: WeaponDef, color: string) => (
      <div style={{padding:'14px 14px 4px',textAlign:'center',background:`radial-gradient(ellipse at 50% 0%, ${color}1c 0%, transparent 62%)`}}>
        {pedestalNode(weaponSvg(lw.id, color, 54), color)}
        <div style={{fontSize:9,color,marginBottom:7,letterSpacing:1}}>{lw.name.toUpperCase()}</div>
        <div style={{marginBottom:9}}>{chip(base.element.toUpperCase(), color)} {lw.gear ? chip('UPGRADE','#C89B3C') : chip('STARTER','#605848')}</div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:9}}>
          {statBlock('DMG', String(base.dmg), '#C89B3C')}
          {statBlock('RANGE', String(base.range), '#C89B3C')}
        </div>
        <div style={{display:'inline-block',textAlign:'left'}}>
          {base.abilities.map((ab,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:6,color:'#9a8f70',marginBottom:4}}>
              <span style={{display:'inline-flex',width:14,height:14,alignItems:'center',justifyContent:'center',borderRadius:3,background:`${color}22`,border:`1px solid ${color}66`,color,flexShrink:0}}>{['Q','W','E','R'][i]}</span>
              {ab.name}
            </div>
          ))}
        </div>
      </div>
    )

    const armourOptions: Array<GearId | null> = [null, ...unlockedGear.filter(g => GEAR_CATEGORY[g] === 'defense')]
    const armourIdx = Math.max(0, armourOptions.indexOf(selArmour))
    const curArmour = selArmour
    const prevArmour = () => setSelArmour(armourOptions[(armourIdx - 1 + armourOptions.length) % armourOptions.length])
    const nextArmour = () => setSelArmour(armourOptions[(armourIdx + 1) % armourOptions.length])

    const arenaNames = ['Spider Lair','Lava Cavern','Storm Peak','Frozen Peak']

    const armColor = '#3aa0e0'
    const ag = curArmour ? GEAR_DEFS[curArmour] : null

    const navBtn = (onClick: ()=>void, label: string) => (
      <button onClick={onClick} className="bh-nav" style={{background:'#14141e',border:'1px solid #2f2c22',color:'#C8B98A',width:34,height:34,borderRadius:'50%',fontSize:17,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,lineHeight:1,alignSelf:'center'}}>
        {label}
      </button>
    )
    const dots = (total: number, active: number, color: string) => (
      <div style={{display:'flex',gap:6,justifyContent:'center',padding:'2px 0 12px'}}>
        {Array.from({length:total},(_,i)=>(
          <div key={i} style={{width:i===active?14:6,height:6,borderRadius:3,background:i===active?color:'#2a2820',boxShadow:i===active?`0 0 8px ${color}`:'none',transition:'all 0.2s'}}/>
        ))}
      </div>
    )
    const chip = (text: string, color: string) => (
      <span style={{display:'inline-block',padding:'3px 9px',borderRadius:10,background:`${color}1f`,border:`1px solid ${color}66`,color,fontSize:6,letterSpacing:1,verticalAlign:'middle'}}>{text}</span>
    )
    const statBlock = (label: string, val: string, color: string) => (
      <div style={{background:'#0b0b12',border:'1px solid #1e1c18',borderRadius:8,padding:'7px 12px',minWidth:62}}>
        <div style={{fontSize:5,color:'#605848',letterSpacing:1,marginBottom:4}}>{label}</div>
        <div style={{fontSize:9,color}}>{val}</div>
      </div>
    )
    const pedestalNode = (node: JSX.Element, color: string, dim?: boolean) => (
      <div style={{width:96,height:96,margin:'2px auto 10px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',background:`radial-gradient(circle, ${color}26 0%, transparent 68%)`,opacity:dim?0.5:1}}>
        {node}
      </div>
    )
    const cardShell = (label: string, color: string, prevFn: ()=>void, nextFn: ()=>void, animKey: string|number, dTotal: number, dActive: number, inner: JSX.Element) => (
      <div style={{flex:'1 1 0',minWidth:248,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
          <span style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,#2a2820)'}}/>
          <span style={{fontSize:7,color:'#8a7a55',letterSpacing:3}}>◆ {label}</span>
          <span style={{flex:1,height:1,background:'linear-gradient(90deg,#2a2820,transparent)'}}/>
        </div>
        <div style={{display:'flex',alignItems:'stretch',gap:8,flex:1}}>
          {navBtn(prevFn,'‹')}
          <div key={animKey} className="bh-prep-card bh-card-anim" style={{flex:1,display:'flex',flexDirection:'column',position:'relative',background:'linear-gradient(180deg,#101019,#09090f)',border:`1px solid ${color}66`,borderRadius:14,overflow:'hidden',boxShadow:`0 0 26px ${color}26, inset 0 1px 0 rgba(255,255,255,0.04)`}}>
            <div style={{height:3,background:`linear-gradient(90deg,transparent,${color},transparent)`}}/>
            <div style={{flex:1}}>{inner}</div>
            {dots(dTotal, dActive, color)}
          </div>
          {navBtn(nextFn,'›')}
        </div>
      </div>
    )

    return (
      <div style={{position:'fixed',inset:0,zIndex:9999,background:'#070710',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',padding:'24px',overflowY:'auto'}}>
        <style>{`
          @keyframes bh-card-in{from{opacity:0;transform:translateY(10px) scale(0.98)}to{opacity:1;transform:none}}
          @keyframes bh-start-glow{0%,100%{box-shadow:0 0 18px #C89B3C66,0 4px 16px rgba(0,0,0,0.6)}50%{box-shadow:0 0 42px #C89B3Ccc,0 4px 28px rgba(0,0,0,0.9)}}
          .bh-card-anim{animation:bh-card-in 0.22s ease}
          .bh-prep-card{transition:transform 0.15s ease,box-shadow 0.2s ease}
          .bh-prep-card:hover{transform:translateY(-3px)}
          .bh-nav{transition:all 0.14s ease}
          .bh-nav:hover{background:#26263a;color:#fff;border-color:#5a523a;transform:scale(1.1)}
          .bh-start{animation:bh-start-glow 2s ease-in-out infinite;transition:transform 0.12s ease}
          .bh-start:hover{transform:scale(1.04)}
          .bh-back:hover{background:#22222e;color:#E8E6E0}
        `}</style>

        {/* atmospheric layers keyed to the chosen quarry */}
        <div style={{position:'fixed',inset:0,pointerEvents:'none',background:`radial-gradient(ellipse at 50% 32%, ${selB.color}22 0%, transparent 58%)`,transition:'background 0.4s'}}/>
        <div style={{position:'fixed',inset:0,pointerEvents:'none',background:'linear-gradient(to bottom,transparent 49%,rgba(200,155,60,0.025) 50%,transparent 51%)',backgroundSize:'100% 4px'}}/>
        <div style={{position:'fixed',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.65) 100%)'}}/>

        <div style={{position:'relative',zIndex:2,maxWidth:1120,width:'100%',padding:'0 12px',textAlign:'center'}}>

          <div style={{marginBottom:22}}>
            <div style={{fontSize:7,color:'#8a7a55',letterSpacing:4,marginBottom:10}}>◆ GARRET&apos;S WORLD ◆</div>
            <div style={{fontSize:'clamp(15px,3vw,22px)',color:'#C89B3C',letterSpacing:3,textShadow:'0 0 26px #C89B3C66'}}>PREPARE YOUR HUNT</div>
            <div style={{fontSize:7,color:'#605848',marginTop:9}}>Choose your quarry, arm yourself, and descend</div>
            {dual && <div style={{fontSize:8,color:'#9fe8ff',marginTop:8,letterSpacing:1,textShadow:'0 0 12px #7fd4ff66'}}>❄ This hunt requires TWO weapons — a <span style={{color:'#E74C3C'}}>MELEE</span> and a <span style={{color:'#5fe0ff'}}>RANGED</span> — swap with TAB mid-fight</div>}
          </div>

          <div style={{display:'flex',gap:14,alignItems:'stretch',justifyContent:'center',flexWrap:'wrap'}}>

          {cardShell('TARGET', selB.color, prevBoss, nextBoss, selBoss, 4, selBoss,
            <div style={{padding:'16px 16px 4px',textAlign:'center',background:`radial-gradient(ellipse at 50% 0%, ${selB.color}1c 0%, transparent 62%)`}}>
              {pedestalNode(bossSvg(selBoss, selB.color, 64), selB.color)}
              <div style={{fontSize:11,color:selB.color,marginBottom:8,letterSpacing:1}}>{selB.name.toUpperCase()}</div>
              <div style={{marginBottom:11}}>{chip(selB.element.toUpperCase(), selB.color)} <span style={{fontSize:6,color:'#605848',marginLeft:5}}>{arenaNames[selBoss]}</span></div>
              <div style={{fontSize:7,color:'#7a6f58',lineHeight:1.9,marginBottom:13,minHeight:42}}>{selB.lore.slice(0,76)}&hellip;</div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                {statBlock('HP', selB.hp.toLocaleString(), '#E74C3C')}
                {statBlock('LOOT', `${selB.rewards.filter(r=>unlockedGear.includes(r)).length}/${selB.rewards.length}`, '#C89B3C')}
              </div>
            </div>
          )}

          {dual
            ? <>
                {cardShell('⚔ MELEE', selML.color, prevMelee, nextMelee, selML.id, availMelee.length, selMIdx, weaponCardBody(selML, selMBase, selML.color))}
                {cardShell('✷ RANGED', selRL.color, prevRanged, nextRanged, selRL.id, availRanged.length, selRIdx, weaponCardBody(selRL, selRBase, selRL.color))}
              </>
            : cardShell('WEAPON', selLW.color, prevWeapon, nextWeapon, selLW.id, availWeapons.length, selWIdx, weaponCardBody(selLW, selWBase, selLW.color))
          }

          {cardShell('ARMOUR', curArmour ? armColor : '#2a2c34', prevArmour, nextArmour, curArmour??'none', armourOptions.length, armourIdx,
            ag ? (
              <div style={{padding:'16px 16px 4px',textAlign:'center',background:`radial-gradient(ellipse at 50% 0%, ${armColor}1c 0%, transparent 62%)`}}>
                {pedestalNode(armourSvg(curArmour, 58), armColor)}
                <div style={{fontSize:9,color:'#E8E6E0',marginBottom:8}}>{ag.name}</div>
                <div style={{marginBottom:11}}>{chip('ARMOUR', armColor)}</div>
                <div style={{fontSize:7,color:'#7a6f58',lineHeight:1.9,minHeight:66}}>{ag.desc}</div>
              </div>
            ) : (
              <div style={{padding:'18px 16px 4px',textAlign:'center'}}>
                {pedestalNode(armourSvg(null, 54), '#5a6470', true)}
                <div style={{fontSize:8,color:'#5a5040',marginBottom:8}}>NO ARMOUR</div>
                <div style={{marginBottom:11}}>{chip('UNARMED','#605848')}</div>
                <div style={{fontSize:6,color:'#3a3020',lineHeight:1.9,minHeight:66}}>{armourOptions.length<=1 ? 'Defeat a boss to unlock protective gear.' : 'Navigate ‹ › to equip unlocked armour.'}</div>
              </div>
            )
          )}

          </div>

          {/* assembled loadout vs quarry */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,margin:'20px 0 2px',flexWrap:'wrap'}}>
            <span style={{fontSize:7,color:'#605848',letterSpacing:2}}>LOADOUT</span>
            {dual ? <>
              {weaponSvg(selML.id, selML.color, 26)}
              <span style={{fontSize:9,color:'#3a3628'}}>+</span>
              {weaponSvg(selRL.id, selRL.color, 26)}
            </> : weaponSvg(selLW.id, selLW.color, 26)}
            <span style={{fontSize:9,color:'#3a3628'}}>+</span>
            <span style={{display:'inline-flex',opacity:curArmour?1:0.32}}>{armourSvg(curArmour, 24)}</span>
            <span style={{fontSize:8,color:'#605848',margin:'0 4px',letterSpacing:1}}>VS</span>
            {bossSvg(selBoss, selB.color, 26)}
          </div>
          {dual && <div style={{fontSize:6,color:'#9fe8ff',textAlign:'center',marginBottom:2,letterSpacing:1}}>In battle: <span style={{color:'#C8B98A'}}>TAB</span> swaps melee ⇄ ranged — the Frost Wyrm demands it!</div>}

          {/* fastest-kill board for the selected boss */}
          <div style={{maxWidth:380,margin:'16px auto 18px',background:'rgba(9,9,16,0.6)',border:'1px solid #1e1c18',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:7,color:'#8a7a55',letterSpacing:2,marginBottom:9}}>⚡ FASTEST KILLS &mdash; {selB.name.toUpperCase()}</div>
            <BossLeaderboard boss={selBoss} />
          </div>

          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button onClick={()=>setScreen('menu')} className="bh-back" style={{background:'#14141e',border:'1px solid #2a2820',color:'#A09880',padding:'12px 26px',borderRadius:8,fontSize:9,cursor:'pointer',fontFamily:'inherit',transition:'all 0.14s ease'}}>‹ BACK</button>
            <button onClick={beginHunt} className="bh-start" style={{background:'linear-gradient(135deg,#E2B44C,#8B6914)',border:'1px solid #C89B3C',color:'#0d0d14',padding:'12px 40px',borderRadius:8,fontSize:10,cursor:'pointer',fontFamily:'inherit',letterSpacing:2}}>
              ▶&nbsp;START HUNT
            </button>
          </div>

        </div>
      </div>
    )
  }


  // ─── PLAYING ───
  if (screen === 'playing') return (
    <div ref={playWrapRef} style={{position:'fixed',inset:0,zIndex:9999,background:'#000',fontFamily:'"Press Start 2P",monospace'}}>
      <style>{`
        .bh-canvas{display:block;cursor:crosshair;width:auto;height:auto;max-width:100%;max-height:100%;min-width:0;min-height:0;object-fit:contain;}
      `}</style>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:0}}>
        <canvas ref={canvasRef} width={CW} height={CH} className="bh-canvas" />
      </div>
      <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6,zIndex:1}}>
        <GodModeToggle style={{ fontSize: 7, padding: '4px 10px' }} />
        <button onClick={() => { const nm = !muted; setMuted(nm); Sfx.setMuted(nm); Sfx.resume() }} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>{muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}</button>
        <button onClick={toggleFullscreen} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>{isFullscreen ? '⊠ WINDOW' : '⛶ FULLSCREEN'}</button>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setScreen('menu') }} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>✕ QUIT</button>
      </div>
    </div>
  )

  // ─── VICTORY ───
  if (screen === 'victory') {
    const boss = BOSS_DEFS[victoryBoss]
    const collectedCount = boss.rewards.filter(r => unlockedGear.includes(r)).length
    const allCollected = collectedCount === boss.rewards.length
    const remaining = boss.rewards.length - collectedCount
    return (
      <div style={{background:'#080814',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',overflowY:'auto',padding:'24px 0'}}>
        <div className="bh-screen-wrap" style={{textAlign:'center',maxWidth:560,padding:'0 24px'}}>
          <div style={{fontSize:9,color:'#605848',marginBottom:12}}>HUNT COMPLETE</div>
          <div style={{fontSize:22,color:'#C89B3C',textShadow:'0 0 24px #C89B3C88',marginBottom:8}}>VICTORY!</div>
          <div style={{fontSize:10,color:boss.color,marginBottom:10}}>{boss.name} Defeated</div>
          <div style={{fontSize:11,color:'#a8e0b0',marginBottom:victoryRank!=null?4:20}}>⏱ Kill Time: {fmtKillTime(victoryTimeMs)}</div>
          {victoryRank != null && (
            <div style={{fontSize:9,color:'#C89B3C',marginBottom:10,textShadow:'0 0 14px #C89B3C66'}}>
              {victoryRank <= 10 ? `🏆 You ranked #${victoryRank}!` : `Your rank: #${victoryRank}`}
            </div>
          )}
          <div style={{display:'flex',gap:20,justifyContent:'center',marginBottom:18,fontSize:8,color:'#605848'}}>
            <span>HITS LANDED <span style={{color:'#E8E6E0'}}>{victoryStats.hits}</span></span>
            <span>BEST COMBO <span style={{color:'#FF9A3C'}}>{victoryStats.combo}</span></span>
          </div>
          <div style={{background:'#0d0d1a',border:'1px solid #2a2820',borderRadius:10,padding:20,marginBottom:16,textAlign:'left'}}>
            {lastUnlockedGear ? (() => {
              const gid = lastUnlockedGear
              const cat = GEAR_CATEGORY[gid]
              return <>
                <div style={{fontSize:8,color:'#C89B3C',marginBottom:4}}>GEAR UNLOCKED ({collectedCount} / {boss.rewards.length}):</div>
                <div style={{fontSize:7,color:'#605848',marginBottom:12}}>Equip in the loadout panel before your next hunt</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <span style={{fontSize:16}}>{GEAR_DEFS[gid].icon}</span>
                  <div>
                    <div style={{fontSize:8,color:'#E8E6E0',marginBottom:2}}>{GEAR_DEFS[gid].name} <span style={{fontSize:7,color:cat==='attack'?'#E74C3C':'#3498DB'}}>[{cat==='attack'?'WEAPON':'ARMOUR'}]</span></div>
                    <div style={{fontSize:7,color:'#A09880'}}>{GEAR_DEFS[gid].desc}</div>
                  </div>
                </div>
              </>
            })() : (
              <>
                <div style={{fontSize:8,color:'#27AE60',marginBottom:4}}>ALL GEAR COLLECTED ({boss.rewards.length} / {boss.rewards.length}):</div>
                <div style={{fontSize:7,color:'#605848',marginBottom:12}}>You have everything this boss drops</div>
                {boss.rewards.map(gid => (
                  <div key={gid} style={{fontSize:7,color:'#27AE60',marginBottom:4}}>✓ {GEAR_DEFS[gid].icon} {GEAR_DEFS[gid].name}</div>
                ))}
              </>
            )}
          </div>
          {!allCollected && (
            <div style={{fontSize:7,color:'#A09880',marginBottom:16}}>
              {remaining} more {remaining === 1 ? 'reward' : 'rewards'} hidden — defeat {boss.name} again to claim {remaining === 1 ? 'it' : 'them'}
            </div>
          )}
          {victoryBoss < BOSS_DEFS.length - 1 && allCollected && (
            <div style={{fontSize:8,color:'#27AE60',marginBottom:20}}>
              Next hunt unlocked: {BOSS_DEFS[victoryBoss+1].name}!
            </div>
          )}
          <div style={{marginBottom:16}}>
            <BossLeaderboard boss={victoryBoss} highlightRank={victoryRank} refreshKey={victoryRank ?? 0} />
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={beginHunt} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>REMATCH</button>
            {victoryBoss < BOSS_DEFS.length - 1 && (
              <button onClick={() => setScreen('hunt_select')} style={{background:'linear-gradient(135deg,#27AE60,#1a6e3c)',border:'none',color:'#fff',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>
                NEXT HUNT
              </button>
            )}
            <button onClick={() => setScreen('menu')} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'none',color:'#0d0d14',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>MAIN MENU</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── DEFEAT ───
  return (
    <div style={{background:'radial-gradient(ellipse at 50% 42%, #2a0606 0%, #0a0204 55%, #050203 100%)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',overflow:'hidden'}}>
      <style>{`
        @keyframes bh-die-in{0%{opacity:0;transform:translateY(14px) scale(0.94)}100%{opacity:1;transform:none}}
        @keyframes bh-skull-pulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 18px #c0151588)}50%{transform:scale(1.06);filter:drop-shadow(0 0 34px #e74c3ccc)}}
        @keyframes bh-died-glow{0%,100%{text-shadow:0 0 18px #c01515aa,0 0 40px #6e0a0a66}50%{text-shadow:0 0 30px #ff2a2a,0 0 64px #c01515aa}}
        .bh-die{animation:bh-die-in 0.6s cubic-bezier(.2,.8,.2,1) both}
      `}</style>
      <div className="bh-die" style={{textAlign:'center',maxWidth:480,padding:'0 24px'}}>
        <div style={{fontSize:64,marginBottom:10,animation:'bh-skull-pulse 2.4s ease-in-out infinite'}}>💀</div>
        <div style={{fontSize:30,color:'#a01212',letterSpacing:4,marginBottom:10,animation:'bh-died-glow 2.6s ease-in-out infinite'}}>YOU DIED</div>
        <div style={{fontSize:9,color:'#7a5a5a',marginBottom:14}}>Slain by the {BOSS_DEFS[selBoss].name}</div>
        <div style={{fontSize:8,color:'#9a8a86',marginBottom:26}}>
          {BOSS_DEFS[selBoss].name} survived with <span style={{color:'#E74C3C'}}>{defeatInfo.hpPct}%</span> HP
          {defeatInfo.hpPct <= 20 ? <span style={{color:'#C89B3C'}}> — so close!</span> : ''}
        </div>
        <div style={{fontSize:8,color:'#9a8a86',marginBottom:30,lineHeight:'2'}}>
          Read the telegraphs &mdash; every attack can be dodged.<br/>
          Keep your distance with ranged weapons; close in with melee.
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={beginHunt} style={{background:'linear-gradient(135deg,#E74C3C,#922B21)',border:'none',color:'#fff',padding:'12px 28px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit',letterSpacing:1,boxShadow:'0 0 20px #e74c3c44'}}>↻ TRY AGAIN</button>
          <button onClick={() => setScreen('menu')} style={{background:'#160a0a',border:'1px solid #3a1a1a',color:'#A09880',padding:'12px 22px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>MENU</button>
        </div>
      </div>
    </div>
  )
}

