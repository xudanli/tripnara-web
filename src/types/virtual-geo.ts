/**
 * 虚拟地理 / 意图捕获 — 与 pareto nodes[0]、completion bundle、Booking surface 对齐
 */

export type VirtualGeoIntentCaptureMode =
  | 'PENDING'
  | 'INTENT_CAPTURED'
  | (string & {});

export interface VirtualGeoMeta {
  label?: string;
  tags?: string[];
  destination_scope?: string;
  scene_hint?: string;
  art_recovery_hint?: string;
  [key: string]: unknown;
}

/** Intake 完成包 — 后端改写的展示 label / tags */
export interface IntakeCompletionBundle {
  label?: string;
  tags?: string[];
  virtual_geo_meta?: VirtualGeoMeta;
  nodes?: unknown[];
}

export interface VirtualGeoIntentCapture {
  mode?: VirtualGeoIntentCaptureMode;
  /** 企业微信 Facilitator 跳转链接 */
  facilitator_wecom_url?: string;
  facilitator_qr_url?: string;
  guide_title?: string;
  guide_body?: string;
  corp_app_id?: string;
}
