/** 约束作用范围 · 前端 SSOT（写入 value.scopeBinding + API scope） */

export type ConstraintTemporalScopeKind =
  | 'trip'
  | 'day'
  | 'day_range'
  | 'route_segment'
  | 'destination';

export type ConstraintTemporalScope =
  | { kind: 'trip' }
  | { kind: 'day'; dayNumber: number }
  | { kind: 'day_range'; dayFrom: number; dayTo: number }
  | {
      kind: 'route_segment';
      segmentId?: string;
      label?: string;
      dayNumber?: number;
      fromItemId?: string;
      toItemId?: string;
    }
  | { kind: 'destination'; destinationId?: string; label?: string };

export type ConstraintMemberScopeKind = 'all' | 'primary_driver' | 'members';

export type ConstraintMemberScope =
  | { kind: 'all' }
  | { kind: 'primary_driver'; label?: string }
  | { kind: 'members'; memberIds: string[]; labels?: string[] };

export interface ConstraintPhaseScope {
  planning: boolean;
  execution: boolean;
}

export type ConstraintActivityScopeKind = 'all' | 'activity_type';

export interface ConstraintActivityScope {
  kind: ConstraintActivityScopeKind;
  activityTypes?: string[];
  label?: string;
}

/** 完整作用范围绑定 — 避免系统默认全局应用 */
export interface ConstraintScopeBinding {
  temporal: ConstraintTemporalScope;
  member: ConstraintMemberScope;
  phase: ConstraintPhaseScope;
  activity?: ConstraintActivityScope;
}

export interface ConstraintScopeDisplayRow {
  label: string;
  value: string;
}
