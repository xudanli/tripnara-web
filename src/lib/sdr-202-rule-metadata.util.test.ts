import { describe, expect, it } from 'vitest';
import {
  buildNoNightDrivePreviewItemFromEvidence,
  formatNoNightDriveLaneEvidence,
  formatNoNightDrivePreviewDetail,
  isNoNightDriveActivityPreviewItem,
  isNoNightDriveDegradationPreviewItem,
  reprojectNoNightDrivePreviewWithDraft,
  reprojectNoNightDriveTextWithBuffer,
} from './sdr-202-rule-metadata.util';

describe('sdr-202-rule-metadata.util', () => {
  it('formats structured NO_NIGHT_DRIVE lane evidence', () => {
    expect(
      formatNoNightDriveLaneEvidence({
        day: 1,
        segmentLabel: '雷克雅未克 → 维克',
        arriveLocal: '23:40',
        cutoffLocal: '23:57',
        sunsetLocal: '23:27',
        maxMinutesAfterSunset: 30,
      }),
    ).toBe('Day1 · 雷克雅未克 → 维克 · 23:40 结束，截止 23:57 · 日落 23:27 + 30min');
  });

  it('detects activity vs degradation preview items', () => {
    expect(
      isNoNightDriveActivityPreviewItem({
        label: '雷克雅未克 → 维克',
        startTimeLabel: '09:00',
        detail: '预计 23:40 仍在驾驶，超出日落后 30 分钟（日落 23:27，截止 23:57）',
        impactType: 'TIME_WINDOW',
      }),
    ).toBe(true);
    expect(
      isNoNightDriveDegradationPreviewItem({
        label: 'SDR-202',
        detail: '第 1 日日照数据不可用（高纬极昼/极夜），已降级',
      }),
    ).toBe(true);
  });

  it('builds preview item from structured evidence', () => {
    expect(
      buildNoNightDrivePreviewItemFromEvidence({
        evidence: {
          segmentLabel: '雷克雅未克 → 维克',
          sunsetLocal: '23:27',
          cutoffLocal: '23:57',
          arriveLocal: '00:10',
          maxMinutesAfterSunset: 30,
        },
      }),
    ).toEqual({
      label: '雷克雅未克 → 维克',
      detail: '预计 00:10 结束，超出安全截止 23:57（日落 23:27 + 30 分钟，+13min）',
      impactType: 'TIME_WINDOW',
    });
  });

  it('builds degradation preview item from evidence', () => {
    expect(
      buildNoNightDrivePreviewItemFromEvidence({
        evidence: { degradationReason: 'DAYLIGHT_DATA_AMBIGUOUS', day: 1 },
      }),
    ).toEqual({
      label: 'SDR-202',
      detail: '日照数据不可用（高纬极昼/极夜）',
      impactType: 'DEGRADED',
    });
  });

  it('formats preview detail from sunset/cutoff/arrive fields', () => {
    expect(
      formatNoNightDrivePreviewDetail({
        arriveLocal: '23:40',
        cutoffLocal: '23:57',
        sunsetLocal: '23:27',
        maxMinutesAfterSunset: 30,
      }),
    ).toContain('预计 23:40 结束');
  });

  it('reprojects preview text when draft buffer changes 30 → 45', () => {
    const original =
      '驾驶段预计 00:53 结束，超出安全截止 23:34（日落 23:04 + 30 分钟，+79min）';
    const rebuilt = reprojectNoNightDriveTextWithBuffer(original, 45);
    expect(rebuilt).toContain('+ 45 分钟');
    expect(rebuilt).toContain('23:49');
    expect(rebuilt).toContain('+64min');
    expect(rebuilt).not.toContain('+ 30 分钟');
  });

  it('reprojects preview panel fields with draft buffer', () => {
    const preview = reprojectNoNightDrivePreviewWithDraft(
      {
        affectedDays: [{ dayNumber: 1, tone: 'major' }],
        affectedDayDetails: [
          {
            dayNumber: 1,
            items: [
              {
                label: '驾驶段',
                detail:
                  '驾驶段预计 00:53 结束，超出安全截止 23:34（日落 23:04 + 30 分钟，+79min）',
              },
            ],
          },
        ],
        adjustmentSummary: '驾驶段预计 00:53 结束，超出安全截止 23:34（日落 23:04 + 30 分钟，+79min）',
        planLabel: '即时预览',
        planNeedsAdjust: true,
        feasibilityBefore: 49,
        feasibilityAfter: 49,
        budgetRows: [],
        diffBullets: [],
        userSummary: {
          verdict: 'STILL_NOT_EXECUTABLE',
          verdictLabel: '仍不可执行',
          verdictReason:
            '驾驶段预计 00:53 结束，超出安全截止 23:34（日落 23:04 + 30 分钟，+79min）',
        },
        structuredImpact: {
          constraintChanges: [
            {
              constraintId: 'c_no_night_drive',
              before: 30,
              after: 45,
              unit: 'minute',
            },
          ],
        },
      },
      { id: 'no_night_drive', targetValue: 45 },
    );

    expect(preview.userSummary?.verdictReason).toContain('+ 45 分钟');
    expect(preview.affectedDayDetails?.[0]?.items[0]?.detail).toContain('23:49');
  });
});
