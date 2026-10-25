import { describe, expect, it } from 'vitest';
import {
  decisionSpaceNeedsDecisionChecker,
  isConstraintSelectDecisionProblem,
} from './decision-checker-visibility.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

function problem(
  partial: Partial<DecisionProblemSummary> & Pick<DecisionProblemSummary, 'id' | 'title'>,
): DecisionProblemSummary {
  return {
    type: 'RISK',
    status: 'OPEN',
    primaryEnforcement: 'BLOCK',
    ...partial,
  };
}

describe('decision-checker-visibility.util', () => {
  it('treats insurance / vehicle / glacier as select-only', () => {
    expect(
      isConstraintSelectDecisionProblem(
        problem({
          id: 'dc_insurance_1',
          title: '保险',
          semanticKey: 'REQUIRED_CHOICE.RENTAL_INSURANCE',
          decisionCase: {
            sourceKind: 'REQUIRED_CHOICE',
            requiredness: 'BLOCKING',
            domain: 'INSURANCE',
            enrichmentStage: 'SHELL',
            writebackTargets: ['INSURANCE'],
          },
          writeChain: 'CONSTRAINT_WRITEBACK',
        }),
      ),
    ).toBe(true);

    expect(
      isConstraintSelectDecisionProblem(
        problem({
          id: 'dc_glacier_1',
          title: '冰川',
          semanticKey: 'OPPORTUNITY.GLACIER',
          decisionCase: {
            sourceKind: 'OPPORTUNITY',
            requiredness: 'IMPORTANT',
            domain: 'ACTIVITY',
            enrichmentStage: 'ENRICHED',
            writebackTargets: ['BOOKING_INTENT'],
            actionKind: 'SELECT',
          },
        }),
      ),
    ).toBe(true);
  });

  it('hides checker for select DecisionCases in decision space', () => {
    expect(
      decisionSpaceNeedsDecisionChecker({
        decisionSpaceOpen: true,
        problem: problem({
          id: 'dc_vehicle_1',
          title: '车型',
          writeChain: 'CONSTRAINT_WRITEBACK',
          decisionCase: {
            sourceKind: 'REQUIRED_CHOICE',
            requiredness: 'BLOCKING',
            domain: 'TRANSPORT',
            enrichmentStage: 'ENRICHED',
            writebackTargets: ['VEHICLE'],
          },
        }),
      }),
    ).toBe(false);
  });

  it('shows checker for buffer / lunch style conflicts', () => {
    expect(
      decisionSpaceNeedsDecisionChecker({
        decisionSpaceOpen: true,
        problem: problem({
          id: 'prob_buffer',
          title: '交通缓冲偏紧',
          semanticKey: 'FEASIBILITY.BUFFER_INSUFFICIENT',
        }),
        conflict: {
          id: 'c1',
          title: '通行缓冲不足',
          message: '第2天缓冲偏紧',
          priority: 'must_handle',
          studioConflict: { type: 'BUFFER_INSUFFICIENT' },
        } as never,
      }),
    ).toBe(true);
  });

  it('keeps checker outside decision space', () => {
    expect(
      decisionSpaceNeedsDecisionChecker({
        decisionSpaceOpen: false,
        problem: problem({
          id: 'dc_insurance_1',
          title: '保险',
          writeChain: 'CONSTRAINT_WRITEBACK',
        }),
      }),
    ).toBe(true);
  });
});
