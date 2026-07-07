import { describe, expect, it } from 'vitest';
import {
  normalizeCopilotActionResponse,
  normalizeCopilotSuggestions,
  normalizeItemLocks,
  normalizePlaceCandidateResponse,
  normalizePlanningWorkbenchSnapshot,
  normalizeProposalWriteResponse,
} from '@/api/normalize-arrange-itinerary';

describe('normalize-arrange-itinerary', () => {
  it('parses proposal write response', () => {
    const result = normalizeProposalWriteResponse({
      mode: 'proposal',
      tripId: 'trip-1',
      orchestrationState: {
        tripId: 'trip-1',
        phase: 'AWAITING_CONFIRMATION',
        activeProposalId: 'proposal_001',
        contextVersion: 108,
      },
      proposal: {
        proposalId: 'proposal_001',
        tripId: 'trip-1',
        intent: 'PLACE_CANDIDATE',
        basePlanVersion: 24,
        contextVersion: 108,
        affectedDays: [3],
        changes: [{ operation: 'ADD', label: '黄金瀑布', dayIndex: 3 }],
        validation: { status: 'WARN', warnings: ['驾驶略紧'], conflicts: [] },
        diff: {
          summary: '将新增 1 个行程项',
          timelineChanges: [{ operation: 'ADD', label: '新增：黄金瀑布', dayIndex: 3 }],
        },
        requiresConfirmation: true,
        status: 'AWAITING_CONFIRMATION',
      },
      answer: '建议上午前往',
    });

    expect(result.mode).toBe('proposal');
    expect(result.proposal.proposalId).toBe('proposal_001');
    expect(result.proposal.validation.status).toBe('WARN');
    expect(result.answer).toBe('建议上午前往');
  });

  it('parses direct place response', () => {
    const result = normalizePlaceCandidateResponse({
      mode: 'direct',
      tripId: 'trip-1',
      itineraryItem: { id: 'item-1' },
    });

    expect(result.mode).toBe('direct');
    if (result.mode === 'direct') {
      expect(result.itineraryItem.id).toBe('item-1');
    }
  });

  it('parses item locks response', () => {
    const result = normalizeItemLocks({
      tripId: 'trip-1',
      lockedItems: [{ itemId: 'item-a', label: '酒店入住', reason: 'user_locked' }],
      semiLockedItems: [{ itemId: 'item-b', label: '航班', reason: 'transport' }],
      mustVisitItems: [{ itemId: 'item-c', label: '黄金瀑布' }],
      movableItems: [{ itemId: 'item-d', label: '间歇泉' }],
    });

    expect(result.lockedItems).toHaveLength(1);
    expect(result.lockedItems[0]?.itemId).toBe('item-a');
    expect(result.semiLockedItems[0]?.label).toBe('航班');
    expect(result.mustVisitItems[0]?.itemId).toBe('item-c');
    expect(result.movableItems).toHaveLength(1);
  });

  it('parses copilot suggestions', () => {
    const result = normalizeCopilotSuggestions({
      tripId: 'trip-1',
      suggestions: [
        {
          id: 's1',
          kind: 'schedule_gap',
          title: '第 2 天下午有空档',
          message: '可插入 1.5 小时活动',
          severity: 'action',
          actionHint: { type: 'fill_gaps', label: '补全空档' },
        },
        {
          id: 's2',
          kind: 'high_detour_candidate',
          title: '蓝湖绕路偏高',
          message: '实时路况绕路约 45 分钟',
          actionHint: {
            type: 'place-proposal',
            placeId: 381382,
            candidateId: 'cand-1',
            dayIndex: 2,
          },
        },
      ],
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0]?.actionHint?.type).toBe('fill_gaps');
    expect(result.suggestions[1]?.actionHint?.placeId).toBe(381382);
  });

  it('parses copilot suggestions with embedded option', () => {
    const result = normalizeCopilotSuggestions({
      tripId: 'trip-1',
      suggestions: [
        {
          id: 's1',
          kind: 'schedule_gap',
          title: '第 2 天出发节奏',
          message: '建议提前离开',
          severity: 'action',
          actionHint: { type: 'place-proposal', proposalId: 'proposal_xxx' },
          option: {
            id: 'proposal_xxx_primary',
            optionKind: 'SHIFT_EARLIER',
            badge: '方案 A',
            headline: '提前 20 分钟离开起点',
            title: '提前 20 分钟离开起点',
            recommended: true,
            outcomes: ['延误风险降低至低风险'],
            costs: ['起床更早'],
          },
        },
      ],
    });

    expect(result.suggestions[0]?.option?.headline).toBe('提前 20 分钟离开起点');
    expect(result.suggestions[0]?.option?.recommended).toBe(true);
  });

  it('parses planning workbench snapshot decisionClusters from copilot', () => {
    const result = normalizePlanningWorkbenchSnapshot({
      tripId: 'trip-1',
      planningMode: 'copilot',
      copilot: {
        decisionClusters: [
          {
            id: 'day1_rhythm',
            title: '第 1 天出发节奏',
            diagnosticCount: 4,
            decisionId: 'decision_day1_rhythm',
            dependsOn: ['day0_anchor'],
            resolvesCount: 3,
            representativeOptionId: 'opt_a',
          },
        ],
      },
    });

    expect(result.decisionClusters).toHaveLength(1);
    expect(result.decisionClusters?.[0]?.diagnosticCount).toBe(4);
    expect(result.decisionClusters?.[0]?.dependsOn).toEqual(['day0_anchor']);
  });

  it('parses planning workbench snapshot', () => {
    const result = normalizePlanningWorkbenchSnapshot({
      tripId: 'trip-1',
      planningMode: 'copilot',
      orchestrationState: {
        tripId: 'trip-1',
        phase: 'IDLE',
        contextVersion: 12,
      },
      overview: { dayCount: 8, activityCount: 14, unplacedCandidateCount: 3 },
      itemLocksSummary: {
        lockedCount: 2,
        semiLockedCount: 1,
        mustVisitCount: 4,
        movableCount: 7,
      },
      conflictCount: 2,
      pendingProposalCount: 1,
      copilotSuggestions: [
        {
          id: 's1',
          kind: 'schedule_gap',
          title: '空档',
          message: '第 2 天下午可插入',
        },
      ],
    });

    expect(result.planningMode).toBe('copilot');
    expect(result.pendingProposalCount).toBe(1);
    expect(result.copilotSuggestions).toHaveLength(1);
    expect(result.itemLocksSummary?.mustVisitCount).toBe(4);
  });
});
