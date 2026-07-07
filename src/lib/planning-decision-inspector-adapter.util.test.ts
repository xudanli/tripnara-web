import { describe, expect, it } from 'vitest';
import {
  feasibilityViewFromInspector,
  membersConsensusViewFromInspector,
  planDiffViewFromInspector,
} from '@/lib/planning-decision-inspector-adapter.util';
import type {
  PlanningDecisionInspectorFeasibility,
  PlanningDecisionInspectorMemberConsensus,
  PlanningDecisionInspectorPlanDiff,
} from '@/dto/frontend-planning-decision-inspector.types';

describe('planning-decision-inspector-adapter', () => {
  const planDiff: PlanningDecisionInspectorPlanDiff = {
    optionBadge: '方案 A',
    optionTitle: '提前离开',
    changeRows: [
      {
        id: 'r1',
        itemLabel: '蓝湖结束',
        before: '10:45',
        after: '10:25',
        deltaLabel: '-20 分钟',
        deltaMinutes: -20,
      },
    ],
    impactTags: [{ id: 't1', label: '修改 1 个时间点', tone: 'good' }],
    unchangedItems: ['午餐不变'],
    timelineCompare: {
      milestones: [
        {
          id: 'm1',
          label: '蓝湖结束',
          originalTime: '10:45',
          newTime: '10:25',
          deltaMinutes: -20,
        },
      ],
      bannerText: '节省 20 分钟',
    },
  };

  it('maps planDiff to PlanDiffView', () => {
    const view = planDiffViewFromInspector(planDiff, 'A');
    expect(view.optionLetter).toBe('A');
    expect(view.optionBadge).toBe('方案 A');
    expect(view.changes[0]?.deltaTone).toBe('good');
    expect(view.timelines).toHaveLength(2);
    expect(view.summaryLine).toBe('节省 20 分钟');
    expect(view.isEmpty).toBe(false);
  });

  it('excludes buffer milestones from timeline tracks', () => {
    const view = planDiffViewFromInspector(
      {
        ...planDiff,
        changeRows: [
          {
            id: 'r1',
            itemLabel: '蓝湖温泉结束时间',
            before: '10:55',
            after: '10:35',
            deltaLabel: '-20 分钟',
            deltaMinutes: -20,
          },
          {
            id: 'r2',
            itemLabel: '出发时间',
            before: '11:00',
            after: '10:40',
            deltaLabel: '-20 分钟',
            deltaMinutes: -20,
          },
          {
            id: 'buf',
            itemLabel: '交通缓冲',
            before: '+25 分钟',
            after: '+45 分钟',
            deltaLabel: '+20 分钟',
            deltaMinutes: 20,
          },
        ],
        timelineCompare: {
          milestones: [
            {
              id: 'buf',
              label: '交通缓冲',
              originalTime: '+25 分钟',
              newTime: '+45 分钟',
            },
            {
              id: 'm1',
              label: '蓝湖温泉结束时间',
              originalTime: '10:55',
              newTime: '10:35',
            },
            {
              id: 'm2',
              label: '出发时间',
              originalTime: '11:00',
              newTime: '10:40',
            },
          ],
        },
      },
      'A',
    );

    expect(view.timelines[0]?.nodes.map((node) => node.label)).toEqual([
      '蓝湖温泉（结束）',
      '出发',
    ]);
    expect(view.timelines[0]?.nodes.some((node) => /缓冲/.test(node.label))).toBe(false);
  });

  it('maps buffer row to buffer delta tone', () => {
    const view = planDiffViewFromInspector(
      {
        ...planDiff,
        changeRows: [
          {
            id: 'buf',
            itemLabel: '交通缓冲',
            before: '-17 分钟',
            after: '+3 分钟',
            deltaLabel: '+20 分钟',
            deltaMinutes: 20,
          },
        ],
      },
      'A',
    );
    expect(view.changes[0]?.deltaTone).toBe('buffer');
  });

  it('maps memberConsensus to MembersConsensusTabView', () => {
    const consensus: PlanningDecisionInspectorMemberConsensus = {
      summaryBar: '4 人支持',
      supportCount: 4,
      objectionCount: 1,
      pendingCount: 1,
      opinions: [
        { id: 'o1', displayName: 'Dora', stance: 'support', comment: 'OK' },
        { id: 'o2', displayName: 'Bob', stance: 'objection', comment: 'No' },
      ],
      aiSummary: ['关注午餐'],
      assessment: { statusMessage: '多数接受' },
    };
    const view = membersConsensusViewFromInspector(consensus, 'B');
    expect(view.optionLetter).toBe('B');
    expect(view.members).toHaveLength(2);
    expect(view.totalCount).toBe(6);
    expect(view.aiNote).toContain('午餐');
  });

  it('maps feasibility to FeasibilityTabView', () => {
    const feasibility: PlanningDecisionInspectorFeasibility = {
      canSafelyWrite: true,
      headline: '可以安全写入',
      gateChecks: [{ id: 'g1', label: '时间冲突', status: 'pass' }],
      validityWarning: {
        message: '判断有效期至今天 18:00',
        retriggerCondition: '路况变化将重触发',
      },
      executionSummary: [{ id: 'e1', label: '更新时间点', value: '3 个', icon: 'clock' }],
      verdict: { status: 'feasible', message: '最终结论：可执行', subtext: '风险可控' },
    };
    const view = feasibilityViewFromInspector(feasibility, 'A', '方案标题');
    expect(view.headline).toBe('可以安全写入');
    expect(view.executionSummary[0]?.id).toBe('time');
    expect(view.finalConclusion).toBe('最终结论：可执行');
  });
});
