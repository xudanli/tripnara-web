import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { MatchFlashPayload, RecruitmentPostCard } from '@/types/match-square';
import { formatDateRangeLabel } from '../lib/mock-data';
import { blocksApplyAction, APPLICATION_STATUS_LABELS } from '../lib/application-status';
import { CompatibilityBreakdownBadge } from './CompatibilityBreakdownBadge';
import { TeamPuzzleStrip } from './TeamPuzzleStrip';
import type { TeamSlot } from '@/types/match-square';

interface MatchFlashCardProps {
  post: RecruitmentPostCard;
  flash: MatchFlashPayload;
  slots: TeamSlot[];
  progressLabel?: string;
  onFlashApply?: () => void;
  onFlashChat?: () => void;
  showApply?: boolean;
}

/** 3.7 — 灵魂旅伴闪送卡（插入信息流） */
export function MatchFlashCard({
  post,
  flash,
  slots,
  progressLabel,
  onFlashApply,
  onFlashChat,
  showApply,
}: MatchFlashCardProps) {
  const routeLabel = [post.departureLabel, post.destination].filter(Boolean).join(' · ');
  const dateLabel = formatDateRangeLabel(post.startDate, post.endDate);
  const shimmer = flash.theme !== 'default';
  const title = flash.headline || flash.verdictTitle;
  const body = flash.aiVerdict || flash.verdictBody;
  const teamworkBlocked = post.teamworkMatchBlocked === true;

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border border-[var(--gate-suggest-border)] p-5 shadow-md',
        shimmer
          ? cn(
              'bg-gradient-to-br from-[var(--gate-suggest)] via-card to-[var(--gate-allow)]/30',
              'before:pointer-events-none before:absolute before:inset-0',
              'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
              'before:animate-[shimmer_2.4s_ease-in-out_infinite]'
            )
          : 'bg-card'
      )}
    >
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gate-suggest-foreground)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Match Flash · 灵魂撮合
            </p>
            {flash.rarityTag && (
              <span className="inline-block rounded-md border border-[var(--gate-allow-border)] bg-[var(--gate-allow)] px-2 py-0.5 text-[10px] font-medium text-[var(--gate-allow-foreground)]">
                {flash.rarityTag}
              </span>
            )}
          </div>
          <CompatibilityBreakdownBadge
            percent={flash.compatibilityPercent}
            breakdown={post.matchBreakdown}
            matchInsightDrawer={post.matchInsightDrawer}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-snug text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {flash.bullets && flash.bullets.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {flash.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--gate-suggest-foreground)]" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {routeLabel} · {dateLabel}
        </p>

        <TeamPuzzleStrip
          slots={slots}
          progressLabel={progressLabel ?? post.teamPuzzle?.progressLabel}
          viewerPuzzleMatch={post.teamPuzzle?.viewerPuzzleMatch}
          compatibilityPercent={flash.compatibilityPercent ?? post.compatibilityPercent}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          {teamworkBlocked ? (
            <Button variant="outline" className="flex-1" disabled>
              {post.teamworkBlockReason ?? '组队风格不匹配'}
            </Button>
          ) : post.viewerApplicationStatus && blocksApplyAction(post.viewerApplicationStatus) ? (
            <Button variant="outline" className="flex-1" disabled>
              {APPLICATION_STATUS_LABELS[post.viewerApplicationStatus]}
            </Button>
          ) : showApply && !teamworkBlocked && onFlashApply ? (
            <Button className="flex-1 gap-1.5" onClick={onFlashApply}>
              <Zap className="h-4 w-4" aria-hidden />
              {flash.ctaPrimary}
            </Button>
          ) : (
            <Button className="flex-1" asChild>
              <Link to={`/dashboard/tripnara/plaza/${post.id}`}>{flash.ctaPrimary}</Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 gap-1.5 border-[var(--gate-suggest-border)]"
            onClick={onFlashChat}
            asChild={!onFlashChat}
          >
            {onFlashChat ? (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden />
                {flash.ctaSecondary}
              </>
            ) : (
              <Link to={`/dashboard/tripnara/plaza/${post.id}`}>
                <MessageCircle className="mr-1.5 inline h-4 w-4" />
                {flash.ctaSecondary}
              </Link>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
