import { describe, expect, it } from 'vitest';
import {
  hasExecutionTepContent,
  isTepIntervention,
  listExecutionAlertCards,
  resolveDecisionAcceptRequest,
  resolveInterventionWriteBranch,
  resolveQueueItemIdForDecisionProblem,
  resolveRiskIdForIntervention,
} from '@/lib/mobile-execution.util';
import type {
  ExecutionAdjustmentQueueDto,
  ExecutionAlertsDto,
  ExecutionInterventionDto,
} from '@/types/mobile-execution';

function makeIntervention(
  overrides: Partial<ExecutionInterventionDto> = {},
): ExecutionInterventionDto {
  return {
    schemaId: 'tripnara.execution_intervention@v1',
    id: 'intervention-tep-REPAIR-1',
    type: 'DYNAMIC_REPLAN',
    priority: 'HIGH',
    title: 'Test',
    reason: 'reason',
    recommendedAction: 'accept',
    status: 'OPEN',
    modifiesEffectivePlan: true,
    requiresRevalidation: false,
    actions: {
      primary: { label: '应用修复', action: 'accept', enabled: true },
      secondary: { label: '查看', action: 'view', enabled: true },
    },
    causalChain: {},
    ...overrides,
  };
}

describe('mobile-execution.util', () => {
  it('identifies TEP interventions without decisionProblemId', () => {
    expect(isTepIntervention(makeIntervention())).toBe(true);
    expect(
      isTepIntervention(makeIntervention({ decisionProblemId: 'dp-1' })),
    ).toBe(false);
    expect(
      isTepIntervention(makeIntervention({ id: 'intervention-risk-1' })),
    ).toBe(false);
  });

  it('routes write branches correctly', () => {
    expect(resolveInterventionWriteBranch(makeIntervention())).toBe('tep');
    expect(
      resolveInterventionWriteBranch(
        makeIntervention({ id: 'intervention-x', decisionProblemId: 'dp-1' }),
      ),
    ).toBe('decision');
    expect(
      resolveInterventionWriteBranch(
        makeIntervention({
          id: 'intervention-slip',
          decisionProblemId: 'problem_exec_slip_1',
        }),
      ),
    ).toBe('slip');
    expect(
      resolveInterventionWriteBranch(
        makeIntervention({ id: 'intervention-risk-1', primaryRiskId: 'risk-1' }),
      ),
    ).toBe('risk');
  });

  it('resolves risk id from intervention fields', () => {
    expect(
      resolveRiskIdForIntervention(makeIntervention({ primaryRiskId: 'risk-a' })),
    ).toBe('risk-a');
    expect(
      resolveRiskIdForIntervention(
        makeIntervention({ linkedRiskIds: ['risk-b'], primaryRiskId: undefined }),
      ),
    ).toBe('risk-b');
  });

  it('lists v2 alert cards without duplicating alerts[]', () => {
    const data: ExecutionAlertsDto = {
      schemaId: 'tripnara.execution_alerts@v2',
      tripId: 't1',
      contextVersion: 1,
      primaryRisk: {
        id: 'a1',
        level: 'STOP',
        title: 'Primary',
        reason: 'r',
        impact: 'i',
        affectedActivities: [],
        requiresImmediateAttention: true,
        observedAt: '2026-07-13T00:00:00Z',
      },
      independentRisks: [
        {
          id: 'a2',
          level: 'AT_RISK',
          title: 'Secondary',
          reason: 'r',
          impact: 'i',
          affectedActivities: [],
          requiresImmediateAttention: false,
          observedAt: '2026-07-13T00:00:00Z',
        },
      ],
      alerts: [
        {
          id: 'legacy',
          level: 'AT_RISK',
          title: 'Legacy',
          reason: 'r',
          impact: 'i',
          affectedActivities: [],
          requiresImmediateAttention: false,
          observedAt: '2026-07-13T00:00:00Z',
        },
      ],
      aiRecommendation: { title: 't', detail: 'd', evidenceIds: [] },
    };
    const cards = listExecutionAlertCards(data);
    expect(cards.map((c) => c.id)).toEqual(['a1', 'a2']);
  });

  it('detects TEP hub content from queue and alerts', () => {
    const queue: ExecutionAdjustmentQueueDto = {
      schemaId: 'tripnara.execution_adjustment_queue@v1',
      tripId: 't1',
      contextVersion: 2,
      pendingCount: 1,
      criticalCount: 0,
      highPriorityCount: 1,
      headline: 'h',
      items: [makeIntervention()],
      countsByType: {
        SAFETY_INTERVENTION: 0,
        DYNAMIC_REPLAN: 1,
        TEAM_COORDINATION: 0,
        EXECUTION_PREPARATION: 0,
      },
    };
    expect(hasExecutionTepContent(null, queue)).toBe(true);
    expect(
      hasExecutionTepContent(
        {
          schemaId: 'tripnara.execution_alerts@v2',
          tripId: 't1',
          contextVersion: 1,
          alerts: [],
          aiRecommendation: { title: 't', detail: 'd', evidenceIds: [] },
          requiredAction: 'STOP',
        },
        null,
      ),
    ).toBe(true);
  });

  it('resolves decision accept payload from hydrated queue detail', () => {
    const item = makeIntervention({
      id: 'intervention-dp-1',
      decisionProblemId: 'dp-99',
      recommendation: { title: 'Rec', keeps: [], costs: [] },
      actions: {
        primary: { label: '确认', action: 'accept', actionId: 'fallback-action', enabled: true },
        secondary: { label: '查看', action: 'view', enabled: true },
      },
    });

    expect(
      resolveDecisionAcceptRequest(item, {
        recommendedActionId: 'opt-recommended',
        repairOptions: [{ id: 'opt-recommended' }, { id: 'opt-alt' }],
        actions: { acceptRecommended: { actionId: 'accept-rec', enabled: true } },
      }),
    ).toEqual({
      actionId: 'accept-rec',
      optionId: 'opt-recommended',
    });

    expect(
      resolveDecisionAcceptRequest(item, {
        repairOptions: [{ optionId: 'opt-from-list' }],
      }),
    ).toEqual({
      actionId: 'fallback-action',
      optionId: 'opt-from-list',
    });
  });

  it('resolves queue item id from decision problem id', () => {
    const queue: ExecutionAdjustmentQueueDto = {
      schemaId: 'tripnara.execution_adjustment_queue@v1',
      tripId: 't1',
      contextVersion: 1,
      pendingCount: 1,
      criticalCount: 0,
      highPriorityCount: 0,
      headline: 'h',
      items: [
        makeIntervention({ id: 'intervention-dp-1', decisionProblemId: 'dp-99' }),
      ],
      countsByType: {
        SAFETY_INTERVENTION: 0,
        DYNAMIC_REPLAN: 1,
        TEAM_COORDINATION: 0,
        EXECUTION_PREPARATION: 0,
      },
    };
    expect(resolveQueueItemIdForDecisionProblem(queue, 'dp-99')).toBe('intervention-dp-1');
    expect(resolveQueueItemIdForDecisionProblem(queue, 'missing')).toBeNull();
  });
});
