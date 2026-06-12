import { useMemo, useState } from 'react';
import { formatMemberIdentityLabel } from '../lib/compact-puzzle-slot-label';
import { enrichApplicationMatchInsights } from '../lib/match-enrichment';
import { Loader2, Puzzle, Sparkles, UserRound } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StackedDialogContent,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type {
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  TeamSlot,
  ViewerPuzzleMatch,
} from '@/types/match-square';
import { displayPuzzleSlotLabel } from '../lib/compact-puzzle-slot-label';
import { plazaChip } from '../lib/plaza-visual';
import { resolvePuzzleBanner } from '../lib/resolve-puzzle-banner';
import { filterCaptainPuzzleSlotsForDetail, resolvePuzzleMemberApplication } from '../lib/team-puzzle';
import {
  pickRicherApplicantCredentials,
  resolveApplicantCardTitle,
  resolveApplicantRealName,
  sanitizeMemberApplicantCredentials,
} from '../lib/resolve-applicant-credentials';
import { enrichVerifiedCredentialsDossier } from '../lib/verified-credentials';
import { CaptainTrustProfileSheet } from './CaptainTrustProfileSheet';
import { ApplicationReviewCard } from './ApplicationReviewCard';
import { useUserVerifiedCredentials } from '../hooks/useUserVerifiedCredentials';
import { useUserReputationProfile } from '../hooks/useReputation';

interface TeamPuzzleStripProps {
  slots: TeamSlot[];
  progressLabel?: string;
  viewerPuzzleMatch?: ViewerPuzzleMatch | null;
  compatibilityPercent?: number | null;
  /** detail：横向紧凑；list：完整纵向 */
  variant?: 'list' | 'detail';
  post?: RecruitmentPostCard;
  postId?: string;
  approvedMembers?: RecruitmentApplicationCard[];
  onOpenCaptainProfile?: () => void;
  /** 队长管理页 — 点击队员打开完整申请详情 */
  memberDetailMode?: 'trust' | 'application';
  /** 详情页 header 已展示队长时，拼图条省略队长位 */
  hideCaptainSlot?: boolean;
  className?: string;
}

function PuzzleMemberTrustSheet({
  member,
  open,
  onOpenChange,
}: {
  member: RecruitmentApplicationCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const embedded = member?.applicantVerifiedCredentials;
  const { data: fetchedCredentials, isLoading: credentialsLoading } = useUserVerifiedCredentials(
    member?.applicantUserId,
    {
      postId: member?.postId,
      cardTitle: member?.applicantCardTitle,
      mbtiType: member?.applicantMbtiType,
      initialData: embedded,
      enabled: open && Boolean(member),
    }
  );
  const { data: reputationProfile } = useUserReputationProfile(
    open && member?.applicantUserId ? member.applicantUserId : undefined
  );

  const baseCredentials = pickRicherApplicantCredentials(embedded, fetchedCredentials ?? null);
  const reputationStars =
    member?.applicantReputationStars ?? reputationProfile?.averageStars ?? null;

  const credentials = useMemo(() => {
    if (!baseCredentials) return null;
    const enriched = enrichVerifiedCredentialsDossier(baseCredentials, { reputationStars });
    return sanitizeMemberApplicantCredentials(enriched, member.applicantDisplayName);
  }, [baseCredentials, reputationStars, member?.applicantDisplayName]);

  if (!member) return null;

  if (credentialsLoading && !credentials) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载队员背书…
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (
    credentials &&
    ((credentials.dossier?.educationTags?.length ?? 0) > 0 ||
      (credentials.dossier?.professionTags?.length ?? 0) > 0 ||
      credentials.education?.verified ||
      credentials.profession?.verified ||
      credentials.zhimaCredit?.verified)
  ) {
    return (
      <CaptainTrustProfileSheet
        credentials={credentials}
        subtitle={`${member.applicantCardTitle} · ${member.applicantInteractionModeLabel}`}
        reputationStars={reputationStars}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <PuzzleMemberApplicationDialog member={member} open={open} onOpenChange={onOpenChange} />
  );
}

function PuzzleMemberApplicationDialog({
  member,
  post,
  open,
  onOpenChange,
}: {
  member: RecruitmentApplicationCard | null;
  post?: RecruitmentPostCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const displayMember = useMemo(() => {
    if (!member) return null;
    return post ? enrichApplicationMatchInsights(member, post) : member;
  }, [member, post]);

  if (!displayMember) return null;

  const identitySubtitle = formatMemberIdentityLabel({
    displayName: resolveApplicantRealName(
      displayMember,
      displayMember.applicantVerifiedCredentials
    ),
    cardTitle: resolveApplicantCardTitle(
      displayMember,
      displayMember.applicantVerifiedCredentials
    ),
    interactionModeLabel: displayMember.applicantInteractionModeLabel,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StackedDialogContent className="max-h-[min(88vh,720px)] max-w-lg overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>队员详情</DialogTitle>
          {identitySubtitle && (
            <DialogDescription>{identitySubtitle}</DialogDescription>
          )}
        </DialogHeader>
        <ApplicationReviewCard
          application={displayMember}
          embedded
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </StackedDialogContent>
    </Dialog>
  );
}

function PuzzleSlotChip({
  slot,
  postId,
  approvedMembers,
  allSlots,
  onOpenCaptainProfile,
  onOpenMemberProfile,
  compact,
}: {
  slot: TeamSlot;
  postId?: string;
  approvedMembers?: RecruitmentApplicationCard[];
  allSlots?: TeamSlot[];
  onOpenCaptainProfile?: () => void;
  onOpenMemberProfile: (member: RecruitmentApplicationCard) => void;
  compact?: boolean;
}) {
  const label =
    slot.kind === 'open' ? displayPuzzleSlotLabel(slot) : slot.label.trim() || displayPuzzleSlotLabel(slot);
  const isOccupied = slot.kind === 'captain' || slot.kind === 'filled';
  const memberApp =
    slot.kind === 'filled' && postId
      ? resolvePuzzleMemberApplication(slot, postId, approvedMembers, allSlots)
      : null;
  const clickable =
    slot.kind === 'captain'
      ? Boolean(onOpenCaptainProfile)
      : slot.kind === 'filled' && Boolean(memberApp);

  const chipClass = cn(
    compact
      ? 'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]'
      : 'inline-flex max-w-full flex-col gap-0.5 rounded-md border px-2 py-1 text-xs',
    isOccupied
      ? compact
        ? cn('border', plazaChip.puzzleFilled)
        : 'border-border bg-muted/40 text-foreground'
      : slot.highlightForViewer
        ? compact
          ? cn('border', plazaChip.puzzleHighlight)
          : 'animate-pulse border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] text-[var(--gate-suggest-foreground)] shadow-sm'
        : compact
          ? cn('border', plazaChip.puzzleOpen)
          : 'border-dashed border-border bg-background text-muted-foreground',
    clickable && 'cursor-pointer transition-opacity hover:opacity-80'
  );

  const content = (
    <>
      <span className={cn('inline-flex items-center gap-1', !compact && slot.aiRationale && 'w-full')}>
        {isOccupied ? (
          <UserRound className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <Puzzle className={cn('shrink-0 opacity-70', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />
        )}
        <span className="truncate">{label}</span>
      </span>
      {!compact && slot.aiRationale && (
        <span className="pl-4 text-[10px] leading-snug opacity-75">AI：{slot.aiRationale}</span>
      )}
    </>
  );

  if (!clickable) {
    return <span className={chipClass}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={cn(chipClass, 'text-left')}
      aria-label={slot.kind === 'captain' ? '查看队长名片' : `查看 ${label} 详情`}
      onClick={(event) => {
        event.stopPropagation();
        if (slot.kind === 'captain') {
          onOpenCaptainProfile?.();
          return;
        }
        if (memberApp) onOpenMemberProfile(memberApp);
      }}
    >
      {content}
    </button>
  );
}

/** 3.7.1 车队拼图进度 — POMDP v1 缺位 + 浏览者拼图横幅（≥80% 才显示灵魂拼图） */
export function TeamPuzzleStrip({
  slots,
  progressLabel = '车队拼图进度',
  viewerPuzzleMatch,
  compatibilityPercent,
  variant = 'list',
  post,
  postId,
  approvedMembers,
  onOpenCaptainProfile,
  memberDetailMode = 'application',
  hideCaptainSlot = false,
  className,
}: TeamPuzzleStripProps) {
  const [memberProfile, setMemberProfile] = useState<RecruitmentApplicationCard | null>(null);
  const resolvedPostId = postId ?? post?.id;
  const displaySlots = hideCaptainSlot
    ? filterCaptainPuzzleSlotsForDetail(slots, post)
    : slots;

  if (!displaySlots.length) return null;

  const isDetail = variant === 'detail';
  const banner = resolvePuzzleBanner(viewerPuzzleMatch, compatibilityPercent);
  const showSoulBanner = banner?.tone === 'soul';
  const openSlots = displaySlots.filter((s) => s.kind === 'open');
  const clickableFilledCount =
    resolvedPostId != null
      ? displaySlots.filter(
          (slot) =>
            slot.kind === 'filled' &&
            resolvePuzzleMemberApplication(slot, resolvedPostId, approvedMembers, slots)
        ).length
      : 0;

  const slotProps = {
    postId: resolvedPostId,
    approvedMembers,
    allSlots: slots,
    onOpenCaptainProfile,
    onOpenMemberProfile: setMemberProfile,
  };

  const memberDialog =
    memberDetailMode === 'application' ? (
      <PuzzleMemberApplicationDialog
        member={memberProfile}
        post={post}
        open={Boolean(memberProfile)}
        onOpenChange={(open) => !open && setMemberProfile(null)}
      />
    ) : (
      <PuzzleMemberTrustSheet
        member={memberProfile}
        open={Boolean(memberProfile)}
        onOpenChange={(open) => !open && setMemberProfile(null)}
      />
    );

  if (isDetail) {
    return (
      <>
        <div className={cn('space-y-2', className)}>
          {showSoulBanner && (
            <p className="flex items-center gap-1.5 rounded-md border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] px-2.5 py-1.5 text-xs font-medium text-[var(--gate-suggest-foreground)]">
              <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" aria-hidden />
              {banner!.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Puzzle className="h-3.5 w-3.5" aria-hidden />
              {progressLabel}
            </span>
            {displaySlots.map((slot) => (
              <PuzzleSlotChip key={slot.id} slot={slot} compact {...slotProps} />
            ))}
          </div>

          {clickableFilledCount > 0 && memberDetailMode === 'application' && (
            <p className="text-[11px] text-muted-foreground">
              点击带人像图标的已入队队员胶囊查看完整详情
            </p>
          )}

          {openSlots.some((s) => s.highlightForViewer && s.aiRationale) && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              AI · {openSlots.find((s) => s.highlightForViewer)?.aiRationale}
            </p>
          )}
        </div>

        {memberDialog}
      </>
    );
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {showSoulBanner && (
          <p className="flex items-center gap-1.5 rounded-md border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] px-2.5 py-1.5 text-xs font-medium text-[var(--gate-suggest-foreground)]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" aria-hidden />
            {banner!.message}
          </p>
        )}
        {banner?.tone === 'soft' && (
          <p className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <Puzzle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {banner.message}
          </p>
        )}

        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Puzzle className="h-3.5 w-3.5" aria-hidden />
          {progressLabel}
        </p>
        <div className="flex flex-col gap-2">
          {displaySlots.map((slot, index) => (
            <div key={slot.id} className="flex flex-wrap items-start gap-1.5">
              {index > 0 && (
                <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
                  +
                </span>
              )}
              <PuzzleSlotChip slot={slot} {...slotProps} />
            </div>
          ))}
        </div>
      </div>

      {memberDialog}
    </>
  );
}
