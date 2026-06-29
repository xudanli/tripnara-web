import { describe, expect, it } from 'vitest';
import { normalizePersonaAlert, normalizePersonaAlerts } from '@/lib/persona-alert.adapter';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';

describe('persona-alert.adapter (M2)', () => {
  it('normalizes presentation supportingLines and hardConstraintBlocked', () => {
    const alert = normalizePersonaAlert({
      id: 'a1',
      persona: 'ABU',
      title: '安全门控拦截',
      explanation: '第 3 天不宜自驾。',
      severity: 'warning',
      created_at: '2026-01-01T00:00:00Z',
      presentation: {
        headline: '安全门控拦截',
        hard_constraint_blocked: true,
        supporting_lines: [
          { persona: 'DR_DRE', icon: 'pace', name: 'Dr.Dre', role: 'pace', text: '节奏也偏紧' },
        ],
      },
      metadata: {
        audience: 'user',
        deep_link: { type: 'feasibility', issue_id: 'issue-1' },
      },
    });

    expect(alert?.presentation?.hardConstraintBlocked).toBe(true);
    expect(alert?.presentation?.supportingLines?.[0]?.text).toBe('节奏也偏紧');
    expect(alert?.metadata?.deepLink).toEqual({ type: 'feasibility', issueId: 'issue-1' });
  });
});

describe('resolveTripPersonaAlerts', () => {
  it('normalizes and filters user-visible alerts', () => {
    const api = normalizePersonaAlerts([
      {
        id: 'api-1',
        persona: 'NEPTUNE',
        title: 'API 提醒',
        explanation: '来自 API',
        severity: 'info',
        createdAt: '2026-01-01T00:00:00Z',
        metadata: { audience: 'user' },
      },
    ]);

    const resolved = resolveTripPersonaAlerts(api);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe('api-1');
  });
});
