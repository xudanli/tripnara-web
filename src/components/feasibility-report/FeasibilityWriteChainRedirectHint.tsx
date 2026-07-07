import { Link } from 'react-router-dom';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import {
  formatWriteChainAuthorizedPathsCta,
  resolveFeasibilityIssueDecisionProblemId,
  shouldBlockDirectFeasibilityApplyRepair,
} from '@/lib/effective-plan-write-chain.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import { cn } from '@/lib/utils';

export interface FeasibilityWriteChainRedirectHintProps {
  tripId: string;
  issue: Pick<FeasibilityIssueDto, 'id' | 'decisionProblemId'>;
  compact?: boolean;
  className?: string;
  authorizedPaths?: string[];
}

/** Gateway 写链开启时，替代 feasibility apply-repair 按钮 */
export function FeasibilityWriteChainRedirectHint({
  tripId,
  issue,
  compact = false,
  authorizedPaths,
  className,
}: FeasibilityWriteChainRedirectHintProps) {
  if (!shouldBlockDirectFeasibilityApplyRepair()) return null;

  const problemId = resolveFeasibilityIssueDecisionProblemId(issue);
  const textClass = compact ? 'text-[11px]' : 'text-xs';
  const cta = formatWriteChainAuthorizedPathsCta(authorizedPaths);

  return (
    <p className={cn(textClass, 'leading-relaxed text-muted-foreground', className)}>
      写链已开启：{cta}。
      {problemId ? (
        <>
          {' '}
          <Link
            to={buildPlanStudioDecisionProblemPath(tripId, problemId)}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            打开决策空间
          </Link>
        </>
      ) : null}
    </p>
  );
}
