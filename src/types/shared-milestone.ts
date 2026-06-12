/** 共同回忆卡片情感极性 */
export type SharedMilestoneSentiment =
  | 'NEGATIVE_TRAUMA'
  | 'POSITIVE_HIGH'
  | 'NEUTRAL'
  | (string & {});

/** ui_display.shared_milestone_cards — 跨 trip 记忆，无需再解析 token */
export interface SharedMilestoneUiCard {
  card_id?: string;
  sentiment?: SharedMilestoneSentiment;
  title_zh?: string;
  summary_zh?: string;
  /** 关联地点 / 事件标签 */
  tags_zh?: string[];
  /** 发生时间或相对时间描述 */
  when_label_zh?: string;
  priority?: number;
  [key: string]: unknown;
}
