import { ArrowRight, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TeamFitAffectedMembers from '@/components/feasibility-report/TeamFitAffectedMembers';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import {
  buildPlanStudioIntentUrl,
  buildPlanStudioScheduleUrl,
  isTeamFitRepairIssue,
  resolveTeamFitUiHintsAction,
  shouldOfferPaceAdjustment,
  shouldOfferScheduleSplit,
  teamFitCopyVariantHint,
} from '@/lib/feasibility-team-fit.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import { cn } from '@/lib/utils';

export interface FeasibilityTeamFitActionsProps {
  tripId: string;
  issue: FeasibilityIssueDto;
  compact?: boolean;
  preferPlanStudio?: boolean;
  memberNameById?: Record<string, string>;
  className?: string;
}

export default function FeasibilityTeamFitActions({
  tripId,
  issue,
  compact = false,
  preferPlanStudio = false,
  memberNameById,
  className,
}: FeasibilityTeamFitActionsProps) {
  if (!isTeamFitRepairIssue(issue)) return null;

  const fromHints = resolveTeamFitUiHintsAction(issue, tripId, { preferPlanStudio });
  const target = fromHints
    ? null
    : resolveFeasibilityIssueActionTarget(issue, tripId, { preferPlanStudio });
  const primary = fromHints ?? (target?.href ? { label: target.label, href: target.href } : null);
  const copyHint = teamFitCopyVariantHint(issue.uiHints?.copyVariant);
  const showPace =
    shouldOfferPaceAdjustment(issue) &&
    issue.uiHints?.primaryAction !== 'open_team_pacing' &&
    issue.uiHints?.profilingSurface !== 'team_pacing';
  const showSplit = shouldOfferScheduleSplit(issue);
  const btnClass = compact ? 'h-7 text-[11px]' : 'h-8 text-xs';

  if (!primary && !showPace && !showSplit && !copyHint) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {copyHint ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{copyHint}</p>
      ) : null}
      <TeamFitAffectedMembers
        memberIds={issue.uiHints?.affectedMemberIds}
        nameById={memberNameById}
        compact={compact}
      />
      <div className={cn('flex flex-wrap gap-1.5')}>
      {primary ? (
        <Button variant="secondary" size="sm" className={btnClass} asChild>
          <Link to={primary.href}>
            {primary.label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      ) : null}
      {showPace ? (
        <Button variant="outline" size="sm" className={btnClass} asChild>
          <Link to={buildPlanStudioIntentUrl(tripId)}>
            <Gauge className="h-3 w-3 mr-1" />
            调整节奏
          </Link>
        </Button>
      ) : null}
      {showSplit ? (
        <Button variant="outline" size="sm" className={btnClass} asChild>
          <Link to={buildPlanStudioScheduleUrl(tripId, issue.affectedDays?.[0])}>
            去时间轴拆天
          </Link>
        </Button>
      ) : null}
      </div>
    </div>
  );
}
