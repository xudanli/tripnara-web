import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  resolveConflictForDecisionProblem,
  resolveDecisionProblemForConflict,
} from '@/lib/planning-conflicts-decision.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  buildWorkbenchDecisionFocusFromConflict,
  buildWorkbenchDecisionFocusFromTimelineEntry,
  EMPTY_WORKBENCH_DECISION_FOCUS,
  focusTokensFromWorkbenchFocus,
  isWorkbenchConstraintEntryFocused,
  isWorkbenchRouteStopFocused,
  reconcileWorkbenchFocusForDayChange,
  shouldDimWorkbenchRouteStop,
  type WorkbenchDecisionFocus,
} from '@/lib/workbench-decision-focus.util';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { DecisionProblemSummary } from '@/types/decision-problem';

export interface WorkbenchDecisionFocusProviderProps {
  children: ReactNode;
  conflicts: PlanningConflictItem[];
  decisionProblems?: DecisionProblemSummary[];
  selectedDayIndex: number;
  scheduleDayTimelinePois?: string[];
  scheduleDayExtraTokens?: string[];
  onSelectDayIndex?: (dayIndex: number) => void;
  onSelectTimelineEntryId?: (entryId: string | null) => void;
  onDecisionCheckerTab?: (tab: string) => void;
  onFocusAttention?: () => void;
  onScrollToDecision?: () => void;
  onMobileColumn?: (column: 'constraints' | 'itinerary' | 'decision') => void;
  onFocusConflictChange?: (conflict: PlanningConflictItem | null) => void;
  isDesktop?: boolean;
}

interface WorkbenchDecisionFocusContextValue {
  focus: WorkbenchDecisionFocus;
  isActive: boolean;
  focusConflict: PlanningConflictItem | null;
  focusProblem: DecisionProblemSummary | null;
  selectConflict: (input: { conflictId: string; dayIndex?: number }) => void;
  selectTimelineEntry: (input: {
    entryId: string;
    dayIndex: number;
    title: string;
    subtitle?: string | null;
  }) => void;
  clearFocus: () => void;
  syncDayIndex: (dayIndex: number) => void;
  isConstraintHighlighted: (entry: Pick<ConstraintListEntry, 'id' | 'label' | 'description' | 'value'>) => boolean;
  isRouteStopHighlighted: (stopName: string) => boolean;
  isRouteStopDimmed: (stopName: string) => boolean;
  isConflictLineSelected: (lineId: string) => boolean;
  isTimelineEntryFocused: (entryId: string) => boolean;
}

const WorkbenchDecisionFocusContext = createContext<WorkbenchDecisionFocusContextValue | null>(null);

export function WorkbenchDecisionFocusProvider({
  children,
  conflicts,
  decisionProblems,
  selectedDayIndex,
  scheduleDayTimelinePois = [],
  scheduleDayExtraTokens = [],
  onSelectDayIndex,
  onSelectTimelineEntryId,
  onDecisionCheckerTab,
  onFocusAttention,
  onScrollToDecision,
  onMobileColumn,
  onFocusConflictChange,
  isDesktop = true,
}: WorkbenchDecisionFocusProviderProps) {
  const [focus, setFocus] = useState<WorkbenchDecisionFocus>(EMPTY_WORKBENCH_DECISION_FOCUS);

  const focusConflict = useMemo(() => {
    if (!focus.conflictId) return null;
    return conflicts.find((item) => item.id === focus.conflictId) ?? null;
  }, [conflicts, focus.conflictId]);

  const focusProblem = useMemo(() => {
    if (!focus.problemId || !decisionProblems?.length) return null;
    return decisionProblems.find((item) => item.id === focus.problemId) ?? null;
  }, [decisionProblems, focus.problemId]);

  useEffect(() => {
    onFocusConflictChange?.(focusConflict);
  }, [focusConflict, onFocusConflictChange]);

  useEffect(() => {
    setFocus((prev) => reconcileWorkbenchFocusForDayChange(prev, selectedDayIndex, conflicts));
  }, [selectedDayIndex, conflicts]);

  const activateDecisionPanel = useCallback(
    (tab: string) => {
      onDecisionCheckerTab?.(tab);
      onFocusAttention?.();
      onScrollToDecision?.();
      if (!isDesktop) {
        onMobileColumn?.('decision');
      }
    },
    [onDecisionCheckerTab, onFocusAttention, onScrollToDecision, isDesktop, onMobileColumn],
  );

  const selectConflict = useCallback(
    (input: { conflictId: string; dayIndex?: number }) => {
      const conflict = conflicts.find((item) => item.id === input.conflictId);
      if (!conflict) return;

      const dayIndex = input.dayIndex ?? selectedDayIndex;
      const problem =
        resolveDecisionProblemForConflict(conflict, decisionProblems ?? []) ?? null;

      if (dayIndex !== selectedDayIndex) {
        onSelectDayIndex?.(dayIndex);
      }
      onSelectTimelineEntryId?.(null);

      setFocus(
        buildWorkbenchDecisionFocusFromConflict({
          conflict,
          problem,
          dayIndex,
          timelinePois: scheduleDayTimelinePois,
          extraTokens: scheduleDayExtraTokens,
        }),
      );
      activateDecisionPanel('overview');
    },
    [
      conflicts,
      decisionProblems,
      selectedDayIndex,
      scheduleDayTimelinePois,
      scheduleDayExtraTokens,
      onSelectDayIndex,
      onSelectTimelineEntryId,
      activateDecisionPanel,
    ],
  );

  const selectTimelineEntry = useCallback(
    (input: {
      entryId: string;
      dayIndex: number;
      title: string;
      subtitle?: string | null;
    }) => {
      if (input.dayIndex !== selectedDayIndex) {
        onSelectDayIndex?.(input.dayIndex);
      }
      onSelectTimelineEntryId?.(input.entryId);

      setFocus(buildWorkbenchDecisionFocusFromTimelineEntry(input));
      activateDecisionPanel('impact');
    },
    [selectedDayIndex, onSelectDayIndex, onSelectTimelineEntryId, activateDecisionPanel],
  );

  const clearFocus = useCallback(() => {
    setFocus(EMPTY_WORKBENCH_DECISION_FOCUS);
    onSelectTimelineEntryId?.(null);
    onFocusConflictChange?.(null);
  }, [onSelectTimelineEntryId, onFocusConflictChange]);

  const syncDayIndex = useCallback(
    (dayIndex: number) => {
      setFocus((prev) => reconcileWorkbenchFocusForDayChange(prev, dayIndex, conflicts));
    },
    [conflicts],
  );

  const isActive = focus.source !== 'none';

  const value = useMemo((): WorkbenchDecisionFocusContextValue => {
    void focusTokensFromWorkbenchFocus(focus, {
      conflict: focusConflict,
      problem: focusProblem,
      scheduleDayConflicts: focusConflict ? [focusConflict] : undefined,
      scheduleDayProblems: focusProblem ? [focusProblem] : undefined,
      timelinePois: scheduleDayTimelinePois,
      extraTokens: scheduleDayExtraTokens,
    });

    return {
      focus,
      isActive,
      focusConflict,
      focusProblem,
      selectConflict,
      selectTimelineEntry,
      clearFocus,
      syncDayIndex,
      isConstraintHighlighted: (entry) => isWorkbenchConstraintEntryFocused(entry, focus),
      isRouteStopHighlighted: (stopName) => isWorkbenchRouteStopFocused(stopName, focus),
      isRouteStopDimmed: (stopName) => shouldDimWorkbenchRouteStop(stopName, focus),
      isConflictLineSelected: (lineId) => focus.conflictId === lineId,
      isTimelineEntryFocused: (entryId) => focus.timelineEntryId === entryId,
    };
  }, [
    focus,
    isActive,
    focusConflict,
    focusProblem,
    scheduleDayTimelinePois,
    scheduleDayExtraTokens,
    selectConflict,
    selectTimelineEntry,
    clearFocus,
    syncDayIndex,
  ]);

  return (
    <WorkbenchDecisionFocusContext.Provider value={value}>
      {children}
    </WorkbenchDecisionFocusContext.Provider>
  );
}

export function useWorkbenchDecisionFocus(): WorkbenchDecisionFocusContextValue | null {
  return useContext(WorkbenchDecisionFocusContext);
}

/** 供左栏等必须存在的消费方使用 */
export function useWorkbenchDecisionFocusRequired(): WorkbenchDecisionFocusContextValue {
  const ctx = useContext(WorkbenchDecisionFocusContext);
  if (!ctx) {
    throw new Error('useWorkbenchDecisionFocusRequired must be used within WorkbenchDecisionFocusProvider');
  }
  return ctx;
}

export function resolveProblemConflictPair(input: {
  problemId: string;
  conflicts: PlanningConflictItem[];
  decisionProblems: DecisionProblemSummary[];
}): { conflict: PlanningConflictItem | null; problem: DecisionProblemSummary | null } {
  const problem = input.decisionProblems.find((item) => item.id === input.problemId) ?? null;
  const conflict = problem
    ? resolveConflictForDecisionProblem(problem, input.conflicts) ?? null
    : null;
  return { conflict, problem };
}
