import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Radar } from 'lucide-react';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RecruitmentCard } from '../components/RecruitmentCard';
import { RecruitmentDetailDialog } from '../components/RecruitmentDetailDialog';
import { PlazaSkeleton } from '../components/PlazaSkeleton';
import { useMatchSquareAccess, useMyRecruitmentHub } from '../hooks/useMatchSquare';
import { usePlazaMatchContext } from '../hooks/usePlazaMatchContext';
import { ApplicationDecisionInboxBanner } from '../components/ApplicationDecisionInboxBanner';
import { TeamFormationInboxBanner } from '../components/TeamFormationInboxBanner';
import {
  ACCOUNT_GOVERNANCE_SETTINGS_PATH,
  TRUSTED_PROJECT_CREATE_PATH,
  TRUSTED_PROJECTS_MARKET_PATH,
} from '@/lib/trusted-projects-routes';
import { APPLICATION_STATUS_LABELS } from '../lib/application-status';
import { plazaLayout } from '../lib/plaza-visual';

type MyRecruitmentTab = 'published' | 'applied';

function RadarHintStrip({
  eligibleCount,
  topPickDisplayName,
}: {
  eligibleCount: number;
  topPickDisplayName?: string | null;
}) {
  if (eligibleCount <= 0) return null;
  const namePart = topPickDisplayName ? `，其中「${topPickDisplayName}」极度契合` : '';
  return (
    <p className="flex items-center gap-1.5 rounded-lg border border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] px-3 py-2 text-xs text-[var(--gate-suggest-foreground)]">
      <Radar className="h-3.5 w-3.5 shrink-0" aria-hidden />
      系统雷达发现 {eligibleCount} 位挂起意向的自由旅伴{namePart}
    </p>
  );
}

function PublishedEmptyState({
  canPost,
  onCreate,
}: {
  canPost: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">你还没有发布过招募帖</p>
      {canPost ? (
        <Button onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          发布第一条招募
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link to={ACCOUNT_GOVERNANCE_SETTINGS_PATH}>申请发布权限后发布可信项目</Link>
        </Button>
      )}
    </div>
  );
}

function AppliedEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">你还没有申请加入任何招募</p>
      <Button variant="outline" asChild>
        <Link to="/dashboard/tripnara/plaza">去广场看看招募</Link>
      </Button>
    </div>
  );
}

export default function MyRecruitmentsPage() {
  const navigate = useNavigate();
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [tab, setTab] = useState<MyRecruitmentTab>('published');
  const { data: access } = useMatchSquareAccess();
  const { data, isLoading, isError } = useMyRecruitmentHub();
  const { viewerProfile } = usePlazaMatchContext();

  const gate = access ?? {
    canBrowse: true,
    canPost: false,
    canApply: false,
    quizComplete: false,
  };

  const published = data?.published ?? [];
  const applied = data?.applied ?? [];
  const totalCount = published.length + applied.length;

  return (
    <div className={plazaLayout.page}>
      <div className={plazaLayout.header}>
        <DashboardSubpageHeader
          backTo="/dashboard/tripnara/plaza"
          title="我的招募"
          subtitle="你发起的招募帖与入队申请"
          maxWidth="4xl"
          className={cn('bg-transparent', plazaLayout.headerText)}
        />
      </div>

      <div className={plazaLayout.content}>
        <ApplicationDecisionInboxBanner />
        <TeamFormationInboxBanner />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? '加载中…'
              : `共 ${totalCount} 条 · 发起 ${published.length} · 申请 ${applied.length}`}
          </p>
          {gate.canPost ? (
            <Button size="sm" onClick={() => navigate(TRUSTED_PROJECT_CREATE_PATH)}>
              <Plus className="mr-1.5 h-4 w-4" />
              发布可信项目
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to={ACCOUNT_GOVERNANCE_SETTINGS_PATH}>
                <Plus className="mr-1.5 h-4 w-4" />
                发布可信项目
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <PlazaSkeleton count={2} />
        ) : isError ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            加载失败，请稍后重试
          </p>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">你还没有发布招募，也没有入队申请</p>
            {gate.canPost ? (
              <Button onClick={() => navigate(TRUSTED_PROJECT_CREATE_PATH)}>
                <Plus className="mr-1.5 h-4 w-4" />
                发布第一条可信项目
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to={TRUSTED_PROJECTS_MARKET_PATH}>浏览可信项目市场</Link>
              </Button>
            )}
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as MyRecruitmentTab)}
            className="mt-4 space-y-4"
          >
            <TabsList className="grid h-10 w-full max-w-md grid-cols-2">
              <TabsTrigger value="published" className="cursor-pointer">
                我发起的
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                  {published.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="applied" className="cursor-pointer">
                我申请的
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                  {applied.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="published" className="mt-0 space-y-2">
              {published.length === 0 ? (
                <PublishedEmptyState
                  canPost={gate.canPost}
                  onCreate={() => navigate(TRUSTED_PROJECT_CREATE_PATH)}
                />
              ) : (
                published.map((post) => (
                  <div key={post.id} className="space-y-2">
                    {post.status === 'active' && post.radarHint && (
                      <RadarHintStrip
                        eligibleCount={post.radarHint.eligibleCount}
                        topPickDisplayName={post.radarHint.topPickDisplayName}
                      />
                    )}
                    <RecruitmentCard
                      post={post}
                      showManage
                      showStatus
                      onOpenDetail={setDetailPostId}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="applied" className="mt-0 space-y-2">
              {applied.length === 0 ? (
                <AppliedEmptyState />
              ) : (
                applied.map(({ application, post }) => (
                  <div key={`${post.id}-${application.id}`} className="space-y-1.5">
                    <p className="px-1 text-[11px] text-muted-foreground">
                      申请状态 · {APPLICATION_STATUS_LABELS[application.status]}
                    </p>
                    <RecruitmentCard
                      post={post}
                      showStatus
                      viewerProfile={viewerProfile}
                      onOpenDetail={setDetailPostId}
                    />
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <RecruitmentDetailDialog
        postId={detailPostId}
        open={Boolean(detailPostId)}
        onOpenChange={(open) => !open && setDetailPostId(null)}
      />
    </div>
  );
}
