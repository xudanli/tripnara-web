/** Guardian 软约束 CHOOSE 写回来源 */
export type GuardianHumanChoiceSource =
  | 'negotiation'
  | 'presentation'
  | 'team_negotiation'
  | 'optimize_judgment'
  | 'readiness_repair';

/** guardian/choose 成功后后端建议的下一步 */
export type GuardianChooseNextAction =
  | 'CONTINUE_PLANNING'
  | 'RE_RUN_NEGOTIATION'
  | 'APPLY_REPAIR'
  | 'BLOCKED';

export interface SubmitGuardianHumanChoiceInput {
  userId: string;
  tripId: string;
  source: GuardianHumanChoiceSource;
  /** 用户选中的文案 */
  selectedText: string;
  selectedIndex: number;
  /** 全部待选点（审计） */
  decisionPoints: string[];
  correlationId?: string;
  sessionId?: string;
  negotiationRunId?: string;
}

export interface SubmitGuardianHumanChoiceResult {
  feedbackId?: string;
  captureId?: string;
  /** 走专用 guardian/choose 端点时返回 */
  accepted?: boolean;
  nextAction?: GuardianChooseNextAction;
  planVersion?: number;
  decisionLogEntryId?: string;
  /** CHOOSE 后新的单主角表达（优先于旧选项列表） */
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
  /** 写回通道：guardian_choose | feedback_fallback */
  channel?: 'guardian_choose' | 'feedback_fallback';
}

export interface SubmitGuardianChooseRequest {
  source: GuardianHumanChoiceSource;
  selectedIndex: number;
  selectedText: string;
  decisionPoints: string[];
  correlationId?: string;
  sessionId?: string;
  negotiationRunId?: string;
}

export interface SubmitGuardianChooseResponse {
  accepted: boolean;
  nextAction: GuardianChooseNextAction;
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
  planVersion?: number;
  decisionLogEntryId?: string;
}

/** POST .../guardian/choose 409 — 硬约束不可覆盖 */
export class GuardianChooseBlockedError extends Error {
  readonly nextAction: GuardianChooseNextAction = 'BLOCKED';

  constructor(message = '存在不可忽略的安全/合规风险，请先修改方案后再做价值取舍') {
    super(message);
    this.name = 'GuardianChooseBlockedError';
  }
}
