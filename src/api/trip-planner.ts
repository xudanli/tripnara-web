/**
 * 行程规划智能助手 API
 * 
 * 规划工作台右侧助手的核心 API，支持：
 * - 开始规划会话
 * - 对话交互
 * - 快捷操作
 * - 确认修改
 * 
 * 🆕 已更新为新接口：
 * - Base URL: /api/agent/planning-assistant
 * - 旧接口已移除，不再使用 /api/trip-planner
 */

import apiClient from './client';

// ==================== 阶段与意图枚举 ====================

/**
 * 当前阶段
 */
export type PlannerPhase = 
  | 'OVERVIEW'     // 概览阶段
  | 'OPTIMIZING'   // 优化阶段
  | 'DETAILING'    // 细化阶段
  | 'CONSULTING'   // 咨询阶段
  | 'EXECUTING';   // 执行阶段

/**
 * 用户意图分类
 */
export type PlannerIntent = 
  // 优化类
  | 'SHOW_OVERVIEW'      // 查看概览
  | 'OPTIMIZE_ROUTE'     // 优化路线
  | 'REPLACE_POI'        // 替换景点
  | 'ADJUST_PACE'        // 调整节奏
  | 'REBALANCE_DAYS'     // 重新分配天数
  // 细化类
  | 'ADD_ACTIVITY'       // 添加活动
  | 'ARRANGE_MEALS'      // 推荐餐厅
  | 'PLAN_TRANSPORT'     // 规划交通
  | 'FILL_FREE_TIME'     // 填充空闲时间
  // 咨询类
  | 'ASK_QUESTION'       // 问问题
  | 'GET_SUGGESTION'     // 获取建议
  | 'CHECK_FEASIBILITY'  // 检查可行性
  | 'COMPARE_OPTIONS'    // 对比选项
  // 执行类
  | 'CREATE_CHECKLIST'   // 创建清单
  | 'EXPORT_ITINERARY'   // 导出行程
  | 'APPLY_PACE_ADJUSTMENT'  // 应用节奏调整
  | 'MANUAL_ADJUST';     // 手动调整

/**
 * 快捷操作类型
 */
export type QuickActionType = 
  | 'OPTIMIZE_ROUTE'
  | 'ARRANGE_MEALS'
  | 'CREATE_CHECKLIST'
  | 'SHOW_OVERVIEW'
  | 'PLAN_TRANSPORT'
  | 'FILL_FREE_TIME'
  | 'GET_SUGGESTION'
  | 'EXPORT_ITINERARY'
  | 'APPLY_PACE_ADJUSTMENT'
  | 'MANUAL_ADJUST';

/**
 * 按钮样式类型
 */
export type QuickActionStyle = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

// ==================== 数据结构类型 ====================

/**
 * 快捷操作按钮
 */
export interface QuickAction {
  id: string;
  label: string;
  /** 🆕 选项描述（用于澄清按钮） */
  description?: string;
  action: QuickActionType | 'CLARIFY_INTENT';
  style: QuickActionStyle;
  /** 🆕 澄清选择数据 */
  data?: {
    selectedAction?: ClarificationAction;
    params?: {
      dayNumber?: number;
      timeSlot?: { start: string; end: string };
      targetItemId?: string;
      gapId?: string;
    };
  };
}

/**
 * 时间线项目
 * 
 * 注意：后端可能返回不同的字段名，前端需要兼容处理
 * - placeName: ScheduleItem 风格
 * - title/titleCN: 标准 TimelineItem 风格
 */
export interface TimelineItem {
  id: string;
  time?: string;
  // 地点名称 - 支持多种字段名
  placeName?: string;  // ScheduleItem 风格
  title?: string;      // 英文名
  titleCN?: string;    // 中文名
  // 类型 - 支持大小写
  type: 'poi' | 'transport' | 'meal' | 'rest' | 'hotel' | 'TRANSIT' | 'ACTIVITY' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST' | string;
  duration?: number; // 分钟
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  status?: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

/**
 * 日程天数据
 */
export interface TimelineDay {
  day: number;
  date: string;
  theme: string;
  themeCN?: string;
  items: TimelineItem[];
}

/**
 * 富文本内容 - 时间线类型
 */
export interface TimelineRichContent {
  type: 'timeline';
  data: TimelineDay[];
}

/**
 * 对比项
 */
export interface ComparisonItem {
  id: string;
  name: string;
  nameCN?: string;
  metrics: Record<string, string | number>;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

/**
 * 富文本内容 - 对比表类型
 */
export interface ComparisonRichContent {
  type: 'comparison';
  title: string;
  titleCN?: string;
  items: ComparisonItem[];
}

/**
 * 清单项
 */
export interface ChecklistItem {
  id: string;
  text: string;
  textCN?: string;
  category: string;
  categoryCN?: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 富文本内容 - 清单类型
 */
export interface ChecklistRichContent {
  type: 'checklist';
  title: string;
  titleCN?: string;
  items: ChecklistItem[];
}

/**
 * POI 推荐项
 */
export interface POIRecommendation {
  id: number | string; // 🆕 支持字符串ID（新格式）
  name: string;
  nameCN?: string;
  type: string;
  rating?: number;
  priceLevel?: string;
  distance?: string;
  imageUrl?: string;
  reason: string;
  reasonCN?: string;
  /** 地点经纬度（用于距离计算） */
  location?: {
    lat: number;
    lng: number;
  };
  /** 🆕 一键添加动作（新格式） */
  action?: 'ADD_TO_ITINERARY' | string;
}

/**
 * 🆕 填充空闲时间的推荐项（新格式）
 */
export interface FreeTimeRecommendation {
  day: number;
  timeSlot: {
    start: string; // HH:mm
    end: string;    // HH:mm
  };
  duration: number; // 分钟
  suggestions: Array<{
    id: string;
    name: string;
    nameCN?: string;
    type: string;
    reason: string;
    reasonCN?: string;
    action: 'ADD_TO_ITINERARY' | string;
    rating?: number;
    priceLevel?: string;
    distance?: string;
    imageUrl?: string;
    location?: {
      lat: number;
      lng: number;
    };
  }>;
}

/**
 * 富文本内容 - POI 推荐类型
 * 支持两种格式：
 * 1. 旧格式：items 数组（向后兼容）
 * 2. 新格式：recommendations 数组（填充空闲时间场景）
 */
export interface POIRichContent {
  type: 'poi_list';
  title?: string;
  titleCN?: string;
  /** 旧格式：直接推荐列表（向后兼容） */
  items?: POIRecommendation[];
  /** 🆕 新格式：按时间段分组的推荐（填充空闲时间场景） */
  data?: {
    recommendations?: FreeTimeRecommendation[];
    actionType?: 'ADD_TO_ITINERARY' | string;
  };
}

/**
 * 富文本内容联合类型
 */
export type RichContent = 
  | TimelineRichContent
  | ComparisonRichContent
  | ChecklistRichContent
  | POIRichContent
  | GapHighlightRichContent;

/**
 * 待确认的修改
 */
export interface PendingChange {
  id: string;
  type: 'add' | 'remove' | 'modify' | 'reorder';
  target: 'poi' | 'transport' | 'meal' | 'day' | 'time';
  description: string;
  descriptionCN?: string;
  day?: number;
  itemId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * 行程更新摘要
 */
export interface TripUpdateSummary {
  totalChanges: number;
  addedItems: number;
  removedItems: number;
  modifiedItems: number;
  affectedDays: number[];
}

/**
 * 追问信息
 */
export interface FollowUp {
  question: string;
  questionCN?: string;
  options?: string[];
  optionsCN?: string[];
  type: 'single' | 'multiple' | 'text' | 'confirm';
}

// ==================== 三人格守护者系统 ====================

/**
 * 守护者人格类型
 */
export type GuardianPersona = 'Abu' | 'DrDre' | 'Neptune';

/**
 * 人格洞察卡片
 */
export interface PersonaInsight {
  persona: GuardianPersona;
  emoji: string;              // '🐻‍❄️' | '🐕' | '🦦'
  name: string;               // '阿布' | '德雷医生' | '海王星'
  role: string;               // '安全守护者' | '节奏设计师' | '空间魔法师'
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;            // 主要信息（≤200字符）
  suggestion?: string;        // 建议（可选）
  details?: string[];         // 详细说明列表
}

/**
 * 守护者详细评估
 */
export interface GuardianEvaluation {
  // Abu 安全评估
  abu?: {
    passed: boolean;
    issues: string[];
    risks: Array<{
      type: 'transport' | 'timing' | 'accessibility' | 'weather' | 'safety';
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  
  // Dr.Dre 节奏评估
  drDre?: {
    sustainable: boolean;
    fatigueLevel: number;     // 0-100
    issues: string[];
    paceRecommendation: 'slow_down' | 'ok' | 'can_add_more';
  };
  
  // Neptune 替代方案
  neptune?: {
    hasAlternatives: boolean;
    alternatives: Array<{
      id: string;
      original: string;
      replacement: string;
      reason: string;
      impact: string;
    }>;
  };
}

/**
 * 责任声明
 */
export interface Disclaimer {
  type: 'user_override_safety' | 'data_incomplete' | 'llm_fallback' | 'general';
  message: string;
  timestamp: string;
  relatedPersona?: GuardianPersona;
  userAction?: 'ignored' | 'acknowledged' | 'overridden';
}

/**
 * 检测到的缺口
 */
export interface DetectedGap {
  id: string;
  type: GapType;
  dayNumber: number;
  timeSlot: {
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
  description: string;
  severity: GapSeverity;
  context?: {
    beforeItem?: string;
    afterItem?: string;
    nearbyLocation?: string;
  };
}

/**
 * 响应元数据
 */
export interface PlannerResponseMeta {
  processingTime?: number;
  guardiansInvoked?: GuardianPersona[];
  /** 🆕 意图不确定性类型 */
  uncertainty?: IntentUncertainty;
  /** 🆕 检测到的缺口 */
  detectedGaps?: DetectedGap[];
}

// ==================== 意图消歧系统 ====================

/**
 * 意图不确定性枚举
 */
export enum IntentUncertainty {
  /** 意图明确，可直接执行 */
  CLEAR = 'CLEAR',
  /** 动作不明确：查询 vs 添加 */
  AMBIGUOUS_ACTION = 'AMBIGUOUS_ACTION',
  /** 目标不明确：加到哪里 */
  AMBIGUOUS_TARGET = 'AMBIGUOUS_TARGET',
  /** 需求不明确：为什么要这个 */
  AMBIGUOUS_NEED = 'AMBIGUOUS_NEED',
  /** 多重意图：用户想做多件事 */
  MULTIPLE_INTENTS = 'MULTIPLE_INTENTS',
}

/**
 * 澄清选择的动作类型
 */
export type ClarificationAction = 'QUERY' | 'ADD_TO_ITINERARY' | 'REPLACE' | 'REMOVE' | 'MODIFY';

/**
 * 缺口严重程度
 */
export type GapSeverity = 'CRITICAL' | 'SUGGESTED' | 'OPTIONAL';

/**
 * 缺口类型
 */
export type GapType = 'MEAL' | 'HOTEL' | 'TRANSPORT' | 'ACTIVITY' | 'FREE_TIME';

/**
 * 缺口类型别名（用于兼容）
 */
export type ItineraryGapType = GapType;

/**
 * 响应中的缺口（已应用用户偏好过滤）
 */
export interface ResponseItineraryGap extends DetectedGap {
  // 继承 DetectedGap 的所有字段
}

/**
 * 缺口显示偏好
 */
export interface GapDisplayPreferences {
  collapsed: boolean;
  showOnlyCritical: boolean;
  filterTypes: GapType[];
  ignoredPatterns: IgnorePattern[];
}

/**
 * 忽略模式
 */
export interface IgnorePattern {
  type: GapType;
  timeSlot?: { start: string; end: string };
  severity?: GapSeverity;
}

/**
 * 缺口高亮数据
 */
export interface GapHighlightData {
  highlight: {
    type: 'gap';
    dayNumber: number;
    timeSlot: {
      start: string;  // HH:mm
      end: string;    // HH:mm
    };
    gapType?: GapType;
    description: string;
    severity: GapSeverity;
  };
}

/**
 * 缺口高亮富文本
 */
export interface GapHighlightRichContent {
  type: 'gap_highlight';
  data: GapHighlightData;
}

// ==================== API 请求/响应类型 ====================

/**
 * 开始规划会话请求
 * 🆕 已更新为新接口格式
 */
export interface StartPlanningRequest {
  tripId?: string; // 🆕 可选，如果提供会在初始消息中包含
  userId?: string; // 🆕 可选，用户ID
}

/**
 * 开始规划会话响应
 */
export interface StartPlanningResponse {
  sessionId: string;
  message: string;
  phase: PlannerPhase;
  intent: PlannerIntent;
  richContent?: RichContent;
  quickActions?: QuickAction[];
}

/**
 * 对话交互请求
 * 🆕 已更新为新接口格式：POST /api/agent/planning-assistant/chat
 */
export interface PlannerChatRequest {
  sessionId: string; // 必填，会话ID（通过创建会话接口获取）
  message: string; // 必填，用户消息
  userId?: string; // 可选，用户ID
  language?: 'en' | 'zh'; // 可选，语言偏好，默认为 'zh'
  context?: {
    currentLocation?: {
      lat: number;
      lng: number;
    };
    timezone?: string;
    // 🆕 扩展字段（如果后端支持）
    tripId?: string;
    targetDay?: number;
    targetItemId?: string;
    selectedContext?: {
      dayIndex?: number;
      date?: string;
      itemId?: string;
      placeName?: string;
      itemType?: string;
    };
    adjacentItems?: {
      prevItem?: { name: string; endTime: string; type?: string };
      nextItem?: { name: string; startTime: string; type?: string };
    };
    dayStats?: {
      totalItems: number;
      hasMeal: boolean;
      hasTransit: boolean;
      freeSlots?: Array<{ start: string; end: string }>;
    };
    clarificationData?: {
      selectedAction?: ClarificationAction;
      params?: {
        dayNumber?: number;
        timeSlot?: { start: string; end: string };
        targetItemId?: string;
        gapId?: string;
      };
    };
  };
}

/**
 * 对话交互响应
 */
export interface PlannerChatResponse {
  sessionId: string;
  message: string;
  phase: PlannerPhase;
  intent: PlannerIntent;
  richContent?: RichContent;
  quickActions?: QuickAction[];
  pendingChanges?: PendingChange[];
  tripUpdate?: TripUpdateSummary;
  followUp?: FollowUp;
  
  // 🆕 三人格守护者系统
  personaInsights?: PersonaInsight[];
  guardianEvaluation?: GuardianEvaluation;
  disclaimer?: Disclaimer;
  meta?: PlannerResponseMeta;
}

/**
 * 快捷操作请求
 */
export interface PlannerActionRequest {
  tripId: string;
  action: QuickActionType;
  sessionId?: string;
  params?: Record<string, unknown>;
}

/**
 * 快捷操作响应（复用对话响应结构）
 */
export type PlannerActionResponse = PlannerChatResponse;

/**
 * 确认修改请求
 */
export interface ConfirmChangesRequest {
  tripId: string;
  sessionId: string;
  changeIds: string[];
}

/**
 * 确认修改响应
 */
export interface ConfirmChangesResponse {
  success: boolean;
  message: string;
  messageCN?: string;
  appliedChanges: string[];
  tripUpdate?: TripUpdateSummary;
}

// ==================== 建议应用接口 ====================

/**
 * 应用建议请求
 */
export interface ApplySuggestionRequest {
  tripId: string;
  sessionId: string;
  /** 建议 ID */
  suggestionId: string;
  /** 目标天数 (1-based) */
  targetDay: number;
  /** 时间段（可选） */
  timeSlot?: {
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
  /** 建议类型 */
  suggestionType: 'add_place' | 'modify_time' | 'add_meal' | 'optimize_route';
  /** 地点信息（add_place 时） */
  place?: {
    name: string;
    nameCN?: string;
    placeId?: number;
    category?: string;
    address?: string;
    /** 地点经纬度（用于距离计算和冲突检测） */
    location?: {
      lat: number;
      lng: number;
    };
  };
}

/**
 * 应用建议响应
 */
export interface ApplySuggestionResponse {
  success: boolean;
  message: string;
  /** 创建/修改的行程项 */
  item?: {
    id: string;
    tripDayId: string;
    startTime: string;
    endTime: string;
    type: string;
    placeId?: number;
  };
  /** 行程更新摘要 */
  tripUpdate?: TripUpdateSummary;
  /** 后续建议 */
  followUpSuggestions?: string[];
  /** 🆕 建议状态（可选，向后兼容） */
  suggestionStatus?: 'RESOLVED' | 'PENDING' | 'FAILED';
}

/**
 * 撤销响应
 */
export interface UndoResponse {
  success: boolean;
  message: string;
  /** 恢复到的版本号 */
  restoredVersion?: number;
  /** 被撤销的操作描述 */
  undoneAction?: string;
  /** 行程更新摘要 */
  tripUpdate?: TripUpdateSummary;
}

// ==================== API 响应包装类型 ====================

/**
 * 成功响应包装
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理 API 响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> | T }): T {
  // 检查是否是包装格式
  const data = response.data;
  
  if (data && typeof data === 'object' && 'success' in data) {
    const wrapped = data as ApiResponseWrapper<T>;
    if (!wrapped.success) {
      const errorData = (wrapped as ErrorResponse).error;
      const errorMessage = errorData?.message || errorData?.code || '请求失败';
      console.error('[Trip Planner API] API 返回错误:', errorData);
      throw new Error(errorMessage);
    }
    return (wrapped as SuccessResponse<T>).data;
  }
  
  // 非包装格式，直接返回
  return data as T;
}

// ==================== API 实现 ====================

export const tripPlannerApi = {
  /**
   * 开始规划会话
   * ⚠️ 接口已删除，等待重新规划
   */
  start: async (data: StartPlanningRequest): Promise<StartPlanningResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 对话交互
   * ⚠️ 接口已删除，等待重新规划
   */
  chat: async (data: PlannerChatRequest): Promise<PlannerChatResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 快捷操作
   * ⚠️ 接口已删除，等待重新规划
   */
  action: async (data: PlannerActionRequest): Promise<PlannerActionResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 确认修改
   * ⚠️ 接口已删除，等待重新规划
   */
  confirm: async (data: ConfirmChangesRequest): Promise<ConfirmChangesResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 应用建议
   * ⚠️ 接口已删除，等待重新规划
   */
  applySuggestion: async (data: ApplySuggestionRequest): Promise<ApplySuggestionResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 撤销上一次修改
   * ⚠️ 接口已删除，等待重新规划
   */
  undo: async (data: { tripId: string; sessionId: string }): Promise<UndoResponse> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  // ==================== 缺口偏好 API ====================

  /**
   * 获取用户缺口偏好
   * ⚠️ 接口已删除，等待重新规划
   */
  getGapPreferences: async (params?: { tripId?: string; sessionId?: string }): Promise<GapDisplayPreferences> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 更新用户缺口偏好
   * ⚠️ 接口已删除，等待重新规划
   */
  updateGapPreferences: async (data: Partial<GapDisplayPreferences> & { tripId?: string; sessionId?: string }): Promise<GapDisplayPreferences> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 忽略单个缺口
   * ⚠️ 接口已删除，等待重新规划
   */
  ignoreGap: async (data: { gapId: string; gapType: GapType; tripId?: string; pattern?: IgnorePattern }): Promise<void> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 批量忽略缺口
   * ⚠️ 接口已删除，等待重新规划
   */
  ignoreGapsBatch: async (data: { gapIds: string[]; gapType?: GapType; tripId?: string; pattern?: IgnorePattern }): Promise<{ ignoredCount: number; totalCount: number }> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 取消忽略单个缺口
   * ⚠️ 接口已删除，等待重新规划
   */
  unignoreGap: async (gapId: string, params?: { tripId?: string }): Promise<void> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },

  /**
   * 批量取消忽略缺口
   * ⚠️ 接口已删除，等待重新规划
   */
  unignoreGapsBatch: async (data: { gapIds: string[]; tripId?: string }): Promise<{ unignoredCount: number; totalCount: number }> => {
    throw new Error('规划工作台智能体对话接口已删除，等待重新规划');
  },
};

export default tripPlannerApi;
