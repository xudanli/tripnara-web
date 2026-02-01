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
    throw new Error('无效的API响应：响应数据为空');
  }
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }
  // 防御性检查：确保 data 字段存在
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('无效的API响应：响应数据中的 data 字段为空');
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

/**
 * ReadinessFindingItem 接口
 * 根据后端 API 文档定义（v2.0.0）
 */
export interface ReadinessFindingItem {
  id: string;                          // 规则ID
  category: ReadinessCategory;         // 分类
  severity: RuleSeverity;              // 严重程度（low, medium, high）
  level: ActionLevel;                  // 优先级级别（blocker, must, should, optional）
  message: string;                     // 消息描述
  tasks?: Array<{                      // 任务列表
    title: string;
    dueOffsetDays?: number;            // 相对出发日期的偏移天数（负数表示提前）
    tags?: string[];
  }>;
  askUser?: string[] | UserQuestion[]; // 🆕 需要用户提供的信息（支持字符串数组或结构化问题对象）
  evidence?: Array<{                   // 证据引用
    sourceId: string;
    sectionId?: string;
    quote?: string;
  }>;
  /**
   * 约束类型，用于区分blocker和must
   * - 'legal_blocker': 法律/法规硬性要求（blocker级别，entry_transit/health_insurance类别）
   * - 'safety_blocker': 安全硬性要求（blocker级别，其他类别）
   * - 'strong_recommendation': 强烈建议（must级别）
   * - 'recommendation': 建议（should级别）
   * - 'optional': 可选（optional级别）
   */
  constraintType?: 'legal_blocker' | 'safety_blocker' | 'strong_recommendation' | 'recommendation' | 'optional';
}

/**
 * 准备度分类
 */
export type ReadinessCategory = 
  | 'entry_transit'      // 入境/过境
  | 'health_insurance'    // 健康/保险
  | 'safety'             // 安全
  | 'logistics'          // 物流
  | 'equipment'          // 装备
  | 'other';             // 其他

/**
 * 规则严重程度
 */
export type RuleSeverity = 'low' | 'medium' | 'high';

/**
 * 行动级别
 */
export type ActionLevel = 'blocker' | 'must' | 'should' | 'optional';

/**
 * ReadinessFinding 接口
 * 根据后端 API 文档定义
 */
export interface ReadinessFinding {
  category: string;            // 分类（必填，如 'entry', 'safety', 'health'）
  blockers: ReadinessFindingItem[];  // 阻塞项（必须解决）
  must: ReadinessFindingItem[];      // 必须项
  should: ReadinessFindingItem[];    // 建议项
  optional: ReadinessFindingItem[];   // 可选项
  risks: Risk[];                     // 风险列表
  // 以下字段为兼容旧版本保留，但后端可能不返回
  destinationId?: string;      // 目的地ID（兼容字段）
  packId?: string;             // Pack ID（兼容字段）
  packVersion?: string;         // Pack 版本（兼容字段）
}

/**
 * Risk 接口
 * 根据后端 API 文档定义
 */
export interface Risk {
  type: string;                        // 风险类型（如 'altitude', 'terrain', 'weather'）
  severity: 'low' | 'medium' | 'high';
  message: string;                     // 风险消息描述（后端使用 message）
  mitigation?: string[];               // 应对措施列表（后端使用 mitigation，单数形式）
  emergencyContacts?: string[];         // 紧急联系方式（如果有）
  // 以下字段为兼容旧版本保留
  summary?: string;                    // 兼容旧字段（等同于 message）
  mitigations?: string[];              // 兼容旧字段（等同于 mitigation）
}

/**
 * 受影响的POI信息
 */
export interface AffectedPoi {
  id: string;
  name: string;
  nameCN?: string;
  day?: number;  // 影响的天数（1-based）
}

/**
 * 风险来源信息（官方来源）
 */
export interface RiskSource {
  sourceId: string;                    // 来源ID（如 "src.safetravel.is"）
  authority: string;                   // 权威机构名称（如 "SafeTravel Iceland"）
  title?: string;                      // 来源标题（如 "冰岛旅行安全信息"）
  canonicalUrl?: string;               // 规范URL（如 "https://www.safetravel.is/"）
}

/**
 * 🆕 用户问题（标准化格式）
 * 
 * 支持两种格式：
 * 1. 字符串格式（向后兼容）："questionId: 问题文本 (选项1|选项2|选项3) [required] [single|multiple]"
 * 2. 结构化格式（推荐）：UserQuestion 对象
 * 
 * 后端配合要求：
 * - 优先返回结构化格式（UserQuestion[]）
 * - 支持向后兼容字符串格式（string[]）
 * - 问题ID在同一 findingItem 内必须唯一
 */
export interface UserQuestion {
  id: string;                          // 问题ID（必填，建议格式：{ruleId}.{questionId}）
  text: string | { zh: string; en: string }; // 问题文本（必填，支持国际化）
  type: 'single' | 'multiple' | 'text'; // 问题类型：单选、多选、文本输入
  required?: boolean;                   // 是否必填（默认 true）
  options?: Array<string | { zh: string; en: string }>; // 选项列表（单选/多选时必填，支持国际化）
  placeholder?: string | { zh: string; en: string }; // 文本输入时的占位符（支持国际化）
  validation?: {                        // 验证规则（可选）
    minLength?: number;                  // 最小长度
    maxLength?: number;                  // 最大长度
    pattern?: string;                    // 正则表达式
  };
}

/**
 * 缓解建议详情
 */
export interface MitigationDetail {
  action: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 风险分类类型
 */
export type RiskCategory = 'weather' | 'terrain' | 'safety' | 'logistics' | 'other';

/**
 * ReadinessDisclaimer 接口
 * 免责声明和责任边界（v2.0.0 新增）
 */
export interface ReadinessDisclaimer {
  /**
   * 免责声明消息
   * 告知用户本检查结果仅供参考，实际要求以官方机构为准
   */
  message: string;
  
  /**
   * 数据最后更新时间
   * 格式：ISO 8601 datetime
   */
  lastUpdated?: string;
  
  /**
   * 数据来源列表
   * 例如：['pack.is.iceland', 'facts.NZ']
   */
  dataSources?: string[];
  
  /**
   * 用户必须自行验证的事项
   * 例如：['签证要求', '保险覆盖范围']
   */
  userActionRequired?: string[];
}

/**
 * ReadinessConstraint 接口
 * 约束编译结果（v2.0.0 更新）
 */
export interface ReadinessConstraint {
  id: string;
  type: 'hard' | 'soft';
  severity: 'error' | 'warning' | 'info';
  /**
   * 约束类型，用于区分blocker和must
   * - 'legal_blocker': 法律/法规硬性要求（blocker级别，entry_transit/health_insurance类别）
   * - 'safety_blocker': 安全硬性要求（blocker级别，其他类别）
   * - 'strong_recommendation': 强烈建议（must级别）
   * - 'recommendation': 建议（should级别）
   * - 'optional': 可选（optional级别）
   */
  constraintType?: 'legal_blocker' | 'safety_blocker' | 'strong_recommendation' | 'recommendation' | 'optional';
  message: string;
  evidence?: Array<{ sourceId: string; sectionId?: string; quote?: string }>;
  tasks?: Array<{ title: string; dueOffsetDays?: number; tags?: string[] }>;
  askUser?: string[];
  penalty?: (state: any) => number;     // 软约束的惩罚函数（仅soft类型）
}

/**
 * ReadinessCheckResult 接口
 * 准备度检查结果（v2.0.0 更新）
 */
export interface ReadinessCheckResult {
  findings: ReadinessFinding[];
  summary: {
    totalBlockers: number;
    totalMust: number;
    totalShould: number;
    totalOptional: number;
    totalRisks?: number;  // 风险总数（可选）
  };
  risks: Risk[];
  constraints: ReadinessConstraint[];
  /**
   * 免责声明和责任边界
   * 必须包含在API响应中，前端必须显示给用户
   */
  disclaimer?: ReadinessDisclaimer;
}

// ==================== 能力包相关类型 ====================

/**
 * 能力包类型
 * 根据后端 API 文档定义
 */
export type CapabilityPackType = 
  | 'high_altitude'      // 高海拔旅行准备
  | 'sparse_supply'      // 稀疏补给区域准备
  | 'seasonal_road'      // 季节性道路关闭准备
  | 'permit_checkpoint'  // 许可证和检查站准备
  | 'emergency';         // 紧急准备

/**
 * 能力包基本信息
 */
export interface CapabilityPack {
  type: CapabilityPackType | string;
  displayName: string;
  description: string;
}

/**
 * 能力包评估请求 DTO
 * POST /readiness/capability-packs/evaluate
 */
export interface CapabilityPackEvaluateDto {
  destinationId: string;          // 必填，目的地ID（如 "IS"）
  
  traveler?: {                    // 旅行者信息
    nationality?: string;         // 国籍（ISO代码）
    residencyCountry?: string;    // 居住国
    tags?: string[];              // 标签，如 ["senior", "family_with_children"]
    budgetLevel?: 'low' | 'medium' | 'high';
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  
  trip?: {
    startDate?: string;           // 开始日期（ISO格式）
    endDate?: string;             // 结束日期
  };
  
  itinerary?: {
    countries?: string[];         // 目的地国家列表
    activities?: string[];        // 活动类型，如 ["self_drive", "hiking", "glacier_walking"]
    season?: 'winter' | 'summer' | 'spring' | 'fall' | string;  // 季节
    routeLength?: number;         // 路线长度（km）
  };
  
  geo?: {
    lat?: number;                 // 纬度
    lng?: number;                 // 经度
    mountains?: {
      inMountain?: boolean;       // 是否在山区
      mountainElevationAvg?: number;  // 平均海拔（米）
      hasMountainPass?: boolean;  // 是否有山口
    };
    roads?: {
      roadDensityScore?: number;  // 道路密度（0-1，越低越偏远）
      hasMountainPass?: boolean;
    };
    pois?: {
      supplyDensity?: number;     // 补给点密度（0-1）
      hasCheckpoint?: boolean;    // 是否有检查站
      safety?: {
        hasHospital?: boolean;    // 附近是否有医院
        hasPolice?: boolean;      // 附近是否有警局
      };
      supply?: {
        hasFuel?: boolean;        // 是否有加油站
        hasSupermarket?: boolean; // 是否有超市
      };
    };
  };
}

/**
 * 能力包规则
 */
export interface CapabilityPackRule {
  id: string;                     // 规则ID
  triggered: boolean;             // 是否触发
  level: 'must' | 'should' | 'blocker' | 'optional';  // 级别
  message: string;                // 消息描述
}

/**
 * 能力包危险/风险
 */
export interface CapabilityPackHazard {
  type: string;                   // 危险类型，如 "road_closure"
  severity: 'high' | 'medium' | 'low';  // 严重程度
  summary: string;                // 摘要描述
}

/**
 * 能力包评估结果项
 */
export interface CapabilityPackEvaluateResultItem {
  packType: CapabilityPackType | string;  // 能力包类型
  triggered: boolean;             // 是否触发
  triggerReason?: string;         // 触发原因说明（新增）
  rules?: CapabilityPackRule[];   // 规则列表（仅当 triggered=true 时）
  hazards?: CapabilityPackHazard[];  // 危险/风险列表（仅当 triggered=true 时）
}

/**
 * 能力包评估上下文（调试用）
 */
export interface CapabilityPackEvaluateContext {
  hasGeo: boolean;                // 是否有 geo 参数
  hasTraveler: boolean;           // 是否有 traveler 参数
  hasItinerary: boolean;          // 是否有 itinerary 参数
  destinationId?: string;         // 目的地 ID
  season?: string;                // 季节
  activities?: string[];          // 活动列表
  routeLength?: number;           // 路线长度
  geo?: {
    lat?: number;
    lng?: number;
    mountainElevationAvg?: number;
    inMountain?: boolean;
    roadDensityScore?: number;
    supplyDensity?: number;
  };
}

/**
 * 能力包评估响应
 */
export interface CapabilityPackEvaluateResponse {
  total: number;                  // 总能力包数
  triggered: number;              // 触发的能力包数
  results: CapabilityPackEvaluateResultItem[];
  geoEnhanced?: boolean;          // 是否使用了自动地理增强（新增）
  context?: CapabilityPackEvaluateContext;  // 调试用上下文（新增）
}

/**
 * 能力包评估请求选项
 */
export interface CapabilityPackEvaluateOptions {
  autoEnhanceGeo?: boolean;       // 是否自动获取目的地地理特征
}

/**
 * 兼容旧版本的评估结果类型
 * @deprecated 请使用 CapabilityPackEvaluateResultItem
 */
export interface CapabilityPackEvaluateResult {
  pack: CapabilityPack;
  triggered: boolean;
  reason?: string;
  // 新增字段，支持新 API 格式
  packType?: CapabilityPackType | string;
  rules?: CapabilityPackRule[];
  hazards?: CapabilityPackHazard[];
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
  aiEnhanced?: boolean;  // 是否启用AI增强
  failedFeatures?: string[];  // 失败的AI增强功能列表
}

/**
 * 风险项（扩展版，支持能力包来源和增强字段）
 * 根据风险预警增强版 API 文档定义
 */
export interface EnhancedRisk extends Risk {
  id?: string;                          // 🆕 风险ID
  typeLabel?: string;                   // 🆕 风险类型中文显示名称（如 `极端天气`）
  typeLabelEn?: string;                 // 🆕 风险类型英文显示名称
  typeIcon?: string;                    // 🆕 风险类型图标（emoji）
  category?: RiskCategory;              // 🆕 风险分类（`weather`/`terrain`/`safety`/`logistics`/`other`）
  severityLabel?: string;                // 🆕 严重程度中文显示（`高`/`中`/`低`）
  severityLabelEn?: string;             // 🆕 严重程度英文显示
  description?: string;                 // 🆕 详细说明（当前与message相同）
  impact?: string;                      // 🆕 影响说明
  mitigationDetails?: MitigationDetail[]; // 🆕 详细缓解建议（包含优先级）
  affectedPois?: AffectedPoi[];         // 🆕 影响的POI列表（包含名称、天数）
  sourceType?: 'readiness' | 'capability_pack';  // 来源类型
  sourcePackType?: CapabilityPackType | string;  // 能力包类型（当 sourceType='capability_pack' 时）
  originalSeverity?: 'low' | 'medium' | 'high';   // 🆕 原始严重程度（AI增强前）
}

/**
 * 风险预警请求参数
 */
export interface RiskWarningsParams {
  tripId: string;
  lang?: string;
  userId?: string;  // 🆕 用户ID（可选，用于个性化）
  includeCapabilityPackHazards?: boolean;  // 是否包含能力包的 hazards
}

/**
 * 风险预警响应（增强版）
 * 根据风险预警增强版 API 文档定义
 */
export interface RiskWarningsResponse {
  tripId: string;
  risks: EnhancedRisk[];
  risksByCategory?: Record<RiskCategory, Array<{
    id: string;
    type: string;
    typeLabel?: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>>;                                  // 🆕 按分类分组的风险
  packSources?: RiskSource[];           // 🆕 所有风险的官方来源列表（去重后）
  summary: {
    totalRisks: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    // 新增：按来源统计
    bySource?: {
      readiness: number;
      capabilityPack: number;
    };
    // 🆕 按分类统计的风险数量
    byCategory?: {
      weather?: number;
      terrain?: number;
      safety?: number;
      logistics?: number;
      other?: number;
    };
  };
  aiEnhanced?: boolean;                 // 🆕 是否启用AI增强
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
   * 
   * 评估哪些能力包应该被触发
   * 
   * 触发条件速查：
   * - high_altitude: geo.mountains.mountainElevationAvg >= 2500
   * - sparse_supply: geo.roads.roadDensityScore < 0.3 + geo.pois.supplyDensity < 0.2 + itinerary.routeLength > 100
   * - seasonal_road: geo.mountains.inMountain == true + itinerary.season == "winter"
   * - permit_checkpoint: geo.pois.hasCheckpoint == true 或 特定国家/活动
   * - emergency: geo.roads.roadDensityScore < 0.2 + (无医院 或 路线>300km 或 海拔>=3000m)
   * 
   * @param dto 能力包评估请求参数
   * @param options 评估选项
   *   - autoEnhanceGeo: 是否自动获取目的地地理特征（默认 false）
   */
  evaluateCapabilityPacks: async (
    dto: CapabilityPackEvaluateDto | CheckReadinessDto,
    options?: CapabilityPackEvaluateOptions
  ): Promise<CapabilityPackEvaluateResponse> => {
    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (options?.autoEnhanceGeo) {
      queryParams.append('autoEnhanceGeo', 'true');
    }
    const queryString = queryParams.toString();
    const url = queryString 
      ? `/readiness/capability-packs/evaluate?${queryString}`
      : '/readiness/capability-packs/evaluate';
    
    const response = await apiClient.post<
      ApiResponseWrapper<CapabilityPackEvaluateResponse>
    >(url, dto);
    const result = handleResponse(response);
    
    // 防御性检查：确保返回的数据结构正确
    if (!result) {
      throw new Error('evaluateCapabilityPacks 返回的数据为空');
    }
    
    // 确保 results 字段存在
    if (!result.results) {
      console.warn('[Readiness] evaluateCapabilityPacks 返回的数据缺少 results 字段，使用空数组');
      result.results = [];
    }
    
    // 确保 total 和 triggered 字段存在
    if (typeof result.total !== 'number') {
      result.total = result.results.length;
    }
    if (typeof result.triggered !== 'number') {
      result.triggered = result.results.filter(r => r.triggered).length;
    }
    
    // 记录调试信息
    if (result.context) {
      console.log('📊 [Readiness] 能力包评估上下文:', result.context);
    }
    if (result.geoEnhanced) {
      console.log('🌍 [Readiness] 使用了自动地理增强');
    }
    
    return result;
  },

  /**
   * 获取个性化准备清单
   * GET /readiness/personalized-checklist?tripId=xxx&lang=zh
   * @param tripId 行程ID
   * @param lang 语言代码，可选：'zh' | 'en'，默认为 'en'
   */
  getPersonalizedChecklist: async (tripId: string, lang?: string): Promise<PersonalizedChecklistResponse> => {
    // 防御性检查：确保 tripId 存在
    if (!tripId) {
      throw new Error('tripId 是必需的参数');
    }
    
    // 安全地构建查询参数
    const params = new URLSearchParams();
    params.append('tripId', tripId);
    if (lang) {
      params.append('lang', lang);
    }
    
    try {
      const response = await apiClient.get<ApiResponseWrapper<PersonalizedChecklistResponse>>(
        `/readiness/personalized-checklist?${params.toString()}`
      );
      const result = handleResponse(response);
      
      // 防御性检查：确保返回的数据结构正确
      if (!result) {
        throw new Error('getPersonalizedChecklist 返回的数据为空');
      }
      
      // 确保 checklist 和 summary 字段存在，避免后续访问时出错
      if (!result.checklist) {
        console.warn('[Readiness] getPersonalizedChecklist 返回的数据缺少 checklist 字段，使用默认值');
        result.checklist = {
          blocker: [],
          must: [],
          should: [],
          optional: [],
        };
      }
      if (!result.summary) {
        console.warn('[Readiness] getPersonalizedChecklist 返回的数据缺少 summary 字段，使用默认值');
        result.summary = {
          totalBlockers: result.checklist?.blocker?.length || 0,
          totalMust: result.checklist?.must?.length || 0,
          totalShould: result.checklist?.should?.length || 0,
          totalOptional: result.checklist?.optional?.length || 0,
        };
      }
      
      // 确保 checklist 中的各个数组字段存在
      if (!Array.isArray(result.checklist.blocker)) result.checklist.blocker = [];
      if (!Array.isArray(result.checklist.must)) result.checklist.must = [];
      if (!Array.isArray(result.checklist.should)) result.checklist.should = [];
      if (!Array.isArray(result.checklist.optional)) result.checklist.optional = [];
      
      return result;
    } catch (error: any) {
      // 提供更详细的错误信息
      console.error('[Readiness] getPersonalizedChecklist API 调用失败:', {
        tripId,
        lang,
        error: error?.message || error,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      throw error;
    }
  },

  /**
   * 获取行程潜在风险预警
   * GET /readiness/risk-warnings?tripId=xxx&lang=zh&includeCapabilityPackHazards=true
   * 
   * @param tripId 行程ID
   * @param lang 语言代码，可选：'zh' | 'en'，默认为 'en'
   * @param options 可选参数
   *   - includeCapabilityPackHazards: 是否包含能力包的 hazards（默认 false）
   */
  /**
   * 获取行程潜在风险（增强版）
   * GET /readiness/risk-warnings?tripId=xxx&lang=zh&userId=xxx&includeCapabilityPackHazards=true
   * 
   * @param tripId 行程ID（必填）
   * @param options 可选参数
   *   - lang: 语言代码，可选：'zh' | 'en'，默认为 'en'
   *   - userId: 用户ID（可选，用于个性化）
   *   - includeCapabilityPackHazards: 是否包含能力包危害（默认 false）
   */
  getRiskWarnings: async (
    tripId: string, 
    options?: { 
      lang?: string;
      userId?: string;
      includeCapabilityPackHazards?: boolean;
    }
  ): Promise<RiskWarningsResponse> => {
    // 防御性检查：确保 tripId 存在
    if (!tripId) {
      throw new Error('tripId 是必需的参数');
    }
    
    // 安全地构建查询参数
    const params = new URLSearchParams();
    params.append('tripId', tripId);
    if (options?.lang) {
      params.append('lang', options.lang);
    }
    // ✅ 只有当 userId 存在且不为空时才传递
    if (options?.userId && options.userId.trim() !== '') {
      params.append('userId', options.userId);
    }
    if (options?.includeCapabilityPackHazards) {
      params.append('includeCapabilityPackHazards', 'true');
    }
    
    try {
      const response = await apiClient.get<ApiResponseWrapper<RiskWarningsResponse>>(
        `/readiness/risk-warnings?${params.toString()}`
      );
      const result = handleResponse(response);
      
      // 防御性检查：确保返回的数据结构正确
      if (!result) {
        throw new Error('getRiskWarnings 返回的数据为空');
      }
      
      // 确保 risks 和 summary 字段存在，避免后续调用 .map() 时出错
      if (!result.risks) {
        console.warn('[Readiness] getRiskWarnings 返回的数据缺少 risks 字段，使用空数组');
        result.risks = [];
      }
      if (!result.summary) {
        console.warn('[Readiness] getRiskWarnings 返回的数据缺少 summary 字段，使用默认值');
        const risks = result.risks || [];
        result.summary = {
          totalRisks: risks.length,
          highSeverity: risks.filter(r => r.severity === 'high').length,
          mediumSeverity: risks.filter(r => r.severity === 'medium').length,
          lowSeverity: risks.filter(r => r.severity === 'low').length,
          bySource: options?.includeCapabilityPackHazards ? {
            readiness: risks.filter(r => r.sourceType !== 'capability_pack').length,
            capabilityPack: risks.filter(r => r.sourceType === 'capability_pack').length,
          } : undefined,
        };
      }
      
      // 记录调试信息
      if (options?.includeCapabilityPackHazards) {
        const capPackRisks = result.risks.filter(r => r.sourceType === 'capability_pack');
        console.log(`🔄 [Readiness] 风险预警包含 ${capPackRisks.length} 个能力包 hazards`);
      }
      
      // ✅ 确保新字段存在（向后兼容）
      if (!result.risksByCategory) {
        // 如果没有按分类分组的数据，根据 risks 数组自动生成
        const risksByCategory: Record<RiskCategory, EnhancedRisk[]> = {
          weather: [],
          terrain: [],
          safety: [],
          logistics: [],
          other: [],
        };
        result.risks.forEach(risk => {
          const category = risk.category || 'other';
          if (category in risksByCategory) {
            risksByCategory[category as RiskCategory].push(risk);
          } else {
            risksByCategory.other.push(risk);
          }
        });
        result.risksByCategory = risksByCategory as any;
      }
      
      // ✅ 确保 summary.byCategory 存在
      if (!result.summary.byCategory) {
        const risks = result.risks || [];
        result.summary.byCategory = {
          weather: risks.filter(r => r.category === 'weather').length,
          terrain: risks.filter(r => r.category === 'terrain').length,
          safety: risks.filter(r => r.category === 'safety').length,
          logistics: risks.filter(r => r.category === 'logistics').length,
          other: risks.filter(r => !r.category || r.category === 'other').length,
        };
      }
      
      return result;
    } catch (error: any) {
      // 提供更详细的错误信息
      // ✅ 提供更详细的错误信息，包括请求参数
      const errorDetails = {
        tripId,
        lang: options?.lang,
        userId: options?.userId || '(未提供)',
        includeCapabilityPackHazards: options?.includeCapabilityPackHazards,
        url: `/readiness/risk-warnings?${params.toString()}`,
        error: error?.message || error,
        response: error?.response?.data,
        status: error?.response?.status,
      };
      console.error('[Readiness] getRiskWarnings API 调用失败:', errorDetails);
      
      // ✅ 如果是 500 错误，可能是后端尚未实现增强版接口，记录警告但不抛出错误
      if (error?.response?.status === 500) {
        console.warn('⚠️ [Readiness] 后端返回 500 错误，可能是增强版风险预警接口尚未实现，将使用旧格式风险数据');
        // 返回空数据，让调用方使用降级方案
        return {
          tripId,
          risks: [],
          summary: {
            totalRisks: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0,
          },
        };
      }
      
      throw error;
    }
  },

  /**
   * 根据行程ID检查准备度
   * 基于行程ID自动获取行程信息并检查准备度，返回 must/should/optional 清单
   * 
   * GET /readiness/trip/:id
   * 
   * 注意：根据后端 API 文档，此接口路径为 `/readiness/trip/:id`，不支持 lang 参数
   * 如需多语言支持，请在后端实现时添加 lang 参数
   * 
   * 此接口返回 ReadinessCheckResult 格式，与 POST /readiness/check 相同
   * 如需 ReadinessData 格式，请在调用处使用 convertCheckResultToReadinessData 转换
   * 
   * @param tripId 行程ID（UUID）
   * @param lang 语言代码（可选，但后端文档中未提及，保留以兼容现有代码）
   */
  getTripReadiness: async (tripId: string, lang?: string): Promise<ReadinessCheckResult> => {
    // 根据后端文档，路径为 /readiness/trip/:id，不支持 lang 参数
    // 但保留 lang 参数以兼容现有代码，如果后端不支持则会被忽略
    const url = lang 
      ? `/readiness/trip/${tripId}?lang=${lang}`
      : `/readiness/trip/${tripId}`;
    const response = await apiClient.get<ApiResponseWrapper<ReadinessCheckResult>>(url);
    return handleResponse(response);
  },

  /**
   * 获取修复方案
   * POST /readiness/repair-options
   * 
   * 获取准备度检查阻塞项的可用修复选项
   * 
   * @param tripId 行程ID
   * @param blockerId 阻塞项ID（从准备度检查结果中获取）
   */
  getRepairOptions: async (
    tripId: string,
    blockerId: string
  ): Promise<RepairOptionsResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<RepairOptionsResponse>>(
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
   * 批量保存勾选状态
   * PUT /readiness/trip/:tripId/checklist/status
   * 
   * 保存用户勾选的 must 项状态到后端，支持跨设备同步
   * 
   * @param tripId 行程ID
   * @param data 勾选状态数据
   *   - checkedItems: 已勾选的项ID列表
   *   - uncheckedItems: 取消勾选的项ID列表（可选）
   */
  updateChecklistStatus: async (
    tripId: string,
    data: {
      checkedItems: string[];
      uncheckedItems?: string[];
    }
  ): Promise<{ tripId: string; checkedItems: string[]; lastUpdatedAt: string }> => {
    const response = await apiClient.put<ApiResponseWrapper<{ tripId: string; checkedItems: string[]; lastUpdatedAt: string }>>(
      `/readiness/trip/${tripId}/checklist/status`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取检查清单勾选状态
   * GET /readiness/trip/:tripId/checklist/status
   * 
   * 获取行程的检查清单勾选状态
   */
  getChecklistStatus: async (
    tripId: string
  ): Promise<{ tripId: string; checkedItems: string[]; lastUpdatedAt: string }> => {
    const response = await apiClient.get<ApiResponseWrapper<{ tripId: string; checkedItems: string[]; lastUpdatedAt: string }>>(
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
      // 原有参数
      includeOptional?: boolean;
      categories?: string[];
      customItems?: Array<{ name: string; category: string; quantity?: number; note?: string }>;
      // 新增参数（模板模式）
      useTemplate?: boolean;              // 是否使用模板模式
      season?: 'summer' | 'transition' | 'winter';  // 季节
      route?: string;                     // 路线类型
      userType?: string;                  // 用户类型
      activities?: string[];               // 活动列表
      vehicleType?: string;                // 车辆类型
      specialNeeds?: string[];            // 特殊需求
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
   * 
   * 更新打包清单项的勾选状态、数量或备注
   */
  updatePackingListItem: async (
    tripId: string,
    itemId: string,
    updates: {
      checked?: boolean;
      quantity?: number;
      notes?: string;
    }
  ): Promise<{ itemId: string; updated: boolean }> => {
    const response = await apiClient.put<ApiResponseWrapper<{ itemId: string; updated: boolean }>>(
      `/readiness/trip/${tripId}/packing-list/items/${itemId}`,
      updates
    );
    return handleResponse(response);
  },

  /**
   * 获取打包顺序步骤
   * GET /readiness/packing-order-steps
   * 
   * 获取推荐的打包顺序步骤，帮助用户有序打包
   */
  getPackingOrderSteps: async (): Promise<{
    steps: Array<{
      order: number;
      title: string;
      description: string;
      items: string[];
    }>;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      steps: Array<{
        order: number;
        title: string;
        description: string;
        items: string[];
      }>;
    }>>('/readiness/packing-order-steps');
    return handleResponse(response);
  },

  /**
   * 获取出发前检查清单
   * GET /readiness/pre-departure-checklist
   * 
   * 获取出发前24小时的最终检查清单
   */
  getPreDepartureChecklist: async (): Promise<{
    checklist: Array<{
      id: string;
      category: string;
      title: string;
      checked: boolean;
    }>;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      checklist: Array<{
        id: string;
        category: string;
        title: string;
        checked: boolean;
      }>;
    }>>('/readiness/pre-departure-checklist');
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

  // ==================== P0: 能力包清单同步接口 ====================

  /**
   * 添加能力包规则到准备清单
   * POST /readiness/trip/:tripId/checklist/add-from-capability-pack
   * 
   * 将能力包的规则同步到个人准备清单
   * 
   * @param tripId 行程ID
   * @param data 能力包规则数据
   */
  addCapabilityPackRulesToChecklist: async (
    tripId: string,
    data: {
      packType: string;
      rules: Array<{
        id: string;
        level: 'blocker' | 'must' | 'should' | 'optional';
        message: string;
        category?: string;
        tasks?: string[];
      }>;
    }
  ): Promise<{
    addedCount: number;
    items: Array<{
      id: string;
      ruleId: string;
      message: string;
      level: 'blocker' | 'must' | 'should' | 'optional';
      sourcePackType: string;
      checked: boolean;
    }>;
  }> => {
    const response = await apiClient.post<ApiResponseWrapper<{
      addedCount: number;
      items: Array<{
        id: string;
        ruleId: string;
        message: string;
        level: 'blocker' | 'must' | 'should' | 'optional';
        sourcePackType: string;
        checked: boolean;
      }>;
    }>>(
      `/readiness/trip/${tripId}/checklist/add-from-capability-pack`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取能力包清单项
   * GET /readiness/trip/:tripId/checklist/capability-pack-items
   * 
   * 获取行程中来自能力包的准备清单项
   * 
   * @param tripId 行程ID
   * @param packType 可选，筛选特定能力包类型
   */
  getCapabilityPackChecklistItems: async (
    tripId: string,
    packType?: string
  ): Promise<{
    items: Array<{
      id: string;
      ruleId: string;
      message: string;
      level: 'blocker' | 'must' | 'should' | 'optional';
      sourcePackType: string;
      checked: boolean;
      tasks?: string[];
    }>;
    summary: {
      total: number;
      checked: number;
      unchecked: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (packType) {
      params.append('packType', packType);
    }
    const queryString = params.toString();
    const url = queryString
      ? `/readiness/trip/${tripId}/checklist/capability-pack-items?${queryString}`
      : `/readiness/trip/${tripId}/checklist/capability-pack-items`;
    
    const response = await apiClient.get<ApiResponseWrapper<{
      items: Array<{
        id: string;
        ruleId: string;
        message: string;
        level: 'blocker' | 'must' | 'should' | 'optional';
        sourcePackType: string;
        checked: boolean;
        tasks?: string[];
      }>;
      summary: {
        total: number;
        checked: number;
        unchecked: number;
      };
    }>>(url);
    return handleResponse(response);
  },

  /**
   * 更新能力包清单项状态
   * PUT /readiness/trip/:tripId/checklist/capability-pack-items/:itemId/status
   * 
   * 更新能力包清单项的完成状态
   * 
   * @param tripId 行程ID
   * @param itemId 清单项ID
   * @param checked 是否已完成
   */
  updateCapabilityPackChecklistItemStatus: async (
    tripId: string,
    itemId: string,
    checked: boolean
  ): Promise<{
    id: string;
    checked: boolean;
    updatedAt: string;
  }> => {
    const response = await apiClient.put<ApiResponseWrapper<{
      id: string;
      checked: boolean;
      updatedAt: string;
    }>>(
      `/readiness/trip/${tripId}/checklist/capability-pack-items/${itemId}/status`,
      { checked }
    );
    return handleResponse(response);
  },

  /**
   * 删除能力包清单项
   * DELETE /readiness/trip/:tripId/checklist/capability-pack-items/:itemId
   * 
   * 从准备清单中移除能力包规则项
   * 
   * @param tripId 行程ID
   * @param itemId 清单项ID
   */
  deleteCapabilityPackChecklistItem: async (
    tripId: string,
    itemId: string
  ): Promise<{
    deleted: boolean;
    itemId: string;
  }> => {
    const response = await apiClient.delete<ApiResponseWrapper<{
      deleted: boolean;
      itemId: string;
    }>>(
      `/readiness/trip/${tripId}/checklist/capability-pack-items/${itemId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取行程覆盖地图数据
   * GET /readiness/trip/:tripId/coverage-map
   * 
   * 获取行程的地图覆盖数据，用于前端渲染覆盖地图
   * 
   * @param tripId 行程ID
   */
  getCoverageMapData: async (tripId: string): Promise<CoverageMapResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<CoverageMapResponse>>(
      `/readiness/trip/${tripId}/coverage-map`
    );
    return handleResponse(response);
  },

  /**
   * 获取行程准备度分数
   * GET /readiness/trip/:tripId/score
   * 
   * 获取行程的准备度分数分解，包含多维度评分
   * 
   * @param tripId 行程ID
   */
  getScoreBreakdown: async (tripId: string): Promise<ScoreBreakdownResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ScoreBreakdownResponse>>(
      `/readiness/trip/${tripId}/score`
    );
    return handleResponse(response);
  },

  /**
   * 获取规则的用户决策问题列表
   * GET /api/readiness/trips/:tripId/decisions/:ruleId/questions
   * 
   * 获取规则的用户决策问题列表（包含分组和进度信息）
   * 
   * @param tripId 行程ID
   * @param ruleId 规则ID
   */
  getDecisionQuestions: async (
    tripId: string,
    ruleId: string
  ): Promise<{
    ruleId: string;
    questions: Array<{
      id: string;
      text: string | { zh: string; en: string };
      type: 'single' | 'multiple' | 'text';
      required?: boolean;
      options?: Array<string | { zh: string; en: string }>;
      placeholder?: string | { zh: string; en: string };
      validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
      };
    }>;
    groups?: Array<{
      id: string;
      title: string;
      questionIds: string[];
    }>;
    progress?: {
      answered: number;
      total: number;
    };
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      ruleId: string;
      questions: Array<{
        id: string;
        text: string | { zh: string; en: string };
        type: 'single' | 'multiple' | 'text';
        required?: boolean;
        options?: Array<string | { zh: string; en: string }>;
        placeholder?: string | { zh: string; en: string };
        validation?: {
          minLength?: number;
          maxLength?: number;
          pattern?: string;
        };
      }>;
      groups?: Array<{
        id: string;
        title: string;
        questionIds: string[];
      }>;
      progress?: {
        answered: number;
        total: number;
      };
    }>>(
      `/api/readiness/trips/${tripId}/decisions/${ruleId}/questions`
    );
    return handleResponse(response);
  },

  /**
   * 回答用户决策问题
   * POST /api/readiness/trips/:tripId/decisions/:ruleId/answer
   * 
   * 用户回答准备度规则中的决策问题，系统根据回答评估决策分支并返回更新后的准备度检查结果
   * 
   * @param tripId 行程ID
   * @param ruleId 规则ID
   * @param data 回答数据
   *   - questionId: 问题ID
   *   - answer: 答案（根据问题类型，可能是字符串、字符串数组等）
   */
  answerDecision: async (
    tripId: string,
    ruleId: string,
    data: {
      questionId: string;
      answer: string | string[] | any;
    }
  ): Promise<{
    updatedFinding: ReadinessFindingItem;
  }> => {
    const response = await apiClient.post<ApiResponseWrapper<{
      updatedFinding: ReadinessFindingItem;
    }>>(
      `/api/readiness/trips/${tripId}/decisions/${ruleId}/answer`,
      data
    );
    return handleResponse(response);
  },
};

// ==================== 覆盖地图类型定义 ====================

/** 坐标点 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** 地图边界 */
export interface MapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

/** POI 覆盖状态 */
export type PoiCoverageStatus = 'covered' | 'partial' | 'uncovered';

/** 路段覆盖状态 */
export type SegmentCoverageStatus = 'covered' | 'warning' | 'blocked';

/** 证据类型 */
export type EvidenceType = 'opening_hours' | 'weather' | 'road_closure' | 'booking_confirmation' | 'permit' | 'other';

/** POI 类型 */
export type PoiType = 'city' | 'attraction' | 'hotel' | 'restaurant' | 'transport' | 'other';

/** 路段风险 */
export interface SegmentHazard {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

/** 覆盖地图 POI */
export interface CoverageMapPoi {
  id: string;
  day: number;
  order: number;
  name: string;
  type: PoiType;
  coordinates: Coordinates;
  coverageStatus: PoiCoverageStatus;
  evidenceCount: number;
  evidenceTypes: EvidenceType[];
  missingEvidence?: EvidenceType[];
}

/** 覆盖地图路段 */
export interface CoverageMapSegment {
  id: string;
  fromPoiId: string;
  toPoiId: string;
  day: number;
  distance: number;
  duration: number;
  routeType: 'driving' | 'walking' | 'transit' | 'cycling';
  coverageStatus: SegmentCoverageStatus;
  polyline: string;
  hazards: SegmentHazard[];
}

/** 证据状态 */
export type EvidenceStatus = 'fetched' | 'missing' | 'fetching' | 'failed';

/** 覆盖缺口 */
export interface CoverageGap {
  id: string;
  type: 'poi' | 'segment';
  relatedId: string;
  coordinates: Coordinates;
  severity: 'high' | 'medium' | 'low';
  message: string;
  missingEvidence?: EvidenceType[];
  hazards?: string[];
  // 优化后的新字段
  affectedDays?: number[];        // 受影响的天数列表
  affectedPois?: string[];       // 受影响的 POI ID 列表
  evidenceStatus?: EvidenceStatus; // 证据获取状态
  lastUpdated?: string;          // 最后更新时间
  dataSource?: string;           // 数据来源
}

/** 覆盖统计 */
export interface CoverageSummary {
  totalPois: number;
  coveredPois: number;
  partialPois: number;
  uncoveredPois: number;
  totalSegments: number;
  coveredSegments: number;
  warningSegments: number;
  blockedSegments: number;
  totalGaps: number;
  coverageRate: number;
}

/** 证据状态摘要 */
export interface EvidenceStatusSummary {
  total: number;
  fetched: number;
  missing: number;
  fetching: number;
  failed: number;
}

/** 数据新鲜度 */
export interface DataFreshness {
  weather?: string;        // ISO 时间戳
  roadClosure?: string;   // ISO 时间戳
  openingHours?: string;  // ISO 时间戳
}

/** 按严重程度分组的警告 */
export interface WarningsBySeverity {
  high: CoverageGap[];
  medium: CoverageGap[];
  low: CoverageGap[];
}

/** 覆盖地图响应 */
export interface CoverageMapResponse {
  tripId: string;
  bounds: MapBounds;
  center: Coordinates;
  zoom: number;
  pois: CoverageMapPoi[];
  segments: CoverageMapSegment[];
  gaps: CoverageGap[];
  summary: CoverageSummary;
  // 优化后的新字段
  deduplicatedWarnings?: CoverageGap[];      // 去重后的警告列表
  warningsBySeverity?: WarningsBySeverity;   // 按严重程度分组的警告
  evidenceStatusSummary?: EvidenceStatusSummary; // 证据状态摘要
  calculatedAt?: string;                     // 计算时间戳
  dataFreshness?: DataFreshness;             // 数据新鲜度
}

// ==================== 准备度分数类型定义 ====================

/** 准备度分数 */
export interface ScoreData {
  overall: number;
  evidenceCoverage: number;
  scheduleFeasibility: number;
  transportCertainty: number;
  safetyRisk: number;
  buffers: number;
}

/** 准备度发现项 */
export interface ScoreFinding {
  id: string;
  /** ✅ v1.7.0统一：使用标准类型 must 和 should，同时兼容 warning 和 suggestion */
  type: 'blocker' | 'must' | 'should' | 'optional' | 'warning' | 'suggestion';
  category: 'evidence' | 'schedule' | 'transport' | 'safety' | 'buffer';
  message: string;
  severity: 'high' | 'medium' | 'low';
  affectedDays?: number[];
  actionRequired?: string;
}

/** 准备度风险项 */
export interface ScoreRisk {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  mitigation?: string[];
  affectedPois?: string[];
}

/** 准备度分数汇总 */
export interface ScoreSummary {
  totalFindings: number;
  blockers: number;
  /** @deprecated 使用 must 替代 */
  warnings?: number;  // ⚠️ 向后兼容：应映射到 must
  /** @deprecated 使用 should 替代 */
  suggestions?: number;  // ⚠️ 向后兼容：应映射到 should
  /** ✅ 标准字段：必须项 */
  must?: number;
  /** ✅ 标准字段：建议项 */
  should?: number;
  /** ✅ 标准字段：可选项 */
  optional?: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
}

/** 准备度分数响应 */
export interface ScoreBreakdownResponse {
  tripId: string;
  score: ScoreData;
  findings: ScoreFinding[];
  risks: ScoreRisk[];
  summary: ScoreSummary;
  calculatedAt: string;
}

/** 修复选项响应 */
export interface RepairOptionsResponse {
  blockerId: string;
  blockerMessage: string;
  options: RepairOption[];
}

