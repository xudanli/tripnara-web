import { describe, expect, it } from 'vitest';
import {
  buildPlanDiffView,
  buildPlanDiffTimelineTracks,
  normalizePlanDiffTimelineMilestones,
  planDiffTimelineMilestonesFromChangeRows,
  resolvePlanDiffFallbackFromPack,
} from '@/lib/decision-space-plan-diff-view.util';

describe('buildPlanDiffView', () => {
  it('maps itinerary time changes to comparison rows', () => {
    const view = buildPlanDiffView({
      optionLetter: 'A',
      itineraryDiff: [
        {
          slotId: 's1',
          changeType: 'time_changed',
          dayNumber: 1,
          before: { title: '蓝湖结束', time: '10:45' },
          after: { time: '10:25' },
        },
      ],
    });

    expect(view?.changes).toHaveLength(1);
    expect(view?.changes[0]?.delta).toBe('-20 分钟');
  });

  it('falls back to tradeoff comparison when itinerary diff is empty', () => {
    const view = buildPlanDiffView({
      optionLetter: 'B',
      optionTitle: 'Hallgrímskirkja 开始时间',
      comparison: { before: '11:29', after: '11:51' },
    });

    expect(view?.changes).toHaveLength(1);
    expect(view?.changes[0]?.before).toBe('11:29');
    expect(view?.changes[0]?.after).toBe('11:51');
    expect(view?.changes[0]?.delta).toBe('+22 分钟');
  });

  it('enriches from pack counterfactual rows with timeline and buffer summary', () => {
    const view = buildPlanDiffView({
      optionLetter: 'A',
      optionTitle: '顺延下一项开始时间',
      counterfactualRows: [
        { id: 'c1', label: '蓝湖结束时间', before: '10:45', after: '10:25' },
        { id: 'c2', label: '出发时间', before: '10:50', after: '10:30' },
        { id: 'c3', label: '抵达教堂', before: '11:37', after: '11:17' },
        { id: 'c4', label: '交通缓冲', before: '-17 分钟', after: '+3 分钟' },
      ],
      unchangedHints: ['午餐预约保持 12:40'],
      mutationLines: ['重算 2 段路线', '预约不变', '预算不变'],
      memberCount: 1,
    });

    expect(view?.changes).toHaveLength(4);
    expect(view?.changes.find((row) => row.label.includes('交通缓冲'))?.deltaTone).toBe('buffer');
    expect(view?.scopeChips.some((chip) => chip.label.includes('3 个时间点'))).toBe(true);
    expect(view?.scopeChips.some((chip) => chip.label.includes('2 段路线'))).toBe(true);
    expect(view?.unchangedItems).toContain('午餐预约保持 12:40');
    expect(view?.timelines).toHaveLength(2);
    expect(view?.timelines[0]?.nodes.map((node) => node.label)).toEqual([
      '蓝湖（结束）',
      '出发',
      '抵达教堂',
    ]);
    expect(view?.timelines[0]?.nodes.some((node) => node.label.includes('交通缓冲'))).toBe(false);
    expect(view?.summaryLine).toContain('交通缓冲');
  });
});

describe('plan diff timeline milestones', () => {
  it('excludes buffer rows and sorts by original time', () => {
    const milestones = normalizePlanDiffTimelineMilestones([
      { id: 'b', label: '交通缓冲', originalTime: '+25 分钟', newTime: '+45 分钟' },
      { id: 'd', label: '出发时间', originalTime: '11:00', newTime: '10:40' },
      { id: 'a', label: '蓝湖温泉结束时间', originalTime: '10:55', newTime: '10:35' },
      { id: 'c', label: '抵达教堂', originalTime: '12:11', newTime: '11:51' },
    ]);

    expect(milestones.map((m) => m.label)).toEqual(['蓝湖温泉（结束）', '出发', '抵达教堂']);
    expect(milestones.map((m) => m.originalTime)).toEqual(['10:55', '11:00', '12:11']);
  });

  it('builds dual tracks from change rows without buffer node', () => {
    const tracks = buildPlanDiffTimelineTracks(
      planDiffTimelineMilestonesFromChangeRows([
        { id: 'c1', itemLabel: '蓝湖结束时间', before: '10:45', after: '10:25' },
        { id: 'c2', itemLabel: '出发时间', before: '10:50', after: '10:30' },
        { id: 'c3', itemLabel: '交通缓冲', before: '-17 分钟', after: '+3 分钟' },
      ]),
      'A',
    );

    expect(tracks[0]?.nodes).toHaveLength(2);
    expect(tracks[1]?.nodes[0]?.time).toBe('10:25');
  });
});

describe('resolvePlanDiffFallbackFromPack', () => {
  it('finds counterfactual rows for selected pack option', () => {
    const fallback = resolvePlanDiffFallbackFromPack(
      [
        {
          id: 'proposal_primary',
          optionKind: 'SHIFT_EARLIER',
          title: '顺延',
          outcomes: [],
          costs: [],
          action: { type: 'adjust', actionId: 'adjust_time', proposalId: 'p1' },
          counterfactualRows: [
            { id: 'r1', label: '蓝湖结束时间', before: '10:45', after: '10:25' },
          ],
        },
      ],
      'adjust_time',
    );

    expect(fallback?.counterfactualRows).toHaveLength(1);
  });
});
