import { format } from 'date-fns';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  psychologicalBucketLabel,
  rebalanceScenarioLabel,
} from '@/lib/in-trip-money';
import type { RebalanceSuggestionSummary } from '@/types/in-trip-money';
import { formatCurrency } from '@/utils/format';

interface InTripMoneyRebalancePanelProps {
  suggestions: RebalanceSuggestionSummary[];
  loading?: boolean;
  error?: string | null;
  respondingId?: string | null;
  currency?: string;
  onRespond: (suggestionId: string, response: 'accept' | 'keep') => void;
  className?: string;
}

export function InTripMoneyRebalancePanel({
  suggestions,
  loading,
  error,
  respondingId,
  currency = 'CNY',
  onRespond,
  className,
}: InTripMoneyRebalancePanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || suggestions.length === 0) return null;

  return (
    <Card className={cn('col-span-12 border-amber-200/80', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-amber-600" aria-hidden />
          预算再平衡建议
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-amber-800">
                {rebalanceScenarioLabel(s.scenario)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(s.createdAt), 'M月d日 HH:mm')}
              </span>
            </div>
            <p className="text-sm">{s.message}</p>
            {s.proposal.rationale && (
              <p className="text-xs text-muted-foreground">{s.proposal.rationale}</p>
            )}
            {s.proposal.fromBucket && s.proposal.toBucket && s.proposal.amount != null && (
              <p className="text-xs">
                {psychologicalBucketLabel(s.proposal.fromBucket)} →{' '}
                {psychologicalBucketLabel(s.proposal.toBucket)} ·{' '}
                {formatCurrency(s.proposal.amount, currency)}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={respondingId === s.id}
                onClick={() => onRespond(s.id, 'accept')}
              >
                接受建议
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={respondingId === s.id}
                onClick={() => onRespond(s.id, 'keep')}
              >
                保持现状
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
