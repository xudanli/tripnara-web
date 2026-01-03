/**
 * 统一的建议/洞察数据结构
 * 用于承载三人格（Abu/Dr.Dre/Neptune）的输出
 */

export type PersonaType = 'abu' | 'drdre' | 'neptune';
export type SuggestionScope = 'trip' | 'day' | 'item' | 'segment';
export type SuggestionSeverity = 'info' | 'warn' | 'blocker';
export type SuggestionStatus = 'new' | 'seen' | 'applied' | 'dismissed';

/**
 * 证据链接（Abu必须有）
 */
export interface EvidenceLink {
  id: string;
  type: 'opening_hours' | 'road_closure' | 'weather' | 'booking' | 'other';
  title: string;
  description?: string;
  link?: string;
  source?: string;
  timestamp?: string;
}

/**
 * 建议操作
 */
export interface SuggestionAction {
  id: string;
  label: string;
  type: 'apply' | 'preview' | 'dismiss' | 'snooze' | 'view_evidence' | 'adjust_rhythm' | 'view_alternatives';
  primary?: boolean;
  icon?: string;
  handler?: () => void | Promise<void>;
}

/**
 * 建议/洞察（核心数据结构）
 */
export interface Suggestion {
  id: string;
  persona: PersonaType;
  scope: SuggestionScope;
  scopeId?: string; // dayId, itemId, segmentId等
  
  severity: SuggestionSeverity;
  status: SuggestionStatus;
  
  title: string;
  summary: string;
  description?: string;
  
  // Abu必须有证据
  evidence?: EvidenceLink[];
  
  // 可执行的操作
  actions: SuggestionAction[];
  
  createdAt: string;
  updatedAt?: string;
  
  // 刷新策略：哪些事件触发重新计算
  refreshPolicy?: {
    triggers: string[]; // 'route_changed' | 'item_deleted' | 'constraint_updated' | etc.
  };
  
  // 元数据（人格特定信息）
  metadata?: {
    // Abu相关
    riskLevel?: 'high' | 'medium' | 'low';
    riskType?: string;
    affectedSegment?: string;
    
    // Dr.Dre相关
    metricType?: 'fatigue' | 'buffer' | 'time' | 'cost';
    threshold?: number;
    currentValue?: number;
    adjustmentOptions?: {
      type: 'insert_rest_day' | 'shorten_duration' | 'change_transport' | 'adjust_weight';
      params?: Record<string, any>;
    };
    
    // Neptune相关
    repairType?: 'replace' | 'reschedule' | 'remove' | 'add';
    alternatives?: Array<{
      id: string;
      name: string;
      impact: {
        timeChange?: number;
        distanceChange?: number;
        costChange?: number;
      };
    }>;
    
    [key: string]: any;
  };
}

/**
 * 建议列表响应
 */
export interface SuggestionListResponse {
  items: Suggestion[];
  total: number;
  filters?: {
    persona?: PersonaType;
    scope?: SuggestionScope;
    scopeId?: string;
    severity?: SuggestionSeverity;
  };
}

/**
 * 建议统计（用于角标数字）
 */
export interface SuggestionStats {
  tripId: string;
  byPersona: {
    abu: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    drdre: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
    neptune: {
      total: number;
      bySeverity: {
        blocker: number;
        warn: number;
        info: number;
      };
    };
  };
  byScope: {
    trip: number;
    day: Record<string, number>; // dayId -> count
    item: Record<string, number>; // itemId -> count
  };
}

/**
 * 应用建议请求
 * 注意：suggestionId 在 URL 路径中，不需要在请求体中
 */
export interface ApplySuggestionRequest {
  actionId: string;              // 要执行的操作ID（必填）
  params?: Record<string, any>;  // 操作参数（可选）
  preview?: boolean;             // 是否只是预览，不实际应用（默认false）
}

/**
 * 应用建议响应
 */
export interface ApplySuggestionResponse {
  success: boolean;
  suggestionId: string;
  appliedChanges: {
    type: string;
    description: string;
  }[];
  impact?: {
    metrics?: {
      fatigue?: number;
      buffer?: number;
      cost?: number;
    };
    risks?: Array<{
      id: string;
      severity: SuggestionSeverity;
      title: string;
    }>;
  };
  // 应用后自动触发的其他建议
  triggeredSuggestions?: string[]; // suggestion IDs
}

