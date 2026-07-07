import { describe, expect, it } from 'vitest';
import {
  normalizePlanningDecisionCluster,
  normalizePlanningDecisionPack,
  normalizePlanningDecisionPackOption,
  normalizePlanningProposalMonitor,
} from '@/api/normalize-planning-decision-pack';

describe('normalize-planning-decision-pack', () => {
  it('normalizes P0 option with counterfactual rows', () => {
    const option = normalizePlanningDecisionPackOption({
      id: 'proposal_xxx_primary',
      optionKind: 'SHIFT_EARLIER',
      title: '提前 20 分钟离开蓝湖',
      recommended: true,
      outcomes: ['教堂按原时间到达'],
      costs: ['蓝湖停留缩短 20 分钟'],
      counterfactualRows: [
        { id: 'cf_0', label: '离开蓝湖', before: '10:45', after: '10:25' },
      ],
    });

    expect(option?.optionKind).toBe('SHIFT_EARLIER');
    expect(option?.counterfactualRows).toHaveLength(1);
  });

  it('normalizes full P0 option card payload', () => {
    const option = normalizePlanningDecisionPackOption({
      id: 'proposal_xxx_primary',
      optionKind: 'SHIFT_EARLIER',
      badge: '方案 A',
      letter: 'A',
      headline: '提前 20 分钟离开起点',
      description: '在高发拥堵时段前出发，降低风险，顺畅到达景点。',
      title: '提前 20 分钟离开起点',
      recommended: true,
      outcomes: ['延误风险降低至低风险', '午餐预计不受影响', '交通缓冲增加至 +17 分钟'],
      costs: ['正常停留需缩短约 1 小时 40 分钟', '起床更早'],
      outcomeItems: [
        { id: 'out_delay_risk', text: '延误风险降低至低风险', tone: 'good' },
        { id: 'out_lunch', text: '午餐预计不受影响', tone: 'good' },
      ],
      costItems: [
        { id: 'cost_dwell', text: '正常停留需缩短约 1 小时 40 分钟', tone: 'caution' },
      ],
      dataBasis: [
        { id: 'basis_congestion_history', label: '历史 1 年拥堵', icon: 'history', reliability: 'medium' },
        { id: 'basis_route_segment', label: '路段卡口数据', icon: 'sensor', reliability: 'high' },
      ],
      impactScope: {
        scope: 'DAY',
        affectedDays: [2],
        candidateIds: ['uuid'],
        placeIds: [381375],
      },
      counterfactualRows: [
        { id: 'cf_0', label: '新增：黄金瀑布', before: '（当前行程）', after: '2 10:30-12:00' },
      ],
      action: { type: 'apply_proposal', proposalId: 'proposal_xxx' },
    });

    expect(option?.headline).toBe('提前 20 分钟离开起点');
    expect(option?.outcomeItems?.[0]?.id).toBe('out_delay_risk');
    expect(option?.dataBasis?.[1]?.icon).toBe('sensor');
    expect(option?.dataBasis?.[1]?.reliability).toBe('high');
    expect(option?.outcomes).toHaveLength(3);
    expect(option?.action?.proposalId).toBe('proposal_xxx');
  });

  it('normalizes structured option card fields', () => {
    const option = normalizePlanningDecisionPackOption({
      id: 'opt_a',
      badge: '方案 A',
      letter: 'A',
      headline: '提前 20 分钟离开蓝湖',
      description: '将蓝湖停留缩短 20 分钟',
      optionKind: 'SHIFT_EARLIER',
      recommended: true,
      outcome_items: [{ text: '午餐不受影响', tone: 'good' }],
      cost_items: [{ text: '起床更早', tone: 'caution' }],
      data_basis: [
        { icon: 'time', label: '修改 3 个时间点' },
        { icon: 'traffic', label: '历史拥堵' },
      ],
    });

    expect(option?.headline).toBe('提前 20 分钟离开蓝湖');
    expect(option?.outcomeItems).toHaveLength(1);
    expect(option?.dataBasis?.[1]?.icon).toBe('traffic');
    expect(option?.outcomes).toEqual(['午餐不受影响']);
  });

  it('normalizes decision pack with clusters', () => {
    const pack = normalizePlanningDecisionPack({
      schema: 'tripnara.planning_decision_pack@v1',
      decisionClusters: [
        {
          id: 'day1_rhythm',
          title: '第 1 天出发节奏',
          diagnosticCount: 2,
          decisionId: 'decision_day1_rhythm',
          options: [
            {
              id: 'opt_a',
              optionKind: 'ACCEPT_RISK',
              title: '保持原计划',
              outcomes: [],
              costs: [],
            },
          ],
        },
      ],
    });

    expect(pack?.decisionClusters).toHaveLength(1);
    expect(pack?.decisionClusters?.[0]?.diagnosticCount).toBe(2);
  });

  it('normalizes cluster and monitor view', () => {
    const cluster = normalizePlanningDecisionCluster({
      id: 'c1',
      title: '南岸时间压力',
      diagnosticCount: 4,
      decisionId: 'decision_c1',
      dependsOn: ['day1_rhythm'],
      resolvesCount: 3,
      options: [],
    });
    expect(cluster?.dependsOn).toEqual(['day1_rhythm']);

    const monitor = normalizePlanningProposalMonitor({
      validUntil: '2026-07-06T10:00:00Z',
      contextVersion: 108,
      isStale: false,
      monitorWebhookUrl: '/api/trips/x/proposals/y/monitor',
    });
    expect(monitor.contextVersion).toBe(108);
    expect(monitor.isStale).toBe(false);
  });
});
