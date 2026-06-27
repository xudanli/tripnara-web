import { describe, it, expect } from 'vitest';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import {
  extractChooseOptionsFromPresentation,
  extractPlanItems,
  formatPlanSegmentLabel,
  formatWorkbenchBudgetPreviewLine,
  getSegmentPreviewStops,
  getTripDayPoiNames,
  getWorkbenchGuidance,
  humanizeWorkbenchDisplayText,
  isGenericPlanSegmentLabel,
  isWorkbenchChooseActive,
  isWorkbenchHardBlocked,
  resolveEffectiveWorkbenchGate,
  mapWorkbenchChooseToOptionId,
  resolveWorkbenchCommitSelectedOptionId,
  resolveWorkbenchConfirmationItems,
  resolveWorkbenchRiskExplanation,
  resolveWorkbenchSubmitBlocked,
  WORKBENCH_MIN_CHOOSE_OPTIONS,
} from '@/lib/planning-workbench-ux.util';

describe('planning-workbench-ux.util', () => {
  it('extracts route segments from itinerary object', () => {
    const items = extractPlanItems({
      itinerary: {
        tripId: 't1',
        segments: [{ segmentId: 's1', dayIndex: 0, distanceKm: 12 }],
      },
    });
    expect(items).toHaveLength(1);
  });

  it('treats hard-block presentation as REJECT even when gate is NEED_CONFIRM', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'PROPOSED' },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM', summary: '需确认' },
        presentation: {
          headline: '硬违规',
          narrative: '无法通过',
          leadSpeaker: 'ABU',
          displayStyle: 'guardian',
          scenario: 'SAFETY_BLOCK',
          hardConstraintBlocked: true,
          actions: { abu: 'BLOCK', user: 'CHOOSE' },
          supportingLines: [],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveEffectiveWorkbenchGate(result)).toBe('REJECT');
    const guidance = getWorkbenchGuidance(result, { submitBlockedByGate: true, planItemCount: 0 });
    expect(guidance?.title).toContain('暂无法提交');
    expect(guidance?.secondaryAction).toBe('constraints');
  });

  it('reads CHOOSE from humanDecisionPointsFlat', () => {
    expect(
      extractChooseOptionsFromPresentation({
        actions: { user: 'CHOOSE' },
        humanDecisionPointsFlat: ['缩短行程，减少单日驾驶', '保持原路线，接受更高风险'],
      } as import('@/types/guardian-presentation').GuardianPersonaPresentation),
    ).toEqual(['缩短行程，减少单日驾驶', '保持原路线，接受更高风险']);
  });

  it('reads CHOOSE from humanDecisionPoints[0].options', () => {
    expect(
      extractChooseOptionsFromPresentation({
        actions: { user: 'CHOOSE' },
        humanDecisionPoints: [{ options: ['选项 A', '选项 B'] }],
      } as import('@/types/guardian-presentation').GuardianPersonaPresentation),
    ).toEqual(['选项 A', '选项 B']);
  });

  it('does not read supportingLines when presentation fields are absent', () => {
    expect(
      extractChooseOptionsFromPresentation({
        actions: { user: 'CHOOSE' },
        humanDecisionPoints: [{ text: '确认你的价值取舍' }],
        supportingLines: [{ text: '不应出现' }],
      } as import('@/types/guardian-presentation').GuardianPersonaPresentation),
    ).toEqual([]);
  });

  it('reads segment metadata.name first', () => {
    const label = formatPlanSegmentLabel(
      { metadata: { name: '雷克雅未克 → 维克' }, segmentId: 'day_1_segment_1', dayIndex: 0 },
      null,
      0,
    );
    expect(label).toBe('雷克雅未克 → 维克');
  });

  it('ignores generic backend day-index metadata and uses timeline POIs', () => {
    const trip = {
      TripDay: [
        {
          date: '2026-06-01',
          ItineraryItem: [{ Place: { nameCN: '雷克雅未克' } }],
        },
        {
          date: '2026-06-02',
          ItineraryItem: [
            { Place: { nameCN: '塞尔福斯' } },
            { Place: { nameCN: '维克' } },
          ],
        },
      ],
    } as TripDetail;

    expect(isGenericPlanSegmentLabel('第 1 天 → 第 2 天')).toBe(true);
    expect(
      formatPlanSegmentLabel(
        { metadata: { name: '第 1 天 → 第 2 天' }, dayIndex: 1 },
        trip,
        1,
      ),
    ).toBe('塞尔福斯 → 维克');
    expect(getTripDayPoiNames(trip, 1)).toEqual(['塞尔福斯', '维克']);
  });

  it('formats segment label from trip day theme when segment id is skeleton', () => {
    const trip = {
      TripDay: [{ theme: '雷克雅未克 → 黄金圈' }],
    } as TripDetail;
    const label = formatPlanSegmentLabel(
      { segmentId: 'day_1_segment_1', dayIndex: 0 },
      trip,
      0,
    );
    expect(label).toBe('雷克雅未克 → 黄金圈');
  });

  it('requires at least two CHOOSE options before showing choose flow', () => {
    const singleOption = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'PROPOSED' },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM' },
        presentation: {
          actions: { user: 'CHOOSE' },
          humanDecisionPointsFlat: ['仅一条选项'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(isWorkbenchChooseActive(singleOption)).toBe(false);
    expect(
      resolveWorkbenchSubmitBlocked(singleOption, {
        confirmationCount: 0,
        allConfirmationsChecked: false,
      }).reason,
    ).not.toBe('choose_pending');
  });

  it('blocks submit on hardConstraintBlocked even when status is ALLOW', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'PROPOSED' },
      uiOutput: {
        consolidatedDecision: { status: 'ALLOW' },
        presentation: { hardConstraintBlocked: true, actions: {} },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(isWorkbenchHardBlocked(result)).toBe(true);
    expect(resolveEffectiveWorkbenchGate(result)).toBe('REJECT');
    expect(
      resolveWorkbenchSubmitBlocked(result, {
        confirmationCount: 0,
        allConfirmationsChecked: true,
      }),
    ).toEqual({ blocked: true, reason: 'hard_block' });
  });

  it('blocks submit while CHOOSE is active with two options', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'NEED_CONFIRM' },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM' },
        presentation: {
          actions: { user: 'CHOOSE' },
          humanDecisionPointsFlat: ['选项 A', '选项 B'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(isWorkbenchChooseActive(result)).toBe(true);
    expect(
      resolveWorkbenchSubmitBlocked(result, {
        confirmationCount: 0,
        allConfirmationsChecked: false,
      }),
    ).toEqual({ blocked: true, reason: 'choose_pending' });
    expect(extractChooseOptionsFromPresentation(result.uiOutput.presentation)).toHaveLength(
      WORKBENCH_MIN_CHOOSE_OPTIONS,
    );
  });

  it('reads segment metadata.stops before timeline POIs', () => {
    expect(
      getSegmentPreviewStops(
        { metadata: { stops: ['蓝湖', '维克'] }, dayIndex: 0 },
        { TripDay: [{ ItineraryItem: [{ Place: { nameCN: '不应出现' } }] }] } as TripDetail,
        0,
      ),
    ).toEqual(['蓝湖', '维克']);
  });

  it('merges attractions/restaurants/accommodation when stops is absent', () => {
    expect(
      getSegmentPreviewStops(
        {
          metadata: {
            attractions: ['蓝湖'],
            restaurants: ['Fish Company'],
            accommodation: 'Hotel Vik',
          },
          dayIndex: 0,
        },
        { TripDay: [{ ItineraryItem: [{ Place: { nameCN: '不应出现' } }] }] } as TripDetail,
        0,
      ),
    ).toEqual(['蓝湖', 'Fish Company', 'Hotel Vik']);
  });

  it('does not treat CHOOSE flow nextSteps as confirmation items', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'NEED_CONFIRM' },
      uiOutput: {
        consolidatedDecision: {
          status: 'NEED_CONFIRM',
          summary: '高地 F 路 10 月封闭概率较高',
          nextSteps: ['请在上方的决策点中选择一项后继续'],
        },
        presentation: {
          actions: { user: 'CHOOSE' },
          humanDecisionPointsFlat: ['紧凑 — 环岛精华', '均衡 — 经典路线'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveWorkbenchConfirmationItems(result)).toEqual([]);
    expect(isWorkbenchChooseActive(result)).toBe(true);
  });

  it('formats budget preview line', () => {
    expect(
      formatWorkbenchBudgetPreviewLine({
        totalEstimate: 28000,
        currency: 'CNY',
        vsLimit: 0.92,
        band: 'warning',
      }),
    ).toMatch(/28,?000/);
  });

  it('humanizes legacy Abu debug summary for risk box only', () => {
    const raw =
      "Abu 拒绝：实时信息显示路线封闭或交通中断: 's road closure system is essential for any driver here. Missing a closure notification and attempting a closed road in a blizzard, persona closure stop=ABU_FATAL_REJECT rechecks=0";

    expect(humanizeWorkbenchDisplayText(raw)).toBe('实时信息显示路线封闭或交通中断');

    const result = {
      planState: {
        plan_id: 'p1',
        plan_version: 1,
        status: 'NEED_CONFIRM',
        gate: { requiredUserConfirmations: [raw] },
      },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM', summary: raw, nextSteps: [] },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveWorkbenchRiskExplanation(result)).toBe('实时信息显示路线封闭或交通中断');
    expect(resolveWorkbenchConfirmationItems(result)).toEqual([]);
  });

  it('renders backend confirmations[] directly as checkbox questions', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'NEED_CONFIRM' },
      uiOutput: {
        consolidatedDecision: {
          status: 'NEED_CONFIRM',
          summary: '高地 F 路季节性封闭。',
          nextSteps: [],
        },
        confirmations: ['是否接受路线封闭风险并继续？'],
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveWorkbenchRiskExplanation(result)).toBe('高地 F 路季节性封闭。');
    expect(resolveWorkbenchConfirmationItems(result)).toEqual([
      '是否接受路线封闭风险并继续？',
    ]);
  });

  it('returns empty sign-offs when NEED_CONFIRM lacks confirmations[]', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'NEED_CONFIRM' },
      uiOutput: {
        consolidatedDecision: {
          status: 'NEED_CONFIRM',
          summary: 'Abu 发现风险',
          nextSteps: ['请阅读确认点并勾选后继续'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveWorkbenchConfirmationItems(result)).toEqual([]);
    expect(
      resolveWorkbenchSubmitBlocked(result, {
        confirmationCount: 0,
        allConfirmationsChecked: false,
      }).blocked,
    ).toBe(true);
  });

  it('treats confirm-flow nextSteps as meta instructions, not checkbox labels', () => {
    const result = {
      planState: { plan_id: 'p1', plan_version: 1, status: 'NEED_CONFIRM' },
      uiOutput: {
        consolidatedDecision: {
          status: 'NEED_CONFIRM',
          summary:
            "Abu 拒绝：实时信息显示路线封闭或交通中断: 's road closure persona closure stop=ABU_FATAL_REJECT rechecks=0",
          nextSteps: ['请阅读确认点并勾选后继续'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(resolveWorkbenchRiskExplanation(result)).toBe('实时信息显示路线封闭或交通中断');
    expect(resolveWorkbenchConfirmationItems(result)).toEqual([]);
    const guidance = getWorkbenchGuidance(result, {
      submitBlockedByGate: true,
      planItemCount: 10,
    });
    expect(guidance?.description).not.toContain('请阅读确认点并勾选后继续');
    expect(guidance?.description).toMatch(/风险说明/);
  });

  it('maps CHOOSE selection to optionId for commit', () => {
    const result = {
      planState: {
        plan_id: 'p1',
        plan_version: 1,
        status: 'NEED_CONFIRM',
        metadata: { recommendedOptionId: 'balanced_1' },
      },
      uiOutput: {
        consolidatedDecision: { status: 'NEED_CONFIRM', summary: '预算偏紧' },
        comparison: {
          options: [
            { optionId: 'compact_1', summary: '紧凑型 — 南岸精华' },
            { optionId: 'balanced_1', summary: '均衡型 — 经典路线' },
          ],
          recommendation: { optionId: 'balanced_1', reason: '默认' },
        },
        presentation: {
          actions: { user: 'CHOOSE' },
          humanDecisionPointsFlat: ['紧凑型 — 南岸精华', '均衡型 — 经典路线'],
        },
        personas: { abu: {}, drdre: {}, neptune: {} },
      },
    } as unknown as ExecutePlanningWorkbenchResponse;

    expect(mapWorkbenchChooseToOptionId(result, 0, '紧凑型 — 南岸精华')).toBe('compact_1');
    expect(
      resolveWorkbenchCommitSelectedOptionId(result, 'compact_1'),
    ).toBe('compact_1');
    expect(resolveWorkbenchCommitSelectedOptionId(result, null)).toBeUndefined();
  });
});
