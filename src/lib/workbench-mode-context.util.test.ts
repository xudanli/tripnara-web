import { describe, expect, it } from 'vitest';
import {
  buildWorkbenchModeBarViewModel,
  clearDecisionSpaceSearchParams,
  resolveConstraintUiLabel,
  resolveDecisionSpaceFocusTitle,
  resolveWorkbenchMode,
} from './workbench-mode-context.util';

describe('workbench-mode-context.util', () => {
  it('resolveWorkbenchMode prioritizes decision space', () => {
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: true,
        constraintConsoleOpen: true,
        attractionExploreOpen: true,
        arrangeItineraryOpen: true,
      }),
    ).toBe('decision_space');
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: false,
        constraintConsoleOpen: false,
        arrangeItineraryOpen: true,
        attractionExploreOpen: true,
      }),
    ).toBe('arrange_itinerary');
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: false,
        constraintConsoleOpen: false,
        attractionExploreOpen: true,
      }),
    ).toBe('attraction_explore');
    expect(
      resolveWorkbenchMode({ decisionSpaceOpen: false, constraintConsoleOpen: true }),
    ).toBe('constraint_edit');
    expect(
      resolveWorkbenchMode({ decisionSpaceOpen: false, constraintConsoleOpen: false }),
    ).toBe('browse');
  });

  it('buildWorkbenchModeBarViewModel builds attraction explore context', () => {
    const model = buildWorkbenchModeBarViewModel({
      mode: 'attraction_explore',
    });
    expect(model?.modeLabel).toBe('正在探索景点');
    expect(model?.focusTitle).toBe('发现与筛选候选景点');
  });

  it('buildWorkbenchModeBarViewModel builds arrange itinerary context', () => {
    const model = buildWorkbenchModeBarViewModel({
      mode: 'arrange_itinerary',
    });
    expect(model?.modeLabel).toBe('正在编排行程');
    expect(model?.focusTitle).toBe('把候选景点排进日程');
  });

  it('buildWorkbenchModeBarViewModel returns null in browse mode', () => {
    expect(
      buildWorkbenchModeBarViewModel({
        mode: 'browse',
      }),
    ).toBeNull();
  });

  it('buildWorkbenchModeBarViewModel returns null in constraint_edit (drawer chrome)', () => {
    expect(
      buildWorkbenchModeBarViewModel({
        mode: 'constraint_edit',
        constraintLabel: '每日驾驶上限',
        hasUnsavedConstraintDraft: true,
      }),
    ).toBeNull();
  });

  it('buildWorkbenchModeBarViewModel uses decision resolution phase', () => {
    const model = buildWorkbenchModeBarViewModel({
      mode: 'decision_space',
      problem: { id: 'p1', title: '交通缓冲偏紧' } as never,
      decisionResolutionPhase: 'apply',
    });
    expect(model?.decisionResolutionPhase).toBe('apply');
  });

  it('resolveDecisionSpaceFocusTitle includes day prefix', () => {
    expect(
      resolveDecisionSpaceFocusTitle({
        problem: { id: 'p1', title: '交通缓冲偏紧' } as never,
        dayIndex: 2,
      }),
    ).toBe('Day 3 · 交通缓冲偏紧');
  });

  it('resolveConstraintUiLabel resolves travel goals', () => {
    expect(resolveConstraintUiLabel('__travel_goals__')).toBe('旅行目标');
    expect(resolveConstraintUiLabel('daily_drive')).toBe('每日最大驾驶时长');
  });

  it('clearDecisionSpaceSearchParams removes decision space query keys', () => {
    const params = new URLSearchParams(
      'tab=schedule&decisionSpace=1&conflictId=c1&problemId=p1&from=travel',
    );
    clearDecisionSpaceSearchParams(params);
    expect(params.get('decisionSpace')).toBeNull();
    expect(params.get('conflictId')).toBeNull();
    expect(params.get('problemId')).toBeNull();
    expect(params.get('from')).toBe('travel');
    expect(params.get('tab')).toBe('schedule');
  });
});
