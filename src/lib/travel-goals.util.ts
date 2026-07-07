import type {
  TravelGoalDefinition,
  TravelGoalDimension,
  TravelGoalRankState,
} from '@/types/travel-decision-contract';

export { TRAVEL_GOALS_SECTION_ID } from '@/lib/trip-constraints-contract.util';

export const TRAVEL_GOAL_DEFINITIONS: TravelGoalDefinition[] = [
  { id: 'safety', label: '安全第一', description: '风险与合规优先于体验与效率', apiPrinciple: 'SAFETY' },
  { id: 'pace', label: '行程轻松', description: '控制每日强度，保留休息与缓冲', apiPrinciple: 'PACE' },
  { id: 'experience', label: '核心体验优先', description: '必去景点与关键体验不可轻易牺牲', apiPrinciple: 'CORE_EXPERIENCE' },
  { id: 'budget', label: '预算优先', description: '总花费与单项上限优先于额外体验', apiPrinciple: 'BUDGET' },
  { id: 'lodging', label: '少换住宿', description: '连续入住、减少搬运行李', apiPrinciple: 'FEWER_HOTEL_CHANGES' },
  { id: 'flexibility', label: '保留弹性', description: '留出自由探索与临时调整空间', apiPrinciple: 'FLEXIBILITY' },
  { id: 'coverage', label: '覆盖率优先', description: '尽可能多看核心景点与区域', apiPrinciple: 'COVERAGE' },
  { id: 'photography', label: '摄影体验优先', description: '黄金时刻与机位优先于购物安排', apiPrinciple: 'PHOTOGRAPHY' },
  { id: 'family_comfort', label: '老人儿童体验优先', description: '照护节奏与低强度活动优先', apiPrinciple: 'FAMILY_COMFORT' },
];

const DEFAULT_ORDER: TravelGoalDimension[] = TRAVEL_GOAL_DEFINITIONS.map((g) => g.id);

const TRAVEL_GOAL_RANKS_STORAGE_KEY = 'tripnara:travel-goal-ranks';

const VALID_IDS = new Set<TravelGoalDimension>(DEFAULT_ORDER);

function isTravelGoalDimension(value: string): value is TravelGoalDimension {
  return VALID_IDS.has(value as TravelGoalDimension);
}

export function normalizeTravelGoalOrder(
  orderedIds: string[] | undefined | null,
): TravelGoalDimension[] {
  if (!orderedIds?.length) return [...DEFAULT_ORDER];
  const seen = new Set<TravelGoalDimension>();
  const result: TravelGoalDimension[] = [];
  for (const raw of orderedIds) {
    if (!isTravelGoalDimension(raw) || seen.has(raw)) continue;
    seen.add(raw);
    result.push(raw);
  }
  for (const id of DEFAULT_ORDER) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export interface TravelGoalRankEntry {
  id: TravelGoalDimension;
  rank: number;
}

export function travelGoalOrderToRankEntries(
  orderedIds: TravelGoalDimension[],
): TravelGoalRankEntry[] {
  return orderedIds.map((id, index) => ({ id, rank: index + 1 }));
}

export function readStoredTravelGoalRanks(tripId: string): TravelGoalDimension[] | null {
  try {
    const raw = localStorage.getItem(`${TRAVEL_GOAL_RANKS_STORAGE_KEY}:${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TravelGoalRankState;
    if (!Array.isArray(parsed.orderedIds)) return null;
    return normalizeTravelGoalOrder(parsed.orderedIds);
  } catch {
    return null;
  }
}

export function writeStoredTravelGoalRanks(tripId: string, orderedIds: TravelGoalDimension[]): void {
  const payload: TravelGoalRankState = {
    orderedIds,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(`${TRAVEL_GOAL_RANKS_STORAGE_KEY}:${tripId}`, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

/** 从 planningPolicy 推断默认排序（向后兼容 IntentTab） */
export function defaultOrderFromPlanningPolicy(
  policy?: string | null,
): TravelGoalDimension[] {
  switch (policy) {
    case 'safe':
      return normalizeTravelGoalOrder(['safety', 'pace', 'experience', 'lodging', 'budget', 'flexibility', 'coverage']);
    case 'experience':
      return normalizeTravelGoalOrder(['experience', 'coverage', 'pace', 'flexibility', 'lodging', 'safety', 'budget']);
    case 'challenge':
      return normalizeTravelGoalOrder(['coverage', 'experience', 'flexibility', 'pace', 'budget', 'lodging', 'safety']);
    default:
      return [...DEFAULT_ORDER];
  }
}

export function resolveTravelGoalOrder(input: {
  tripId: string;
  intentOrderedIds?: string[] | null;
  planningPolicy?: string | null;
}): TravelGoalDimension[] {
  if (input.intentOrderedIds?.length) {
    return normalizeTravelGoalOrder(input.intentOrderedIds);
  }
  const stored = readStoredTravelGoalRanks(input.tripId);
  if (stored) return stored;
  return defaultOrderFromPlanningPolicy(input.planningPolicy);
}

/** 排序 → 多目标权重（越高越优先，供方案推荐） */
export function travelGoalRanksToWeights(
  orderedIds: TravelGoalDimension[],
  compiledLegacy?: Record<string, number> | null,
): Record<TravelGoalDimension, number> {
  if (compiledLegacy && Object.keys(compiledLegacy).length > 0) {
    const fromLegacy = {} as Record<TravelGoalDimension, number>;
    for (const def of TRAVEL_GOAL_DEFINITIONS) {
      const byPrinciple = compiledLegacy[def.apiPrinciple];
      const byDim = compiledLegacy[def.id];
      const value = byPrinciple ?? byDim;
      if (typeof value === 'number' && Number.isFinite(value)) {
        fromLegacy[def.id] = value;
      }
    }
    if (Object.keys(fromLegacy).length > 0) {
      for (const def of TRAVEL_GOAL_DEFINITIONS) {
        if (fromLegacy[def.id] == null) fromLegacy[def.id] = 1;
      }
      return fromLegacy;
    }
  }

  const n = orderedIds.length;
  const weights = {} as Record<TravelGoalDimension, number>;
  orderedIds.forEach((id, index) => {
    weights[id] = Math.max(1, n - index);
  });
  for (const def of TRAVEL_GOAL_DEFINITIONS) {
    if (weights[def.id] == null) weights[def.id] = 1;
  }
  return weights;
}

export function getTravelGoalDefinition(id: TravelGoalDimension): TravelGoalDefinition {
  return TRAVEL_GOAL_DEFINITIONS.find((g) => g.id === id) ?? TRAVEL_GOAL_DEFINITIONS[0]!;
}

export function moveTravelGoal(
  orderedIds: TravelGoalDimension[],
  id: TravelGoalDimension,
  direction: 'up' | 'down',
): TravelGoalDimension[] {
  const index = orderedIds.indexOf(id);
  if (index < 0) return orderedIds;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= orderedIds.length) return orderedIds;
  const next = [...orderedIds];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function inferPlanningPolicyFromGoalOrder(
  orderedIds: TravelGoalDimension[],
): 'safe' | 'experience' | 'challenge' {
  const top = orderedIds[0];
  if (top === 'safety' || top === 'pace') return 'safe';
  if (top === 'coverage' || top === 'flexibility') return 'challenge';
  return 'experience';
}
