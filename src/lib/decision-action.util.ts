import type { DecisionAction, DecisionWriteChain } from '@/types/unified-decision';
import type { DecisionOption } from '@/types/decision-problem';
import { filterUiDecisionActions } from '@/lib/decision-action-visibility.util';
import {
  parseDecisionNavigationTarget,
  type DecisionNavigationTarget,
} from '@/lib/decision-navigation.util';

export type { DecisionNavigationTarget };
export { parseDecisionNavigationTarget, resolveDecisionActionExternalUrl, openDecisionActionExternalUrl } from '@/lib/decision-navigation.util';
export { filterUiDecisionActions, partitionDecisionActionsForUi } from '@/lib/decision-action-visibility.util';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function normalizeDecisionAction(raw: unknown): DecisionAction | null {
  const record = asRecord(raw);
  if (!record) return null;

  const actionId = String(record.actionId ?? record.id ?? record.action_id ?? '').trim();
  if (!actionId) return null;

  const label = String(record.label ?? record.title ?? actionId).trim();
  const title = typeof record.title === 'string' ? record.title.trim() : undefined;
  const summary =
    typeof record.summary === 'string'
      ? record.summary
      : typeof record.description === 'string'
        ? record.description
        : undefined;
  const blockedReason =
    typeof record.blockedReason === 'string'
      ? record.blockedReason
      : typeof record.blocked_reason === 'string'
        ? record.blocked_reason
        : null;
  const allowed =
    record.allowed === false || record.allowed === 'false'
      ? false
      : record.allowed === true || record.allowed === 'true'
        ? true
        : !blockedReason;

  return {
    actionId,
    title: title || label,
    label,
    summary,
    description:
      typeof record.description === 'string' ? record.description : summary,
    allowed,
    blockedReason,
    source:
      typeof record.source === 'string'
        ? record.source
        : typeof record.optionSource === 'string'
          ? record.optionSource
          : undefined,
    expectedImpact:
      typeof record.expectedImpact === 'string'
        ? record.expectedImpact
        : typeof record.expected_impact === 'string'
          ? record.expected_impact
          : undefined,
    navigationTarget: (() => {
      const raw = record.navigationTarget ?? record.navigation_target;
      if (raw == null) return undefined;
      const parsed = parseDecisionNavigationTarget(raw);
      if (parsed) return parsed;
      return typeof raw === 'string' ? { command: raw } : undefined;
    })(),
    kind: typeof record.kind === 'string' ? record.kind : undefined,
    payload: asRecord(record.payload) ?? undefined,
    origin:
      typeof record.origin === 'string'
        ? record.origin
        : typeof record.detectedBy === 'string'
          ? record.detectedBy
          : undefined,
    detectors: Array.isArray(record.detectors)
      ? record.detectors.map((d) => String(d).trim()).filter(Boolean)
      : undefined,
  };
}

export function normalizeDecisionActions(raw: unknown): DecisionAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeDecisionAction).filter((a): a is DecisionAction => a != null);
}

/** resolutions 写路径：优先 actionId，兼容 payload.optionId */
export function resolveDecisionActionId(
  action: Pick<DecisionAction, 'actionId' | 'payload'> | null | undefined,
): string | null {
  if (!action) return null;
  const direct = action.actionId?.trim();
  if (direct) return direct;
  const payload = action.payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const fromPayload = String(record.optionId ?? record.actionId ?? record.option_id ?? '').trim();
    if (fromPayload) return fromPayload;
  }
  return null;
}

/** 选项卡 id 可能与 detail.actions[].actionId 不同（payload.optionId） */
export function findDecisionActionForSelection(
  actions: DecisionAction[],
  selectionId: string | null | undefined,
): DecisionAction | null {
  const id = selectionId?.trim();
  if (!id) return null;
  const direct = actions.find((action) => action.actionId === id);
  if (direct) return direct;
  return (
    actions.find((action) => {
      const payload = action.payload;
      if (!payload || typeof payload !== 'object') return false;
      const record = payload as Record<string, unknown>;
      return String(record.optionId ?? record.option_id ?? '') === id;
    }) ?? null
  );
}

/** Legacy options[] → actions[]（过渡；优先读后端 actions） */
export function mapOptionsToDecisionActions(
  options: DecisionOption[] | undefined,
  writeChain: DecisionWriteChain,
): DecisionAction[] {
  if (!options?.length) return [];

  const defaultKind = writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' ? 'evaluate' : 'apply_decision';

  return options.map((opt) => ({
    actionId: opt.id,
    label: opt.label ?? opt.title ?? opt.id,
    description: opt.description,
    allowed: opt.executable !== false,
    blockedReason: opt.executable === false ? '当前不可执行' : null,
    kind: defaultKind,
    payload: { optionId: opt.id },
  }));
}

export function resolveDetailActions(input: {
  actions?: DecisionAction[];
  options?: DecisionOption[];
  writeChain?: DecisionWriteChain;
  /** 默认 false — 灰卡不进 UI（FE-SSOT-4） */
  includeSuppressed?: boolean;
}): DecisionAction[] {
  let resolved: DecisionAction[];
  if (input.actions?.length) {
    resolved = input.actions;
  } else {
    resolved = mapOptionsToDecisionActions(input.options, input.writeChain ?? 'APPLY_AND_POLL');
  }
  return input.includeSuppressed ? resolved : filterUiDecisionActions(resolved);
}
