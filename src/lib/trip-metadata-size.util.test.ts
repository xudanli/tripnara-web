import { describe, expect, it } from 'vitest';
import { analyzeTripMetadataSize, formatTripMetadataSizeHint } from './trip-metadata-size.util';

describe('trip-metadata-size.util', () => {
  it('ranks keys by serialized size', () => {
    const report = analyzeTripMetadataSize({
      maxDailyDrivingHours: 4,
      itineraryPresentation: { days: Array.from({ length: 200 }, (_, i) => ({ day: i, cards: 'x'.repeat(80) })) },
      dayThemes: { '1': '主题' },
    });

    expect(report.entries[0]?.key).toBe('itineraryPresentation');
    expect(report.totalBytes).toBeGreaterThan(1000);
    expect(report.overLimit).toBe(report.totalBytes > report.limitBytes);
  });

  it('formats user-facing hint with top offenders', () => {
    const hint = formatTripMetadataSizeHint({
      itineraryPresentation: { days: [{ day: 1, cards: 'x'.repeat(500) }] },
      maxDailyDrivingHours: 4,
    });

    expect(hint).toContain('占用较大的字段');
    expect(hint).toContain('itineraryPresentation');
    expect(hint).toContain('需后端清理');
  });
});
