import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type {
  DestinationRuleCategory,
  DestinationRuleEvidenceStatus,
  DestinationRuleMetadata,
  DestinationRuleTier,
} from '@/types/destination-rules';
import type { TripConstraint } from '@/types/trip-constraints';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import { isOfficialRuleConstraint } from '@/lib/constraint-console-partition.util';
import {
  isDestinationRuleBlockedTier,
  resolveDestinationRuleTierSpec,
  resolveDestinationRuleViolationLabel,
} from '@/lib/trip-constraint-destination-rule.util';

export const DESTINATION_RULES_SECTION_INTRO =
  '目的地规则由官方数据与目的地包加载，定义「当地世界怎么运行」。不可突破官方底线，仅可查看、确认或（建议型）设置更保守。';

export const DESTINATION_RULES_PIPELINE =
  '目的地规则包 → 约束评估 → 可执行性证明 → 发现道路/天气/准入问题 → 修复 / 刷新证据 / 决策空间';

export const CONSTRAINT_SOURCE_LAYERS = [
  { layer: '用户目标与偏好', owner: '用户', editable: '可以' },
  { layer: '团队约束', owner: '成员 / 组织者', editable: '可以' },
  { layer: '行程结构规则', owner: '系统', editable: '通常不能' },
  { layer: '目的地规则', owner: '官方数据 + 目的地包', editable: '不能突破' },
  { layer: '实时世界状态', owner: '天气、路况、开放状态', editable: '不能修改' },
  { layer: '系统安全策略', owner: 'TripNARA', editable: '不能关闭关键底线' },
] as const;

export const DESTINATION_RULE_CATEGORY_ORDER: DestinationRuleCategory[] = [
  'TRAFFIC',
  'NATURAL_RISK',
  'VENUE_ACCESS',
  'REGULATION',
  'SERVICE_AVAILABILITY',
];

export const DESTINATION_RULE_CATEGORY_LABELS: Record<string, string> = {
  TRAFFIC: '交通规则',
  NATURAL_RISK: '自然风险',
  VENUE_ACCESS: '景点准入',
  REGULATION: '法规与行为',
  SERVICE_AVAILABILITY: '服务可得性',
};

export const DESTINATION_RULE_TIER_LABELS: Record<DestinationRuleTier, string> = {
  BLOCK: '不可突破',
  CONDITIONAL: '条件性',
  ADVISORY: '建议性',
};

const TIER_VIOLATION_DEFAULTS: Record<DestinationRuleTier, string> = {
  BLOCK: '阻断路线',
  CONDITIONAL: '检查条件是否满足',
  ADVISORY: '影响风险评分',
};

const EVIDENCE_LABELS: Record<string, string> = {
  VERIFIED: '已验证',
  CURRENT: '已验证',
  OUTDATED: '待更新',
  PENDING: '验证中',
  UNKNOWN: '未验证',
};

export interface DestinationRuleGroup {
  category: DestinationRuleCategory;
  label: string;
  items: ConstraintListEntry[];
}

type StaticDestinationRuleDef = {
  category: DestinationRuleCategory;
  tier: DestinationRuleTier;
  sourceLabel: string;
  scopeLabel: string;
  judgmentRule: string;
  violationLabel?: string;
};

const STATIC_DESTINATION_RULES: Record<string, StaticDestinationRuleDef> = {
  f_road_4wd: {
    category: 'TRAFFIC',
    tier: 'BLOCK',
    sourceLabel: '冰岛道路管理部门',
    scopeLabel: '高地道路（F 路）',
    judgmentRule: '仅允许符合要求的四驱车辆',
    violationLabel: '阻断路线',
  },
  f_road_vehicle_access: {
    category: 'TRAFFIC',
    tier: 'BLOCK',
    sourceLabel: '冰岛道路管理部门',
    scopeLabel: '高地道路（F 路）',
    judgmentRule: '仅允许符合要求的四驱车辆进入 F 路',
    violationLabel: '阻断路线',
  },
  c_official_is_froad_2wd: {
    category: 'TRAFFIC',
    tier: 'BLOCK',
    sourceLabel: '冰岛道路管理部门',
    scopeLabel: '高地道路（F 路）',
    judgmentRule: '仅允许符合要求的四驱车辆进入 F 路',
    violationLabel: '阻断路线',
  },
  road_restrictions: {
    category: 'TRAFFIC',
    tier: 'CONDITIONAL',
    sourceLabel: '目的地道路管理机构',
    scopeLabel: '指定路段',
    judgmentRule: '季节性封路或未开放道路不得通行',
    violationLabel: '阻断路线',
  },
  c_world_feasibility: {
    category: 'TRAFFIC',
    tier: 'CONDITIONAL',
    sourceLabel: '目的地合规包',
    scopeLabel: '行程涉及路段',
    judgmentRule: '道路等级、开放状态与车辆准入须满足要求',
  },
};

function readValueObject(apiConstraint?: TripConstraint | null): Record<string, unknown> | null {
  if (!apiConstraint?.value || typeof apiConstraint.value !== 'object') return null;
  return apiConstraint.value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function resolveMetaKey(entry: ConstraintListEntry, apiConstraint?: TripConstraint | null): string {
  const candidates = [
    entry.id,
    apiConstraint?.id ? apiConstraintIdToUi(apiConstraint.id) : null,
    apiConstraint?.id,
    apiConstraint?.source?.templateId,
  ].filter(Boolean) as string[];
  for (const key of candidates) {
    if (STATIC_DESTINATION_RULES[key]) return key;
    if (key.startsWith('c_') && STATIC_DESTINATION_RULES[key.slice(2)]) return key.slice(2);
  }
  return candidates[0] ?? entry.id;
}

function inferCategory(
  entry: ConstraintListEntry,
  apiConstraint: TripConstraint | null | undefined,
  value: Record<string, unknown> | null,
): DestinationRuleCategory {
  const explicit = readString(value?.destinationRuleCategory ?? value?.category);
  if (explicit && DESTINATION_RULE_CATEGORY_LABELS[explicit]) return explicit;

  const key = resolveMetaKey(entry, apiConstraint);
  if (STATIC_DESTINATION_RULES[key]?.category) return STATIC_DESTINATION_RULES[key].category;

  const cat = apiConstraint?.category ?? entry.category;
  if (cat === 'TRANSPORT' || cat === 'WORLD') return 'TRAFFIC';
  if (cat === 'SAFETY') return 'NATURAL_RISK';
  if (cat === 'PLACE' || cat === 'PACE') return 'VENUE_ACCESS';
  if (cat === 'TIME') return 'VENUE_ACCESS';

  const text = `${entry.label} ${entry.description ?? ''}`.toLowerCase();
  if (/f路|道路|驾驶|渡轮|轮胎|封路/.test(text)) return 'TRAFFIC';
  if (/火山|雪崩|洪水|风|浪|落石|冰川/.test(text)) return 'NATURAL_RISK';
  if (/开放|预约|限流|入场|景点/.test(text)) return 'VENUE_ACCESS';
  if (/露营|无人机|停车|保护|驾驶/.test(text)) return 'REGULATION';
  if (/加油|医疗|补给|住宿|关闭/.test(text)) return 'SERVICE_AVAILABILITY';
  return 'REGULATION';
}

function inferTier(
  entry: ConstraintListEntry,
  apiConstraint: TripConstraint | null | undefined,
  value: Record<string, unknown> | null,
): DestinationRuleTier {
  const explicit = readString(value?.destinationRuleTier ?? value?.tier);
  if (explicit === 'BLOCK' || explicit === 'CONDITIONAL' || explicit === 'ADVISORY') return explicit;

  const key = resolveMetaKey(entry, apiConstraint);
  if (STATIC_DESTINATION_RULES[key]?.tier) return STATIC_DESTINATION_RULES[key].tier;

  if (entry.hasConflict || entry.cardTone === 'danger' || apiConstraint?.hasConflict) return 'BLOCK';
  if (apiConstraint?.locked || entry.locked) return 'BLOCK';
  if (apiConstraint?.verificationStatus === 'OUTDATED') return 'CONDITIONAL';
  return 'ADVISORY';
}

function inferEvidenceStatus(
  apiConstraint?: TripConstraint | null,
): { status: DestinationRuleEvidenceStatus; label: string } {
  const raw = apiConstraint?.verificationStatus ?? 'UNKNOWN';
  const normalized =
    raw === 'CURRENT' ? 'VERIFIED' : (raw as DestinationRuleEvidenceStatus);
  return {
    status: normalized,
    label: EVIDENCE_LABELS[normalized] ?? EVIDENCE_LABELS.UNKNOWN,
  };
}

function violationLabelFromContractMeta(
  contractMeta?: TripConstraint['contractMeta'],
  tier?: DestinationRuleTier,
  valueLabel?: string,
): string {
  return resolveDestinationRuleViolationLabel(
    tier,
    contractMeta?.violationResultLabel,
    valueLabel,
  );
}

export function buildDestinationRuleMetadata(input: {
  entry: ConstraintListEntry;
  apiConstraint?: TripConstraint | null;
}): DestinationRuleMetadata {
  const { entry, apiConstraint } = input;
  const value = readValueObject(apiConstraint);
  const contractMeta = apiConstraint?.contractMeta;
  const metaKey = resolveMetaKey(entry, apiConstraint);
  const staticDef = STATIC_DESTINATION_RULES[metaKey];

  const category = inferCategory(entry, apiConstraint, value);
  const tier = inferTier(entry, apiConstraint, value);
  const tierSpec = resolveDestinationRuleTierSpec(tier);
  const evidence = inferEvidenceStatus(apiConstraint);

  const sourceLabel =
    readString(value?.sourceAgency ?? value?.sourceLabel ?? value?.source) ??
    staticDef?.sourceLabel ??
    '目的地官方数据';

  const scopeLabel =
    contractMeta?.scopeLabel?.trim() ??
    readString(value?.applicableScope ?? value?.scopeLabel) ??
    staticDef?.scopeLabel ??
    (apiConstraint?.scope?.type === 'TRIP' ? '整趟行程' : entry.value?.trim() || '指定范围');

  const judgmentRule =
    contractMeta?.judgmentRule?.trim() ??
    readString(value?.judgmentRule ?? value?.rule ?? value?.ruleText) ??
    staticDef?.judgmentRule ??
    apiConstraint?.description?.trim() ??
    entry.description?.trim() ??
    entry.label;

  const violationLabel = violationLabelFromContractMeta(
    contractMeta,
    tier,
    readString(value?.violationResult ?? value?.violationLabel) ?? staticDef?.violationLabel,
  );

  const tripImpact =
    readString(value?.tripImpact ?? value?.impactSummary) ??
    (entry.hasConflict ? '当前行程可能违反此规则，请查看可执行性证明或修复建议。' : undefined);

  const blocksExecution =
    isDestinationRuleBlockedTier(tier) ||
    tierSpec?.violationResult === 'BLOCK' ||
    Boolean(entry.hasConflict || apiConstraint?.hasConflict);

  return {
    category,
    categoryLabel: DESTINATION_RULE_CATEGORY_LABELS[category] ?? category,
    tier,
    tierLabel: DESTINATION_RULE_TIER_LABELS[tier] ?? tier,
    sourceLabel,
    scopeLabel,
    judgmentRule,
    violationLabel,
    evidenceStatus: evidence.status,
    evidenceStatusLabel: evidence.label,
    tripImpact,
    blocksExecution,
    canSetMoreConservative: tier === 'ADVISORY' && !apiConstraint?.locked,
    editable: false,
  };
}

export function enrichListEntryWithDestinationRule(
  entry: ConstraintListEntry,
  apiConstraint?: TripConstraint | null,
): ConstraintListEntry {
  if (!isOfficialRuleConstraint(entry) && entry.sourceType !== 'OFFICIAL_RULE' && !entry.readOnly) {
    return entry;
  }
  const destinationRule = buildDestinationRuleMetadata({ entry, apiConstraint });
  return {
    ...entry,
    kind: 'external',
    readOnly: true,
    locked: entry.locked ?? true,
    destinationRule,
    sectionKey: 'readonly_official',
  };
}

export function groupDestinationRules(items: ConstraintListEntry[]): DestinationRuleGroup[] {
  const buckets = new Map<DestinationRuleCategory, ConstraintListEntry[]>();
  for (const item of items) {
    const category = item.destinationRule?.category ?? 'REGULATION';
    const list = buckets.get(category) ?? [];
    list.push(item);
    buckets.set(category, list);
  }
  return DESTINATION_RULE_CATEGORY_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (category) => ({
      category,
      label: DESTINATION_RULE_CATEGORY_LABELS[category] ?? category,
      items: buckets.get(category) ?? [],
    }),
  );
}

export function isDestinationRuleEntry(entry: ConstraintListEntry): boolean {
  return Boolean(entry.destinationRule) || isOfficialRuleConstraint(entry);
}
