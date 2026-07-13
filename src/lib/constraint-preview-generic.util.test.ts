import { describe, expect, it } from 'vitest';
import {
  applyGenericQuickPreviewPresentation,
  isGenericQuickPreviewImpact,
  isGenericQuickPreviewBullet,
} from './constraint-preview-generic.util';
import { mapPreviewImpactToUi } from './trip-constraints.adapter';
import { EMPTY_CONSTRAINT_IMPACT_PREVIEW } from '@/components/plan-studio/workbench/constraint-console-types';

describe('constraint-preview-generic.util', () => {
  it('detects identical BFF quick snapshot payloads', () => {
    const payload = {
      refreshType: 'quick' as const,
      affectedDays: [1, 2, 3, 4],
      conflictsBefore: { mustHandle: 6, suggestAdjust: 0, pendingConfirm: 0 },
      conflictsAfter: undefined,
    };
    expect(isGenericQuickPreviewImpact(payload)).toBe(true);
    expect(isGenericQuickPreviewBullet('当前有 6 条必处理项，保存后将重算')).toBe(true);
  });

  it('replaces fabricated day counts with constraint-specific summary', () => {
    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'quick',
        affectedDays: [1, 2, 3, 4],
        conflictsBefore: { mustHandle: 6, suggestAdjust: 0, pendingConfirm: 0 },
        diffBullets: [
          '变更尚未保存，保存后将重新检查是否走得通',
          '不走未铺装道路：已启用 → 未启用',
          '当前有 6 条必处理项，保存后将重算',
        ],
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_tpl_no_unpaved_road',
              name: '不走未铺装道路',
              before: { enabled: true, templateId: 'no_unpaved_road' },
              after: { enabled: false, templateId: 'no_unpaved_road' },
            },
          ],
        },
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.isTripSnapshotOnly).toBe(true);
    expect(ui.affectedDays).toEqual([]);
    expect(ui.adjustmentSummary).toContain('不走未铺装道路');
    expect(ui.adjustmentSummary).not.toContain('1 处主要调整');
    expect(ui.diffBullets).toEqual(['不走未铺装道路：已启用 → 未启用']);
  });

  it('does not treat deep preview with after conflicts as generic', () => {
    const preview = applyGenericQuickPreviewPresentation(
      {
        ...EMPTY_CONSTRAINT_IMPACT_PREVIEW,
        affectedDays: [{ dayNumber: 2, tone: 'major' }],
        adjustmentSummary: '第 2 天需拆分',
        diffBullets: ['第 2 天驾驶超时'],
        recommendation: '建议拆分',
        planLabel: '深度预览',
        planNeedsAdjust: true,
        feasibilityBefore: 50,
        feasibilityAfter: 40,
        budgetRows: [],
      },
      {
        refreshType: 'deep',
        affectedDays: [{ dayNumber: 2, tone: 'major' }],
        conflictsBefore: { mustHandle: 2 },
        conflictsAfter: { mustHandle: 1 },
      },
    );

    expect(preview.isTripSnapshotOnly).toBe(false);
    expect(preview.affectedDays).toHaveLength(1);
  });

  it('accepts new BFF constraint-scoped preview payloads', () => {
    expect(
      isGenericQuickPreviewImpact({
        refreshType: 'quick',
        affectedDays: [{ dayNumber: 1, tone: 'major' }],
        conflictsBefore: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        conflictsAfter: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        executeabilityDelta: { mustHandleDelta: 0, scoreDeltaReason: '驾驶上限未改善' },
        userSummary: {
          verdict: 'STILL_NOT_EXECUTABLE',
          verdictLabel: '仍不可执行',
          verdictReason: '第 1 天驾驶 21 小时 26 分钟，仍超过 5 小时上限',
        },
        structuredImpact: {
          schedule: {
            affectedDays: [{ dayNumber: 1, tone: 'major' }],
          },
        },
      }),
    ).toBe(false);

    const ui = mapPreviewImpactToUi(
      {
        refreshType: 'quick',
        conflictsBefore: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        conflictsAfter: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        affectedDays: [{ dayNumber: 1, tone: 'major' }],
        userSummary: {
          verdict: 'STILL_NOT_EXECUTABLE',
          verdictLabel: '仍不可执行',
          verdictReason: '第 1 天驾驶 21 小时 26 分钟，仍超过 5 小时上限',
          confidence: 'HIGH',
        },
        executeabilityDelta: {
          mustHandleDelta: 0,
          scoreDeltaReason: '本约束仍被 SDR-101 阻断',
          blockingRuleIds: ['SDR-101'],
          conflictsDeltaSummary: {
            mustHandle: { before: 1, after: 1, label: '驾驶上限相关必处理仍为 1 项' },
          },
        },
        meta: {
          debug: {
            tripLevelConflictsBefore: { mustHandle: 6, suggestAdjust: 1, pendingConfirm: 3 },
            tripLevelConflictsAfter: { mustHandle: 6, suggestAdjust: 1, pendingConfirm: 3 },
          },
        },
        structuredImpact: {
          schedule: {
            affectedDays: [{ dayNumber: 1, tone: 'major' }],
          },
          constraintChanges: [
            {
              constraintId: 'c_max_daily_drive',
              name: '每日驾驶上限',
              before: 6,
              after: 5,
              unit: 'hour',
            },
          ],
        },
        diffBullets: [
          '第 1 天驾驶 21 小时 26 分钟，仍超过 5 小时上限',
          '当前有 6 条必处理项，保存后将重算',
        ],
      },
      EMPTY_CONSTRAINT_IMPACT_PREVIEW,
    );

    expect(ui.isTripSnapshotOnly).toBe(false);
    expect(ui.affectedDays).toEqual([{ dayNumber: 1, tone: 'major' }]);
    expect(ui.conflictsBefore?.mustHandle).toBe(1);
    expect(ui.tripLevelConflicts?.before?.mustHandle).toBe(6);
    expect(ui.adjustmentSummary).toContain('必处理 1 项');
    expect(ui.diffBullets).not.toContain('当前有 6 条必处理项，保存后将重算');
    expect(ui.executeabilityDelta?.conflictsDeltaSummary?.mustHandle).toContain('驾驶上限');
  });

  it('does not treat quick TEP activity preview as generic trip snapshot', () => {
    expect(
      isGenericQuickPreviewImpact({
        refreshType: 'quick',
        affectedDays: [1, 2, 3, 4],
        scheduleDetailLevel: 'activity',
        affectedDayDetails: [
          {
            dayNumber: 1,
            items: [
              {
                label: '雷克雅未克 → 维克',
                startTimeLabel: '09:00',
                detail: '本段驾驶约 2h40m，当日累计 21h26m',
              },
            ],
          },
        ],
        conflictsBefore: { mustHandle: 1 },
        conflictsAfter: { mustHandle: 0 },
      }),
    ).toBe(false);
  });
});
