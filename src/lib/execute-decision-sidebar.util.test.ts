import { describe, expect, it } from 'vitest';
import {
  buildExecuteDecisionSidebarModel,
  resolveExecuteEmergencyContacts,
  resolveExecuteGuidePhone,
} from './execute-decision-sidebar.util';

describe('execute-decision-sidebar.util', () => {
  it('returns empty Plan B cards when no advisory data', () => {
    const model = buildExecuteDecisionSidebarModel({});
    expect(model.plans).toHaveLength(0);
    expect(model.contacts).toHaveLength(0);
    expect(model.aiSuggestion.primary).toContain('暂无实时建议');
  });

  it('reads emergency contacts from trip metadata', () => {
    const contacts = resolveExecuteEmergencyContacts({
      metadata: {
        guidePhone: '+8613800138000',
        guideName: '张导',
        localRescuePhone: '112',
      },
    } as never);
    expect(contacts).toHaveLength(2);
    expect(contacts[0]?.phone).toBe('+8613800138000');
    expect(resolveExecuteGuidePhone({
      metadata: { guideContactPhone: '+8613800138000' },
    } as never)).toBe('+8613800138000');
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
