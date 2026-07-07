import { format } from 'date-fns';
import { BarChart3, Quote, Sparkles, Target, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { experienceAtomLabel } from '@/lib/experience-fulfillment-display.util';
import { thermometerLevelClasses, thermometerLevelLabel } from '@/lib/in-trip-execution';
import { dominantPersonaLabel } from '@/lib/in-trip-experience';
import type { PostTripSummary } from '@/types/in-trip-experience';
import { formatCurrency } from '@/utils/format';

interface InTripPostTripSummaryPanelProps {
  data: PostTripSummary | null;
  loading?: boolean;
  error?: string | null;
  memberNameById?: Record<string, string>;
  className?: string;
}

export function InTripPostTripSummaryPanel({
  data,
  loading,
  error,
  memberNameById = {},
  className,
}: InTripPostTripSummaryPanelProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-amber-200', className)}>
        <CardContent className="py-4 text-sm text-amber-800">{error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { spendingReview, teamReview } = data;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" aria-hidden />
          行后体验总结
        </CardTitle>
        <CardDescription>
          生成于 {format(new Date(data.generatedAt), 'yyyy年M月d日 HH:mm')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.experienceFulfillmentReview && (
          <section className="rounded-lg border border-border bg-muted/15 p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
              体验兑现回顾
            </h3>
            <p className="text-sm leading-relaxed">{data.experienceFulfillmentReview.summaryZh}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>
                对齐率 {Math.round(data.experienceFulfillmentReview.alignmentRate * 100)}%
              </span>
              <span>
                {data.experienceFulfillmentReview.alignedCount}/
                {data.experienceFulfillmentReview.outcomeCount} 次反馈一致
              </span>
            </div>
            {data.experienceFulfillmentReview.plannedIntents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.experienceFulfillmentReview.plannedIntents.map((intent) => (
                  <Badge key={intent} variant="secondary" className="text-[10px]">
                    规划：{intent}
                  </Badge>
                ))}
              </div>
            )}
            {data.experienceFulfillmentReview.topMatchedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.experienceFulfillmentReview.topMatchedTags.map(({ tag, count }) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {experienceAtomLabel(tag)} × {count}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        {data.experienceHighlights.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Quote className="h-4 w-4 text-muted-foreground" aria-hidden />
              体验高光
            </h3>
            <ul className="space-y-2">
              {data.experienceHighlights.map((h, i) => (
                <li key={`${h.memberId}-${h.activityName}-${i}`} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{h.activityName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      情绪 {h.emotionalValueScore}/5
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {memberNameById[h.memberId] ?? h.memberId}
                    </span>
                  </div>
                  {h.quote && (
                    <p className="text-sm text-muted-foreground mt-1 italic">「{h.quote}」</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
            消费回顾
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">总支出</span>
            <span className="font-medium">
              {formatCurrency(spendingReview.totalSpentCny, spendingReview.currency)} /{' '}
              {formatCurrency(spendingReview.budgetTotal, spendingReview.currency)}
            </span>
          </div>
          <Progress value={spendingReview.usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            预算使用 {spendingReview.usagePercent}% · 主要类别 {spendingReview.topCategory}
          </p>
        </section>

        {teamReview.levelTrend.length > 0 && (
          <section className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              团队氛围
            </h3>
            <p className="text-sm">
              平均得分{' '}
              <span className="font-medium">{Math.round(teamReview.averageScore * 100)}%</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {teamReview.levelTrend.map((day) => (
                <div
                  key={day.dayNumber}
                  className="rounded-md border px-2 py-1.5 text-center min-w-[3.5rem]"
                >
                  <p className="text-[10px] text-muted-foreground">D{day.dayNumber}</p>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] mt-0.5', thermometerLevelClasses(day.level))}
                  >
                    {thermometerLevelLabel(day.level)}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.profileCalibrations.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
              Money DNA 校准
            </h3>
            <ul className="space-y-2">
              {data.profileCalibrations.map((p) => (
                <li key={p.userId} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{memberNameById[p.userId] ?? p.userId}</span>
                    {p.calibrated && (
                      <Badge variant="secondary" className="text-[10px]">
                        {dominantPersonaLabel(p.dominantPersona)}
                      </Badge>
                    )}
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
