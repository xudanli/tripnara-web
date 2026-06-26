import type {
  ExperienceAtomCode,
  LoadLevel,
  PresentedItineraryItemBadge,
  UserCertaintyLevel,
} from '@/types/experience-fulfillment';

export const EXPERIENCE_ATOM_LABELS: Record<ExperienceAtomCode, string> = {
  EPIC_WATERFALL: '史诗级瀑布冲击',
  REMOTE_WORLD_EDGE: '世界尽头感',
  CINEMATIC_PHOTOGRAPHY: '电影感摄影',
  HEALING_HOT_SPRING: '温泉治愈',
  WILD_COAST_SOLITUDE: '野性海岸孤独感',
  GLACIER_ADVENTURE: '冰川冒险',
  LOW_EFFORT_NATURE: '低体力自然体验',
  SLOW_TRAVEL_RELAXATION: '松弛慢旅行',
};

export const CERTAINTY_LEVEL_LABELS: Record<UserCertaintyLevel, string> = {
  EXCELLENT_CONDITIONS: '条件极佳',
  SUITABLE: '适合前往',
  UNCERTAIN: '存在不确定性',
  NOT_RECOMMENDED: '不建议前往',
};

export function certaintyLevelClasses(level: UserCertaintyLevel): string {
  switch (level) {
    case 'EXCELLENT_CONDITIONS':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'SUITABLE':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'UNCERTAIN':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'NOT_RECOMMENDED':
      return 'border-red-200 bg-red-50 text-red-800';
  }
}

export function loadLevelLabel(load: LoadLevel): string {
  switch (load) {
    case 'light':
      return '轻';
    case 'moderate':
      return '中';
    case 'heavy':
      return '重';
  }
}

export function loadLevelClasses(load: LoadLevel): string {
  switch (load) {
    case 'light':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'moderate':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'heavy':
      return 'bg-red-50 text-red-700 border-red-200';
  }
}

export const ITINERARY_ITEM_BADGE_LABELS: Record<PresentedItineraryItemBadge, string> = {
  VERIFIED: '已核验',
  WEATHER_SENSITIVE: '天气敏感',
  LOW_PHYSICAL: '低体力可达',
  HAS_ALTERNATIVE: '有备选',
  CORE_EXPERIENCE: '核心体验',
};

export function experienceAtomLabel(atom: ExperienceAtomCode | string): string {
  return EXPERIENCE_ATOM_LABELS[atom as ExperienceAtomCode] ?? atom;
}
