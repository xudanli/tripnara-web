import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import type {
  ConstraintScopeBinding,
  ConstraintScopeDisplayRow,
  ConstraintTemporalScope,
} from '@/types/constraint-scope';
import type { TripConstraint, TripConstraintScope } from '@/types/trip-constraints';

export const DEFAULT_CONSTRAINT_SCOPE_BINDING: ConstraintScopeBinding = {
  temporal: { kind: 'trip' },
  member: { kind: 'all' },
  phase: { planning: true, execution: true },
  activity: { kind: 'all' },
};

const TEMPORAL_KIND_LABELS: Record<ConstraintTemporalScope['kind'], string> = {
  trip: '整趟行程',
  day: '某一天',
  day_range: '连续多天',
  route_segment: '某一段路线',
  destination: '某个目的地',
};

const MEMBER_KIND_LABELS = {
  all: '全体成员',
  primary_driver: '主驾驶人',
  members: '指定成员',
} as const;

function readScopeBindingObject(value: unknown): ConstraintScopeBinding | null {
  if (!value || typeof value !== 'object') return null;
  const raw = (value as Record<string, unknown>).scopeBinding;
  if (!raw || typeof raw !== 'object') return null;
  return normalizeScopeBinding(raw as Partial<ConstraintScopeBinding>);
}

function clampDay(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.round(n));
}

export function normalizeScopeBinding(
  partial?: Partial<ConstraintScopeBinding> | null,
): ConstraintScopeBinding {
  const base = DEFAULT_CONSTRAINT_SCOPE_BINDING;
  const temporal = partial?.temporal ?? base.temporal;
  const member = partial?.member ?? base.member;
  const phase = {
    planning: partial?.phase?.planning ?? base.phase.planning,
    execution: partial?.phase?.execution ?? base.phase.execution,
  };
  const activity = partial?.activity ?? base.activity;

  let normalizedTemporal: ConstraintTemporalScope = { kind: 'trip' };
  if (temporal.kind === 'day') {
    normalizedTemporal = { kind: 'day', dayNumber: clampDay(temporal.dayNumber ?? 1) };
  } else if (temporal.kind === 'day_range') {
    const from = clampDay(temporal.dayFrom ?? 1);
    const to = clampDay(temporal.dayTo ?? from);
    normalizedTemporal = { kind: 'day_range', dayFrom: Math.min(from, to), dayTo: Math.max(from, to) };
  } else if (temporal.kind === 'route_segment') {
    normalizedTemporal = {
      kind: 'route_segment',
      segmentId: temporal.segmentId?.trim() || undefined,
      label: temporal.label?.trim() || undefined,
      dayNumber: temporal.dayNumber != null ? clampDay(temporal.dayNumber) : undefined,
      fromItemId: temporal.fromItemId?.trim() || undefined,
      toItemId: temporal.toItemId?.trim() || undefined,
    };
  } else if (temporal.kind === 'destination') {
    normalizedTemporal = {
      kind: 'destination',
      destinationId: temporal.destinationId,
      label: temporal.label?.trim() || undefined,
    };
  }

  let normalizedMember = base.member;
  if (member.kind === 'primary_driver') {
    normalizedMember = { kind: 'primary_driver', label: member.label?.trim() || '主驾驶人' };
  } else if (member.kind === 'members') {
    normalizedMember = {
      kind: 'members',
      memberIds: [...(member.memberIds ?? [])],
      labels: member.labels?.length ? [...member.labels] : undefined,
    };
  }

  return {
    temporal: normalizedTemporal,
    member: normalizedMember,
    phase,
    activity:
      activity?.kind === 'activity_type'
        ? {
            kind: 'activity_type',
            activityTypes: activity.activityTypes?.length ? [...activity.activityTypes] : undefined,
            label: activity.label?.trim() || undefined,
          }
        : { kind: 'all' },
  };
}

export function parseScopeBindingFromConstraint(
  constraint?: TripConstraint | null,
): ConstraintScopeBinding {
  if (!constraint) return { ...DEFAULT_CONSTRAINT_SCOPE_BINDING };

  const fromValue = readScopeBindingObject(constraint.value);
  if (fromValue) return fromValue;

  const scope = constraint.scope;
  if (scope?.type === 'DAY' && scope.dayIndex != null) {
    return normalizeScopeBinding({
      temporal: { kind: 'day', dayNumber: scope.dayIndex },
      member:
        scope.memberIds?.length
          ? { kind: 'members', memberIds: scope.memberIds }
          : { kind: 'all' },
    });
  }
  if (scope?.type === 'MEMBER' && scope.memberIds?.length) {
    return normalizeScopeBinding({
      member: { kind: 'members', memberIds: scope.memberIds },
    });
  }

  return { ...DEFAULT_CONSTRAINT_SCOPE_BINDING };
}

export function formatTemporalScopeLabel(temporal: ConstraintTemporalScope): string {
  switch (temporal.kind) {
    case 'trip':
      return '整趟行程';
    case 'day':
      return `第 ${temporal.dayNumber} 天`;
    case 'day_range':
      return temporal.dayFrom === temporal.dayTo
        ? `第 ${temporal.dayFrom} 天`
        : `第 ${temporal.dayFrom}—${temporal.dayTo} 天`;
    case 'route_segment': {
      const label = temporal.label?.trim();
      if (label) return `路线：${label}`;
      if (temporal.dayNumber != null) return `第 ${temporal.dayNumber} 天某段路线`;
      return '某一段路线';
    }
    case 'destination':
      return temporal.label?.trim() ? `目的地：${temporal.label.trim()}` : '某个目的地';
    default:
      return '整趟行程';
  }
}

export function formatMemberScopeLabel(member: ConstraintScopeBinding['member']): string {
  if (member.kind === 'primary_driver') return member.label?.trim() || MEMBER_KIND_LABELS.primary_driver;
  if (member.kind === 'members') {
    if (member.labels?.length) return member.labels.join('、');
    if (member.memberIds.length) return `${member.memberIds.length} 位成员`;
    return MEMBER_KIND_LABELS.members;
  }
  return MEMBER_KIND_LABELS.all;
}

export function formatPhaseScopeLabel(phase: ConstraintScopeBinding['phase']): string {
  const parts: string[] = [];
  if (phase.planning) parts.push('规划');
  if (phase.execution) parts.push('执行');
  if (!parts.length) return '未指定阶段';
  return parts.join(' + ');
}

export function formatActivityScopeLabel(activity?: ConstraintScopeBinding['activity']): string | null {
  if (!activity || activity.kind === 'all') return null;
  if (activity.label?.trim()) return activity.label.trim();
  if (activity.activityTypes?.length) return activity.activityTypes.join('、');
  return '某类活动';
}

export function formatConstraintScopeSummary(binding: ConstraintScopeBinding): string {
  const parts = [
    formatTemporalScopeLabel(binding.temporal),
    formatMemberScopeLabel(binding.member),
    formatPhaseScopeLabel(binding.phase),
  ];
  const activity = formatActivityScopeLabel(binding.activity);
  if (activity) parts.push(activity);
  return parts.join(' · ');
}

export function buildConstraintScopeDisplayRows(
  binding: ConstraintScopeBinding,
  options?: { severityLabel?: string },
): ConstraintScopeDisplayRow[] {
  const rows: ConstraintScopeDisplayRow[] = [
    { label: '时间/空间', value: formatTemporalScopeLabel(binding.temporal) },
    { label: '成员', value: formatMemberScopeLabel(binding.member) },
    { label: '阶段', value: formatPhaseScopeLabel(binding.phase) },
  ];
  const activity = formatActivityScopeLabel(binding.activity);
  if (activity) rows.push({ label: '活动', value: activity });
  if (options?.severityLabel) rows.push({ label: '严重度', value: options.severityLabel });
  return rows;
}

export function scopeBindingToApiScope(binding: ConstraintScopeBinding): TripConstraintScope {
  const { temporal, member } = binding;
  if (temporal.kind === 'day') {
    return { type: 'DAY', dayIndex: temporal.dayNumber };
  }
  if (temporal.kind === 'day_range') {
    return { type: 'DAY', dayIndex: temporal.dayFrom };
  }
  if (member.kind === 'members' && member.memberIds.length) {
    return { type: 'MEMBER', memberIds: member.memberIds };
  }
  if (member.kind === 'primary_driver') {
    return { type: 'MEMBER' };
  }
  return { type: 'TRIP' };
}

export function mergeScopeBindingIntoValue(
  value: unknown,
  binding: ConstraintScopeBinding,
): Record<string, unknown> {
  const base =
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : value != null
        ? { value }
        : {};
  return {
    ...base,
    scopeBinding: binding,
  };
}

export function readScopeBindingFromDraft(draft: ConstraintEditorDraft): ConstraintScopeBinding {
  return normalizeScopeBinding(draft.scopeBinding);
}

export function severityLabelFromDraftType(type: ConstraintEditorDraft['type']): string {
  return type === 'HARD' ? '硬约束' : '软偏好';
}

export function temporalKindOptions(): Array<{ value: ConstraintTemporalScope['kind']; label: string }> {
  return (Object.keys(TEMPORAL_KIND_LABELS) as ConstraintTemporalScope['kind'][]).map((value) => ({
    value,
    label: TEMPORAL_KIND_LABELS[value],
  }));
}
