import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { ConstraintConsolePartition } from '@/lib/constraint-console-partition.util';
import {
  isOfficialRuleConstraint,
  isWorldFeasibilityConstraint,
} from '@/lib/constraint-console-partition.util';
import { expandConstraintIdVariants } from '@/lib/constraints-check-normalize.util';
import { isDestinationRuleEntry } from '@/lib/destination-rules.util';
import { groupHardConstraints } from '@/lib/constraint-console-group.util';
import { apiConstraintIdToUi, uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import { expandOfficialRuleConstraintIdSet } from '@/lib/trip-constraint-destination-rule.util';
import { resolveHardEnforcementSpec } from '@/lib/trip-constraint-hard-enforcement.util';
import { tripConstraintToListEntry } from '@/lib/trip-constraints.adapter';
import type {
  PatchTripConstraintsContractDto,
  TripConstraintsContract,
  TripConstraintsContractBlockType,
  TripConstraintsDisplayPrinciple,
  TripConstraintsListResponse,
  TripConstraintsSectionKey,
  TripConstraintsSectionMeta,
} from '@/types/trip-constraints';
import type {
  AutomationDefaultLevel,
  ChangeStrategyArchetype,
  TravelGoalDimension,
  TripObjectivePrinciple,
} from '@/types/travel-decision-contract';
import type { DecisionWeightMode } from '@/types/optimization-v2';
import {
  GOVERNANCE_MODE_META,
  backendToGovernance,
  governanceToBackend,
  type TeamGovernanceMode,
} from '@/lib/team-tab-model';

const PRINCIPLE_LABELS: Record<string, string> = {
  SAFETY: '安全第一',
  PACE: '行程轻松',
  CORE_EXPERIENCE: '核心体验优先',
  BUDGET: '预算优先',
  FEWER_HOTEL_CHANGES: '少换住宿',
  FEWER_LODGING_CHANGES: '少换住宿',
  FLEXIBILITY: '保留弹性',
  COVERAGE: '覆盖率优先',
  PHOTOGRAPHY: '摄影体验优先',
  FAMILY_COMFORT: '老人儿童体验优先',
};
import type {
  ConstraintConsoleViewModel,
  ConstraintConsoleViewSection,
} from '@/types/frontend-travel-decision-contract-api.types';

export const TRAVEL_GOALS_SECTION_ID = '__travel_goals__';

export const DEFAULT_CONSTRAINT_SECTIONS: TripConstraintsSectionMeta[] = [
  { key: 'travel_objectives', label: '旅行目标', contractBlock: 'objectives' },
  {
    key: 'hard_must_satisfy',
    label: '必须满足',
    subtitle: '硬约束 · 不可突破',
    readonly: false,
  },
  { key: 'soft_prefer', label: '尽量满足', subtitle: '可协商软约束 · 按重要程度取舍', readonly: false },
  { key: 'team_members', label: '团队成员', contractBlock: 'team_governance' },
  { key: 'change_strategy', label: '风险与变化策略', contractBlock: 'change_strategy' },
  { key: 'automation', label: 'AI 自动执行', subtitle: '摘要 · 在授权中心编辑', contractBlock: 'automation', readonly: true },
  { key: 'conflicts_and_impact', label: '冲突与影响', contractBlock: 'conflicts' },
  {
    key: 'readonly_official',
    label: '目的地规则',
    subtitle: '官方数据 · 只读 · 可查看确认',
    readonly: true,
  },
  {
    key: 'readonly_world',
    label: '实时世界状态',
    subtitle: '天气 / 路况 / 开放状态 · 只读',
    readonly: true,
  },
];

const PRINCIPLE_TO_DIMENSION: Record<string, TravelGoalDimension> = {
  SAFETY: 'safety',
  PACE: 'pace',
  CORE_EXPERIENCE: 'experience',
  BUDGET: 'budget',
  FEWER_HOTEL_CHANGES: 'lodging',
  FEWER_LODGING_CHANGES: 'lodging',
  LODGING: 'lodging',
  FLEXIBILITY: 'flexibility',
  COVERAGE: 'coverage',
  PHOTOGRAPHY: 'photography',
  FAMILY_COMFORT: 'family_comfort',
};

const DIMENSION_TO_PRINCIPLE: Record<TravelGoalDimension, TripObjectivePrinciple> = {
  safety: 'SAFETY',
  pace: 'PACE',
  experience: 'CORE_EXPERIENCE',
  budget: 'BUDGET',
  lodging: 'FEWER_HOTEL_CHANGES',
  flexibility: 'FLEXIBILITY',
  coverage: 'COVERAGE',
  photography: 'PHOTOGRAPHY',
  family_comfort: 'FAMILY_COMFORT',
};

export function apiPrincipleToTravelGoalDimension(
  principle: string,
): TravelGoalDimension | null {
  return PRINCIPLE_TO_DIMENSION[principle.toUpperCase()] ?? null;
}

export function travelGoalDimensionsToApiPrinciples(
  orderedIds: TravelGoalDimension[],
): TripObjectivePrinciple[] {
  return orderedIds.map((id) => DIMENSION_TO_PRINCIPLE[id] ?? String(id).toUpperCase());
}

export function resolveDisplayPrinciples(
  contract: TripConstraintsContract | null | undefined,
): TripConstraintsDisplayPrinciple[] {
  const fromObjectives = contract?.objectives?.displayPrinciples;
  if (fromObjectives?.length) {
    return [...fromObjectives].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }
  const legacy = contract?.displayPrinciples;
  if (legacy?.length) {
    return [...legacy].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }
  const ranked = contract?.objectives?.rankedPrinciples;
  if (!ranked?.length) return [];
  return ranked.map((principle, index) => ({
    principle,
    label: principleLabel(String(principle)),
    rank: index + 1,
  }));
}

export function resolveTravelGoalsFromContract(
  contract: TripConstraintsContract | null | undefined,
  fallback: TravelGoalDimension[],
): TravelGoalDimension[] {
  const display = resolveDisplayPrinciples(contract);
  if (display.length) {
    const seen = new Set<TravelGoalDimension>();
    const result: TravelGoalDimension[] = [];
    for (const row of display) {
      const dim = apiPrincipleToTravelGoalDimension(String(row.principle));
      if (!dim || seen.has(dim)) continue;
      seen.add(dim);
      result.push(dim);
    }
    for (const id of fallback) {
      if (!seen.has(id)) result.push(id);
    }
    return result;
  }

  const ranked = contract?.objectives?.rankedPrinciples;
  if (!ranked?.length) return fallback;
  const seen = new Set<TravelGoalDimension>();
  const result: TravelGoalDimension[] = [];
  for (const principle of ranked) {
    const dim = apiPrincipleToTravelGoalDimension(String(principle));
    if (!dim || seen.has(dim)) continue;
    seen.add(dim);
    result.push(dim);
  }
  for (const id of fallback) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export function principleLabel(principle: string): string {
  return PRINCIPLE_LABELS[principle.toUpperCase()] ?? principle;
}

export function sectionKeyToSelectionId(key: TripConstraintsSectionKey): string {
  if (key === 'travel_objectives') return TRAVEL_GOALS_SECTION_ID;
  return key;
}

export function selectionIdToSectionKey(selectedId: string | null): TripConstraintsSectionKey | null {
  if (!selectedId) return null;
  if (selectedId === TRAVEL_GOALS_SECTION_ID) return 'travel_objectives';
  const contractKeys = new Set([
    'team_members',
    'change_strategy',
    'automation',
    'conflicts_and_impact',
    'readonly_official',
    'readonly_world',
  ]);
  if (contractKeys.has(selectedId)) return selectedId;
  return null;
}

export function isContractSectionKey(key: TripConstraintsSectionKey): boolean {
  return (
    key === 'travel_objectives' ||
    key === 'team_members' ||
    key === 'change_strategy' ||
    key === 'automation' ||
    key === 'conflicts_and_impact'
  );
}

export interface ConstraintConsoleSectionViewModel {
  meta: TripConstraintsSectionMeta;
  items: ConstraintListEntry[];
  contractBlock?: TripConstraintsContractBlockType | null;
  readonly?: boolean;
}

function inferSectionKeyForEntry(entry: ConstraintListEntry): TripConstraintsSectionKey {
  if (isWorldFeasibilityConstraint(entry)) return 'readonly_world';
  if (isOfficialRuleConstraint(entry) || isDestinationRuleEntry(entry)) return 'readonly_official';
  if (entry.sectionKey) return entry.sectionKey as TripConstraintsSectionKey;
  if (entry.kind === 'soft') return 'soft_prefer';
  if (entry.category === 'MEMBER') return 'team_members';
  return 'hard_must_satisfy';
}

export function groupEntriesBySection(
  entries: ConstraintListEntry[],
  partition: ConstraintConsolePartition,
): Map<TripConstraintsSectionKey, ConstraintListEntry[]> {
  const map = new Map<TripConstraintsSectionKey, ConstraintListEntry[]>();
  const push = (key: TripConstraintsSectionKey, entry: ConstraintListEntry) => {
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  };

  for (const entry of entries) {
    push(inferSectionKeyForEntry(entry), entry);
  }

  if (!map.has('hard_must_satisfy') && partition.userHardItems.length) {
    map.set('hard_must_satisfy', [...partition.userHardItems]);
  }
  if (!map.has('soft_prefer') && partition.userSoftItems.length) {
    map.set('soft_prefer', [...partition.userSoftItems]);
  }
  if (!map.has('readonly_official') && partition.officialRuleItems.length) {
    map.set('readonly_official', [...partition.officialRuleItems]);
  }
  if (!map.has('readonly_world') && partition.worldFeasibilityItem) {
    map.set('readonly_world', [partition.worldFeasibilityItem]);
  }
  if (!map.has('team_members')) {
    const memberItems = entries.filter(
      (e) => e.category === 'MEMBER' || e.sectionKey === 'team_members',
    );
    if (memberItems.length) map.set('team_members', memberItems);
  }

  return map;
}

function resolveSectionItems(
  meta: TripConstraintsSectionMeta,
  entriesById: Map<string, ConstraintListEntry>,
  fallbackBySection: Map<TripConstraintsSectionKey, ConstraintListEntry[]>,
): ConstraintListEntry[] {
  let items: ConstraintListEntry[];
  if (meta.constraintIds?.length) {
    items = meta.constraintIds
      .map((id) => entriesById.get(id) ?? entriesById.get(apiConstraintIdToUi(id)))
      .filter((item): item is ConstraintListEntry => item != null);
  } else {
    items = fallbackBySection.get(meta.key) ?? [];
  }

  if (meta.key === 'hard_must_satisfy') {
    return items.filter(
      (item) => !isOfficialRuleConstraint(item) && !isDestinationRuleEntry(item),
    );
  }
  if (meta.key === 'conflicts_and_impact') {
    return items.filter(
      (item) => !isOfficialRuleConstraint(item) && !isDestinationRuleEntry(item),
    );
  }
  if (meta.key === 'readonly_official') {
    const officialFallback = fallbackBySection.get('readonly_official') ?? [];
    const merged = new Map<string, ConstraintListEntry>();
    for (const item of items) {
      if (isOfficialRuleConstraint(item) || isDestinationRuleEntry(item)) {
        merged.set(item.id, item);
      }
    }
    for (const item of officialFallback) merged.set(item.id, item);
    return [...merged.values()];
  }
  return items;
}

export function buildConstraintConsoleViewModelFromListResponse(
  data: TripConstraintsListResponse,
  uiEntries?: ConstraintListEntry[],
): ConstraintConsoleViewModel {
  const itemsById: Record<string, import('@/types/trip-constraints').TripConstraint> = {};
  for (const item of data.items) {
    itemsById[item.id] = item;
  }

  const entriesById = new Map<string, ConstraintListEntry>();
  if (uiEntries?.length) {
    for (const entry of uiEntries) {
      entriesById.set(entry.id, entry);
      entriesById.set(uiConstraintIdToApi(entry.id), entry);
    }
  } else {
    for (const item of data.items) {
      const entry = tripConstraintToListEntry(item);
      entriesById.set(item.id, entry);
      entriesById.set(entry.id, entry);
    }
  }

  const sectionMetas = data.meta.sections?.length ? data.meta.sections : DEFAULT_CONSTRAINT_SECTIONS;
  const emptyPartition: ConstraintConsolePartition = {
    userHardItems: [],
    userSoftItems: [],
    officialRuleItems: [],
    worldFeasibilityItem: null,
  };
  const allUiEntries = uiEntries ?? [...entriesById.values()];
  const fallbackBySection = groupEntriesBySection(allUiEntries, emptyPartition);

  const sections: ConstraintConsoleViewSection[] = sectionMetas.map((section) => ({
    section,
    contractBlock: section.contractBlock ?? null,
    constraints: resolveSectionItems(section, entriesById, fallbackBySection),
  }));

  return {
    constraintsVersion: data.meta.constraintsVersion,
    contract: data.contract ?? {},
    itemsById,
    sections,
    conflictCount: data.meta.conflictCount ?? 0,
  };
}

export function buildConstraintConsoleSections(input: {
  response?: TripConstraintsListResponse | null;
  partition: ConstraintConsolePartition;
  allEntries: ConstraintListEntry[];
}): ConstraintConsoleSectionViewModel[] {
  if (!input.response) {
    return buildConstraintConsoleViewModelFromListResponse(
      {
        meta: {
          tripId: '',
          constraintsVersion: 0,
          total: input.allEntries.length,
          sections: DEFAULT_CONSTRAINT_SECTIONS,
        },
        items: [],
        contract: {},
      },
      input.allEntries,
    ).sections.map(({ section, constraints, contractBlock }) => ({
      meta: section,
      items: constraints,
      contractBlock,
      readonly: section.readonly,
    }));
  }

  const view = buildConstraintConsoleViewModelFromListResponse(input.response, input.allEntries);
  return view.sections.map(({ section, constraints, contractBlock }) => ({
    meta: { ...section, count: constraints.length || section.count },
    items: constraints,
    contractBlock,
    readonly: section.readonly,
  }));
}

export function expandContractConflictIdSet(conflictConstraintIds: string[]): Set<string> {
  const idSet = expandOfficialRuleConstraintIdSet(conflictConstraintIds);
  for (const raw of conflictConstraintIds) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    idSet.add(trimmed);
    idSet.add(apiConstraintIdToUi(trimmed));
    idSet.add(uiConstraintIdToApi(trimmed));
    const spec = resolveHardEnforcementSpec({ constraintId: trimmed });
    if (spec) {
      for (const id of spec.constraintIds) idSet.add(id);
      for (const id of spec.uiIds) idSet.add(id);
    }
  }
  return idSet;
}

export function attachContractConflictIds(
  items: ConstraintListEntry[],
  conflictConstraintIds?: string[] | null,
  sacrificedConstraintIds?: string[] | null,
): ConstraintListEntry[] {
  if (!conflictConstraintIds?.length) return items;
  const idSet = expandContractConflictIdSet(conflictConstraintIds);
  const sacrificed = new Set<string>();
  for (const id of sacrificedConstraintIds ?? []) {
    for (const v of expandConstraintIdVariants(id)) sacrificed.add(v);
  }
  return items.map((item) => {
    const apiId = uiConstraintIdToApi(item.id);
    const uiId = apiConstraintIdToUi(item.id);
    if (item.softSacrificed || sacrificed.has(apiId) || sacrificed.has(item.id) || sacrificed.has(uiId)) {
      return item;
    }
    if (!idSet.has(apiId) && !idSet.has(item.id) && !idSet.has(uiId)) return item;
    return {
      ...item,
      cardTone: 'danger' as const,
      hasConflict: true,
    };
  });
}

export function changeStrategyArchetypeLabel(archetype?: ChangeStrategyArchetype | null): string {
  switch (archetype) {
    case 'CONSERVATIVE':
      return '保守型';
    case 'BALANCED':
      return '平衡型';
    case 'EXPLORATORY':
      return '探索型';
    default:
      return archetype ? String(archetype) : '未设置';
  }
}

export function automationDefaultLevelLabel(level?: AutomationDefaultLevel | null): string {
  switch (level) {
    case 'INFORM_ONLY':
      return '仅提醒';
    case 'SUGGEST':
      return '建议方案（需确认）';
    case 'AUTO_REPAIR_LOW_RISK':
      return '低风险自动修复';
    case 'AUTO_EXECUTE_CONDITIONAL':
      return '条件式自动执行';
    default:
      return level ? String(level) : '未设置';
  }
}

export interface ChangeStrategyArchetypeOption {
  value: ChangeStrategyArchetype;
  label: string;
  description: string;
}

export const CHANGE_STRATEGY_ARCHETYPE_OPTIONS: ChangeStrategyArchetypeOption[] = [
  {
    value: 'CONSERVATIVE',
    label: '保守型',
    description: '尽量保持原方案，小幅调整；冲突时优先放弃非核心体验。',
  },
  {
    value: 'BALANCED',
    label: '平衡型',
    description: '在可执行性与体验之间折中，允许适度改期与换线。',
  },
  {
    value: 'EXPLORATORY',
    label: '探索型',
    description: '接受较大变动以提升覆盖率或体验，容忍更多行程重构。',
  },
];

export interface AutomationLevelOption {
  value: AutomationDefaultLevel;
  label: string;
  description: string;
}

/** 与 BFF automation.defaultLevel 枚举对齐 */
export const AUTOMATION_LEVEL_OPTIONS: AutomationLevelOption[] = [
  {
    value: 'INFORM_ONLY',
    label: '仅提醒',
    description: '只提示问题，不进入决策中心，不自动改行程。',
  },
  {
    value: 'SUGGEST',
    label: '建议方案（需确认）',
    description: '默认：生成修复建议，需你确认后才改行程。',
  },
  {
    value: 'AUTO_REPAIR_LOW_RISK',
    label: '低风险自动修复',
    description: '午餐顺延、补缓冲等低风险调整可自动执行。',
  },
  {
    value: 'AUTO_EXECUTE_CONDITIONAL',
    label: '条件式自动执行',
    description: '满足预设规则时自动执行，无需逐项确认。',
  },
];

const TOLERANCE_FIELD_LABELS: Record<string, string> = {
  maxBudgetOverrunPct: '预算超支容忍度',
  maxDailyDriveHoursDelta: '每日驾驶时长浮动',
  maxHotelChanges: '换宿次数上限',
  maxDelayMinutes: '最大延误分钟',
  maxPoiRemovals: '最多移除景点数',
  allowTemporaryLodgingChange: '允许临时换宿',
  allowSameDayReroute: '允许当日改线',
  acceptLowConfidencePlans: '接受低置信方案',
};

export function toleranceFieldLabel(key: string): string {
  return TOLERANCE_FIELD_LABELS[key] ?? key;
}

export function readBudgetOverrunTolerancePct(
  tolerances?: Record<string, unknown> | null,
): number | null {
  const raw = tolerances?.maxBudgetOverrunPct;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** contract.teamGovernance.rules · 决策权重模式 */
export const TEAM_GOVERNANCE_DECISION_RULE_KEY = 'decision_weight_mode';

export function parseGovernanceModeFromContractRules(
  rules?: Array<{ key?: string; label?: string; description?: string }> | null,
): TeamGovernanceMode | null {
  const rule = rules?.find((row) => row.key === TEAM_GOVERNANCE_DECISION_RULE_KEY);
  if (!rule) return null;
  const backendMatch = rule.description?.match(/^mode:([A-Z_]+)$/);
  if (backendMatch?.[1]) {
    return backendToGovernance(backendMatch[1] as DecisionWeightMode);
  }
  for (const [mode, meta] of Object.entries(GOVERNANCE_MODE_META)) {
    if (rule.label === meta.label) return mode as TeamGovernanceMode;
  }
  return null;
}

export function mergeTeamGovernanceDecisionRule(
  rules: Array<{ key?: string; label: string; description?: string }> | undefined | null,
  mode: TeamGovernanceMode,
): Array<{ key?: string; label: string; description?: string }> {
  const meta = GOVERNANCE_MODE_META[mode];
  const without = (rules ?? []).filter((row) => row.key !== TEAM_GOVERNANCE_DECISION_RULE_KEY);
  return [
    ...without,
    {
      key: TEAM_GOVERNANCE_DECISION_RULE_KEY,
      label: meta.label,
      description: `mode:${governanceToBackend(mode)}`,
    },
  ];
}

export { groupHardConstraints };

/** PATCH contract 局部合并 — 供乐观更新 UI */
export function mergeContractPatch(
  base: TripConstraintsContract | null | undefined,
  patch: PatchTripConstraintsContractDto,
): TripConstraintsContract {
  const current: TripConstraintsContract = base ? { ...base } : {};

  if (patch.objectives) {
    current.objectives = { ...current.objectives, ...patch.objectives };
  }

  if (patch.changeStrategy) {
    current.changeStrategy = {
      ...current.changeStrategy,
      ...patch.changeStrategy,
      tolerances: {
        ...(current.changeStrategy?.tolerances ?? {}),
        ...(patch.changeStrategy.tolerances ?? {}),
      },
    };
  }

  if (patch.automation) {
    current.automation = { ...current.automation, ...patch.automation };
  }

  if (patch.teamGovernance) {
    current.teamGovernance = {
      ...current.teamGovernance,
      ...patch.teamGovernance,
      members: patch.teamGovernance.members ?? current.teamGovernance?.members,
      rules: patch.teamGovernance.rules ?? current.teamGovernance?.rules,
    };
  }

  return current;
}
