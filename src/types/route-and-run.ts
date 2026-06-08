/**
 * route_and_run 澄清 / 三人格门禁 相关 DTO（与后端 payload.clarificationQuestions[].metadata 对齐）
 */

import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import type { RouteAndRunResponse } from '@/api/agent';

export type DebateFeasibilityVerdict = 'INFEASIBLE' | 'NEEDS_TRADEOFF' | 'FEASIBLE_WITH_CHANGES';

export interface UserIntentFeasibilityMeta {
  echo_zh: string;
  verdict: DebateFeasibilityVerdict;
  summary_zh: string;
}

export interface GuardianDebateQuestionMeta {
  presentation?: 'structured_debate_v1';
  source?: 'guardian_debate_user_confirm' | 'guardian_debate_peak_season' | 'guardian_debate_froad_2wd';
  gate_result?: string;
  show_user_intent_feasibility?: boolean;
  user_intent_feasibility?: UserIntentFeasibilityMeta;
  structured_clarification?: {
    type?: string;
    constraints_discovered?: { route_type?: string; risk_warnings?: string[] };
    suggested_operations?: Array<{ action: string; label: string }>;
  };
  vehicle_type_specified?: boolean;
  [key: string]: unknown;
}

export type ClarificationRendererKind =
  | 'guardian_debate'
  | 'peak_season'
  | 'froad'
  | 'structured_intake'
  | 'generic';

export const VERDICT_UI: Record<
  DebateFeasibilityVerdict,
  { label: string; tone: 'error' | 'warning' | 'info' }
> = {
  INFEASIBLE: { label: '按当前诉求不可行', tone: 'error' },
  NEEDS_TRADEOFF: { label: '需取舍后才能继续', tone: 'warning' },
  FEASIBLE_WITH_CHANGES: { label: '调整后可继续', tone: 'info' },
};

export type RouteAndRunClarifySubmit = {
  message: string;
  clarification_answers: ClarificationAnswer[];
  structured_travel_input?: import('@/api/agent').StructuredTravelInput;
};

export type { ClarificationQuestion, ClarificationAnswer, RouteAndRunResponse };
