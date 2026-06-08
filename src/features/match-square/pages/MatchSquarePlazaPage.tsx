import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { cn } from '@/lib/utils';
import type { PlazaFeedItem, PostListFilters } from '@/types/match-square';
import { RecruitmentCard } from '../components/RecruitmentCard';
import { MatchFlashCard } from '../components/MatchFlashCard';
import { OliveBranchInboxBanner } from '../components/OliveBranchInboxBanner';
import { PlazaViewerContextStrip } from '../components/PlazaViewerContextStrip';
import { PlazaCommandBar } from '../components/PlazaCommandBar';
import { PlazaFiltersBar } from '../components/PlazaFilters';
import { PlazaSkeleton } from '../components/PlazaSkeleton';
import { PermissionGateBanner } from '../components/PermissionGateBanner';
import { PendingReputationBanner } from '../components/PendingReputationBanner';
import { ApplyToRecruitmentDialog } from '../components/ApplyToRecruitmentDialog';
import { RecruitmentDetailDialog } from '../components/RecruitmentDetailDialog';
import { useMatchSquareAccess, useMatchSquarePlaza, useMyApplications, useMyPosts } from '../hooks/useMatchSquare';
import { usePlazaMatchContext } from '../hooks/usePlazaMatchContext';
import { buildApplicationStatusMap, mergePostApplicationStatus } from '../lib/application-status';
import { filterPlazaFeedForViewer, resolvePlazaFeed } from '../lib/plaza-feed';
import { resolveTeamSlots } from '../lib/slot-filling';
import { plazaLayout } from '../lib/plaza-visual';

export default function MatchSquarePlazaPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PostListFilters>({ offset: 0 });

  const handleFiltersChange = (next: PostListFilters) => {
    setFilters({ ...next, offset: 0 });
  };
  const [applyTargetId, setApplyTargetId] = useState<string | null>(null);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const { data: access } = useMatchSquareAccess();
  const { data, isLoading, isFetching, isError, refetch } = useMatchSquarePlaza(filters);
  const { personaLabel, tripIntent, viewerScores, viewerProfile, viewerCredentials, viewerMbtiType, memberTrip, credentialsLoading } =
    usePlazaMatchContext();

  const gate = access ?? {
    canBrowse: true,
    canPost: false,
    canApply: false,
    quizComplete: false,
  };

  const { data: myApplications } = useMyApplications(gate.canApply);
  const { data: myPostsData } = useMyPosts(true);

  const ownPostIds = useMemo(
    () => new Set((myPostsData?.items ?? []).map((post) => post.id)),
    [myPostsData?.items]
  );

  const applicationMap = useMemo(
    () => buildApplicationStatusMap(myApplications ?? []),
    [myApplications]
  );

  const feed = useMemo(() => {
    const merged = resolvePlazaFeed(
      data,
      { viewerScores, viewerCredentials, viewerMbtiType, memberTrip },
      viewerProfile
    ).map((item) => ({
      ...item,
      post: mergePostApplicationStatus(item.post, applicationMap),
    })) as PlazaFeedItem[];
    return filterPlazaFeedForViewer(merged, { excludeOwnPosts: true, ownPostIds });
  }, [data, viewerScores, viewerProfile, viewerCredentials, viewerMbtiType, memberTrip, applicationMap, ownPostIds]);

  const hasPosts = feed.length > 0;

  return (
    <div className={plazaLayout.page}>
      <div className={plazaLayout.header}>
        <DashboardSubpageHeader
          backTo="/dashboard"
          title="搭子广场"
          subtitle="Match Square · 结构化招募与智能撮合"
          maxWidth="4xl"
          className={cn('bg-transparent', plazaLayout.headerText)}
        />
      </div>

      <div className={plazaLayout.content}>
        <PendingReputationBanner />
        <OliveBranchInboxBanner />

        <PlazaCommandBar
          hint={
            isFetching && !isLoading
              ? '刷新中…'
              : '契合度基于当前人格与出行状态动态计算'
          }
          actions={
            <>
              {gate.canPost ? (
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => navigate('/dashboard/tripnara/plaza/new')}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  发起招募
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" asChild>
                  <Link to="/dashboard/tripnara/odyssey">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    发起招募
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" asChild>
                <Link to="/dashboard/tripnara/plaza/my">
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  我的
                </Link>
              </Button>
            </>
          }
        >
          <PlazaViewerContextStrip
            embedded
            personaLabel={personaLabel}
            tripIntent={tripIntent}
            viewerCredentials={viewerCredentials}
            credentialsLoading={credentialsLoading}
            showTravelIntent={gate.canApply}
          />
        </PlazaCommandBar>

        {!gate.canApply && <PermissionGateBanner access={gate} action="apply" />}

        <PlazaFiltersBar filters={filters} onChange={handleFiltersChange} />

        {isLoading ? (
          <PlazaSkeleton />
        ) : isError ? (
          <div className="space-y-3 py-16 text-center text-sm">
            <p className="text-muted-foreground">招募列表加载失败，请检查登录状态或稍后重试</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              重新加载
            </Button>
          </div>
        ) : !hasPosts ? (
          <div className="space-y-3 py-16 text-center text-sm text-muted-foreground">
            {data?.items?.length || data?.feedItems?.length ? (
              <>
                <p>当前筛选下没有可见招募帖</p>
                <p className="text-xs">部分帖子可能因 Hard Gate 或推荐策略被隐藏</p>
              </>
            ) : (
              <p>暂无招募帖，试试调整筛选条件或稍后再来</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {feed.map((entry) =>
              entry.kind === 'match_flash' ? (
                <MatchFlashCard
                  key={`flash-${entry.post.id}`}
                  post={entry.post}
                  flash={entry.flash}
                  slots={resolveTeamSlots(entry.post, viewerProfile)}
                  showApply={gate.canApply && !entry.post.teamworkMatchBlocked}
                  onFlashApply={() => setApplyTargetId(entry.post.id)}
                  onFlashChat={() => setDetailPostId(entry.post.id)}
                />
              ) : (
                <RecruitmentCard
                  key={entry.post.id}
                  post={entry.post}
                  viewerProfile={viewerProfile}
                  showApply={gate.canApply && !entry.post.teamworkMatchBlocked}
                  onApply={() => setApplyTargetId(entry.post.id)}
                  onOpenDetail={setDetailPostId}
                />
              )
            )}
          </div>
        )}
      </div>

      {applyTargetId && (
        <ApplyToRecruitmentDialog
          postId={applyTargetId}
          open={Boolean(applyTargetId)}
          onOpenChange={(open) => !open && setApplyTargetId(null)}
        />
      )}

      <RecruitmentDetailDialog
        postId={detailPostId}
        open={Boolean(detailPostId)}
        onOpenChange={(open) => !open && setDetailPostId(null)}
      />
    </div>
  );
}
