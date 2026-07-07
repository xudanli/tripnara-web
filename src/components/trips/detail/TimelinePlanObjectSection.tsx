import { Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sortPlanObjectChain } from '@/lib/plan-object-source.util';
import { PlanObjectChainRow } from '@/components/planning-workbench/PlanObjectChainRow';
import { cn } from '@/lib/utils';
import { PLAN_OBJECT_CHAIN_ORDER } from '@/types/plan-objects';
import type {
  TimelinePlanObjectTopAssessment,
  TimelinePlanObjectsBlock,
} from '@/types/timeline-overview';

function assessmentTone(
  status: TimelinePlanObjectTopAssessment['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'blocked') return 'destructive';
  if (status === 'warning') return 'outline';
  return 'secondary';
}

function assessmentLabel(status: TimelinePlanObjectTopAssessment['status']): string {
  if (status === 'blocked') return '阻断';
  if (status === 'warning') return '需调整';
  if (status === 'ok') return '正常';
  return status ?? '评估';
}

export interface TimelinePlanObjectTopAssessmentCardProps {
  assessment: TimelinePlanObjectTopAssessment;
  className?: string;
}

export function TimelinePlanObjectTopAssessmentCard({
  assessment,
  className,
}: TimelinePlanObjectTopAssessmentCardProps) {
  const title = assessment.headline ?? assessment.label ?? 'PlanObject 评估';
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Boxes className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {assessment.summary ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {assessment.summary}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {assessment.status ? (
            <Badge variant={assessmentTone(assessment.status)} className="text-[10px] font-normal">
              {assessmentLabel(assessment.status)}
            </Badge>
          ) : null}
          {assessment.score != null ? (
            <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
              {Math.round(assessment.score)}
            </Badge>
          ) : null}
          {assessment.issueCount != null && assessment.issueCount > 0 ? (
            <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
              {assessment.issueCount} 项
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export interface TimelinePlanObjectDayChainProps {
  dayNumber: number;
  objects: import('@/types/plan-objects').PlanObjectDto[];
  className?: string;
}

export function TimelinePlanObjectDayChain({
  dayNumber,
  objects,
  className,
}: TimelinePlanObjectDayChainProps) {
  const sorted = sortPlanObjectChain(objects);
  if (!sorted.length) return null;

  return (
    <div className={cn('mt-2 rounded-lg border border-border/80 bg-card px-2.5 py-2', className)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          PlanObject
        </span>
        <span className="text-[10px] text-muted-foreground">
          {PLAN_OBJECT_CHAIN_ORDER.join(' → ')}
        </span>
        <Badge variant="secondary" className="ml-auto h-5 text-[10px] font-normal">
          Day {dayNumber}
        </Badge>
      </div>
      <PlanObjectChainRow objects={sorted} variant="timeline" />
    </div>
  );
}

export function hasTimelinePlanObjects(
  block: TimelinePlanObjectsBlock | undefined | null,
): block is TimelinePlanObjectsBlock {
  if (!block) return false;
  return Boolean(block.topAssessment) || Boolean(block.days?.some((day) => day.objects?.length));
}
