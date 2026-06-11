import type { PageBlock, AnyBlockConfig, BlockLiveData } from '@/types/builder'
import HeroBlock from './blocks/HeroBlock'
import AboutBlock from './blocks/AboutBlock'
import ProjectsListBlock from './blocks/ProjectsListBlock'
import CommunityFeedBlock from './blocks/CommunityFeedBlock'
import AchievementsBlock from './blocks/AchievementsBlock'
import XpGuideBlock from './blocks/XpGuideBlock'
import HeadingBlock from './blocks/HeadingBlock'
import TextBlock from './blocks/TextBlock'
import ImageBlock from './blocks/ImageBlock'
import ButtonBlock from './blocks/ButtonBlock'
import DividerBlock from './blocks/DividerBlock'
import QuestListBlock from './blocks/QuestListBlock'
import SkillCardBlock from './blocks/SkillCardBlock'
import ContactCardBlock from './blocks/ContactCardBlock'
import CommunitiesBlock from './blocks/CommunitiesBlock'

interface Props {
  block: PageBlock
  isEditing?: boolean
  liveData?: BlockLiveData
  onConfigChange?: (config: AnyBlockConfig) => void
}

export default function BlockRenderer({ block, isEditing = false, liveData = {}, onConfigChange }: Props) {
  const sharedProps = { block, isEditing, liveData, onConfigChange: onConfigChange as never }
  switch (block.type) {
    case 'hero':           return <HeroBlock           {...sharedProps} />
    case 'about':          return <AboutBlock          {...sharedProps} />
    case 'projects-list':  return <ProjectsListBlock   {...sharedProps} />
    case 'community-feed': return <CommunityFeedBlock  {...sharedProps} />
    case 'achievements':   return <AchievementsBlock   {...sharedProps} />
    case 'xp-guide':       return <XpGuideBlock        {...sharedProps} />
    case 'heading':        return <HeadingBlock        {...sharedProps} />
    case 'text':           return <TextBlock           {...sharedProps} />
    case 'image':          return <ImageBlock          {...sharedProps} />
    case 'button':         return <ButtonBlock         {...sharedProps} />
    case 'divider':        return <DividerBlock        {...sharedProps} />
    case 'quest-list':     return <QuestListBlock      {...sharedProps} />
    case 'skill-card':     return <SkillCardBlock      {...sharedProps} />
    case 'contact-card':   return <ContactCardBlock    {...sharedProps} />
    case 'communities':    return <CommunitiesBlock    {...sharedProps} />
    default:               return <div style={{ padding: 12, color: 'var(--text-3)', fontSize: 8 }}>Unknown block: {block.type}</div>
  }
}
