import { Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVoiceGuardStatus } from '@/hooks/useVoiceGuardStatus';
import type { VoiceGuardIntervention } from '@/types/process-fairness';

function severityClass(severity: string): string {
  switch (severity) {
    case 'high':
      return 'border-gate-reject-border bg-gate-reject/15 text-gate-reject-foreground';
    case 'medium':
      return 'border-gate-confirm-border bg-gate-confirm/20 text-gate-confirm-foreground';
    default:
      return 'border-border bg-muted/30 text-muted-foreground';
  }
}

function InterventionRow({ item }: { item: VoiceGuardIntervention }) {
  return (
    <div className={cn('rounded-lg border px-3 py-2.5 text-sm', severityClass(item.severity))}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-[10px] font-normal">
          Voice Guard
        </Badge>
        <span className="font-medium">{item.displayName}</span>
      </div>
      <p className="leading-relaxed">{item.groupMessageCN}</p>
    </div>
  );
}

interface VoiceGuardBannerProps {
  tripId: string;
  className?: string;
}

export function VoiceGuardBanner({ tripId, className }: VoiceGuardBannerProps) {
  const { status, loading } = useVoiceGuardStatus(tripId);

  if (loading || !status?.interventions?.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" aria-hidden />
        <span>发言权保障 · 团队平均参与度 {status.averageEngagementScore.toFixed(1)}</span>
      </div>
      {status.interventions.map((item) => (
        <InterventionRow key={`${item.userId}-${item.reason}`} item={item} />
      ))}
    </div>
  );
}
