/**
 * 本地 UI 走查：在 .env.development 设置 VITE_READINESS_CASCADE_MOCK=true
 * 当 API 未返回级联 / 三人格数据时注入示例卡片（仅开发环境生效）。
 */
import type { CascadeCausalPreAnalysis, CascadeUiHint } from '@/types/readiness-cascade';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';

export const READINESS_CASCADE_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_READINESS_CASCADE_MOCK === 'true';

export function getReadinessCascadeMockHints(): CascadeUiHint[] {
  return [
    {
      id: 'mock-cascade-1',
      riskLevel: 'CRITICAL',
      message: 'F-road 封闭，第 3 天高地 POI 可能无法按原计划到达。',
      recommendation: 'ASK_USER',
      entityKind: 'POI',
      entityLabel: '斯卡夫塔山',
      userConfirmationRequired: ['是否改订住宿', '是否改走南岸路线'],
      netImpactMinutes: 0,
      absorbedMinutes: 45,
      cascadeConfidence: 0.76,
      propagationHop: 2,
      triggerFactType: 'ROAD',
      triggerSource: 'physical_validator',
    },
    {
      id: 'mock-cascade-2',
      riskLevel: 'HIGH',
      message: '当日行程密度过高，连续驾驶段缺少缓冲。',
      recommendation: 'ADJUST',
      entityKind: 'DAY',
      entityLabel: '第 3 天',
      netImpactMinutes: 35,
      absorbedMinutes: 15,
      cascadeConfidence: 0.62,
      propagationHop: 1,
      triggerFactType: 'ROAD',
      triggerSource: 'readiness_blocker',
    },
  ];
}

export function getReadinessCascadeMockPreAnalysis(): CascadeCausalPreAnalysis {
  return {
    trigger: { factType: 'ROAD' },
    impact: {
      affected: [
        {
          riskLevel: 'CRITICAL',
          message: 'F-road 封闭影响高地段可达性',
          recommendation: 'ASK_USER',
          entityRef: { kind: 'POI', id: 'poi-1', label: '斯卡夫塔山' },
          userConfirmationRequired: ['是否改订住宿'],
          impactAlgebra: {
            netImpactMinutes: 0,
            absorbedMinutes: 45,
            cascadeConfidence: 0.76,
            propagationHop: 2,
          },
        },
        {
          riskLevel: 'HIGH',
          message: '当日行程密度过高，连续驾驶段缺少缓冲',
          recommendation: 'ADJUST',
          entityRef: { kind: 'DAY', id: 'day-3', label: '第 3 天' },
          impactAlgebra: {
            netImpactMinutes: 35,
            absorbedMinutes: 15,
            cascadeConfidence: 0.62,
            propagationHop: 1,
          },
        },
      ],
    },
    coverage: { note: 'mock dev data' },
    analyzedAt: new Date().toISOString(),
  };
}

export function getReadinessGuardianNegotiationMock(): GuardianNegotiationResult {
  return {
    consensus: 'SPLIT',
    summary: '安全与节奏对「改走南岸」方向意见不一，需您确认最终取舍。',
    personas: [
      {
        persona: 'ABU',
        stance: 'CAUTION',
        message: '南岸备选路线可行，但需确认冬季封路信息与备用油站。',
        suggestion: '先查 road.is 当日 F-road 状态再决定。',
      },
      {
        persona: 'DR_DRE',
        stance: 'SUPPORT',
        message: '改走南岸可减轻第 3 天驾驶强度，节奏更可持续。',
      },
      {
        persona: 'NEPTUNE',
        stance: 'NEUTRAL',
        message: '可保留原 POI，将高地段顺延至天气窗口更好的日期。',
        suggestion: '对比「改路线」与「改日期」两种结构调整。',
      },
    ],
    userActionRequired: ['最终路线取舍需您自行确认'],
    analyzedAt: new Date().toISOString(),
  };
}

export function resolveCascadeHintsForDev(hints: CascadeUiHint[] | undefined): {
  hints: CascadeUiHint[];
  isMock: boolean;
} {
  if (hints && hints.length > 0) return { hints, isMock: false };
  if (!READINESS_CASCADE_MOCK_ENABLED) return { hints: [], isMock: false };
  return { hints: getReadinessCascadeMockHints(), isMock: true };
}

export function resolveGuardianNegotiationForDev(
  data: GuardianNegotiationResult | null | undefined
): { data: GuardianNegotiationResult | null; isMock: boolean } {
  if (data && data.personas.length > 0) return { data, isMock: false };
  if (!READINESS_CASCADE_MOCK_ENABLED) return { data: null, isMock: false };
  return { data: getReadinessGuardianNegotiationMock(), isMock: true };
}

export function resolveCascadePreAnalysisForDev(
  preAnalysis: CascadeCausalPreAnalysis | undefined,
  hintsEmpty: boolean
): CascadeCausalPreAnalysis | undefined {
  if (preAnalysis) return preAnalysis;
  if (!READINESS_CASCADE_MOCK_ENABLED || !hintsEmpty) return undefined;
  return getReadinessCascadeMockPreAnalysis();
}
