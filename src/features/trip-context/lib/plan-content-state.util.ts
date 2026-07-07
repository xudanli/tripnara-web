import type { PlanContentState } from '../components/PlanContentStateBadge';
import type { ItineraryItem } from '@/types/trip';
import type { OverviewViewData } from '@/travel-context/views/overview-view.types';
import type { PlanViewData } from '@/travel-context/views/travel-context-views.types';
import { isPlanGateTimelineItem } from '@/lib/plan-gate-timeline.util';

const VALID_STATES = new Set<PlanContentState>([
  'effective',
  'proposal',
  'draft',
  'pending_apply',
]);

export function isPlanContentState(value: unknown): value is PlanContentState {
  return typeof value === 'string' && VALID_STATES.has(value as PlanContentState);
}

/** 从 itinerary item metadata 读取四态（后端/BFF 可投影 planContentState） */
export function resolveItineraryItemPlanContentState(
  item: Pick<ItineraryItem, 'note' | 'metadata'>,
): PlanContentState | null {
  const fromMeta = item.metadata?.planContentState;
  if (isPlanContentState(fromMeta)) return fromMeta;

  const source = item.metadata?.source;
  if (source === 'itinerary_adjust_draft') return 'draft';
  if (source === 'itinerary_adjust_proposal' || source === 'ai_proposal') return 'proposal';
  if (source === 'pending_apply') return 'pending_apply';

  if (isPlanGateTimelineItem(item.note)) return 'effective';
  return null;
}

/** Plan view + overview → 当前壳层应展示的计划层摘要 */
export function resolvePlanLayerStates(input: {
  planView?: PlanViewData;
  overviewView?: OverviewViewData;
  hasWorkbenchDraft?: boolean;
  hasItineraryAdjustPreview?: boolean;
}): PlanContentState[] {
  const states = new Set<PlanContentState>(['effective']);

  if (input.overviewView?.pendingProposalCount && input.overviewView.pendingProposalCount > 0) {
    states.add('proposal');
  }

  const planProposal = input.planView?.proposalPlan;
  if (planProposal && Object.keys(planProposal).length > 0) {
    states.add('proposal');
  }

  const planDraft = input.planView?.draftPlan;
  if (planDraft && Object.keys(planDraft).length > 0) {
    states.add('draft');
  }

  if (input.planView?.pendingApplyPlan && Object.keys(input.planView.pendingApplyPlan).length > 0) {
    states.add('pending_apply');
  }

  if (input.hasWorkbenchDraft) states.add('proposal');
  if (input.hasItineraryAdjustPreview) states.add('draft');

  return Array.from(states);
}

/** 工作台生成方案未提交前 → AI 建议 */
export function resolveWorkbenchPlanContentState(
  committed: boolean,
  gateNeedsConfirm?: boolean,
): PlanContentState {
  if (committed) return 'effective';
  if (gateNeedsConfirm) return 'pending_apply';
  return 'proposal';
}
