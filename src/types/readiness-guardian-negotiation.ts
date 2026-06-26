/** 修复抽屉三人格博弈 — 与 POST /readiness/repair-options 的 guardianNegotiation 对齐 */

export type GuardianNegotiationPersona = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export type GuardianNegotiationStance =
  | 'SUPPORT'
  | 'CAUTION'
  | 'OPPOSE'
  | 'NEUTRAL';

export type GuardianNegotiationConsensus = 'ALIGNED' | 'SPLIT' | 'BLOCKED';

/** 三人格合议的评议范围（后端可选下发） */
export type GuardianNegotiationScope = 'trip' | 'day' | 'repair';

export interface GuardianNegotiationPersonaView {
  persona: GuardianNegotiationPersona;
  stance: GuardianNegotiationStance;
  /** 对该修复方向的主观点（中文） */
  message: string;
  suggestion?: string;
  highlights?: string[];
}

/** 三人格对当前 blocker / 修复方案 / 行程的共识视图 */
export interface GuardianNegotiationResult {
  /** 评议范围：未下发时前端按修复类型推断 */
  scope?: GuardianNegotiationScope;
  consensus?: GuardianNegotiationConsensus;
  summary?: string;
  personas: GuardianNegotiationPersonaView[];
  userActionRequired?: string[];
  analyzedAt?: string;
}
