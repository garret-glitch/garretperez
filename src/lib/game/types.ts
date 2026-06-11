export type ColorKey =
  | 'red' | 'blue' | 'green' | 'yellow' | 'orange'
  | 'purple' | 'pink' | 'teal' | 'maroon' | 'sky' | 'lime' | 'mauve'

export const COLORS: Record<ColorKey, { hex: string; glow: string; label: string }> = {
  red:    { hex: '#e63946', glow: 'rgba(230,57,70,0.55)',   label: 'Red'    },
  blue:   { hex: '#4895ef', glow: 'rgba(72,149,239,0.55)',  label: 'Blue'   },
  green:  { hex: '#2dc653', glow: 'rgba(45,198,83,0.55)',   label: 'Green'  },
  yellow: { hex: '#ffbe0b', glow: 'rgba(255,190,11,0.55)',  label: 'Yellow' },
  orange: { hex: '#f48c06', glow: 'rgba(244,140,6,0.55)',   label: 'Orange' },
  purple: { hex: '#9b5de5', glow: 'rgba(155,93,229,0.55)',  label: 'Purple' },
  pink:   { hex: '#f72585', glow: 'rgba(247,37,133,0.55)',  label: 'Pink'   },
  teal:   { hex: '#06d6a0', glow: 'rgba(6,214,160,0.55)',   label: 'Teal'   },
  maroon: { hex: '#c1121f', glow: 'rgba(193,18,31,0.55)',   label: 'Maroon' },
  sky:    { hex: '#48cae4', glow: 'rgba(72,202,228,0.55)',  label: 'Sky'    },
  lime:   { hex: '#aacc00', glow: 'rgba(170,204,0,0.55)',   label: 'Lime'   },
  mauve:  { hex: '#c77dff', glow: 'rgba(199,125,255,0.55)', label: 'Mauve'  },
}

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[]

export interface Dot {
  color: ColorKey
  row: number
  col: number
}

export interface Puzzle {
  id: string
  size: number
  dots: Dot[]
  difficulty: Difficulty
  solution: Record<string, Cell[]>
}

export type Cell = [number, number]
export type PathMap = Record<string, Cell[]>

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'
export type GameMode = 'classic' | 'daily' | 'endless' | 'zen' | 'challenge'

export interface GameSettings {
  sound: boolean
  theme: 'dark' | 'light'
  colorblind: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  theme: 'dark',
  colorblind: false,
}
