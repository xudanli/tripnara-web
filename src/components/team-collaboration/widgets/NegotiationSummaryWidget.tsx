import { Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import { CollabWidgetCard } from './CollabWidgetCard';

interface NegotiationSummaryWidgetProps {
  tasks: DomainNegotiationTask[];
  onViewAll?: () => void;
}

export function NegotiationSummaryWidget({ tasks, onViewAll }: NegotiationSummaryWidgetProps) {
  const active = tasks.filter((t) => t.status === 'in_discussion');
  const featured = active[0] ?? tasks.find((t) => t.status === 'pending');

  return (
    <CollabWidgetCard
      title="结构化协商摘要"
      action={
        onViewAll ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            进入
          </Button>
        ) : null
      }
    >
      {!featured ? (
        <p className="text-xs text-muted-foreground">暂无进行中的协商议题。</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{featured.title}</p>
              <Badge variant="secondary" className="mt-1 h-5 text-[10px] font-normal">
                {featured.statusLabel}
              </Badge>
            </div>
          </div>
          {active.length > 1 ? (
            <p className="text-[10px] text-muted-foreground">另有 {active.length - 1} 项协商进行中</p>
          ) : null}
        </div>
      )}
    </CollabWidgetCard>
  );
}
