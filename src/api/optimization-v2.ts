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

// ==================== 计划优化 API ====================

export const optimizationApi = {
  /**
   * 评估计划得分
   */
  async evaluate(request: EvaluatePlanRequest): Promise<EvaluatePlanResponse> {
    const { data } = await apiClient.post<EvaluatePlanResponse>(
      `${API_BASE}/optimization/evaluate`,
      request
    );
    return data;
  },

  /**
   * 比较两个计划
   */
  async compare(request: ComparePlansRequest): Promise<ComparePlansResponse> {
    const { data } = await apiClient.post<ComparePlansResponse>(
      `${API_BASE}/optimization/compare`,
      request
    );
    return data;
  },

  /**
   * 一键优化计划
   */
  async optimize(request: OptimizePlanRequest): Promise<OptimizePlanResponse> {
    const { data } = await apiClient.post<OptimizePlanResponse>(
      `${API_BASE}/optimization/optimize`,
      request
    );
    return data;
  },

  /**
   * 风险评估 (Monte Carlo)
   */
  async assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
    const { data } = await apiClient.post<RiskAssessmentResponse>(
      `${API_BASE}/optimization/risk-assessment`,
      request
    );
    return data;
  },

  /**
   * 获取协商结论
   */
  async negotiate(request: NegotiationRequest): Promise<NegotiationResponse> {
    const { data } = await apiClient.post<NegotiationResponse>(
      `${API_BASE}/optimization/negotiation`,
      request
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
   */
  async negotiate(
    teamId: string,
    plan: RoutePlanDraft,
    world: WorldModelContext
  ): Promise<TeamNegotiationResponse> {
    const { data } = await apiClient.post<TeamNegotiationResponse>(
      `${API_BASE}/team/${teamId}/negotiate`,
      { plan, world }
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
   */
  async getState(tripId: string): Promise<RealtimeStateResponse> {
    const { data } = await apiClient.get<RealtimeStateResponse>(
      `${API_BASE}/realtime/state/${tripId}`
    );
    return data;
  },

  /**
   * 预测未来状态
   */
  async predictState(tripId: string, hoursAhead: number = 24): Promise<PredictedStateResponse> {
    const { data } = await apiClient.get<PredictedStateResponse>(
      `${API_BASE}/realtime/state/${tripId}/predict`,
      { params: { hoursAhead } }
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
