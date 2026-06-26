import type {
  ChangeResult,
  ExecutionNeptuneChangePayload,
  FallbackPlan,
  FallbackSolution,
} from '@/api/execution';

function inferRecommendedIndex(
  alternatives: ExecutionNeptuneChangePayload['alternatives'],
  recommendations?: string[],
): number {
  if (!alternatives?.length || !recommendations?.length) return -1;
  const hint = recommendations.join(' ');
  const idx = alternatives.findIndex((alt) => {
    const option = alt.option ?? '';
    return hint.includes(option) || (option.length > 4 && hint.includes(option.slice(0, 6)));
  });
  return idx >= 0 ? idx : 0;
}

function mapAlternativeToSolution(
  alt: NonNullable<ExecutionNeptuneChangePayload['alternatives']>[number],
  changeId: string,
  index: number,
  recommended: boolean,
): FallbackSolution {
  return {
    id: `${changeId}::alt::${index}`,
    type: 'minimal',
    title: alt.option ?? `方案 ${index + 1}`,
    description: alt.description ?? '',
    changes: [],
    impact: {
      arrivalTime: alt.impact ?? '—',
      missingPlaces: 0,
      riskChange: 'medium',
    },
    recommended,
  };
}

/**
 * 将后端 changeResult / pendingChanges 转为 Neptune 修复 Sheet 可用的 FallbackPlan。
 */
export function mapNeptuneChangeToFallbackPlan(
  change: ExecutionNeptuneChangePayload | null | undefined,
): FallbackPlan | null {
  if (!change) return null;

  const changeId = change.changeId ?? change.adjustedPlan?.itemId ?? 'pending-change';
  const triggerReason =
    change.originalPlan?.description ??
    change.adjustedPlan?.description ??
    '行程变更待确认';

  const solutions: FallbackSolution[] = [];

  if (change.adjustedPlan?.description) {
    solutions.push({
      id: `${changeId}::adjusted`,
      type: 'minimal',
      title: '接受系统调整',
      description: change.adjustedPlan.description,
      changes: [],
      impact: {
        arrivalTime: change.adjustedPlan.newStart
          ? `${change.adjustedPlan.newStart} – ${change.adjustedPlan.newEnd ?? ''}`
          : '—',
        missingPlaces: 0,
        riskChange: 'low',
      },
      recommended: !change.alternatives?.length,
    });
  }

  const recommendedAltIdx = inferRecommendedIndex(change.alternatives, change.recommendations);
  if (change.alternatives?.length) {
    change.alternatives.forEach((alt, index) => {
      solutions.push(
        mapAlternativeToSolution(alt, changeId, index, index === recommendedAltIdx),
      );
    });
  }

  if (solutions.length === 0) return null;

  return {
    id: changeId,
    triggerReason,
    solutions,
    changeId,
    changeType: change.changeType,
    originalPlan: change.originalPlan,
    adjustedPlan: change.adjustedPlan,
    impactDetail: change.impact,
    recommendations: change.recommendations,
  };
}

export function mapNeptuneChangeResultToFallbackPlan(
  changeResult: ChangeResult | null | undefined,
): FallbackPlan | null {
  if (!changeResult) return null;
  return mapNeptuneChangeToFallbackPlan(changeResult);
}

export function resolveExecutionNeptunePlan(uiOutput?: {
  fallbackPlan?: FallbackPlan;
  changeResult?: ChangeResult;
}): FallbackPlan | null {
  if (uiOutput?.fallbackPlan?.solutions?.length) {
    return uiOutput.fallbackPlan;
  }
  return mapNeptuneChangeResultToFallbackPlan(uiOutput?.changeResult);
}
