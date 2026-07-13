import { describe, expect, it } from 'vitest';
import { mapPreviewImpactToUi } from './trip-constraints.adapter';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';

describe('mapPreviewImpactToUi', () => {
  it('maps executeabilityDelta, affectedItemIds, and conflict deltas', () => {
    const ui = mapPreviewImpactToUi(
      {
        affectedDays: [1, { dayNumber: 2, tone: 'minor' }],
        affectedItemIds: ['item-a', 'item-b'],
        feasibilityBefore: 72,
        executeabilityDelta: { scoreDelta: -8, mustHandleDelta: 1 },
        budgetDelta: { total: 120, currency: 'CNY' },
        conflictsBefore: { mustHandle: 1, suggestAdjust: 2 },
        conflictsAfter: { mustHandle: 2, suggestAdjust: 1 },
        recommendations: ['建议缩短第 2 天驾驶时长', '可改为公共交通'],
        suggestedFollowUp: {
          label: '保存后运行完整检查',
          action: 'CONFIRM_AND_DEEP_CHECK',
        },
        refreshType: 'deep',
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.affectedItemIds).toEqual(['item-a', 'item-b']);
    expect(ui.feasibilityAfter).toBe(64);
    expect(ui.executeabilityDelta?.mustHandleDelta).toBe(1);
    expect(ui.conflictsBefore?.mustHandle).toBe(1);
    expect(ui.conflictsAfter?.mustHandle).toBe(2);
    expect(ui.recommendations).toHaveLength(2);
    expect(ui.suggestedFollowUpAction?.label).toContain('完整检查');
    expect(ui.refreshType).toBe('deep');
    expect(ui.diffBullets.some((line) => line.includes('硬冲突'))).toBe(true);
  });

  it('prefers structuredImpact for scores, bullets, schedule, and constraintChanges', () => {
    const ui = mapPreviewImpactToUi(
      {
        feasibilityBefore: 50,
        feasibilityAfter: 70,
        structuredImpact: {
          summaryBullets: [
            '第 2 天可能需拆分…',
            '预计增加 1 晚住宿',
            '当前可执行性从 86 预计变为 63（-23）',
          ],
          executeability: { scoreBefore: 86, scoreAfter: 63, scoreDelta: -23 },
          schedule: {
            daysNeedingSplit: [2],
            extraLodgingNights: 1,
            poisToRelocate: [{ dayNumber: 2, itemId: 'poi-1', label: '黄金圈' }],
          },
          budget: { deltaPct: 12, deltaAmount: 1200, currency: 'CNY' },
          constraintChanges: [
            {
              constraintId: 'c_max_daily_drive',
              name: '每日驾驶上限',
              before: 5,
              after: 3,
              unit: 'hour',
            },
          ],
        },
        recommendations: ['建议缩短第 2 天驾驶时长'],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.feasibilityBefore).toBe(86);
    expect(ui.feasibilityAfter).toBe(63);
    expect(ui.executeabilityDelta?.scoreDelta).toBe(-23);
    expect(ui.diffBullets[0]).toContain('第 2 天');
    expect(ui.adjustmentSummary).toContain('1 天可能需拆分');
    expect(ui.adjustmentSummary).toContain('1 晚住宿');
    expect(ui.affectedDays).toEqual([{ dayNumber: 2, tone: 'major' }]);
    expect(ui.affectedItemIds).toEqual(['poi-1']);
    expect(ui.budgetRows[0]?.delta).toBe(1200);
    expect(ui.structuredImpact?.constraintChanges).toHaveLength(1);
    expect(ui.structuredImpact?.constraintChanges?.[0]?.before).toBe('5 小时');
    expect(ui.planNeedsAdjust).toBe(true);
  });

  it('formats time-object constraintChanges for display', () => {
    const ui = mapPreviewImpactToUi(
      {
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_tpl_earliest_departure',
              name: '最早出发时间',
              before: { time: '08:00' },
              after: { time: '10:00' },
            },
          ],
        },
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.structuredImpact?.constraintChanges?.[0]?.before).toBe('08:00');
    expect(ui.structuredImpact?.constraintChanges?.[0]?.after).toBe('10:00');
  });

  it('formats catalog hard toggle constraintChanges without raw JSON', () => {
    const ui = mapPreviewImpactToUi(
      {
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_tpl_no_unpaved_road',
              name: '不走未铺装道路',
              before: {
                templateId: 'no_unpaved_road',
                unpavedAllowed: false,
                judgmentResult: '路线不得包含非铺装/F路路段',
                violationResult: '阻断执行',
                rule: '路线不得包含非铺装/F路路段',
                violation: '阻断执行',
              },
              after: {
                templateId: 'no_unpaved_road',
                unpavedAllowed: false,
                enabled: true,
                notes: '避开 F 路',
              },
            },
          ],
        },
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.structuredImpact?.constraintChanges?.[0]?.before).toBe('已启用');
    expect(ui.structuredImpact?.constraintChanges?.[0]?.after).toBe(
      '已启用 · 补充：避开 F 路',
    );
  });

  it('formats no_night_drive object constraintChanges and repairs broken userFacingSummary', () => {
    const ui = mapPreviewImpactToUi(
      {
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_no_night_drive',
              name: '不夜驾',
              before: {
                maxMinutesAfterSunset: 30,
                rule: '日落后 30 分钟不得继续驾驶',
              },
              after: {
                maxMinutesAfterSunset: 60,
                enabled: true,
              },
              unit: 'minute',
              userFacingSummary: '不夜驾：[object Object] → [object Object]',
            },
          ],
        },
        diffBullets: ['不夜驾：[object Object] → [object Object]'],
        recommendations: ['不夜驾：[object Object] → [object Object]'],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.structuredImpact?.constraintChanges?.[0]?.before).toBe(
      '日落后 30 分钟内停止驾驶',
    );
    expect(ui.structuredImpact?.constraintChanges?.[0]?.after).toBe(
      '日落后 60 分钟内停止驾驶',
    );
    expect(ui.structuredImpact?.constraintChanges?.[0]?.userFacingSummary).toBe(
      '不夜驾：日落后 30 分钟内停止驾驶 → 日落后 60 分钟内停止驾驶',
    );
    expect(ui.diffBullets[0]).toBe(
      '不夜驾：日落后 30 分钟内停止驾驶 → 日落后 60 分钟内停止驾驶',
    );
    expect(ui.recommendations ?? []).not.toContain(
      '不夜驾：日落后 30 分钟内停止驾驶 → 日落后 60 分钟内停止驾驶',
    );
  });

  it('rewrites engineering recommendation copy for users', () => {
    const ui = mapPreviewImpactToUi(
      {
        recommendations: ['轻量变更已接入 assess 读模型'],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.recommendations?.[0]).toBe('变更已纳入可行性评估，确认后将重新检查是否走得通');
  });

  it('does not duplicate summaryBullets in recommendations', () => {
    const shared = '第 2 天可能需拆分以符合新上限';
    const ui = mapPreviewImpactToUi(
      {
        structuredImpact: { summaryBullets: [shared] },
        recommendations: [shared, '确认后可查看完整检查报告'],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.diffBullets).toContain(shared);
    expect(ui.recommendations).toEqual(['确认后可查看完整检查报告']);
  });
});
