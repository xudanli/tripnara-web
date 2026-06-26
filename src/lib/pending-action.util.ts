/** L1 待确认动作 — actionExecution.pendingActions */

export interface PendingActionChip {
  id: string;
  label: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  verb?: string;
  status?: string;
  userConfirmationRequired?: string[];
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function normalizePendingAction(raw: unknown, index: number): PendingActionChip | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const label = String(
    o.label ??
      o.message ??
      o.description ??
      o.title ??
      o.verb ??
      o.action_type ??
      o.actionType ??
      ''
  ).trim();
  if (!label) return null;

  return {
    id: String(o.id ?? o.action_id ?? o.actionId ?? `pending-action-${index}`),
    label,
    riskLevel:
      o.risk_level != null
        ? String(o.risk_level)
        : o.riskLevel != null
          ? String(o.riskLevel)
          : undefined,
    verb: o.verb != null ? String(o.verb) : undefined,
    status: o.status != null ? String(o.status) : undefined,
    userConfirmationRequired: parseStringArray(
      o.userConfirmationRequired ?? o.user_confirmation_required
    ),
  };
}

export function normalizePendingActions(raw: unknown): PendingActionChip[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizePendingAction(item, index))
    .filter((item): item is PendingActionChip => item != null);
}
