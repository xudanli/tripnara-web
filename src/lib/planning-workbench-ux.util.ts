import type {
  ExecutePlanningWorkbenchResponse,
  OptionComparison,
  WorkbenchBudgetPreview,
} from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import type { GateStatus } from '@/lib/gate-status';
import { normalizeGateStatus } from '@/lib/gate-status';
import { isHardConstraintBlock, extractPresentationChooseOptions } from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import {
  looksLikeDebugPersonaAlertText,
  reasonCodeToDisplayZh,
  stripPersonaMessageTechnicalTail,
} from '@/lib/persona-alert-display';

const WORKBENCH_PERSONA_PREFIX =
  /^(?:Abu|Dr\.?\s*Dre|Neptune)\s*(?:拒绝|发现风险|提示|警告)[:：]\s*/i;

const WORKBENCH_INLINE_REASON_CODE = /\b([A-Z][A-Z0-9_]{2,})\b/g;

/** 去掉 execute 响应里混入的内部日志 / 英文 dump，供 Plan Gate 展示 */
export function humanizeWorkbenchDisplayText(text: string | null | undefined): string {
  let s = text?.trim() ?? '';
  if (!s) return '';

  s = stripPersonaMessageTechnicalTail(s);
  s = s.replace(/\bpersona\s+closure\b[\s\S]*$/i, '').trim();
  s = s.replace(/\bstop=[A-Z0-9_]+\b/gi, '').trim();
  s = s.replace(/\brechecks=\d+\b/gi, '').trim();
  s = s.replace(WORKBENCH_INLINE_REASON_CODE, (code) => reasonCodeToDisplayZh(code) || code);

  if (/[\u4e00-\u9fff]/.test(s)) {
    s = s.replace(/[:：]\s*['']?[a-z][\s\S]*$/i, '').trim();
  }

  s = s.replace(WORKBENCH_PERSONA_PREFIX, '').trim();
  s = s.replace(/[:：]\s*$/, '').trim();

  if (!s || /^Abu 发现风险$/i.test(s)) return '';

  if (looksLikeDebugPersonaAlertText(s)) {
    const chinese = s.match(/[\u4e00-\u9fff][\u4e00-\u9fff\d\s，。；：、！？（）—\-·]*/g);
    const best = chinese?.sort((a, b) => b.length - a.length)[0]?.trim();
    if (best) s = best;
  }

  return s.replace(/[:：]\s*$/, '').trim();
}

function normalizeWorkbenchTextKey(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isDuplicateWorkbenchText(a: string, b: string): boolean {
  const na = normalizeWorkbenchTextKey(a);
  const nb = normalizeWorkbenchTextKey(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function pickOptionComparisonFromResult(
  result: ExecutePlanningWorkbenchResponse | null,
): OptionComparison | undefined {
  if (!result) return undefined;
  const cmp = result.uiOutput?.comparison;
  if (cmp && (cmp.options?.length || cmp.recommendation || cmp.kernelGateEval)) {
    return cmp;
  }
  const meta = result.planState?.metadata as Record<string, unknown> | undefined;
  const fromMeta = meta?.comparison as OptionComparison | undefined;
  if (fromMeta && (fromMeta.options?.length || fromMeta.recommendation || fromMeta.kernelGateEval)) {
    return fromMeta;
  }
  return undefined;
}

/** NEED_CONFIRM / REJECT 风险说明（优先 summary，其次 gate.reason / presentation） */
export function resolveWorkbenchRiskExplanation(
  result: ExecutePlanningWorkbenchResponse | null,
): string | undefined {
  if (!result) return undefined;

  const summary = humanizeWorkbenchDisplayText(result.uiOutput.consolidatedDecision?.summary);
  if (summary) return summary;

  const gate = result.planState?.gate as { reason?: string; narrative?: string } | undefined;
  const gateReason = humanizeWorkbenchDisplayText(gate?.reason ?? gate?.narrative);
  if (gateReason) return gateReason;

  const presentation = result.uiOutput.presentation;
  const narrative = humanizeWorkbenchDisplayText(presentation?.narrative?.replace(/^🐾\s*/, ''));
  if (narrative) return narrative;

  const headline = humanizeWorkbenchDisplayText(presentation?.headline);
  if (headline) return headline;

  return undefined;
}

/** 后端 enrich：少于 2 条真实选项会撤销 CHOOSE */
export const WORKBENCH_MIN_CHOOSE_OPTIONS = 2;

/** 后端 enrich 在无 POI 时的占位名，应继续走时间轴兜底 */
export function isGenericPlanSegmentLabel(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t) return true;
  if (/^day_\d+_segment_\d+$/i.test(t)) return true;
  if (/^第\s*\d+\s*天$/i.test(t)) return true;
  if (/^第\s*\d+\s*天\s*[：:]\s*第\s*\d+\s*天$/i.test(t)) return true;
  if (/^第\s*\d+\s*天\s*[→\-–—>]\s*第\s*\d+\s*天$/i.test(t)) return true;
  return false;
}

function resolveTripDayPreviewLabel(
  trip: TripDetail | null | undefined,
  dayIndex: number,
): string | null {
  const day = trip?.TripDay?.[dayIndex];
  if (!day) return null;

  const theme = day.theme?.trim();
  if (theme && !isGenericPlanSegmentLabel(theme)) return theme;

  const dayThemes = trip?.metadata?.dayThemes as Record<string, string> | undefined;
  const fromMeta =
    dayThemes?.[String(dayIndex + 1)]?.trim() ?? dayThemes?.[String(dayIndex)]?.trim();
  if (fromMeta && !isGenericPlanSegmentLabel(fromMeta)) return fromMeta;

  const poiNames =
    day.ItineraryItem?.map(
      (item) => item.Place?.nameCN || item.Place?.nameEN || item.note?.trim(),
    ).filter((name): name is string => Boolean(name && !isGenericPlanSegmentLabel(name))) ?? [];

  if (poiNames.length >= 2) {
    return `${poiNames[0]} → ${poiNames[poiNames.length - 1]}`;
  }
  if (poiNames.length === 1) return poiNames[0];

  if (day.date) {
    try {
      const d = new Date(day.date);
      if (!isNaN(d.getTime())) {
        return `第 ${dayIndex + 1} 天 · ${d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

/** 时间轴当天 POI/活动名（用于预览副列表） */
export function getTripDayPoiNames(
  trip: TripDetail | null | undefined,
  dayIndex: number,
): string[] {
  const day = trip?.TripDay?.[dayIndex];
  if (!day?.ItineraryItem?.length) return [];
  return day.ItineraryItem.map(
    (item) => item.Place?.nameCN || item.Place?.nameEN || item.note?.trim() || '',
  ).filter((name) => Boolean(name) && !isGenericPlanSegmentLabel(name));
}

/** segment.metadata.stops 优先，其次 attractions/restaurants/accommodation，否则时间轴 POI */
export function getSegmentPreviewStops(
  segment: PlanSegmentLike,
  trip: TripDetail | null | undefined,
  dayIndex: number,
): string[] {
  const fromMeta =
    segment.metadata?.stops
      ?.map((s) => s.trim())
      .filter((s) => Boolean(s) && !isGenericPlanSegmentLabel(s)) ?? [];
  if (fromMeta.length > 0) return fromMeta;

  const structured = collectStructuredSegmentStops(segment.metadata);
  if (structured.length > 0) return structured;

  return getTripDayPoiNames(trip, dayIndex);
}

/** 预览标题：segment.metadata.name，无则时间轴兜底 */
export function formatPlanSegmentLabel(
  segment: PlanSegmentLike,
  trip: TripDetail | null | undefined,
  dayIndex: number,
): string {
  const metaName = segment.metadata?.name?.trim();
  if (metaName && !isGenericPlanSegmentLabel(metaName)) {
    return metaName;
  }

  const raw = readSegmentDisplayName(segment);
  if (raw && !isGenericPlanSegmentLabel(raw)) {
    return raw;
  }

  const fromTimeline = resolveTripDayPreviewLabel(trip, dayIndex);
  if (fromTimeline) return fromTimeline;

  return `第 ${dayIndex + 1} 天行程`;
}

/** 从 presentation 提取 CHOOSE 选项（勿读 nextSteps） */
export function extractChooseOptionsFromPresentation(
  presentation: GuardianPersonaPresentation | null | undefined,
): string[] {
  if (!presentation) return [];
  if (isHardConstraintBlock(presentation)) return [];
  return extractPresentationChooseOptions(presentation);
}

/** 从 execute 响应提取 CHOOSE 选项 */
export function extractWorkbenchChooseOptions(
  result: ExecutePlanningWorkbenchResponse | null,
): string[] {
  if (!result?.uiOutput.presentation) return [];
  return extractChooseOptionsFromPresentation(result.uiOutput.presentation);
}

/** presentation.hardConstraintBlocked 或 Abu 硬阻断 */
export function isWorkbenchHardBlocked(
  result: ExecutePlanningWorkbenchResponse | null,
): boolean {
  const presentation = result?.uiOutput.presentation;
  return Boolean(presentation && isHardConstraintBlock(presentation));
}

/** actions.user === CHOOSE 且已有 ≥2 条真实选项（后端 enrich 契约） */
export function isWorkbenchChooseActive(
  result: ExecutePlanningWorkbenchResponse | null,
): boolean {
  if (!result?.uiOutput.presentation) return false;
  if (isWorkbenchHardBlocked(result)) return false;
  if (result.uiOutput.presentation.actions.user !== 'CHOOSE') return false;
  return extractWorkbenchChooseOptions(result).length >= WORKBENCH_MIN_CHOOSE_OPTIONS;
}

export type WorkbenchSubmitBlockReason =
  | 'hard_block'
  | 'reject'
  | 'choose_pending'
  | 'confirm_pending';

/**
 * 提交门禁（与后端 enrich 对齐）：
 * hardConstraintBlocked → 禁用
 * CHOOSE + ≥2 选项 → 选完并 regenerate 后才可提交
 * NEED_CONFIRM + confirmations → 勾选后才可提交
 */
export function resolveWorkbenchSubmitBlocked(
  result: ExecutePlanningWorkbenchResponse | null,
  opts: {
    confirmationCount: number;
    allConfirmationsChecked: boolean;
  },
): { blocked: boolean; reason: WorkbenchSubmitBlockReason | null } {
  if (!result) return { blocked: true, reason: null };

  if (isWorkbenchHardBlocked(result)) {
    return { blocked: true, reason: 'hard_block' };
  }

  const gate = resolveEffectiveWorkbenchGate(result);
  if (gate === 'REJECT') {
    return { blocked: true, reason: 'reject' };
  }

  if (isWorkbenchChooseActive(result)) {
    return { blocked: true, reason: 'choose_pending' };
  }

  if (gate === 'NEED_CONFIRM' && !opts.allConfirmationsChecked) {
    return { blocked: true, reason: 'confirm_pending' };
  }

  return { blocked: false, reason: null };
}

export type PlanSegmentMetadata = {
  name?: string;
  fromName?: string;
  toName?: string;
  stops?: string[];
  attractions?: string[];
  restaurants?: string[];
  accommodation?: string | string[];
};

function collectStructuredSegmentStops(meta: PlanSegmentMetadata | undefined): string[] {
  if (!meta) return [];
  const out: string[] = [];
  const pushNames = (value?: string | string[]) => {
    const list = value == null ? [] : Array.isArray(value) ? value : [value];
    for (const name of list) {
      const trimmed = name?.trim();
      if (trimmed && !isGenericPlanSegmentLabel(trimmed)) out.push(trimmed);
    }
  };
  pushNames(meta.attractions);
  pushNames(meta.restaurants);
  pushNames(meta.accommodation);
  return out;
}

export type PlanSegmentLike = {
  segmentId?: string;
  dayIndex?: number;
  distanceKm?: number;
  metadata?: PlanSegmentMetadata;
  name?: string;
  placeName?: string;
  title?: string;
  fromName?: string;
  toName?: string;
  originName?: string;
  destinationName?: string;
};

function readSegmentDisplayName(segment: PlanSegmentLike): string | undefined {
  const meta = segment.metadata;
  if (meta?.name?.trim()) return meta.name.trim();
  if (meta?.fromName?.trim() && meta?.toName?.trim()) {
    return `${meta.fromName.trim()} → ${meta.toName.trim()}`;
  }
  if (meta?.fromName?.trim()) return meta.fromName.trim();
  if (meta?.toName?.trim()) return meta.toName.trim();

  const topLevel =
    segment.name ||
    segment.placeName ||
    segment.title ||
    (segment.fromName && segment.toName
      ? `${segment.fromName} → ${segment.toName}`
      : undefined) ||
    (segment.originName && segment.destinationName
      ? `${segment.originName} → ${segment.destinationName}`
      : undefined);

  if (typeof topLevel === 'string' && topLevel.trim()) {
    return topLevel.trim();
  }
  return undefined;
}

/** 从 planState 解析可展示的行程项（含 route segments 骨架） */
export function extractPlanItems(planState: unknown): unknown[] {
  if (!planState || typeof planState !== 'object') return [];
  const itinerary = (planState as { itinerary?: unknown }).itinerary;
  if (!itinerary) return [];

  if (Array.isArray(itinerary)) return itinerary;

  if (typeof itinerary === 'object' && itinerary !== null) {
    const record = itinerary as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.days)) {
      return (record.days as Array<{ items?: unknown[] }>).flatMap((day) => day.items ?? []);
    }
    if (Array.isArray(record.segments)) return record.segments;
  }

  return [];
}

export function countPlanSegmentDays(planState: unknown): number | null {
  const items = extractPlanItems(planState);
  if (items.length === 0) return null;
  const dayIndexes = new Set<number>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const dayIndex = (item as { dayIndex?: number }).dayIndex;
    if (typeof dayIndex === 'number') dayIndexes.add(dayIndex);
  }
  return dayIndexes.size > 0 ? dayIndexes.size : null;
}

export function resolveEffectiveWorkbenchGate(
  result: ExecutePlanningWorkbenchResponse | null,
): GateStatus | null {
  if (!result?.uiOutput.consolidatedDecision?.status) return null;
  const normalized = normalizeGateStatus(result.uiOutput.consolidatedDecision.status);
  const presentation = result.uiOutput.presentation;
  if (presentation && isHardConstraintBlock(presentation)) {
    return 'REJECT';
  }
  return normalized;
}

/** nextSteps / confirmations 中的流程指引，不可作为勾选项或横幅正文 */
function isWorkbenchMetaInstructionText(text: string): boolean {
  const t = text.trim();
  return (
    /请在上方的决策点中选择/i.test(t) ||
    /请在.*选择.*后继续/i.test(t) ||
    /请先.*选择.*方案/i.test(t) ||
    /请阅读确认点/i.test(t) ||
    /请.*勾选.*后继续/i.test(t) ||
    /请在下方的确认点/i.test(t) ||
    /请先在.*确认点/i.test(t) ||
    /^请确认后继续$/i.test(t.trim()) ||
    /^勾选全部确认项$/i.test(t) ||
    /^确认后点击提交/i.test(t) ||
    /^确认无误后点击提交/i.test(t) ||
    /^在决策卡片中选择/i.test(t) ||
    /^完成选择后点击提交/i.test(t)
  );
}

/** NEED_CONFIRM 签收项：直接渲染 uiOutput.confirmations[]（问句 checkbox） */
export function resolveWorkbenchConfirmationItems(
  result: ExecutePlanningWorkbenchResponse | null,
): string[] {
  if (!result) return [];

  const riskExplanation = resolveWorkbenchRiskExplanation(result);
  const seen = new Set<string>();
  const merged: string[] = [];
  const pushOne = (s?: string) => {
    const t = humanizeWorkbenchDisplayText(s);
    if (!t || seen.has(t) || isWorkbenchMetaInstructionText(t)) return;
    if (riskExplanation && isDuplicateWorkbenchText(t, riskExplanation)) return;
    seen.add(t);
    merged.push(t);
  };
  const pushMany = (xs?: string[]) => xs?.forEach(pushOne);

  pushMany(result.uiOutput.confirmations);

  return merged;
}

const BUDGET_BAND_LABEL: Record<string, string> = {
  healthy: '预算充足',
  warning: '预算偏紧',
  critical: '预算超支风险',
};

/** 展示 execute enrich 的 budgetPreview */
export function formatWorkbenchBudgetPreviewLine(
  preview: WorkbenchBudgetPreview | null | undefined,
  currencyFallback = 'CNY',
): string | null {
  if (!preview) return null;
  if (preview.message?.trim()) return preview.message.trim();
  const parts: string[] = [];
  if (typeof preview.totalEstimate === 'number') {
    const cur = preview.currency || currencyFallback;
    parts.push(`预估 ${preview.totalEstimate.toLocaleString('zh-CN')} ${cur}`);
  }
  if (typeof preview.vsLimit === 'number') {
    parts.push(`占预算 ${(preview.vsLimit * 100).toFixed(0)}%`);
  }
  if (preview.band && BUDGET_BAND_LABEL[preview.band]) {
    parts.push(BUDGET_BAND_LABEL[preview.band]);
  }
  if (preview.evaluated === false) {
    parts.push('详细评估加载中');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface WorkbenchGuidance {
  tone: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  primaryAction?: 'submit' | 'confirm' | 'adjust' | 'constraints' | 'choose';
  secondaryAction?: 'adjust' | 'constraints';
}

function resolveRejectDescription(
  result: ExecutePlanningWorkbenchResponse,
  hardBlock: boolean,
): string {
  const presentation = result.uiOutput.presentation;
  if (hardBlock && presentation) {
    const narrative = humanizeWorkbenchDisplayText(presentation.narrative?.replace(/^🐾\s*/, ''));
    if (narrative) return narrative;
    const headline = humanizeWorkbenchDisplayText(presentation.headline);
    if (headline) return headline;
  }
  const summary = resolveWorkbenchRiskExplanation(result);
  if (summary) return summary;
  return '方案存在必须处理的硬违规。请先调整方案，或返回完善行程约束后再生成。';
}

export function getWorkbenchGuidance(
  result: ExecutePlanningWorkbenchResponse | null,
  opts: {
    submitBlockedByGate: boolean;
    planItemCount: number;
    choosePending?: boolean;
  },
): WorkbenchGuidance | null {
  if (!result) return null;
  const gate = resolveEffectiveWorkbenchGate(result);
  const hardBlock = isWorkbenchHardBlocked(result);
  const chooseRequired = isWorkbenchChooseActive(result);
  const confirmNextSteps = result.uiOutput.consolidatedDecision?.nextSteps
    ?.map((step) => step.trim())
    .filter((step) => Boolean(step) && !isWorkbenchMetaInstructionText(step))
    .map((step) => humanizeWorkbenchDisplayText(step))
    .filter(Boolean)
    .join(' ');

  if (gate === 'REJECT' || hardBlock) {
    return {
      tone: 'danger',
      title: '暂无法提交到时间轴',
      description: resolveRejectDescription(result, hardBlock),
      primaryAction: 'adjust',
      secondaryAction: 'constraints',
    };
  }

  if (chooseRequired || opts.choosePending) {
    return {
      tone: 'warning',
      title: '需要您做一个选择',
      description: opts.choosePending
        ? confirmNextSteps || '请在上方的决策点中选择一项并确认，完成后才能提交到时间轴。'
        : result.uiOutput.presentation?.headline ||
          confirmNextSteps ||
          '请在下方选择您的取舍，系统将根据您的选择继续。',
      primaryAction: opts.choosePending ? undefined : 'choose',
    };
  }

  if (gate === 'NEED_CONFIRM') {
    const risk = resolveWorkbenchRiskExplanation(result);
    return {
      tone: 'warning',
      title: opts.submitBlockedByGate ? '提交前请先确认风险' : '需要您确认风险',
      description: risk
        ? '请先阅读下方「风险说明」，勾选「签收确认」后再提交到时间轴。'
        : '请在下方勾选全部签收确认项后再提交到时间轴。',
      primaryAction: 'confirm',
    };
  }

  if (gate === 'SUGGEST_REPLACE') {
    return {
      tone: 'info',
      title: '建议先调整再提交',
      description: resolveWorkbenchRiskExplanation(result) || '系统建议考虑替代方案后再提交。',
      primaryAction: 'adjust',
    };
  }

  if (opts.planItemCount === 0) {
    return {
      tone: 'info',
      title: '方案骨架已生成',
      description: '当前还没有具体行程项。可先「调整方案」补充内容，或直接提交后在时间轴继续编辑。',
      primaryAction: 'adjust',
    };
  }

  if (gate === 'ALLOW') {
    return {
      tone: 'success',
      title: '可以提交到时间轴',
      description:
        resolveWorkbenchRiskExplanation(result) ||
        '三人格评估通过，确认后即可写入您的行程。',
      primaryAction: 'submit',
    };
  }

  return null;
}

/** §4 契约：签收问句（uiOutput.confirmations[]，legacy 时 gate/persona 兜底） */
export function getWorkbenchSignOffs(
  result: ExecutePlanningWorkbenchResponse | null,
): string[] {
  return resolveWorkbenchConfirmationItems(result);
}

/** §4 契约：NEED_CONFIRM 且存在可勾选签收项 */
export function isWorkbenchSignOffRequired(
  result: ExecutePlanningWorkbenchResponse | null,
): boolean {
  const gate = resolveEffectiveWorkbenchGate(result);
  return gate === 'NEED_CONFIRM' && getWorkbenchSignOffs(result).length >= 1;
}

/** §4 契约：有效 CHOOSE（≥2 选项） */
export function isWorkbenchChooseRequired(
  result: ExecutePlanningWorkbenchResponse | null,
): boolean {
  return isWorkbenchChooseActive(result);
}

function readPlanStateMetadataString(
  metadata: unknown,
  key: string,
): string | undefined {
  const value = (metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** 推荐骨架 optionId（metadata / comparison） */
export function resolveWorkbenchRecommendedOptionId(
  result: ExecutePlanningWorkbenchResponse | null,
): string | undefined {
  if (!result) return undefined;

  const fromMeta = readPlanStateMetadataString(result.planState?.metadata, 'recommendedOptionId');
  if (fromMeta) return fromMeta;

  const comparison = pickOptionComparisonFromResult(result);
  return (
    comparison?.recommendation?.optionId ??
    comparison?.kernelGateEval?.recommendedByGate ??
    undefined
  );
}

/** CHOOSE 文案 → comparison optionId（多方案 commit 用） */
export function mapWorkbenchChooseToOptionId(
  result: ExecutePlanningWorkbenchResponse | null,
  selectedIndex: number,
  selectedText: string,
): string | undefined {
  if (!result) return undefined;

  const comparison = pickOptionComparisonFromResult(result);
  const options = comparison?.options ?? [];
  if (options.length === 0) return undefined;

  const chooseOptions = extractWorkbenchChooseOptions(result);
  const idx =
    selectedIndex >= 0 && selectedIndex < chooseOptions.length
      ? selectedIndex
      : chooseOptions.indexOf(selectedText);

  if (idx >= 0 && idx < options.length) {
    return options[idx]?.optionId;
  }

  const trimmed = selectedText.trim();
  const byText = options.find(
    (entry) =>
      entry.optionId === trimmed ||
      entry.summary?.trim() === trimmed ||
      entry.summary?.includes(trimmed),
  );
  return byText?.optionId;
}

/**
 * commit 时 selectedOptionId：
 * - 多方案且用户显式选择 → 必传（含非推荐项）
 * - 单方案 → 推荐项或唯一 optionId
 */
export function resolveWorkbenchCommitSelectedOptionId(
  result: ExecutePlanningWorkbenchResponse | null,
  userSelectedOptionId?: string | null,
): string | undefined {
  if (!result) return undefined;

  const comparison = pickOptionComparisonFromResult(result);
  const optionCount = comparison?.options?.length ?? 0;
  const recommended = resolveWorkbenchRecommendedOptionId(result);

  const explicit =
    userSelectedOptionId?.trim() ||
    readPlanStateMetadataString(result.planState?.metadata, 'selectedOptionId') ||
    readPlanStateMetadataString(result.planState?.metadata, 'userSelectedOptionId');

  if (explicit) return explicit;

  if (optionCount < 2) {
    return recommended ?? comparison?.options?.[0]?.optionId;
  }

  // 多方案且未 CHOOSE：后端从 metadata 取推荐项，commit 不必传 selectedOptionId
  return undefined;
}
