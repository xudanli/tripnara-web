import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useGate1RuntimeAcceptance,
  useGate1RuntimeFlags,
  useGate1RuntimeMetrics,
  useGate1RuntimeProjection,
  useGate1RuntimeReconcile,
} from '@/hooks/useGate1';

export default function Gate1RuntimeOpsPage() {
  const [reconcileMetrics, setReconcileMetrics] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();

  const flagsQuery = useGate1RuntimeFlags();
  const metricsQuery = useGate1RuntimeMetrics(reconcileMetrics);
  const acceptanceQuery = useGate1RuntimeAcceptance();
  const reconcileQuery = useGate1RuntimeReconcile(activeProjectId);
  const projectionQuery = useGate1RuntimeProjection(activeProjectId);

  const loading = flagsQuery.isLoading;

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/ops/gate1"
          title="Decision Runtime 运维"
          subtitle="/ops/runtime"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ops/gate1/slo">Decision OS SLO</Link>
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Runtime 开关</CardTitle>
                <CardDescription>GET /ops/runtime/flags</CardDescription>
              </CardHeader>
              <CardContent>
                {flagsQuery.data ? (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(flagsQuery.data).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-2 text-sm">
                        <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
                        <dd>
                          <Badge variant={value ? 'default' : 'secondary'}>
                            {value ? 'true' : 'false'}
                          </Badge>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : flagsQuery.isError ? (
                  <p className="text-sm text-destructive">无法加载开关状态</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">指标</CardTitle>
                  <CardDescription>GET /ops/runtime/metrics</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="reconcile-metrics"
                    checked={reconcileMetrics}
                    onCheckedChange={setReconcileMetrics}
                  />
                  <Label htmlFor="reconcile-metrics" className="text-xs">reconcile</Label>
                </div>
              </CardHeader>
              <CardContent>
                {metricsQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : metricsQuery.data ? (
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(metricsQuery.data, null, 2)}
                  </pre>
                ) : metricsQuery.isError ? (
                  <p className="text-sm text-destructive">无法加载指标</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">验收报告</CardTitle>
                <CardDescription>GET /ops/runtime/acceptance</CardDescription>
              </CardHeader>
              <CardContent>
                {acceptanceQuery.isLoading ? (
                  <LogoLoading size={24} />
                ) : acceptanceQuery.data ? (
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(acceptanceQuery.data, null, 2)}
                  </pre>
                ) : acceptanceQuery.isError ? (
                  <p className="text-sm text-destructive">无法加载验收报告</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">单项目对账 / 投影</CardTitle>
                <CardDescription>
                  GET /ops/runtime/projects/:projectId/reconcile · projection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    disabled={!projectId.trim()}
                    onClick={() => setActiveProjectId(projectId.trim())}
                  >
                    查询
                  </Button>
                  {activeProjectId ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/ops/gate1/projects/${activeProjectId}`}>
                        运营项目页
                      </Link>
                    </Button>
                  ) : null}
                </div>

                {activeProjectId ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">对账结果</p>
                      {reconcileQuery.isLoading ? (
                        <LogoLoading size={20} />
                      ) : reconcileQuery.data ? (
                        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {JSON.stringify(reconcileQuery.data, null, 2)}
                        </pre>
                      ) : reconcileQuery.isError ? (
                        <p className="text-sm text-destructive">对账失败</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">投影视图</p>
                      {projectionQuery.isLoading ? (
                        <LogoLoading size={20} />
                      ) : projectionQuery.data ? (
                        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {JSON.stringify(projectionQuery.data, null, 2)}
                        </pre>
                      ) : projectionQuery.isError ? (
                        <p className="text-sm text-destructive">投影加载失败</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
