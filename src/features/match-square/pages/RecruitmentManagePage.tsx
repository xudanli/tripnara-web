import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApplicationReviewCard } from '../components/ApplicationReviewCard';
import { CaptainRadarPanel } from '../components/CaptainRadarPanel';
import { TeamPuzzleStrip } from '../components/TeamPuzzleStrip';
import { CaptainTrustProfileSheet } from '../components/CaptainTrustProfileSheet';
import { TrekkingOrchestrationPanel } from '../components/TrekkingOrchestrationPanel';
import { SpawnTrekTripPanel } from '../components/SpawnTrekTripPanel';
import { InstantiateTripPanel } from '../components/InstantiateTripPanel';
import { RouteContractVaultPanel } from '../components/RouteContractVaultPanel';
import { SovereignForceLockEntry } from '../components/SovereignForceLockPanel';
import { RecruitmentStatusQuickActions } from '../components/RecruitmentStatusQuickActions';
import { RecruitmentStatusBadge } from '../components/RecruitmentStatusBadge';
import { buildRouteContractLockPlan } from '../lib/route-contract-vault';
import {
  usePostApplications,
  usePostDetail,
  useReviewApplication,
} from '../hooks/useMatchSquare';
import { plazaLayout } from '../lib/plaza-visual';
import { enrichApplicationsWithDecisionBriefs } from '../lib/decision-engine/enrich-application-decision-brief';
import { enrichApplicationsWithMatchInsights } from '../lib/match-enrichment';
import { resolveTeamSlots } from '../lib/slot-filling';
import { mergeApprovedMembersIntoPost } from '../lib/team-puzzle';
import { buildReviewAttributionContext } from '../lib/recruiting-attribution.util';
import { RecruitingOutcomeSection } from '../components/RecruitingOutcomeSection';
import { useAuth } from '@/hooks/useAuth';
import { isSelfEvolutionEnabled } from '@/lib/self-evolution-feature';
import { CalibrationStatus, onRecruitmentMatched } from '@/features/self-evolution';

export default function RecruitmentManagePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const selfEvolutionEnabled = isSelfEvolutionEnabled();
  const { data: post, isLoading: detailLoading } = usePostDetail(id);
  const { data: applications, isLoading: appsLoading, isError: appsError, refetch: refetchApps } =
    usePostApplications(id, 'pending');
  const { data: allApplications } = usePostApplications(id);
  const approvedCount =
    allApplications?.filter((app) => app.status === 'approved').length ?? 0;
  const review = useReviewApplication();
  const [captainTrustOpen, setCaptainTrustOpen] = useState(false);

  const approvedApplications = useMemo(
    () => allApplications?.filter((app) => app.status === 'approved') ?? [],
    [allApplications]
  );

  const displayPost = useMemo(() => {
    if (!post) return null;
    if (!approvedApplications.length) return post;
    return mergeApprovedMembersIntoPost(post, { approvedApplications });
  }, [post, approvedApplications]);

  const approvedMemberCards = useMemo(
    () =>
      post && approvedApplications.length
        ? enrichApplicationsWithMatchInsights(
            enrichApplicationsWithDecisionBriefs(approvedApplications, post),
            post
          )
        : approvedApplications,
    [approvedApplications, post]
  );

  const teamSlots = useMemo(
    () =>
      displayPost ? resolveTeamSlots(displayPost, undefined, approvedMemberCards) : [],
    [displayPost, approvedMemberCards]
  );

  const pendingApplications = useMemo(
    () =>
      post && applications
        ? enrichApplicationsWithMatchInsights(
            enrichApplicationsWithDecisionBriefs(applications, post),
            post
          )
        : applications,
    [applications, post]
  );

  const handleReview = async (
    applicationId: string,
    action: 'approve' | 'reject',
    manualOverrides?: { captainPreference?: string }
  ) => {
    if (!id || !post) return;
    const application =
      pendingApplications?.find((app) => app.id === applicationId) ??
      allApplications?.find((app) => app.id === applicationId);
    if (!application) return;

    const attributionContext = buildReviewAttributionContext(
      application,
      post,
      approvedApplications,
      manualOverrides
    );

    try {
      await review.mutateAsync({
        postId: id,
        applicationId,
        action,
        attributionContext,
      });
      if (action === 'approve' && selfEvolutionEnabled) {
        onRecruitmentMatched(
          id,
          applicationId,
          (application.compatibilityPercent ?? 0) / 100
        );
      }
      toast.success(action === 'approve' ? '已通过申请' : '已拒绝申请');
    } catch {
      toast.error('操作失败');
    }
  };

  if (detailLoading) {
    return (
      <div className={cn(plazaLayout.page, 'items-center justify-center min-h-[50vh]')}>
        <LogoLoading size={40} />
      </div>
    );
  }

  if (!post) {
    return (
      <div
        className={cn(
          plazaLayout.page,
          'min-h-[50vh] flex-col items-center justify-center gap-4'
        )}
      >
        <p className="text-muted-foreground">招募帖不存在</p>
        <Button variant="outline" asChild>
          <Link to="/dashboard/tripnara/plaza">返回广场</Link>
        </Button>
      </div>
    );
  }

  const routeContractPlan = post.routeTemplateCatalogId
    ? buildRouteContractLockPlan(
        post.routeTemplateCatalogId,
        post.planningStyle ?? post.teamworkStyle ?? 'co_planning'
      )
    : null;

  const teamFull =
    post.status === 'closed' ||
    (post.teamStatus?.slotsRemaining != null && post.teamStatus.slotsRemaining <= 0);

  return (
    <div className={plazaLayout.page}>
      <DashboardSubpageHeader
        backTo={`/dashboard/tripnara/plaza/${id}`}
        title="管理招募"
        subtitle={post.destination}
        maxWidth="4xl"
        className={cn(plazaLayout.header, plazaLayout.headerText)}
      />

      <div className={plazaLayout.content}>
        <div className="flex flex-wrap items-center gap-3">
          <RecruitmentStatusBadge status={post.status} />
          <RecruitmentStatusQuickActions postId={post.id} status={post.status} />
        </div>

        {routeContractPlan && (
          <RouteContractVaultPanel plan={routeContractPlan} variant="manage" />
        )}

        {teamSlots.length > 0 && displayPost && (
          <section className="rounded-xl border border-border bg-card p-4">
            <TeamPuzzleStrip
              variant="detail"
              slots={teamSlots}
              progressLabel={displayPost.teamPuzzle?.progressLabel ?? '车队拼图进度'}
              post={displayPost}
              approvedMembers={approvedMemberCards}
              memberDetailMode="application"
              onOpenCaptainProfile={() => setCaptainTrustOpen(true)}
            />
            {approvedApplications.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                已通过 {approvedApplications.length} 人 · 待审批{' '}
                {pendingApplications?.length ?? 0} 人
              </p>
            )}
          </section>
        )}

        <SovereignForceLockEntry post={post} />

        {(teamFull || post.tripInstantiationResult?.tripId) && (
          <InstantiateTripPanel
            postId={post.id}
            post={post}
            autoOnClosed={teamFull}
          />
        )}

        {post.trekkingOrchestration && (
          <>
            <TrekkingOrchestrationPanel
              plan={post.trekkingOrchestration}
              post={post}
              variant="manage"
            />
            <SpawnTrekTripPanel postId={post.id} post={post} approvedCount={approvedCount} />
          </>
        )}

        {post.status === 'active' && <CaptainRadarPanel postId={post.id} />}

        <RecruitingOutcomeSection outcome={post.outcome} />

        {selfEvolutionEnabled && user?.id && (
          <CalibrationStatus userId={user.id} />
        )}

        {approvedMemberCards.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">已通过队员</h2>
            <div className="space-y-4">
              {approvedMemberCards.map((app) => (
                <ApplicationReviewCard
                  key={app.id}
                  application={app}
                  onApprove={() => undefined}
                  onReject={() => undefined}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">入队申请</h2>
          {appsLoading ? (
            <LogoLoading size={32} />
          ) : appsError ? (
            <div className="space-y-2 text-sm">
              <p className="text-destructive">申请列表加载失败</p>
              <Button size="sm" variant="outline" onClick={() => refetchApps()}>
                重试
              </Button>
            </div>
          ) : !pendingApplications?.length ? (
            <p className="text-sm text-muted-foreground">暂无待审批申请</p>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <ApplicationReviewCard
                  key={app.id}
                  application={app}
                  isReviewing={review.isPending}
                  onApprove={(overrides) => handleReview(app.id, 'approve', overrides)}
                  onReject={(overrides) => handleReview(app.id, 'reject', overrides)}
                  onAskMore={() => toast.info('私信功能即将上线')}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {displayPost && (
        <CaptainTrustProfileSheet
          post={displayPost}
          open={captainTrustOpen}
          onOpenChange={setCaptainTrustOpen}
        />
      )}
    </div>
  );
}
