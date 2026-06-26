import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  isTodayReadinessEngine,
  todayReadinessBorderClasses,
  todayReadinessScoreClasses,
  todayReadinessStatusClasses,
  todayReadinessStatusLabel,
} from '@/lib/in-trip-today-readiness';
import type { InTripTodayReadiness } from '@/types/in-trip-execution';

interface InTripTodayReadinessCardProps {
  todayReadiness?: InTripTodayReadiness | null;
  loading?: boolean;
  onOpenDetail?: () => void;
  className?: string;
}

export function InTripTodayReadinessCard({
  todayReadiness,
  loading,
  onOpenDetail,
  className,
}: InTripTodayReadinessCardProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!todayReadiness || todayReadiness.source === 'unavailable') {
    return null;
  }

  if (!isTodayReadinessEngine(todayReadiness)) return null;

  const { status, score, summary, topFindings = [], dayNumber } = todayReadiness;
  const findingsPreview = topFindings.slice(0, 3);

  return (
    <Card
      className={cn(
        'border-l-4 cursor-pointer hover:shadow-md transition-shadow',
        todayReadinessBorderClasses(status),
        className,
      )}
      onClick={onOpenDetail}
      data-tour="today-readiness"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-sky-600" />
            今日就绪
            <span className="text-xs font-normal text-muted-foreground">
              第 {dayNumber} 天
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-[10px]', todayReadinessStatusClasses(status))}>
              {todayReadinessStatusLabel(status)}
            </Badge>
            <span className={cn('text-lg font-bold tabular-nums', todayReadinessScoreClasses(score))}>
              {score}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {summary && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {summary.blockers > 0 && (
              <span className="text-red-600 font-medium">{summary.blockers} 阻塞</span>
            )}
            {summary.must > 0 && <span>{summary.must} 必办</span>}
            {summary.should > 0 && <span>{summary.should} 建议</span>}
          </div>
        )}
        {findingsPreview.length > 0 ? (
          <ul className="text-sm space-y-1.5">
            {findingsPreview.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-muted-foreground">
                <span className="shrink-0 text-[10px] uppercase font-medium text-amber-700">
                  {f.type}
                </span>
                <span className="line-clamp-2">{f.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">今日计划可执行，暂无待处理缺口。</p>
        )}
        {onOpenDetail && (
          <div className="flex items-center text-xs text-primary font-medium pt-1">
            查看详情
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed border-t pt-2">
          仅评估今日活动与路段；突发环境变化见「环境预警」。
        </p>
      </CardContent>
    </Card>
  );
}
