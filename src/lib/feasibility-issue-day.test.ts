import { describe, expect, it } from 'vitest';
import {
  parseDayNumberFromIssueMessage,
  reconcileFeasibilityDayTimeline,
  resolveFeasibilityIssueDayNumber,
} from '@/lib/feasibility-issue-day';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

function issue(partial: Partial<FeasibilityIssueDto>): FeasibilityIssueDto {
  return {
    id: 'i1',
    priority: 'suggest_adjust',
    category: 'booking',
    title: 't',
    message: 'm',
    severity: 'medium',
    ...partial,
  };
}

describe('resolveFeasibilityIssueDayNumber', () => {
  const timeline = [
    { dayNumber: 7, status: 'warning' as const, issueIds: ['a'] },
    { dayNumber: 3, status: 'warning' as const, issueIds: ['b'] },
  ];

  it('prefers dayTimeline membership over wrong affectedDays', () => {
    expect(
      resolveFeasibilityIssueDayNumber(
        issue({ id: 'a', affectedDays: [3], message: '第 5 天 · POI' }),
        timeline,
      ),
    ).toBe(7);
  });

  it('falls back to message day when timeline missing', () => {
    expect(
      resolveFeasibilityIssueDayNumber(
        issue({ id: 'x', message: '建议调整：第 5 天 · 塞济斯菲厄泽' }),
        timeline,
      ),
    ).toBe(5);
  });
});

describe('reconcileFeasibilityDayTimeline', () => {
  it('adds orphan issues to timeline by affectedDays', () => {
    const issues = [
      issue({ id: 'p5', affectedDays: [5], message: '第 5 天 · A' }),
      issue({ id: 'p6', affectedDays: [6], message: '第 6 天 · B' }),
    ];
    const next = reconcileFeasibilityDayTimeline(
      [{ dayNumber: 7, status: 'warning', issueIds: ['p7'] }],
      [...issues, issue({ id: 'p7', affectedDays: [7], message: '第 7 天 · C' })],
    );
    expect(next.find((d) => d.dayNumber === 5)?.issueIds).toContain('p5');
    expect(next.find((d) => d.dayNumber === 6)?.issueIds).toContain('p6');
  });
});

describe('parseDayNumberFromIssueMessage', () => {
  it('parses chinese day prefix', () => {
    expect(parseDayNumberFromIssueMessage('建议调整：第 7 天 · Hverir')).toBe(7);
  });
});
