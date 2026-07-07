/** BFF `GET /trips/:tripId/plan-objects` — 日内 PlanObject 链（Phase 4 调试读模型） */

export const PLAN_OBJECT_SCHEMA = 'tripnara.plan_objects@v1' as const;

export type PlanObjectKind = 'STAY' | 'TRANSFER' | 'VISIT' | 'MEAL_WINDOW';

/** 标准链序：STAY → TRANSFER → VISIT → MEAL_WINDOW */
export const PLAN_OBJECT_CHAIN_ORDER: readonly PlanObjectKind[] = [
  'STAY',
  'TRANSFER',
  'VISIT',
  'MEAL_WINDOW',
] as const;

export interface PlanObjectDto {
  id: string;
  kind: PlanObjectKind;
  label?: string;
  startAt?: string;
  endAt?: string;
  placeId?: string;
  itemId?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanObjectDayChainDto {
  dayNumber: number;
  tripDayId?: string;
  objects: PlanObjectDto[];
}

export interface PlanObjectsResponse {
  schema: typeof PLAN_OBJECT_SCHEMA | string;
  tripId: string;
  generatedAt?: string;
  days: PlanObjectDayChainDto[];
}

export interface PlanObjectsQuery {
  dayNumber?: number;
}
