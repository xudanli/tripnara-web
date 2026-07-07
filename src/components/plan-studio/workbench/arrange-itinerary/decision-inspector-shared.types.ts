import type { PlanningDecisionInspector } from '@/dto/frontend-planning-decision-inspector.types';

/** 父级 tier-2 并行请求 decision-inspector?problemId，右栏/中栏共享 */
export interface SharedDecisionInspectorQuery {
  data: PlanningDecisionInspector | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}
