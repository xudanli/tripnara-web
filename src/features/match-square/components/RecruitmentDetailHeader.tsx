import { CalendarDays, UserRound, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecruitmentPostCard } from '@/types/match-square';
import {
  resolveRecruitmentMetaLine,
  resolveRecruitmentRouteTitleLine,
  resolveRecruitmentTitle,
  resolveRecruitmentVision,
} from '../lib/resolve-recruitment-display';
import { sanitizeVibeBudgetCopy } from '../lib/vibe-budget-coherence';
import { resolveVibeChipLabels } from '../lib/vibe-llm/to-card-view';
import { resolveCaptainCredentials } from '../lib/verified-credentials';
import { formatTeamRosterLabel } from '../lib/team-roster-label';
import { plazaBadge, plazaOverview, plazaReview } from '../lib/plaza-visual';
import { CompatibilityBreakdownBadge } from './CompatibilityBreakdownBadge';
import { RecruitmentVisionLead } from './RecruitmentVisionLead';
import { VerifiedCredentialsStrip } from './VerifiedCredentialsStrip';
import { VibeChipStream } from './VibeChipStream';

interface RecruitmentDetailHeaderProps {
  post: RecruitmentPostCard;
  showCompatibility?: boolean;
  onOpenTrustProfile?: () => void;
  /** 嵌入父级卡片，不单独包一层 border */
  embedded?: boolean;
  /** 弹窗等紧凑场景 */
  compact?: boolean;
  className?: string;
}

function formatTeamStatusLabel(post: RecruitmentPostCard): string | null {
  return formatTeamRosterLabel(post);
}

/** P0 · 路线标题 + 愿景 · chips · 契合度 % */
export function RecruitmentDetailHeader({
  post,
  showCompatibility = true,
  onOpenTrustProfile,
  embedded = false,
  compact = false,
  className,
}: RecruitmentDetailHeaderProps) {
  const visionRaw = resolveRecruitmentVision(post);
  const vision = visionRaw ? sanitizeVibeBudgetCopy(visionRaw, post) : null;
  const usesVisionAsTitle = Boolean(vision);
  const routeTitleLine = resolveRecruitmentRouteTitleLine(post);
  const fallbackTitle = resolveRecruitmentTitle(post);
  const scheduleMeta = resolveRecruitmentMetaLine(post);
  const teamLabel = formatTeamStatusLabel(post);
  const chips = resolveVibeChipLabels(post);
  const hasCredentials = Boolean(resolveCaptainCredentials(post)?.headline?.identityHeadline);
  const percent = post.compatibilityPercent;
  const teamworkBlocked = post.teamworkMatchBlocked === true;
  const hasInsightPopover = Boolean(
    post.matchInsightDrawer?.lines?.length || post.matchBreakdown
  );

  const showScheduleInMeta = !usesVisionAsTitle && !routeTitleLine && Boolean(scheduleMeta);

  const Wrapper = embedded ? 'div' : 'section';

  return (
    <Wrapper
      className={cn(
        !embedded && plazaReview.card,
        compact ? plazaOverview.blockCompact : plazaOverview.block,
        className
      )}
      {...(!embedded ? { 'aria-label': '招募概览' as const } : {})}
    >
      <div className={plazaOverview.heroRow}>
        <div className={cn(compact ? plazaOverview.blockCompact : plazaOverview.block, 'min-w-0 flex-1')}>
          {usesVisionAsTitle ? (
            <RecruitmentVisionLead
              text={vision!}
              as="title"
              routeTitleLine={routeTitleLine}
            />
          ) : (
            <h1 className={plazaOverview.title}>{routeTitleLine || fallbackTitle}</h1>
          )}

          {(showScheduleInMeta || teamLabel) && (
            <p className={plazaOverview.meta}>
              {showScheduleInMeta && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 opacity-70" aria-hidden />
                  {scheduleMeta}
                </span>
              )}
              {showScheduleInMeta && teamLabel && (
                <span className={plazaOverview.metaSep} aria-hidden>
                  ·
                </span>
              )}
              {teamLabel && (
                <span className={plazaOverview.metaEmphasis}>{teamLabel}</span>
              )}
            </p>
          )}

          {chips.length > 0 && (
            <VibeChipStream chips={chips} tone="neutral" className="mt-1.5" />
          )}
        </div>

        {showCompatibility && !teamworkBlocked && percent != null && (
          <div className="shrink-0 pt-0.5" data-no-card-nav>
            {hasInsightPopover ? (
              <CompatibilityBreakdownBadge
                percent={percent}
                breakdown={post.matchBreakdown}
                matchInsightDrawer={post.matchInsightDrawer}
              />
            ) : (
              <span
                className={cn(plazaBadge.fit, 'border-border bg-muted/40 text-muted-foreground')}
                title="完整契合诊断生成中"
              >
                {percent}
                <span className="text-[10px] font-normal opacity-70">%</span>
              </span>
            )}
          </div>
        )}
      </div>

      {!hasCredentials && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(plazaBadge.tag, 'inline-flex items-center gap-1')}>
            <UserRound className="h-3 w-3" aria-hidden />
            {post.captainCardTitle}
          </span>
          <span className={cn(plazaBadge.tag, 'inline-flex items-center gap-1')}>
            <UsersRound className="h-3 w-3" aria-hidden />
            {post.captainInteractionModeLabel}
          </span>
        </div>
      )}

      {hasCredentials && (
        <VerifiedCredentialsStrip
          post={post}
          variant="detail"
          compact={compact}
          onOpenTrustProfile={onOpenTrustProfile}
        />
      )}
    </Wrapper>
  );
}
