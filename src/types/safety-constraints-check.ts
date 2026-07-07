/** POST /training/safety/constraints/check · ConstraintEvaluationGateway 响应 */

export const SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY = 'narrate_only' as const;
export const SAFETY_CONSTRAINT_FORMAL_AUTHORITY = 'ConstraintEvaluationGateway' as const;

export type SafetyConstraintCheckUsage =
  | typeof SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY
  | 'formal'
  | string;

export interface SafetyConstraintCheckHint {
  code?: string;
  message?: string;
  severity?: 'must_handle' | 'suggest_adjust' | 'pending_confirm' | 'warning' | string;
  constraintId?: string;
  decisionProblemId?: string;
}

/** narrate-only 与 trip constraints/check 可能共用的 check 元数据 */
export interface SafetyConstraintCheckMeta {
  usage?: SafetyConstraintCheckUsage;
  formal_authority?: string;
  formalAuthority?: string;
  /** narrate_only 下仅为叙述投影，**非**正式门禁 */
  is_blocked?: boolean;
  isBlocked?: boolean;
  /** narrate_only 下仅为叙述投影，**非**正式门禁 */
  requires_approval?: boolean;
  requiresApproval?: boolean;
  violations?: SafetyConstraintCheckHint[];
  warnings?: SafetyConstraintCheckHint[];
}

export interface SafetyConstraintsCheckResponse extends SafetyConstraintCheckMeta {
  checkedAt?: string;
}
