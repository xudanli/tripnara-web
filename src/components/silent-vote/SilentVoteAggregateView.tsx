import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  kAnonymityHint,
  participationLabel,
  SILENT_VOTE_K_ANON_THRESHOLD,
} from '@/lib/silent-vote-labels';
import type {
  SilentVoteAggregate,
  SilentVoteIntensityBuckets,
} from '@/types/silent-votes';

const INTENSITY_COLORS = [
  'bg-muted-foreground/20',
  'bg-muted-foreground/35',
  'bg-muted-foreground/50',
  'bg-foreground/60',
  'bg-foreground',
] as const;

function bucketTotal(buckets: SilentVoteIntensityBuckets): number {
  return buckets['1'] + buckets['2'] + buckets['3'] + buckets['4'] + buckets['5'];
}

interface SilentVoteAggregateViewProps {
  aggregate: SilentVoteAggregate;
  className?: string;
}

export function SilentVoteAggregateView({ aggregate, className }: SilentVoteAggregateViewProps) {
  const {
    eligibleCount,
    submittedCount,
    kAnonymityApplied,
    optionDistribution,
    intensityHeatmap,
    discussionHints,
  } = aggregate;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{participationLabel(submittedCount, eligibleCount)}</span>
        {kAnonymityApplied ? (
          <span className="rounded-md bg-muted px-2 py-0.5">
            {kAnonymityHint(submittedCount, eligibleCount)}
          </span>
        ) : null}
      </div>

      {kAnonymityApplied ? (
        <p className="text-xs text-muted-foreground">
          匿名保护中：至少 {SILENT_VOTE_K_ANON_THRESHOLD} 人投票后才展示各选项分布与强度热力图。
        </p>
      ) : null}

      {optionDistribution && optionDistribution.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">选项得票占比</h4>
          <div className="space-y-2">
            {optionDistribution.map((row) => (
              <div key={row.optionId} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.count} 票 · {Math.round(row.share * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/75 transition-all"
                    style={{ width: `${Math.max(row.share * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {intensityHeatmap && intensityHeatmap.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">在意强度分布</h4>
          <div className="space-y-3">
            {intensityHeatmap.map((row) => {
              const total = bucketTotal(row.buckets);
              return (
                <div key={row.optionId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{row.label}</span>
                    <span className="shrink-0 text-muted-foreground">
                      均值 {row.meanIntensity.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-sm bg-muted">
                    {([1, 2, 3, 4, 5] as const).map((level) => {
                      const count = row.buckets[String(level) as keyof SilentVoteIntensityBuckets];
                      const width = total > 0 ? (count / total) * 100 : 0;
                      if (width <= 0) return null;
                      return (
                        <div
                          key={level}
                          className={cn('h-full', INTENSITY_COLORS[level - 1])}
                          style={{ width: `${width}%` }}
                          title={`强度 ${level}: ${count}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {discussionHints.length > 0 ? (
        <section className="space-y-2">
          {discussionHints.map((hint) => (
            <Alert
              key={`${hint.type}-${hint.optionId}`}
              variant={hint.severity === 'high' ? 'destructive' : 'default'}
              className={cn(
                hint.severity === 'medium' && 'border-amber-300/60 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100',
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">{hint.messageCN}</AlertDescription>
            </Alert>
          ))}
        </section>
      ) : null}
    </div>
  );
}
