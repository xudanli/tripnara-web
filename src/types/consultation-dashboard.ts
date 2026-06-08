/**
 * payload.consultation_dashboard — 咨询类结构化可视化（与后端 JSON 对齐，字段均可选）
 */

export type ConsultationRiskLevel = 'low' | 'medium' | 'high' | string;

export type ConsultationSummaryTone = 'neutral' | 'positive' | 'warning' | 'danger' | string;

export interface ConsultationScoreDimension {
  label: string;
  /** 展示用文案，如「高」「极高」 */
  score_label?: string;
  level?: ConsultationRiskLevel;
  /** 0–100，可选用于横向条 */
  value?: number;
}

export interface ConsultationSummaryCard {
  title: string;
  body: string;
  tone?: ConsultationSummaryTone;
}

export interface ConsultationMapNode {
  lng: number;
  lat: number;
  label?: string;
  /** hotel | scenic | risk | fuel | ... */
  kind?: string;
}

export interface ConsultationMapPayload {
  /** [[lng, lat], ...] 路线折线 */
  path_coordinates?: [number, number][] | number[][];
  nodes?: ConsultationMapNode[];
  center?: { lng: number; lat: number };
  zoom?: number;
}

export interface ConsultationRiskItem {
  title: string;
  level?: ConsultationRiskLevel;
  summary?: string;
  details?: string[];
  suggestions?: string[];
}

export interface ConsultationDaySegment {
  time?: string;
  label: string;
  detail?: string;
  risk?: boolean;
}

export interface ConsultationDailyPlanDay {
  day_index?: number;
  title?: string;
  subtitle?: string;
  segments?: ConsultationDaySegment[];
}

export interface ConsultationBudgetBreakdownItem {
  label: string;
  /** 占比 0–1 或 0–100，前端归一化 */
  share?: number;
  amount?: number;
}

export interface ConsultationBudgetPayload {
  currency?: string;
  total_range_label?: string;
  breakdown?: ConsultationBudgetBreakdownItem[];
}

export interface ConsultationBookingDeadline {
  item: string;
  deadline: string;
  urgency?: string;
  cta_label?: string;
  cta_url?: string;
}

/** 顶层 dashboard（嵌于 payload.consultation_dashboard） */
export interface ConsultationDashboardPayload {
  /**
   * 来源：`fallback` 表示由快捷操作等前端/路由生成的结构化摘要，非完整模型输出；
   * 用于与主模型咨询结果区分。
   */
  dashboard_origin?: 'fallback' | string;
  headline?: string;
  subheadline?: string;
  score_dimensions?: ConsultationScoreDimension[];
  summary_cards?: ConsultationSummaryCard[];
  map?: ConsultationMapPayload;
  risks?: ConsultationRiskItem[];
  daily_plan?: ConsultationDailyPlanDay[];
  budget?: ConsultationBudgetPayload;
  booking_deadlines?: ConsultationBookingDeadline[];
  /** 主按钮文案；常与 suggested_operations 第一条联动 */
  primary_cta_label?: string;
}
