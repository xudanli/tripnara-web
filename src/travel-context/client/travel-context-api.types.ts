import type {
  TravelContextIntentType,
  TravelContextStage,
  TravelContextViewName,
} from '../domain/travel-context.constants';
import type {
  TravelContextSnapshot,
  TravelContextViewEnvelope,
} from '../domain/travel-context.types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export interface TravelContextViewsIndex {
  contextId: string;
  revision: number;
  views: TravelContextViewName[];
}

export interface TravelContextResolveView {
  contextId: string;
  revision: number;
  snapshotId: string;
  stage: TravelContextStage;
  tripId?: string | null;
}

export interface TravelContextIntentRequest {
  type: TravelContextIntentType;
  basedOnRevision: number;
  payload?: Record<string, unknown>;
}

export interface TravelContextIntentResult {
  contextId: string;
  revision: number;
  snapshotId: string;
  stage: TravelContextStage;
  intentType: TravelContextIntentType;
}

export interface TravelContextDiff {
  contextId: string;
  fromRevision: number;
  toRevision: number;
  requiresFullRefresh: boolean;
  changedViews?: TravelContextViewName[];
}

export interface TravelContextRevisionEvent {
  type: 'CONTEXT_REVISION_CHANGED';
  contextId: string;
  revision: number;
  snapshotId: string;
}

export interface TravelContextProviderOptions {
  contextId: string;
  token: string;
  baseUrl?: string;
  prefetchViews?: TravelContextViewName[];
  subscribeRevisionEvents?: boolean;
}

export interface TravelContextProviderState {
  contextId: string;
  revision: number;
  snapshotId: string;
  stage: TravelContextStage;
  views: Partial<Record<TravelContextViewName, TravelContextViewEnvelope>>;
  loading: boolean;
  error?: string;
  snapshot?: TravelContextSnapshot;
}

export interface TravelContextProvider {
  getState: () => TravelContextProviderState;
  subscribe: (listener: () => void) => () => void;
  refresh: () => Promise<void>;
  getView: <T = Record<string, unknown>>(
    view: TravelContextViewName,
  ) => Promise<TravelContextViewEnvelope<T>>;
  resolveFromTrip: (tripId: string) => Promise<TravelContextResolveView>;
  submitIntent: (intent: TravelContextIntentRequest) => Promise<TravelContextIntentResult>;
  fetchDiff: (sinceRevision: number) => Promise<TravelContextDiff>;
  subscribeRevisionEvents: () => () => void;
}
