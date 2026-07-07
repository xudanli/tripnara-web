import {
  isPlanObjectSemanticKey,
  PLAN_OBJECT_SEMANTIC_PREFIX,
} from '@/lib/plan-object-source.util';
import type { DecisionCheckerEvidenceItemDto } from '@/types/decision-checker';

const UUID_SEGMENT = /_po_[a-f0-9-]{8,}/gi;

/** 与 NestJS `plan-object-evidence-display.util.ts` ruleId 映射对齐（BFF subtitle 兜底） */
export const PLAN_OBJECT_RULE_ID_LABELS: Record<string, string> = {
  MEAL_WINDOW_VS_ARRIVAL: '依据：游览结束晚于午餐窗',
  MEAL_WINDOW_GAP: '依据：午餐空闲时间不足',
  BUFFER_LINKAGE: '依据：相邻活动缓冲不足',
  STAY_LINKAGE: '依据：住宿衔接不完整',
  DAILY_FATIGUE_LOAD: '依据：当日疲劳负荷偏高',
  TRANSFER_DAILY_LOAD: '依据：当日转移路程偏多',
};

/** plan_object_* 语义段 → 用户可读标题（legacy BFF 未填 title 时的前端兜底） */
const PLAN_OBJECT_SEMANTIC_LABELS: Record<string, string> = {
  meal_late_arrival: '游览结束晚于午餐窗',
  meal_gap: '用餐间隔不足',
  meal_window: '午餐窗冲突',
  transfer_buffer: '转场缓冲偏紧',
  visit_overlap: '游览时间重叠',
  visit_duration: '游览时长冲突',
  stay_checkout: '退房时间冲突',
  stay_checkin: '入住时间冲突',
};

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/** BFF 是否把 semanticKey / id 当成了 title */
export function isTechnicalEvidenceLabel(text: string | undefined | null): boolean {
  const value = text?.trim();
  if (!value) return false;
  if (isPlanObjectSemanticKey(value)) return true;
  if (/^ev_[a-z0-9_-]+$/i.test(value)) return true;
  if (/plan_object_[a-z0-9_]+/i.test(value)) return true;
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
    return true;
  }
  if (
    !hasCjk(value) &&
    /^[a-z][a-z0-9_]{20,}$/i.test(value) &&
    (value.match(/_/g)?.length ?? 0) >= 3
  ) {
    return true;
  }
  return false;
}

function looksLikeUserFacingText(text: string): boolean {
  const value = text.trim();
  if (!value || isTechnicalEvidenceLabel(value)) return false;
  if (hasCjk(value)) return true;
  return /\s/.test(value) && value.length >= 8;
}

/** 从 plan_object_meal_late_arrival_po_<uuid>_meal_window_policy 提取语义标签 */
export function resolvePlanObjectEvidenceLabel(key: string | undefined | null): string | undefined {
  const raw = key?.trim();
  if (!raw) return undefined;

  let slug = raw.toLowerCase();
  const prefixIndex = slug.indexOf(PLAN_OBJECT_SEMANTIC_PREFIX);
  if (prefixIndex >= 0) {
    slug = slug.slice(prefixIndex + PLAN_OBJECT_SEMANTIC_PREFIX.length);
  }
  slug = slug.replace(UUID_SEGMENT, '');
  slug = slug.replace(/_(meal_window_policy|policy|rule)$/i, '');

  if (PLAN_OBJECT_SEMANTIC_LABELS[slug]) {
    return PLAN_OBJECT_SEMANTIC_LABELS[slug];
  }

  for (const [pattern, label] of Object.entries(PLAN_OBJECT_SEMANTIC_LABELS)) {
    if (slug === pattern || slug.startsWith(`${pattern}_`) || slug.includes(`_${pattern}`)) {
      return label;
    }
  }

  return undefined;
}

export function resolvePlanObjectRuleSubtitle(ruleId: string | undefined | null): string | undefined {
  const id = ruleId?.trim();
  if (!id) return undefined;
  return PLAN_OBJECT_RULE_ID_LABELS[id];
}

function readPlanObjectRuleIdFromRefs(
  refs: DecisionCheckerEvidenceItemDto['refs'],
): string | undefined {
  return refs?.find((ref) => ref.type === 'plan_object_rule')?.id;
}

function hasPlanObjectSemanticRef(refs: DecisionCheckerEvidenceItemDto['refs']): boolean {
  return (
    refs?.some(
      (ref) =>
        ref.type === 'semantic_key' ||
        ref.type === 'semanticKey' ||
        isPlanObjectSemanticKey(ref.id),
    ) ?? false
  );
}

export function isPlanObjectEvidenceItem(item: DecisionCheckerEvidenceItemDto): boolean {
  return (
    hasPlanObjectSemanticRef(item.refs) ||
    isPlanObjectSemanticKey(item.id) ||
    isPlanObjectSemanticKey(item.title) ||
    item.kind === 'plan_object' ||
    item.kind === 'plan-object-evaluator'
  );
}

function withPlanObjectRuleSubtitle(
  item: DecisionCheckerEvidenceItemDto,
): DecisionCheckerEvidenceItemDto {
  const subtitle = item.subtitle?.trim();
  if (subtitle) return item;
  const fromRule = resolvePlanObjectRuleSubtitle(readPlanObjectRuleIdFromRefs(item.refs));
  return fromRule ? { ...item, subtitle: fromRule } : item;
}

/** 将证据 title/subtitle 转为用户可读文案（legacy：title 误填 semanticKey 时兜底） */
export function formatDecisionCheckerEvidenceItem(
  item: DecisionCheckerEvidenceItemDto,
): DecisionCheckerEvidenceItemDto {
  const titleRaw = item.title?.trim() ?? '';
  const subtitleRaw = item.subtitle?.trim() ?? '';
  const titleIsTechnical = isTechnicalEvidenceLabel(titleRaw);
  const subtitleIsHuman = looksLikeUserFacingText(subtitleRaw);

  if (!titleIsTechnical) {
    return withPlanObjectRuleSubtitle(item);
  }

  const ruleSubtitle = resolvePlanObjectRuleSubtitle(readPlanObjectRuleIdFromRefs(item.refs));
  const categoryLabel =
    resolvePlanObjectEvidenceLabel(titleRaw) ??
    resolvePlanObjectEvidenceLabel(item.id) ??
    resolvePlanObjectEvidenceLabel(
      item.refs?.find((ref) => ref.type === 'semantic_key' || ref.type === 'semanticKey')?.id,
    ) ??
    '日内行程评估';

  if (subtitleIsHuman) {
    return withPlanObjectRuleSubtitle({
      ...item,
      title: subtitleRaw,
      subtitle: ruleSubtitle ?? (subtitleRaw.includes(categoryLabel) || categoryLabel === '日内行程评估'
        ? '依据：日内行程评估'
        : `依据：${categoryLabel}`),
    });
  }

  return withPlanObjectRuleSubtitle({
    ...item,
    title: categoryLabel,
    subtitle:
      ruleSubtitle ??
      (subtitleRaw && !isTechnicalEvidenceLabel(subtitleRaw) ? subtitleRaw : item.subtitle),
  });
}

export function formatDecisionCheckerEvidenceItems(
  items: DecisionCheckerEvidenceItemDto[] | undefined | null,
): DecisionCheckerEvidenceItemDto[] {
  return (items ?? []).map(formatDecisionCheckerEvidenceItem);
}
