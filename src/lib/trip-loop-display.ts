/**
 * 行前 Plan Validation 展示文案：不用「准备度」心智，统一为可执行性。
 * 后端 Loop ui 仍可能返回 readinessScore / 「准备度」文案，C 端在此归一化。
 */
import { tripLoopPhaseLabel } from '@/lib/trip-loop.adapter';
import type { TripLoopChecklistItem, TripLoopUiView } from '@/types/trip-loop';

export const PLAN_VALIDATION_SCORE_LABEL = '可执行性分数';

/** 可执行性综合分低于此值时，completed 不用「验证通过」成功心智 */
export const LOOP_LOW_FEASIBILITY_SCORE = 60;

export type LoopValidationCompletedTone = 'success' | 'caution';

export interface LoopValidationPresentation {
  headline: string;
  subheadline: string | null;
  phaseLabel: string;
  completedTone: LoopValidationCompletedTone;
}

/** 将后端 subheadline 等中的「准备度」替换为产品用语 */
export function sanitizePlanValidationCopy(text: string | null | undefined): string | null {
  if (text == null || !String(text).trim()) return text ?? null;
  return String(text).replace(/准备度/g, '可执行性');
}

function pickSnapshot(ui: TripLoopUiView): ReadinessSnapshot | undefined {
  return ui.snapshot?.after ?? ui.snapshot?.before;
}

export function readinessSnapshotsEqual(
  a: ReadinessSnapshot,
  b: ReadinessSnapshot,
): boolean {
  return (
    a.readinessScore === b.readinessScore &&
    a.hardBlockers === b.hardBlockers &&
    a.mustHandleCount === b.mustHandleCount &&
    a.suggestAdjustCount === b.suggestAdjustCount &&
    a.canStartExecute === b.canStartExecute &&
    a.verdictStatus === b.verdictStatus
  );
}

export function loopSnapshotHasPreviewDelta(ui: TripLoopUiView): boolean {
  const { before, after } = ui.snapshot ?? {};
  if (!before || !after) return false;
  return !readinessSnapshotsEqual(before, after);
}

export function loopValidationNeedsFollowUp(ui: TripLoopUiView): boolean {
  if (ui.phase !== 'completed') return false;
  const snapshot = pickSnapshot(ui);
  if (!snapshot) return false;

  return (
    snapshot.mustHandleCount > 0 ||
    snapshot.suggestAdjustCount > 0 ||
    snapshot.readinessScore < LOOP_LOW_FEASIBILITY_SCORE ||
    !snapshot.canStartExecute
  );
}

/**
 * 是否应展示「验证进行中」动效（run/apply 或后端 phase=validating 且进度未完成）。
 * 仅 restore 到的 stale validating（无进行中的 run）不应无限转圈。
 */
export function isLoopValidationInFlight(
  ui: TripLoopUiView | null | undefined,
  running: boolean,
  applying: boolean,
): boolean {
  if (running || applying) return true;
  if (ui?.phase !== 'validating') return false;
  const { totalChecks, completedChecks } = ui.progress;
  if (totalChecks <= 0) return false;
  return completedChecks < totalChecks;
}

function buildSnapshotSubline(snapshot: ReadinessSnapshot): string {
  const parts: string[] = [`可执行性 ${snapshot.readinessScore}`];
  if (snapshot.mustHandleCount > 0) {
    parts.push(`必处理 ${snapshot.mustHandleCount} 项`);
  }
  if (snapshot.suggestAdjustCount > 0) {
    parts.push(`建议优化 ${snapshot.suggestAdjustCount} 项`);
  }
  if (!snapshot.canStartExecute) {
    parts.push('尚不可出发');
  }
  return parts.join(' · ');
}

function resolveCompletedHeadline(snapshot: ReadinessSnapshot): string {
  if (snapshot.mustHandleCount > 0) {
    return `验证完成：仍有 ${snapshot.mustHandleCount} 项必处理`;
  }
  if (snapshot.suggestAdjustCount > 0) {
    return `验证完成：无硬阻断，仍有 ${snapshot.suggestAdjustCount} 项建议优化`;
  }
  if (snapshot.readinessScore < LOOP_LOW_FEASIBILITY_SCORE) {
    return '验证完成：可执行性仍偏低';
  }
  if (!snapshot.canStartExecute) {
    return '验证完成：仍建议继续优化后再出发';
  }
  return '验证完成：仍建议继续优化';
}

export function loopChecklistResultCounts(ui: TripLoopUiView): {
  passed: number;
  pending: number;
  failed: number;
  deferred: number;
} {
  const counts = { passed: 0, pending: 0, failed: 0, deferred: 0 };
  for (const item of ui.checklist) {
    if (item.result === 'passed') counts.passed += 1;
    else if (item.result === 'pending') counts.pending += 1;
    else if (item.result === 'failed') counts.failed += 1;
    else if (item.result === 'deferred') counts.deferred += 1;
  }
  return counts;
}

export function loopChecklistHasOpenItems(ui: TripLoopUiView): boolean {
  const counts = loopChecklistResultCounts(ui);
  return counts.pending > 0 || counts.failed > 0;
}

/** completed 阶段进度文案：避免「五项全绿」误导 */
export function resolveLoopProgressLabel(ui: TripLoopUiView): string {
  if (ui.checklist.length === 0) return ui.progress.label;

  const counts = loopChecklistResultCounts(ui);
  if (ui.phase === 'completed' && loopChecklistHasOpenItems(ui)) {
    const settled = counts.passed + counts.deferred;
    const parts = [`${settled}/${ui.checklist.length} 项已达标`];
    if (counts.pending > 0) parts.push(`${counts.pending} 项待处理`);
    if (counts.failed > 0) parts.push(`${counts.failed} 项未通过`);
    if (counts.deferred > 0) parts.push(`${counts.deferred} 项稍后复查`);
    return parts.join(' · ');
  }

  return ui.progress.label || `检查进度 ${ui.progress.completedChecks}/${ui.progress.totalChecks}`;
}

function buildChecklistFollowUpLine(ui: TripLoopUiView): string | null {
  if (ui.phase !== 'completed' || !loopChecklistHasOpenItems(ui)) return null;
  const open = ui.checklist
    .filter((item) => item.result === 'pending' || item.result === 'failed')
    .map((item) => item.label)
    .slice(0, 3);
  if (open.length === 0) return null;
  return `检查清单仍有待办：${open.join('、')}（闭环已结束，无硬阻断）`;
}

const PASSED_VALIDATION_HEADLINE = /已通过验证|验证通过/;

/**
 * 将后端 Loop ui 映射为用户可理解的验证结论。
 * completed + 低分/建议项 ≠ 「方案已通过验证」。
 */
export function resolveLoopValidationPresentation(ui: TripLoopUiView): LoopValidationPresentation {
  const needsFollowUp = loopValidationNeedsFollowUp(ui);
  const snapshot = pickSnapshot(ui);

  let headline = ui.headline;
  let subheadline = sanitizePlanValidationCopy(ui.subheadline);
  let phaseLabel = tripLoopPhaseLabel(ui.phase);
  let completedTone: LoopValidationCompletedTone = 'success';

  const snapshotPair = ui.snapshot;
  if (snapshotPair && readinessSnapshotsEqual(snapshotPair.before, snapshotPair.after)) {
    const current = snapshotPair.after;
    if (subheadline?.includes('->') || subheadline?.includes('→')) {
      subheadline = buildSnapshotSubline(current);
    }
  }

  if (ui.phase === 'completed' && needsFollowUp) {
    completedTone = 'caution';
    phaseLabel = '待优化';
    if (PASSED_VALIDATION_HEADLINE.test(headline) && snapshot) {
      headline = resolveCompletedHeadline(snapshot);
    }
    if (snapshot) {
      subheadline = buildSnapshotSubline(snapshot);
    }
  }

  const checklistLine = buildChecklistFollowUpLine(ui);
  if (checklistLine) {
    subheadline = subheadline ? `${subheadline}。${checklistLine}` : checklistLine;
    if (ui.phase === 'completed' && !needsFollowUp) {
      completedTone = 'caution';
      phaseLabel = '待复查';
    }
  }

  return {
    headline,
    subheadline,
    phaseLabel,
    completedTone,
  };
}
