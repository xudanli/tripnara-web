import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Blocker } from '@/types/readiness';
import { format } from 'date-fns';

interface BlockerCardProps {
  blocker: Blocker;
  onFix: (blockerId: string) => void;
  className?: string;
}

export default function BlockerCard({ blocker, onFix, className }: BlockerCardProps) {
  // 🎨 统一颜色 Token（符合 TripNARA 克制原则）
  const severityConfig = {
    critical: {
      label: 'Critical',
      className: 'bg-red-50 text-red-700 border-red-200', // ✅ 修复：使用 bg-red-50 而不是 bg-red-100
    },
    high: {
      label: 'High',
      className: 'bg-amber-50 text-amber-700 border-amber-200', // ✅ 修复：使用 bg-amber-50 而不是 bg-orange-100
    },
    medium: {
      label: 'Medium',
      className: 'bg-amber-50 text-amber-700 border-amber-200', // ✅ 修复：使用 bg-amber-50 而不是 bg-yellow-100
    },
  };

  const { label, className: severityClassName } = severityConfig[blocker.severity];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        blocker.severity === 'critical' && 'border-red-200', // ✅ 修复：统一使用 border-red-200
        blocker.severity === 'high' && 'border-amber-200', // ✅ 修复：统一使用 border-amber-200
        className
      )}
      onClick={() => onFix(blocker.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  'h-4 w-4',
                  blocker.severity === 'critical' && 'text-red-600',
                  blocker.severity === 'high' && 'text-amber-600', // ✅ 修复：统一使用 amber-600
                  blocker.severity === 'medium' && 'text-amber-600' // ✅ 修复：统一使用 amber-600
                )}
              />
              <h3 className="font-semibold text-sm">{blocker.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', severityClassName)}>
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground">影响: {blocker.impactScope}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>{blocker.evidenceSummary.source}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>
                {format(new Date(blocker.evidenceSummary.timestamp), 'MM-dd HH:mm')}
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={(e) => {
            e.stopPropagation();
            onFix(blocker.id);
          }}>
            Fix
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


