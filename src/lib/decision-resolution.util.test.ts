import { describe, expect, it } from 'vitest';
import {
  buildResolutionIdempotencyKey,
  normalizeApplyDecisionProblemResponse,
  normalizeDecisionProblemResolution,
  normalizeSubmitDecisionResolutionResponse,
  normalizeSubmitResolutionRequest,
  resolveDecisionProblemTaskBinding,
  resolveDecisionResolutionCtaPhase,
} from './decision-resolution.util';

describe('decision-resolution.util', () => {
  it('builds idempotency key', () => {
    expect(buildResolutionIdempotencyKey('trip_1', 'prob_1', 'cand_a')).toBe(
      'resolution:trip_1:prob_1:cand_a',
    );
  });

  it('normalizes resolution', () => {
    expect(
      normalizeDecisionProblemResolution({
        resolutionId: 'res_1',
        status: 'PROPOSED',
        nextStep: 'APPLY',
      }),
    ).toEqual({
      resolutionId: 'res_1',
      status: 'PROPOSED',
      nextStep: 'APPLY',
    });
  });

  it('resolves CTA phases', () => {
    expect(resolveDecisionResolutionCtaPhase({ executionStatus: 'APPLIED' })).toBe('done');
    expect(
      resolveDecisionResolutionCtaPhase({
        workflowStatus: 'DECIDED',
        resolution: { resolutionId: 'res_1', nextStep: 'APPLY' },
      }),
    ).toBe('apply');
    expect(resolveDecisionResolutionCtaPhase({ workflowStatus: 'OPEN' })).toBe('select_action');
  });

  it('resolves task binding from detail', () => {
    expect(
      resolveDecisionProblemTaskBinding('prob_1', {
        resolution: { resolutionId: 'res_1' },
        actionPlanId: 'plan_v1',
      }),
    ).toEqual({
      problemId: 'prob_1',
      resolutionId: 'res_1',
      actionPlanId: 'plan_v1',
    });
  });

  it('normalizes submit response with suggestedFollowUps and collaborativeTask', () => {
    const submitted = normalizeSubmitDecisionResolutionResponse({
      resolution: { resolutionId: 'res_1', nextStep: 'APPLY' },
      suggestedFollowUps: ['团队确认', '查住宿'],
      collaborativeTask: { resolutionId: 'res_1', actionPlanId: 'plan_pre' },
    });
    expect(submitted.suggestedFollowUps).toEqual(['团队确认', '查住宿']);
    expect(submitted.collaborativeTask?.actionPlanId).toBe('plan_pre');
  });

  it('normalizes submit resolution request aliases to selectedActionId', () => {
    expect(
      normalizeSubmitResolutionRequest({
        actionId: 'cand_refresh_readiness',
        idempotencyKey: 'resolution:t:p:cand_refresh_readiness',
      }),
    ).toEqual({
      selectedActionId: 'cand_refresh_readiness',
      idempotencyKey: 'resolution:t:p:cand_refresh_readiness',
    });
  });

  it('normalizes submit resolution request with causalTraceRef', () => {
    expect(
      normalizeSubmitResolutionRequest({
        selectedActionId: 'cand_a',
        causalTraceRef: {
          traceId: 'trace_1',
          worldStateVersion: 'ws_v1',
          protocolVersion: 'causal-trace-v1',
        },
      }),
    ).toEqual({
      selectedActionId: 'cand_a',
      causalTraceRef: {
        traceId: 'trace_1',
        worldStateVersion: 'ws_v1',
        protocolVersion: 'causal-trace-v1',
      },
    });
  });

  it('throws when no action id in resolution body', () => {
    expect(() => normalizeSubmitResolutionRequest({})).toThrow('DECISION_ACTION_REQUIRED');
  });

  it('normalizes apply response with suggested sub-tasks and collaborativeTask', () => {
    const applied = normalizeApplyDecisionProblemResponse({
      problem: { execution_status: 'APPLIED' },
      suggestedSubTasks: [
        {
          id: 'st_auto_1',
          resolutionId: 'res_1',
          title: '团队确认',
          kind: 'TEAM_CONFIRM',
          status: 'OPEN',
        },
      ],
      collaborativeTask: {
        resolutionId: 'res_1',
        actionPlanId: 'plan_v2',
        decisionProblemId: 'prob_1',
      },
    });
    expect(applied.suggestedSubTasks).toHaveLength(1);
    expect(applied.suggestedSubTasks?.[0]?.status).toBe('pending');
    expect(applied.collaborativeTask?.actionPlanId).toBe('plan_v2');
    expect(applied.applyResult?.actionPlanId).toBe('plan_v2');
    expect(applied.problem?.executionStatus).toBe('APPLIED');
  });
});
