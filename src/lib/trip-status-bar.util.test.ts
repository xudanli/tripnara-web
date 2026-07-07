import { describe, expect, it } from 'vitest';
import {
  buildTripStatusBarViewModel,
  resolveTripReadinessLevel,
  resolveTripStatusBarCounts,
} from './trip-status-bar.util';
import type { TravelStatusResponse } from '@/api/travel-status.types';

const baseStatus: TravelStatusResponse = {
  executability: {
    status: 'NEEDS_ATTENTION',
    headline: '你的冰岛行程基本可行',
    subheadline: '仍有未确认项',
    issueCount: 2,
  },
  aiCompletedWork: { items: [] },
  openDecisions: [
    {
      problemId: 'p1',
      headline: '第 4 天车辆不适合计划道路',
      impact: 'Landmannalaugar 路线',
      severity: 'BLOCK',
      recommendation: { title: '换车', summary: '', keeps: [], costs: [] },
      actions: { acceptRecommended: { enabled: true } },
    },
    {
      problemId: 'p2',
      headline: '保险底盘保障未确认',
      impact: '涉水路段',
      severity: 'VERIFY',
      recommendation: { title: '补充', summary: '', keeps: [], costs: [] },
      actions: { acceptRecommended: { enabled: false } },
    },
  ],
  monitoring: { activeCount: 6, items: [] },
  effectivePlan: { versionId: 'plan-v12', lastUpdatedAt: new Date().toISOString() },
  automation: {
    defaultLevel: 'SUGGEST',
    defaultLevelLabel: '建议',
    uiLevel: 'L2',
    uiLevelLabel: 'L2',
    tierCounts: { auto: 0, ask: 1, deny: 0 },
    paused: false,
    catalog: { tiers: [], scopes: [] },
  },
  contextSnapshot: { revision: 127 },
};

describe('trip-status-bar.util', () => {
  it('counts blockers and verification separately', () => {
    const counts = resolveTripStatusBarCounts(baseStatus);
    expect(counts.blockers).toBe(1);
    expect(counts.needsConfirm).toBe(1);
    expect(counts.monitoring).toBe(6);
  });

  it('maps readiness from executability and counts', () => {
    expect(
      resolveTripReadinessLevel('BLOCKED', {
        blockers: 1,
        needsConfirm: 0,
        warnings: 0,
        monitoring: 0,
      }),
    ).toBe('ACTION_REQUIRED');
    expect(
      resolveTripReadinessLevel('READY', {
        blockers: 0,
        needsConfirm: 0,
        warnings: 0,
        monitoring: 2,
      }),
    ).toBe('READY_TO_GO');
  });

  it('builds view model with plan version and top issues', () => {
    const vm = buildTripStatusBarViewModel(baseStatus);
    expect(vm.readinessLabel).toBe('需要处理');
    expect(vm.planVersionLabel).toBe('V12');
    expect(vm.topIssues).toHaveLength(2);
    expect(vm.freshnessLabel).toMatch(/计划/);
  });
});
