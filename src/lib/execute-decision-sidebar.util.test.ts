import { describe, expect, it } from 'vitest';
import { buildExecuteDecisionSidebarModel } from './execute-decision-sidebar.util';

describe('execute-decision-sidebar.util', () => {
  it('returns default Plan B cards when no advisory data', () => {
    const model = buildExecuteDecisionSidebarModel({});
    expect(model.plans).toHaveLength(3);
    expect(model.plans[0]?.recommended).toBe(true);
    expect(model.plans[0]?.code).toBe('Plan B-1');
    expect(model.contacts.length).toBeGreaterThan(0);
    expect(model.aiSuggestion.primary).toContain('Plan B-1');
  });

  it('maps advisory recommendations to plan cards', () => {
    const model = buildExecuteDecisionSidebarModel({
      advisory: {
        tripId: 't1',
        dayNumber: 3,
        date: '2026-06-29',
        currentState: { currentTime: '11:00', delayMinutes: 0 },
        verdict: { status: 'AT_RISK', headline: '强风影响徒步' },
        impacts: { affectedItems: [] },
        deviations: [{ id: 'd1', message: '阵风 22m/s' }],
        recommendations: [
          {
            id: 'r1',
            label: '推迟徒步',
            description: '等待风减弱',
            isRecommended: true,
            impactSummary: '+1h',
          },
        ],
        realtimeRisks: { weather: '强风持续' },
        evidence: {},
      },
    });
    expect(model.plans[0]?.title).toBe('推迟徒步');
    expect(model.aiSuggestion.primary).toContain('推迟徒步');
  });
});
