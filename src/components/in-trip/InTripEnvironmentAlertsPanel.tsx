import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AlertTriangle, ChevronRight, CloudRain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  environmentEventStatusLabel,
  environmentEventTypeLabel,
  vulnerabilitySeverityClasses,
} from '@/lib/in-trip-execution';
import type { EnvironmentEventSummary } from '@/types/in-trip-execution';

interface InTripEnvironmentAlertsPanelProps {
  events: EnvironmentEventSummary[];
  loading?: boolean;
  error?: string | null;
  onSelectEvent: (eventId: string) => void;
  className?: string;
}

export function InTripEnvironmentAlertsPanel({
  events,
  loading,
  error,
  onSelectEvent,
  className,
}: InTripEnvironmentAlertsPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('col-span-12 border-amber-200', className)}>
        <CardContent className="py-4 text-sm text-amber-800">{error}</CardContent>
      </Card>
    );
  }

  if (events.length === 0) return null;

  return (
    <Card className={cn('col-span-12 border-amber-200/80', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CloudRain className="h-4 w-4 text-amber-600" aria-hidden />
          环境预警
          <Badge variant="secondary" className="text-xs">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event.id)}
            className="w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <AlertTriangle
              className={cn(
                'h-4 w-4 shrink-0 mt-0.5',
                event.severity === 'red' ? 'text-gate-reject-foreground' : 'text-amber-600',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', vulnerabilitySeverityClasses(event.severity))}
                >
                  {event.severity === 'red' ? '高风险' : '需关注'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {environmentEventTypeLabel(event.type)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {environmentEventStatusLabel(event.status)}
                </Badge>
              </div>
              <p className="text-sm line-clamp-2">{event.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(event.detectedAt), 'M月d日 HH:mm', { locale: zhCN })}
                {event.alternativePlanCount > 0 &&
                  ` · ${event.alternativePlanCount} 个替代方案`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" aria-hidden />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
