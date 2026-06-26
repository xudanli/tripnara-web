import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { SystemRecommendationBadge } from '../components/SystemRecommendationBadge';
import {
  useManagedProjectFitApplications,
  useMyProjectFitApplications,
} from '@/hooks/useProjectFit';
import {
  APPLICATION_CENTER_TABS,
  commitmentStatusLabel,
  fitOverallResultLabel,
  formatDepositAmount,
  projectFitApplicationStatusLabel,
} from '@/lib/project-fit-display';
import type { ApplicationCenterItem, ProjectFitApplicationStatus } from '@/types/project-fit';
import { participantPortalHrefFromLink } from '@/features/participant-portal';

type MineTab = 'active' | 'joined' | 'closed';

function filterByTab(items: ApplicationCenterItem[], tab: MineTab): ApplicationCenterItem[] {
  const allowed = new Set(APPLICATION_CENTER_TABS[tab]);
  return items.filter((i) => allowed.has(i.status));
}

function ApplicationList({ items, showApplicant }: { items: ApplicationCenterItem[]; showApplicant?: boolean }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无申请</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.applicationId}>
          <div className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
            <Link
              to={`/dashboard/project-fit/applications/${item.applicationId}`}
              className="block"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.listingTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.destination}
                    {item.startDate && ` · ${format(new Date(item.startDate), 'yyyy/M/d')}`}
                  </p>
                  {showApplicant && item.applicantUserId && (
                    <p className="text-xs text-muted-foreground">申请人 {item.applicantUserId.slice(0, 8)}…</p>
                  )}
                </div>
                <Badge>{projectFitApplicationStatusLabel(item.status)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.fitSummary?.overallResult && (
                  <span>{fitOverallResultLabel(item.fitSummary.overallResult)}</span>
                )}
                {item.commitmentStatus && item.commitmentStatus !== 'NOT_REQUIRED' && (
                  <span>
                    {commitmentStatusLabel(item.commitmentStatus)}
                    {item.depositAmountCents != null && ` · ${formatDepositAmount(item.depositAmountCents)}`}
                  </span>
                )}
                {item.fitSummary?.systemRecommendation && (
                  <SystemRecommendationBadge recommendation={item.fitSummary.systemRecommendation} />
                )}
              </div>
            </Link>
            {item.portalEnrolled && item.participantPortal?.portalPath ? (
              <Button variant="link" size="sm" className="mt-2 h-auto px-0 text-xs" asChild>
                <Link to={participantPortalHrefFromLink(item.participantPortal)}>
                  进入成员门户 →
                </Link>
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectFitApplicationCenterPage() {
  const [mineTab, setMineTab] = useState<MineTab>('active');
  const { data: mineData, isLoading: mineLoading } = useMyProjectFitApplications();
  const { data: managedData, isLoading: managedLoading } = useManagedProjectFitApplications();

  const mineFiltered = useMemo(
    () => filterByTab(mineData?.items ?? [], mineTab),
    [mineData?.items, mineTab]
  );

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/trusted-projects"
          title="Project Fit 申请中心"
          subtitle="跨项目查看我的申请与发布者视角"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Tabs defaultValue="mine">
          <TabsList className="mb-4">
            <TabsTrigger value="mine">我的申请</TabsTrigger>
            <TabsTrigger value="managed">我管理的</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-4">
            <Tabs value={mineTab} onValueChange={(v) => setMineTab(v as MineTab)}>
              <TabsList>
                <TabsTrigger value="active">进行中</TabsTrigger>
                <TabsTrigger value="joined">已加入</TabsTrigger>
                <TabsTrigger value="closed">已结束</TabsTrigger>
              </TabsList>
            </Tabs>
            {mineLoading && (
              <div className="flex justify-center py-12">
                <LogoLoading size={32} />
              </div>
            )}
            {!mineLoading && <ApplicationList items={mineFiltered} />}
          </TabsContent>

          <TabsContent value="managed">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">发布者申请汇总</CardTitle>
              </CardHeader>
              <CardContent>
                {managedLoading && <LogoLoading size={28} />}
                {!managedLoading && managedData && (
                  <>
                    <p className="mb-4 text-sm text-muted-foreground">
                      共 {managedData.summary.total} 条 ·{' '}
                      {Object.entries(managedData.summary.byStatus)
                        .map(([s, n]) => `${projectFitApplicationStatusLabel(s as ProjectFitApplicationStatus)} ${n}`)
                        .join(' · ')}
                    </p>
                    <ApplicationList items={managedData.items} showApplicant />
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/dashboard/trusted-projects/mine">前往项目管理</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
