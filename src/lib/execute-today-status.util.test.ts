import { describe, expect, it } from 'vitest';
import {
  buildExecuteTodayStatusSnapshot,
  formatVisibilityLabel,
  resolveTripTimezoneLabel,
} from './execute-today-status.util';

describe('execute-today-status.util', () => {
  it('resolveTripTimezoneLabel returns GMT+0 for Iceland', () => {
    expect(resolveTripTimezoneLabel('IS')).toBe('GMT+0');
  });

  it('formatVisibilityLabel maps meters to Chinese labels', () => {
    expect(formatVisibilityLabel(800)).toBe('目标区能见度较低');
    expect(formatVisibilityLabel(3000)).toBe('目标区能见度中等');
  });

  it('buildExecuteTodayStatusSnapshot assembles weather and delay fields', () => {
    const snapshot = buildExecuteTodayStatusSnapshot({
      destination: 'IS',
      locationLabel: '丁基达尔斯村 (Túni 2)',
      executionAdvisory: {
        tripId: 't1',
        dayNumber: 1,
        date: '2026-07-16',
        currentState: {
          currentTime: '2026-07-06T11:32:00Z',
          delayMinutes: 35,
        },
        verdict: { status: 'AT_RISK', headline: '强风影响' },
        impacts: { affectedItems: [] },
        deviations: [],
        recommendations: [],
        realtimeRisks: { weather: '强风' },
        evidence: { weatherAsOf: '2026-07-06T08:30:00Z' },
      },
      weather: {
        temperature: 8,
        condition: 'windy',
        windSpeed: 18,
        windDirection: 90,
        humidity: 70,
        visibility: 3000,
        alerts: [{ type: 'wind', severity: 'critical', title: '强风', description: '', effectiveTime: '' }],
        lastUpdated: '2026-07-06T08:30:00Z',
        source: 'apis.is',
        metadata: { windGust: 22 },
      },
      environmentEvents: [],
      now: new Date('2026-07-06T11:32:00Z'),
    });

    expect(snapshot.currentTime).toBe('11:32');
    expect(snapshot.timezoneLabel).toBe('GMT+0');
    expect(snapshot.updatedAt).toBe('08:30');
    expect(snapshot.locationLabel).toBe('丁基达尔斯村 (Túni 2)');
    expect(snapshot.weatherRisks?.badges[0]?.label).toBe('强风预警');
    expect(snapshot.weatherRisks?.windGust).toBe(22);
    expect(snapshot.weatherRisks?.visibilityLabel).toBe('目标区能见度中等');
    expect(snapshot.delayMinutes).toBe(35);
  });
});
