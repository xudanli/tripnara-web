import { describe, expect, it } from 'vitest';
import { buildPlanGateVerificationModel } from './plan-gate-verification.util';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import { normalizePlanGateUiOutput } from './normalize-plan-gate.util';

function mockResult(
  overrides: Partial<ExecutePlanningWorkbenchResponse> = {},
): ExecutePlanningWorkbenchResponse {
  return {
    planState: {
      plan_id: 'plan-1',
      plan_version: 4,
      status: 'DRAFT',
      itinerary: [],
      budget: {},
      pace: {},
      constraints: {},
      mobility: {},
      gate: {},
      evidence_refs: [],
      decision_log_refs: [],
      metadata: {},
      world: {},
    },
    uiOutput: {
      consolidatedDecision: {
        status: 'NEED_CONFIRM',
        summary: 'Day 3 节奏负荷较高',
        nextSteps: ['调整 Day 3 活动'],
      },
      personas: {
        abu: {
          persona: 'ABU',
          verdict: 'ALLOW',
          explanation: '道路与预约均可行',
          evidence: [],
          recommendations: [],
          confirmations: [],
        },
        drdre: {
          persona: 'DR_DRE',
          verdict: 'NEED_CONFIRM',
          explanation: '老人组连续户外 5h20m',
          evidence: [],
          recommendations: [],
          confirmations: [],
        },
        neptune: {
          persona: 'NEPTUNE',
          verdict: 'ALLOW',
          explanation: '核心体验保留完整',
          evidence: [],
          recommendations: [],
          confirmations: [],
        },
      },
      confirmations: ['接受 Day 3 节奏负荷'],
      presentation: null,
      health: {
        feasibility: { band: 'ok' },
        pace: { band: 'critical' },
        budget: { band: 'ok' },
      },
    },
    ...overrides,
  } as ExecutePlanningWorkbenchResponse;
}

describe('buildPlanGateVerificationModel', () => {
  it('prefers uiOutput.planGate when present', () => {
    const planGate = normalizePlanGateUiOutput({
      verification: {
        draftLabel: 'A4',
        overallStatus: 'need_confirm',
        dimensions: [
          { key: 'safetyFeasibility', title: '安全与可行性', status: 'pass' },
          { key: 'paceLoad', title: '节奏与负荷', status: 'need_confirm', summary: '老人组负荷偏高' },
          { key: 'experienceCompleteness', title: '体验与完整性', status: 'pass' },
        ],
        pendingConfirmations: [
          { id: 'signoff_0', title: 'Day 3 节奏', description: '接受负荷', kind: 'sign_off' },
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
    });

    const model = buildPlanGateVerificationModel({
      ...mockResult(),
      uiOutput: { ...mockResult().uiOutput, planGate },
    });

    expect(model?.source).toBe('planGate');
    expect(model!.dimensions).toHaveLength(3);
    expect(model!.dimensions[1].label).toBe('节奏与负荷');
    expect(model!.overallGateStatus).toBe('NEED_CONFIRM');
  });

  it('falls back to legacy persona mapping', () => {
    const model = buildPlanGateVerificationModel(mockResult());
    expect(model?.source).toBe('legacy');
    expect(model!.dimensions[0].status).toBe('pass');
    expect(model!.dimensions[1].status).toBe('need_confirm');
  });
});
