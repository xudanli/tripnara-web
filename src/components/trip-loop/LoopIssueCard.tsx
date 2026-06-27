import { AlertTriangle, ChevronRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  dispatchPersonaAlertDeepLink,
  formatPersonaAlertReasonSummary,
  getPersonaAlertUserBody,
  getPersonaAlertUserTitle,
  isPersonaAlertHardBlocked,
} from '@/lib/persona-alert-display';
import { cn } from '@/lib/utils';
import type { TripLoopIssueCard } from '@/types/trip-loop';

interface LoopIssueCardProps {
  issue: TripLoopIssueCard;
  className?: string;
}

function resolveIssueCardCopy(issue: TripLoopIssueCard) {
  const alert = issue.personaAlert;
  if (alert) {
    return {
      title: getPersonaAlertUserTitle(alert),
      problem: getPersonaAlertUserBody(alert),
      reasonSummary: formatPersonaAlertReasonSummary(alert),
      hardConstraintBlocked: isPersonaAlertHardBlocked(alert),
      deepLink: alert.metadata?.deepLink,
    };
  }
  return {
    title: issue.title ?? issue.issueId,
    problem: issue.problem,
    reasonSummary: '',
    hardConstraintBlocked: false,
    deepLink: issue.issueId
      ? { type: 'feasibility' as const, issueId: issue.issueId }
      : undefined,
  };
}

export function LoopIssueCardView({ issue, className }: LoopIssueCardProps) {
  const copy = resolveIssueCardCopy(issue);

  return (
    <Card className={cn('border-l-4 border-l-amber-500', className)}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <span className="min-w-0 flex-1">{copy.title}</span>
          {copy.hardConstraintBlocked ? (
            <Badge variant="destructive" className="text-[10px] shrink-0">
              硬约束
            </Badge>
          ) : null}
          {issue.requiresApproval ? (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              需确认
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2 text-sm">
        {copy.reasonSummary ? (
          <p className="text-[11px] text-muted-foreground">{copy.reasonSummary}</p>
        ) : null}
        {copy.problem ? <p className="text-muted-foreground">{copy.problem}</p> : null}
        {issue.systemAttempts && issue.systemAttempts.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">系统已尝试</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {issue.systemAttempts.map((attempt) => (
                <li key={attempt}>{attempt}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
          <Wrench className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm">{issue.recommendation}</p>
        </div>
        {issue.impact ? (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {issue.impact.budgetDelta ? <span>预算 {issue.impact.budgetDelta}</span> : null}
            {issue.impact.travelDelta ? <span>行程 {issue.impact.travelDelta}</span> : null}
            {issue.impact.preferenceImpact ? (
              <span>偏好 {issue.impact.preferenceImpact}</span>
            ) : null}
          </div>
        ) : null}
        {copy.deepLink ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => dispatchPersonaAlertDeepLink(copy.deepLink)}
          >
            查看详情
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
