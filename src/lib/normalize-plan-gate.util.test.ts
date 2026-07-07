import { describe, expect, it } from 'vitest';
import {
  normalizePlanGateUiOutput,
  normalizePlanGatePipelineSteps,
} from './normalize-plan-gate.util';
import {
  buildPlanGateVerificationModel,
  buildPlanGateConfirmedItemsPayload,
  resolvePlanGateCanProceed,
} from './plan-gate-verification.util';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';

describe('normalize-plan-gate.util', () => {
  it('normalizes planGate uiOutput projection', () => {
    const planGate = normalizePlanGateUiOutput({
      verification: {
        draftLabel: 'A4',
        overallStatus: 'need_confirm',
        dimensions: [
          { key: 'safetyFeasibility', title: '安全与可行性', status: 'pass' },
          { key: 'paceLoad', title: '节奏与负荷', status: 'need_confirm', summary: '老人组负荷偏高' },
        ],
        pendingConfirmations: [
          { id: 'signoff_0', title: 'Day 3 节奏', description: '接受 5h20m 户外', kind: 'sign_off' },
        ],
        metrics: { executability: 89, budgetPerPerson: 1880 },
      },
      submitEligibility: {
        mode: 'pending_confirmations',
        canSubmitToTimeline: false,
        canSubmitWithAcceptedRisk: true,
        blockers: [],
        requiredConfirmationIds: ['signoff_0'],
        satisfiedConfirmationIds: [],
      },
    });

    expect(planGate?.verification.draftLabel).toBe('A4');
    expect(planGate?.verification.dimensions).toHaveLength(2);
    expect(planGate?.submitEligibility.requiredConfirmationIds).toEqual(['signoff_0']);
  });

  it('normalizes pipeline steps', () => {
    const steps = normalizePlanGatePipelineSteps([
      { id: 'merge', label: '合并决策结果', status: 'completed', order: 1 },
      { id: 'route', label: '计算路线与时间', status: 'running', order: 3 },
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.label).toBe('合并决策结果');
    expect(steps[1]?.status).toBe('running');
  });

  it('normalizes draftDiff and commitResult on planGate uiOutput', () => {
    const planGate = normalizePlanGateUiOutput({
      verification: {
        draftLabel: 'A4',
        overallStatus: 'pass',
        dimensions: [{ key: 'safetyFeasibility', title: '安全', status: 'pass' }],
        metrics: { executability: 89, executabilityDelta: 13 },
      },
      submitEligibility: {
        mode: 'ready',
        canSubmitToTimeline: true,
        canSubmitWithAcceptedRisk: false,
        blockers: [],
        requiredConfirmationIds: [],
        satisfiedConfirmationIds: [],
      },
      draftDiff: {
        baselinePlanId: 'p3',
        baselineLabel: 'A3',
        draftPlanId: 'p4',
        draftLabel: 'A4',
        timelineChanges: [
          {
            kind: 'accommodation',
            day: 2,
            label: '住宿变更',
            before: '南岸酒店',
            after: '升级酒店',
            impact: 'medium',
          },
        ],
        metrics: { executability: 89, executabilityDelta: 13, affectedDays: 2 },
        changeLog: ['第2天住宿变更：南岸酒店 → 升级酒店'],
        affectedDayCount: 2,
      },
      commitResult: {
        success: true,
        committedVersionLabel: 'A4',
        headline: '方案 A4 已写入时间轴',
        updates: ['第2天住宿变更：南岸酒店 → 升级酒店'],
        nextActions: [{ label: '查看更新时间轴', action: 'view_timeline' }],
      },
    });

    expect(planGate?.draftDiff?.baselineLabel).toBe('A3');
    expect(planGate?.draftDiff?.timelineChanges).toHaveLength(1);
    expect(planGate?.commitResult?.headline).toContain('A4');
  });

  it('normalizes preTripTasks and mapGeoJson', () => {
    const planGate = normalizePlanGateUiOutput({
      verification: {
        draftLabel: 'A4',
        overallStatus: 'pass',
        dimensions: [{ key: 'safetyFeasibility', title: '安全', status: 'pass' }],
      },
      submitEligibility: {
        mode: 'ready',
        canSubmitToTimeline: true,
        canSubmitWithAcceptedRisk: false,
        blockers: [],
        requiredConfirmationIds: [],
        satisfiedConfirmationIds: [],
      },
      preTripTasks: {
        total: 3,
        highPriority: 1,
        tasks: [
          {
            id: 't1',
            title: '预订南岸酒店',
            category: 'booking',
            priority: 'high',
            source: 'plan',
            day: 2,
          },
        ],
      },
      draftDiff: {
        baselineLabel: 'A3',
        draftLabel: 'A4',
        mapGeoJson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { role: 'draft_route', color: '#7C3AED' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [8.5, 47.3],
                  [8.6, 47.4],
                ],
              },
            },
          ],
          legend: [{ key: 'draft_route', label: '新路线', color: '#7C3AED' }],
          bounds: [8.5, 47.3, 8.6, 47.4],
        },
      },
    });

    expect(planGate?.preTripTasks?.total).toBe(3);
    expect(planGate?.draftDiff?.mapGeoJson?.features).toHaveLength(1);
    expect(planGate?.draftDiff?.mapGeoJson?.legend?.[0]?.label).toBe('新路线');
  });
});

describe('plan-gate-verification with planGate', () => {
  const result = {
    planState: { plan_id: 'p1', plan_version: 4 },
    uiOutput: {
      planGate: normalizePlanGateUiOutput({
        verification: {
          draftLabel: 'A4',
          overallStatus: 'need_confirm',
          dimensions: [
            { key: 'paceLoad', title: '节奏与负荷', status: 'need_confirm' },
          ],
          pendingConfirmations: [
            { id: 'signoff_0', title: '签收', description: '我接受', kind: 'sign_off' },
          ],
        },
        submitEligibility: {
          mode: 'pending_confirmations',
          canSubmitToTimeline: false,
          canSubmitWithAcceptedRisk: false,
          blockers: [],
          requiredConfirmationIds: ['signoff_0'],
          satisfiedConfirmationIds: [],
        },
      }),
    },
  } as ExecutePlanningWorkbenchResponse;

  it('builds verification model from planGate', () => {
    const model = buildPlanGateVerificationModel(result);
    expect(model?.source).toBe('planGate');
    expect(model?.draftLabel).toBe('A4');
    expect(model?.dimensions[0]?.label).toBe('节奏与负荷');
  });

  it('builds commit confirmedItems payload', () => {
    const payload = buildPlanGateConfirmedItemsPayload([
      { confirmationId: 'signoff_0', accepted: true },
    ]);
    expect(payload).toEqual([{ confirmationId: 'signoff_0', accepted: true }]);
  });

  it('resolves can proceed after confirmations', () => {
    const model = buildPlanGateVerificationModel(result);
    const blocked = resolvePlanGateCanProceed(result.uiOutput.planGate, [], model);
    expect(blocked.canProceed).toBe(false);

    const ok = resolvePlanGateCanProceed(
      {
        ...result.uiOutput.planGate!,
        submitEligibility: {
          ...result.uiOutput.planGate!.submitEligibility,
          mode: 'ready',
          canSubmitToTimeline: true,
        },
      },
      [{ confirmationId: 'signoff_0', accepted: true }],
      model,
    );
    expect(ok.canProceed).toBe(true);
  });
});
