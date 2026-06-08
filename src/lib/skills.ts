export type SkillSlug =
  | 'health'
  | 'projects'
  | 'fishing'
  | 'business'
  | 'food'
  | 'community'
  | 'gardening'
  | 'fun'
  | 'travel'

export type SkillEnum =
  | 'HEALTH'
  | 'PROJECTS'
  | 'FISHING'
  | 'BUSINESS'
  | 'FOOD'
  | 'COMMUNITY'
  | 'GARDENING'
  | 'FUN'
  | 'TRAVEL'

export interface SkillMeta {
  slug: SkillSlug
  dbEnum: SkillEnum
  label: string
  icon: string
  description: string
  href: string
}

export const SKILLS: SkillMeta[] = [
  { slug: 'health',     dbEnum: 'HEALTH',     label: 'Health',    icon: '❤️',  description: 'Health & wellness tips',     href: '/skills/health' },
  { slug: 'projects',   dbEnum: 'PROJECTS',   label: 'Projects',  icon: '⚒️',  description: 'Portfolio & tech skills',    href: '/skills/projects' },
  { slug: 'fishing',    dbEnum: 'FISHING',    label: 'Fishing',   icon: '🎣',  description: 'Fishing tips & reports',     href: '/skills/fishing' },
  { slug: 'business',   dbEnum: 'BUSINESS',   label: 'Business',  icon: '💼',  description: 'Business & networking',      href: '/skills/business' },
  { slug: 'food',       dbEnum: 'FOOD',       label: 'Cooking',   icon: '🍳',  description: 'Recipes & food tips',        href: '/skills/food' },
  { slug: 'community',  dbEnum: 'COMMUNITY',  label: 'Community', icon: '👥',  description: 'General discussion',         href: '/skills/community' },
  { slug: 'gardening',  dbEnum: 'GARDENING',  label: 'Farming',   icon: '🌱',  description: 'Garden tips & updates',      href: '/skills/gardening' },
  { slug: 'fun',        dbEnum: 'FUN',        label: 'Fun',       icon: '🎮',  description: 'Mini-games',                 href: '/skills/fun' },
  { slug: 'travel',     dbEnum: 'TRAVEL',     label: 'Travel',    icon: '🗺️',  description: 'Travel diary & adventures',  href: '/skills/travel' },
]

export function getSkillBySlug(slug: string): SkillMeta | undefined {
  return SKILLS.find(s => s.slug === slug)
}

export function getSkillByEnum(dbEnum: string): SkillMeta | undefined {
  return SKILLS.find(s => s.dbEnum === dbEnum)
}

export const SKILL_ENUMS = SKILLS.map(s => s.dbEnum)
