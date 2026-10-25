import { describe, expect, it } from 'vitest';
import {
  filterDecisionQueueSummaries,
  isReadinessSafetyDecisionProblem,
} from './decision-problem-queue-filter.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

function summary(partial: Partial<DecisionProblemSummary> & Pick<DecisionProblemSummary, 'id' | 'title'>): DecisionProblemSummary {
  return {
    type: 'RISK',
    status: 'OPEN',
    primaryEnforcement: 'REQUIRE_CONFIRMATION',
    ...partial,
  };
}

describe('decision-problem-queue-filter.util', () => {
  it('excludes Iceland emergency phone from decision queue', () => {
    const item = summary({
      id: 'dp_id:issue-finding-2',
      title: '冰岛 紧急电话',
    });
    expect(isReadinessSafetyDecisionProblem(item)).toBe(true);
    expect(filterDecisionQueueSummaries([item])).toHaveLength(0);
  });

  it('keeps route conflict problems', () => {
    const item = summary({
      id: 'dp_id:coverage-gap:1',
      title: '第6天 · 红沙滩',
      semanticKey: 'gate:reachability',
    });
    expect(filterDecisionQueueSummaries([item])).toHaveLength(1);
  });

  it('hides DecisionCase drive card when Canonical EXCESSIVE_DAILY_LOAD exists', () => {
    const items = [
      summary({
        id: 'problem_load_1',
        title: '单日负荷过高',
        semanticKey: 'EXCESSIVE_DAILY_LOAD',
      }),
      summary({
        id: 'dc_drive_trip_d2',
        title: '是否拆分住宿',
        semanticKey: 'RULE_TRIGGER.EXCESSIVE_DAILY_DRIVE',
        decisionCase: {
          sourceKind: 'RULE_TRIGGER',
          requiredness: 'IMPORTANT',
          uiGroup: 'IMPORTANT_CHOICE',
        },
      }),
      summary({
        id: 'dc_vehicle_trip',
        title: '选择车型',
        semanticKey: 'REQUIRED_CHOICE.VEHICLE_ROAD_FIT',
        decisionCase: {
          sourceKind: 'REQUIRED_CHOICE',
          requiredness: 'BLOCKING',
          uiGroup: 'MUST_CONFIRM',
        },
      }),
    ];
    const filtered = filterDecisionQueueSummaries(items);
    expect(filtered.map((item) => item.id)).toEqual(['problem_load_1', 'dc_vehicle_trip']);
  });
});
