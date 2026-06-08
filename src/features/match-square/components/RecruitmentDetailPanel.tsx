import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { toast } from 'sonner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CaptainTrustProfileSheet } from './CaptainTrustProfileSheet';
import { ApplyToRecruitmentDialog } from './ApplyToRecruitmentDialog';
import { PermissionGateBanner } from './PermissionGateBanner';
import { ContractInterpretationSection } from './ContractInterpretationSection';
import { ItineraryTimelineSection } from './ItineraryTimelineSection';
import { HardGatesSummaryStrip } from './HardGatesSummaryStrip';
import { MatchInsightGatePrompt } from './MatchInsightGatePrompt';
import { RecruitmentDetailActionBar } from './RecruitmentDetailActionBar';
import { RecruitmentDetailHeader } from './RecruitmentDetailHeader';
import {
  useApplyPreview,
  useMatchSquareAccess,
  useMyApplications,
  usePostApplications,
  usePostDetail,
} from '../hooks/useMatchSquare';
import { usePlazaMatchContext } from '../hooks/usePlazaMatchContext';
import { prepareDetailPost } from '../lib/prepare-detail-post';
import { formatHardGatesInline } from '../lib/build-hard-gates-summary';
import { resolveTeamSlots } from '../lib/slot-filling';
import { approvedMembersFromOccupiedPuzzleSlots, preferRealApprovedMembers } from '../lib/team-puzzle';
import { isPostCaptain } from '../lib/mock-data';
import { TeamPuzzleStrip } from './TeamPuzzleStrip';
import { TrekPlazaBridgeSection } from './TrekPlazaBridgeSection';
import { TrekkingOrchestrationPanel } from './TrekkingOrchestrationPanel';
import { RouteTemplateMatchPanel } from './RouteTemplateMatchPanel';
import { RouteTemplateBindingStrip } from './RouteTemplateBindingStrip';
import { canShowForceLockEntry } from '../lib/sovereign-force-lock/resolve-force-lock-visibility';
import { RouteContractVaultPanel } from './RouteContractVaultPanel';
import { SovereignForceLockEntry } from './SovereignForceLockPanel';
import { catalogEntryToMatchPlan, getCatalogEntryById } from '../lib/route-template-plaza-bridge';
import { buildRouteContractLockPlan } from '../lib/route-contract-vault';
import { normalizeActiveTripPath } from '@/features/active-trip/lib/normalize-active-trip-path';
import {
  plazaLayout,
  plazaReview,
  plazaBanner,
  plazaOverview,
  plazaDetail,
} from '../lib/plaza-visual';

interface RecruitmentDetailPanelProps {
  postId: string;
  /** page：独立详情页；dialog：广场弹窗 */
  variant?: 'page' | 'dialog';
  className?: string;
}

/** 招募详情正文 — 页面与弹窗共用 */
export function RecruitmentDetailPanel({
  postId,
  variant = 'page',
  className,
}: RecruitmentDetailPanelProps) {
  const { data: postRaw, isLoading, isError } = usePostDetail(postId);
  const { data: access } = useMatchSquareAccess();
  const { data: applyPreview } = useApplyPreview(postId, Boolean(postId));
  const {
    viewerScores,
    viewerProfile,
    viewerCredentials,
    viewerMbtiType,
    personaLabel,
    memberTrip,
  } = usePlazaMatchContext();
  const [applyOpen, setApplyOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);

  const gate = access ?? {
    canBrowse: true,
    canPost: false,
    canApply: false,
    quizComplete: false,
  };

  const { data: myApplications } = useMyApplications(true);
  const isCaptain = postRaw ? isPostCaptain(postRaw) : false;
  const viewerApprovedOnPost =
    postRaw?.viewerApplicationStatus === 'approved' ||
    myApplications?.some((app) => app.postId === postId && app.status === 'approved');
  const { data: postApplications } = usePostApplications(
    isCaptain || viewerApprovedOnPost ? postId : undefined
  );
  const approvedApplications = useMemo(
    () => postApplications?.filter((app) => app.status === 'approved') ?? [],
    [postApplications]
  );
  const puzzleApprovedMembers = useMemo(() => {
    const fromCaptain = approvedApplications;
    const fromViewer =
      myApplications?.filter((app) => app.postId === postId && app.status === 'approved') ?? [];
    const slots = postRaw?.teamPuzzle?.slots ?? postRaw?.teamSlots ?? [];
    const fromSlots = approvedMembersFromOccupiedPuzzleSlots(postId, slots);
    const seen = new Set<string>();
    return preferRealApprovedMembers(
      [...fromCaptain, ...fromViewer, ...fromSlots].filter((app) => {
        const key = `${app.applicantUserId}:${app.applicantDisplayName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }, [approvedApplications, myApplications, postId, postRaw?.teamPuzzle?.slots, postRaw?.teamSlots]);

  const post = useMemo(() => {
    if (!postRaw) return null;
    return prepareDetailPost(postRaw, {
      viewerScores,
      viewerCredentials,
      viewerMbtiType,
      viewerPersonaLabel: personaLabel,
      memberTrip,
      myApplications,
      approvedApplications,
      applyPreview,
    });
  }, [
    postRaw,
    viewerScores,
    viewerCredentials,
    viewerMbtiType,
    personaLabel,
    memberTrip,
    myApplications,
    approvedApplications,
    applyPreview,
  ]);

  const isDialog = variant === 'dialog';
  const stackClass = isDialog ? plazaDetail.dialogStack : plazaDetail.pageStack;
  const sectionClass = isDialog ? plazaDetail.dialogSection : plazaDetail.pageSection;
  const overviewInner = isDialog ? plazaDetail.dialogOverviewInner : plazaOverview.block;

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          isDialog ? 'min-h-[40vh] py-12' : 'min-h-[50vh]',
          className
        )}
      >
        <LogoLoading size={40} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 text-center',
          isDialog ? 'min-h-[30vh] px-4 py-10' : 'min-h-[50vh]',
          className
        )}
      >
        <p className="text-muted-foreground">招募帖不存在或已下架</p>
        {!isDialog && (
          <Button variant="outline" asChild>
            <Link to="/dashboard/tripnara/plaza">返回广场</Link>
          </Button>
        )}
      </div>
    );
  }

  const captain = isPostCaptain(post);
  const teamworkBlocked = post.teamworkMatchBlocked === true;
  const recommendationHidden = post.recommendationHidden === true;
  const teamSlots = resolveTeamSlots(
    post,
    captain ? null : viewerProfile,
    puzzleApprovedMembers
  );
  const canViewMatchInsight = gate.quizComplete && post.compatibilityPercent != null;
  const hardGatesInline = formatHardGatesInline(post);
  const boundTemplatePlan = post.routeTemplateCatalogId
    ? (() => {
        const entry = getCatalogEntryById(post.routeTemplateCatalogId!);
        return entry ? catalogEntryToMatchPlan(entry) : null;
      })()
    : null;
  const routeContractPlan = post.routeTemplateCatalogId
    ? buildRouteContractLockPlan(post.routeTemplateCatalogId, post.planningStyle)
    : null;
  const activeTripPath = normalizeActiveTripPath(
    post.tripInstantiationResult?.activeTripPath,
    post.tripInstantiationResult?.tripId
  );

  const body = (
    <div
      className={cn(
        stackClass,
        !isDialog && cn(plazaLayout.content, 'pb-20'),
        className
      )}
    >
      <section
        className={cn(
          isDialog ? sectionClass : plazaReview.overviewCard,
          overviewInner
        )}
        aria-label="招募概览"
      >
        <RecruitmentDetailHeader
          embedded
          compact={isDialog}
          post={post}
          showCompatibility={canViewMatchInsight && !captain}
          onOpenTrustProfile={() => setTrustOpen(true)}
        />

        {teamSlots.length > 0 && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <TeamPuzzleStrip
              variant="detail"
              slots={teamSlots}
              progressLabel={post.teamPuzzle?.progressLabel ?? '车队拼图进度'}
              viewerPuzzleMatch={
                canViewMatchInsight && !captain ? post.teamPuzzle?.viewerPuzzleMatch : null
              }
              compatibilityPercent={captain ? null : post.compatibilityPercent}
              post={post}
              approvedMembers={puzzleApprovedMembers}
              memberDetailMode="application"
              hideCaptainSlot
              onOpenCaptainProfile={() => setTrustOpen(true)}
            />
          </>
        )}

        {captain && (post.sovereignLock || canShowForceLockEntry(post)) && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <SovereignForceLockEntry post={post} />
          </>
        )}

        {hardGatesInline && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <HardGatesSummaryStrip embedded compact post={post} />
          </>
        )}

        {post.routeTemplateBinding && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <RouteTemplateBindingStrip binding={post.routeTemplateBinding} />
          </>
        )}

        {boundTemplatePlan && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <RouteTemplateMatchPanel plan={boundTemplatePlan} variant="detail" />
          </>
        )}

        {routeContractPlan && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <RouteContractVaultPanel plan={routeContractPlan} variant="detail" />
          </>
        )}

        {activeTripPath && post.tripInstantiationResult?.tripId && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Active Trip 已就绪</p>
              <p className="mt-1 text-xs text-muted-foreground">
                成团转流已完成 · 策略{' '}
                {post.tripInstantiationResult.plan?.strategy ?? 'generic_plaza_trip'}
              </p>
              <Button size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link to={activeTripPath}>进入 Active Trip</Link>
              </Button>
            </div>
          </>
        )}

        {(post.trekkingOrchestration || post.routeDirectionId != null) && (
          <>
            <div className={plazaOverview.divider} role="separator" />
            {post.trekkingOrchestration ? (
              <TrekkingOrchestrationPanel
                plan={post.trekkingOrchestration}
                post={post}
                variant="detail"
              />
            ) : (
              <TrekPlazaBridgeSection post={post} compact={isDialog} />
            )}
          </>
        )}
      </section>

      {!captain && !canViewMatchInsight && (
        <MatchInsightGatePrompt className={cn(sectionClass, 'p-3.5')} />
      )}

      <section className={cn(sectionClass, plazaDetail.sectionBody, 'text-sm')}>
        <h2 className="font-semibold text-foreground">行程安排</h2>
        <ItineraryTimelineSection summary={post.itinerarySummary} />
      </section>

      {post.captainMessage && (
        <section className={cn(sectionClass, plazaDetail.sectionBody, 'text-sm')}>
          <h2 className="font-semibold text-foreground">队长寄语</h2>
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span>&ldquo;{post.captainMessage}&rdquo;</span>
          </p>
        </section>
      )}

      {!gate.canApply && !captain && <PermissionGateBanner access={gate} action="apply" />}

      {recommendationHidden && (
        <div className={cn(plazaBanner.base, plazaBanner.confirm, 'py-2.5')} role="alert">
          <p className="text-sm">
            {post.recommendationHiddenReason ??
              '该招募因履约风险已从广场推荐中隐藏，请谨慎评估是否继续申请。'}
          </p>
        </div>
      )}
    </div>
  );

  const manageHref = `/dashboard/tripnara/plaza/manage/${post.id}`;

  return (
    <>
      {isDialog ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain',
              plazaDetail.dialogScroll
            )}
          >
            {body}
          </div>
          <RecruitmentDetailActionBar
            embedded
            post={post}
            captain={captain}
            canApply={gate.canApply}
            teamworkBlocked={teamworkBlocked}
            recommendationHidden={recommendationHidden}
            onApply={() => setApplyOpen(true)}
            manageHref={manageHref}
          />
        </div>
      ) : (
        <>
          {body}
          <RecruitmentDetailActionBar
            post={post}
            captain={captain}
            canApply={gate.canApply}
            teamworkBlocked={teamworkBlocked}
            recommendationHidden={recommendationHidden}
            onApply={() => setApplyOpen(true)}
            manageHref={manageHref}
          />
        </>
      )}

      <ApplyToRecruitmentDialog
        postId={post.id}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onSuccess={() => toast.success('申请已提交')}
      />

      <CaptainTrustProfileSheet post={post} open={trustOpen} onOpenChange={setTrustOpen} />
    </>
  );
}
