// ─── Block type registry ─────────────────────────────────────────────────────
export type BlockType =
  | 'about'
  | 'projects-list'
  | 'community-feed'
  | 'achievements'
  | 'xp-guide'
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'quest-list'
  | 'skill-card'
  | 'contact-card'

// ─── Per-type config shapes ───────────────────────────────────────────────────
export interface AboutBubble {
  id: string
  content: string
}

export interface AboutBlockConfig {
  headingText: string
  headingIcon: string
  bubbles: AboutBubble[]
  // legacy fields — kept so old DB records still parse
  bio1?: string
  bio2?: string
  bio3?: string
}

export interface ProjectsListBlockConfig {
  heading: string
  icon: string
  maxItems: number
  showViewAll: boolean
}

export interface CommunityFeedBlockConfig {
  heading: string
  icon: string
  maxItems: number
}

export interface AchievementsBlockConfig {
  heading: string
  icon: string
}

export interface XpGuideBlockConfig {
  heading: string
  icon: string
}

export interface HeadingBlockConfig {
  text: string
  level: 1 | 2 | 3 | 4
  align: 'left' | 'center' | 'right'
}

export interface TextBlockConfig {
  html: string
}

export interface ImageBlockConfig {
  src: string
  alt: string
  objectFit: 'cover' | 'contain' | 'fill'
  borderRadius: number
  aspectRatio: string
  linkHref?: string
}

export interface ButtonBlockConfig {
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  align: 'left' | 'center' | 'right'
  icon?: string
  newTab: boolean
}

export interface DividerBlockConfig {
  style: 'solid' | 'dashed' | 'dotted' | 'none'
  thickness: number
  color: string
  width: 'full' | '50%' | '25%'
  align: 'left' | 'center' | 'right'
}

export interface QuestListBlockConfig {
  heading: string
  icon: string
  maxItems: number
}

export interface SkillCardBlockConfig {
  skillKey: string
  showXp: boolean
  showLevel: boolean
}

export interface ContactCardBlockConfig {
  showPhone: boolean
  showEmail: boolean
  showLinkedin: boolean
  showResume: boolean
  variant: 'full' | 'compact' | 'icons-only'
}

export type AnyBlockConfig =
  | AboutBlockConfig
  | ProjectsListBlockConfig
  | CommunityFeedBlockConfig
  | AchievementsBlockConfig
  | XpGuideBlockConfig
  | HeadingBlockConfig
  | TextBlockConfig
  | ImageBlockConfig
  | ButtonBlockConfig
  | DividerBlockConfig
  | QuestListBlockConfig
  | SkillCardBlockConfig
  | ContactCardBlockConfig

// ─── Styles (applies to every block type) ────────────────────────────────────
export interface BlockStyles {
  minHeight?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  marginTop?: number
  marginBottom?: number
  bgColor?: string
  bgImage?: string
  bgSize?: 'cover' | 'contain' | 'auto'
  bgPosition?: string
  borderWidth?: number
  borderColor?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  borderRadius?: number
  headingPx?: number
  bodyPx?: number
  headingFont?: string
  bodyFont?: string
  headingColor?: string
  textColor?: string
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  opacity?: number
}

// ─── Full PageBlock record ────────────────────────────────────────────────────
export interface PageBlock {
  id: string
  pageSlug: string
  type: BlockType
  order: number
  colSpan: 1 | 2 | 3
  colStart: 1 | 2 | 3
  visible: boolean
  config: AnyBlockConfig
  styles: BlockStyles
}

// ─── Live data passed through to dynamic blocks ───────────────────────────────
export interface BlockLiveData {
  dbProjects?: Array<{ id: string; icon: string; title: string; desc: string; progress: number; href: string; updated: string }>
  recentPosts?: Array<{
    id: string; title: string; body: string; skill: string; createdAt: string
    user: { username: string }
    upvotes: { userId: string }[]
    replies: { id: string }[]
  }>
  hasSession?: boolean
  userBadges?: string[]
  contactPhone?: string
  contactEmail?: string
  contactLinkedin?: string
  quests?: Array<{ id: string; icon: string; title: string; description: string; xp: number; skill: string; href: string }>
}

// ─── Builder UI state ─────────────────────────────────────────────────────────
export interface BuilderState {
  blocks: PageBlock[]
  selectedId: string | null
  libraryOpen: boolean
  isDirty: boolean
  past: PageBlock[][]
  future: PageBlock[][]
}

export type BuilderAction =
  | { type: 'INIT'; payload: PageBlock[] }
  | { type: 'SELECT'; payload: string | null }
  | { type: 'TOGGLE_LIBRARY' }
  | { type: 'ADD_BLOCK'; payload: PageBlock }
  | { type: 'UPDATE_CONFIG'; payload: { id: string; config: AnyBlockConfig } }
  | { type: 'UPDATE_STYLES'; payload: { id: string; styles: BlockStyles } }
  | { type: 'UPDATE_SPAN'; payload: { id: string; colSpan: 1 | 2 | 3 } }
  | { type: 'REORDER'; payload: PageBlock[] }
  | { type: 'DELETE_BLOCK'; payload: string }
  | { type: 'DUPLICATE_BLOCK'; payload: string }
  | { type: 'INSERT_AFTER'; payload: { afterId: string; block: PageBlock } }
  | { type: 'TOGGLE_VISIBLE'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_CLEAN' }
