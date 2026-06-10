import type { BlockType, AnyBlockConfig, BlockStyles } from '@/types/builder'

export const BLOCK_META: Record<BlockType, { label: string; icon: string; description: string }> = {
  'about':          { label: 'About Me',       icon: '📜', description: 'Bio paragraphs about Garret' },
  'projects-list':  { label: 'Projects',        icon: '⚒️', description: 'Showcase active projects' },
  'community-feed': { label: 'Community Feed',  icon: '💬', description: 'Recent community posts' },
  'achievements':   { label: 'Achievements',    icon: '🏆', description: 'Badge showcase' },
  'xp-guide':       { label: 'How to Earn XP',  icon: '⚡', description: 'XP earning guide' },
  'heading':        { label: 'Heading',         icon: '🅷',  description: 'Large section heading' },
  'text':           { label: 'Text',            icon: '📝', description: 'Rich text paragraph' },
  'image':          { label: 'Image',           icon: '🖼️', description: 'Single image with caption' },
  'button':         { label: 'Button',          icon: '🔘', description: 'Call-to-action button' },
  'divider':        { label: 'Divider',         icon: '➖', description: 'Horizontal rule' },
  'quest-list':     { label: 'Quest List',      icon: '⚔️', description: 'Active quests' },
  'skill-card':     { label: 'Skill Card',      icon: '🎯', description: 'Skill level + XP bar' },
  'contact-card':   { label: 'Contact Card',    icon: '📇', description: 'Phone, email, LinkedIn' },
}

export function getDefaultConfig(type: BlockType): AnyBlockConfig {
  switch (type) {
    case 'about':
      return {
        headingText: 'About Me', headingIcon: '📜',
        bubbles: [
          { id: 'b0', content: 'Sales professional based in Houston, TX.' },
          { id: 'b1', content: 'Builder, gardener, fisherman, and father.' },
          { id: 'b2', content: 'This site is my personal hub.' },
        ],
      }
    case 'projects-list':
      return { heading: 'My Projects', icon: '⚒️', maxItems: 3, showViewAll: true }
    case 'community-feed':
      return { heading: 'Community Feed', icon: '💬', maxItems: 8 }
    case 'achievements':
      return { heading: 'Achievements', icon: '🏆' }
    case 'xp-guide':
      return { heading: 'How to Earn XP', icon: '⚡' }
    case 'heading':
      return { text: 'New Section', level: 2, align: 'left' }
    case 'text':
      return { html: '<p>Start typing your content here...</p>' }
    case 'image':
      return { src: '', alt: '', objectFit: 'cover', borderRadius: 8, aspectRatio: '16/9' }
    case 'button':
      return { label: 'Click Here', href: '/', variant: 'primary', size: 'md', align: 'left', newTab: false }
    case 'divider':
      return { style: 'solid', thickness: 1, color: 'var(--border)', width: 'full', align: 'center' }
    case 'quest-list':
      return { heading: 'Active Quests', icon: '⚔️', maxItems: 6 }
    case 'skill-card':
      return { skillKey: 'PROJECTS', showXp: true, showLevel: true }
    case 'contact-card':
      return { showPhone: true, showEmail: true, showLinkedin: true, showResume: true, variant: 'full' }
  }
}

export function getDefaultStyles(type: BlockType): BlockStyles {
  const base: BlockStyles = {
    paddingTop: 20, paddingRight: 24, paddingBottom: 20, paddingLeft: 24,
    borderRadius: 0, borderWidth: 0, borderStyle: 'none',
    shadow: 'none', opacity: 1,
  }
  switch (type) {
    case 'divider':
      return { ...base, paddingTop: 8, paddingBottom: 8 }
    case 'button':
      return { ...base, paddingTop: 12, paddingBottom: 12 }
    default:
      return base
  }
}

export function getHeadingStyle(styles: BlockStyles): React.CSSProperties {
  return {
    fontFamily: styles.headingFont || undefined,
    color: styles.headingColor || undefined,
    fontSize: styles.headingPx != null ? styles.headingPx : undefined,
  }
}

export function getBodyStyle(styles: BlockStyles): React.CSSProperties {
  return {
    fontFamily: styles.bodyFont || undefined,
    color: styles.textColor || undefined,
    fontSize: styles.bodyPx != null ? styles.bodyPx : undefined,
  }
}

export function applyStylesToElement(styles: BlockStyles): React.CSSProperties {
  const shadow: Record<string, string> = {
    none: 'none',
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    xl: '0 16px 40px rgba(0,0,0,0.6)',
  }
  return {
    paddingTop:    styles.paddingTop    != null ? styles.paddingTop    : undefined,
    paddingRight:  styles.paddingRight  != null ? styles.paddingRight  : undefined,
    paddingBottom: styles.paddingBottom != null ? styles.paddingBottom : undefined,
    paddingLeft:   styles.paddingLeft   != null ? styles.paddingLeft   : undefined,
    marginTop:     styles.marginTop     != null ? styles.marginTop     : undefined,
    marginBottom:  styles.marginBottom  != null ? styles.marginBottom  : undefined,
    minHeight:     styles.minHeight     != null ? styles.minHeight     : undefined,
    backgroundColor: styles.bgColor    || undefined,
    backgroundImage: styles.bgImage    ? `url(${styles.bgImage})`   : undefined,
    backgroundSize: styles.bgSize      || undefined,
    backgroundPosition: styles.bgPosition || undefined,
    borderWidth:   styles.borderWidth  != null ? styles.borderWidth  : undefined,
    borderColor:   styles.borderColor  || undefined,
    borderStyle:   styles.borderStyle  !== 'none' ? styles.borderStyle : undefined,
    borderRadius:  styles.borderRadius != null ? styles.borderRadius : undefined,
    boxShadow:     styles.shadow       ? shadow[styles.shadow]       : undefined,
    opacity:       styles.opacity      != null ? styles.opacity      : undefined,
    fontFamily:    styles.bodyFont     || undefined,
    color:         styles.textColor    || undefined,
  } as React.CSSProperties
}
