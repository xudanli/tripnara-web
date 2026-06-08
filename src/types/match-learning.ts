/**
 * Match Learning API 契约类型
 * @see Decision OS · Match Learning 前端/运维集成说明 · P3
 */

/** 当前生效的 Soft Weights（与 Odyssey / Match Square 撮合共用） */
export type MatchLearningWeights = {
  ei: number;
  tf: number;
  energy: number;
  ambiguity: number;
};

/** GET /api/match-learning/weights */
export type MatchLearningWeightsSnapshot = {
  weights: MatchLearningWeights;
  version: number;
  lastRunAt: string;
  updatedAt: string;
};

export type MatchLearningRunStatus = 'success' | 'failed' | 'skipped';

/** GET /api/match-learning/weights/runs */
export type MatchLearningRunRecord = {
  id: string;
  runAt: string;
  status: MatchLearningRunStatus;
  sampleCount?: number;
  positiveAdjustments?: number;
  negativeAdjustments?: number;
  previousVersion?: number;
  newVersion?: number;
  notes?: string | null;
};

export type MatchLearningRunsResponse = {
  runs: MatchLearningRunRecord[];
};

/** POST /api/match-learning/weights/run-weekly */
export type MatchLearningManualRunResult = MatchLearningWeightsSnapshot & {
  triggeredBy: 'manual';
};

export const MATCH_LEARNING_WEIGHT_LABELS: Record<keyof MatchLearningWeights, string> = {
  ei: '社交能量 E/I',
  tf: '决策风格 T/F',
  energy: '精力节奏',
  ambiguity: '模糊容忍',
};
