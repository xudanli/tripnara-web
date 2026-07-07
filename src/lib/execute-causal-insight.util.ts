import {
  assessmentRedundantWithChainNodes,
  extractCausalInterventionHint,
} from '@/lib/text-dedupe.util';
import { mapExecutionPrimaryEnforcementForBanner } from '@/lib/normalize-trip-execution-advisory.util';
import type { CausalStoryChainNode, CausalStoryView, CausalTraceReplayView } from '@/types/causal-trace';
import type { PrimaryEnforcement } from '@/types/decision-problem';
import type {
  ExecutionCausalInsightDto,
  TripExecutionAdvisoryDto,
} from '@/types/trip-execution-advisory';

export interface ExecuteCausalInsightView {
  guardianHeadline: string;
  primaryEnforcement?: PrimaryEnforcement | string;
  causalStory: CausalStoryView;
  trailingStep?: { label: string; description: string } | null;
  linkedProblemId?: string;
  isDemo?: boolean;
}

/** 设计稿 · 强风蓝湖场景 demo（无 BFF causalInsight 时） */
export const EXECUTE_WIND_CAUSAL_DEMO: ExecuteCausalInsightView = {
  isDemo: true,
  guardianHeadline: '安全提示：蓝湖温泉 → 哈尔格林姆斯教堂 强风下不建议按原计划出发',
  primaryEnforcement: 'REQUIRE_ADJUSTMENT',
  causalStory: {
    traceId: 'execute_wind_demo',
    worldStateVersion: 'ws_demo',
    headline: '强风影响 south_coast 路段通行',
    assessment:
      'south_coast 路段阵风预计较强（约 12 m/s）。按照当前车型和路况，蓝湖温泉 → 哈尔格林姆斯教堂 的 P90 行驶时间约为 1 小时 23 分（基准 46 分）。保持当前出发时间，错过集合/预约的概率约为 78%。最小干预建议将出发时间提前 20 分钟。',
    chain: [
      {
        nodeId: 'w1',
        type: 'WEATHER',
        title: '天气影响',
        description: '预计出现 12 m/s 阵风，影响路段通行速度',
      },
      {
        nodeId: 'w2',
        type: 'TRAVEL_TIME',
        title: '通行耗时',
        description: '该路段 P90 通行时间增加约 23 分钟',
      },
      {
        nodeId: 'w3',
        type: 'RESERVATION',
        title: '预约风险',
        description: '错过预约的概率约为 78%',
      },
    ],
    technicalTraceRef: 'execute_wind_demo',
  },
  trailingStep: {
    label: '决策冲突',
    description:
      'south_coast 路段阵风预计较强（约 12 m/s）。按照当前车型和路况，蓝湖温泉 → 哈尔格林姆斯教堂 的 P90 行驶时间约为 1 小时 23 分（基准 46 分）。保持当前出发时间，错过集合/预约的概率约为 78%。最小干预建议将出发时间提前 20 分钟。',
  },
};

function isWindRelatedAdvisory(advisory: TripExecutionAdvisoryDto): boolean {
  const haystack = [
    advisory.verdict.headline,
    advisory.realtimeRisks.weather,
    advisory.realtimeRisks.road,
    advisory.routeSummary,
    ...advisory.deviations.map((d) => d.message),
  ]
    .filter(Boolean)
    .join(' ');
  return /风|wind|gust/i.test(haystack);
}

function buildChainFromDeviations(advisory: TripExecutionAdvisoryDto): CausalStoryChainNode[] {
  return advisory.deviations
    .map((deviation, index) => {
      const message = deviation.message?.trim();
      if (!message) return null;
      return {
        nodeId: deviation.id || `dev_${index}`,
        type: 'RISK',
        title: deviation.minutesImpact != null ? '通行耗时' : '风险',
        description: message,
      };
    })
    .filter(Boolean) as CausalStoryChainNode[];
}

function resolveTrailingStep(causalStory: CausalStoryView): ExecuteCausalInsightView['trailingStep'] {
  const assessment = causalStory.assessment?.trim();
  if (!assessment) return null;

  const chain = causalStory.chain ?? [];
  if (assessmentRedundantWithChainNodes(assessment, chain)) {
    const hint = extractCausalInterventionHint(assessment);
    if (hint) {
      return { label: '决策冲突', description: hint };
    }
    return {
      label: '决策冲突',
      description: assessment,
    };
  }

  return {
    label: '决策冲突',
    description: assessment,
  };
}

function executionCausalStoryToView(
  embedded: ExecutionCausalInsightDto,
  advisory: TripExecutionAdvisoryDto,
): CausalStoryView {
  const guardianHeadline = embedded.guardianHeadline.trim();
  const traceId = embedded.linkedProblemId ?? `exec_${advisory.tripId}`;

  return {
    traceId,
    worldStateVersion: advisory.date,
    headline: guardianHeadline,
    assessment: embedded.causalStory.assessment,
    chain: embedded.causalStory.chain,
    technicalTraceRef: embedded.linkedProblemId ?? traceId,
  };
}

/** P0 · execution-advisory.causalInsight → 行中视图 */
export function executeCausalInsightFromEmbedded(
  advisory: TripExecutionAdvisoryDto,
  embedded: ExecutionCausalInsightDto,
): ExecuteCausalInsightView {
  const causalStory = executionCausalStoryToView(embedded, advisory);

  return {
    guardianHeadline: embedded.guardianHeadline,
    primaryEnforcement: mapExecutionPrimaryEnforcementForBanner(embedded.primaryEnforcement),
    causalStory,
    trailingStep: resolveTrailingStep(causalStory),
    linkedProblemId: embedded.linkedProblemId,
  };
}

/** Tier-3 · causal-trace replay → 行中视图 */
export function executeCausalInsightFromTraceReplay(
  advisory: TripExecutionAdvisoryDto,
  replay: CausalTraceReplayView,
): ExecuteCausalInsightView {
  const embedded = advisory.causalInsight;
  const story = replay.guardianCausalStoryView ?? replay.causalStoryView;
  const guardianHeadline =
    embedded?.guardianHeadline?.trim() || story.headline?.trim() || advisory.verdict.headline;

  return {
    guardianHeadline,
    primaryEnforcement: mapExecutionPrimaryEnforcementForBanner(
      embedded?.primaryEnforcement,
    ),
    causalStory: story,
    trailingStep: resolveTrailingStep(story),
    linkedProblemId: embedded?.linkedProblemId ?? replay.problemId,
  };
}

/** 首包无 chain 时，用 linkedProblemId 拉 causal-trace */
export function resolveExecuteCausalTraceTier3ProblemId(
  advisory: TripExecutionAdvisoryDto | null | undefined,
): string | null {
  if (!advisory?.causalInsight) return null;

  const embedded = advisory.causalInsight;
  if (embedded.causalStory.chain.length > 0) return null;

  return embedded.linkedProblemId?.trim() || null;
}

export function mergeExecuteCausalInsight(
  advisory: TripExecutionAdvisoryDto | null | undefined,
  traceReplay: CausalTraceReplayView | null | undefined,
  options?: { allowDemoFallback?: boolean },
): ExecuteCausalInsightView | null {
  const fromAdvisory = resolveExecuteCausalInsight(advisory, { allowDemoFallback: false });
  if (fromAdvisory?.causalStory.chain?.length) return fromAdvisory;

  if (advisory && traceReplay) {
    return executeCausalInsightFromTraceReplay(advisory, traceReplay);
  }

  if (fromAdvisory?.guardianHeadline) return fromAdvisory;

  return resolveExecuteCausalInsight(advisory, options);
}

/** 从 execution-advisory 解析行中因果链视图 */
export function resolveExecuteCausalInsight(
  advisory: TripExecutionAdvisoryDto | null | undefined,
  options?: { allowDemoFallback?: boolean },
): ExecuteCausalInsightView | null {
  if (!advisory) return options?.allowDemoFallback ? EXECUTE_WIND_CAUSAL_DEMO : null;

  const embedded = advisory.causalInsight;
  if (embedded) {
    if (embedded.causalStory.chain.length > 0 || embedded.causalStory.assessment) {
      return executeCausalInsightFromEmbedded(advisory, embedded);
    }
    if (embedded.guardianHeadline) {
      return executeCausalInsightFromEmbedded(advisory, {
        ...embedded,
        causalStory: { chain: [], assessment: embedded.causalStory.assessment ?? '' },
      });
    }
  }

  // 首包仅有 deviations 叙述时，尝试合成单步链（BFF 未投影 chain 时的降级）
  if (advisory.deviations.length === 1 && isWindRelatedAdvisory(advisory)) {
    const message = advisory.deviations[0]?.message?.trim();
    if (message) {
      return {
        guardianHeadline: advisory.verdict.headline?.trim() || message.slice(0, 80),
        primaryEnforcement: mapExecutionPrimaryEnforcementForBanner('NOT_EXECUTABLE'),
        causalStory: {
          traceId: `advisory_${advisory.tripId}`,
          worldStateVersion: advisory.date,
          headline: advisory.verdict.headline ?? message,
          assessment: message,
          chain: [
            {
              nodeId: advisory.deviations[0]!.id,
              type: 'WEATHER',
              title: '天气影响',
              description: message,
            },
          ],
          technicalTraceRef: `advisory_${advisory.tripId}`,
        },
        trailingStep: { label: '决策冲突', description: message },
      };
    }
  }

  const partialChain = buildChainFromDeviations(advisory);
  if (partialChain.length >= 2) {
    const guardianHeadline =
      advisory.verdict.headline?.trim() ||
      advisory.realtimeRisks.weather?.trim() ||
      '当前行程存在可预见风险';
    const causalStory: CausalStoryView = {
      traceId: `advisory_${advisory.tripId}`,
      worldStateVersion: advisory.date,
      headline: guardianHeadline,
      assessment: advisory.realtimeRisks.weather ?? '',
      chain: partialChain,
      technicalTraceRef: `advisory_${advisory.tripId}`,
    };
    return {
      guardianHeadline,
      causalStory,
      trailingStep: advisory.realtimeRisks.weather
        ? { label: '决策冲突', description: advisory.realtimeRisks.weather }
        : null,
    };
  }

  if (options?.allowDemoFallback !== false && isWindRelatedAdvisory(advisory)) {
    return EXECUTE_WIND_CAUSAL_DEMO;
  }

  return null;
}
