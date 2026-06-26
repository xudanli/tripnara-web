import { describe, expect, it } from 'vitest';
import {
  loopValidationNeedsFollowUp,
  readinessSnapshotsEqual,
  resolveLoopValidationPresentation,
} from '@/lib/trip-loop-display';
import type { TripLoopUiView } from '@/types/trip-loop';

function baseUi(overrides: Partial<TripLoopUiView> = {}): TripLoopUiView {
  return {
    phase: 'completed',
    headline: '方案已通过验证',
    subheadline: '准备度 43 -> 43 · 必处理 0 项',
    progress: { completedChecks: 5, totalChecks: 5, label: '已完成 5/5 项检查' },
    checklist: [],
    issueCards: [],
    snapshot: {
      before: {
        readinessScore: 43,
        hardBlockers: 0,
        mustHandleCount: 0,
        suggestAdjustCount: 17,
        canStartExecute: false,
        verdictStatus: 'ADJUST_REQUIRED',
      },
      after: {
        readinessScore: 43,
        hardBlockers: 0,
        mustHandleCount: 0,
        suggestAdjustCount: 17,
        canStartExecute: false,
        verdictStatus: 'ADJUST_REQUIRED',
      },
    },
    ...overrides,
  };
}

describe('resolveLoopValidationPresentation', () => {
  it('rewrites misleading completed headline when score is low with suggest items', () => {
    const result = resolveLoopValidationPresentation(baseUi());
    expect(loopValidationNeedsFollowUp(baseUi())).toBe(true);
    expect(result.headline).toBe('验证完成：无硬阻断，仍有 17 项建议优化');
    expect(result.phaseLabel).toBe('待优化');
    expect(result.completedTone).toBe('caution');
    expect(result.subheadline).toContain('可执行性 43');
    expect(result.subheadline).toContain('建议优化 17 项');
    expect(result.subheadline).not.toContain('->');
  });

  it('detects equal readiness snapshots', () => {
    const ui = baseUi();
    expect(ui.snapshot).toBeDefined();
    expect(readinessSnapshotsEqual(ui.snapshot!.before, ui.snapshot!.after)).toBe(true);
  });

  it('keeps success copy when completed with high score and no follow-up', () => {
    const ui = baseUi({
      headline: '方案已通过验证',
      subheadline: '可执行性 85',
      snapshot: {
        before: {
          readinessScore: 85,
          hardBlockers: 0,
          mustHandleCount: 0,
          suggestAdjustCount: 0,
          canStartExecute: true,
          verdictStatus: 'EXECUTABLE',
        },
        after: {
          readinessScore: 85,
          hardBlockers: 0,
          mustHandleCount: 0,
          suggestAdjustCount: 0,
          canStartExecute: true,
          verdictStatus: 'EXECUTABLE',
        },
      },
    });
    const result = resolveLoopValidationPresentation(ui);
    expect(result.headline).toBe('方案已通过验证');
    expect(result.phaseLabel).toBe('验证通过');
    expect(result.completedTone).toBe('success');
  });
});
