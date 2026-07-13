import type {
  MatchLearningManualRunResult,
  MatchLearningRunsResponse,
  MatchLearningWeightsSnapshot,
} from '@/types/match-learning';

let snapshot: MatchLearningWeightsSnapshot = {
  weights: { ei: 0.25, tf: 0.3, energy: 0.25, ambiguity: 0.2 },
  version: 3,
  lastRunAt: '2026-06-10T04:00:00.000Z',
  updatedAt: '2026-06-10T04:00:01.000Z',
};

let runs: MatchLearningRunsResponse['runs'] = [
  {
    id: 'run-3',
    runAt: '2026-06-10T04:00:00.000Z',
    status: 'success',
    sampleCount: 128,
    positiveAdjustments: 42,
    negativeAdjustments: 17,
    previousVersion: 2,
    newVersion: 3,
    notes: 'Q5≥4 正向样本上调 plan 维度；Q1/Q3 低分强化冲突扣分',
  },
  {
    id: 'run-2',
    runAt: '2026-06-03T04:00:00.000Z',
    status: 'success',
    sampleCount: 96,
    positiveAdjustments: 31,
    negativeAdjustments: 12,
    previousVersion: 1,
    newVersion: 2,
  },
];

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const matchLearningMockStore = {
  getWeights: (): Promise<MatchLearningWeightsSnapshot> => delay({ ...snapshot }),

  getRuns: (): Promise<MatchLearningRunsResponse> => delay({ runs: [...runs] }),

  runWeekly: (): Promise<MatchLearningManualRunResult> => {
    const next: MatchLearningWeightsSnapshot = {
      weights: {
        ei: Math.min(0.4, snapshot.weights.ei + 0.01),
        tf: snapshot.weights.tf,
        energy: Math.min(0.35, snapshot.weights.energy + 0.005),
        ambiguity: Math.max(0.15, snapshot.weights.ambiguity - 0.005),
      },
      version: snapshot.version + 1,
      lastRunAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    runs = [
      {
        id: `run-${next.version}`,
        runAt: next.lastRunAt,
        status: 'success',
        sampleCount: 24,
        positiveAdjustments: 8,
        negativeAdjustments: 3,
        previousVersion: snapshot.version,
        newVersion: next.version,
        notes: '手动触发（Staging mock）',
      },
      ...runs,
    ];
    snapshot = next;
    return delay({ ...next, triggeredBy: 'manual' });
  },
};
