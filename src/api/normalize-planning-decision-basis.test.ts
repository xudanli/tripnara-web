import { describe, expect, it } from 'vitest';
import { normalizePlanningDecisionBasis } from '@/api/normalize-planning-decision-basis';

describe('normalizePlanningDecisionBasis', () => {
  it('parses whatHappened and contextFields', () => {
    const basis = normalizePlanningDecisionBasis(
      {
        schema: 'tripnara.planning_decision_basis@v1',
        tripId: 'trip-1',
        what_happened: {
          headline: '发生了什么？',
          narrative: '第1天：蓝湖 -> 教堂，缓冲不足。',
          day_index: 1,
        },
        context_fields: [
          {
            id: 'field_travel_time',
            label: '道路预计耗时',
            value: '47 分钟',
            subtext: '含当前路况修正',
            icon: 'travel_time',
            tone: 'good',
          },
        ],
        option_count: 3,
        updated_at: '2026-07-06T12:43:00.000Z',
      },
      'trip-1',
    );

    expect(basis.whatHappened.narrative).toContain('蓝湖');
    expect(basis.whatHappened.dayIndex).toBe(1);
    expect(basis.contextFields).toHaveLength(1);
    expect(basis.contextFields[0]?.subtext).toBe('含当前路况修正');
    expect(basis.optionCount).toBe(3);
  });

  it('parses full BFF sample with six contextFields', () => {
    const basis = normalizePlanningDecisionBasis(
      {
        schema: 'tripnara.planning_decision_basis@v1',
        tripId: 'trip-1',
        whatHappened: {
          headline: '发生了什么？',
          narrative: '第1天：蓝湖温泉 -> 哈尔格林姆斯教堂',
        },
        contextFields: [
          {
            id: 'field_travel_time',
            key: 'estimated_travel_minutes',
            label: '道路预计耗时',
            value: '47 分钟',
            subtext: '含当前路况修正',
            icon: 'travel_time',
            tone: 'good',
          },
          {
            id: 'field_planned_buffer',
            key: 'planned_buffer_minutes',
            label: '原计划缓冲',
            value: '30 分钟',
            icon: 'buffer',
          },
          {
            id: 'field_lunch',
            key: 'lunch_reservation',
            label: '午餐预约',
            value: '12:40',
            subtext: '已预订',
            icon: 'lunch',
            tone: 'good',
          },
        ],
      },
      'trip-1',
    );

    expect(basis.contextFields).toHaveLength(3);
    expect(basis.contextFields[0]?.icon).toBe('travel_time');
    expect(basis.contextFields[1]?.label).toBe('原计划缓冲');
  });

  it('unwraps nested data payload', () => {
    const basis = normalizePlanningDecisionBasis(
      {
        data: {
          schema: 'tripnara.planning_decision_basis@v1',
          context_fields: [
            { id: 'f1', label: '道路预计耗时', value: '47 分钟', icon: 'travel_time' },
          ],
        },
      },
      'trip-1',
    );
    expect(basis.contextFields).toHaveLength(1);
  });
});
