import type {
  ActionExecutionPreviewPayload,
  ActionExecutionPayload,
  AgentActionPreviewResponseBody,
  OrchestrationResult,
} from '@/api/agent';

export function pickActionExecutionPreviewFromPayload(
  payload: Record<string, unknown> | undefined
): ActionExecutionPreviewPayload | undefined {
  if (!payload) return undefined;
  const raw = payload.actionExecutionPreview ?? payload.action_execution_preview;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ActionExecutionPreviewPayload;
  }
  return undefined;
}

export function pickActionExecutionFromPayload(
  payload: Record<string, unknown> | undefined
): ActionExecutionPayload | undefined {
  if (!payload) return undefined;
  const raw = payload.actionExecution ?? payload.action_execution;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ActionExecutionPayload;
  }
  return undefined;
}

/**
 * 在 orchestrationResult.itinerary.action_plan 中按 action_id 将 action_input **整份**替换为 healed（不做浅合并）。
 */
export function applyHealedInputToOrchestrationActionPlan(
  orchestrationResult: OrchestrationResult | undefined | null,
  actionId: string,
  healed_action_input: Record<string, unknown>
): OrchestrationResult | undefined {
  if (!orchestrationResult) return undefined;
  const clone = JSON.parse(JSON.stringify(orchestrationResult)) as OrchestrationResult;
  const plan = clone.itinerary?.action_plan;
  if (!Array.isArray(plan)) return clone;
  const healed = JSON.parse(JSON.stringify(healed_action_input)) as Record<string, unknown>;
  for (let i = 0; i < plan.length; i++) {
    const row = plan[i] as Record<string, unknown>;
    if (String(row.action_id ?? '') === actionId) {
      row.action_input = healed;
      break;
    }
  }
  return clone;
}

/**
 * 自更新后的 orchestration 构建 POST /agent/actions/preview 的 actions[]。
 */
export function buildAgentPreviewActionsFromOrchestration(
  orchestrationResult: OrchestrationResult | undefined | null
): Array<{ action_id: string; action_input: Record<string, unknown> }> {
  const plan = orchestrationResult?.itinerary?.action_plan;
  if (!Array.isArray(plan)) return [];
  const out: Array<{ action_id: string; action_input: Record<string, unknown> }> = [];
  for (const p of plan) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    const aid = r.action_id;
    const input = r.action_input;
    if (typeof aid === 'string' && aid && input && typeof input === 'object' && !Array.isArray(input)) {
      out.push({ action_id: aid, action_input: input as Record<string, unknown> });
    }
  }
  return out;
}

export function newAgentPreviewRequestId(): string {
  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function extractActionExecutionPreviewFromAgentPreviewResponse(
  data: AgentActionPreviewResponseBody | Record<string, unknown> | undefined
): ActionExecutionPreviewPayload | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  if (o.actionExecutionPreview && typeof o.actionExecutionPreview === 'object') {
    return o.actionExecutionPreview as ActionExecutionPreviewPayload;
  }
  if (Array.isArray(o.action_previews)) {
    return {
      status: typeof o.status === 'string' ? o.status : 'OK',
      action_previews: o.action_previews as ActionExecutionPreviewPayload['action_previews'],
      context_signature: typeof o.context_signature === 'string' ? o.context_signature : undefined,
      message: typeof o.message === 'string' ? o.message : undefined,
    };
  }
  return undefined;
}
