import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  Clock3,
  Cloud,
  MapPin,
  Shield,
  Timer,
  Utensils,
} from 'lucide-react';

/** tripnara.planning_decision_basis@v1 — 决策依据卡 SSOT */

export type PlanningDecisionBasisFieldTone = 'good' | 'caution' | 'risk' | 'neutral' | (string & {});

export type PlanningDecisionBasisFieldIconKey =
  | 'travel_time'
  | 'buffer'
  | 'dwell'
  | 'reservation'
  | 'lunch'
  | 'validity'
  | (string & {});

export interface PlanningDecisionBasisWhatHappened {
  headline?: string;
  narrative: string;
  dayIndex?: number;
}

export interface PlanningDecisionBasisContextField {
  id: string;
  key?: string;
  label: string;
  value: string;
  subtext?: string;
  icon?: PlanningDecisionBasisFieldIconKey;
  tone?: PlanningDecisionBasisFieldTone;
}

export interface PlanningDecisionBasis {
  schema: 'tripnara.planning_decision_basis@v1' | (string & {});
  tripId: string;
  conflictId?: string;
  proposalId?: string;
  whatHappened: PlanningDecisionBasisWhatHappened;
  contextFields: PlanningDecisionBasisContextField[];
  dataValidUntil?: string;
  updatedAt?: string;
  optionCount?: number;
  refreshUrl?: string;
}

/** contextFields[].icon → Lucide */
export const DECISION_BASIS_FIELD_ICON_KEYS: Record<string, LucideIcon> = {
  travel_time: Clock3,
  buffer: Timer,
  dwell: MapPin,
  reservation: Shield,
  lunch: Utensils,
  validity: CalendarClock,
  weather: Cloud,
  default: Clock3,
};

export function resolveDecisionBasisFieldIcon(iconKey: string | undefined): LucideIcon {
  const normalized = String(iconKey ?? 'default').toLowerCase().trim();
  return DECISION_BASIS_FIELD_ICON_KEYS[normalized] ?? DECISION_BASIS_FIELD_ICON_KEYS.default!;
}

const FIELD_TONE_CLASS: Record<string, string> = {
  good: 'text-gate-allow-foreground',
  caution: 'text-gate-confirm-foreground',
  risk: 'text-gate-reject-foreground',
  neutral: 'text-foreground',
};

export function decisionBasisFieldValueClass(tone: string | undefined): string {
  return FIELD_TONE_CLASS[String(tone ?? '').toLowerCase()] ?? 'text-foreground';
}

/** 「更新于 12:43」或「3 分钟前」 */
export function formatDecisionBasisUpdatedAge(
  updatedAt: string | undefined,
  now = Date.now(),
): string | null {
  if (!updatedAt) return null;
  const parsed = Date.parse(updatedAt);
  if (!Number.isFinite(parsed)) return null;

  const diffMs = Math.max(0, now - parsed);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '刚刚更新';
  if (minutes < 60) return `更新于 ${minutes} 分钟前`;

  const date = new Date(parsed);
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `更新于 ${hours}:${mins}`;
}
