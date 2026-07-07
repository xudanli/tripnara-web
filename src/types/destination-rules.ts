/** 目的地规则 · 约束控制台只读层（官方数据 + 目的地包） */

/** 五类目的地规则 */
export type DestinationRuleCategory =
  | 'TRAFFIC'
  | 'NATURAL_RISK'
  | 'VENUE_ACCESS'
  | 'REGULATION'
  | 'SERVICE_AVAILABILITY'
  | string;

/**
 * 规则强度
 * - BLOCK：不可突破，直接阻断
 * - CONDITIONAL：条件满足才可执行
 * - ADVISORY：建议性，影响评分与排序
 */
export type DestinationRuleTier = 'BLOCK' | 'CONDITIONAL' | 'ADVISORY' | string;

export type DestinationRuleEvidenceStatus = 'VERIFIED' | 'OUTDATED' | 'PENDING' | 'UNKNOWN' | string;

export interface DestinationRuleMetadata {
  category: DestinationRuleCategory;
  categoryLabel: string;
  tier: DestinationRuleTier;
  tierLabel: string;
  /** 例：冰岛道路管理部门 */
  sourceLabel: string;
  /** 例：高地道路 / 整趟行程 */
  scopeLabel: string;
  /** 判定条件（人话） */
  judgmentRule: string;
  /** 违反结果（人话） */
  violationLabel: string;
  evidenceStatus: DestinationRuleEvidenceStatus;
  evidenceStatusLabel: string;
  /** 对当前行程的影响摘要 */
  tripImpact?: string;
  /** 是否触发阻断（与 tier=BLOCK 或 hasConflict 对齐） */
  blocksExecution: boolean;
  /** 用户能否设置更保守（建议型可 true，官方硬规则 false） */
  canSetMoreConservative: boolean;
  /** 始终 false — 不可编辑/关闭 */
  editable: false;
}
