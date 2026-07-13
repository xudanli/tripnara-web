import { describe, expect, it } from 'vitest';
import {
  buildConstraintScopeDisplayRows,
  formatConstraintScopeSummary,
  mergeScopeBindingIntoValue,
  normalizeScopeBinding,
  parseScopeBindingFromConstraint,
  scopeBindingToApiScope,
} from './constraint-scope.util';

describe('constraint-scope.util', () => {
  it('formats day range + primary driver + phases example', () => {
    const binding = normalizeScopeBinding({
      temporal: { kind: 'day_range', dayFrom: 2, dayTo: 5 },
      member: { kind: 'primary_driver', label: '主驾驶人' },
      phase: { planning: true, execution: true },
      activity: { kind: 'activity_type', label: '驾驶' },
    });
    expect(formatConstraintScopeSummary(binding)).toContain('第 2—5 天');
    expect(formatConstraintScopeSummary(binding)).toContain('主驾驶人');
    expect(formatConstraintScopeSummary(binding)).toContain('规划 + 执行');
    const rows = buildConstraintScopeDisplayRows(binding, { severityLabel: '硬约束' });
    expect(rows.some((r) => r.label === '严重度' && r.value === '硬约束')).toBe(true);
  });

  it('parses scopeBinding from constraint value', () => {
    const binding = parseScopeBindingFromConstraint({
      id: 'c_tpl_x',
      name: 'x',
      type: 'HARD',
      value: {
        scopeBinding: {
          temporal: { kind: 'day_range', dayFrom: 2, dayTo: 5 },
          member: { kind: 'primary_driver' },
          phase: { planning: true, execution: true },
        },
      },
    });
    expect(binding.temporal).toEqual({ kind: 'day_range', dayFrom: 2, dayTo: 5 });
    expect(binding.member.kind).toBe('primary_driver');
  });

  it('maps binding to API scope and embeds in value', () => {
    const binding = normalizeScopeBinding({
      temporal: { kind: 'day', dayNumber: 3 },
      member: { kind: 'all' },
      phase: { planning: true, execution: false },
    });
    expect(scopeBindingToApiScope(binding)).toEqual({ type: 'DAY', dayIndex: 3 });
    const value = mergeScopeBindingIntoValue({ hours: 4 }, binding);
    expect((value as { scopeBinding: unknown }).scopeBinding).toBeTruthy();
  });

  it('maps route_segment binding to ROUTE_SEGMENT API scope', () => {
    const binding = normalizeScopeBinding({
      temporal: {
        kind: 'route_segment',
        segmentId: 'from__to',
        dayNumber: 1,
        fromItemId: 'from',
        toItemId: 'to',
        label: 'D1 A → B',
      },
      member: { kind: 'all' },
      phase: { planning: true, execution: true },
    });
    expect(scopeBindingToApiScope(binding)).toEqual({
      type: 'ROUTE_SEGMENT',
      segmentId: 'from__to',
      fromItemId: 'from',
      toItemId: 'to',
      dayIndex: 1,
    });
  });

  it('parses ROUTE_SEGMENT scope from API constraint', () => {
    const binding = parseScopeBindingFromConstraint({
      id: 'c_tpl_no_unpaved_road',
      name: '不走未铺装道路',
      type: 'HARD',
      scope: {
        type: 'ROUTE_SEGMENT',
        segmentId: 'a__b',
        fromItemId: 'a',
        toItemId: 'b',
        dayIndex: 2,
      },
    });
    expect(binding.temporal).toEqual({
      kind: 'route_segment',
      segmentId: 'a__b',
      label: undefined,
      dayNumber: 2,
      fromItemId: 'a',
      toItemId: 'b',
    });
  });

  it('derives route segment id from from/to item ids on parse', () => {
    const binding = parseScopeBindingFromConstraint({
      id: 'c_tpl_x',
      name: 'x',
      type: 'HARD',
      scope: { type: 'ROUTE_SEGMENT', fromItemId: 'a', toItemId: 'b', dayIndex: 1 },
    });
    expect(binding.temporal).toMatchObject({
      kind: 'route_segment',
      segmentId: 'a__b',
      fromItemId: 'a',
      toItemId: 'b',
      dayNumber: 1,
    });
  });
});
