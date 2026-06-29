import apiClient from './client';
import type { CoverageMapResponse, ScoreFinding, ScoreRisk } from '@/api/readiness';
import type {
  DecisionCheckerEvidenceDto,
  DecisionCheckerImpactDto,
} from '@/types/decision-checker';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { normalizeTripApiFields } from '@/lib/trip-content-mode';
import type {
  JourneyDataFeed,
  JourneyDiversion,
  JourneyMember,
  JourneyMemberGroup,
  JourneyStats,
} from '@/features/full-journey-map/types';
import type {
  JourneyInspectorActivityDetail,
  JourneyInspectorEvidenceCategory,
  JourneyInspectorEvidenceConclusion,
  JourneyInspectorFitAssessment,
  JourneyInspectorRiskView,
  JourneyInspectorRouteEvidenceRow,
  JourneyInspectorWeatherSnapshot,
  JourneyInspectorActivitySourceRow,
  JourneyInspectorDiversionGroupDetail,
} from '@/features/full-journey-map/types-inspector-view';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    const error = new Error(err?.message ?? '请求失败') as Error & { code?: string };
    error.code = err?.code ?? 'UNKNOWN_ERROR';
    throw error;
  }
  if (response.data.data == null) {
    throw new Error('API 响应数据为空');
  }
  return response.data.data;
}

function normalizeEtagValue(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function formatIfNoneMatch(etag: string): string {
  const normalized = normalizeEtagValue(etag) ?? etag;
  if (normalized.startsWith('W/') || (normalized.startsWith('"') && normalized.endsWith('"'))) {
    return normalized;
  }
  return `"${normalized}"`;
}

export function isJourneyMapNotFound(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

export type JourneyMapFields = 'full' | 'minimal';
export type JourneyMapInclude = 'shell' | 'inspector';

export interface JourneyMapDaySummary {
  /** 1-based 行程天序号 */
  day: number;
  routeLabel: string;
}

export interface JourneyMapInspectorPayload {
  evidence: DecisionCheckerEvidenceDto | null;
  impact: DecisionCheckerImpactDto | null;
  scoreRisks: ScoreRisk[];
  scoreFindings: ScoreFinding[];
  /** 按 activityId 索引；include=inspector 二段返回 */
  activityContexts?: JourneyMapInspectorActivityContextDto[];
  /** Inspector 风险 Tab 创建的 open 决策事项 */
  decisionItems?: JourneyMapDecisionItem[];
}

export interface JourneyMapDecisionItem {
  id: string;
  tripId: string;
  activityId: string;
  title: string;
  description?: string;
  severity: 'high' | 'medium' | 'low';
  status: string;
  source: string;
  verdict?: 'executable' | 'caution' | 'blocked';
  riskLabels?: string[];
  createdAt: string;
  createdBy?: string;
}

/** BFF wire · evidenceSources[]（label/status 与 name/updatedAtLabel 二选一） */
export interface JourneyMapInspectorEvidenceSourceWireDto {
  id: string;
  name?: string;
  label?: string;
  category?: JourneyInspectorEvidenceCategory;
  updatedAt?: string;
  updatedAtLabel?: string;
  confidencePercent?: number;
  status?: 'fresh' | 'stale';
}

/** BFF wire · inspector.activityContexts[] */
export interface JourneyMapInspectorMemberRowDto {
  memberId?: string;
  member?: JourneyMember;
  participating: boolean;
  roleLabel?: string;
  tags?: string[];
  alternativePlan?: string;
}

export interface JourneyMapInspectorActivityContextDto {
  activityId: string;
  activityDetail?: JourneyInspectorActivityDetail;
  memberRows?: JourneyMapInspectorMemberRowDto[];
  fitAssessment?: JourneyInspectorFitAssessment;
  diversionDetail?: {
    activityId?: string;
    overview?: string;
    splitTime?: string;
    meetingPoint?: string;
    meetingTime?: string;
    emergencyContact?: string;
    emergencyNote?: string;
    groupA?: JourneyInspectorDiversionGroupDetail;
    groupB?: JourneyInspectorDiversionGroupDetail;
  };
  evidenceSources?: JourneyMapInspectorEvidenceSourceWireDto[];
  weatherSnapshot?: JourneyInspectorWeatherSnapshot;
  routeEvidence?: JourneyInspectorRouteEvidenceRow;
  activitySource?: JourneyInspectorActivitySourceRow;
  evidenceConclusion?: JourneyInspectorEvidenceConclusion;
  riskView?: Partial<JourneyInspectorRiskView> &
    Pick<JourneyInspectorRiskView, 'level' | 'levelLabel' | 'keyRisks'>;
}

export interface JourneyMapInspectorActivityResponse {
  tripId: string;
  activityId: string;
  context: JourneyMapInspectorActivityContextDto;
  evidence: DecisionCheckerEvidenceDto | null;
  impact: DecisionCheckerImpactDto | null;
  etag?: string;
}

export type JourneyMapInspectorActivityFetchResult =
  | { status: 'ok'; data: JourneyMapInspectorActivityResponse; etag?: string }
  | { status: 'not_modified'; etag?: string };

export interface GetInspectorActivityParams {
  fields?: JourneyMapFields;
  ifNoneMatch?: string;
}

/** BFF 读模型 — GET /trips/:tripId/journey-map */
export interface JourneyMapResponse {
  tripId: string;
  /** 响应体指纹（亦在响应头 ETag） */
  etag?: string;
  trip: TripDetail;
  coverage: CoverageMapResponse;
  itineraryItems: ItineraryItemDetail[];
  feasibilityScore?: number;
  travelerCount?: number;
  /** 成员与分组（有则替代前端 travelerCount 占位推算） */
  members?: JourneyMember[];
  memberGroups?: JourneyMemberGroup[];
  /** 分流计划（Inspector 分流 Tab + 统计 diversionCount） */
  diversions?: JourneyDiversion[];
  /** 侧栏统计；缺省时前端从 coverage 推算 */
  stats?: Partial<JourneyStats>;
  /** 侧栏「约束与数据更新」；缺省时从 coverage.dataFreshness 推算 */
  dataFeeds?: JourneyDataFeed[];
  /** 侧栏日程起终点文案；缺省时从 coverage POI 推算 */
  daySummaries?: JourneyMapDaySummary[];
  inspector?: JourneyMapInspectorPayload;
}

export interface GetJourneyMapParams {
  include?: JourneyMapInclude[] | JourneyMapInclude;
  fields?: JourneyMapFields;
  ifNoneMatch?: string;
}

export type JourneyMapFetchResult =
  | { status: 'ok'; data: JourneyMapResponse; etag?: string }
  | { status: 'not_modified'; etag?: string };

function buildIncludeQuery(include?: GetJourneyMapParams['include']): string | undefined {
  if (!include) return undefined;
  return Array.isArray(include) ? include.join(',') : include;
}

export interface CreateJourneyMapDecisionItemRequest {
  activityId: string;
  title: string;
  description?: string;
  severity: 'high' | 'medium' | 'low';
  verdict?: 'executable' | 'caution' | 'blocked';
  riskLabels?: string[];
  constraintsVersion?: number;
}

export interface CreateJourneyMapDecisionItemResponse {
  item: JourneyMapDecisionItem;
  constraintsVersion?: number;
}

export const journeyMapApi = {
  /**
   * 全程地图聚合 BFF
   * GET /trips/:tripId/journey-map
   */
  get: async (tripId: string, params?: GetJourneyMapParams): Promise<JourneyMapFetchResult> => {
    const query: Record<string, string> = {};
    const include = buildIncludeQuery(params?.include);
    if (include) query.include = include;
    if (params?.fields) query.fields = params.fields;

    const response = await apiClient.get<ApiResponseWrapper<JourneyMapResponse>>(
      `/trips/${tripId}/journey-map`,
      {
        params: Object.keys(query).length > 0 ? query : undefined,
        headers: params?.ifNoneMatch
          ? { 'If-None-Match': formatIfNoneMatch(params.ifNoneMatch) }
          : undefined,
        validateStatus: (status) => status === 200 || status === 304,
      },
    );

    const headerEtag =
      (response.headers?.etag as string | undefined) ??
      (response.headers?.ETag as string | undefined);

    if (response.status === 304) {
      return {
        status: 'not_modified',
        etag: normalizeEtagValue(headerEtag ?? params?.ifNoneMatch),
      };
    }

    const data = handleResponse(response);
    const etag = normalizeEtagValue(headerEtag ?? data.etag);
    return {
      status: 'ok',
      data: {
        ...data,
        trip: normalizeTripApiFields(data.trip),
      },
      etag,
    };
  },

  /**
   * 单活动 Inspector 懒加载
   * GET /trips/:tripId/journey-map/inspector/activities/:activityId
   */
  getInspectorActivity: async (
    tripId: string,
    activityId: string,
    params?: GetInspectorActivityParams,
  ): Promise<JourneyMapInspectorActivityFetchResult> => {
    const query: Record<string, string> = {};
    if (params?.fields) query.fields = params.fields;

    const response = await apiClient.get<ApiResponseWrapper<JourneyMapInspectorActivityResponse>>(
      `/trips/${tripId}/journey-map/inspector/activities/${encodeURIComponent(activityId)}`,
      {
        params: Object.keys(query).length > 0 ? query : undefined,
        headers: params?.ifNoneMatch
          ? { 'If-None-Match': formatIfNoneMatch(params.ifNoneMatch) }
          : undefined,
        validateStatus: (status) => status === 200 || status === 304,
      },
    );

    const headerEtag =
      (response.headers?.etag as string | undefined) ??
      (response.headers?.ETag as string | undefined);

    if (response.status === 304) {
      return {
        status: 'not_modified',
        etag: normalizeEtagValue(headerEtag ?? params?.ifNoneMatch),
      };
    }

    const data = handleResponse(response);
    const etag = normalizeEtagValue(headerEtag ?? data.etag);
    return {
      status: 'ok',
      data: { ...data, etag },
      etag,
    };
  },

  /**
   * Inspector 风险 Tab · 创建决策事项
   * POST /trips/:tripId/decision-items
   */
  createDecisionItem: async (
    tripId: string,
    body: CreateJourneyMapDecisionItemRequest,
  ): Promise<CreateJourneyMapDecisionItemResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateJourneyMapDecisionItemResponse>>(
      `/trips/${tripId}/decision-items`,
      body,
    );
    return handleResponse(response);
  },
};
