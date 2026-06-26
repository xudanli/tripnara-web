import type {
  DecisionStripPrimaryCta,
  DecisionStripState,
} from '@/lib/decision-strip-model';
import type { TripLoopUiPhase, TripLoopUiView } from '@/types/trip-loop';
import { sanitizePlanValidationCopy, resolveLoopValidationPresentation } from '@/lib/trip-loop-display';

export type DecisionStripVerifyStepStatus = 'pending' | 'active' | 'done' | 'failed';

export interface DecisionStripLoopValidationView {
  /** 在 Strip 中展示「可执行性验证」步 */
  active: boolean;
  phase: TripLoopUiPhase | 'posting';
  verifyStepStatus: DecisionStripVerifyStepStatus;
  headline: string;
  subline: string | null;
  progressPct: number | null;
  progressLabel: string | null;
  state: DecisionStripState;
  primaryCta: DecisionStripPrimaryCta;
  /** completed 且仍有建议项/低分时用 caution，避免「验证通过」绿勾误导 */
  verifyTone?: 'success' | 'caution';
  /** @deprecated 行前 Strip 不展示数字分；保留字段供调试 */
  readinessScore: number | null;
  issueCount: number;
}

function progressPct(ui: TripLoopUiView | null | undefined): number | null {
  if (!ui?.progress?.totalChecks) return null;
  const { completedChecks, totalChecks } = ui.progress;
  return Math.round((completedChecks / totalChecks) * 100);
}

/**
 * 将 Loop ui.phase 映射为 Decision Strip「验证」步展示。
 * C 端只读 ui，不用 runtimeState。
 */
export function resolveDecisionStripLoopValidation(input: {
  ui: TripLoopUiView | null;
  loopRunning: boolean;
  loopApplying: boolean;
}): DecisionStripLoopValidationView | null {
  const { ui, loopRunning, loopApplying } = input;

  if (loopRunning || loopApplying) {
    return {
      active: true,
      phase: 'posting',
      verifyStepStatus: 'active',
      headline: ui?.headline ?? (loopApplying ? '正在应用调整…' : '正在验证方案可执行性…'),
      subline: sanitizePlanValidationCopy(ui?.progress?.label ?? ui?.subheadline ?? null),
      progressPct: progressPct(ui),
      progressLabel: ui?.progress?.label ?? null,
      state: 'running',
      primaryCta: {
        type: 'open_feasibility',
        labelOverride: loopApplying ? '应用中…' : '查看验证进度',
      },
      readinessScore: null,
      issueCount: ui?.issueCards?.length ?? 0,
    };
  }

  if (!ui) return null;

  const subline = (raw: string | null | undefined) => sanitizePlanValidationCopy(raw);

  switch (ui.phase) {
    case 'validating':
      return {
        active: true,
        phase: 'validating',
        verifyStepStatus: 'active',
        headline: ui.headline,
        subline: subline(ui.subheadline) ?? ui.progress.label ?? null,
        progressPct: progressPct(ui),
        progressLabel: ui.progress.label,
        state: 'running',
        primaryCta: {
          type: 'open_feasibility',
          labelOverride: '查看验证进度',
        },
        readinessScore: null,
        issueCount: ui.issueCards.length,
      };

    case 'issues_found':
      return {
        active: true,
        phase: 'issues_found',
        verifyStepStatus: 'active',
        headline: ui.headline,
        subline: subline(ui.subheadline) ?? ui.progress.label ?? null,
        progressPct: progressPct(ui),
        progressLabel: ui.progress.label,
        state: 'blocked',
        primaryCta: {
          type: 'open_feasibility',
          labelOverride: ui.primaryAction?.label ?? '查看问题',
        },
        readinessScore: null,
        issueCount: ui.issueCards.length,
      };

    case 'awaiting_approval':
      return {
        active: true,
        phase: 'awaiting_approval',
        verifyStepStatus: 'active',
        headline: ui.headline,
        subline: subline(ui.subheadline),
        progressPct: progressPct(ui),
        progressLabel: ui.progress.label,
        state: 'blocked',
        primaryCta: {
          type: 'open_feasibility',
          labelOverride: ui.primaryAction?.label ?? '采用推荐调整',
        },
        readinessScore: null,
        issueCount: ui.issueCards.length,
      };

    case 'completed': {
      const presentation = resolveLoopValidationPresentation(ui);
      const caution = presentation.completedTone === 'caution';
      return {
        active: true,
        phase: 'completed',
        verifyStepStatus: 'done',
        headline: presentation.headline,
        subline: presentation.subheadline,
        progressPct: 100,
        progressLabel: ui.progress.label,
        state: caution ? 'blocked' : 'conclusion',
        verifyTone: presentation.completedTone,
        primaryCta: {
          type: 'open_feasibility',
          labelOverride: caution ? '查看待优化项' : '查看验证结果',
        },
        readinessScore: null,
        issueCount: ui.issueCards.length,
      };
    }

    case 'failed':
      return {
        active: true,
        phase: 'failed',
        verifyStepStatus: 'failed',
        headline: ui.headline,
        subline: subline(ui.subheadline),
        progressPct: progressPct(ui),
        progressLabel: ui.progress.label,
        state: 'error',
        primaryCta: {
          type: 'open_feasibility',
          labelOverride: '重新检查',
        },
        readinessScore: null,
        issueCount: ui.issueCards.length,
      };

    default:
      return null;
  }
}

/** 编排链在 VERIFY 步且 Loop 有 ui 时，用 Loop 进度增强 VERIFY 展示 */
export function shouldEnhanceOrchestrationVerifyStep(input: {
  taskPhase: string;
  loopValidation: DecisionStripLoopValidationView | null;
}): boolean {
  if (!input.loopValidation?.active) return false;
  const phase = input.taskPhase.trim().toUpperCase();
  return phase.includes('VERIFY') || phase.includes('REPAIR');
}
