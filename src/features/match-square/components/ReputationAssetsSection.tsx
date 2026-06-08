import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserReputationAssets } from '@/types/reputation';

interface ReputationAssetsSectionProps {
  profile: UserReputationAssets;
  className?: string;
}

export function ReputationAssetsSection({ profile, className }: ReputationAssetsSectionProps) {
  const hasRatings = profile.surveyCount > 0 && profile.averageStars != null;

  return (
    <section className={cn('rounded-2xl border bg-card p-5', className)}>
      <h3 className="text-sm font-semibold text-foreground">数字信用资产</h3>

      {hasRatings ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1 text-2xl font-bold tabular-nums">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              {profile.averageStars!.toFixed(1)}
            </div>
            <span className="text-sm text-muted-foreground">
              / 5 · {profile.surveyCount} 次互评
            </span>
          </div>

          {profile.tagCloud.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">AI 聚合标签</p>
              <div className="flex flex-wrap gap-2">
                {profile.tagCloud.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          完成首次行后互评后，信用星级与标签云将在此展示。
        </p>
      )}

      {profile.safetyWarning && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {profile.safetyWarning}
        </div>
      )}
    </section>
  );
}
