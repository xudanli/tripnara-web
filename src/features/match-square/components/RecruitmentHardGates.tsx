import { Banknote, Car, HeartPulse, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import { resolveDisplayBudgetLabel } from '../lib/vibe-budget-coherence';
import { TRIP_MOOD_LABELS, PLANNING_STYLE_CAPSULES, TRAVEL_MODE_LABELS } from '../lib/constants';
import { plazaReview } from '../lib/plaza-visual';

interface RecruitmentHardGatesProps {
  post: RecruitmentPostCard;
  className?: string;
}

/** Hard Gates — 预算 / 出行方式等一票否决门槛，详情页前置 */
export function RecruitmentHardGates({ post, className }: RecruitmentHardGatesProps) {
  const budget = resolveDisplayBudgetLabel(post);
  const travel =
    post.travelMode != null
      ? TRAVEL_MODE_LABELS[post.travelMode as keyof typeof TRAVEL_MODE_LABELS] ??
        post.travelMode
      : null;
  const mood = post.tripMoodTag ? TRIP_MOOD_LABELS[post.tripMoodTag] : null;
  const teamwork =
    post.teamworkStyleCapsule ??
    (post.planningStyle ? PLANNING_STYLE_CAPSULES[post.planningStyle] : null);

  if (!budget && !travel && !mood && !teamwork) return null;

  return (
    <section
      className={cn(
        plazaReview.card,
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
      aria-label="硬性匹配门槛"
    >
      <p className="sm:col-span-2 lg:col-span-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Hard Gates · 先核对这些再读行程
      </p>
      {budget && (
        <div className="rounded-lg border border-[var(--gate-allow-border)] bg-[var(--gate-allow)] px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--gate-allow-foreground)] opacity-80">
            <Banknote className="h-3.5 w-3.5" aria-hidden />
            预算范围
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--gate-allow-foreground)]">
            {budget}
          </p>
        </div>
      )}
      {travel && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Car className="h-3.5 w-3.5" aria-hidden />
            出行方式
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{travel}</p>
          {post.vehicleInfo && (
            <p className="mt-0.5 text-xs text-muted-foreground">{post.vehicleInfo}</p>
          )}
        </div>
      )}
      {mood && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HeartPulse className="h-3.5 w-3.5" aria-hidden />
            本次状态
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{mood}</p>
        </div>
      )}
      {teamwork && (
        <div className="rounded-lg border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)]/20 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">组队风格</p>
          <p className="mt-1 text-sm font-medium text-foreground">{teamwork}</p>
          {post.planningStyleDescription && (
            <p className="mt-0.5 text-xs text-muted-foreground">{post.planningStyleDescription}</p>
          )}
        </div>
      )}
    </section>
  );
}
