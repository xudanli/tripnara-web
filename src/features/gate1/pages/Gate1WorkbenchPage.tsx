import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  ClipboardList,
  FlaskConical,
  Plus,
} from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gate1CohortBadge, Gate1StatusBadge } from '../components/Gate1StatusBadges';
import { Gate1RiskBadge } from '../components/Gate1RiskBadge';
import {
  useGate1AdvisorDashboard,
  useGate1AdvisorProjectList,
  useGate1Metrics,
  useGate1Projects,
} from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';
import {
  buildFunnelFromDashboard,
  buildGate1LifecycleFunnel,
  buildGate1WorkbenchTodos,
  countGate1AwaitingAnalysis,
  filterGate1HighPriorityProjects,
  gate1DashboardHeadline,
  gate1MetricsHeadline,
  projectDetailHref,
  resolveAdvisorProjectHref,
} from '@/lib/gate1-workbench';

export default function Gate1WorkbenchPage() {
  const dashboardQuery = useGate1AdvisorDashboard();
  const legacyProjects = useGate1Projects();
  const advisorList = useGate1AdvisorProjectList({ sort: 'needs_action' });
  const { data: metrics } = useGate1Metrics('PLANNING');

  const dashboard = dashboardQuery.data;
  const useServerDashboard = dashboardQuery.isSuccess && dashboard != null;

  const legacyList = legacyProjects.data ?? [];
  const isLoading = useServerDashboard
    ? dashboardQuery.isLoading
    : legacyProjects.isLoading && advisorList.isLoading;

  const isError = !useServerDashboard && legacyProjects.isError && advisorList.isError;

  const todos = useServerDashboard
    ? dashboard.todos.slice(0, 8)
    : buildGate1WorkbenchTodos(legacyList).slice(0, 8);

  const highPriority = useServerDashboard
    ? dashboard.highRiskProjects.slice(0, 5)
    : filterGate1HighPriorityProjects(legacyList).slice(0, 5);

  const funnel = useServerDashboard
    ? buildFunnelFromDashboard(dashboard.funnel)
    : buildGate1LifecycleFunnel(legacyList);

  const departingSoon = useServerDashboard ? dashboard.departingSoon.slice(0, 5) : [];

  const headlines = useServerDashboard
    ? gate1DashboardHeadline(dashboard)
    : gate1MetricsHeadline(metrics);

  const awaitingAnalysis = useServerDashboard
    ? (dashboard.funnel.ANALYZING ?? 0)
    : countGate1AwaitingAnalysis(legacyList);

  const empty = !isLoading && !isError && legacyList.length === 0 && !useServerDashboard;

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard"
          title="顾问工作台"
          subtitle="Advisor Workspace · Gate 1 决策闭环"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={advisorRoutes.projectNew}>
              <Plus className="mr-1 h-4 w-4" />
              创建项目
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={advisorRoutes.projects}>全部项目</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={advisorRoutes.metrics}>
              <BarChart3 className="mr-1 h-4 w-4" />
              实验看板
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={advisorRoutes.opsQueue}>运营队列</Link>
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">加载失败，请稍后重试</p>
        )}

        {!isLoading && !isError && (
          <>
            {empty ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <FlaskConical className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">尚无顾问项目</p>
                  <Button asChild size="sm">
                    <Link to={advisorRoutes.projectNew}>创建项目</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        今日待办
                      </CardTitle>
                      <CardDescription>
                        {useServerDashboard ? '服务端 nextAction 聚合' : '客户端状态推断'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {todos.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无待处理动作</p>
                      )}
                      {useServerDashboard &&
                        dashboard.todos.slice(0, 8).map((todo) => (
                          <Link
                            key={`${todo.projectId}-${todo.id}`}
                            to={resolveAdvisorProjectHref(todo.projectId, {
                              tab: todo.tab,
                              path: todo.path,
                            })}
                            className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium truncate">{todo.projectTitle}</p>
                                <Badge variant="outline">{todo.priority}</Badge>
                              </div>
                              <p className="text-muted-foreground">{todo.title}</p>
                              <p className="text-xs text-muted-foreground">{todo.reason}</p>
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      {!useServerDashboard &&
                        buildGate1WorkbenchTodos(legacyList)
                          .slice(0, 8)
                          .map((todo) => (
                            <Link
                              key={`${todo.projectId}-${todo.actionKind}`}
                              to={projectDetailHref(todo.projectId, todo.tab)}
                              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                            >
                              <div className="min-w-0 space-y-1">
                                <p className="font-medium truncate">{todo.projectTitle}</p>
                                <p className="text-muted-foreground">{todo.actionLabel}</p>
                                <p className="text-xs text-muted-foreground">{todo.reason}</p>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        优先处理
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {highPriority.length === 0 && (
                        <p className="text-sm text-muted-foreground">当前无高风险项目</p>
                      )}
                      {useServerDashboard &&
                        dashboard.highRiskProjects.slice(0, 5).map((project) => (
                          <Link
                            key={project.id}
                            to={projectDetailHref(project.id, 'overview')}
                            className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                          >
                            <span className="font-medium">{project.title}</span>
                            <Gate1CohortBadge cohort={project.cohort} />
                            <Gate1StatusBadge status={project.experimentStatus} />
                            <Gate1RiskBadge level={project.riskLevel} />
                          </Link>
                        ))}
                      {!useServerDashboard &&
                        filterGate1HighPriorityProjects(legacyList)
                          .slice(0, 5)
                          .map((project) => (
                            <Link
                              key={project.id}
                              to={projectDetailHref(project.id, 'overview')}
                              className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                            >
                              <span className="font-medium">{project.title}</span>
                              <Gate1CohortBadge cohort={project.cohort} />
                              <Gate1StatusBadge status={project.experimentStatus} />
                            </Link>
                          ))}
                    </CardContent>
                  </Card>
                </section>

                {departingSoon.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        近期出发
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {departingSoon.map((project) => (
                        <Link
                          key={project.id}
                          to={projectDetailHref(project.id, 'readiness')}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-muted/40"
                        >
                          <span className="font-medium">{project.title}</span>
                          <span className="text-muted-foreground">
                            {project.daysToDeparture != null
                              ? `${project.daysToDeparture} 天后出发`
                              : project.destination ?? ''}
                          </span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <section className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        项目漏斗
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {funnel.map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{item.label}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        人工协助
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        <span className="text-2xl font-semibold">{awaitingAnalysis}</span>
                        <span className="ml-2 text-muted-foreground">个项目等待分析交付</span>
                      </p>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to={advisorRoutes.opsQueue}>打开运营队列</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Gate 1 摘要
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {headlines.map((h) => (
                        <div key={h.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{h.label}</span>
                          <span className="font-medium">{h.value}</span>
                        </div>
                      ))}
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to={advisorRoutes.metrics}>查看完整看板</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
