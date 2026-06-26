import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGate1Metrics } from '@/hooks/useGate1';
import { gate1CohortLabel } from '@/lib/gate1-display';
import { formatGate1MetricRate } from '@/lib/gate1-errors';
import type { Gate1Cohort } from '@/types/gate1';

function MetricCard({
  label,
  value,
  green,
  yellow,
}: {
  label: string;
  value: number | null | undefined;
  green?: number;
  yellow?: number;
}) {
  const display = formatGate1MetricRate(value);
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  if (value != null && green != null && yellow != null) {
    if (value >= green) variant = 'default';
    else if (value >= yellow) variant = 'secondary';
    else variant = 'destructive';
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{display}</span>
          {value != null && green != null && (
            <Badge variant={variant} className="font-normal">
              G≥{(green * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Gate1MetricsDashboardPage() {
  const [cohort, setCohort] = useState<Gate1Cohort | 'ALL'>('PLANNING');
  const { data, isLoading, isError, error } = useGate1Metrics(
    cohort === 'ALL' ? undefined : cohort,
  );

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/gate1"
          title="Gate 1 实验看板"
          subtitle="按 Cohort 隔离指标 · 保留分子分母"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={cohort}
            onValueChange={(v) => setCohort(v as Gate1Cohort | 'ALL')}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLANNING">{gate1CohortLabel('PLANNING')}</SelectItem>
              <SelectItem value="NEAR_DEPARTURE">{gate1CohortLabel('NEAR_DEPARTURE')}</SelectItem>
              <SelectItem value="IN_TRIP_RECENT">{gate1CohortLabel('IN_TRIP_RECENT')}</SelectItem>
              <SelectItem value="ALL">默认分母（Planning）</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/dashboard/gate1" className="text-sm text-muted-foreground underline">
            返回项目列表
          </Link>
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

        {data && (
          <>
            <div>
              <h2 className="mb-3 text-sm font-medium">参与</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="邀请接受率"
                  value={data.participation.invitationAcceptRate}
                  green={data.thresholds?.invitationAcceptRate?.green}
                  yellow={data.thresholds?.invitationAcceptRate?.yellow}
                />
                <MetricCard
                  label="偏好填写率"
                  value={data.participation.preferenceFillRate}
                  green={data.thresholds?.preferenceFillRate?.green}
                  yellow={data.thresholds?.preferenceFillRate?.yellow}
                />
                <MetricCard
                  label="私密约束使用率"
                  value={data.participation.privateConstraintUsageRate}
                />
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium">价值</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="重要决策改变率"
                  value={data.value.materialChangeRate}
                />
                <MetricCard
                  label="Readiness 增量发现率"
                  value={data.value.readinessIncrementalRate}
                />
                <MetricCard label="Plan B 采用率" value={data.value.planBAdoptionRate} />
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium">商业 / 产品化</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      第二单机构比例
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatGate1MetricRate(data.commercial.secondOrderRate)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      人工总工时（分钟）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {data.productization.totalHumanMinutes ?? 'N/A'}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
