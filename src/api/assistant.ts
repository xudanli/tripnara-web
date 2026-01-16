/**
 * 智能体助手 API
 * 
 * 包含两个智能体：
 * - 规划助手 (Planning Assistant): 帮用户规划旅行
 * - 行程助手 (Journey Assistant): 陪用户执行旅程
 * 
 * Base URL: /api/agent
 */

import apiClient from './client';

// ==================== 通用类型 ====================

export interface SuggestedAction {
  action: string;
  label: string;
  labelCN: string;
  primary?: boolean;  // V2.1: 是否为主要操作
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
  nameCN?: string;
  address?: string;
}

// ==================== V2.1 架构新增类型 ====================

/**
 * 叙述分段类型
 * 用于结构化展示消息内容
 */
export type NarrativeSectionType = 'summary' | 'details' | 'warnings' | 'actions';

/**
 * 叙述分段
 * 来自 Narrator 子智能体的结构化输出
 */
export interface NarrativeSection {
  type: NarrativeSectionType;
  title: string;
  titleCN: string;
  content: string;
  contentCN: string;
}

/**
 * 三人格名称
 */
export type PersonaName = 'Abu' | 'Dr.Dre' | 'Neptune';

/**
 * 专家引用
 * 来自子智能体的专家意见引用
 */
export interface ExpertCitation {
  agentId: string;
  personaName: PersonaName;
  quote: string;
  quoteCN: string;
}

/**
 * 降级信息
 * 当系统发生降级时的相关信息
 */
export interface DegradationInfo {
  degraded: boolean;
  reason?: string;
  reasonCN?: string;
  severity?: 'info' | 'warning' | 'error';
  actionRequired?: boolean;
}

/**
 * 用户通知
 * 需要提示用户的系统消息
 */
export interface UserNotification {
  message: string;
  messageCN: string;
  severity: 'info' | 'warning' | 'error';
  actionRequired: boolean;
}

// ==================== 规划助手类型 ====================

/**
 * 对话阶段
 */
export type PlanningPhase = 
  | 'INITIAL'      // 初始阶段
  | 'EXPLORING'    // 探索阶段
  | 'RECOMMENDING' // 推荐阶段
  | 'PLANNING'     // 规划阶段
  | 'COMPARING'    // 对比阶段
  | 'ADJUSTING'    // 调整阶段
  | 'CONFIRMING'   // 确认阶段
  | 'COMPLETED';   // 完成阶段

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  userId?: string;
}

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  sessionId: string;
}

/**
 * 规划对话请求
 */
export interface PlanningChatRequest {
  sessionId: string;
  message: string;
  userId?: string;
  language?: 'en' | 'zh';
  context?: {
    currentLocation?: Location;
    timezone?: string;
  };
}

/**
 * 引导问题
 */
export interface GuidingQuestion {
  question: string;
  questionCN: string;
  options?: string[];
  optionsCN?: string[];
  type: 'single' | 'multiple' | 'text' | 'date' | 'number';
}

/**
 * 目的地推荐
 */
export interface DestinationRecommendation {
  id: string;
  countryCode: string;
  name: string;
  nameCN: string;
  description: string;
  descriptionCN: string;
  highlights: string[];
  highlightsCN: string[];
  matchScore: number;
  matchReasons: string[];
  matchReasonsCN: string[];
  estimatedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  bestSeasons: string[];
  imageUrl?: string;
  tags: string[];
}

/**
 * 方案候选
 */
export interface PlanCandidate {
  id: string;
  name: string;
  nameCN: string;
  description: string;
  descriptionCN: string;
  destination: string;
  duration: number;
  highlights: string[];
  estimatedBudget: {
    total: number;
    breakdown: {
      flight: number;
      accommodation: number;
      activities: number;
      food: number;
      other: number;
    };
  };
  pace: 'relaxed' | 'moderate' | 'intensive';
  suitability: {
    score: number;
    reasons: string[];
  };
  warnings?: string[];
}

/**
 * 方案对比
 */
export interface PlanComparison {
  dimensions: string[];
  candidates: {
    id: string;
    name: string;
    scores: Record<string, number>;
  }[];
  recommendation: string;
  recommendationCN: string;
}

/**
 * 规划对话响应
 * V2.1: 新增 sections, citations, degradation 字段
 */
export interface PlanningChatResponse {
  // 基础消息
  message: string;
  messageCN: string;
  
  // 当前阶段
  phase: PlanningPhase;
  
  // V2.1 新增：结构化内容分段
  sections?: NarrativeSection[];
  
  // V2.1 新增：专家引用（三人格发言）
  citations?: ExpertCitation[];
  
  // 探索阶段
  guidingQuestions?: GuidingQuestion[];
  
  // 推荐阶段
  recommendations?: DestinationRecommendation[];
  
  // 规划阶段
  planCandidates?: PlanCandidate[];
  
  // 对比阶段
  comparison?: PlanComparison;
  
  // 完成阶段
  confirmedTripId?: string;
  
  // 建议操作
  suggestedActions?: SuggestedAction[];
  
  // V2.1 新增：降级信息
  degradation?: DegradationInfo;
  
  // V2.1 新增：用户通知
  notification?: UserNotification;
}

/**
 * 用户偏好
 */
export interface UserPreferences {
  travelers?: {
    adults?: number;
    children?: number;
    childrenAges?: number[];
  };
  dateRange?: {
    startDate?: string;
    endDate?: string;
    flexible?: boolean;
    preferredMonths?: number[];
  };
  budget?: {
    total?: number;
    currency?: string;
    level?: 'low' | 'medium' | 'high' | 'luxury';
  };
  destination?: {
    continents?: string[];
    countries?: string[];
    type?: ('beach' | 'city' | 'nature' | 'culture' | 'adventure')[];
  };
  activities?: {
    preferred?: string[];
    avoid?: string[];
    pacePreference?: 'relaxed' | 'moderate' | 'intensive';
  };
}

/**
 * 会话状态响应
 */
export interface SessionStateResponse {
  sessionId: string;
  userId?: string;
  phase: PlanningPhase;
  preferences: UserPreferences;
  recommendations?: DestinationRecommendation[];
  selectedDestination?: string;
  planCandidates?: PlanCandidate[];
  selectedPlanId?: string;
  confirmedTripId?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户偏好摘要响应 (P1 新功能)
 */
export interface UserPreferenceSummaryResponse {
  summary: string;
  summaryCN: string;
  topPreferences: Array<{
    label: string;
    labelCN: string;
    value: string;
  }>;
  learnedPreferences?: {
    destination?: {
      continents?: string[];
      countries?: string[];
      type?: ('beach' | 'city' | 'nature' | 'culture' | 'adventure')[];
    };
    budget?: {
      total?: number;
      currency?: string;
    };
    travelers?: {
      adults?: number;
      children?: number;
    };
    activities?: {
      preferred?: string[];
      pacePreference?: 'relaxed' | 'moderate' | 'intensive';
    };
  };
}

// ==================== 行程助手类型 ====================

/**
 * 行程阶段
 */
export type JourneyPhase = 
  | 'PRE_TRIP'       // 出发前
  | 'DEPARTURE_DAY'  // 出发当天
  | 'ON_TRIP'        // 旅途中
  | 'RETURN_DAY'     // 返程当天
  | 'POST_TRIP';     // 旅行结束后

/**
 * 行程对话请求
 */
export interface JourneyChatRequest {
  tripId: string;
  userId: string;
  message: string;
  language?: 'en' | 'zh';
  context?: {
    currentLocation?: Location;
    timezone?: string;
  };
}

/**
 * 日程项
 */
export interface ScheduleItem {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'transport' | 'meal' | 'rest';
  title: string;
  titleCN: string;
  startTime: string;
  endTime?: string;
  location?: Location;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'modified';
  notes?: string;
  notesCN?: string;
}

/**
 * 提醒
 */
export interface Reminder {
  id: string;
  type: 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSPORT' | 'WEATHER' | 'SAFETY' | 'DOCUMENT' | 'PACKING' | 'BUDGET';
  title: string;
  titleCN: string;
  message: string;
  messageCN: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt: string;
  relatedItemId?: string;
  actionRequired?: boolean;
  actions?: SuggestedAction[];
}

/**
 * 行程事件
 */
export interface TripEvent {
  id: string;
  type: string;
  title: string;
  titleCN: string;
  description: string;
  descriptionCN: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt?: string;
}

/**
 * 应急方案
 */
export interface EmergencyOption {
  id: string;
  title: string;
  titleCN: string;
  description: string;
  descriptionCN: string;
  impact: string;
  impactCN: string;
  cost?: number;
}

/**
 * 调整结果
 */
export interface AdjustmentResult {
  success: boolean;
  message: string;
  messageCN: string;
  affectedItems?: ScheduleItem[];
}

/**
 * 搜索结果
 */
export interface SearchResults {
  type: string;
  items: Array<{
    id?: string;
    name: string;
    nameCN: string;
    distance?: string;
    rating?: number;
    priceLevel?: string;
    location?: Location;
    imageUrl?: string;
  }>;
}

/**
 * 行程状态
 */
export interface JourneyState {
  tripId: string;
  userId: string;
  phase: JourneyPhase;
  currentDay: number;
  totalDays: number;
  currentDate: string;
  currentLocation?: Location;
  todaySchedule: ScheduleItem[];
  upcomingReminders: Reminder[];
  activeEvents: TripEvent[];
  stats: {
    completedActivities: number;
    totalActivities: number;
    spentBudget: number;
    totalBudget: number;
  };
  lastUpdated: string;
}

/**
 * 行程助手响应
 * V2.1: 新增 sections, citations, degradation 字段
 */
export interface JourneyAssistantResponse {
  // 基础消息
  message?: string;
  messageCN?: string;
  
  // V2.1 新增：结构化内容分段
  sections?: NarrativeSection[];
  
  // V2.1 新增：专家引用（三人格发言）
  citations?: ExpertCitation[];
  
  // 行程状态
  journeyState?: JourneyState;
  
  // 提醒
  reminders?: Reminder[];
  
  // 事件
  event?: TripEvent;
  
  // 应急选项
  options?: EmergencyOption[];
  
  // 调整结果
  adjustmentResult?: AdjustmentResult;
  
  // 搜索结果
  searchResults?: SearchResults;
  
  // 建议操作
  suggestedActions?: SuggestedAction[];
  
  // V2.1 新增：降级信息
  degradation?: DegradationInfo;
  
  // V2.1 新增：用户通知
  notification?: UserNotification;
}

/**
 * 处理事件请求
 */
export interface HandleEventRequest {
  tripId: string;
  userId: string;
  eventId: string;
  selectedOptionId?: string;
  language?: 'en' | 'zh';
  context?: {
    currentLocation?: Location;
    timezone?: string;
  };
}

/**
 * 调整行程请求
 */
export interface AdjustScheduleRequest {
  tripId: string;
  userId: string;
  adjustmentParams: {
    itemId: string;
    newTime?: string;
    cancel?: boolean;
    replace?: {
      type: string;
      details: Record<string, unknown>;
    };
  };
  language?: 'en' | 'zh';
}

/**
 * 紧急求助请求
 */
export interface EmergencyRequest {
  tripId: string;
  userId: string;
  language?: 'en' | 'zh';
  context?: {
    currentLocation?: Location;
  };
}

/**
 * 附近搜索请求
 */
export interface NearbySearchRequest {
  tripId: string;
  userId: string;
  message: string;
  language?: 'en' | 'zh';
  context?: {
    currentLocation?: Location;
  };
}

// ==================== 规划助手 API ====================

export const planningAssistantApi = {
  /**
   * 创建会话
   * POST /agent/planning-assistant/sessions
   */
  createSession: async (data?: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const response = await apiClient.post<CreateSessionResponse>(
      '/agent/planning-assistant/sessions',
      data || {}
    );
    return response.data;
  },

  /**
   * 对话
   * POST /agent/planning-assistant/chat
   */
  chat: async (data: PlanningChatRequest): Promise<PlanningChatResponse> => {
    const response = await apiClient.post<PlanningChatResponse>(
      '/agent/planning-assistant/chat',
      data
    );
    return response.data;
  },

  /**
   * 获取会话状态
   * GET /agent/planning-assistant/sessions/:sessionId
   */
  getSessionState: async (sessionId: string): Promise<SessionStateResponse> => {
    const response = await apiClient.get<SessionStateResponse>(
      `/agent/planning-assistant/sessions/${sessionId}`
    );
    return response.data;
  },

  /**
   * 快速推荐
   * GET /agent/planning-assistant/quick-recommend
   */
  quickRecommend: async (params?: {
    budget?: string;
    travelersCount?: string;
    preferredType?: string;
    language?: 'en' | 'zh';
  }): Promise<DestinationRecommendation[]> => {
    const response = await apiClient.get<DestinationRecommendation[]>(
      '/agent/planning-assistant/quick-recommend',
      { params }
    );
    return response.data;
  },

  /**
   * 获取用户偏好摘要 (P1 新功能)
   * GET /agent/planning-assistant/users/:userId/preferences
   * 
   * 获取系统学习到的用户旅行偏好，用于个性化推荐
   */
  getUserPreferences: async (userId: string): Promise<UserPreferenceSummaryResponse> => {
    const response = await apiClient.get<UserPreferenceSummaryResponse>(
      `/agent/planning-assistant/users/${userId}/preferences`
    );
    return response.data;
  },

  /**
   * 清除用户偏好 (P1 新功能)
   * POST /agent/planning-assistant/users/:userId/preferences/clear
   * 
   * 清除系统学习到的用户旅行偏好
   */
  clearUserPreferences: async (userId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/agent/planning-assistant/users/${userId}/preferences/clear`
    );
    return response.data;
  },
};

// ==================== 行程助手 API ====================

export const journeyAssistantApi = {
  /**
   * 对话
   * POST /agent/journey-assistant/chat
   */
  chat: async (data: JourneyChatRequest): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.post<JourneyAssistantResponse>(
      '/agent/journey-assistant/chat',
      data
    );
    return response.data;
  },

  /**
   * 获取行程状态
   * GET /agent/journey-assistant/trips/:tripId/status
   */
  getTripStatus: async (tripId: string): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.get<JourneyAssistantResponse>(
      `/agent/journey-assistant/trips/${tripId}/status`
    );
    return response.data;
  },

  /**
   * 获取提醒列表
   * GET /agent/journey-assistant/trips/:tripId/reminders
   */
  getReminders: async (tripId: string): Promise<Reminder[]> => {
    const response = await apiClient.get<Reminder[]>(
      `/agent/journey-assistant/trips/${tripId}/reminders`
    );
    return response.data;
  },

  /**
   * 处理突发事件
   * POST /agent/journey-assistant/events/handle
   */
  handleEvent: async (data: HandleEventRequest): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.post<JourneyAssistantResponse>(
      '/agent/journey-assistant/events/handle',
      data
    );
    return response.data;
  },

  /**
   * 调整行程
   * POST /agent/journey-assistant/schedule/adjust
   */
  adjustSchedule: async (data: AdjustScheduleRequest): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.post<JourneyAssistantResponse>(
      '/agent/journey-assistant/schedule/adjust',
      data
    );
    return response.data;
  },

  /**
   * 紧急求助
   * POST /agent/journey-assistant/emergency
   */
  emergency: async (data: EmergencyRequest): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.post<JourneyAssistantResponse>(
      '/agent/journey-assistant/emergency',
      data
    );
    return response.data;
  },

  /**
   * 附近搜索
   * POST /agent/journey-assistant/nearby
   */
  nearbySearch: async (data: NearbySearchRequest): Promise<JourneyAssistantResponse> => {
    const response = await apiClient.post<JourneyAssistantResponse>(
      '/agent/journey-assistant/nearby',
      data
    );
    return response.data;
  },
};
