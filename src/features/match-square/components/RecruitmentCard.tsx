import { Link, useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { RecruitmentPostCard } from '@/types/match-square';
import { buildListCardGatePills } from '../lib/build-hard-gates-summary';
import { formatTeamRosterLabel } from '../lib/team-roster-label';
import { plazaCard, plazaChip, plazaListCard } from '../lib/plaza-visual';
import {
  resolveListCaptainMessagePreview,
  resolveRecruitmentRouteTitleLine,
  resolveRecruitmentTitle,
} from '../lib/resolve-recruitment-display';
import { resolveVibeChipLabels } from '../lib/vibe-llm/to-card-view';
import { resolveTeamSlots, type ViewerSlotProfile } from '../lib/slot-filling';
import { VibeChipStream } from './VibeChipStream';
import { CompatibilityBreakdownBadge } from './CompatibilityBreakdownBadge';
import { TeamPuzzleListHint } from './TeamPuzzleListHint';
import { RecruitmentApplyAction } from './RecruitmentApplyAction';
import { RecruitmentStatusBadge } from './RecruitmentStatusBadge';
import { VerifiedCredentialsStrip } from './VerifiedCredentialsStrip';

function ListCaptainAnchor({ post }: { post: RecruitmentPostCard }) {
  const label = post.captainCardTitle || post.captainDisplayName;
  if (!label) return null;

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
      <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">
        队长 · <span className="font-medium text-foreground/85">{label}</span>
      </span>
    </span>
  );
}

interface RecruitmentCardProps {
  post: RecruitmentPostCard;
  onApply?: () => void;
  /** 广场弹窗打开详情；未传则跳转独立页 */
  onOpenDetail?: (postId: string) => void;
  showApply?: boolean;
  showManage?: boolean;
  showStatus?: boolean;
  variant?: 'list' | 'embedded';
  viewerProfile?: ViewerSlotProfile | null;
  onOpenTrustProfile?: () => void;
}

/** 广场列表 Card — 扫读：去哪 / 合不合 / 硬门槛摘要 / 缺员；详情承载全文 */
export function RecruitmentCard({
  post,
  onApply,
  onOpenDetail,
  showApply,
  showManage,
  showStatus,
  variant = 'list',
  viewerProfile,
  onOpenTrustProfile,
}: RecruitmentCardProps) {
  const navigate = useNavigate();
  const routeTitleLine = resolveRecruitmentRouteTitleLine(post);
  const fallbackTitle = resolveRecruitmentTitle(post);
  const cardTitle = routeTitleLine || fallbackTitle;
  const teamSlots = resolveTeamSlots(post, viewerProfile);
  const isList = variant === 'list';
  const teamworkBlocked = post.teamworkMatchBlocked === true;
  const gatePills = isList ? buildListCardGatePills(post) : [];
  const vibeChips = isList ? resolveVibeChipLabels(post) : [];
  const slotsRemaining = post.teamStatus?.slotsRemaining;
  const rosterLabel = formatTeamRosterLabel(post, teamSlots);
  const captainMessagePreview = isList ? resolveListCaptainMessagePreview(post) : null;
  const showListMeta =
    isList &&
    (gatePills.length > 0 ||
      vibeChips.length > 0 ||
      captainMessagePreview ||
      post.captainCardTitle ||
      post.captainDisplayName);

  const openDetail = () => {
    if (onOpenDetail) onOpenDetail(post.id);
    else navigate(`/dashboard/tripnara/plaza/${post.id}`);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isList) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [data-no-card-nav]')) return;
    openDetail();
  };

  return (
    <article
      className={cn(
        plazaCard.root,
        isList && 'cursor-pointer',
        showManage && post.status === 'hidden' && 'border-dashed opacity-90'
      )}
      onClick={handleCardClick}
      role={isList ? 'button' : undefined}
      tabIndex={isList ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isList) {
          e.preventDefault();
          openDetail();
        }
      }}
    >
      <div className={cn(isList ? plazaListCard.inner : plazaCard.inner)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {showStatus && (
                <RecruitmentStatusBadge status={post.status} className="sm:hidden" />
              )}
              <h3 className={plazaListCard.routeTitle}>{cardTitle}</h3>
            </div>

            {showListMeta && (
              <div className="space-y-1">
                {gatePills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {gatePills.map((pill) => (
                      <span key={pill} className={plazaChip.gate} title={pill}>
                        {pill}
                      </span>
                    ))}
                  </div>
                )}
                {vibeChips.length > 0 && (
                  <VibeChipStream chips={vibeChips} tone="neutral" />
                )}
                <ListCaptainAnchor post={post} />
                {captainMessagePreview && (
                  <p
                    className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground"
                    title={post.captainMessage ?? undefined}
                  >
                    「{captainMessagePreview}」
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {showStatus && (
              <RecruitmentStatusBadge status={post.status} className="hidden sm:inline-flex" />
            )}
            {showManage ? null : teamworkBlocked ? (
              post.teamworkBlockReason && (
                <p
                  className="max-w-[9rem] text-right text-[11px] leading-snug text-[var(--gate-confirm-foreground)]"
                  title={post.teamworkBlockReason}
                >
                  {post.teamworkBlockReason}
                </p>
              )
            ) : (
              post.compatibilityPercent != null && (
                <CompatibilityBreakdownBadge
                  percent={post.compatibilityPercent}
                  breakdown={post.matchBreakdown}
                  matchInsightDrawer={post.matchInsightDrawer}
                />
              )
            )}
          </div>
        </div>

        {isList && (
          <div className={plazaListCard.footer}>
            {rosterLabel || teamSlots.some((s) => s.kind === 'open') ? (
              <TeamPuzzleListHint
                slots={teamSlots}
                slotsRemaining={slotsRemaining}
                teamStatus={post.teamStatus}
                postStatus={post.status}
                hideOpenSlot
              />
            ) : (
              <span className="text-[11px] text-muted-foreground">点击查看详情</span>
            )}
            {showManage ? (
              <div className="flex shrink-0 gap-1.5" data-no-card-nav>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() =>
                    onOpenDetail ? onOpenDetail(post.id) : navigate(`/dashboard/tripnara/plaza/${post.id}`)
                  }
                >
                  详情
                </Button>
                <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
                  <Link to={`/dashboard/tripnara/plaza/manage/${post.id}`}>管理申请</Link>
                </Button>
              </div>
            ) : (
              <RecruitmentApplyAction
                applicationStatus={post.viewerApplicationStatus}
                showApply={showApply && !teamworkBlocked}
                teamworkBlocked={teamworkBlocked}
                teamworkBlockReason={post.teamworkBlockReason}
                onApply={onApply}
                compact
              />
            )}
          </div>
        )}

        {!isList && (
          <>
            <div className={plazaCard.divider} />
            <VerifiedCredentialsStrip
              post={post}
              variant="detail"
              onOpenTrustProfile={onOpenTrustProfile}
            />
          </>
        )}
      </div>
    </article>
  );
}
