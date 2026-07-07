import { describe, expect, it } from 'vitest';
import { normalizePlanningDecisionInspector } from '@/api/normalize-planning-decision-inspector';

describe('normalizePlanningDecisionInspector', () => {
  it('parses unified inspector payload with four tabs', () => {
    const inspector = normalizePlanningDecisionInspector(
      {
        schema: 'tripnara.planning_decision_inspector@v1',
        tripId: 'trip-1',
        proposalId: 'proposal_xxx',
        optionId: 'proposal_xxx_primary',
        decisionBasis: {
          schema: 'tripnara.planning_decision_basis@v1',
          whatHappened: { narrative: '缓冲不足' },
          contextFields: [{ id: 'f1', label: '道路耗时', value: '47 分钟' }],
        },
        causalChain: {
          schema: 'tripnara.planning_causal_chain@v1',
          nodes: [{ id: 'n1', order: 0, severity: 'info', description: '路况变慢' }],
        },
        planDiff: {
          optionBadge: '方案 A',
          optionTitle: '提前 20 分钟离开起点',
          changeRows: [
            {
              itemLabel: '蓝湖温泉结束',
              before: '10:45',
              after: '10:25',
              deltaLabel: '-20 分钟',
              deltaMinutes: -20,
            },
          ],
          impactTags: [{ label: '修改 3 个时间点', tone: 'good' }],
          unchangedItems: ['午餐预约时间保持不变'],
          timelineCompare: {
            milestones: [
              {
                label: '蓝湖温泉结束',
                originalTime: '10:45',
                newTime: '10:25',
                deltaMinutes: -20,
              },
            ],
            bannerText: '共节省约 20 分钟缓冲时间',
          },
        },
        memberConsensus: {
          summaryBar: '6 位成员中：4 人支持',
          supportCount: 4,
          objectionCount: 1,
          pendingCount: 1,
          opinions: [{ displayName: 'Dora', stance: 'support', comment: '可以' }],
          aiSummary: ['多数成员关注午餐时间'],
          assessment: { supportPercent: 67, canCreatorConfirm: true },
        },
        feasibility: {
          canSafelyWrite: true,
          headline: '当前方案可以安全写入行程',
          gateChecks: [{ label: '时间冲突', status: 'pass' }],
          validityWarning: {
            message: '判断有效期至今天 18:00',
            retriggerCondition: '若道路预计耗时超过 52 分钟，将重新触发决策',
          },
          executionSummary: [{ label: '更新时间点', value: '3 个', icon: 'clock' }],
          verdict: { status: 'feasible', message: '最终结论：可执行' },
        },
      },
      'trip-1',
    );

    expect(inspector.proposalId).toBe('proposal_xxx');
    expect(inspector.decisionBasis?.contextFields).toHaveLength(1);
    expect(inspector.causalChain?.nodes).toHaveLength(1);
    expect(inspector.planDiff?.changeRows[0]?.deltaMinutes).toBe(-20);
    expect(inspector.memberConsensus?.opinions[0]?.displayName).toBe('Dora');
    expect(inspector.feasibility?.canSafelyWrite).toBe(true);
    expect(inspector.feasibility?.gateChecks[0]?.status).toBe('pass');
  });

  it('unwraps nested data envelope', () => {
    const inspector = normalizePlanningDecisionInspector(
      {
        data: {
          schema: 'tripnara.planning_decision_inspector@v1',
          proposalId: 'p1',
          planDiff: {
            changeRows: [
              {
                itemLabel: '出发',
                before: '10:00',
                after: '09:40',
                deltaLabel: '-20 分钟',
              },
            ],
            impactTags: [],
            unchangedItems: [],
          },
        },
      },
      'trip-2',
    );

    expect(inspector.proposalId).toBe('p1');
    expect(inspector.planDiff?.changeRows).toHaveLength(1);
  });

  it('parses problem mode with tabEmptyState', () => {
    const inspector = normalizePlanningDecisionInspector(
      {
        schema: 'tripnara.planning_decision_inspector@v1',
        mode: 'problem',
        tripId: 'trip-1',
        problemId: 'dp_id:abc',
        tabEmptyState: {
          causalChain: false,
          planDiff: true,
          memberConsensus: true,
          feasibility: true,
        },
        feasibility: {
          canSafelyWrite: false,
          headline: '尚未选定具体方案，暂无法评估写入可行性',
          gateChecks: [{ label: '日程可行性', status: 'warn' }],
          executionSummary: [],
          verdict: { status: 'feasible', message: '最终结论：待选方案' },
        },
        memberConsensus: {
          assessment: { statusMessage: '选定方案后可查看成员共识' },
          opinions: [],
          aiSummary: [],
        },
      },
      'trip-1',
    );

    expect(inspector.mode).toBe('problem');
    expect(inspector.problemId).toBe('dp_id:abc');
    expect(inspector.tabEmptyState?.planDiff).toBe(true);
    expect(inspector.feasibility?.canSafelyWrite).toBe(false);
  });
});
