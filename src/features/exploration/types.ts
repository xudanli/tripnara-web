import type { NormalizedRouteMap } from '@/features/exploration/lib/route-map.util';
import type { ResolvedPoi } from '@/features/poi-resolution/types';

export type ConsumerPrincipleId =
  | 'pace'
  | 'safety'
  | 'experience'
  | 'coverage'
  | 'budget'
  | 'lodging';

export type RouteStyleId = 'relaxed' | 'coverage' | 'remote';

export type RouteStrategyId = 'south-depth' | 'ring-compressed' | 'highland-south';

export type RouteGenerationSource =
  import('./api/types').RouteGenerationSource;

export interface ExplorationConditions {
  destinationLabel: string;
  destinationCode: string;
  monthLabel: string;
  durationDays: number;
  travelersLabel: string;
  budgetLabel: string;
  mobilityLabel: string;
  vehicleLabel: string;
}

export interface ConsumerPrinciple {
  id: ConsumerPrincipleId;
  title: string;
  description: string;
  icon: string;
}

export interface RouteStyleOption {
  id: RouteStyleId;
  title: string;
  description: string;
  icon: string;
  recommendedRouteId: RouteStrategyId;
  recommendationLabel: string;
  traits: string[];
}

/** 比较页卡片 — 仅来自 API，不合并 mock */
export interface CompareRouteCard {
  id: string;
  apiRouteId: string;
  title: string;
  tagline?: string;
  narrative?: string;
  previewSummary?: string;
  generationSource?: RouteGenerationSource;
  badge?: { label: string; tone: 'recommended' | 'niche' };
  gains: string[];
  sacrifices: string[];
  matchScore?: number;
  matchSummary?: string;
  previewMap?: NormalizedRouteMap;
  resolvedPois?: ResolvedPoi[];
}

export interface RouteCandidateMock {
  id: RouteStrategyId;
  title: string;
  tagline: string;
  badge?: { label: string; tone: 'recommended' | 'niche' };
  imageGradient: string;
  audience: string;
  gains: string[];
  sacrifices: string[];
  metrics: {
    drivingHoursPerDay: number;
    drivingLevel: string;
    explorationLevel: string;
    uncertainty: string;
  };
  compare: {
    exploration: { level: string; note: string };
    drivingIntensity: { level: string; note: string };
    experienceDensity: { level: string; note: string };
    stayStability: { level: string; note: string };
    flexibility: { level: string; note: string };
    uncertainty: { level: string; note: string };
  };
  matchScore?: number;
  matchSummary?: string;
  /** 后端 generationSource — 比较页 badge */
  generationSource?: RouteGenerationSource;
  narrative?: string;
  /** 后端 API routeId（如 route_remote-highlands-south） */
  apiRouteId?: string;
  /** 比较页 preview.map — 仅路线折线，无 day 标记 */
  previewMap?: NormalizedRouteMap;
  detail: {
    summary: string;
    totalKm: number;
    avgDrivingHours: number;
    stayChanges: number;
    regions: string[];
    days: Array<{
      day: number;
      theme: string;
      route: string;
      driving: string;
      experience: string;
      stay: string;
      tip?: string;
      highlight?: boolean;
      mapPoint?: { lng: number; lat: number };
    }>;
    /** 详情页完整地图 */
    map?: NormalizedRouteMap;
    highlights: string[];
    preparations: string[];
  };
}
