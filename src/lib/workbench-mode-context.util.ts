import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { DecisionResolutionCtaPhase } from '@/lib/decision-resolution.util';
import { getHardConstraintTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import { TRAVEL_GOALS_SECTION_ID } from '@/lib/travel-goals.util';
import { selectionIdToSectionKey } from '@/lib/trip-constraints-contract.util';

export type WorkbenchMode =
  | 'browse'
  | 'itinerary_diagnosis'
  | 'decision_space'
  | 'constraint_edit'
  | 'attraction_explore'
  | 'arrange_itinerary';

/** 离开决策空间时从 URL 移除的子模式 query keys */
export function clearDecisionSpaceSearchParams(params: URLSearchParams): void {
  params.delete('decisionSpace');
  params.delete('conflictId');
  params.delete('problemId');
}

/** 离开探索景点时从 URL 移除的 query keys */
export function clearAttractionExploreSearchParams(params: URLSearchParams): void {
  params.delete('attractionExplore');
}

/** 离开编排行程时从 URL 移除的 query keys */
export function clearArrangeItinerarySearchParams(params: URLSearchParams): void {
  params.delete('arrangeItinerary');
  params.delete('arrangeAutoArrange');
}

/** 离开行程诊断时从 URL 移除的 query keys */
export function clearItineraryDiagnosisSearchParams(params: URLSearchParams): void {
  params.delete('itineraryDiagnosis');
}

export const ARRANGE_AUTO_ARRANGE_SEARCH_PARAM = 'arrangeAutoArrange';

export function resolveWorkbenchMode(input: {
  decisionSpaceOpen: boolean;
  constraintConsoleOpen: boolean;
  attractionExploreOpen?: boolean;
  arrangeItineraryOpen?: boolean;
  itineraryDiagnosisOpen?: boolean;
}): WorkbenchMode {
  if (input.decisionSpaceOpen) return 'decision_space';
  if (input.attractionExploreOpen) return 'attraction_explore';
  if (input.itineraryDiagnosisOpen) return 'itinerary_diagnosis';
  if (input.arrangeItineraryOpen) return 'arrange_itinerary';
  if (input.constraintConsoleOpen) return 'constraint_edit';
  return 'browse';
}

export function resolveDecisionSpaceFocusTitle(input: {
  conflict?: PlanningConflictItem | null;
  problem?: DecisionProblemSummary | null;
  dayIndex?: number | null;
}): string {
  const dayPrefix =
    typeof input.dayIndex === 'number' && input.dayIndex >= 0
      ? `Day ${input.dayIndex + 1} · `
      : '';
  const title =
    input.problem?.title?.trim() ||
    input.conflict?.title?.trim() ||
    input.conflict?.message?.trim() ||
    '待处理决策';
  return `${dayPrefix}${title}`;
}

export function resolveConstraintFocusTitle(constraintLabel?: string | null): string {
  return constraintLabel?.trim() || '行程约束';
}

export function resolveConstraintUiLabel(selectedId: string | null | undefined): string | null {
  if (!selectedId) return null;
  if (selectedId === TRAVEL_GOALS_SECTION_ID) return '旅行目标';
  const sectionKey = selectionIdToSectionKey(selectedId);
  if (sectionKey === 'team') return '团队成员';
  if (sectionKey === 'risk') return '风险与文化策略';
  if (sectionKey === 'change_strategy') return '变更策略';
  if (sectionKey === 'automation') return '自动化';
  const template = getHardConstraintTemplate(selectedId);
  return template?.label ?? null;
}

export interface WorkbenchModeBarViewModel {
  mode: WorkbenchMode;
  backLabel: string;
  modeLabel: string;
  focusTitle: string;
  /** 与 DecisionResolutionStepBar 共用 phase（决策空间） */
  decisionResolutionPhase?: DecisionResolutionCtaPhase;
  hasUnsavedConstraintDraft?: boolean;
}

export function buildWorkbenchModeBarViewModel(input: {
  mode: WorkbenchMode;
  fromTravelOverview?: boolean;
  conflict?: PlanningConflictItem | null;
  problem?: DecisionProblemSummary | null;
  scheduleDayIndex?: number;
  constraintLabel?: string | null;
  decisionResolutionPhase?: DecisionResolutionCtaPhase | null;
  hasUnsavedConstraintDraft?: boolean;
}): WorkbenchModeBarViewModel | null {
  if (input.mode === 'browse' || input.mode === 'arrange_itinerary') return null;

  const backLabel = input.fromTravelOverview
    ? '返回概览'
    : input.mode === 'decision_space'
      ? '返回行程诊断'
      : '返回编排行程';
  // 旅行条件已改为右侧抽屉（ConstraintConsoleDrawer），顶栏由抽屉自身承担，不再叠工作台模式条
  if (input.mode === 'constraint_edit') {
    return null;
  }

  if (input.mode === 'attraction_explore') {
    return {
      mode: input.mode,
      backLabel,
      modeLabel: '正在探索景点',
      focusTitle: '发现与筛选候选景点',
    };
  }

  if (input.mode === 'itinerary_diagnosis') {
    return {
      mode: input.mode,
      backLabel,
      modeLabel: '行程诊断',
      focusTitle: '冲突分析、可行性与决策建议',
    };
  }

  return {
    mode: input.mode,
    backLabel,
    modeLabel: '正在处理决策',
    focusTitle: resolveDecisionSpaceFocusTitle({
      conflict: input.conflict,
      problem: input.problem,
      dayIndex: input.scheduleDayIndex,
    }),
    decisionResolutionPhase:
      input.decisionResolutionPhase && input.decisionResolutionPhase !== 'done'
        ? input.decisionResolutionPhase
        : undefined,
  };
}
