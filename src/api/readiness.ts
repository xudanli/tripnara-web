import apiClient from './client';
import type {
  ReadinessStatus,
  ReadinessScore,
  Blocker,
  RepairOption,
  EvidenceItem,
  ReadinessData,
} from '@/types/readiness';

// 文档中的响应格式是 { success: true, data: T }
interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

// 辅助函数：处理API响应
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }
  return response.data.data;
}

// ==================== 请求类型 ====================

export interface CheckReadinessDto {
  destinationId: string;
  traveler?: {
    nationality?: string;
    residencyCountry?: string;
    tags?: string[];
    budgetLevel?: 'low' | 'medium' | 'high';
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  trip?: {
    startDate?: string;
    endDate?: string;
  };
  itinerary?: {
    countries?: string[];
    activities?: string[];
    season?: string;
    region?: string;
    hasSeaCrossing?: boolean;
    hasAuroraActivity?: boolean;
    vehicleType?: string;
    routeLength?: number;
  };
  geo?: {
    lat?: number;
    lng?: number;
    enhanceWithGeo?: boolean;
  };
}

export interface ReadinessFindingItem {
  message: string;
  tasks?: string[];
  evidence?: string;
  deadline?: string | null;
  channel?: string | null;
}

export interface ReadinessFinding {
  category: string;
  blockers: ReadinessFindingItem[];
  must: ReadinessFindingItem[];
  should: ReadinessFindingItem[];
  optional: ReadinessFindingItem[];
  risks?: Risk[];
}

export interface Risk {
  type: string;
  severity: 'high' | 'medium' | 'low';
  summary?: string;
  message?: string;
  mitigation?: string[];
  emergencyContacts?: string[];
}

export interface Constraint {
  type: string;
  message: string;
}

export interface ReadinessCheckResult {
  findings: ReadinessFinding[];
  summary: {
    totalBlockers: number;
    totalMust: number;
    totalShould: number;
    totalOptional: number;
  };
  risks: Risk[];
  constraints: Constraint[];
}

export interface CapabilityPack {
  type: string;
  displayName: string;
  description: string;
}

export interface CapabilityPackEvaluateResult {
  pack: CapabilityPack;
  triggered: boolean;
  reason?: string;
}

export interface PersonalizedChecklistResponse {
  tripId: string;
  checklist: {
    blocker: ReadinessFindingItem[];
    must: ReadinessFindingItem[];
    should: ReadinessFindingItem[];
    optional: ReadinessFindingItem[];
  };
  summary: {
    totalBlockers: number;
    totalMust: number;
    totalShould: number;
    totalOptional: number;
  };
}

export interface RiskWarningsResponse {
  tripId: string;
  risks: Risk[];
  summary: {
    totalRisks: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

// ==================== API 接口 ====================

export const readinessApi = {
  /**
   * 检查旅行准备度
   * POST /readiness/check
   */
  check: async (dto: CheckReadinessDto): Promise<ReadinessCheckResult> => {
    const response = await apiClient.post<ApiResponseWrapper<ReadinessCheckResult>>(
      '/readiness/check',
      dto
    );
    return handleResponse(response);
  },

  /**
   * 获取能力包列表
   * GET /readiness/capability-packs
   */
  getCapabilityPacks: async (): Promise<{ packs: CapabilityPack[] }> => {
    const response = await apiClient.get<ApiResponseWrapper<{ packs: CapabilityPack[] }>>(
      '/readiness/capability-packs'
    );
    return handleResponse(response);
  },

  /**
   * 评估能力包
   * POST /readiness/capability-packs/evaluate
   */
  evaluateCapabilityPacks: async (
    dto: CheckReadinessDto
  ): Promise<{
    total: number;
    triggered: number;
    results: CapabilityPackEvaluateResult[];
  }> => {
    const response = await apiClient.post<
      ApiResponseWrapper<{
        total: number;
        triggered: number;
        results: CapabilityPackEvaluateResult[];
      }>
    >('/readiness/capability-packs/evaluate', dto);
    return handleResponse(response);
  },

  /**
   * 获取个性化准备清单
   * GET /readiness/personalized-checklist?tripId=xxx
   */
  getPersonalizedChecklist: async (tripId: string): Promise<PersonalizedChecklistResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<PersonalizedChecklistResponse>>(
      `/readiness/personalized-checklist?tripId=${tripId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取行程潜在风险预警
   * GET /readiness/risk-warnings?tripId=xxx
   */
  getRiskWarnings: async (tripId: string): Promise<RiskWarningsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<RiskWarningsResponse>>(
      `/readiness/risk-warnings?tripId=${tripId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取行程准备度数据（整合接口，用于 Readiness 页面）
   * 这个接口会整合多个 API 调用，返回统一的 ReadinessData 格式
   * GET /readiness/trip/:tripId
   */
  getTripReadiness: async (tripId: string): Promise<ReadinessData> => {
    const response = await apiClient.get<ApiResponseWrapper<ReadinessData>>(
      `/readiness/trip/${tripId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取修复方案
   * POST /readiness/repair-options
   */
  getRepairOptions: async (
    tripId: string,
    blockerId: string
  ): Promise<{ options: RepairOption[] }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ options: RepairOption[] }>>(
      '/readiness/repair-options',
      { tripId, blockerId }
    );
    return handleResponse(response);
  },

  /**
   * 应用修复方案
   * POST /readiness/apply-repair
   */
  applyRepair: async (
    tripId: string,
    blockerId: string,
    optionId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ success: boolean; message?: string }>>(
      '/readiness/apply-repair',
      { tripId, blockerId, optionId }
    );
    return handleResponse(response);
  },

  /**
   * 运行自动修复（Neptune）
   * POST /readiness/auto-repair
   */
  autoRepair: async (tripId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ success: boolean; message?: string }>>(
      '/readiness/auto-repair',
      { tripId }
    );
    return handleResponse(response);
  },

  /**
   * 刷新证据
   * POST /readiness/refresh-evidence
   */
  refreshEvidence: async (
    tripId: string,
    evidenceId?: string
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ success: boolean }>>(
      '/readiness/refresh-evidence',
      { tripId, evidenceId }
    );
    return handleResponse(response);
  },
};

