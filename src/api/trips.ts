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
    const errorMessage = response.data.error?.message || '请求失败';
    console.error('[API Client] 请求失败:', {
      error: response.data.error,
      message: errorMessage,
    });
    throw new Error(errorMessage);
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
  CollectedTrip,
  FeaturedTrip,
  ExportOfflinePackResponse,
  OfflinePackStatus,
  SyncOfflineChangesRequest,
  SyncOfflineChangesResponse,
  TripRecapReport,
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
} from '@/types/trip';
import type {
  SuggestionListResponse,
  SuggestionStats,
  ApplySuggestionRequest,
  ApplySuggestionResponse,
} from '@/types/suggestion';

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
   */
  createFromNL: async (data: CreateTripFromNLRequest): Promise<CreateTripFromNLResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateTripFromNLResponse>>(
      '/trips/from-natural-language',
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取单个行程详情（全景视图）
   * GET /trips/:id
   */
  getById: async (id: string): Promise<TripDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<TripDetail>>(`/trips/${id}`);
    return handleResponse(response);
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
   */
  getCollected: async (): Promise<CollectedTrip[]> => {
    const response = await apiClient.get<ApiResponseWrapper<CollectedTrip[]>>('/trips/collected');
    return handleResponse(response);
  },

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
  getBudgetSummary: async (id: string): Promise<BudgetSummary> => {
    const response = await apiClient.get<ApiResponseWrapper<BudgetSummary>>(`/trips/${id}/budget/summary`);
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
   */
  getEvidence: async (
    tripId: string,
    params?: {
      limit?: number;
      offset?: number;
      day?: number;
      type?: EvidenceType;
    }
  ): Promise<EvidenceListResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<EvidenceListResponse>>(
      `/trips/${tripId}/evidence`,
      { params }
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
    const response = await apiClient.get<ApiResponseWrapper<TripMetricsResponse>>(
      `/trips/${id}/metrics`,
      { params: params?.dates ? { dates: params.dates } : undefined }
    );
    return handleResponse(response);
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
   */
  create: async (data: CreateItineraryItemRequest): Promise<ItineraryItemDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<ItineraryItemDetail>>(
      '/itinerary-items',
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取所有行程项
   * GET /itinerary-items
   */
  getAll: async (tripDayId?: string): Promise<ItineraryItemDetail[]> => {
    const response = await apiClient.get<ApiResponseWrapper<ItineraryItemDetail[]>>(
      '/itinerary-items',
      {
        params: tripDayId ? { tripDayId } : undefined,
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
   * 更新行程项
   * PATCH /itinerary-items/:id
   */
  update: async (id: string, data: UpdateItineraryItemRequest): Promise<ItineraryItemDetail> => {
    const response = await apiClient.patch<ApiResponseWrapper<ItineraryItemDetail>>(
      `/itinerary-items/${id}`,
      data
    );
    return handleResponse(response);
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
};

