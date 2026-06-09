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
  color: string
}

export const SKILLS: SkillMeta[] = [
  { slug: 'health',     dbEnum: 'HEALTH',     label: 'Health',    icon: '❤️',  description: 'Staying active, fitness tips & wellness as a father and creator.',    href: '/skills/health',    color: '#7a2020' },
  { slug: 'projects',   dbEnum: 'PROJECTS',   label: 'Projects',  icon: '⚒️',  description: 'Building things — yearly haunted house, DIY projects & tech builds.', href: '/skills/projects',  color: '#3a3020' },
  { slug: 'fishing',    dbEnum: 'FISHING',    label: 'Fishing',   icon: '🎣',  description: 'Fishing trips, outdoor adventures & tips from the water.',             href: '/skills/fishing',   color: '#1a4a5a' },
  { slug: 'business',   dbEnum: 'BUSINESS',   label: 'Business',  icon: '💼',  description: 'Wine sales, H-E-B distribution, team coaching & route planning.',      href: '/skills/business',  color: '#2a3a18' },
  { slug: 'food',       dbEnum: 'FOOD',       label: 'Cooking',   icon: '🍳',  description: 'Recipes, wine pairings & food tips from the kitchen.',                 href: '/skills/food',      color: '#6a3010' },
  { slug: 'community',  dbEnum: 'COMMUNITY',  label: 'Community', icon: '👥',  description: 'Neighborhood events, social connections & group discussions.',         href: '/skills/community', color: '#2a3060' },
  { slug: 'gardening',  dbEnum: 'GARDENING',  label: 'Farming',   icon: '🌱',  description: 'Garden tips, outdoor upkeep & growing things.',                        href: '/skills/gardening', color: '#1e4a1e' },
  { slug: 'fun',        dbEnum: 'FUN',        label: 'Fun',       icon: '🎮',  description: 'Mini-games, hobbies & entertainment for the whole community.',         href: '/skills/fun',       color: '#4a2060' },
  { slug: 'travel',     dbEnum: 'TRAVEL',     label: 'Travel',    icon: '🗺️',  description: 'Travel diary, adventures & places worth visiting.',                    href: '/skills/travel',    color: '#5a4010' },
]

export function getSkillBySlug(slug: string): SkillMeta | undefined {
  return SKILLS.find(s => s.slug === slug)
}

export function getSkillByEnum(dbEnum: string): SkillMeta | undefined {
  return SKILLS.find(s => s.dbEnum === dbEnum)
}

export const SKILL_ENUMS = SKILLS.map(s => s.dbEnum)
