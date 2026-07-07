/** POI Resolution — 对齐 /api/poi/resolve 与 /api/poi/confirm */

export type PoiResolutionStatus =
  | 'MATCHED'
  | 'NEEDS_CONFIRMATION'
  | 'AMBIGUOUS'
  | 'NOT_FOUND';

export type PoiResolutionMethod = 'REGISTRY' | 'ALIAS' | 'AI' | 'HUMAN';

export interface PoiEvidenceStep {
  type: string;
  query?: string;
  label?: string;
  poiId?: string;
  canonicalName?: string;
  confidence?: number;
}

export interface PoiResolveCandidate {
  poiId: string;
  canonicalName?: string;
  slug?: string;
  confidence?: number;
}

/** Issues API — POI 确认上下文（cpre = consumer POI resolution evidence） */
export interface CprePoiIssueContext {
  queryName: string;
  countryCode?: string;
  locale?: string;
  routeId?: string;
  canonicalName?: string;
  poiId?: string;
  confidence?: number;
  status?: PoiResolutionStatus;
  candidates?: PoiResolveCandidate[];
}

export interface ResolvedPoi {
  name: string;
  canonicalName?: string;
  poiId?: string;
  confidence?: number;
  resolved?: boolean;
  status?: PoiResolutionStatus;
  method?: PoiResolutionMethod;
  evidence?: PoiEvidenceStep[];
  /** resolve 响应中附带的候选，供确认弹层直接使用 */
  candidates?: PoiResolveCandidate[];
}

export interface ResolvePoiRequest {
  name: string;
  countryCode: string;
  locale?: string;
}

export interface ResolvePoiResponse {
  status?: PoiResolutionStatus;
  poiId?: string;
  canonicalName?: string;
  confidence?: number;
  method?: PoiResolutionMethod;
  evidence?: PoiEvidenceStep[];
  candidates?: PoiResolveCandidate[];
}

export interface ConfirmPoiRequest {
  queryName: string;
  selectedPoiId: string;
  countryCode: string;
  locale: string;
}

export interface ConfirmPoiResponse {
  status: 'MATCHED';
  method: 'HUMAN';
  poiId: string;
  canonicalName?: string;
  confidence?: number;
  evidence?: PoiEvidenceStep[];
}

export interface PoiResolutionBadge {
  label: string;
  tone: 'success' | 'warning' | 'muted';
  actionLabel?: string;
}

export interface PoiChipViewModel {
  key: string;
  label: string;
  poiId?: string;
  badge: PoiResolutionBadge;
  needsAction: boolean;
  poi: ResolvedPoi;
}

export interface EvidenceChainStep {
  title: string;
  subtitle: string;
}
