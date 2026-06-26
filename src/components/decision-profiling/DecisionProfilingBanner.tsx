import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { isDecisionProfilingReuseEnabled } from '@/lib/decision-profiling-reuse-feature';
import type { OnboardingStatus, TravelStyleCard } from '@/types/trip-decision-profiling';

interface DecisionProfilingBannerProps {
  onboarding: OnboardingStatus;
  onStartQuiz: (options?: { prefill?: boolean }) => void;
  onReuseProfile?: () => void;
  reusing?: boolean;
  /** 后端可能先返回推断卡片，但 onboarding 仍为未完成 */
  travelStyleCard?: TravelStyleCard | null;
  className?: string;
}

export function DecisionProfilingBanner({
  onboarding,
  onStartQuiz,
  onReuseProfile,
  reusing = false,
  travelStyleCard,
  className,
}: DecisionProfilingBannerProps) {
  if (onboarding.quizCompleted) {
    if (onboarding.teamCompletionRate >= 95) return null;
    return (
      <div
        className={cn(
          'rounded-lg border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3',
          className,
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">团队调查进度 {onboarding.teamCompletionRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            还有成员未完成决策风格调查，全员完成后摩擦预警更准确
          </p>
          <Progress value={onboarding.teamCompletionRate} className="h-1.5 mt-2 max-w-xs" />
        </div>
      </div>
    );
  }

  const reuseEnabled = isDecisionProfilingReuseEnabled();
  const reuse = onboarding.reuse;
  const showReuseCta =
    reuseEnabled && reuse?.eligible && !onboarding.quizCompleted && onReuseProfile != null;

  const inferredOnly =
    travelStyleCard?.source === 'inferred' &&
    !onboarding.travelStyleCompleted &&
    !showReuseCta;
  const travelStylePreview = inferredOnly && travelStyleCard;

  const nextLabel = !onboarding.travelStyleCompleted
    ? travelStylePreview
      ? '完善 Travel Style 调查'
      : '开始 Travel Style 调查'
    : !onboarding.moneyDnaCompleted
      ? '继续 Money DNA 调查'
      : '完成调查';

  const reusePreviewLine = showReuseCta && reuse?.preview
    ? `上次「${reuse.lastCompletedTripLabel ?? '行程'}」仍可用（${reuse.preview.travelStyleLabel} · ${reuse.preview.moneyDnaSummary}）`
    : null;

  return (
    <div
      className={cn(
        showReuseCta
          ? 'rounded-lg border border-gate-confirm-border bg-gate-confirm/40 px-4 py-3 flex flex-col gap-3'
          : 'rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3',
        className,
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {showReuseCta ? (
          <ClipboardList className="h-5 w-5 text-gate-confirm-foreground shrink-0 mt-0.5" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium text-gate-confirm-foreground">决策风格画像 · 行前小调查</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {reusePreviewLine
              ? reusePreviewLine
              : travelStylePreview
                ? `已有初步推断「${travelStyleCard!.styleLabel}」（置信度 ${Math.round(
                    travelStyleCard!.confidence * 100,
                  )}%），完成正式调查可提高准确度并解锁分摊共识`
                : '约 5–8 分钟，帮助团队识别摩擦点并共识分摊方式'}
          </p>
          {showReuseCta ? (
            <p className="text-xs text-muted-foreground mt-1">
              本趟队友不同，摩擦预警与分摊共识仍会按本趟重新计算
            </p>
          ) : null}
          {!showReuseCta && onboarding.teamCompletionRate > 0 ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              团队完成率 {onboarding.teamCompletionRate}%
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {showReuseCta ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={reusing}
              onClick={onReuseProfile}
              aria-label={`沿用上次调查：${reuse?.lastCompletedTripLabel ?? '上次行程'}`}
            >
              {reusing ? <Spinner className="h-3.5 w-3.5" /> : null}
              沿用上次结果
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={reusing}
              onClick={() => onStartQuiz({ prefill: true })}
            >
              重新调查
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={() => onStartQuiz()} className="gap-1.5 h-8 text-xs">
            {nextLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
