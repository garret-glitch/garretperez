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
  { slug: 'health',     dbEnum: 'HEALTH',     label: 'Health',    icon: '❤️',  description: 'Staying active, fitness tips & wellness as a father and creator.',  href: '/skills/health' },
  { slug: 'projects',   dbEnum: 'PROJECTS',   label: 'Projects',  icon: '⚒️',  description: 'Building things — yearly haunted house, DIY projects & tech builds.', href: '/skills/projects' },
  { slug: 'fishing',    dbEnum: 'FISHING',    label: 'Fishing',   icon: '🎣',  description: 'Fishing trips, outdoor adventures & tips from the water.',           href: '/skills/fishing' },
  { slug: 'business',   dbEnum: 'BUSINESS',   label: 'Business',  icon: '💼',  description: 'Wine sales, H-E-B distribution, team coaching & route planning.',    href: '/skills/business' },
  { slug: 'food',       dbEnum: 'FOOD',       label: 'Cooking',   icon: '🍳',  description: 'Recipes, wine pairings & food tips from the kitchen.',               href: '/skills/food' },
  { slug: 'community',  dbEnum: 'COMMUNITY',  label: 'Community', icon: '👥',  description: 'Neighborhood events, social connections & group discussions.',       href: '/skills/community' },
  { slug: 'gardening',  dbEnum: 'GARDENING',  label: 'Farming',   icon: '🌱',  description: 'Garden tips, outdoor upkeep & growing things.',                      href: '/skills/gardening' },
  { slug: 'fun',        dbEnum: 'FUN',        label: 'Fun',       icon: '🎮',  description: 'Mini-games, hobbies & entertainment for the whole community.',       href: '/skills/fun' },
  { slug: 'travel',     dbEnum: 'TRAVEL',     label: 'Travel',    icon: '🗺️',  description: 'Travel diary, adventures & places worth visiting.',                  href: '/skills/travel' },
]

export function getSkillBySlug(slug: string): SkillMeta | undefined {
  return SKILLS.find(s => s.slug === slug)
}

export function getSkillByEnum(dbEnum: string): SkillMeta | undefined {
  return SKILLS.find(s => s.dbEnum === dbEnum)
}

export const SKILL_ENUMS = SKILLS.map(s => s.dbEnum)
