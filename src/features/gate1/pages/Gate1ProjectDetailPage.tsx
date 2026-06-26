import { useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gate1BaselineForm } from '../components/Gate1BaselineForm';
import { Gate1BaselineGateBanner } from '../components/Gate1BaselineGateBanner';
import { Gate1ConstraintsPanel } from '../components/Gate1ConstraintsPanel';
import { Gate1CandidatesPanel } from '../components/Gate1CandidatesPanel';
import { Gate1ConflictsPanel } from '../components/Gate1ConflictsPanel';
import { Gate1DecisionForm } from '../components/Gate1DecisionForm';
import { Gate1OutcomePanel } from '../components/Gate1OutcomePanel';
import { Gate1ParticipantInvitePanel } from '../components/Gate1ParticipantInvitePanel';
import { Gate1PlanBPanel } from '../components/Gate1PlanBPanel';
import { Gate1AuditTimelinePanel } from '../components/Gate1AuditTimelinePanel';
import { Gate1ProjectOverviewPanel } from '../components/Gate1ProjectOverviewPanel';
import { Gate1RuntimeWorkspacePanel } from '../components/Gate1RuntimeWorkspacePanel';
import { Gate1ReadinessPanel } from '../components/Gate1ReadinessPanel';
import { Gate1TrustSurfacePanel } from '../components/Gate1TrustSurfacePanel';
import { Gate1CohortBadge, Gate1StatusBadge } from '../components/Gate1StatusBadges';
import { Badge } from '@/components/ui/badge';
import { useGate1Baseline, useGate1Project, useGate1ProjectOverview, useGate1TrustSurface } from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';

const VALID_TABS = [
  'overview',
  'trust-surface',
  'timeline',
  'runtime',
  'baseline',
  'members',
  'conflicts',
  'candidates',
  'readiness',
  'plan-b',
  'decision',
  'outcome',
] as const;

type ProjectTab = (typeof VALID_TABS)[number];

function parseTab(value: string | null): ProjectTab {
  if (value && (VALID_TABS as readonly string[]).includes(value)) {
    return value as ProjectTab;
  }
  return 'overview';
}

export default function Gate1ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));
  const baselineRef = useRef<HTMLDivElement>(null);
  const { data: project, isLoading, isError, error } = useGate1Project(projectId);
  const { data: baseline } = useGate1Baseline(projectId);
  const { data: overview } = useGate1ProjectOverview(projectId);
  const { data: trustSurface } = useGate1TrustSurface(projectId);

  const baselineReady = Boolean(baseline?.confirmedAt);
  const trustCardCount =
    overview?.trustSurface?.cardCount ??
    trustSurface?.summary.totalCards ??
    trustSurface?.cards.length ??
    0;
  const showReadinessPlanB =
    project?.cohort === 'NEAR_DEPARTURE' ||
    project?.cohort === 'IN_TRIP_RECENT' ||
    project?.cohort === 'PLANNING';

  const setTab = (tab: string) => {
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };

  const scrollToBaseline = () => {
    setTab('baseline');
    requestAnimationFrame(() => {
      baselineRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={36} />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : '项目不存在'}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={advisorRoutes.home}
          title={project.title}
          subtitle="顾问工作台 · Gate 1"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Gate1CohortBadge cohort={project.cohort} />
          <Gate1StatusBadge status={project.experimentStatus} />
          <Button variant="outline" size="sm" asChild>
            <Link to={advisorRoutes.opsProject(project.id)}>运营工作台</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={advisorRoutes.projectOutcome(project.id)}>Outcome 复盘</Link>
          </Button>
          {trustCardCount > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to={advisorRoutes.project(project.id, 'trust-surface')}>
                信任说明 · {trustCardCount}
              </Link>
            </Button>
          )}
        </div>

        <Gate1BaselineGateBanner
          experimentStatus={project.experimentStatus}
          baselineConfirmed={baselineReady}
          onGoBaseline={scrollToBaseline}
        />

        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="trust-surface" className="gap-1.5">
              信任说明
              {trustCardCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                  {trustCardCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline">时间线</TabsTrigger>
            <TabsTrigger value="runtime" className="text-muted-foreground">
              Runtime
            </TabsTrigger>
            <TabsTrigger value="baseline">Baseline</TabsTrigger>
            <TabsTrigger value="members">成员与约束</TabsTrigger>
            <TabsTrigger value="conflicts" disabled={!baselineReady}>
              冲突中心
            </TabsTrigger>
            <TabsTrigger value="candidates" disabled={!baselineReady}>
              候选方案
            </TabsTrigger>
            {showReadinessPlanB && (
              <TabsTrigger value="readiness" disabled={!baselineReady}>
                Readiness
              </TabsTrigger>
            )}
            {showReadinessPlanB && (
              <TabsTrigger value="plan-b" disabled={!baselineReady}>
                Plan B
              </TabsTrigger>
            )}
            <TabsTrigger value="decision" disabled={!baselineReady}>
              决策记录
            </TabsTrigger>
            <TabsTrigger value="outcome">执行结果</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Gate1ProjectOverviewPanel projectId={project.id} />
          </TabsContent>

          <TabsContent value="trust-surface">
            <Gate1TrustSurfacePanel projectId={project.id} />
          </TabsContent>

          <TabsContent value="timeline">
            <Gate1AuditTimelinePanel projectId={project.id} />
          </TabsContent>

          <TabsContent value="runtime">
            <Gate1RuntimeWorkspacePanel projectId={project.id} />
          </TabsContent>

          <TabsContent value="baseline">
            <div ref={baselineRef}>
              <Gate1BaselineForm projectId={project.id} initial={baseline} />
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="space-y-4">
              <Gate1ConstraintsPanel projectId={project.id} />
              <Gate1ParticipantInvitePanel projectId={project.id} />
            </div>
          </TabsContent>

          <TabsContent value="conflicts">
            <Gate1ConflictsPanel projectId={project.id} baselineReady={baselineReady} />
          </TabsContent>

          <TabsContent value="candidates">
            <Gate1CandidatesPanel projectId={project.id} baselineReady={baselineReady} />
          </TabsContent>

          {showReadinessPlanB && (
            <TabsContent value="readiness">
              <Gate1ReadinessPanel projectId={project.id} baselineReady={baselineReady} />
            </TabsContent>
          )}

          {showReadinessPlanB && (
            <TabsContent value="plan-b">
              <Gate1PlanBPanel projectId={project.id} baselineReady={baselineReady} />
            </TabsContent>
          )}

          <TabsContent value="decision">
            <Gate1DecisionForm projectId={project.id} />
          </TabsContent>

          <TabsContent value="outcome">
            <Gate1OutcomePanel projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
