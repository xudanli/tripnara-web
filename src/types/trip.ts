import type { BaseEntity } from './common';
import type { PlaceCategory } from './places-routes';
import type { DrivingFatiguePreferences } from './user-travel-profile';

// ==================== 基础类型 ====================

export type TripStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TravelerType = 'ADULT' | 'ELDERLY' | 'CHILD';
export type MobilityTag = 'IRON_LEGS' | 'ACTIVE_SENIOR' | 'CITY_POTATO' | 'LIMITED';
export type ItineraryItemType = 'ACTIVITY' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST' | 'TRANSIT';
export type SharePermission = 'VIEW' | 'EDIT';
export type CollaboratorRole = 'VIEWER' | 'EDITOR' | 'OWNER';
export type LLMProvider = 'DEEPSEEK' | 'OPENAI' | 'ANTHROPIC';
export type ModificationType = 'CHANGE_DATE' | 'MOVE_ACTIVITY' | 'ADD_ACTIVITY' | 'REMOVE_ACTIVITY' | 'ADD_BUFFERS';
export type BudgetAlertType = 'OVERSPEND' | 'APPROACHING_LIMIT' | 'DAILY_EXCEEDED';
export type SOSStatus = 'SENT' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
export type OptimizationType = 'REPLACE' | 'REMOVE' | 'RESCHEDULE';

// ==================== 费用分类 ====================

export type CostCategory = 
  | 'ACCOMMODATION'    // 住宿
  | 'TRANSPORTATION'   // 交通
  | 'FOOD'             // 餐饮
  | 'ACTIVITIES'       // 活动/门票
  | 'SHOPPING'         // 购物
  | 'OTHER';           // 其他

// ==================== 旅行者 ====================

export interface Traveler {
  type: TravelerType;
  mobilityTag: MobilityTag;
}

// ==================== 行程配置 ====================

export interface PacingConfig {
  travelers: Traveler[];
  maxDailyActivities?: number;
  restIntervalHours?: number;
  level?: string;
  /** 驾驶疲劳偏好（用于驾驶时间安全评估，2-15-8 法则；来自 UserTravelProfile.extendedProfile） */
  drivingFatiguePreferences?: DrivingFatiguePreferences;
}

export interface BudgetConfig {
  totalBudget: number;
  currency: string;
  dailyBudget?: number;
}

// ==================== 地点类别 ====================

/**
 * 地点类别类型定义
 * 
 * 注意：此类型已统一到 @/types/places-routes.ts
 * 为了保持向后兼容，这里重新导出统一的类型
 * 
 * @deprecated 请使用 @/types/places-routes 中的 PlaceCategory
 */
export type { PlaceCategory };

export type PlaceBusinessStatus = 
  | 'OPERATIONAL'          // 正常营业
  | 'CLOSED_TEMPORARILY'   // 临时关闭
  | 'CLOSED_PERMANENTLY'   // 永久关闭
  | 'UNKNOWN';             // 未知

// ==================== 地点营业时间 ====================

export interface PlaceOpeningHours {
  // 结构化格式 - 按星期
  mon?: string;              // e.g., "09:00 - 18:00"
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
  // 结构化格式 - 统一时间
  weekday?: string;          // 工作日统一时间
  weekend?: string;          // 周末统一时间
  // 文本格式
  text?: string;             // e.g., "08:30-17:00（周一闭馆）"
  // 兼容旧格式
  [key: string]: string | undefined;
}

// ==================== 地点元数据 ====================

export interface PlaceMetadata {
  // P0: 营业时间
  openingHours?: PlaceOpeningHours;
  
  // P1: 价格相关
  price?: number;              // 参考价格（CNY）
  priceLevel?: number;         // 价格等级（1-4）
  tags?: string[];             // 标签数组
  
  // P2: 联系方式
  phone?: string;              // 联系电话
  website?: string;            // 官方网站
  
  // 营业状态
  business_status?: PlaceBusinessStatus;
  
  // 扩展字段
  [key: string]: any;
}

// ==================== 地点 ====================

export interface Place {
  // ========== P0 必须返回 ==========
  id: number;
  nameCN: string;
  nameEN: string | null;
  category: PlaceCategory | string;  // 兼容旧数据
  address: string;
  rating: number | null;
  
  // ========== 坐标信息 ==========
  /** 纬度（标准格式） */
  latitude?: number;
  /** 经度（标准格式） */
  longitude?: number;
  /** 纬度（兼容格式） */
  lat?: number;
  /** 经度（兼容格式） */
  lng?: number;
  
  // ========== 元数据 ==========
  metadata?: PlaceMetadata;
  
  // ========== 描述 ==========
  description?: string | null;
  
  // ========== 关联数据 ==========
  City?: {
    id: number;
    nameCN: string;
    nameEN: string;
  };
}

// ==================== 行程项 ====================

// 交通方式
export type TravelMode = 'DRIVING' | 'WALKING' | 'TRANSIT' | 'TRAIN' | 'FLIGHT' | 'FERRY' | 'BICYCLE' | 'TAXI';

// 预订状态
export type BookingStatus = 'BOOKED' | 'NEED_BOOKING' | 'NO_BOOKING';

// 跨天显示模式
export type CrossDayDisplayMode = 'checkin' | 'checkout' | 'normal';

// 跨天信息
export interface CrossDayInfo {
  isCrossDay: boolean;           // 是否跨天
  crossDays: number;             // 跨越天数
  isCheckoutItem: boolean;       // 是否为退房项（入住日为 false，退房日为 true）
  displayMode: CrossDayDisplayMode; // 显示模式
  timeLabels: {
    start: string;               // 开始时间标签（如 "入住时间"）
    end: string;                 // 结束时间标签（如 "退房时间"）
  };
}

export interface ItineraryItem {
  id: string;
  type: ItineraryItemType;
  startTime: string;
  endTime: string;
  note?: string | null;
  placeId?: number | null;
  trailId?: number | null;
  tripDayId?: string;
  Place?: Place | null;
  Trail?: any | null;
  // ✅ 新增字段（2026-01-29）
  /** 是否为必游POI（从模板的 dayPlans[].pois[].required 获取，或从 note 字段解析 [必游] 标记） */
  isRequired?: boolean | null;
  // 费用相关字段
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string | null;
  costCategory?: CostCategory | null;
  costNote?: string | null;
  isPaid?: boolean | null;
  paidBy?: string | null;
  // 交通信息字段
  travelFromPreviousDuration?: number | null;  // 从上一地点的时间（分钟）
  travelFromPreviousDistance?: number | null;  // 从上一地点的距离（米）
  travelMode?: TravelMode | null;              // 交通方式
  // 预订信息字段
  bookingStatus?: BookingStatus | null;        // 预订状态
  bookingConfirmation?: string | null;         // 预订确认号
  bookingUrl?: string | null;                  // 预订链接
  bookedAt?: string | null;                    // 预订时间
  // 跨天信息（后端返回）
  crossDayInfo?: CrossDayInfo | null;          // 跨天显示信息
}

export interface ItineraryItemDetail extends ItineraryItem {
  TripDay: {
    id: string;
    date: string;
    Trip: {
      id: string;
      destination: string;
      startDate: string;
      endDate: string;
    };
    ItineraryItem: Array<{
      id: string;
      type: string;
      startTime: string;
    }>;
  };
}

// ==================== 行程日期 ====================

export interface TripDay {
  id: string;
  date: string;
  /** ✅ 新增字段（2026-01-29）：当天的主题（从模板的 dayPlans[].theme 获取，或从 trip.metadata.dayThemes[dayNumber] 获取） */
  theme?: string | null;
  ItineraryItem: ItineraryItem[];
}

// ==================== 行程统计 ====================

export interface TripStatistics {
  totalDays: number;
  totalItems: number;
  totalActivities: number;
  totalMeals: number;
  totalRest: number;
  totalTransit: number;
  progress: 'PLANNING' | 'ONGOING' | 'COMPLETED';
  budgetUsed: number;
  budgetRemaining: number;
}

// ==================== 行程详情 ====================

export interface TripDetail extends BaseEntity {
  id: string;
  name?: string; // 🆕 行程名称（可选）
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: TripStatus;
  TripDay: TripDay[];
  statistics: TripStatistics;
  pacingConfig?: PacingConfig;
  budgetConfig?: BudgetConfig;
  // 新增字段
  pipelineStatus?: PipelineStatus;
  activeAlertsCount?: number;
  pendingTasksCount?: number;
  metadata?: {
    generationProgress?: GenerationProgress;
    /** ✅ 新增字段（2026-01-29）：每日主题映射，key 为天数（1, 2, 3...），value 为主题字符串 */
    dayThemes?: Record<string, string>;
    [key: string]: any;
  };
}

// ==================== 行程列表项 ====================

export interface TripListItem extends BaseEntity {
  id: string;
  name?: string; // 🆕 行程名称（可选）
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  totalBudget: number;
  days: Array<{
    id: string;
    date: string;
  }>;
}

// ==================== 创建行程请求 ====================

export type TripPace = 'relaxed' | 'standard' | 'tight';

export type TripPreference = 
  | 'nature' 
  | 'city' 
  | 'photography' 
  | 'food' 
  | 'history' 
  | 'art' 
  | 'shopping' 
  | 'nightlife';

export interface CreateTripRequest {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  travelers: Traveler[];
  name?: string; // 🆕 行程名称（可选）
  // 旅行风格（节奏）- 前置收集，减少进入规划工作台后的设置
  pace?: TripPace;
  // 兴趣偏好 - 前置收集，用于AI推荐
  preferences?: TripPreference[];
  // 必须去的地点 POI IDs - 高级用户可在创建时指定
  mustPlaces?: number[];
  // 不想去的地点 POI IDs - 高级用户可在创建时排除
  avoidPlaces?: number[];
}

export interface CreateTripResponse extends BaseEntity {
  id: string;
  name?: string; // 🆕 行程名称（可选）
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: TripStatus;
  pacingConfig?: PacingConfig;
  budgetConfig?: BudgetConfig;
  itemsCount?: number; // 创建的行程项数量（从草案保存时返回）
  days?: Array<{
    id: string;
    date: string;
    ItineraryItem: Array<{
      id: string;
      placeId: number;
      type: ItineraryItemType;
      startTime: string;
      endTime: string;
      note: string;
      Place?: {
        id: number;
        nameCN: string;
        nameEN: string;
        category: string;
        rating: number;
      };
    }>;
  }>;
}

// ==================== 自然语言创建行程 ====================

/**
 * 对话消息
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 自然语言对话会话
 */
export interface NLConversation {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  conversationContext?: ConversationContext;
  partialParams?: ParsedTripParams;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * 澄清问题答案
 */
export interface ClarificationAnswer {
  questionId: string;
  value: string | string[] | number | boolean | null;
}

export interface CreateTripFromNLRequest {
  text: string;
  llmProvider?: LLMProvider;
  /**
   * 会话ID（可选）
   * 如果提供，会恢复之前的对话上下文，实现多轮对话
   * 如果不提供，会创建新会话
   */
  sessionId?: string;
  /**
   * 🆕 是否开始新对话（可选）
   * 如果为 true，后端会清空旧上下文，开始全新的对话
   * 即使提供了 sessionId，也会忽略旧上下文
   */
  isNewConversation?: boolean;
  /** 
   * 上下文包ID（可选）
   * 如果提供，后端将使用该上下文包来增强理解用户意图
   * 上下文包可以通过 Context API 预先构建
   * 注意：后端也会自动构建 Context Package，此字段主要用于前端预先构建的场景
   */
  contextPackageId?: string;
  /**
   * 上下文信息（可选）
   * 如果未提供 contextPackageId，可以直接传递上下文信息
   * 后端会根据这些信息构建上下文
   * 注意：后端会自动检测目的地并构建 Context Package，此字段主要用于补充信息
   */
  context?: {
    /** 目的地国家代码（用于获取目的地相关信息） */
    destinationCountry?: string;
    /** 用户偏好主题（如 VISA, ROAD_RULES, SAFETY 等） */
    requiredTopics?: string[];
    /** 是否包含用户历史偏好 */
    includeUserProfile?: boolean;
  };
  /**
   * 🆕 澄清问题答案（可选）
   * 用户在回答澄清问题后，可以在发送消息时一并提交答案
   * 后端会根据这些答案更新对话上下文
   */
  clarificationAnswers?: ClarificationAnswer[];
}

// 下一步操作建议
export interface NextStep {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  endpoint: string;
}

// Pipeline状态阶段
export interface PipelineStage {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'risk';
  completedAt?: string;
  summary?: string;
}

export interface PipelineStatus {
  stages: PipelineStage[];
}

// 任务
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'PREFERENCE' | 'SCHEDULE' | 'SAFETY' | 'BUDGET' | 'OTHER';
  route?: string;
  metadata?: {
    relatedField?: string;
    day?: number;
    roadId?: string;
    alertId?: string;
    [key: string]: any;
  };
}

// 预算统计信息（扩展 TripStatistics）
export interface BudgetStats {
  totalBudget: number;
  budgetUsed: number;
  budgetRemaining: number;
  dailyAverage?: number;
  categoryBreakdown?: Record<string, number>;
}

// 扩展的统计信息（用于创建行程返回）
export interface TripCreationStats {
  totalDays: number;
  daysWithActivities: number;
  totalItems: number;
  totalActivities: number;
  totalMeals: number;
  totalRest: number;
  totalTransit: number;
  progress: 'PLANNING' | 'ONGOING' | 'COMPLETED';
  budgetStats?: BudgetStats;
}

// 生成进度信息
export interface GenerationProgress {
  status: 'generating' | 'completed' | 'failed';
  stage: string; // 'retrieving_candidates' | 'llm_completed' | 'saving_items' | 'completed' | 'error' | 'llm_error'
  message: string;
  itemsCount?: number;
  updatedAt: string; // ISO 8601 时间戳
}

// 对话上下文（用于多轮对话）
export interface ConversationContext {
  userIntent?: string;           // 用户意图，如 'family_trip', 'honeymoon', 'business'
  travelStyle?: string;          // 旅行风格，如 'family', 'luxury', 'budget'
  urgency?: string;              // 紧迫程度，如 'flexible', 'fixed'
  specialNeeds?: string[];       // 特殊需求，如 ['亲子', '儿童友好', '无障碍']
}

/**
 * 规划师回复内容块类型
 */
export type PlannerResponseBlockType =
  | 'paragraph'        // 普通段落文本
  | 'heading'          // 标题
  | 'list'             // 列表（有序/无序）
  | 'summary_card'     // 摘要卡片（目的地、天数、预算等）
  | 'question_card'    // 澄清问题卡片（独立组件）
  | 'highlight'        // 高亮信息（重要提示）
  | 'budget_summary'   // 预算摘要
  | 'itinerary_overview'; // 行程概览

/**
 * 规划师回复内容块
 */
export interface PlannerResponseBlock {
  type: PlannerResponseBlockType;
  id?: string;  // 可选，用于前端渲染 key
  
  // paragraph 类型
  content?: string;  // 段落文本内容
  
  // heading 类型
  level?: 1 | 2 | 3;  // 标题级别
  text?: string;  // 标题文本
  
  // list 类型
  title?: string;  // 列表标题（如"核心思路"）
  items?: string[];  // 列表项
  ordered?: boolean;  // 是否有序列表
  
  // summary_card 类型
  summary?: {
    destination?: string;
    duration?: string;  // "10天"
    travelers?: string;  // "双人"
    budget?: {
      amount: number;
      currency: string;
      details?: string[];  // ["租用四驱车", "住宿", "特色活动", "餐饮"]
    };
  };
  
  // question_card 类型（与 clarificationQuestions 关联）
  questionId?: string;  // 关联到 clarificationQuestions 中的 id
  
  // highlight 类型
  highlightText?: string;
  highlightType?: 'info' | 'warning' | 'success';
  
  // budget_summary 类型
  budget?: {
    estimatedAmount: number;
    currency: string;
    duration: string;
    travelers: string;
    breakdown?: Array<{
      category: string;
      amount: number;
      percentage?: number;
    }>;
  };
  
  // itinerary_overview 类型
  itinerary?: {
    theme?: string;  // "自驾探索冰岛南岸"
    route?: string;  // "以雷克雅未克为起点和终点..."
    dailyStructure?: string;  // "每天的驾驶时间会控制在2-3小时以内..."
  };
}

/**
 * 澄清问题（结构化）- 用于自然语言对话
 * 注意：与 src/types/clarification.ts 中的 ClarificationQuestion 不同，
 * 这个版本更简化，专门用于 NL 对话场景
 */
/**
 * 🆕 HCI优化：条件输入字段配置
 * 当用户选择特定选项时，显示后续输入字段
 */
export interface ConditionalInputField {
  /** 触发此输入字段的选项值（当用户选择此选项时显示输入字段） */
  triggerValue: string;
  /** 输入字段类型 */
  inputType: 'text' | 'date' | 'number' | 'date_range';
  /** 输入字段标签 */
  label?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 验证规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  /** 提示文本 */
  hint?: string;
}

export interface NLClarificationQuestion {
  id: string;  // 唯一标识，用于关联到 responseBlocks
  text: string;  // 问题文本
  inputType: 'boolean' | 'text' | 'single_choice' | 'multiple_choice' | 'number' | 'date';
  options?: string[];  // 选项（用于 single_choice / multiple_choice）
  required?: boolean;  // 是否必填
  hint?: string;  // 提示信息
  /**
   * 🆕 P0: 问题分组
   * 'required' - 必需问题组（澄清问题）
   * 'optional' - 补充问题组（补充问题）
   * 如果未提供，向后兼容：根据 required 字段推断
   */
  group?: 'required' | 'optional';
  /**
   * 🆕 HCI优化：条件输入字段（当用户选择特定选项时显示后续输入字段）
   * 例如：选择"不准确，需要修改"后显示日期选择框
   */
  conditionalInputs?: ConditionalInputField[];
  metadata?: {
    category?: string;  // 'activities' | 'budget' | 'dates' | 'preferences'
    priority?: 'high' | 'medium' | 'low';
    /**
     * 🆕 Critical 字段标识
     * 如果为 true，表示这是关键字段（通常是安全相关的）
     * Critical 字段未回答时，不能创建行程
     */
    isCritical?: boolean;
    /**
     * 🆕 字段名（用于存储）
     * 例如：'experienceLevel', 'riskTolerance'
     */
    fieldName?: string;
  };
}

// 解析出的参数（部分或完整）
export interface ParsedTripParams {
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  hasChildren?: boolean;
  hasElderly?: boolean;
  preferences?: {
    style?: string;
    [key: string]: any;
  };
  needsClarification?: boolean;
  inferredFields?: string[];     // 推断的字段列表，如 ['startDate', 'totalBudget']
}

/**
 * 澄清问题（结构化）
 */
export interface ClarificationQuestion {
  id: string;  // 唯一标识，用于关联到 responseBlocks
  text: string;  // 问题文本
  inputType: 'boolean' | 'text' | 'single_choice' | 'multiple_choice' | 'number' | 'date';
  options?: string[];  // 选项（用于 single_choice / multiple_choice）
  required?: boolean;  // 是否必填
  hint?: string;  // 提示信息
  metadata?: {
    category?: string;  // 'activities' | 'budget' | 'dates' | 'preferences'
    priority?: 'high' | 'medium' | 'low';
  };
}

/**
 * 🆕 用户画像信息
 */
export interface PersonaInfo {
  personaId: string;           // 画像ID，如 "sj_persona_001"
  personaName: string;          // 画像名称（中文），如 "极地朝圣者"
  personaNameEn?: string;       // 画像名称（英文），如 "Arctic Pilgrim"
  confidence: number;           // 匹配置信度（0-1），如 0.85
  matchReasons: string[];        // 匹配原因列表，如 ["经验水平匹配: 无经验", "风险承受度匹配: 低"]
}

/**
 * 🆕 推荐路线
 */
export interface RecommendedRoute {
  route: string;                // 路线名称，如 "朗伊尔城温和活动"
  reason: string;               // 推荐原因，如 "安全，适合家庭"
  difficultyMatch: string;      // 难度匹配度，如 "完美"、"良好"
  season?: string;               // 适合季节，如 "全年"、"6-8月"
  prerequisites?: string[];     // 前置条件，如 ["多次极地经验", "专业向导"]
}

/**
 * 🆕 决策矩阵结果
 */
export type DecisionType = 
  | 'GO_FULLY_SUPPORTED'        // 完全支持
  | 'GO_WITH_STRONG_CAUTION'    // 需要特别指导
  | 'GO_ALTERNATIVE_PLAN'       // 推荐替代方案
  | 'STRONGLY_RECONSIDER'       // 强烈建议重新考虑
  | 'NOT_RECOMMENDED';          // 不推荐

export interface DecisionResult {
  decision: DecisionType;
  reason: string;               // 决策原因
  recommendations: string[];   // 建议列表
}

export interface CreateTripFromNLResponse {
  // ========== 会话管理 ==========
  /**
   * 会话ID
   * 首次请求时创建，后续请求使用相同的 sessionId 可以恢复对话上下文
   */
  sessionId?: string;
  
  /**
   * 🆕 最后一条消息的ID
   * 后端保存消息后返回的真实消息ID（UUID格式）
   * 前端应使用此ID来更新问题答案，而不是自己生成ID
   */
  lastMessageId?: string;
  
  // ========== 场景1: 需要澄清（旅行规划师对话）==========
  needsClarification?: boolean;
  
  /**
   * 🆕 需要用户确认创建行程
   * 如果为 true，表示所有必需字段已收集，但需要用户确认后才创建行程
   */
  needsConfirmation?: boolean;
  
  /**
   * 🆕 Gate 预检查阻止标记
   * 如果为 true，表示被 Gate 预检查阻止，需要用户选择替代方案
   */
  gateBlocked?: boolean;
  
  /**
   * 🆕 Critical 字段阻止标记
   * 如果为 true，表示被 Critical 字段阻止，需要用户回答关键问题
   */
  blockedByCriticalFields?: boolean;
  
  /**
   * 🆕 Gate 预检查替代方案列表
   * 当 gateBlocked 为 true 时，提供替代方案供用户选择
   */
  alternatives?: Array<{
    id: string;
    label: string;
    description: string;
    action?: string;
    actionParams?: Record<string, any>;
    buttonText?: string;
  }>;
  
  /**
   * 🆕 用户画像信息
   * 根据用户回答识别出的用户画像
   */
  personaInfo?: PersonaInfo;
  
  /**
   * 🆕 推荐路线列表
   * 根据用户画像推荐的路线
   */
  recommendedRoutes?: RecommendedRoute[];
  
  /**
   * 🆕 是否被安全第一原则阻止
   * 如果为 true，表示被安全第一原则阻止，需要用户重新考虑
   */
  blockedBySafetyPrinciple?: boolean;
  
  /**
   * 🆕 决策矩阵结果（所有轮次完成后）
   * 显示最终的决策结果和建议
   */
  decisionResult?: DecisionResult;
  
  /**
   * 🆕 是否被决策矩阵阻止
   * 如果为 true，表示被决策矩阵阻止，不能创建行程
   */
  blockedByDecisionMatrix?: boolean;
  
  /**
   * 🆕 结构化回复内容（优先使用）
   * 如果提供，前端将使用结构化渲染，提供更好的可读性
   * 如果未提供，使用 plannerReply 作为降级方案
   */
  plannerResponseBlocks?: PlannerResponseBlock[];
  
  /**
   * 旅行规划师的自然语言回复（向后兼容）
   * 如果未提供 plannerResponseBlocks，使用此字段
   */
  plannerReply?: string;
  
  /**
   * 🆕 是否显示确认卡片
   * 当 needsConfirmation 为 true 时，前端应显示确认卡片
   */
  showConfirmCard?: boolean;
  
  // 建议的快捷回复选项
  suggestedQuestions?: string[];
  
  // 对话上下文（用于多轮对话）
  conversationContext?: ConversationContext;
  
  /**
   * 🆕 澄清问题列表（结构化）
   * 如果提供，前端将渲染为独立的问题卡片
   * 如果未提供，使用字符串数组 clarificationQuestions（向后兼容）
   */
  clarificationQuestions?: NLClarificationQuestion[] | string[];
  
  // 部分解析的参数
  partialParams?: ParsedTripParams;

  // ========== 场景2: 信息完整，创建行程 ==========
  trip?: {
    // 基本信息
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    status?: TripStatus;
    budgetConfig?: BudgetConfig;
    pacingConfig?: PacingConfig;
    
    // 行程天数列表
    days?: Array<{
      id: string;
      date: string;
      tripId?: string;
    }>;
    
    // 完整的行程树（兼容旧格式）
    TripDay?: TripDay[];
    
    // 统计信息
    stats?: TripCreationStats;
    
    // Pipeline状态
    pipelineStatus?: PipelineStatus;
    
    // 提醒和任务
    activeAlertsCount?: number;
    pendingTasksCount?: number;
    
    // 元数据（包含生成进度等）
    metadata?: {
      generationProgress?: GenerationProgress;
      [key: string]: any;
    };
  };
  
  // 解析后的参数（创建成功时返回）
  parsedParams?: ParsedTripParams;
  
  // 下一步操作建议
  nextSteps?: NextStep[];
  
  // 成功消息
  message?: string;
  
  // 是否正在后台生成规划点
  generatingItems?: boolean;
}

// ==================== 更新行程 ====================

export interface UpdateTripRequest {
  name?: string; // 🆕 行程名称（可选）
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  travelers?: Traveler[];
  status?: TripStatus; // ✅ 行程状态（需要后端API支持）
  metadata?: Record<string, unknown>; // 元数据（如 teamId 等）
}

// ==================== 行程状态 ====================

export interface TripState {
  currentDayId: string | null;
  currentItemId: string | null;
  nextStop?: {
    itemId: string;
    placeId: number;
    placeName: string;
    startTime: string;
    estimatedArrivalTime?: string;
    // ⚠️ 新增：Place 字段（后端应返回完整的地点信息，包括坐标）
    Place?: {
      id: number;
      nameCN?: string;
      nameEN?: string | null;
      latitude?: number;        // ⚠️ 新增：纬度
      longitude?: number;      // ⚠️ 新增：经度
      address?: string;
      rating?: number | null;
      businessHours?: {         // ⚠️ 建议：营业时间
        open?: string;
        close?: string;
        timezone?: string;
      };
      metadata?: PlaceMetadata;
      // 兼容其他可能的坐标字段名
      lat?: number;
      lng?: number;
      // 兼容 metadata.location 格式
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  } | null;
  eta?: string;
  timezone: string;
  now: string;
}

// ==================== Schedule ====================

export interface ScheduleItem {
  startTime: string;
  endTime: string;
  placeId: number;
  placeName: string;
  type: ItineraryItemType;
  metadata?: Record<string, any>;
}

export interface DayScheduleResult {
  items: ScheduleItem[];
  totalDuration?: number;
  totalCost?: number;
}

export interface ScheduleResponse {
  date: string;
  schedule: DayScheduleResult | null;
  persisted: boolean;
}

// ==================== 操作历史 ====================

export interface ActionHistory {
  id: string;
  tripId: string;
  dateISO: string;
  actionType: string;
  action: {
    type: string;
    params: any;
  };
  scheduleBefore: DayScheduleResult;
  scheduleAfter: DayScheduleResult;
  timestamp: string;
}

// ==================== 撤销/重做 ====================

export interface UndoActionRequest {
  date: string;
}

export interface RedoActionRequest {
  date: string;
}

export interface UndoRedoResponse {
  schedule: DayScheduleResult;
}

// ==================== 分享 ====================

export interface CreateTripShareRequest {
  permission?: SharePermission;
  expiresAt?: string;
}

export interface TripShare {
  id: string;
  tripId: string;
  shareToken: string;
  permission: SharePermission;
  expiresAt: string | null;
  shareUrl: string;
  createdAt: string;
}

// ==================== 协作者 ====================

export interface AddCollaboratorRequest {
  email: string;
  role: CollaboratorRole;
}

export interface Collaborator {
  id: string;
  tripId: string;
  userId: string;
  role: CollaboratorRole;
  createdAt: string;
}

// ==================== 收藏 ====================

export interface CollectedTrip {
  id: string;
  trip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    status: string;
    TripDay: Array<{
      id: string;
      date: string;
    }>;
  };
  createdAt: string;
}

// ==================== 点赞 ====================

export interface FeaturedTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: string;
  createdAt: string;
  likeCount: number;
  collectionCount: number;
  popularityScore: number;
  TripLike: any[];
  TripCollection: any[];
}

// ==================== 离线数据包 ====================

export interface OfflinePackData {
  trip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    budgetConfig: any;
    pacingConfig: any;
  };
  days: Array<{
    id: string;
    date: string;
    items: Array<{
      id: string;
      type: string;
      startTime: string;
      endTime: string;
      place: {
        id: string;
        nameCN: string;
        nameEN: string;
        category: string;
        address: string;
        metadata: any;
      } | null;
      note: string;
    }>;
  }>;
  exportedAt: string;
}

export interface ExportOfflinePackResponse {
  tripId: string;
  version: number;
  data: OfflinePackData;
  createdAt: string;
  updatedAt: string;
}

export interface OfflinePackStatus {
  exists: boolean;
  tripId?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfflineChange {
  type: 'UPDATE_ITEM' | 'ADD_ITEM' | 'DELETE_ITEM' | 'MOVE_ITEM';
  itemId?: string;
  dayId?: string;
  data?: any;
}

export interface SyncOfflineChangesRequest {
  version: number;
  changes: OfflineChange[];
  offlinePackVersion: number;
  lastSyncTime?: string;
}

export interface Conflict {
  itemId: string;
  type: string;
  localChange: any;
  serverChange: any;
  resolution: 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';
}

// ==================== 冲突检测（规划工作台） ====================

export type ConflictType = 
  | 'TIME_CONFLICT'           // 时间冲突
  | 'LUNCH_WINDOW'            // 午餐时间窗过短
  | 'MISSING_LUNCH'           // 未安排午餐
  | 'MISSING_DINNER'          // 未安排晚餐
  | 'FATIGUE_EXCEEDED'        // 体力超标
  | 'BUFFER_INSUFFICIENT'     // 缓冲不足
  | 'CLOSURE_RISK'            // 闭园风险
  | 'ACCESSIBILITY_MISMATCH'  // 无障碍不匹配
  | 'TRANSPORT_TOO_LONG'      // 交通过长
  | 'SEASONAL_CONFLICT';      // 季节性冲突

export interface ConflictSuggestion {
  action: string;
  description: string;
  impact: string;
}

export interface PlanStudioConflict {
  id: string;
  type: ConflictType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  affectedDays: string[];
  affectedItemIds: string[];
  /** 关联的证据 ID 列表，用于在证据列表中高亮；闭园风险时 evidenceIds[0] 与 evidence.id 一一对应 */
  evidenceIds?: string[];
  suggestions?: ConflictSuggestion[];
}

export interface ConflictsResponse {
  tripId: string;
  conflicts: PlanStudioConflict[];
  total: number;
}

export interface SyncOfflineChangesResponse {
  success: boolean;
  message: string;
  syncedAt: string;
  syncedChanges: number;
  conflicts: Conflict[];
}

// ==================== 复盘报告 ====================

export interface PlaceRecap {
  id: number;
  nameCN: string;
  nameEN?: string;
  category: string;
  visitDate: string;
  visitTime: string;
  photos?: string[];
}

export interface TrailRecap {
  id: number;
  nameCN: string;
  nameEN?: string;
  distanceKm: number;
  elevationGainM: number;
  durationHours: number;
  visitDate: string;
  gpxData?: any;
  waypoints?: Array<{
    placeId?: number;
    placeName?: string;
    latitude: number;
    longitude: number;
    elevation?: number;
  }>;
}

export interface RecapStatistics {
  totalPlaces: number;
  totalTrails: number;
  totalTrailDistanceKm: number;
  totalElevationGainM: number;
  totalTrailDurationHours: number;
  placesByCategory: Record<string, number>;
}

export interface TimelineItem {
  type: 'PLACE' | 'TRAIL' | 'REST' | 'MEAL';
  name: string;
  time: string;
  duration?: number;
  note?: string;
}

export interface TripRecapReport {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  places: PlaceRecap[];
  trails: TrailRecap[];
  statistics: RecapStatistics;
  timeline: Array<{
    date: string;
    items: TimelineItem[];
  }>;
  metadata?: {
    photos?: string[];
    notes?: string;
    rating?: number;
  };
}

export interface ExportRecapResponse {
  recap: TripRecapReport;
  shareUrl: string;
  exportDate: string;
}

// ==================== 3D轨迹视频 ====================

export interface GPXPoint {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface GPXData {
  points: GPXPoint[];
  metadata?: {
    distance?: number;
    duration?: number;
  };
}

export interface TrailKeyPoint {
  latitude: number;
  longitude: number;
  elevation: number;
  timestamp: string;
  description?: string;
}

export interface TrailVideoData {
  trailId: number;
  name: string;
  gpxData: GPXData;
  keyPoints: TrailKeyPoint[];
}

export interface GenerateTrailVideoDataResponse {
  trails: TrailVideoData[];
}

// ==================== 分享行程 ====================

export interface SharedTripResponse {
  trip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    status: string;
    TripDay: Array<{
      id: string;
      date: string;
      ItineraryItem: Array<{
        id: string;
        type: string;
        startTime: string;
        endTime: string;
        Place: any | null;
        Trail: any | null;
      }>;
    }>;
  };
  permission: string;
  shareToken: string;
}

export interface ImportTripFromShareRequest {
  destination: string;
  startDate: string;
  endDate: string;
  userId?: string;
}

export interface ImportTripFromShareResponse {
  tripId: string;
  importedFrom: string;
  message: string;
}

// ==================== 紧急求救 ====================

export interface SendSOSRequest {
  latitude: number;
  longitude: number;
  message?: string;
}

export interface SendSOSResponse {
  sosId: string;
  tripId: string;
  status: SOSStatus;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sentAt: string;
  rescueInfo?: {
    estimatedArrival?: string;
    contactNumber?: string;
    progress?: string;
  };
}

export interface SOSHistoryItem {
  sosId: string;
  tripId: string;
  status: SOSStatus;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sentAt: string;
  rescueInfo?: {
    estimatedArrival?: string;
    contactNumber?: string;
    progress?: string;
  } | null;
}

// ==================== 行程调整 ====================

export interface TripModification {
  type: ModificationType;
  itemId?: string;
  newDate?: string;
  newStartTime?: string;
  activityData?: {
    placeId: number;
    startTime: string;
    endTime: string;
    type: string;
    [key: string]: any;
  };
  options?: {
    bufferDuration?: number; // 缓冲时长（分钟），默认 30
    applyToAllDays?: boolean; // 是否应用到所有日期，默认 false
    dayId?: string; // 如果 applyToAllDays 为 false，指定日期 ID
  };
}

export interface AdjustTripRequest {
  modifications: TripModification[];
}

export interface TripAdjustmentResult {
  success: boolean;
  adjustedTrip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  changes: Array<{
    type: string;
    description: string;
    affectedItems: string[];
  }>;
  budgetUpdate?: {
    oldBudget: number;
    newBudget: number;
    changes: string[];
  };
  notifications: Array<{
    type: 'HOTEL' | 'TRANSPORT' | 'ACTIVITY';
    message: string;
    actionRequired: boolean;
  }>;
}

// ==================== 创建行程项 ====================

export interface CreateItineraryItemRequest {
  tripDayId: string;
  placeId?: number;
  trailId?: number;
  type: ItineraryItemType;
  startTime: string;
  endTime: string;
  note?: string;
  /** 自定义展示名称（无 placeId 时，如铁路路线） */
  placeName?: string;
  /** 外部链接（预订页等，用于行程项展示「预订」链接） */
  externalUrl?: string;
  /** 元数据（如 source: 'rail', isOvernightRail, lineName） */
  metadata?: Record<string, unknown>;
  // 校验相关字段
  forceCreate?: boolean;       // 强制创建，忽略 WARNING 级别校验
  ignoreWarnings?: string[];  // 忽略的警告类型列表
  // 费用相关字段
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  costCategory?: CostCategory;
  costNote?: string;
  isPaid?: boolean;
  paidBy?: string;
}

// ==================== 更新行程项 ====================

export interface UpdateItineraryItemRequest {
  tripDayId?: string;
  placeId?: number;
  trailId?: number;
  type?: ItineraryItemType;
  startTime?: string;
  endTime?: string;
  note?: string;
  // 校验相关字段
  forceCreate?: boolean;       // 强制更新，忽略 WARNING 级别校验
  ignoreWarnings?: string[];  // 忽略的警告类型列表
  /**
   * 级联调整模式
   * - 'auto': 自动调整后续行程项的时间（默认行为）
   * - 'none': 只调整当前项，不影响后续行程项
   */
  cascadeMode?: 'auto' | 'none';
  // 费用相关字段
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  costCategory?: CostCategory;
  costNote?: string;
  isPaid?: boolean;
  paidBy?: string;
}

// ==================== 交通信息 ====================

/**
 * 交通段信息
 */
export interface TravelSegment {
  fromItemId: string;
  toItemId: string;
  fromPlace: string;
  toPlace: string;
  duration: number | null;      // 分钟
  distance: number | null;      // 米
  travelMode: TravelMode | null;
}

/**
 * 一天的交通信息响应
 */
export interface DayTravelInfoResponse {
  dayId: string;
  date: string;
  itemCount: number;
  segments: TravelSegment[];
  summary: {
    totalDuration: number;
    totalDistance: number;
    segmentCount: number;
  };
}

/**
 * 更新行程项交通信息请求
 */
export interface UpdateTravelInfoRequest {
  travelFromPreviousDuration?: number;
  travelFromPreviousDistance?: number;
  travelMode?: TravelMode;
}

/**
 * 计算交通信息请求
 */
export interface CalculateTravelRequest {
  defaultTravelMode?: TravelMode;
}

/**
 * 计算交通结果项
 */
export interface CalculateTravelResultItem {
  itemId: string;
  fromPlace: string;
  toPlace: string;
  duration: number | null;
  distance: number | null;
  travelMode: TravelMode;
  crossDay?: boolean;
  calculated: boolean;
}

/**
 * 计算整个行程交通信息响应
 * POST /itinerary-items/trip/:tripId/calculate-all-travel
 */
export interface CalculateAllTravelResponse {
  tripId: string;
  totalDays: number;
  totalItems: number;
  calculatedCount: number;
  crossDaySegments: number;
  results: CalculateTravelResultItem[];
  summary: {
    totalDuration: number;
    totalDistance: number;
    successRate: number;
  };
}

/**
 * 计算单天交通信息响应
 * POST /itinerary-items/trip/:tripId/days/:dayId/calculate-travel
 */
export interface CalculateDayTravelResponse {
  dayId: string;
  date: string;
  itemCount: number;
  calculatedCount: number;
  results: CalculateTravelResultItem[];
  summary: {
    totalDuration: number;
    totalDistance: number;
    successRate: number;
  };
}

/**
 * 修复日期响应
 * POST /itinerary-items/trip/:tripId/fix-dates
 */
export interface FixDatesResponse {
  tripId: string;
  fixedCount: number;
  items: Array<{
    itemId: string;
    placeName: string;
    oldDate: string;
    newDate: string;
  }>;
}

// ==================== 预订信息 ====================

/**
 * 更新预订状态请求
 */
export interface UpdateBookingRequest {
  bookingStatus?: BookingStatus;
  bookingConfirmation?: string;
  bookingUrl?: string;
  bookedAt?: string;
}

// ==================== 行程项校验 ====================

/**
 * 校验严重程度
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * 校验代码
 */
export type ValidationCode = 
  | 'TIME_OVERLAP'
  | 'INSUFFICIENT_TRAVEL_TIME'
  | 'SHORT_BUFFER'
  | 'BUSINESS_HOURS_VIOLATION'
  | 'CASCADE_IMPACT';

/**
 * 校验建议动作
 */
export type ValidationSuggestionAction = 
  | 'ADJUST_TIME'
  | 'CHANGE_TRANSPORT'
  | 'REORDER'
  | 'REMOVE'
  | 'ADD_BUFFER';

/**
 * 校验建议
 */
export interface ValidationSuggestion {
  action: ValidationSuggestionAction;
  description: string;
  suggestedValue?: {
    startTime?: string;
    endTime?: string;
    transportMode?: string;
  };
  estimatedImprovement?: string;
}

/**
 * 校验结果
 */
export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  code: ValidationCode;
  message: string;
  details: Record<string, any>;
  suggestions?: ValidationSuggestion[];
}

/**
 * 交通信息
 */
export interface TravelInfo {
  fromPlace?: string;
  toPlace?: string;
  straightDistance: number;
  roadDistance?: number;
  estimatedDuration: number;
  recommendedTransport: string;
  availableTime: number;
}

/**
 * 级联影响项
 */
export interface CascadeImpactItem {
  id: string;
  name: string;
  originalTime: string;
  suggestedTime: string;
  delayMinutes: number;
}

/**
 * 级联影响
 */
export interface CascadeImpact {
  affectedCount: number;
  affectedItems: CascadeImpactItem[];
  autoAdjusted: boolean;
}

/**
 * 预校验响应
 */
export interface ValidateItineraryItemResponse {
  canProceed: boolean;
  requiresConfirmation: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  infos: ValidationResult[];
  travelInfo?: TravelInfo | null;
}

/**
 * 批量校验响应
 */
export interface BatchValidateItineraryResponse {
  valid: boolean;
  tripId: string;
  errors: Array<{
    day: string;
    itemIds: string[];
    type: ValidationCode;
    message: string;
    severity: ValidationSeverity;
  }>;
  warnings: Array<{
    day: string;
    itemIds: string[];
    type: ValidationCode;
    message: string;
    severity: ValidationSeverity;
  }>;
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
}

/**
 * 创建行程项响应（增强版，包含校验信息）
 */
export interface CreateItineraryItemResponse {
  item: ItineraryItemDetail;
  warnings?: ValidationResult[];
  infos?: ValidationResult[];
  travelInfo?: TravelInfo | null;
  cascadeImpact?: CascadeImpact | null;
}

/**
 * 更新行程项响应（增强版，包含级联影响）
 */
export interface UpdateItineraryItemResponse {
  item: ItineraryItemDetail;
  warnings?: ValidationResult[];
  cascadeImpact?: CascadeImpact | null;
  travelInfo?: TravelInfo | null;
}

// ==================== 行程项费用管理 ====================

/**
 * 费用更新请求
 */
export interface ItemCostRequest {
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  costCategory?: CostCategory;
  costNote?: string;
  isPaid?: boolean;
  paidBy?: string;
}

/**
 * 获取费用信息响应
 */
export interface ItemCostResponse {
  id: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string | null;
  costCategory?: CostCategory | null;
  costNote?: string | null;
  isPaid?: boolean | null;
  paidBy?: string | null;
  type: ItineraryItemType;
  Place?: {
    nameCN: string;
    nameEN?: string | null;
  } | null;
}

/**
 * 更新费用响应
 */
export interface UpdateItemCostResponse {
  item: ItineraryItemDetail;
  message?: string;
}

/**
 * 批量更新费用项
 */
export interface BatchUpdateCostItem {
  id: string;
  actualCost?: number;
  isPaid?: boolean;
  costNote?: string;
}

/**
 * 批量更新费用请求
 */
export interface BatchUpdateCostRequest {
  tripId: string;
  items: BatchUpdateCostItem[];
}

/**
 * 批量更新费用响应
 */
export interface BatchUpdateCostResponse {
  updated: number;
  failed: number;
  failedIds?: string[];
  message: string;
}

/**
 * 费用汇总 - 按分类
 */
export interface CostSummaryByCategory {
  estimated: number;
  actual: number;
  count: number;
}

/**
 * 费用汇总 - 按日期
 */
export interface CostSummaryByDay {
  date: string;
  estimated: number;
  actual: number;
  itemCount: number;
}

/**
 * 预算偏差
 */
export interface CostVariance {
  amount: number;
  percentage: number;
  status: 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET';
}

/**
 * 行程费用汇总
 */
export interface TripCostSummary {
  totalBudget: number;
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  totalUnpaid: number;
  currency: string;
  byCategory: Record<CostCategory, CostSummaryByCategory>;
  byDay: CostSummaryByDay[];
  variance: CostVariance;
  budgetUsagePercent: number;
}

/**
 * 未支付费用项
 */
export interface UnpaidItem {
  id: string;
  placeName?: string | null;
  date: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string | null;
  costCategory?: CostCategory | null;
  costNote?: string | null;
}

// ==================== 预算 ====================

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  dailyBudget: number;
  dailySpent: Record<string, number>;
  categoryBreakdown: {
    accommodation: number;
    transportation: number;
    food: number;
    activities: number;
    other: number;
  };
  warnings: Array<{
    type: BudgetAlertType;
    message: string;
    severity: 'warning' | 'error';
  }>;
}

export interface BudgetAlert {
  type: 'OVERSPEND' | 'APPROACHING_LIMIT';
  message: string;
  severity: 'warning' | 'error';
  suggestions: string[];
}

export interface BudgetOptimizationSuggestion {
  type: OptimizationType;
  message: string;
  itemId?: string;
  itemName?: string;
  estimatedSavings: number;
}

export interface DailySpendingTrend {
  date: string;
  budget: number;
  spent: number;
  ratio: number;
}

export interface CategoryDistribution {
  accommodation: number;
  transportation: number;
  food: number;
  activities: number;
  other: number;
}

export interface BudgetReport {
  summary: BudgetSummary;
  trends: {
    dailySpending: DailySpendingTrend[];
    categoryDistribution: CategoryDistribution;
  };
  recommendations: string[];
}

// ==================== 预算约束管理 ====================

/**
 * 设置预算约束请求
 */
export interface SetBudgetConstraintRequest {
  total?: number;           // 总预算（必填，单位：CNY）
  currency?: string;        // 货币单位（默认 "CNY"）
  dailyBudget?: number;     // 日均预算（可选，自动计算或手动设置）
  categoryLimits?: {        // 分类预算限制（可选）
    accommodation?: number;
    transportation?: number;
    food?: number;
    activities?: number;
    other?: number;
  };
  alertThreshold?: number;  // 预警阈值（默认 0.8，即 80%）
}

/**
 * 设置预算约束响应
 */
export interface SetBudgetConstraintResponse {
  tripId: string;
  budgetConstraint: {
    total?: number;
    currency?: string;
    dailyBudget?: number;
    categoryLimits?: {
      accommodation?: number;
      transportation?: number;
      food?: number;
      activities?: number;
      other?: number;
    };
    alertThreshold?: number;
  };
  updatedAt: string;
}

/**
 * 获取预算约束响应
 */
export interface GetBudgetConstraintResponse {
  budgetConstraint: {
    total?: number;
    currency?: string;
    dailyBudget?: number;
    categoryLimits?: {
      accommodation?: number;
      transportation?: number;
      food?: number;
      activities?: number;
      other?: number;
    };
    alertThreshold?: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 删除预算约束响应
 */
export interface DeleteBudgetConstraintResponse {
  tripId: string;
  deletedAt: string;
}

// ==================== 预算明细 ====================

/**
 * 预算明细项
 */
export interface BudgetDetailsItem {
  id: string;
  date: string;
  category: string;
  itemName: string;
  amount: number;
  currency: string;
  itineraryItemId?: string;  // 关联的行程项 ID
  evidenceRefs?: string[];    // 证据引用（价格来源）
}

/**
 * 获取预算明细响应
 */
export interface BudgetDetailsResponse {
  items: BudgetDetailsItem[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 预算趋势 ====================

/**
 * 获取预算趋势响应
 */
export interface BudgetTrendsResponse {
  dailySpending: Array<{
    date: string;
    budget: number;
    spent: number;
    ratio: number;  // spent / budget
  }>;
  categoryDistribution: CategoryDistribution;
  forecast?: {      // 预算预测（可选）
    projectedTotal: number;
    projectedRemaining: number;
    confidence: number;  // 0-1
  };
}

// ==================== 预算统计 ====================

/**
 * 预算执行统计响应
 */
export interface BudgetStatisticsResponse {
  completionRate: number;      // 完成度（0-1）
  overspendRate: number;       // 超支率（负数表示节省）
  categoryPercentages: {       // 分类占比
    accommodation: number;
    transportation: number;
    food: number;
    activities: number;
    other: number;
  };
  dailyAverage: number;        // 日均支出
  projectedCompletion: string;  // 预计完成日期
  riskLevel: 'low' | 'medium' | 'high';  // 风险等级
}

// ==================== 预算监控 ====================

/**
 * 实时预算监控响应
 */
export interface BudgetMonitorResponse {
  currentSpent: number;
  remaining: number;
  dailySpent: Record<string, number>;
  alerts: BudgetAlert[];
  lastUpdated: string;
}

// ==================== 预算评估 ====================

/**
 * 预算评估违规项
 */
export interface BudgetViolation {
  category: string;
  exceeded: number;  // 超出金额
  percentage: number;  // 超出百分比
}

/**
 * 预算评估建议
 */
export interface BudgetRecommendation {
  action: string;
  impact: string;
  estimatedSavings: number;
}

/**
 * 预算评估响应
 */
export interface BudgetEvaluationResponse {
  verdict: 'ALLOW' | 'NEED_ADJUST' | 'REJECT';  // 评估结果
  reason: string;                                // 评估原因
  confidence: number;                            // 置信度（0-1）
  violations?: BudgetViolation[];               // 违规项（如有）
  recommendations?: BudgetRecommendation[];     // 调整建议
  evidenceRefs?: string[];                      // 证据引用
}

/**
 * 预算决策日志项
 */
export interface BudgetDecisionLogItem {
  id: string;
  timestamp: string;
  planId: string;
  verdict: 'ALLOW' | 'NEED_ADJUST' | 'REJECT';
  estimatedCost: number;
  budgetConstraint: {
    total?: number;
    currency?: string;
  };
  reason: string;
  evidenceRefs: string[];
  persona?: 'ABU';  // 预算评估属于 Abu 的职责
}

/**
 * 预算决策日志响应
 */
export interface BudgetDecisionLogResponse {
  items: BudgetDecisionLogItem[];
  total: number;
}

/**
 * 应用预算优化建议请求
 */
export interface ApplyBudgetOptimizationRequest {
  planId: string;
  tripId: string;
  optimizationIds: string[];  // 要应用的优化建议 ID 列表
  autoCommit?: boolean;        // 是否自动提交（默认 false）
}

/**
 * 应用预算优化建议响应
 */
export interface ApplyBudgetOptimizationResponse {
  planId: string;
  newPlanId?: string;  // 如果生成了新方案
  appliedOptimizations: Array<{
    id: string;
    type: string;
    estimatedSavings: number;
    status: 'success' | 'failed';
    reason?: string;
  }>;
  totalSavings: number;
  newEstimatedCost: number;
}

/**
 * 规划方案预算评估响应
 */
export interface PlanBudgetEvaluationResponse {
  planId: string;
  budgetEvaluation: BudgetEvaluationResponse;
  personaOutput?: {  // 三人格输出（Abu）
    persona: 'ABU';
    verdict: 'ALLOW' | 'NEED_CONFIRM' | 'REJECT';
    explanation: string;
    evidence: Array<{
      source: string;
      excerpt: string;
      relevance: string;
    }>;
  };
}

// ==================== Dashboard 决策系统 ====================

// 三人格提醒
export interface PersonaAlert {
  id: string;
  persona: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  name: string;
  title: string;
  message: string;
  severity: 'warning' | 'info' | 'success';
  createdAt: string;
  metadata?: {
    decisionSource?: 'PHYSICAL' | 'HUMAN' | 'PHILOSOPHY' | 'HEURISTIC';
    action?: 'ALLOW' | 'REJECT' | 'ADJUST' | 'REPLACE';
    reasonCodes?: string[];
    [key: string]: any;
  };
}

// 决策记录
export interface DecisionLogEntry {
  id: string;
  date: string;
  description: string;
  source: 'PHYSICAL' | 'HUMAN' | 'PHILOSOPHY' | 'SPATIAL';
  persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  action: string;
  metadata?: {
    reasonCodes?: string[];
    evidenceRefs?: string[];
    [key: string]: any;
  };
}

export interface DecisionLogResponse {
  items: DecisionLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 智能行程生成 ====================

// 旅行风格
export type TravelStyle = 'nature' | 'culture' | 'food' | 'citywalk' | 'photography' | 'adventure';

// 强度级别
export type IntensityLevel = 'relaxed' | 'balanced' | 'intense';

// 出行方式
export type TransportMode = 'walk' | 'transit' | 'car';

// 住宿基点
export type AccommodationBase = 'fixed' | 'moving';

// 徒步级别
export type HikingLevel = 'none' | 'light' | 'hiking-heavy';

// 时段类型
export type TimeSlot = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';

// 时段定义
export interface TimeSlotDefinition {
  slot: TimeSlot;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

// 生成行程请求参数
export interface GenerateTripDraftRequest {
  // 必选参数
  destination: string; // 城市/国家/区域代码
  days: number; // 1-14
  
  // 可选参数
  style?: TravelStyle;
  intensity?: IntensityLevel;
  transport?: TransportMode;
  accommodationBase?: AccommodationBase;
  hikingLevel?: HikingLevel;
  
  // 约束条件
  constraints?: {
    withChildren?: boolean;
    withElderly?: boolean;
    earlyRiser?: boolean;
    dietaryRestrictions?: string[];
    avoidCategories?: string[]; // 如: ['museum']
  };
  
  // 日期范围(可选,用于生成具体日期)
  startDate?: string;
  endDate?: string;
}

// 候选地点信息(用于LLM选择)
export interface PlaceCandidate {
  id: number;
  nameCN: string;
  nameEN?: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  openingHours?: Record<string, string>; // 如: { "monday": "09:00-18:00" }
  avgVisitDuration?: number; // 分钟
  priceLevel?: number; // 1-4
  popularity?: number;
  rating?: number;
  tags?: string[];
  address?: string;
  bookingUrl?: string;
  phone?: string;
  source?: string;
  confidence?: number;
}

// 行程项草案(包含placeId和时段信息)
export interface DraftItineraryItem {
  placeId: number;
  slot: TimeSlot;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  reason: string; // 为什么选这个地点(短句)
  alternatives?: number[]; // 备选placeId列表
  evidence?: {
    openingHours?: string;
    distance?: number; // 米
    rating?: number;
    source?: string;
  };
}

// 一天的行程草案
export interface DraftDay {
  day: number;
  date: string; // YYYY-MM-DD
  slots: {
    [key in TimeSlot]?: DraftItineraryItem;
  };
}

// 行程草案响应
export interface TripDraftResponse {
  destination: string;
  days: number;
  startDate?: string;
  endDate?: string;
  draftDays: DraftDay[];
  candidatesCount: number; // 候选地点总数
  validationWarnings?: string[]; // 校验警告
  metadata?: {
    generationTime?: number; // 毫秒
    llmProvider?: string;
  };
}

// 保存草案为行程请求
export interface SaveDraftRequest {
  draft: TripDraftResponse;
  userEdits?: {
    lockedItemIds?: string[]; // 已锁定的itemId(如果有)
    removedItems?: string[]; // 移除的item
    addedItems?: DraftItineraryItem[]; // 新增的item
  };
}

// 替换行程项请求
export interface ReplaceItineraryItemRequest {
  reason: string; // 替换原因: 'too_tired' | 'weather_change' | 'change_style' | 'too_far' | 'closed' | 'other'
  preferredStyle?: TravelStyle; // 如果是因为风格改变
  constraints?: {
    maxDistance?: number; // 米
    mustBeOpen?: boolean;
    avoidCategories?: string[];
  };
}

// 替换行程项响应
export interface ReplaceItineraryItemResponse {
  newItem: DraftItineraryItem;
  alternatives: Array<{
    placeId: number;
    placeName: string;
    reason: string;
    score: number;
  }>;
  replacedItem: {
    placeId: number;
    reason: string;
  };
}

// 重生成行程请求
export interface RegenerateTripRequest {
  lockedItemIds?: string[]; // 保持不变的itemId
  newPreferences?: {
    style?: TravelStyle;
    intensity?: IntensityLevel;
    transport?: TransportMode;
    constraints?: GenerateTripDraftRequest['constraints'];
  };
}

// 重生成行程响应
export interface RegenerateTripResponse {
  updatedDraft: TripDraftResponse;
  changes: Array<{
    type: 'added' | 'removed' | 'replaced' | 'moved';
    itemId?: string;
    placeId: number;
    placeName: string;
    day: number;
    slot: TimeSlot;
    reason: string;
  }>;
}

// ==================== 证据与关注队列 ====================

// 证据类型
export type EvidenceType = 'opening_hours' | 'road_closure' | 'weather' | 'booking' | 'other';

// 证据严重程度
export type EvidenceSeverity = 'low' | 'medium' | 'high';

// 证据项
export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  source?: string;
  link?: string;
  timestamp: string; // ISO 8601
  poiId?: string;
  day?: number; // 1-based
  severity?: EvidenceSeverity;
  /** 关联的行程项 ID 列表，用于在行程时间轴中高亮对应行程项 */
  affectedItemIds?: string[];
  metadata?: Record<string, any>;
  
  // 🆕 P0修复：证据增强字段（v1.2.0）
  freshness?: {
    fetchedAt: string; // 获取时间（ISO 8601 格式）
    expiresAt?: string; // 过期时间（ISO 8601 格式）
    freshnessStatus: 'FRESH' | 'STALE' | 'EXPIRED'; // 时效性状态
    recommendedRefreshAt?: string; // 建议刷新时间（ISO 8601 格式）
  };
  confidence?: {
    score: number; // 置信度分数（0-1）
    level: 'HIGH' | 'MEDIUM' | 'LOW'; // 置信度等级
    factors: string[]; // 影响置信度的因素列表
  };
  qualityScore?: {
    overallScore: number; // 综合质量评分（0-1）
    components: {
      sourceReliability: number; // 数据源可靠性（0-1）
      timeliness: number; // 时效性（0-1）
      completeness: number; // 完整性（0-1）
      multiSourceVerification: number; // 多源验证（0-1）
    };
    level: 'HIGH' | 'MEDIUM' | 'LOW'; // 质量等级
    explanation: string; // 质量说明
  };
}

// 证据列表响应
export interface EvidenceListResponse {
  items: EvidenceItem[];
  total: number;
  limit: number;
  offset: number;
}

// 关注项类型
export type AttentionItemType = 
  | 'schedule_conflict' 
  | 'road_closed' 
  | 'weather_risk' 
  | 'budget_alert' 
  | 'safety_risk' 
  | 'booking_issue' 
  | 'other';

// 关注项严重程度
export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';

// 关注项状态
export type AttentionStatus = 'new' | 'acknowledged' | 'resolved';

// 关注项
export interface AttentionItem {
  id: string;
  type: AttentionItemType;
  title: string;
  description?: string;
  tripId: string;
  severity: AttentionSeverity;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  status?: AttentionStatus;
  metadata?: {
    day?: number;
    poiId?: string;
    evidenceIds?: string[];
    actionUrl?: string;
    persona?: string;
    [key: string]: any;
  };
}

// 关注队列响应
export interface AttentionQueueResponse {
  items: AttentionItem[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 意图与约束 ====================

export interface UpdateIntentRequest {
  pacingConfig?: {
    maxDailyActivities?: number;
    restIntervalHours?: number;
    level?: 'relaxed' | 'standard' | 'tight';
  };
  preferences?: string[];
  constraints?: {
    dailyWalkLimit?: number;
    earlyRiser?: boolean;
    nightOwl?: boolean;
    mustPlaces?: number[];
    avoidPlaces?: number[];
  };
  planningPolicy?: 'safe' | 'experience' | 'challenge';
  totalBudget?: number;
}

export interface IntentResponse {
  id: string;
  pacingConfig?: PacingConfig;
  budgetConfig?: BudgetConfig;
  metadata?: {
    preferences?: string[];
    constraints?: {
      dailyWalkLimit?: number;
      earlyRiser?: boolean;
      nightOwl?: boolean;
      mustPlaces?: number[];
      avoidPlaces?: number[];
    };
    planningPolicy?: string;
  };
}

// ==================== 每日指标 ====================

export interface DayMetrics {
  walk: number;        // 总步行距离（公里）
  drive: number;       // 总车程（分钟）
  buffer: number;      // 总缓冲时间（分钟）
  fatigue: number;     // 总疲劳指数（0-100）
  ascent: number;      // 总爬升（米）
  cost: number;        // 预计花费
}

export interface DayMetricsResponse {
  date: string;
  metrics: DayMetrics;
  conflicts: Array<{
    type: ConflictType;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    affectedItemIds: string[];
  }>;
}

export interface TripMetricsResponse {
  tripId: string;
  days: DayMetricsResponse[];
  summary: {
    totalWalk: number;
    totalDrive: number;
    totalBuffer: number;
    totalFatigue: number;
    totalCost: number;
    averageWalkPerDay: number;
    averageDrivePerDay: number;
  };
}

// ==================== 优化结果应用 ====================

export interface ApplyOptimizationRequest {
  optimizationId?: string;
  result: any; // OptimizeRouteResponse
  options?: {
    replaceExisting?: boolean;
    preserveManualEdits?: boolean;
    dryRun?: boolean;
  };
}

/** 因不营业等原因被跳过的地点 */
export interface ApplyOptimizationSkippedItem {
  placeId: number;
  reason: string;
}

export interface ApplyOptimizationResponse {
  success: boolean;
  appliedItems: number;
  modifiedDays: string[];
  /** 因不营业等原因被跳过的地点（仅在有被跳过项时返回） */
  skipped?: ApplyOptimizationSkippedItem[];
  preview?: {
    changes: Array<{
      dayId: string;
      date: string;
      added: number;
      removed: number;
      modified: number;
    }>;
  };
}

// ==================== 行程项详细信息 ====================

export interface ItineraryItemDetailResponse extends Omit<ItineraryItemDetail, 'Place'> {
  Place?: {
    id: number;
    nameCN: string;
    nameEN?: string | null;
    category: string;
    address: string;
    lat?: number;
    lng?: number;
    rating?: number;
    metadata?: {
      openingHours?: string | Record<string, any>;
      externalSource?: string;
      lastCrawledAt?: string;
      cost?: number;
      price?: number;
      [key: string]: any;
    };
    physicalMetadata?: {
      walkingDistanceKm?: number;
      elevationGainM?: number;
      fatigueScore?: number;
      accessibility?: {
        wheelchairAccessible?: boolean;
        strollerAccessible?: boolean;
      };
      [key: string]: any;
    };
    City?: {
      id: number;
      nameCN: string;
      nameEN: string;
    };
  } | null;
}

// ==================== 基于行程项搜索附近POI ====================

/**
 * 搜索附近POI的请求参数
 */
export interface NearbyPoiRequest {
  /** 行程项ID（如果提供则使用行程项的坐标） */
  itemId?: string;
  /** 纬度（如果未提供 itemId，则必须提供） */
  lat?: number;
  /** 经度（如果未提供 itemId，则必须提供） */
  lng?: number;
  /** 搜索半径（米），默认5000米 */
  radius?: number;
  /** 要搜索的POI类别（可多选，用逗号分隔），默认搜索所有类别 */
  categories?: string;
  /** 最小评分（0-5） */
  minRating?: number;
  /** 是否只返回当前营业的地点（仅对餐厅有效） */
  openNow?: boolean;
  /** 返回结果数量限制，默认20 */
  limit?: number;
}

/**
 * 附近POI响应项
 */
export interface NearbyPoiItem {
  id: number;
  nameCN: string;
  nameEN?: string;
  category: string;
  address?: string;
  rating?: number;
  lat: number;
  lng: number;
  distanceMeters: number;
  openingHours?: {
    open?: string;
    close?: string;
    openNow?: boolean;
  };
  metadata?: {
    placeId?: string;
    types?: string[];
    priceLevel?: number;
    [key: string]: any;
  };
}

/**
 * 搜索附近POI的响应
 */
export interface NearbyPoiResponse {
  success: true;
  data: NearbyPoiItem[];
}

// ==================== 批量更新行程项 ====================

export interface BatchUpdateItemsRequest {
  updates: Array<{
    itemId: string;
    startTime?: string;
    endTime?: string;
    placeId?: number;
    note?: string;
  }>;
}

export interface BatchUpdateItemsResponse {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors?: Array<{
    itemId: string;
    error: string;
  }>;
}
