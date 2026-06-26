import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Blocker } from '@/types/readiness';
import type { CascadeUiHint } from '@/types/readiness-cascade';
import CascadeImpactCard from '@/components/readiness/CascadeImpactCard';
import {
  getCascadeAffectedFromPreAnalysis,
  resolveImpactAlgebraForHint,
} from '@/lib/readiness-cascade.util';
import type { CascadeAffectedItem, CascadeCausalPreAnalysis } from '@/types/readiness-cascade';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface BlockerWithCascadeCardProps {
  blocker: Blocker;
  cascadeHints?: CascadeUiHint[];
  causalPreAnalysis?: CascadeCausalPreAnalysis | null;
  affectedItems?: CascadeAffectedItem[];
  onFix: (blockerId: string) => void;
  className?: string;
}

export default function BlockerWithCascadeCard({
  blocker,
  cascadeHints = [],
  causalPreAnalysis,
  affectedItems,
  onFix,
  className,
}: BlockerWithCascadeCardProps) {
  const { t } = useTranslation();

  const severityConfig = {
    critical: {
      label: 'Critical',
      className: 'bg-red-50 text-red-700 border-red-200',
    },
    high: {
      label: 'High',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    medium: {
      label: 'Medium',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  };

  const { label, className: severityClassName } = severityConfig[blocker.severity];
  const resolvedAffected =
    affectedItems && affectedItems.length > 0
      ? affectedItems
      : getCascadeAffectedFromPreAnalysis(causalPreAnalysis);

  return (
    <Card
      className={cn(
        'transition-all',
        blocker.severity === 'critical' && 'border-red-200',
        blocker.severity === 'high' && 'border-amber-200',
        className
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  'h-4 w-4',
                  blocker.severity === 'critical' && 'text-red-600',
                  blocker.severity === 'high' && 'text-amber-600',
                  blocker.severity === 'medium' && 'text-amber-600'
                )}
              />
              <h3 className="font-semibold text-sm">{blocker.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', severityClassName)}>
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.readiness.page.impactScope', {
                  defaultValue: '影响',
                })}
                : {blocker.impactScope}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>{blocker.evidenceSummary.source}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{format(new Date(blocker.evidenceSummary.timestamp), 'MM-dd HH:mm')}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onFix(blocker.id);
            }}
          >
            {t('dashboard.readiness.page.fix', { defaultValue: '修复' })}
          </Button>
        </div>

        {cascadeHints.length > 0 ? (
          <div className="space-y-2 border-l-2 border-violet-300/70 pl-3 ml-1">
            <p className="text-[11px] font-medium text-violet-800 dark:text-violet-200">
              {t('dashboard.readiness.cascade.nestedUnderBlocker', {
                defaultValue: '可能影响',
              })}
            </p>
            {cascadeHints.map((hint, index) => (
              <CascadeImpactCard
                key={hint.id}
                hint={hint}
                impactAlgebra={resolveImpactAlgebraForHint(hint, index, resolvedAffected)}
                showActions={false}
                className="shadow-none"
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
