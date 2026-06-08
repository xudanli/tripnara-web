/**
 * GET /trips/:id — 按日徒步卡片 & Trail 段总览
 * @see tripDay.hikingDayCard · trip.hikingTrailSegments
 */

/** 全程 Trail 段总览（如朗格迈维卢尔 4 日） */
export interface HikingTrailSegment {
  day: number;
  theme: string;
  distanceKm: number;
  ascentM: number;
  suitable?: boolean;
  noteZh?: string;
  trailName?: string;
  label?: string;
}

/** 某一 TripDay 上的徒步日卡片（休整日无此字段或为 null） */
export interface HikingDayCard extends HikingTrailSegment {
  dayLabel?: string;
  title?: string;
  isRestDay?: boolean;
  kind?: 'hike' | 'rest' | string;
  hikePlanId?: string;
  routeDirectionId?: number;
  segmentId?: string;
  readinessLevel?: string;
}
