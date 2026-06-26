import { Link } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gate1CohortBadge, Gate1StatusBadge } from '../components/Gate1StatusBadges';
import { useGate1OpsQueue } from '@/hooks/useGate1';

export default function Gate1OpsQueuePage() {
  const { data: queue, isLoading, isError, error } = useGate1OpsQueue();

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/gate1"
          title="Gate 1 运营队列"
          subtitle="Concierge Operations Console"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ops/gate1/slo">Decision OS SLO</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ops/gate1/runtime">Runtime 运维</Link>
          </Button>
        </div>
        {isLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : '加载失败'}
          </p>
        )}

        {!isLoading && (queue ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">暂无待处理订单</p>
        )}

        <div className="grid gap-4">
          {(queue ?? []).map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Gate1CohortBadge cohort={item.cohort} />
                  <Gate1StatusBadge status={item.experimentStatus} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {item.completionRate != null && (
                    <Badge variant="secondary">
                      成员完成 {Math.round(item.completionRate * 100)}%
                    </Badge>
                  )}
                  {item.pendingDrafts?.conflicts && (
                    <Badge variant="outline">冲突草稿待发布</Badge>
                  )}
                  {item.pendingDrafts?.sanitization && (
                    <Badge variant="outline">脱敏待审核</Badge>
                  )}
                </div>
                <Button size="sm" asChild>
                  <Link to={`/dashboard/ops/gate1/projects/${item.id}`}>打开工作台</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
