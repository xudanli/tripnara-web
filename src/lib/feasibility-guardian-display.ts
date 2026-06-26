import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import type { PreviewRepairResponse } from '@/types/feasibility-repair';
import type {
  GuardianNegotiationResult,
  GuardianNegotiationScope,
} from '@/types/readiness-guardian-negotiation';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

export type FeasibilityGuardianDisplayMode = 'hidden' | 'summary' | 'full';

/** @deprecated 使用 resolveFeasibilityGuardianPresentation().title */
export const FEASIBILITY_GUARDIAN_PANEL_TITLE = '此修复方案的守护者评议';

const LIGHT_REPAIR_ACTIONS = new Set([
  'manual_confirm',
  'fetch_weather',
  'check_road',
  'check_hours',
  'book_transport',
  'buy_insurance',
]);

export interface FeasibilityGuardianPresentation {
  scope: GuardianNegotiationScope;
  title: string;
  scopeBadge: string;
  contextHint: string;
  /** 当前所选修复方案（与行程合议区分） */
  repairFocusLabel?: string;
}

function isRepairDeferred(preview?: PreviewRepairResponse | null, deferred?: boolean): boolean {
  if (deferred) return true;
  if (!preview) return false;
  return preview.wouldDefer === true || preview.status === 'would_defer';
}

/** 补住宿、纯确认等轻量修复 — 不必展开三人卡片 */
export function isLightGuardianRepair(
  issue?: FeasibilityIssueDto | null,
  preview?: PreviewRepairResponse | null,
): boolean {
  const actionType = preview?.actionType ?? preview?.option?.actionType;
  if (actionType && LIGHT_REPAIR_ACTIONS.has(actionType)) return true;

  if (actionType === 'change_hotel' && issue?.priority === 'suggest_adjust') {
    const text = `${issue.title} ${issue.message} ${issue.actionRequired ?? ''}`;
    if (/缺住宿|尚未安排|补.*住宿|添加.*住宿/i.test(text)) return true;
  }

  if (issue?.priority === 'pending_confirm' && actionType === 'manual_confirm') {
    return true;
  }

  return false;
}

function inferGuardianScope(input: {
  issue?: FeasibilityIssueDto | null;
  preview?: PreviewRepairResponse | null;
  guardian?: GuardianNegotiationResult | null;
}): GuardianNegotiationScope {
  if (input.guardian?.scope) return input.guardian.scope;

  const actionType = input.preview?.actionType ?? input.preview?.option?.actionType;
  if (isPlanClassAction(actionType) && !isLightGuardianRepair(input.issue, input.preview)) {
    return 'repair';
  }

  // 可执行证明里多数 guardianNegotiation 为整趟行程读模型，轻量修复尤甚
  return 'trip';
}

function pickRepairFocusLabel(preview?: PreviewRepairResponse | null): string | undefined {
  const label = preview?.option?.label?.trim();
  if (label) return label;
  const message = preview?.message?.trim();
  if (message && message.length <= 48) return message;
  return undefined;
}

export function resolveFeasibilityGuardianPresentation(input: {
  issue?: FeasibilityIssueDto | null;
  preview?: PreviewRepairResponse | null;
  guardian?: GuardianNegotiationResult | null;
}): FeasibilityGuardianPresentation {
  const scope = inferGuardianScope(input);
  const repairFocusLabel = pickRepairFocusLabel(input.preview);
  const dayNumber = input.issue?.affectedDays?.[0];

  if (scope === 'repair') {
    return {
      scope,
      title: '本方案 · 三人格评议',
      scopeBadge: '当前方案',
      contextHint: repairFocusLabel
        ? `针对「${repairFocusLabel}」的结构调整，三位守护者分工评议。`
        : '针对当前所选修复方案的分工评议。',
      repairFocusLabel,
    };
  }

  if (scope === 'day') {
    return {
      scope,
      title: dayNumber != null ? `第 ${dayNumber} 天 · 三人格合议` : '当日行程 · 三人格合议',
      scopeBadge: dayNumber != null ? `第 ${dayNumber} 天` : '当日',
      contextHint: repairFocusLabel
        ? `你正在处理「${repairFocusLabel}」；下方合议面向当天整体，可能涉及安全、节奏等多维考量。`
        : '以下观点面向当天整体安排，可能超出当前单条修复。',
      repairFocusLabel,
    };
  }

  return {
    scope: 'trip',
    title: '整趟行程 · 三人格合议',
    scopeBadge: '整趟行程',
    contextHint: repairFocusLabel
      ? `你正在处理「${repairFocusLabel}」；下方为整趟行程背景下的合议，不等同于仅评此单条操作。`
      : '以下观点面向整趟行程背景，涵盖安全、节奏与结构调整等维度。',
    repairFocusLabel,
  };
}

export function resolveFeasibilityGuardianDisplayMode(input: {
  issue?: FeasibilityIssueDto | null;
  preview?: PreviewRepairResponse | null;
  guardian?: GuardianNegotiationResult | null;
  deferred?: boolean;
}): FeasibilityGuardianDisplayMode {
  const { issue, preview, guardian, deferred } = input;
  if (!guardian?.personas?.length) return 'hidden';

  const repairDeferred = isRepairDeferred(preview, deferred);
  const consensus = guardian.consensus;
  const actionType = preview?.actionType ?? preview?.option?.actionType;

  if (repairDeferred || consensus === 'BLOCKED' || consensus === 'SPLIT') {
    return 'full';
  }

  if (preview?.previewMode === 'decision_engine_dry_run') {
    return 'full';
  }

  if (isPlanClassAction(actionType)) {
    return 'full';
  }

  if (isLightGuardianRepair(issue, preview)) {
    return 'hidden';
  }

  if (consensus === 'ALIGNED' || consensus == null) {
    return 'summary';
  }

  return 'full';
}

export function feasibilityGuardianSummaryLine(
  guardian: GuardianNegotiationResult,
  presentation?: FeasibilityGuardianPresentation,
): string {
  if (guardian.summary?.trim()) return guardian.summary.trim();
  if (presentation?.scope === 'trip') {
    if (guardian.consensus === 'ALIGNED') {
      return '三位守护者对整趟行程方向已对齐；当前单条修复可按需继续。';
    }
    return '展开查看整趟行程下的安全 / 节奏 / 结构分工观点。';
  }
  if (guardian.consensus === 'ALIGNED') {
    return '三位守护者对此修复方向已对齐，可继续确认应用。';
  }
  return '查看守护者分工评议。';
}
