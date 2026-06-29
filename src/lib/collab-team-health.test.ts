import { describe, expect, it } from 'vitest';
import { buildTeamHealth } from './collab-team-health';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { FrictionRadarData } from '@/types/trip-decision-profiling';

const baseFriction: FrictionRadarData = {
  tripId: 't1',
  completionRate: 80,
  completedCount: 4,
  memberCount: 5,
  frictionMatrix: [],
  highRiskAlerts: [{ id: 'a1', title: '节奏', severity: 'high', summary: 'test' }],
  compatibility: {
    paceSyncPct: 70,
    budgetOverlapPct: 65,
    styleSimilarityPct: 72,
    overallScore: 68,
    band: 'moderate',
    bandLabel: '中度摩擦',
  },
  computedAt: '2026-01-01T00:00:00Z',
};

const tasks: DomainNegotiationTask[] = [
  {
    id: 'n1',
    title: '预算',
    domain: 'budget',
    status: 'in_discussion',
    crossLevel: 'medium',
    activeRoundId: 'r1',
  } as DomainNegotiationTask,
  {
    id: 'n2',
    title: '住宿',
    domain: 'accommodation',
    status: 'consensus_reached',
    crossLevel: 'low',
    activeRoundId: null,
  } as DomainNegotiationTask,
];

describe('buildTeamHealth', () => {
  it('uses friction-radar source when API data exists', () => {
    const { health, source } = buildTeamHealth(baseFriction, null, tasks);
    expect(source).toBe('friction-radar');
    expect(health.participation).toBe(80);
    expect(health.conflictLevel).toBeGreaterThan(0);
  });

  it('falls back to heuristic when friction radar is missing', () => {
    const { source, health } = buildTeamHealth(null, { teamCompletionRate: 55 } as never, []);
    expect(source).toBe('heuristic');
    expect(health.participation).toBe(55);
  });
});
