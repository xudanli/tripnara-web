/** NARRATE 路段证据卡 — ui_display.leg_evidence_cards */
export type LegTravelMode = 'walk' | 'drive' | 'transit' | (string & {});

export interface LegEvidenceCard {
  leg_id?: string;
  from_label_zh?: string;
  to_label_zh?: string;
  /** 例：「步行 · 2.1km · 约 26 分钟」 */
  summary_zh: string;
  /** 避坑 / 长辈 / 坡度 / 开放时间等人话提示 */
  pitfall_tips_zh?: string[];
  travel_mode?: LegTravelMode;
  distance_km?: number;
  eta_minutes?: number;
  max_slope_pct?: number;
  slope_warning_zh?: string;
  elderly_warn_zh?: string;
  opening_hours_tip_zh?: string;
  priority?: number;
  [key: string]: unknown;
}

export interface LegEvidenceCardsPayload {
  schema?: 'tripnara.leg_evidence_cards@v1';
  cards: LegEvidenceCard[];
  headline_zh?: string;
  [key: string]: unknown;
}
