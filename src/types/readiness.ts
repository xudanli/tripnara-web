// Readiness 相关类型定义

export type ReadinessStatus = 'ready' | 'nearly' | 'not-ready';

export type BlockerSeverity = 'critical' | 'high' | 'medium';

export type EvidenceConfidence = 'high' | 'medium' | 'low' | {
  score: number; // 置信度分数（0-1）
  level: 'HIGH' | 'MEDIUM' | 'LOW'; // 置信度等级
  factors: string[]; // 影响置信度的因素列表
};

export interface ReadinessScore {
  overall: number; // 0-100
  evidenceCoverage: number;
  scheduleFeasibility: number;
  transportCertainty: number;
  safetyRisk: number;
  buffers: number;
}

export interface Blocker {
  id: string;
  title: string;
  severity: BlockerSeverity;
  impactScope: string; // "Day 1" / "Segment 2" / "POI #3"
  evidenceSummary: {
    source: string; // "road.is" / "opening hours" / "forecast"
    timestamp: string;
  };
  category: 'road' | 'weather' | 'poi' | 'ticket' | 'lodging' | 'other';
}

export interface RepairOption {
  id: string;
  title: string;
  description: string;
  cost?: number;                                    // 预估费用（可选）
  impact: 'high' | 'medium' | 'low';               // 影响程度
  timeEstimate?: string;                           // 预估耗时
  actionType?: RepairActionType;                   // 操作类型
  // 旧字段（兼容）
  changes?: {
    time?: string; // "+30min" / "-15min"
    distance?: string; // "+12km" / "-5km"
    elevation?: string; // "+200m" / "-100m"
    risk?: string; // "下降" / "上升"
  };
  reasonCode?: string;
  evidenceLink?: string;
}

/** 修复操作类型 */
export type RepairActionType = 
  | 'adjust_time'       // 调整行程项时间
  | 'fetch_weather'     // 查询天气预报
  | 'check_road'        // 查询道路状况
  | 'check_hours'       // 确认营业时间
  | 'manual_confirm'    // 手动标记已确认
  | 'reorder_pois'      // 调整行程顺序
  | 'move_to_day'       // 移动到其他天
  | 'remove_pois'       // 减少景点数量
  | 'book_transport'    // 预订交通
  | 'change_hotel'      // 更换酒店
  | 'buy_insurance';    // 购买旅行保险

export type EvidenceStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface EvidenceItem {
  id: string;
  category: 'road' | 'weather' | 'poi' | 'ticket' | 'lodging';
  source: string;
  timestamp: string;
  scope: string; // "Day 1" / "Segment 2" / "POI #3"
  confidence: EvidenceConfidence;
  status?: EvidenceStatus; // 证据状态
  userNote?: string; // 用户备注（最大500字符）
  updatedAt?: string; // 最后更新时间
  // 🆕 证据的标题和描述（用于区分不同的证据项）
  title?: string; // 证据标题
  description?: string; // 证据描述
  link?: string; // 证据来源链接
  poiId?: string; // 关联的 POI ID
  day?: number; // 关联的日期（1-based）
  // 🆕 P0修复：证据增强字段（v1.2.0）
  freshness?: {
    fetchedAt: string; // 获取时间（ISO 8601 格式）
    expiresAt?: string; // 过期时间（ISO 8601 格式）
    freshnessStatus: 'FRESH' | 'STALE' | 'EXPIRED'; // 时效性状态
    recommendedRefreshAt?: string; // 建议刷新时间（ISO 8601 格式）
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

export interface ReadinessData {
  status: ReadinessStatus;
  score: ReadinessScore;
  executableWindow?: {
    start: string; // "08:30"
    end: string; // "18:00"
  };
  blockers: Blocker[];
  watchlist?: Blocker[]; // Ready 状态时显示潜在风险
  repairOptions?: RepairOption[]; // 当前选中的 blocker 的修复方案
  selectedBlockerId?: string;
}


