import { describe, expect, it } from 'vitest';
import {
  resolveFeasibilityGuardianPresentation,
  feasibilityGuardianSummaryLine,
} from '@/lib/feasibility-guardian-display';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

const weatherIssue: FeasibilityIssueDto = {
  id: 'issue-weather-1',
  priority: 'pending_confirm',
  category: 'environment',
  title: '天气证据待确认',
  message: '出发日天气尚未进入可靠预报窗口',
  severity: 'medium',
};

describe('resolveFeasibilityGuardianPresentation', () => {
  it('labels light weather confirm as trip-level deliberation', () => {
    const presentation = resolveFeasibilityGuardianPresentation({
      issue: weatherIssue,
      preview: {
        optionId: 'opt-1',
        option: {
          id: 'opt-1',
          label: '标记天气证据已确认',
          actionType: 'manual_confirm',
        },
        actionType: 'manual_confirm',
        status: 'ready',
        previewMode: 'heuristic',
        message: '',
        before: { highlights: [] },
        itineraryDiff: [],
        impact: { feasibilityScoreBefore: 43, estimated: false },
        after: { highlights: [] },
      },
      guardian: { personas: [{ persona: 'DR_DRE', stance: 'CAUTION', message: 'Day2 驾驶偏长' }] },
    });

    expect(presentation.scope).toBe('trip');
    expect(presentation.title).toBe('整趟行程 · 三人格合议');
    expect(presentation.scopeBadge).toBe('整趟行程');
    expect(presentation.repairFocusLabel).toBe('标记天气证据已确认');
    expect(presentation.contextHint).toContain('不等同于仅评此单条操作');
  });

  it('labels structural repair as repair-scoped', () => {
    const presentation = resolveFeasibilityGuardianPresentation({
      issue: weatherIssue,
      preview: {
        optionId: 'opt-split',
        option: {
          id: 'opt-split',
          label: '中途住宿拆段',
          actionType: 'change_hotel',
        },
        actionType: 'change_hotel',
        status: 'ready',
        previewMode: 'decision_engine_dry_run',
        message: '',
        before: { highlights: [] },
        itineraryDiff: [],
        impact: { feasibilityScoreBefore: 43, estimated: false },
        after: { highlights: [] },
      },
    });

    expect(presentation.scope).toBe('repair');
    expect(presentation.title).toBe('本方案 · 三人格评议');
  });

  it('uses backend scope when provided', () => {
    const presentation = resolveFeasibilityGuardianPresentation({
      guardian: {
        scope: 'day',
        personas: [{ persona: 'ABU', stance: 'NEUTRAL', message: '当日风大' }],
      },
    });
    expect(presentation.scope).toBe('day');
    expect(presentation.title).toContain('三人格合议');
  });
});

describe('feasibilityGuardianSummaryLine', () => {
  it('uses trip-level summary copy when scope is trip', () => {
    const line = feasibilityGuardianSummaryLine(
      { consensus: 'ALIGNED', personas: [] },
      resolveFeasibilityGuardianPresentation({ issue: weatherIssue }),
    );
    expect(line).toContain('整趟行程');
  });
});
