import { Link } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDecisionOsSlo,
  useDecisionOsSloContingencyRecent,
  useDecisionOsSloContextRecallBaseline,
  useDecisionOsSloDecisionDnaRecent,
  useDecisionOsSloMemoryStateRecent,
} from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function ms(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

export default function Gate1DecisionOsSloPage() {
  const sloQuery = useDecisionOsSlo();
  const contingencyQuery = useDecisionOsSloContingencyRecent(20);
  const dnaQuery = useDecisionOsSloDecisionDnaRecent(20);
  const contextRecallQuery = useDecisionOsSloContextRecallBaseline();
  const memoryStateQuery = useDecisionOsSloMemoryStateRecent(20);

  const loading = sloQuery.isLoading;

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={advisorRoutes.opsQueue}
          title="Decision OS SLO"
          subtitle="/ops/runtime/slo"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ops/gate1/runtime">Runtime 运维</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        ) : (
          <>
            {sloQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SLO 快照</CardTitle>
                  <CardDescription>
                    生成于 {new Date(sloQuery.data.generatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SloStat
                    label="Validation 通过率"
                    value={pct(sloQuery.data.validation.passRatePct)}
                    hint={`${sloQuery.data.validation.passedRuns}/${sloQuery.data.validation.totalRuns} runs · 均 ${ms(sloQuery.data.validation.avgDurationMs)}`}
                  />
                  <SloStat
                    label="Contingency 成功率"
                    value={pct(sloQuery.data.contingency.successRatePct)}
                    hint={`${sloQuery.data.contingency.successRuns}/${sloQuery.data.contingency.totalRuns} runs`}
                  />
                  <SloStat
                    label="混合干预成功率"
                    value={pct(sloQuery.data.blendedInterventionSuccessRatePct)}
                  />
                </CardContent>
              </Card>
            )}

            {sloQuery.isError && (
              <p className="text-sm text-destructive">无法加载 SLO 快照</p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">混合干预明细</CardTitle>
                <CardDescription>GET /ops/runtime/slo/contingency/recent</CardDescription>
              </CardHeader>
              <CardContent>
                {contingencyQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : contingencyQuery.data?.recentContingency.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">时间</th>
                          <th className="pb-2 pr-3 font-medium">Trip</th>
                          <th className="pb-2 pr-3 font-medium">Path</th>
                          <th className="pb-2 pr-3 font-medium">结果</th>
                          <th className="pb-2 pr-3 font-medium">耗时</th>
                          <th className="pb-2 font-medium">原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contingencyQuery.data.recentContingency.map((run, i) => (
                          <tr key={`${run.tripId}-${run.runAt}-${i}`} className="border-b last:border-0">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {new Date(run.runAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">{run.tripId.slice(0, 8)}…</td>
                            <td className="py-2 pr-3">{run.pathId}</td>
                            <td className="py-2 pr-3">
                              <OutcomeBadge outcome={run.outcome} />
                              {run.humanAssisted && (
                                <Badge variant="outline" className="ml-1 font-normal text-xs">
                                  人工
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 pr-3">{ms(run.durationMs)}</td>
                            <td className="py-2 text-muted-foreground">{run.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无近期记录</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decision DNA 合规审计</CardTitle>
                <CardDescription>GET /ops/runtime/slo/decision-dna/recent</CardDescription>
              </CardHeader>
              <CardContent>
                {dnaQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : dnaQuery.data?.recentAudits.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">时间</th>
                          <th className="pb-2 pr-3 font-medium">用户</th>
                          <th className="pb-2 pr-3 font-medium">来源</th>
                          <th className="pb-2 pr-3 font-medium">Tier</th>
                          <th className="pb-2 pr-3 font-medium">允许</th>
                          <th className="pb-2 font-medium">原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dnaQuery.data.recentAudits.map((entry, i) => (
                          <tr key={`${entry.userId}-${entry.at}-${i}`} className="border-b last:border-0">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {new Date(entry.at).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">{entry.userId.slice(0, 8)}…</td>
                            <td className="py-2 pr-3">{entry.signalSource}</td>
                            <td className="py-2 pr-3">
                              <Badge variant="outline" className="font-normal">
                                {entry.tier}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant={entry.allowed ? 'default' : 'destructive'}>
                                {entry.allowed ? '允许' : '拦截'}
                              </Badge>
                              {entry.blockedReason && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {entry.blockedReason}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-muted-foreground">{entry.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无审计记录</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">上下文召回 baseline</CardTitle>
                <CardDescription>GET /ops/runtime/slo/context-recall/baseline</CardDescription>
              </CardHeader>
              <CardContent>
                {contextRecallQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : contextRecallQuery.data ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <SloStat
                        label="平均召回率"
                        value={pct(contextRecallQuery.data.recallPct)}
                        hint={`${contextRecallQuery.data.passedCases}/${contextRecallQuery.data.totalCases} cases`}
                      />
                      <SloStat
                        label="T+6 目标"
                        value={pct(contextRecallQuery.data.targetPctT6)}
                      />
                      <SloStat
                        label="距目标"
                        value={`${contextRecallQuery.data.deltaVsTargetPct >= 0 ? '+' : ''}${contextRecallQuery.data.deltaVsTargetPct.toFixed(1)}%`}
                      />
                      <SloStat
                        label="生成时间"
                        value={new Date(contextRecallQuery.data.generatedAt).toLocaleDateString()}
                      />
                    </div>
                    {contextRecallQuery.data.results.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pb-2 pr-3 font-medium">Case</th>
                              <th className="pb-2 pr-3 font-medium">召回率</th>
                              <th className="pb-2 pr-3 font-medium">结果</th>
                              <th className="pb-2 font-medium">Misses</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contextRecallQuery.data.results.map((row) => (
                              <tr key={row.id} className="border-b last:border-0">
                                <td className="py-2 pr-3">{row.title}</td>
                                <td className="py-2 pr-3">{pct(row.recallPct)}</td>
                                <td className="py-2 pr-3">
                                  <Badge variant={row.passed ? 'default' : 'destructive'}>
                                    {row.passed ? 'PASS' : 'FAIL'}
                                  </Badge>
                                </td>
                                <td className="py-2 text-muted-foreground">
                                  {row.misses.length ? row.misses.join(', ') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">暂无 baseline 用例</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">无法加载上下文召回 baseline</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">MemoryState Shadow diff</CardTitle>
                <CardDescription>GET /ops/runtime/slo/memory-state/recent</CardDescription>
              </CardHeader>
              <CardContent>
                {memoryStateQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : memoryStateQuery.data?.recentShadow.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">时间</th>
                          <th className="pb-2 pr-3 font-medium">用户</th>
                          <th className="pb-2 pr-3 font-medium">Overlay</th>
                          <th className="pb-2 font-medium">Changed keys</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoryStateQuery.data.recentShadow.map((entry, i) => (
                          <tr key={`${entry.userId}-${entry.recordedAt}-${i}`} className="border-b last:border-0">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {new Date(entry.recordedAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">{entry.userId.slice(0, 8)}…</td>
                            <td className="py-2 pr-3">
                              <Badge variant={entry.overlayApplied ? 'default' : 'outline'}>
                                {entry.overlayApplied ? '已启用' : 'Shadow'}
                              </Badge>
                            </td>
                            <td className="py-2 font-mono text-xs text-muted-foreground">
                              {entry.changedKeys.length ? entry.changedKeys.join(', ') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无 Shadow 记录</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function SloStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const variant =
    outcome === 'SUCCESS'
      ? 'default'
      : outcome === 'PARTIAL'
        ? 'secondary'
        : outcome === 'FAILED'
          ? 'destructive'
          : 'outline';
  return <Badge variant={variant}>{outcome}</Badge>;
}
