import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useGate1RuntimeWorkspace } from '@/hooks/useGate1';
import {
  gate1OutcomeStatusLabel,
  gate1RuntimeReadModelSourceLabel,
} from '@/lib/gate1-runtime';

interface Gate1RuntimeWorkspacePanelProps {
  projectId: string;
}

export function Gate1RuntimeWorkspacePanel({ projectId }: Gate1RuntimeWorkspacePanelProps) {
  const { data, isLoading, isError, error } = useGate1RuntimeWorkspace(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : '加载 Runtime 工作台失败'}
      </p>
    );
  }

  if (!data) return null;

  const { meta } = data;
  const showWarnings =
    meta.readModelSource === 'projection_fallback' && meta.validationWarnings.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime 读模型</CardTitle>
          <CardDescription>
            M3 灰度读 · 生成于 {new Date(meta.generatedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              来源：{gate1RuntimeReadModelSourceLabel(meta.readModelSource)}
            </Badge>
            <Badge variant={meta.projectionEnabled ? 'default' : 'secondary'}>
              投影读：{meta.projectionEnabled ? '开' : '关'}
            </Badge>
            {meta.reconciliationMatched != null ? (
              <Badge variant={meta.reconciliationMatched ? 'outline' : 'destructive'}>
                对账：{meta.reconciliationMatched ? '一致' : '不一致'}
              </Badge>
            ) : null}
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <MetaItem label="Trip ID" value={meta.tripId ?? '—'} />
            <MetaItem label="投影事件数" value={String(meta.projectionEventCount)} />
            <MetaItem label="Replay 校验" value={meta.replayValidation ? '开' : '关'} />
            <MetaItem
              label="Outcome"
              value={
                data.outcome?.submittedAt
                  ? gate1OutcomeStatusLabel('SUBMITTED')
                  : gate1OutcomeStatusLabel('PENDING')
              }
            />
          </dl>
          {showWarnings ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <p className="font-medium">对账警告</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {meta.validationWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据快照</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <Stat label="冲突报告" value={data.conflicts.length} />
          <Stat label="候选方案" value={data.candidates.length} />
          <Stat label="决策记录" value={data.decisions.length} />
          <Stat label="Readiness" value={data.readiness.length} />
          <Stat label="Plan B" value={data.planBs.length} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
