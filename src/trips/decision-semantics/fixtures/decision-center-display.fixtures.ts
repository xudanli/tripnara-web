/**
 * Decision Center 展示层 fixtures（MSW / Storybook / vitest）
 * KNOWN_GAPS P0 — §6.2
 */
import type {
  AffectedScopeDisplay,
  DecisionOption,
  DecisionProblemDetail,
  DecisionTradeoffRow,
} from '@/types/decision-problem';
import {
  mockIdempotentReplayResponse,
  mockPartialApplyResponse,
} from '@/trips/decision-semantics/frontend/decision-center-execution.harness';

export { mockIdempotentReplayResponse, mockPartialApplyResponse };

/** custom-segment-distance-constraint — 用户 380km，文案不含 250 */
export const FIXTURE_ICELAND_ROAD_CLASS_SCOPE: AffectedScopeDisplay[] = [
  {
    scopeType: 'LEG',
    scopeId: 'leg-day6-myvatin-dyr',
    label: '第 6 天 · 米湖 → 迪尔餐厅',
    secondaryLabel: '462km 自驾路段 · 超长距离行驶 (>380km)',
    dayIndex: 6,
    placeNames: ['米湖', '迪尔餐厅'],
  },
];

export function fixtureIcelandRoadClassProblemDetail(
  problemId = 'prob_road_class_iceland',
): DecisionProblemDetail {
  return {
    id: problemId,
    tripId: '3e4a1058-9218-467f-988a-c18008a14385',
    type: 'INFEASIBILITY',
    title: '超长距离行驶',
    status: 'WAITING_DECISION',
    primaryEnforcement: 'BLOCK',
    description: '单段驾驶超过您设定的上限，建议分段或中途住宿。',
    affectedScopeDisplay: FIXTURE_ICELAND_ROAD_CLASS_SCOPE,
    affectedDayNumbers: [6],
  };
}

/** large-shortfall-structural-options — 大缺口只有结构性修法 */
export const FIXTURE_LARGE_SHORTFALL_TRADEOFFS: DecisionTradeoffRow[] = [
  {
    dimension: 'TIME',
    direction: 'IMPROVE',
    value: 1,
    unit: 'DAY',
    explanation: '增加缓冲日，拆分超长路段',
  },
  {
    dimension: 'POI_COVERAGE',
    direction: 'WORSEN',
    explanation: '需跳过部分景点以腾出缓冲',
  },
];

export const FIXTURE_LARGE_SHORTFALL_OPTIONS: DecisionOption[] = [
  {
    id: 'opt_add_buffer_day',
    label: '增加 1 天缓冲',
    executionCapability: 'DIRECT',
    tradeoffs: [FIXTURE_LARGE_SHORTFALL_TRADEOFFS[0]!],
  },
  {
    id: 'opt_split_overnight',
    label: '中途住宿拆段',
    executionCapability: 'GUIDED_MANUAL',
    tradeoffs: [
      {
        dimension: 'COST',
        direction: 'WORSEN',
        explanation: '增加一晚住宿成本',
      },
      {
        dimension: 'TIME',
        direction: 'IMPROVE',
        explanation: '避免单日超长驾驶',
      },
    ],
  },
];

/** 数值 tradeoffs 对比：+30 vs +60 分钟 */
export const FIXTURE_BUFFER_TRADEOFF_OPTIONS: DecisionOption[] = [
  {
    id: 'opt_buffer_30',
    label: '缓冲 +30 分钟',
    tradeoffs: [
      {
        dimension: 'TIME',
        direction: 'WORSEN',
        value: 30,
        unit: 'MINUTE',
        explanation: '当日总时长略增',
      },
    ],
  },
  {
    id: 'opt_buffer_60',
    label: '缓冲 +60 分钟',
    tradeoffs: [
      {
        dimension: 'TIME',
        direction: 'WORSEN',
        value: 60,
        unit: 'MINUTE',
        explanation: '当日总时长略增',
      },
    ],
  },
];

/** idempotent-replay — 第二次 POST */
export const FIXTURE_IDEMPOTENT_REPLAY = mockIdempotentReplayResponse();

/** partially-applied-needs-repair */
export const FIXTURE_PARTIALLY_APPLIED = mockPartialApplyResponse();
