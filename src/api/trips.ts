import apiClient from './client';

// 文档中的响应格式是 { success: true, data: T }
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

// 辅助函数：处理API响应
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  // 如果响应数据不存在，抛出错误
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  
  // 检查是否是错误响应
  if (!response.data.success) {
    const errorData = response.data.error;
    const errorMessage = errorData?.message || errorData?.code || '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[API Client] 请求失败:', {
      code: errorCode,
      message: errorMessage,
      details: errorData?.details,
      fullError: errorData,
      fullResponse: response.data,
    });
    
    // 创建错误对象，保留更多信息
    const error = new Error(errorMessage) as Error & {
      code?: string;
      details?: any;
    };
    error.code = errorCode;
    if (errorData?.details) {
      error.details = errorData.details;
    }
    
    throw error;
  }
  
  // 返回数据，如果数据为 undefined 或 null，抛出更明确的错误
  if (response.data.data === undefined || response.data.data === null) {
    console.error('[API Client] 响应数据为空:', {
      url: (response as any).config?.url,
      response: response.data,
    });
    throw new Error('API响应数据为空');
  }
  
  return response.data.data;
}

import type {
  TripListItem,
  TripDetail,
  CreateTripRequest,
  CreateTripResponse,
  CreateTripFromNLRequest,
  CreateTripFromNLResponse,
  UpdateTripRequest,
  TripState,
  ScheduleResponse,
  DayScheduleResult,
  ActionHistory,
  UndoActionRequest,
  RedoActionRequest,
  UndoRedoResponse,
  CreateTripShareRequest,
  NearbyPoiItem,
  ConflictsResponse,
  UpdateIntentRequest,
  IntentResponse,
  DayMetricsResponse,
  TripMetricsResponse,
  ApplyOptimizationRequest,
  ApplyOptimizationResponse,
  ItineraryItemDetailResponse,
  BatchUpdateItemsRequest,
  BatchUpdateItemsResponse,
  TripShare,
  AddCollaboratorRequest,
  Collaborator,
  FeaturedTrip,
  ExportOfflinePackResponse,
  OfflinePackStatus,
  SyncOfflineChangesRequest,
  SyncOfflineChangesResponse,
  TripRecapReport,
  ValidateItineraryItemResponse,
  BatchValidateItineraryResponse,
  CreateItineraryItemResponse,
  UpdateItineraryItemResponse,
  CostCategory,
  ItemCostRequest,
  ItemCostResponse,
  UpdateItemCostResponse,
  BatchUpdateCostRequest,
  BatchUpdateCostResponse,
  TripCostSummary,
  UnpaidItem,
  ExportRecapResponse,
  GenerateTrailVideoDataResponse,
  SharedTripResponse,
  ImportTripFromShareRequest,
  ImportTripFromShareResponse,
  SendSOSRequest,
  SendSOSResponse,
  SOSHistoryItem,
  AdjustTripRequest,
  TripAdjustmentResult,
  ItineraryItemDetail,
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
  BudgetSummary,
  BudgetAlert,
  BudgetOptimizationSuggestion,
  BudgetReport,
  SetBudgetConstraintRequest,
  SetBudgetConstraintResponse,
  GetBudgetConstraintResponse,
  DeleteBudgetConstraintResponse,
  BudgetDetailsResponse,
  BudgetTrendsResponse,
  BudgetStatisticsResponse,
  BudgetMonitorResponse,
  PersonaAlert,
  DecisionLogResponse,
  Task,
  PipelineStatus,
  GenerateTripDraftRequest,
  TripDraftResponse,
  SaveDraftRequest,
  ReplaceItineraryItemRequest,
  ReplaceItineraryItemResponse,
  RegenerateTripRequest,
  RegenerateTripResponse,
  EvidenceListResponse,
  EvidenceType,
  AttentionQueueResponse,
  AttentionSeverity,
  AttentionItemType,
  DayTravelInfoResponse,
  UpdateTravelInfoRequest,
  UpdateBookingRequest,
  CalculateTravelRequest,
  CalculateAllTravelResponse,
  CalculateDayTravelResponse,
  FixDatesResponse,
} from '@/types/trip';
import type {
  SuggestionListResponse,
  SuggestionStats,
  ApplySuggestionRequest,
  ApplySuggestionResponse,
} from '@/types/suggestion';

// ==================== 行程洞察类型定义 ====================

/**
 * 行程洞察发现项
 */
export interface TripInsightFinding {
  type: 'warning' | 'suggestion' | 'positive';
  icon: string;           // 图标名称，如 'clock', 'route', 'check'
  title: string;          // 简短标题
  message: string;        // 详细说明
  actionLabel?: string | null;   // 快捷操作按钮文案
  actionPrompt?: string | null;  // 点击后发送给 AI 的提示词
}

/**
 * 行程准备度摘要
 */
export interface TripInsightReadiness {
  status: 'pass' | 'warn' | 'block';
  blockers: number;
  warnings: number;
  suggestions: number;
}

/**
 * 行程洞察响应
 */
export interface TripInsightResponse {
  tripSummary: {
    destination: string;
    days: number;
    placesCount: number;
    startDate: string;
    endDate: string;
  };
  findings: TripInsightFinding[];
  readiness: TripInsightReadiness;
  overallStatus: 'good' | 'needs_attention' | 'has_issues';
}

// ==================== 基础接口 ====================

export const tripsApi = {
  /**
   * 创建新行程
   * POST /trips
   */
  create: async (data: CreateTripRequest): Promise<CreateTripResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripResponse>>('/trips', data);
    return handleResponse(response);
  },

  /**
   * 获取所有行程
   * GET /trips
   */
  getAll: async (): Promise<TripListItem[]> => {
    const response = await apiClient.get<ApiResponseWrapper<TripListItem[]>>('/trips');
    return handleResponse(response);
  },

  /**
   * 自然语言创建行程
   * POST /trips/from-natural-language
   * 注意：此操作可能需要较长时间（LLM 调用、方案生成等），使用更长的超时时间
   * 支持会话上下文：如果提供 sessionId，会恢复之前的对话上下文
   * 
   * 🆕 字段名映射：自动将后端返回的澄清问题格式转换为前端格式
   * 兼容新旧两种字段名（question/text, type/inputType）
   */
  createFromNL: async (data: CreateTripFromNLRequest): Promise<CreateTripFromNLResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripFromNLResponse>>(
      '/trips/from-natural-language',
      data,
      {
        timeout: 120000, // 120 秒超时，用于自然语言创建行程等耗时操作
      }
    );
    const result = handleResponse(response);
    
    // 🆕 字段名映射：转换澄清问题格式
    if (result.clarificationQuestions && Array.isArray(result.clarificationQuestions)) {
      // 检查是否是结构化问题（对象数组）还是字符串数组（向后兼容）
      if (result.clarificationQuestions.length > 0 && typeof result.clarificationQuestions[0] === 'object') {
        const { normalizeClarificationQuestions } = await import('@/utils/nl-conversation-adapter');
        result.clarificationQuestions = normalizeClarificationQuestions(result.clarificationQuestions as any[]);
      }
    }
    
    return result;
  },

  /**
   * 获取对话上下文
   * GET /trips/nl-conversation/:sessionId
   */
  getNLConversation: async (sessionId: string): Promise<NLConversation> => {
    const response = await apiClient.get<ApiResponseWrapper<NLConversation>>(
      `/trips/nl-conversation/${sessionId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取用户的所有会话
   * GET /trips/nl-conversation
   */
  getAllNLConversations: async (): Promise<{ sessions: NLConversation[] }> => {
    const response = await apiClient.get<ApiResponseWrapper<{ sessions: NLConversation[] }>>(
      '/trips/nl-conversation'
    );
    return handleResponse(response);
  },

  /**
   * 更新对话上下文
   * PUT /trips/nl-conversation/:sessionId
   */
  updateNLConversation: async (
    sessionId: string,
    data: {
      conversationContext?: Record<string, any>;
      partialParams?: ParsedTripParams;
    }
  ): Promise<NLConversation> => {
    const response = await apiClient.put<ApiResponseWrapper<NLConversation>>(
      `/trips/nl-conversation/${sessionId}`,
      {
        sessionId,
        ...data,
      }
    );
    return handleResponse(response);
  },

  /**
   * 🆕 确认创建行程
   * POST /trips/nl-conversation/:sessionId/confirm-create
   * 用户确认创建行程，系统根据已收集的参数创建行程
   */
  confirmCreateTrip: async (
    sessionId: string,
    data: {
      confirm: boolean;
      additionalParams?: {
        preferences?: Record<string, any>;
        [key: string]: any;
      };
    }
  ): Promise<CreateTripFromNLResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripFromNLResponse>>(
      `/trips/nl-conversation/${sessionId}/confirm-create`,
      data,
      {
        timeout: 120000, // 120 秒超时
      }
    );
    return handleResponse(response);
  },

  /**
   * 🆕 更新消息的问题答案
   * PUT /trips/nl-conversation/:sessionId/messages/:messageId
   * 如果后端不支持此接口，将回退到更新整个会话
   */
  updateMessageQuestionAnswers: async (
    sessionId: string,
    messageId: string,
    questionAnswers: Record<string, string | string[] | number | boolean | null>
  ): Promise<NLConversation> => {
    try {
      // 尝试使用专门的消息更新接口
      const response = await apiClient.put<ApiResponseWrapper<NLConversation>>(
        `/trips/nl-conversation/${sessionId}/messages/${messageId}`,
        {
          questionAnswers,
        }
      );
      return handleResponse(response);
    } catch (err: any) {
      // 如果接口不存在，记录警告但不抛出错误
      // 前端会继续工作，答案会在下次请求时通过 clarificationAnswers 传递
      if (err.response?.status === 404 || err.code === 'NOT_FOUND') {
        console.warn('[tripsApi] 消息更新接口不存在，答案将在下次请求时传递');
        // 返回当前会话（不更新）
        return await tripsApi.getNLConversation(sessionId);
      }
      throw err;
    }
  },

  /**
   * 删除对话会话
   * DELETE /trips/nl-conversation/:sessionId
   * 响应格式：{ "success": true, "data": null }
   * 会话不存在：返回成功（静默处理）
   * 删除失败：返回成功并记录警告日志
   */
  deleteNLConversation: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/trips/nl-conversation/${sessionId}`);
  },

  /**
   * 获取单个行程详情（全景视图）
   * GET /trips/:id
   */
  getById: async (id: string): Promise<TripDetail> => {
    console.log('[Trips API] getById 开始:', { id });
    try {
      const response = await apiClient.get<ApiResponseWrapper<TripDetail>>(`/trips/${id}`);
      console.log('[Trips API] getById 收到响应:', {
        id,
        status: response.status,
        hasData: !!response.data,
        dataSuccess: response.data?.success,
        dataType: typeof response.data,
      });
      const result = handleResponse(response);
      console.log('[Trips API] getById handleResponse 成功:', {
        id,
        resultId: result?.id,
        hasResult: !!result,
      });
      return result;
    } catch (error: any) {
      console.error('[Trips API] getById 失败:', {
        id,
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * 更新行程
   * PUT /trips/:id
   */
  update: async (id: string, data: UpdateTripRequest): Promise<CreateTripResponse> => {
    const response = await apiClient.put<ApiResponseWrapper<CreateTripResponse>>(`/trips/${id}`, data);
    return handleResponse(response);
  },

  /**
   * 删除行程
   * DELETE /trips/:id
   * @param id 行程 ID
   * @param confirmText 确认文字，必须输入行程的目的地国家代码（如：JP、IS）来确认删除
   */
  delete: async (id: string, confirmText: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}`, {
      data: { confirmText },
    });
  },

  // ==================== 行程状态 ====================

  /**
   * 获取行程当前状态
   * GET /trips/:id/state
   */
  getState: async (id: string, now?: string): Promise<TripState> => {
    const response = await apiClient.get<ApiResponseWrapper<TripState>>(`/trips/${id}/state`, {
      params: now ? { now } : undefined,
    });
    return handleResponse(response);
  },

  // ==================== Schedule ====================

  /**
   * 获取指定日期的 Schedule
   * GET /trips/:id/schedule
   */
  getSchedule: async (id: string, date: string): Promise<ScheduleResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ScheduleResponse>>(`/trips/${id}/schedule`, {
      params: { date },
    });
    return handleResponse(response);
  },

  /**
   * 保存指定日期的 Schedule
   * PUT /trips/:id/schedule
   */
  saveSchedule: async (
    id: string,
    date: string,
    schedule: DayScheduleResult
  ): Promise<ScheduleResponse> => {
    const response = await apiClient.put<ApiResponseWrapper<ScheduleResponse>>(
      `/trips/${id}/schedule?date=${date}`,
      { schedule }
    );
    return handleResponse(response);
  },

  // ==================== 操作历史 ====================

  /**
   * 获取操作历史
   * GET /trips/:id/actions
   */
  getActions: async (id: string, date?: string): Promise<ActionHistory[]> => {
    const response = await apiClient.get<ApiResponseWrapper<ActionHistory[]>>(`/trips/${id}/actions`, {
      params: date ? { date } : undefined,
    });
    return handleResponse(response);
  },

  /**
   * 撤销操作
   * POST /trips/:id/actions/undo
   */
  undo: async (id: string, data: UndoActionRequest): Promise<UndoRedoResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<UndoRedoResponse>>(
      `/trips/${id}/actions/undo`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 重做操作
   * POST /trips/:id/actions/redo
   */
  redo: async (id: string, data: RedoActionRequest): Promise<UndoRedoResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<UndoRedoResponse>>(
      `/trips/${id}/actions/redo`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 分享 ====================

  /**
   * 生成行程分享链接
   * POST /trips/:id/share
   */
  createShare: async (id: string, data?: CreateTripShareRequest): Promise<TripShare> => {
    const response = await apiClient.post<ApiResponseWrapper<TripShare>>(`/trips/${id}/share`, data || {});
    return handleResponse(response);
  },

  /**
   * 根据分享令牌获取行程
   * GET /trips/shared/:shareToken
   */
  getSharedTrip: async (shareToken: string): Promise<SharedTripResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<SharedTripResponse>>(
      `/trips/shared/${shareToken}`
    );
    return handleResponse(response);
  },

  /**
   * 导入分享的行程
   * POST /trips/shared/:shareToken/import
   */
  importFromShare: async (
    shareToken: string,
    data: ImportTripFromShareRequest
  ): Promise<ImportTripFromShareResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ImportTripFromShareResponse>>(
      `/trips/shared/${shareToken}/import`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 协作者 ====================

  /**
   * 添加行程协作者
   * POST /trips/:id/collaborators
   */
  addCollaborator: async (id: string, data: AddCollaboratorRequest): Promise<Collaborator> => {
    const response = await apiClient.post<ApiResponseWrapper<Collaborator>>(
      `/trips/${id}/collaborators`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取协作者列表
   * GET /trips/:id/collaborators
   */
  getCollaborators: async (id: string): Promise<Collaborator[]> => {
    const response = await apiClient.get<ApiResponseWrapper<Collaborator[]>>(
      `/trips/${id}/collaborators`
    );
    return handleResponse(response);
  },

  /**
   * 移除协作者
   * DELETE /trips/:id/collaborators/:userId
   */
  removeCollaborator: async (id: string, userId: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}/collaborators/${userId}`);
  },

  // ==================== 收藏 ====================

  /**
   * 收藏行程
   * POST /trips/:id/collect
   */
  collect: async (id: string): Promise<void> => {
    await apiClient.post(`/trips/${id}/collect`);
  },

  /**
   * 取消收藏行程
   * DELETE /trips/:id/collect
   */
  uncollect: async (id: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}/collect`);
  },

  /**
   * 获取用户收藏的行程列表
   * GET /trips/collected
   * @deprecated 此接口已废弃，请使用其他方式获取收藏状态
   */
  // getCollected: async (): Promise<CollectedTrip[]> => {
  //   const response = await apiClient.get<ApiResponseWrapper<CollectedTrip[]>>('/trips/collected');
  //   return handleResponse(response);
  // },

  // ==================== 点赞 ====================

  /**
   * 点赞行程
   * POST /trips/:id/like
   */
  like: async (id: string): Promise<void> => {
    await apiClient.post(`/trips/${id}/like`);
  },

  /**
   * 取消点赞行程
   * DELETE /trips/:id/like
   */
  unlike: async (id: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}/like`);
  },

  /**
   * 获取热门推荐行程
   * GET /trips/featured
   */
  getFeatured: async (limit?: number): Promise<FeaturedTrip[]> => {
    const response = await apiClient.get<ApiResponseWrapper<FeaturedTrip[]>>('/trips/featured', {
      params: limit ? { limit } : undefined,
    });
    return handleResponse(response);
  },

  // ==================== 离线数据包 ====================

  /**
   * 导出行程离线数据包
   * GET /trips/:id/offline-pack
   */
  exportOfflinePack: async (id: string): Promise<ExportOfflinePackResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ExportOfflinePackResponse>>(
      `/trips/${id}/offline-pack`
    );
    return handleResponse(response);
  },

  /**
   * 查询离线数据包状态
   * GET /trips/:id/offline-status
   */
  getOfflineStatus: async (id: string): Promise<OfflinePackStatus> => {
    const response = await apiClient.get<ApiResponseWrapper<OfflinePackStatus>>(
      `/trips/${id}/offline-status`
    );
    return handleResponse(response);
  },

  /**
   * 同步离线修改
   * POST /trips/:id/offline-sync
   */
  syncOfflineChanges: async (
    id: string,
    data: SyncOfflineChangesRequest
  ): Promise<SyncOfflineChangesResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<SyncOfflineChangesResponse>>(
      `/trips/${id}/offline-sync`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 复盘报告 ====================

  /**
   * 生成行程复盘报告
   * GET /trips/:id/recap
   */
  getRecap: async (id: string): Promise<TripRecapReport> => {
    const response = await apiClient.get<ApiResponseWrapper<TripRecapReport>>(`/trips/${id}/recap`);
    return handleResponse(response);
  },

  /**
   * 导出行程复盘报告（用于分享）
   * GET /trips/:id/recap/export
   */
  exportRecap: async (id: string): Promise<ExportRecapResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ExportRecapResponse>>(
      `/trips/${id}/recap/export`
    );
    return handleResponse(response);
  },

  /**
   * 生成3D轨迹视频数据
   * GET /trips/:id/trail-video-data
   */
  getTrailVideoData: async (id: string): Promise<GenerateTrailVideoDataResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<GenerateTrailVideoDataResponse>>(
      `/trips/${id}/trail-video-data`
    );
    return handleResponse(response);
  },

  // ==================== 紧急求救 ====================

  /**
   * 发送紧急求救信号
   * POST /trips/:id/emergency/sos
   */
  sendSOS: async (id: string, data: SendSOSRequest): Promise<SendSOSResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<SendSOSResponse>>(
      `/trips/${id}/emergency/sos`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取求救记录
   * GET /trips/:id/emergency/history
   */
  getSOSHistory: async (id: string): Promise<SOSHistoryItem[]> => {
    const response = await apiClient.get<ApiResponseWrapper<SOSHistoryItem[]>>(
      `/trips/${id}/emergency/history`
    );
    return handleResponse(response);
  },

  // ==================== 行程调整 ====================

  /**
   * 修改行程并自动适配调整
   * POST /trips/:id/adjust
   */
  adjust: async (id: string, data: AdjustTripRequest): Promise<TripAdjustmentResult> => {
    const response = await apiClient.post<ApiResponseWrapper<TripAdjustmentResult>>(
      `/trips/${id}/adjust`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 预算 ====================

  /**
   * 获取行程预算摘要
   * GET /trips/:id/budget/summary
   */
  getBudgetSummary: async (
    id: string,
    params?: {
      startDate?: string;
      endDate?: string;
      category?: string;
    }
  ): Promise<BudgetSummary> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetSummary>>(
      `/trips/${id}/budget/summary`,
      {
        params: params ? {
          ...(params.startDate && { startDate: params.startDate }),
          ...(params.endDate && { endDate: params.endDate }),
          ...(params.category && { category: params.category }),
        } : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 设置行程预算约束
   * POST /trips/:id/budget/constraint
   */
  setBudgetConstraint: async (
    id: string,
    data: SetBudgetConstraintRequest
  ): Promise<SetBudgetConstraintResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<SetBudgetConstraintResponse>>(
      `/trips/${id}/budget/constraint`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取行程预算约束
   * GET /trips/:id/budget/constraint
   */
  getBudgetConstraint: async (id: string): Promise<GetBudgetConstraintResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<GetBudgetConstraintResponse>>(
      `/trips/${id}/budget/constraint`
    );
    return handleResponse(response);
  },

  /**
   * 删除行程预算约束
   * DELETE /trips/:id/budget/constraint
   */
  deleteBudgetConstraint: async (id: string): Promise<DeleteBudgetConstraintResponse> => {
    const response = await apiClient.delete<ApiResponseWrapper<DeleteBudgetConstraintResponse>>(
      `/trips/${id}/budget/constraint`
    );
    return handleResponse(response);
  },

  /**
   * 获取预算明细
   * GET /trips/:id/budget/details
   */
  getBudgetDetails: async (
    id: string,
    params?: {
      startDate?: string;
      endDate?: string;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<BudgetDetailsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetDetailsResponse>>(
      `/trips/${id}/budget/details`,
      {
        params: params ? {
          ...(params.startDate && { startDate: params.startDate }),
          ...(params.endDate && { endDate: params.endDate }),
          ...(params.category && { category: params.category }),
          ...(params.limit !== undefined && { limit: params.limit }),
          ...(params.offset !== undefined && { offset: params.offset }),
        } : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取预算趋势
   * GET /trips/:id/budget/trends
   */
  getBudgetTrends: async (
    id: string,
    params?: {
      startDate?: string;
      endDate?: string;
      granularity?: 'daily' | 'weekly' | 'monthly';
    }
  ): Promise<BudgetTrendsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetTrendsResponse>>(
      `/trips/${id}/budget/trends`,
      {
        params: params ? {
          ...(params.startDate && { startDate: params.startDate }),
          ...(params.endDate && { endDate: params.endDate }),
          ...(params.granularity && { granularity: params.granularity }),
        } : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取预算执行统计
   * GET /trips/:id/budget/statistics
   */
  getBudgetStatistics: async (id: string): Promise<BudgetStatisticsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetStatisticsResponse>>(
      `/trips/${id}/budget/statistics`
    );
    return handleResponse(response);
  },

  /**
   * 获取实时预算监控
   * GET /trips/:id/budget/monitor
   */
  getBudgetMonitor: async (
    id: string,
    realtime?: boolean
  ): Promise<BudgetMonitorResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetMonitorResponse>>(
      `/trips/${id}/budget/monitor`,
      {
        params: realtime !== undefined ? { realtime } : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 检查预算预警
   * GET /trips/:id/budget/alert
   */
  checkBudgetAlert: async (id: string, cost: number): Promise<BudgetAlert | null> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetAlert | null>>(
      `/trips/${id}/budget/alert`,
      {
        params: { cost },
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取预算优化建议
   * GET /trips/:id/budget/optimization
   */
  getBudgetOptimization: async (
    id: string,
    category?: string
  ): Promise<BudgetOptimizationSuggestion[]> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetOptimizationSuggestion[]>>(
      `/trips/${id}/budget/optimization`,
      {
        params: category ? { category } : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 生成预算执行分析报告
   * GET /trips/:id/budget/report
   */
  getBudgetReport: async (id: string): Promise<BudgetReport> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetReport>>(`/trips/${id}/budget/report`);
    return handleResponse(response);
  },

  // ==================== Dashboard 决策系统 ====================

  /**
   * 获取三人格提醒列表
   * GET /trips/:id/persona-alerts
   */
  getPersonaAlerts: async (id: string): Promise<PersonaAlert[]> => {
    const response = await apiClient.get<ApiResponseWrapper<PersonaAlert[]>>(`/trips/${id}/persona-alerts`);
    return handleResponse(response);
  },

  /**
   * 获取决策记录/透明日志
   * GET /trips/:id/decision-log
   */
  getDecisionLog: async (
    id: string,
    limit?: number,
    offset?: number
  ): Promise<DecisionLogResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionLogResponse>>(
      `/trips/${id}/decision-log`,
      {
        params: {
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取今日重点任务
   * GET /trips/:id/tasks
   */
  getTasks: async (id: string): Promise<Task[]> => {
    const response = await apiClient.get<ApiResponseWrapper<Task[]>>(`/trips/${id}/tasks`);
    return handleResponse(response);
  },

  /**
   * 更新任务状态
   * PATCH /trips/:id/tasks/:taskId
   */
  updateTaskStatus: async (id: string, taskId: string, completed: boolean): Promise<Task> => {
    const response = await apiClient.patch<ApiResponseWrapper<Task>>(
      `/trips/${id}/tasks/${taskId}`,
      { completed }
    );
    return handleResponse(response);
  },

  /**
   * 获取Pipeline状态
   * GET /trips/:id/pipeline-status
   */
  getPipelineStatus: async (id: string): Promise<PipelineStatus> => {
    const response = await apiClient.get<ApiResponseWrapper<PipelineStatus>>(
      `/trips/${id}/pipeline-status`
    );
    return handleResponse(response);
  },

  // ==================== 智能行程生成 ====================

  /**
   * 生成行程草案(不落库,先预览)
   * POST /trips/draft
   */
  generateDraft: async (data: GenerateTripDraftRequest): Promise<TripDraftResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<TripDraftResponse>>(
      '/trips/draft',
      data
    );
    return handleResponse(response);
  },

  /**
   * 保存草案为行程
   * POST /trips (使用SaveDraftRequest)
   */
  saveDraft: async (data: SaveDraftRequest): Promise<CreateTripResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripResponse>>(
      '/trips',
      data
    );
    return handleResponse(response);
  },

  /**
   * 替换单个行程项(Neptune修复)
   * POST /trips/:tripId/items/:itemId/replace
   */
  replaceItem: async (
    tripId: string,
    itemId: string,
    data: ReplaceItineraryItemRequest
  ): Promise<ReplaceItineraryItemResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ReplaceItineraryItemResponse>>(
      `/trips/${tripId}/items/${itemId}/replace`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 全局重生成行程(保持用户已锁定的项)
   * POST /trips/:tripId/regenerate
   */
  regenerate: async (
    tripId: string,
    data: RegenerateTripRequest
  ): Promise<RegenerateTripResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<RegenerateTripResponse>>(
      `/trips/${tripId}/regenerate`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 证据与关注队列 ====================

  /**
   * 获取行程证据列表
   * GET /trips/:id/evidence
   * 
   * 🆕 P1功能增强：支持优先级过滤、分组、排序
   */
  getEvidence: async (
    tripId: string,
    params?: {
      limit?: number;
      offset?: number;
      day?: number;
      type?: EvidenceType;
      // 🆕 P1功能：优先级过滤
      priority?: 'all' | 'high' | 'medium_and_high';
      // 🆕 P1功能：分组方式
      groupBy?: 'none' | 'importance' | 'type' | 'day';
      // 🆕 P1功能：排序方式
      sortBy?: 'time' | 'importance' | 'relevance' | 'freshness' | 'quality';
    }
  ): Promise<EvidenceListResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<EvidenceListResponse>>(
      `/trips/${tripId}/evidence`,
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 🆕 检查证据完整性
   * GET /trips/:id/evidence/completeness
   * 
   * P1功能：检查行程中所有POI的期望证据类型，识别缺失的证据
   */
  getEvidenceCompleteness: async (
    tripId: string
  ): Promise<{
    completenessScore: number; // 完整性评分（0-1）
    missingEvidence: Array<{
      poiId: number;
      poiName: string;
      missingTypes: EvidenceType[];
      impact: 'LOW' | 'MEDIUM' | 'HIGH';
      reason: string;
    }>;
    recommendations: Array<{
      action: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      estimatedTime: number; // 秒
      evidenceTypes: EvidenceType[];
      affectedPois: number[];
    }>;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      completenessScore: number;
      missingEvidence: Array<{
        poiId: number;
        poiName: string;
        missingTypes: EvidenceType[];
        impact: 'LOW' | 'MEDIUM' | 'HIGH';
        reason: string;
      }>;
      recommendations: Array<{
        action: string;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        estimatedTime: number;
        evidenceTypes: EvidenceType[];
        affectedPois: number[];
      }>;
    }>>(
      `/trips/${tripId}/evidence/completeness`
    );
    return handleResponse(response);
  },

  /**
   * 🆕 获取证据获取建议
   * GET /trips/:id/evidence/suggestions
   * 
   * P1功能：自动检测缺失证据并生成获取建议，支持一键批量获取
   */
  getEvidenceSuggestions: async (
    tripId: string
  ): Promise<{
    hasMissingEvidence: boolean;
    completenessScore: number;
    suggestions: Array<{
      id: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      evidenceTypes: EvidenceType[];
      affectedPoiIds: number[];
      estimatedTime: number; // 秒
      reason: string;
      canBatchFetch: boolean;
    }>;
    bulkFetchSuggestion?: {
      evidenceTypes: EvidenceType[];
      affectedPoiIds: number[];
      estimatedTime: number;
      description: string;
    };
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      hasMissingEvidence: boolean;
      completenessScore: number;
      suggestions: Array<{
        id: string;
        description: string;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        evidenceTypes: EvidenceType[];
        affectedPoiIds: number[];
        estimatedTime: number;
        reason: string;
        canBatchFetch: boolean;
      }>;
      bulkFetchSuggestion?: {
        evidenceTypes: EvidenceType[];
        affectedPoiIds: number[];
        estimatedTime: number;
        description: string;
      };
    }>>(
      `/trips/${tripId}/evidence/suggestions`
    );
    return handleResponse(response);
  },

  /**
   * 获取关注队列
   * GET /trips/attention-queue
   */
  getAttentionQueue: async (params?: {
    limit?: number;
    offset?: number;
    severity?: AttentionSeverity;
    type?: AttentionItemType;
    tripId?: string;
  }): Promise<AttentionQueueResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<AttentionQueueResponse>>(
      '/trips/attention-queue',
      { params }
    );
    return handleResponse(response);
  },

  // ==================== 冲突检测 ====================

  /**
   * 获取行程冲突列表
   * GET /trips/:id/conflicts
   */
  getConflicts: async (
    id: string,
    params?: { date?: string; severity?: 'HIGH' | 'MEDIUM' | 'LOW' }
  ): Promise<ConflictsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ConflictsResponse>>(
      `/trips/${id}/conflicts`,
      { params }
    );
    return handleResponse(response);
  },

  // ==================== 意图与约束 ====================

  /**
   * 更新行程意图与约束
   * PUT /trips/:id/intent
   */
  updateIntent: async (id: string, data: UpdateIntentRequest): Promise<IntentResponse> => {
    const response = await apiClient.put<ApiResponseWrapper<IntentResponse>>(
      `/trips/${id}/intent`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取行程意图与约束
   * GET /trips/:id/intent
   */
  getIntent: async (id: string): Promise<IntentResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<IntentResponse>>(
      `/trips/${id}/intent`
    );
    return handleResponse(response);
  },

  // ==================== 每日指标 ====================

  /**
   * 获取指定日期的行程指标
   * GET /trips/:id/days/:dayId/metrics
   */
  getDayMetrics: async (id: string, dayId: string): Promise<DayMetricsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DayMetricsResponse>>(
      `/trips/${id}/days/${dayId}/metrics`
    );
    return handleResponse(response);
  },

  /**
   * 批量获取多日指标
   * GET /trips/:id/metrics
   */
  getMetrics: async (
    id: string,
    params?: { dates?: string[] }
  ): Promise<TripMetricsResponse> => {
    try {
      console.log('[Trips API] 发送 getMetrics 请求:', {
        tripId: id,
        params,
      });
      const response = await apiClient.get<ApiResponseWrapper<TripMetricsResponse>>(
        `/trips/${id}/metrics`,
        { 
          params: params?.dates ? { dates: params.dates } : undefined,
          timeout: 60000, // 60 秒超时
        }
      );
      console.log('[Trips API] 收到 getMetrics 响应:', {
        tripId: id,
        hasData: !!response.data,
        success: response.data?.success,
      });
      const result = handleResponse(response);
      console.log('[Trips API] getMetrics 解析成功:', {
        tripId: result.tripId,
        daysCount: result.days?.length || 0,
      });
      return result;
    } catch (error: any) {
      console.error('[Trips API] getMetrics 请求失败:', {
        tripId: id,
        error,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        response: error.response?.data,
      });
      // 重新抛出错误，让调用方处理
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时（已等待 60 秒），请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      }
      throw error;
    }
  },

  // ==================== 优化结果应用 ====================

  /**
   * 应用优化结果到行程
   * POST /trips/:id/apply-optimization
   */
  applyOptimization: async (
    id: string,
    data: ApplyOptimizationRequest
  ): Promise<ApplyOptimizationResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ApplyOptimizationResponse>>(
      `/trips/${id}/apply-optimization`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 建议系统（统一接口）====================

  /**
   * 获取建议列表
   * GET /trips/:id/suggestions
   * 
   * @param id 行程ID
   * @param params 过滤参数
   * @param params.persona 过滤人格类型 (abu, drdre, neptune)
   * @param params.scope 过滤作用范围 (trip, day, item, segment)
   * @param params.scopeId 过滤作用范围ID（如dayId、itemId）
   * @param params.severity 过滤严重级别 (info, warn, blocker)
   * @param params.status 过滤状态 (new, seen, applied, dismissed)
   * @param params.limit 返回数量限制，默认100
   * @param params.offset 偏移量，默认0
   */
  getSuggestions: async (
    id: string,
    params?: {
      persona?: 'abu' | 'drdre' | 'neptune';
      scope?: 'trip' | 'day' | 'item' | 'segment';
      scopeId?: string;
      severity?: 'info' | 'warn' | 'blocker';
      status?: 'new' | 'seen' | 'applied' | 'dismissed';
      limit?: number;
      offset?: number;
    }
  ): Promise<SuggestionListResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<SuggestionListResponse>>(
      `/trips/${id}/suggestions`,
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取建议统计（用于角标数字）
   * GET /trips/:id/suggestions/stats
   */
  getSuggestionStats: async (id: string): Promise<SuggestionStats> => {
    const response = await apiClient.get<ApiResponseWrapper<SuggestionStats>>(
      `/trips/${id}/suggestions/stats`
    );
    return handleResponse(response);
  },

  /**
   * 应用建议
   * POST /trips/:id/suggestions/:suggestionId/apply
   */
  applySuggestion: async (
    id: string,
    suggestionId: string,
    data: ApplySuggestionRequest
  ): Promise<ApplySuggestionResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ApplySuggestionResponse>>(
      `/trips/${id}/suggestions/${suggestionId}/apply`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 忽略建议
   * POST /trips/:id/suggestions/:suggestionId/dismiss
   */
  dismissSuggestion: async (id: string, suggestionId: string): Promise<void> => {
    await apiClient.post(`/trips/${id}/suggestions/${suggestionId}/dismiss`);
  },
};

// ==================== 行程项接口 ====================

export const itineraryItemsApi = {
  /**
   * 创建行程项
   * POST /itinerary-items
   * 
   * 支持校验功能：
   * - 自动执行时间重叠、交通时间等校验
   * - 可通过 forceCreate 强制创建（忽略 WARNING）
   * - 返回校验结果和交通信息
   */
  create: async (data: CreateItineraryItemRequest): Promise<CreateItineraryItemResponse | ItineraryItemDetail> => {
    try {
      const response = await apiClient.post<ApiResponseWrapper<CreateItineraryItemResponse | ItineraryItemDetail>>(
        '/itinerary-items',
        data
      );
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        
        // 如果是需要确认的错误（REQUIRES_CONFIRMATION），返回特殊格式
        if (errorData.error.code === 'REQUIRES_CONFIRMATION') {
          const error = new Error(errorData.error.message) as Error & {
            code?: string;
            warnings?: any[];
            cascadeImpact?: any;
            travelInfo?: any;
          };
          error.code = errorData.error.code;
          // 从 details 中提取 warnings、cascadeImpact、travelInfo
          if (errorData.error.details) {
            error.warnings = errorData.error.details.warnings || [];
            error.cascadeImpact = errorData.error.details.cascadeImpact;
            error.travelInfo = errorData.error.details.travelInfo;
          }
          throw error;
        }
        
        // 其他错误正常抛出
        throw new Error(errorData.error.message);
      }
      
      const result = handleResponse(response);
      
      // 如果返回的是增强版响应（包含 warnings），直接返回
      if (result && typeof result === 'object' && 'item' in result) {
        return result as CreateItineraryItemResponse;
      }
      
      // 否则包装为增强版响应
      return {
        item: result as ItineraryItemDetail,
        warnings: [],
        infos: [],
      };
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      
      // 处理校验错误
      if (error.code === 'VALIDATION_ERROR' || error.code === 'REQUIRES_CONFIRMATION') {
        throw error;
      }
      
      // 处理后端错误响应
      // 兼容两种格式：1) 自定义 { success, error: { message } } 2) NestJS { message, error, statusCode }
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse & { message?: string };
        const message =
          errorData.message ??
          (typeof errorData.error === 'object' && errorData.error?.message
            ? errorData.error.message
            : undefined) ??
          error.message ??
          '创建行程项失败';
        const errObj = typeof errorData.error === 'object' ? errorData.error : null;
        const apiError = new Error(message) as Error & {
          code?: string;
          details?: any;
          warnings?: any[];
          cascadeImpact?: any;
          travelInfo?: any;
        };
        apiError.code = errObj?.code;
        apiError.details = errObj?.details;
        if (apiError.details) {
          apiError.warnings = apiError.details.warnings || [];
          apiError.cascadeImpact = apiError.details.cascadeImpact;
          apiError.travelInfo = apiError.details.travelInfo;
        }
        throw apiError;
      }
      
      throw error;
    }
  },

  /**
   * 获取所有行程项
   * GET /itinerary-items
   * @param costCategory 可选，按费用分类筛选（如 ACCOMMODATION 用于检查当天是否已有住宿）
   */
  getAll: async (
    tripDayId?: string,
    forceRefresh?: boolean,
    costCategory?: CostCategory
  ): Promise<ItineraryItemDetail[]> => {
    const params: Record<string, string | number> = {};
    if (tripDayId) params.tripDayId = tripDayId;
    if (costCategory) params.costCategory = costCategory;
    if (forceRefresh) params._t = Date.now();
    const response = await apiClient.get<ApiResponseWrapper<ItineraryItemDetail[]>>(
      '/itinerary-items',
      {
        params: Object.keys(params).length > 0 ? params : undefined,
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取行程项详情
   * GET /itinerary-items/:id
   */
  getById: async (id: string): Promise<ItineraryItemDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<ItineraryItemDetail>>(
      `/itinerary-items/${id}`
    );
    return handleResponse(response);
  },

  /**
   * 更新行程项（支持智能时间调整和校验）
   * PATCH /itinerary-items/:id
   * 
   * 智能时间调整功能：
   * - 当更新 startTime 时，系统会根据实际距离和交通方式自动计算旅行时间
   * - 自动调整当天后续所有行程项的时间，保持每个行程项的原有时长
   * - 在行程项之间添加 15 分钟的缓冲时间
   * - 如果时间不合理（早于计算出的时间超过 30 分钟），会返回警告错误
   * - 更新后需要重新获取当天的行程项以获取最新时间安排
   * 
   * 校验功能：
   * - 自动执行时间重叠、交通时间等校验
   * - 检测级联影响（对后续行程项的影响）
   * - 可通过 forceCreate 强制更新（忽略 WARNING）
   * 
   * @param id 行程项 ID
   * @param data 更新数据（所有字段都是可选的）
   * @returns 更新后的行程项详情（包含级联影响信息）
   * @throws {Error} 如果时间不合理或存在其他验证错误，会抛出包含错误信息的异常
   */
  update: async (id: string, data: UpdateItineraryItemRequest): Promise<UpdateItineraryItemResponse | ItineraryItemDetail> => {
    try {
      const response = await apiClient.patch<ApiResponseWrapper<UpdateItineraryItemResponse | ItineraryItemDetail>>(
        `/itinerary-items/${id}`,
        data
      );
      
      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        
        // 如果是需要确认的错误（REQUIRES_CONFIRMATION），返回特殊格式
        if (errorData.error.code === 'REQUIRES_CONFIRMATION') {
          const error = new Error(errorData.error.message) as Error & {
            code?: string;
            warnings?: any[];
            cascadeImpact?: any;
            travelInfo?: any;
          };
          error.code = errorData.error.code;
          // 从 details 中提取 warnings、cascadeImpact、travelInfo
          if (errorData.error.details) {
            error.warnings = errorData.error.details.warnings || [];
            error.cascadeImpact = errorData.error.details.cascadeImpact;
            error.travelInfo = errorData.error.details.travelInfo;
          }
          throw error;
        }
        
        // 其他错误正常抛出
        throw new Error(errorData.error.message);
      }
      
      const result = handleResponse(response);
      
      // 如果返回的是增强版响应（包含 cascadeImpact），直接返回
      if (result && typeof result === 'object' && 'item' in result) {
        return result as UpdateItineraryItemResponse;
      }
      
      // 否则包装为增强版响应
      return {
        item: result as ItineraryItemDetail,
        warnings: [],
      };
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }
      
      // 处理校验错误
      if (error.code === 'VALIDATION_ERROR' || error.code === 'REQUIRES_CONFIRMATION') {
        throw error;
      }
      
      // 处理后端错误响应（兼容 NestJS { message } 与自定义 { error: { message } } 格式）
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse & { message?: string };
        const message =
          errorData.message ??
          (typeof errorData.error === 'object' && errorData.error?.message
            ? errorData.error.message
            : undefined) ??
          error.message ??
          '更新行程项失败';
        const errObj = typeof errorData.error === 'object' ? errorData.error : null;
        const apiError = new Error(message) as Error & {
          code?: string;
          details?: any;
          warnings?: any[];
          cascadeImpact?: any;
          travelInfo?: any;
        };
        apiError.code = errObj?.code;
        apiError.details = errObj?.details;
        if (apiError.details) {
          apiError.warnings = apiError.details.warnings || [];
          apiError.cascadeImpact = apiError.details.cascadeImpact;
          apiError.travelInfo = apiError.details.travelInfo;
        }
        throw apiError;
      }
      
      throw error;
    }
  },

  /**
   * 删除行程项
   * DELETE /itinerary-items/:id
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/itinerary-items/${id}`);
  },

  /**
   * 获取行程项详细信息（包含完整 metadata）
   * GET /trips/:id/items/:itemId/detail
   */
  getDetail: async (tripId: string, itemId: string): Promise<ItineraryItemDetailResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ItineraryItemDetailResponse>>(
      `/trips/${tripId}/items/${itemId}/detail`
    );
    return handleResponse(response);
  },

  /**
   * 批量更新行程项
   * POST /trips/:id/items/batch-update
   */
  batchUpdate: async (
    tripId: string,
    data: BatchUpdateItemsRequest
  ): Promise<BatchUpdateItemsResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<BatchUpdateItemsResponse>>(
      `/trips/${tripId}/items/batch-update`,
      data
    );
    return handleResponse(response);
  },

  // ==================== 行程洞察 ====================

  /**
   * 获取行程洞察摘要
   * GET /trips/:id/insight
   * 
   * 获取行程的 AI 洞察摘要，包括行程基本信息、AI 发现的问题/建议、准备度摘要和整体状态。
   * 用于前端展示行程健康度和优化建议。
   */
  getInsight: async (id: string): Promise<TripInsightResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<TripInsightResponse>>(
      `/trips/${id}/insight`
    );
    return handleResponse(response);
  },

  // ==================== 行程项校验接口 ====================

  /**
   * 预校验行程项
   * POST /itinerary-items/validate
   * 
   * 校验行程项是否可创建，返回校验结果但不实际创建
   */
  validate: async (data: CreateItineraryItemRequest): Promise<ValidateItineraryItemResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ValidateItineraryItemResponse>>(
      '/itinerary-items/validate',
      data
    );
    return handleResponse(response);
  },

  /**
   * 批量校验行程
   * POST /itinerary-items/batch-validate/:tripId
   * 
   * 校验整个行程的所有行程项，返回所有问题汇总
   */
  batchValidate: async (
    tripId: string,
    data?: { dates?: string[] }
  ): Promise<BatchValidateItineraryResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<BatchValidateItineraryResponse>>(
      `/itinerary-items/batch-validate/${tripId}`,
      data || {}
    );
    return handleResponse(response);
  },

  // ==================== 行程项费用管理接口 ====================

  /**
   * 获取行程项费用信息
   * GET /itinerary-items/:id/cost
   */
  getCost: async (id: string): Promise<ItemCostResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ItemCostResponse>>(
      `/itinerary-items/${id}/cost`
    );
    return handleResponse(response);
  },

  /**
   * 更新行程项费用
   * PATCH /itinerary-items/:id/cost
   */
  updateCost: async (id: string, data: ItemCostRequest): Promise<UpdateItemCostResponse> => {
    const response = await apiClient.patch<ApiResponseWrapper<UpdateItemCostResponse>>(
      `/itinerary-items/${id}/cost`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 批量更新费用
   * PATCH /itinerary-items/batch-cost
   */
  batchUpdateCost: async (data: BatchUpdateCostRequest): Promise<BatchUpdateCostResponse> => {
    const response = await apiClient.patch<ApiResponseWrapper<BatchUpdateCostResponse>>(
      '/itinerary-items/batch-cost',
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取行程费用汇总
   * GET /itinerary-items/trip/:tripId/cost-summary
   */
  getCostSummary: async (tripId: string): Promise<TripCostSummary> => {
    const response = await apiClient.get<ApiResponseWrapper<TripCostSummary>>(
      `/itinerary-items/trip/${tripId}/cost-summary`
    );
    return handleResponse(response);
  },

  /**
   * 获取未支付的行程项
   * GET /itinerary-items/trip/:tripId/unpaid
   */
  getUnpaidItems: async (tripId: string): Promise<UnpaidItem[]> => {
    const response = await apiClient.get<ApiResponseWrapper<UnpaidItem[]>>(
      `/itinerary-items/trip/${tripId}/unpaid`
    );
    return handleResponse(response);
  },

  // ==================== 交通信息接口 ====================

  /**
   * 获取某天所有行程项之间的交通信息
   * GET /itinerary-items/trip/:tripId/days/:dayId/travel-info
   */
  getDayTravelInfo: async (tripId: string, dayId: string): Promise<DayTravelInfoResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DayTravelInfoResponse>>(
      `/itinerary-items/trip/${tripId}/days/${dayId}/travel-info`
    );
    return handleResponse(response);
  },

  /**
   * 更新行程项从上一地点的交通信息
   * PATCH /itinerary-items/:id/travel-info
   */
  updateTravelInfo: async (id: string, data: UpdateTravelInfoRequest): Promise<ItineraryItemDetail> => {
    const response = await apiClient.patch<ApiResponseWrapper<{ item: ItineraryItemDetail; message: string }>>(
      `/itinerary-items/${id}/travel-info`,
      data
    );
    const result = handleResponse(response);
    return result.item;
  },

  // ==================== 预订信息接口 ====================

  /**
   * 更新行程项的预订状态
   * PATCH /itinerary-items/:id/booking
   */
  updateBooking: async (id: string, data: UpdateBookingRequest): Promise<ItineraryItemDetail> => {
    const response = await apiClient.patch<ApiResponseWrapper<{ item: ItineraryItemDetail; message: string }>>(
      `/itinerary-items/${id}/booking`,
      data
    );
    const result = handleResponse(response);
    return result.item;
  },

  /**
   * 计算整个行程的交通信息（支持跨天）
   * POST /itinerary-items/trip/:tripId/calculate-all-travel
   */
  calculateAllTravel: async (
    tripId: string,
    data?: CalculateTravelRequest
  ): Promise<CalculateAllTravelResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CalculateAllTravelResponse>>(
      `/itinerary-items/trip/${tripId}/calculate-all-travel`,
      data || {}
    );
    return handleResponse(response);
  },

  /**
   * 计算单天的交通信息
   * POST /itinerary-items/trip/:tripId/days/:dayId/calculate-travel
   */
  calculateDayTravel: async (
    tripId: string,
    dayId: string,
    data?: CalculateTravelRequest
  ): Promise<CalculateDayTravelResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CalculateDayTravelResponse>>(
      `/itinerary-items/trip/${tripId}/days/${dayId}/calculate-travel`,
      data || {}
    );
    return handleResponse(response);
  },

  /**
   * 修复行程项日期一致性问题
   * POST /itinerary-items/trip/:tripId/fix-dates
   */
  fixDates: async (tripId: string): Promise<FixDatesResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<FixDatesResponse>>(
      `/itinerary-items/trip/${tripId}/fix-dates`
    );
    return handleResponse(response);
  },

  /**
   * 更新单个证据项状态
   * PATCH /trips/:id/evidence/:evidenceId
   */
  updateEvidence: async (
    tripId: string,
    evidenceId: string,
    data: {
      status?: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
      userNote?: string;
    }
  ): Promise<{
    evidenceId: string;
    status: string;
    updatedAt: string;
    userNote?: string;
  }> => {
    const response = await apiClient.patch<ApiResponseWrapper<{
      evidenceId: string;
      status: string;
      updatedAt: string;
      userNote?: string;
    }>>(
      `/trips/${tripId}/evidence/${evidenceId}`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 批量更新证据项状态
   * PUT /trips/:id/evidence/batch-update
   */
  batchUpdateEvidence: async (
    tripId: string,
    updates: Array<{
      evidenceId: string;
      status?: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
      userNote?: string;
    }>
  ): Promise<{
    updated: number;
    failed: number;
    errors?: Array<{
      evidenceId: string;
      error: string;
    }>;
  }> => {
    // 验证批量限制
    if (updates.length > 100) {
      throw new Error('批量更新最多支持100个证据项');
    }

    const response = await apiClient.put<ApiResponseWrapper<{
      updated: number;
      failed: number;
      errors?: Array<{
        evidenceId: string;
        error: string;
      }>;
    }>>(
      `/trips/${tripId}/evidence/batch-update`,
      { updates }
    );
    return handleResponse(response);
  },

  /**
   * 基于行程项搜索附近POI
   * GET /itinerary-items/nearby-poi
   */
  getNearbyPoi: async (params: {
    itemId?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    categories?: string | string[];
    minRating?: number;
    openNow?: boolean;
    limit?: number;
  }): Promise<NearbyPoiItem[]> => {
    const queryParams: any = {};
    
    if (params.itemId) {
      queryParams.itemId = params.itemId;
    } else if (params.lat !== undefined && params.lng !== undefined) {
      queryParams.lat = params.lat;
      queryParams.lng = params.lng;
    } else {
      throw new Error('必须提供 itemId 或 lat/lng 坐标');
    }
    
    if (params.radius !== undefined) {
      queryParams.radius = params.radius;
    }
    
    if (params.categories) {
      // 如果是数组，转换为逗号分隔的字符串
      queryParams.categories = Array.isArray(params.categories)
        ? params.categories.join(',')
        : params.categories;
    }
    
    if (params.minRating !== undefined) {
      queryParams.minRating = params.minRating;
    }
    
    if (params.openNow !== undefined) {
      queryParams.openNow = params.openNow;
    }
    
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    
    const response = await apiClient.get<ApiResponseWrapper<NearbyPoiItem[]>>(
      '/itinerary-items/nearby-poi',
      { params: queryParams }
    );
    return handleResponse(response);
  },
};
