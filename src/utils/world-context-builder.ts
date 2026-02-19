/**
 * 世界模型上下文构建器
 *
 * 聚合行程、用户体能、路线方向等数据，构建 V2 优化 API 所需的 WorldModelContext
 *
 * @module utils/world-context-builder
 */

import type { TripDetail } from '@/types/trip';
import type { RouteDirection } from '@/types/places-routes';
import type { FitnessProfile } from '@/types/fitness';
import type {
  WorldModelContext,
  PhysicalModelV2,
  HumanModelV2,
  RouteDirectionModelV2,
} from '@/types/optimization-v2';

// ==================== 默认值 ====================

const DEFAULT_WEATHER = {
  temperature: 10,
  windSpeed: 5,
  precipitation: 0.2,
};

const DEFAULT_TERRAIN = {
  elevation: 100,
  gradient: 5,
};

const DEFAULT_HUMAN: HumanModelV2 = {
  fitnessLevel: 0.7,
  currentFatigue: 0.2,
  maxDailyAscentM: 800,
  riskTolerance: 0.5,
};

/** 体能等级映射到 0-1 */
const FITNESS_LEVEL_TO_SCORE: Record<string, number> = {
  LOW: 0.2,
  MEDIUM_LOW: 0.35,
  MEDIUM: 0.5,
  MEDIUM_HIGH: 0.7,
  HIGH: 0.9,
};

// ==================== 构建函数 ====================

/**
 * 从 FitnessProfile 构建 HumanModelV2
 */
function buildHumanFromProfile(profile: FitnessProfile | null | undefined): HumanModelV2 {
  if (!profile) return DEFAULT_HUMAN;

  const fitnessLevel =
    FITNESS_LEVEL_TO_SCORE[profile.fitnessLevel] ??
    profile.overallScore / 100 ??
    0.5;

  return {
    fitnessLevel: Math.min(1, Math.max(0, fitnessLevel)),
    currentFatigue: DEFAULT_HUMAN.currentFatigue,
    maxDailyAscentM: profile.recommendedDailyAscentM ?? DEFAULT_HUMAN.maxDailyAscentM,
    riskTolerance: DEFAULT_HUMAN.riskTolerance,
  };
}

/**
 * 从 RouteDirection 构建 RouteDirectionModelV2
 */
function buildRouteDirectionFromRouteDirection(
  rd: RouteDirection | null | undefined,
  fallbackId: string
): RouteDirectionModelV2 {
  if (!rd) {
    return {
      id: fallbackId,
      philosophy: { scenic: true },
      constraints: { maxDailyDrivingHours: 8 },
    };
  }

  const id = String(rd.id ?? rd.uuid ?? fallbackId);
  const philosophy: RouteDirectionModelV2['philosophy'] =
    rd.tags?.some((t) => t.toLowerCase().includes('scenic'))
      ? { scenic: true }
      : rd.tags?.some((t) => t.toLowerCase().includes('challenging'))
        ? { challenging: true }
        : rd.tags?.some((t) => t.toLowerCase().includes('cultural'))
          ? { cultural: true }
          : { scenic: true };

  const constraints: RouteDirectionModelV2['constraints'] = {
    maxDailyDrivingHours: 8,
    ...rd.constraints?.soft,
  };

  if (rd.constraints?.minDays != null) {
    constraints.minDays = rd.constraints.minDays;
  }
  if (rd.constraints?.maxDays != null) {
    constraints.maxDays = rd.constraints.maxDays;
  }

  return { id, philosophy, constraints };
}

/**
 * 构建 WorldModelContext（V2 优化 API 格式）
 *
 * @param trip - 行程详情（用于推导 routeDirectionId）
 * @param options - 可选数据源
 * @param options.fitnessProfile - 用户体能画像
 * @param options.routeDirection - 路线方向详情
 * @param options.physicalOverrides - 物理环境覆盖（天气、地形、危险）
 * @param options.humanOverrides - 人体状态覆盖
 * @returns WorldModelContext
 *
 * @example
 * ```ts
 * const world = buildWorldModelContext(trip, {
 *   fitnessProfile,
 *   routeDirection,
 *   physicalOverrides: { weather: { temperature: 5 } },
 * });
 * ```
 */
export function buildWorldModelContext(
  trip: TripDetail,
  options?: {
    fitnessProfile?: FitnessProfile | null;
    routeDirection?: RouteDirection | null;
    physicalOverrides?: Partial<PhysicalModelV2>;
    humanOverrides?: Partial<HumanModelV2>;
  }
): WorldModelContext {
  const fallbackRouteId =
    trip.destination?.toLowerCase().replace(/\s+/g, '-') ?? 'default-route';

  const physical: PhysicalModelV2 = {
    weather: options?.physicalOverrides?.weather ?? DEFAULT_WEATHER,
    terrain: options?.physicalOverrides?.terrain ?? DEFAULT_TERRAIN,
    hazards: options?.physicalOverrides?.hazards ?? [],
  };

  const human: HumanModelV2 = {
    ...buildHumanFromProfile(options?.fitnessProfile),
    ...options?.humanOverrides,
  };

  const routeDirection = buildRouteDirectionFromRouteDirection(
    options?.routeDirection,
    fallbackRouteId
  );

  return {
    physical,
    human,
    routeDirection,
  };
}

/**
 * 构建默认 WorldModelContext（用于协商接口补全缺失的 world）
 */
export function getDefaultWorldModelContext(): WorldModelContext {
  return {
    physical: {
      weather: DEFAULT_WEATHER,
      terrain: DEFAULT_TERRAIN,
      hazards: [],
    },
    human: DEFAULT_HUMAN,
    routeDirection: {
      id: 'default-route',
      philosophy: { scenic: true },
      constraints: { maxDailyDrivingHours: 8 },
    },
  };
}
