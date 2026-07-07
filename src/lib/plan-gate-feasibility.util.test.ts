import { describe, expect, it } from 'vitest';
import {
  normalizePlanGateFeasibility,
  normalizePlanGateUiOutput,
} from './normalize-plan-gate.util';
import {
  formatPlanGateMemberChangeSummary,
  resolveDraftDiffChangeItems,
} from './plan-gate-draft-diff.util';
import {
  readPlanStateExecutabilityScore,
  resolvePlanGateExecutabilityMetrics,
} from '@/hooks/usePlanGateFeasibility';

describe('plan-gate feasibility + memberChanges', () => {
  it('normalizes feasibility response', () => {
    const data = normalizePlanGateFeasibility({
      baselineScore: 76,
      draftScore: 89,
      executabilityDelta: 13,
      planId: 'p4',
    });
    expect(data?.baselineScore).toBe(76);
    expect(data?.draftScore).toBe(89);
  });

  it('normalizes memberChanges on draftDiff', () => {
    const planGate = normalizePlanGateUiOutput({
      verification: {
        draftLabel: 'A4',
        overallStatus: 'need_confirm',
        dimensions: [{ key: 'paceLoad', title: '节奏', status: 'need_confirm' }],
        metrics: { executability: 89, executabilityDelta: 13 },
      },
      submitEligibility: {
        mode: 'blocked',
        canSubmitToTimeline: false,
        canSubmitWithAcceptedRisk: false,
        blockers: ['第 2 天分流缺少汇合点'],
        requiredConfirmationIds: [],
        satisfiedConfirmationIds: [],
      },
      draftDiff: {
        baselineLabel: 'A3',
        draftLabel: 'A4',
        memberChanges: [
          {
            day: 2,
            kind: 'split_added',
            label: '老人组分流',
            before: '全员同行',
            after: '分两组',
            impact: 'high',
            missingMeetup: true,
          },
        ],
      },
    });

    expect(planGate?.draftDiff?.memberChanges).toHaveLength(1);
    expect(planGate?.draftDiff?.memberChanges?.[0]?.missingMeetup).toBe(true);
    expect(planGate?.verification.metrics?.executability).toBe(89);
  });

  it('merges executability from feasibility api fallback', () => {
    const metrics = resolvePlanGateExecutabilityMetrics(
      null,
      { baselineScore: 76, draftScore: 89, executabilityDelta: 13 },
    );
    expect(metrics?.executability).toBe(89);
    expect(metrics?.executabilityDelta).toBe(13);
  });

  it('reads executabilityScore from planState metadata', () => {
    const score = readPlanStateExecutabilityScore({
      metadata: { executabilityScore: 84 },
    });
    expect(score).toBe(84);
  });

  it('includes memberChanges in change log items', () => {
    const items = resolveDraftDiffChangeItems({
      memberChanges: [
        {
          day: 2,
          kind: 'meetup_changed',
          label: '汇合点',
          before: '车站',
          after: '酒店',
          impact: 'medium',
        },
      ],
    });
    expect(items[0]).toContain('汇合点');
    expect(formatPlanGateMemberChangeSummary({
      day: 2,
      label: '汇合点',
      before: '车站',
      after: '酒店',
    })).toContain('车站');
  });
});
