/**
 * V2 优化系统 API
 * 
 * @module api/optimization-v2
 * @description 计划优化、团队协作、实时状态 API 客户端
 */

import apiClient from './client';
import type {
  // 计划优化
  EvaluatePlanRequest,
  EvaluatePlanResponse,
  ComparePlansRequest,
  ComparePlansResponse,
  OptimizePlanRequest,
  OptimizePlanResponse,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  NegotiationRequest,
  NegotiationResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  UserPreferencesResponse,
  // 团队
  CreateTeamRequest,
  Team,
  TeamMember,
  TeamNegotiationResponse,
  TeamWeightsResponse,
  TeamConstraintsResponse,
  // 实时状态
  InitializeRealtimeStateRequest,
  InitializeRealtimeStateResponse,
  StateExistsResponse,
  SubscribeRequest,
  SubscribeResponse,
  RealtimeStateResponse,
  PredictedStateResponse,
  FieldReportRequest,
  FieldReportResponse,
  // 基础类型
  RoutePlanDraft,
  WorldModelContext,
} from '@/types/optimization-v2';

// 注意：baseURL 已经是 /api，所以这里不需要 /api 前缀
const API_BASE = '/v2/user';

/** 确保请求体为纯 JSON 对象，避免 React Query Proxy 序列化丢失字段 */
function toPlainBody<T>(req: T): T {
  return JSON.parse(JSON.stringify(req)) as T;
}

// ==================== 计划优化 API ====================

export const optimizationApi = {
  /**
   * 评估计划得分
   */
  async evaluate(request: EvaluatePlanRequest): Promise<EvaluatePlanResponse> {
    const body = toPlainBody(request);
    const { data } = await apiClient.post<EvaluatePlanResponse>(
      `${API_BASE}/optimization/evaluate`,
      body
    );
    return data;
  },

  /**
   * 比较两个计划
   */
  async compare(request: ComparePlansRequest): Promise<ComparePlansResponse> {
    const body = toPlainBody(request);
    const { data } = await apiClient.post<ComparePlansResponse>(
      `${API_BASE}/optimization/compare`,
      body
    );
    return data;
  },

  /**
   * 一键优化计划
   * 后端需要 plan+world 或 tripId/trip_id，此处确保传 tripId 以兼容后端校验
   * 响应映射：后端可能返回 plan/logs/summary.finalUtility，映射为 optimizedPlan/changes/finalUtility
   */
  async optimize(request: OptimizePlanRequest): Promise<OptimizePlanResponse> {
    const tripId = request.tripId ?? request.trip_id ?? request.plan?.tripId;
    const body = toPlainBody({
      ...request,
      ...(tripId ? { tripId, trip_id: tripId } : {}),
    });
    const { data } = await apiClient.post<Record<string, unknown>>(
      `${API_BASE}/optimization/optimize`,
      body
    );
    const raw = data as Record<string, unknown>;
    const rawFinalUtility = Number(raw.finalUtility ?? (raw.summary as Record<string, unknown>)?.finalUtility ?? 0);
    return {
      originalPlan: (raw.originalPlan ?? request.plan) as OptimizePlanResponse['originalPlan'],
      optimizedPlan: (raw.optimizedPlan ?? raw.plan) as OptimizePlanResponse['optimizedPlan'],
      changes: (raw.changes ?? raw.logs ?? []) as OptimizePlanResponse['changes'],
      finalUtility: Number.isNaN(rawFinalUtility) ? 0 : rawFinalUtility,
      processingTimeMs: Number(raw.processingTimeMs ?? 0),
    };
  },

  /**
   * 风险评估 (Monte Carlo)
   * 后端需要 plan+world 或 tripId/trip_id
   */
  async assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
    const tripId = request.tripId ?? request.trip_id ?? request.plan?.tripId;
    const body = toPlainBody({
      ...request,
      ...(tripId ? { tripId, trip_id: tripId } : {}),
    });
    const { data } = await apiClient.post<RiskAssessmentResponse>(
      `${API_BASE}/optimization/risk-assessment`,
      body
    );
    return data;
  },

  /**
   * 获取协商结论（三守护者）
   * 方式一：传 plan + world
   * 方式二：只传 tripId / trip_id / id，后端加载 plan 与 world 再协商
   * 若既未传 plan+world 也未传 tripId/trip_id/id，返回 400
   */
  async negotiate(request: NegotiationRequest): Promise<NegotiationResponse> {
    const hasPlanWorld = request.plan && request.world;
    const tripId = request.tripId ?? request.trip_id ?? request.id ?? request.plan?.tripId;
    const hasTripId = !!tripId;

    if (!hasPlanWorld && !hasTripId) {
      throw new Error('协商请求需要 plan + world，或仅传 tripId / trip_id / id 由后端加载');
    }

    const body = hasPlanWorld
      ? toPlainBody({
          plan: request.plan,
          world: request.world,
          ...(tripId ? { tripId, trip_id: tripId } : {}),
        })
      : toPlainBody({ tripId, trip_id: tripId });
    const { data } = await apiClient.post<NegotiationResponse>(
      `${API_BASE}/optimization/negotiation`,
      body
    );
    return data;
  },

  /**
   * 提交反馈
   */
  async submitFeedback(request: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> {
    const { data } = await apiClient.post<SubmitFeedbackResponse>(
      `${API_BASE}/optimization/feedback`,
      request
    );
    return data;
  },

  /**
   * 获取个性化偏好
   */
  async getPreferences(userId: string): Promise<UserPreferencesResponse> {
    const { data } = await apiClient.get<UserPreferencesResponse>(
      `${API_BASE}/optimization/preferences/${userId}`
    );
    return data;
  },
};

// ==================== 团队协作 API ====================

export const teamApi = {
  /**
   * 创建团队
   */
  async create(request: CreateTeamRequest): Promise<Team> {
    const { data } = await apiClient.post<Team>(
      `${API_BASE}/team`,
      request
    );
    return data;
  },

  /**
   * 获取团队信息
   */
  async get(teamId: string): Promise<Team> {
    const { data } = await apiClient.get<Team>(
      `${API_BASE}/team/${teamId}`
    );
    return data;
  },

  /**
   * 更新团队信息
   */
  async update(teamId: string, updates: Partial<CreateTeamRequest>): Promise<Team> {
    const { data } = await apiClient.patch<Team>(
      `${API_BASE}/team/${teamId}`,
      updates
    );
    return data;
  },

  /**
   * 删除团队
   */
  async delete(teamId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/team/${teamId}`);
  },

  /**
   * 添加成员
   */
  async addMember(teamId: string, member: TeamMember): Promise<Team> {
    const { data } = await apiClient.post<Team>(
      `${API_BASE}/team/${teamId}/members`,
      member
    );
    return data;
  },

  /**
   * 移除成员
   */
  async removeMember(teamId: string, userId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/team/${teamId}/members/${userId}`);
  },

  /**
   * 更新成员信息
   */
  async updateMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<Team> {
    const { data } = await apiClient.patch<Team>(
      `${API_BASE}/team/${teamId}/members/${userId}`,
      updates
    );
    return data;
  },

  /**
   * 团队协商
   *
   * 请求体必须包含 plan (RoutePlanDraft，含 tripId) 和 world (WorldModelContext)。
   * 后端要求 body.plan 与 body.world 必填，此处确保以 JSON 可序列化的普通对象发送。
   */
  async negotiate(
    teamId: string,
    plan: RoutePlanDraft,
    world: WorldModelContext
  ): Promise<TeamNegotiationResponse> {
    const planToSend =
      plan && typeof plan === 'object' && Array.isArray(plan.days)
        ? { ...plan, tripId: plan.tripId ?? '' }
        : null;
    const worldToSend =
      world &&
      typeof world === 'object' &&
      world.physical &&
      world.human &&
      world.routeDirection
        ? world
        : null;

    if (!planToSend || !worldToSend) {
      throw new Error(
        '团队协商请求需要有效的 plan (RoutePlanDraft) 和 world (WorldModelContext)'
      );
    }

    // 确保 body 为普通对象，避免 Proxy/响应式对象导致序列化后丢失字段
    const body = {
      plan: JSON.parse(JSON.stringify(planToSend)),
      world: JSON.parse(JSON.stringify(worldToSend)),
    };

    const { data } = await apiClient.post<TeamNegotiationResponse>(
      `${API_BASE}/team/${teamId}/negotiate`,
      body
    );
    return data;
  },

  /**
   * 获取团队综合权重
   */
  async getWeights(teamId: string): Promise<TeamWeightsResponse> {
    const { data } = await apiClient.get<TeamWeightsResponse>(
      `${API_BASE}/team/${teamId}/weights`
    );
    return data;
  },

  /**
   * 获取团队约束（最弱链）
   */
  async getConstraints(teamId: string): Promise<TeamConstraintsResponse> {
    const { data } = await apiClient.get<TeamConstraintsResponse>(
      `${API_BASE}/team/${teamId}/constraints`
    );
    return data;
  },
};

// ==================== 实时状态 API ====================

export const realtimeApi = {
  /**
   * 初始化行程实时状态
   */
  async initializeState(request: InitializeRealtimeStateRequest): Promise<InitializeRealtimeStateResponse> {
    const { data } = await apiClient.post<InitializeRealtimeStateResponse>(
      `${API_BASE}/realtime/state/initialize`,
      request
    );
    return data;
  },

  /**
   * 检查状态是否存在
   */
  async checkStateExists(tripId: string): Promise<StateExistsResponse> {
    const { data } = await apiClient.get<StateExistsResponse>(
      `${API_BASE}/realtime/state/${tripId}/exists`
    );
    return data;
  },

  /**
   * 订阅状态更新
   */
  async subscribe(request: SubscribeRequest): Promise<SubscribeResponse> {
    const { data } = await apiClient.post<SubscribeResponse>(
      `${API_BASE}/realtime/subscribe`,
      request
    );
    return data;
  },

  /**
   * 取消订阅
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/realtime/subscribe/${subscriptionId}`);
  },

  /**
   * 获取当前状态
   * @param tripId 行程 ID
   * @param autoInit 状态不存在时是否自动初始化（推荐使用 true）
   */
  async getState(tripId: string, autoInit: boolean = true): Promise<RealtimeStateResponse> {
    const { data } = await apiClient.get<RealtimeStateResponse>(
      `${API_BASE}/realtime/state/${tripId}`,
      { params: { autoInit } }
    );
    return data;
  },

  /**
   * 预测未来状态
   * @param tripId 行程 ID
   * @param hoursAhead 预测未来小时数
   * @param autoInit 状态不存在时是否自动初始化
   */
  async predictState(tripId: string, hoursAhead: number = 24, autoInit: boolean = true): Promise<PredictedStateResponse> {
    const { data } = await apiClient.get<PredictedStateResponse>(
      `${API_BASE}/realtime/state/${tripId}/predict`,
      { params: { hoursAhead, autoInit } }
    );
    return data;
  },

  /**
   * 提交实地报告
   */
  async submitReport(request: FieldReportRequest): Promise<FieldReportResponse> {
    const { data } = await apiClient.post<FieldReportResponse>(
      `${API_BASE}/realtime/report`,
      request
    );
    return data;
  },

  /**
   * 创建 SSE 连接进行实时订阅
   * @returns EventSource 实例
   */
  createEventSource(subscriptionId: string): EventSource {
    const baseUrl = apiClient.defaults.baseURL || '';
    return new EventSource(
      `${baseUrl}${API_BASE}/realtime/events/${subscriptionId}`
    );
  },
};

// ==================== 导出统一入口 ====================

export const optimizationV2 = {
  optimization: optimizationApi,
  team: teamApi,
  realtime: realtimeApi,
};

export default optimizationV2;
