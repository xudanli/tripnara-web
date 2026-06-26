import { format } from 'date-fns';
import { HeartHandshake, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { interventionLevelLabel } from '@/lib/in-trip-pulse';
import type { PulseIntervention } from '@/types/in-trip-pulse';

interface InTripPulseInterventionsPanelProps {
  interventions: PulseIntervention[];
  loading?: boolean;
  error?: string | null;
  ackingId?: string | null;
  onAck: (id: string, action: 'acknowledge' | 'dismiss') => void;
  className?: string;
}

export function InTripPulseInterventionsPanel({
  interventions,
  loading,
  error,
  ackingId,
  onAck,
  className,
}: InTripPulseInterventionsPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || interventions.length === 0) return null;

  return (
    <Card className={cn('col-span-12 border-rose-200/80', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-rose-500" aria-hidden />
          关系保护建议
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {interventions.map((item) => (
          <div key={item.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
              {interventionLevelLabel(item.level)}
              <span>·</span>
              <span>{format(new Date(item.createdAt), 'HH:mm')}</span>
            </div>
            <p className="text-sm">{item.messageZh}</p>
            {item.privateChannelAvailable && (
              <p className="text-[10px] text-muted-foreground">可通过行程助手私密倾诉</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={ackingId === item.id}
                onClick={() => onAck(item.id, 'acknowledge')}
              >
                知道了
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={ackingId === item.id}
                onClick={() => onAck(item.id, 'dismiss')}
              >
                暂不处理
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
