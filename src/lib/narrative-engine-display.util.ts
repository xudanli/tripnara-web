import type {
  CompanionContext,
  NarrativeArcTemplate,
  TravelMotivation,
} from '@/types/narrative-engine';

export const TRAVEL_MOTIVATION_LABELS: Record<TravelMotivation, string> = {
  rest: '休息放空',
  discovery: '探索未知',
  connection: '与人连接',
  challenge: '挑战自我',
  celebration: '庆祝纪念',
  closure: '告别收尾',
  unsure: '还不确定',
};

export const NARRATIVE_ARC_LABELS: Record<NarrativeArcTemplate, string> = {
  exploration: '探索',
  healing: '疗愈',
  connection: '连接',
  neutral: '留白',
};

export const COMPANION_CONTEXT_LABELS: Record<CompanionContext, string> = {
  solo: '独自',
  couple: '两人',
  group: '小队',
  family: '家庭',
};

export function formatMotivationLabels(motivations: TravelMotivation[] | undefined): string {
  if (!motivations?.length) return '';
  return motivations.map((m) => TRAVEL_MOTIVATION_LABELS[m] ?? m).join('、');
}

export function stripThemeTitleQuotes(title: string): string {
  return title.replace(/[《》]/g, '').trim();
}
