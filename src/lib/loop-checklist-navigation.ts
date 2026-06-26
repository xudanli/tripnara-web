import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';
import type { TripLoopChecklistItem } from '@/types/trip-loop';

export type LoopChecklistNavigateKind =
  | 'filter_issues'
  | 'open_profiling'
  | 'info_only'
  | 'none';

export interface LoopChecklistNavigateTarget {
  kind: LoopChecklistNavigateKind;
  category?: string;
  profilingSurface?: DecisionProfilingSurface;
  message?: string;
}

const CHECKLIST_ID_TO_CATEGORY: Record<string, string> = {
  schedule: 'schedule',
  transport: 'transport',
  booking: 'booking',
  weather: 'environment',
  environment: 'environment',
  team_fit: 'team_fit',
  team: 'team_fit',
  opening_hours: 'schedule',
  itinerary_completeness: 'itinerary_completeness',
};

function inferProfilingSurfaceFromChecklist(item: TripLoopChecklistItem): DecisionProfilingSurface {
  const text = `${item.label} ${item.detail ?? ''}`.toLowerCase();
  if (/画像|调查|profiling|quiz/.test(text)) return 'quiz';
  if (/分摊|预算|split|consensus|aa/.test(text)) return 'split_consensus';
  if (/摩擦|风格|fatigue|疲劳/.test(text)) return 'friction';
  return 'hub';
}

/**
 * Checklist 行点击：不默认进 repair 抽屉。
 * pending/failed → 筛 issue 或打开决策画像；deferred → 仅提示。
 */
export function resolveLoopChecklistNavigateTarget(
  item: TripLoopChecklistItem,
): LoopChecklistNavigateTarget {
  if (item.result === 'deferred') {
    return {
      kind: 'info_only',
      message: item.detail ?? '出发前复查，暂不计为未通过',
    };
  }

  if (item.result === 'passed') {
    return { kind: 'none' };
  }

  const id = item.id.toLowerCase();

  if (id === 'team_fit' || id === 'team') {
    return {
      kind: 'open_profiling',
      category: 'team_fit',
      profilingSurface: inferProfilingSurfaceFromChecklist(item),
    };
  }

  const category = CHECKLIST_ID_TO_CATEGORY[id] ?? id;
  return {
    kind: 'filter_issues',
    category,
  };
}
