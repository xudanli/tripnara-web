import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EvidenceItem } from '@/types/readiness';

interface EvidenceListItemProps {
  evidence: EvidenceItem;
  onRefresh?: (evidenceId: string) => void;
  onOpen?: (evidenceId: string) => void;
}

export default function EvidenceListItem({
  evidence,
  onRefresh,
  onOpen,
}: EvidenceListItemProps) {
  const confidenceConfig = {
    high: {
      label: 'High',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    medium: {
      label: 'Medium',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    low: {
      label: 'Low',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  const categoryLabels = {
    road: 'Road',
    weather: 'Weather',
    poi: 'POI',
    ticket: 'Ticket',
    lodging: 'Lodging',
  };

  const { label, className } = confidenceConfig[evidence.confidence];

  return (
    <div className="flex items-start justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{categoryLabels[evidence.category]}</span>
          <Badge variant="outline" className={cn('text-xs', className)}>
            {label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <span>{evidence.source}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(evidence.timestamp), 'MM-dd HH:mm')}</span>
            <span>•</span>
            <span>适用范围: {evidence.scope}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onRefresh(evidence.id)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {onOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onOpen(evidence.id)}
          >
            Open
          </Button>
        )}
      </div>
    </div>
  );
}

