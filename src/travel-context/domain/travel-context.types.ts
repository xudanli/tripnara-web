import type { TravelContextStage, TravelContextViewName } from './travel-context.constants';

export interface TravelContextIdentity {
  contextId: string;
  stage: TravelContextStage;
  tripId?: string | null;
  scenarioId?: string | null;
}

export interface TravelContextMeta {
  revision: number;
  snapshotId: string;
  updatedAt?: string;
}

export interface TravelContextSnapshot {
  identity: TravelContextIdentity;
  meta: TravelContextMeta;
  /** Full snapshot payload — domain-specific; prefer views for UI reads */
  archive?: Record<string, unknown>;
}

export interface TravelContextViewEnvelope<T = Record<string, unknown>> {
  contextId: string;
  view: TravelContextViewName;
  revision: number;
  snapshotId: string;
  generatedAt?: string;
  data: T;
}
