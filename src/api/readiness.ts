import apiClient from './client';
import type {
  RepairOption,
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
  id?: string;                  // 规则ID
  category?: string;            // 分类
  severity?: string;            // 严重程度
  level?: 'blocker' | 'must' | 'should' | 'optional';
  message: string;
  tasks?: Array<{               // 任务列表
    title: string;
    dueOffsetDays: number;      // 相对出发日期的天数偏移（负数表示出发前）
    tags?: string[];
  }>;
  askUser?: string[];          // 需要询问用户的问题
  evidence?: Array<{            // 证据引用
    sourceId: string;
    sectionId?: string;
    quote?: string;
  }>;
}

export interface ReadinessFinding {
  destinationId?: string;      // 目的地ID，如 "IS-ICELAND"
  packId?: string;             // Pack ID，如 "pack.is.iceland"
  packVersion?: string;         // Pack 版本，如 "1.0.0"
  blockers: ReadinessFindingItem[];
  must: ReadinessFindingItem[];
  should: ReadinessFindingItem[];
  optional: ReadinessFindingItem[];
  risks?: Risk[];
}

export interface Risk {
  type: string;                        // 风险类型（如 'altitude', 'terrain', 'weather'）
  severity: 'low' | 'medium' | 'high';
  summary: string;
  mitigations?: string[];              // 应对措施列表（注意：文档中使用 mitigations，不是 mitigation）
  emergencyContacts?: string[];         // 紧急联系方式（如果有）
  message?: string;                    // 兼容旧字段
  mitigation?: string[];              // 兼容旧字段
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
   * GET /readiness/personalized-checklist?tripId=xxx&lang=zh
   * @param tripId 行程ID
   * @param lang 语言代码，可选：'zh' | 'en'，默认为 'en'
   */
  getPersonalizedChecklist: async (tripId: string, lang?: string): Promise<PersonalizedChecklistResponse> => {
    const params = new URLSearchParams({ tripId });
    if (lang) {
      params.append('lang', lang);
    }
    const response = await apiClient.get<ApiResponseWrapper<PersonalizedChecklistResponse>>(
      `/readiness/personalized-checklist?${params.toString()}`
    );
    return handleResponse(response);
  },

  /**
   * 获取行程潜在风险预警
   * GET /readiness/risk-warnings?tripId=xxx&lang=zh
   * @param tripId 行程ID
   * @param lang 语言代码，可选：'zh' | 'en'，默认为 'en'
   */
  getRiskWarnings: async (tripId: string, lang?: string): Promise<RiskWarningsResponse> => {
    const params = new URLSearchParams({ tripId });
    if (lang) {
      params.append('lang', lang);
    }
    const response = await apiClient.get<ApiResponseWrapper<RiskWarningsResponse>>(
      `/readiness/risk-warnings?${params.toString()}`
    );
    return handleResponse(response);
  },

  /**
   * 根据行程ID检查准备度
   * 基于行程ID自动获取行程信息并检查准备度，返回 must/should/optional 清单
一下
   * GET /readiness/trip/:tripId?lang=zh
   * 
   * 注意：此接口返回 ReadinessCheckResult 格式，与 POST /readiness/check 相同
   * 如需 ReadinessData 格式，请在调用处使用 convertCheckResultToReadinessData 转换
   * @param tripId 行程ID
   * @param lang 语言代码，可选：'zh' | 'en'，默认为 'en'
   */
  getTripReadiness: async (tripId: string, lang?: string): Promise<ReadinessCheckResult> => {
    const url = lang 
      ? `/readiness/trip/${tripId}?lang=${lang}`
      : `/readiness/trip/${tripId}`;
    const response = await apiClient.get<ApiResponseWrapper<ReadinessCheckResult>>(url);
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

  /**
   * 更新勾选状态
   * PUT /readiness/trip/:tripId/checklist/status
   */
  updateChecklistStatus: async (
    tripId: string,
    checkedItems: string[]
  ): Promise<{ updated: number; checkedItems: string[] }> => {
    const response = await apiClient.put<ApiResponseWrapper<{ updated: number; checkedItems: string[] }>>(
      `/readiness/trip/${tripId}/checklist/status`,
      { checkedItems }
    );
    return handleResponse(response);
  },

  /**
   * 获取勾选状态
   * GET /readiness/trip/:tripId/checklist/status
   */
  getChecklistStatus: async (
    tripId: string
  ): Promise<{ checkedItems: string[]; lastUpdated: string }> => {
    const response = await apiClient.get<ApiResponseWrapper<{ checkedItems: string[]; lastUpdated: string }>>(
      `/readiness/trip/${tripId}/checklist/status`
    );
    return handleResponse(response);
  },

  /**
   * 获取阻塞项解决方案
   * GET /readiness/trip/:tripId/blockers/:blockerId/solutions
   */
  getSolutions: async (
    tripId: string,
    blockerId: string
  ): Promise<{ blockerId: string; blockerMessage: string; solutions: any[] }> => {
    const response = await apiClient.get<ApiResponseWrapper<{ blockerId: string; blockerMessage: string; solutions: any[] }>>(
      `/readiness/trip/${tripId}/blockers/${blockerId}/solutions`
    );
    return handleResponse(response);
  },

  /**
   * 标记为不适用
   * POST /readiness/trip/:tripId/findings/:findingId/mark-not-applicable
   */
  markNotApplicable: async (
    tripId: string,
    findingId: string,
    reason?: string
  ): Promise<{ findingId: string; marked: boolean; reason?: string; markedAt: string }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ findingId: string; marked: boolean; reason?: string; markedAt: string }>>(
      `/readiness/trip/${tripId}/findings/${findingId}/mark-not-applicable`,
      { reason }
    );
    return handleResponse(response);
  },

  /**
   * 取消标记不适用
   * DELETE /readiness/trip/:tripId/findings/:findingId/mark-not-applicable
   */
  unmarkNotApplicable: async (
    tripId: string,
    findingId: string
  ): Promise<{ findingId: string; marked: boolean }> => {
    const response = await apiClient.delete<ApiResponseWrapper<{ findingId: string; marked: boolean }>>(
      `/readiness/trip/${tripId}/findings/${findingId}/mark-not-applicable`
    );
    return handleResponse(response);
  },

  /**
   * 添加到稍后处理
   * POST /readiness/trip/:tripId/findings/:findingId/add-to-later
   */
  addToLater: async (
    tripId: string,
    findingId: string,
    reminderDate?: string,
    note?: string
  ): Promise<{ findingId: string; added: boolean; reminderDate?: string; note?: string; addedAt: string }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ findingId: string; added: boolean; reminderDate?: string; note?: string; addedAt: string }>>(
      `/readiness/trip/${tripId}/findings/${findingId}/add-to-later`,
      { reminderDate, note }
    );
    return handleResponse(response);
  },

  /**
   * 从稍后处理移除
   * DELETE /readiness/trip/:tripId/findings/:findingId/remove-from-later
   */
  removeFromLater: async (
    tripId: string,
    findingId: string
  ): Promise<{ findingId: string; removed: boolean }> => {
    const response = await apiClient.delete<ApiResponseWrapper<{ findingId: string; removed: boolean }>>(
      `/readiness/trip/${tripId}/findings/${findingId}/remove-from-later`
    );
    return handleResponse(response);
  },

  /**
   * 生成打包清单
   * POST /readiness/trip/:tripId/packing-list/generate
   */
  generatePackingList: async (
    tripId: string,
    options?: {
      includeOptional?: boolean;
      categories?: string[];
      customItems?: Array<{ name: string; category: string; quantity?: number; note?: string }>;
    }
  ): Promise<{
    tripId: string;
    generatedAt: string;
    items: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit?: string;
      priority: 'must' | 'should' | 'optional';
      reason?: string;
      sourceFindingId?: string;
      checked: boolean;
      note?: string;
    }>;
    summary: {
      totalItems: number;
      byCategory: Record<string, number>;
    };
  }> => {
    const response = await apiClient.post<ApiResponseWrapper<any>>(
      `/readiness/trip/${tripId}/packing-list/generate`,
      options || {}
    );
    return handleResponse(response);
  },

  /**
   * 获取打包清单
   * GET /readiness/trip/:tripId/packing-list
   */
  getPackingList: async (
    tripId: string
  ): Promise<{
    tripId: string;
    items: any[];
    summary: {
      totalItems: number;
      checkedItems: number;
      byCategory: Record<string, number>;
    };
    lastGeneratedAt?: string;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<any>>(
      `/readiness/trip/${tripId}/packing-list`
    );
    return handleResponse(response);
  },

  /**
   * 更新打包清单项状态
   * PUT /readiness/trip/:tripId/packing-list/items/:itemId
   */
  updatePackingListItem: async (
    tripId: string,
    itemId: string,
    updates: {
      checked?: boolean;
      quantity?: number;
      note?: string;
    }
  ): Promise<{ itemId: string; updated: boolean }> => {
    const response = await apiClient.put<ApiResponseWrapper<{ itemId: string; updated: boolean }>>(
      `/readiness/trip/${tripId}/packing-list/items/${itemId}`,
      updates
    );
    return handleResponse(response);
  },

  /**
   * 获取不适用项列表
   * GET /readiness/trip/:tripId/findings/not-applicable
   */
  getNotApplicableItems: async (
    tripId: string
  ): Promise<{
    notApplicableItems: Array<{
      findingId: string;
      reason?: string;
      markedAt: string;
    }>;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      notApplicableItems: Array<{
        findingId: string;
        reason?: string;
        markedAt: string;
      }>;
    }>>(
      `/readiness/trip/${tripId}/findings/not-applicable`
    );
    return handleResponse(response);
  },

  /**
   * 获取稍后处理列表
   * GET /readiness/trip/:tripId/findings/later
   */
  getLaterItems: async (
    tripId: string
  ): Promise<{
    laterItems: Array<{
      findingId: string;
      reminderDate?: string;
      note?: string;
      addedAt: string;
    }>;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      laterItems: Array<{
        findingId: string;
        reminderDate?: string;
        note?: string;
        addedAt: string;
      }>;
    }>>(
      `/readiness/trip/${tripId}/findings/later`
    );
    return handleResponse(response);
  },
};

