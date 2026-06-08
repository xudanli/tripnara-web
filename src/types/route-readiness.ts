/**
 * P2/P1 GET /api/readiness/route-directions/:id?longestHike=&plannedDate=&hikePlanId=
 */

import type { DayPaceVerdict } from '@/types/hiking';

export type RouteReadinessLevel = 'ready' | 'caution' | 'not_ready' | 'blocked' | string;

export type RouteReadinessBlocker = {
  code: string;
  messageZh: string;
  severity?: 'error' | 'warning' | 'info' | string;
};

export type RouteReadinessFactor = {
  label: string;
  score: number;
  detailZh?: string;
};

/** F9 四象限 */
export type RouteReadinessFactors = {
  season: RouteReadinessFactor;
  weather: RouteReadinessFactor;
  terrain: RouteReadinessFactor;
  fitness: RouteReadinessFactor;
};

export type RouteDirectionReadinessResponse = {
  routeDirectionId: number;
  score: number;
  level: RouteReadinessLevel;
  blockers: RouteReadinessBlocker[];
  factors?: RouteReadinessFactors;
  fitnessVerdict?: string;
  dayPaceVerdict?: DayPaceVerdict[];
  longestHikeUsed?: number;
  suggestedDays?: number;
  routeSuggestedDays?: number;
  headlineZh?: string;
  summaryZh?: string;
};
