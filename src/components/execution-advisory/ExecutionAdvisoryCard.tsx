import { format } from 'date-fns';
import { ChevronRight, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import { executionVerdictLabel } from '@/lib/trip-execution-advisory.adapter';

interface ExecutionAdvisoryCardProps {
  advisory: TripExecutionAdvisoryDto | null;
  loading?: boolean;
  onOpenDetail?: () => void;
  className?: string;
}

function verdictBorder(status: TripExecutionAdvisoryDto['verdict']['status']) {
  switch (status) {
    case 'ON_TRACK':
      return 'border-l-green-500';
    case 'AT_RISK':
      return 'border-l-amber-500';
    case 'REPLAN_REQUIRED':
      return 'border-l-orange-500';
    case 'STOP':
      return 'border-l-red-500';
    default:
      return 'border-l-slate-400';
  }
}

export function ExecutionAdvisoryCard({
  advisory,
  loading,
  onOpenDetail,
  className,
}: ExecutionAdvisoryCardProps) {
  if (loading && !advisory) {
    return (
      <Card className={cn('border-l-4', className)}>
        <CardContent className="py-4 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!advisory) return null;

  const recommended = advisory.recommendations.find((r) => r.isRecommended);
  const currentTime = format(new Date(advisory.currentState.currentTime), 'HH:mm');

  return (
    <Card
      className={cn(
        'border-l-4 cursor-pointer hover:shadow-md transition-shadow',
        verdictBorder(advisory.verdict.status),
        className,
      )}
      onClick={onOpenDetail}
      data-tour="execution-advisory"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-700" />
            实时执行状态
            <Badge variant="outline" className="text-[10px]">
              {executionVerdictLabel(advisory.verdict.status)}
            </Badge>
          </CardTitle>
          <span className="text-[10px] text-muted-foreground shrink-0">当前 {currentTime}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          第 {advisory.dayNumber} 天
          {advisory.routeSummary ? ` · ${advisory.routeSummary}` : ''}
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm font-medium text-slate-800">{advisory.verdict.headline}</p>

        {recommended && advisory.verdict.status !== 'ON_TRACK' && (
          <p className="text-xs text-sky-800 bg-sky-50 rounded px-2 py-1.5">
            建议：{recommended.label}
            {recommended.impactSummary ? ` · ${recommended.impactSummary}` : ''}
          </p>
        )}

        <ul className="text-xs space-y-1">
          {advisory.impacts.affectedItems.slice(0, 4).map((item) => (
            <li key={item.itemId} className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  item.status === 'completed' && 'bg-green-500',
                  item.status === 'active' && 'bg-sky-500',
                  item.status === 'at_risk' && 'bg-amber-500',
                  item.status === 'upcoming' && 'bg-slate-300',
                )}
              />
              <span className={item.status === 'completed' ? 'line-through' : ''}>{item.title}</span>
              {item.projectedArrival && (
                <span className="text-[10px] shrink-0">
                  {format(new Date(item.projectedArrival), 'HH:mm')}
                </span>
              )}
            </li>
          ))}
        </ul>

        {onOpenDetail && (
          <div className="flex items-center text-xs text-primary font-medium pt-1">
            查看调整对比
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
