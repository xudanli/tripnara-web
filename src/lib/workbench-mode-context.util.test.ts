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
        itineraryDiagnosisOpen: true,
      }),
    ).toBe('decision_space');
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: false,
        constraintConsoleOpen: false,
        attractionExploreOpen: true,
        arrangeItineraryOpen: true,
      }),
    ).toBe('attraction_explore');
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: false,
        constraintConsoleOpen: false,
        attractionExploreOpen: false,
        itineraryDiagnosisOpen: true,
        arrangeItineraryOpen: true,
      }),
    ).toBe('itinerary_diagnosis');
    expect(
      resolveWorkbenchMode({
        decisionSpaceOpen: false,
        constraintConsoleOpen: false,
        attractionExploreOpen: false,
        arrangeItineraryOpen: true,
      }),
    ).toBe('arrange_itinerary');
    expect(
      resolveWorkbenchMode({ decisionSpaceOpen: false, constraintConsoleOpen: true }),
    ).toBe('constraint_edit');
    expect(
      resolveWorkbenchMode({ decisionSpaceOpen: false, constraintConsoleOpen: false }),
    ).toBe('browse');
  });

  it('buildWorkbenchModeBarViewModel builds itinerary diagnosis context', () => {
    const model = buildWorkbenchModeBarViewModel({
      mode: 'itinerary_diagnosis',
    });
    expect(model?.modeLabel).toBe('行程诊断');
    expect(model?.backLabel).toBe('返回编排行程');
  });

  it('buildWorkbenchModeBarViewModel returns null in arrange itinerary home', () => {
    expect(
      buildWorkbenchModeBarViewModel({
        mode: 'arrange_itinerary',
      }),
    ).toBeNull();
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
