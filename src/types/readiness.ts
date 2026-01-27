// Readiness 相关类型定义

export type ReadinessStatus = 'ready' | 'nearly' | 'not-ready';

export type BlockerSeverity = 'critical' | 'high' | 'medium';

export type EvidenceConfidence = 'high' | 'medium' | 'low';

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

export interface EvidenceItem {
  id: string;
  category: 'road' | 'weather' | 'poi' | 'ticket' | 'lodging';
  source: string;
  timestamp: string;
  scope: string; // "Day 1" / "Segment 2" / "POI #3"
  confidence: EvidenceConfidence;
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


