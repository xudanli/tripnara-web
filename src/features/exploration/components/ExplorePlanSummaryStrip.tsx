import { Route, ShieldAlert } from 'lucide-react';
import { useExplorationTravelContext } from '../context/ExplorationTravelContext';
import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';

interface ExplorePlanSummaryStripProps {
  className?: string;
}

function readOntologyConstraintCounts(
  constraints: Record<string, unknown> | undefined,
): { blockers?: number; warnings?: number } {
  if (!constraints) return {};
  const blockers =
    typeof constraints.blockerCount === 'number'
      ? constraints.blockerCount
      : typeof constraints.blocker_count === 'number'
        ? constraints.blocker_count
        : undefined;
  const warnings =
    typeof constraints.warningCount === 'number'
      ? constraints.warningCount
      : typeof constraints.warning_count === 'number'
        ? constraints.warning_count
        : undefined;
  return { blockers, warnings };
}

/** 场景 3 — 从 plan view 读取 selectedRouteId / effectivePlan 摘要 */
export function ExplorePlanSummaryStrip({ className }: ExplorePlanSummaryStripProps) {
  const { enabled, planView, explorationView, ready } = useExplorationTravelContext();

  if (!enabled || !ready || !planView?.selectedRouteId) return null;

  const headline =
    typeof planView.effectivePlan?.headline === 'string'
      ? planView.effectivePlan.headline
      : undefined;
  const summary =
    typeof planView.effectivePlan?.summary === 'string'
      ? planView.effectivePlan.summary
      : undefined;

  const ontologyFromView = readOntologyConstraintCounts(explorationView?.ontologyConstraints);
  const ontologyBlockers =
    explorationView?.ontologyBlockerCount ?? ontologyFromView.blockers;
  const ontologyWarnings = ontologyFromView.warnings;
  const ontologyIssueCount = explorationView?.ontologyIssueCount;

  return (
    <div className={cn(exploreUi.infoBanner, 'flex flex-col gap-2 text-xs', className)}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Route className="w-3.5 h-3.5" />
          当前计划路线
        </span>
        <span className="font-mono text-muted-foreground">{planView.selectedRouteId}</span>
        {headline ? <span className="text-muted-foreground">{headline}</span> : null}
      </div>
      {summary ? (
        <span className="text-[11px] text-muted-foreground leading-snug">{summary}</span>
      ) : null}
      {(ontologyBlockers != null && ontologyBlockers > 0) ||
      (ontologyIssueCount != null && ontologyIssueCount > 0) ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldAlert className="w-3.5 h-3.5" />
          行程约束
          {ontologyBlockers != null && ontologyBlockers > 0
            ? ` · ${ontologyBlockers} 项阻断`
            : ontologyIssueCount != null
              ? ` · ${ontologyIssueCount} 项`
              : ''}
          {ontologyWarnings != null && ontologyWarnings > 0
            ? ` · ${ontologyWarnings} 项提醒`
            : ''}
        </span>
      ) : null}
    </div>
  );
}
