import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGate1AdvisorOutputs,
  useGate1Baseline,
  useGate1Decision,
  useGate1ParticipantsProgress,
  useGate1Project,
  useGate1ProjectOverview,
  useGate1TrustSurface,
} from '@/hooks/useGate1';
import { gate1CohortLabel, gate1ExperimentStatusLabel } from '@/lib/gate1-display';
import { gate1OutcomeStatusLabel } from '@/lib/gate1-runtime';
import { inferGate1NextAction, projectDetailHref, resolveAdvisorProjectHref } from '@/lib/gate1-workbench';
import { advisorRoutes } from '@/lib/advisor-routes';
import { Gate1CohortBadge, Gate1StatusBadge } from './Gate1StatusBadges';
import { Gate1RiskBadge } from './Gate1RiskBadge';

interface Gate1ProjectOverviewPanelProps {
  projectId: string;
}

export function Gate1ProjectOverviewPanel({ projectId }: Gate1ProjectOverviewPanelProps) {
  const overviewQuery = useGate1ProjectOverview(projectId);
  const { data: trustSurface } = useGate1TrustSurface(projectId);
  const { data: project, isLoading: projectLoading } = useGate1Project(projectId);
  const { data: baseline } = useGate1Baseline(projectId);
  const { data: progress } = useGate1ParticipantsProgress(projectId);
  const { data: outputs, isLoading: outputsLoading } = useGate1AdvisorOutputs(projectId);
  const { data: decision } = useGate1Decision(projectId);

  const overview = overviewQuery.data;
  const useServerOverview = overviewQuery.isSuccess && overview != null;
  const trustCardCount =
    overview?.trustSurface?.cardCount ??
    trustSurface?.summary.totalCards ??
    trustSurface?.cards.length ??
    0;

  if ((projectLoading && !useServerOverview) || (!project && !useServerOverview)) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  const baselineReady = Boolean(baseline?.confirmedAt);
  const fallbackNext = project ? inferGate1NextAction(project) : null;
  const nextAction = useServerOverview ? overview.nextAction : null;

  const summary = useServerOverview
    ? overview.summary
    : {
        memberCompletionRate: progress?.completionRate ?? 0,
        conflictCount: countConflicts(outputs?.conflicts),
        blockerConflictCount: countBlockers(outputs?.conflicts),
        publishedCandidateCount: outputs?.candidates?.filter((c) => c.status === 'PUBLISHED').length ?? 0,
        redReadinessCount: countRedReadiness(outputs?.readiness),
        hasDecision: Boolean(decision?.submittedAt),
        planBCount: outputs?.planB?.filter((p) => p.status === 'PUBLISHED').length ?? 0,
        riskLevel: 'MEDIUM' as const,
      };

  const projectMeta = useServerOverview
    ? overview.project
    : {
        title: project!.title,
        destination: project!.destination ?? null,
        cohort: project!.cohort,
        experimentStatus: project!.experimentStatus,
        participantCount: project!.participantCount ?? null,
        daysToDeparture: null,
        startDate: null,
        endDate: null,
      };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目摘要</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">目的地</span>
            <p className="font-medium">{projectMeta.destination ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">人数</span>
            <p className="font-medium">{projectMeta.participantCount ?? '—'}</p>
          </div>
          {projectMeta.daysToDeparture != null && (
            <div>
              <span className="text-muted-foreground">距出发</span>
              <p className="font-medium">{projectMeta.daysToDeparture} 天</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Cohort</span>
            <p className="font-medium">{gate1CohortLabel(projectMeta.cohort)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">阶段</span>
            <p className="font-medium">{gate1ExperimentStatusLabel(projectMeta.experimentStatus)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Gate1CohortBadge cohort={projectMeta.cohort} />
            <Gate1StatusBadge status={projectMeta.experimentStatus} />
            <Gate1RiskBadge level={summary.riskLevel} />
            {!baselineReady && <Badge variant="outline">Baseline 待确认</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">下一动作</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">
              {nextAction?.title ?? fallbackNext?.actionLabel ?? '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {nextAction?.reason ?? fallbackNext?.reason ?? ''}
            </p>
          </div>
          {(nextAction || (fallbackNext && fallbackNext.actionKind !== 'wait')) && (
            <Button size="sm" asChild>
              <Link
                to={
                  nextAction
                    ? resolveAdvisorProjectHref(projectId, {
                        tab: nextAction.tab,
                        path: nextAction.path,
                      })
                    : projectDetailHref(projectId, fallbackNext!.tab)
                }
              >
                前往
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">核心状态</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="成员完成率"
            value={`${Math.round(summary.memberCompletionRate * 100)}%`}
          />
          <Stat
            label="冲突"
            value={String(summary.conflictCount)}
            hint={
              summary.blockerConflictCount > 0
                ? `${summary.blockerConflictCount} 阻塞`
                : undefined
            }
          />
          <Stat label="候选方案" value={String(summary.publishedCandidateCount)} />
          <Stat
            label="Readiness 红项"
            value={outputsLoading && !useServerOverview ? '…' : String(summary.redReadinessCount)}
          />
          <Stat
            label="Plan B"
            value={outputsLoading && !useServerOverview ? '…' : String(summary.planBCount)}
          />
          <Stat label="决策" value={summary.hasDecision ? '已提交' : '未开始'} />
        </CardContent>
      </Card>

      {trustCardCount > 0 && (
        <Card className="border-gate-allow-border/60 bg-gate-allow/30 dark:border-gate-allow-border/40 dark:bg-gate-allow/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              信任说明
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              标准信任卡片 · {trustCardCount} 张
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to={advisorRoutes.project(projectId, 'trust-surface')}>
                查看详情
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {useServerOverview && overview.recentArtifacts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近交付</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              冲突报告版本：
              {overview.recentArtifacts.latestConflictVersion ?? '—'}
            </p>
            <p>
              Readiness 版本：
              {overview.recentArtifacts.latestReadinessVersion ?? '—'}
            </p>
            <p>
              最近决策：
              {overview.recentArtifacts.latestDecisionAt
                ? new Date(overview.recentArtifacts.latestDecisionAt).toLocaleString()
                : '—'}
            </p>
            <p>
              Outcome：
              {gate1OutcomeStatusLabel(overview.recentArtifacts.outcomeStatus)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {hint && <p className="text-xs text-destructive">{hint}</p>}
    </div>
  );
}

function countConflicts(
  conflicts: Array<{ status: string; findings: unknown[] }> | undefined,
): number {
  return (
    conflicts?.filter((c) => c.status === 'PUBLISHED').reduce((n, r) => n + r.findings.length, 0) ??
    0
  );
}

function countBlockers(
  conflicts: Array<{ status: string; findings: Array<{ severity: string }> }> | undefined,
): number {
  return (
    conflicts
      ?.filter((c) => c.status === 'PUBLISHED')
      .reduce(
        (n, r) => n + r.findings.filter((f) => f.severity === 'BLOCKER').length,
        0,
      ) ?? 0
  );
}

function countRedReadiness(
  reports: Array<{ status: string; findings: Array<{ status: string; closedAt?: string }> }> | undefined,
): number {
  return (
    reports
      ?.filter((r) => r.status === 'PUBLISHED')
      .flatMap((r) => r.findings)
      .filter((f) => f.status === 'RED' && !f.closedAt).length ?? 0
  );
}
