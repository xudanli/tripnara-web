import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TripContextSnapshot } from '@/api/travel-status.types';

interface ContextSnapshotDetailViewProps {
  snapshot: TripContextSnapshot;
  className?: string;
}

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  if (data == null) return null;
  const empty =
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data as object).length === 0;
  if (empty) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

export default function ContextSnapshotDetailView({
  snapshot,
  className,
}: ContextSnapshotDetailViewProps) {
  const revisionLabel =
    snapshot.revision != null ? `v${snapshot.revision}` : snapshot.snapshotId?.slice(0, 8);

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {revisionLabel ? <Badge variant="secondary">上下文 {revisionLabel}</Badge> : null}
        {snapshot.snapshotId ? (
          <span className="text-xs text-muted-foreground font-mono">{snapshot.snapshotId}</span>
        ) : null}
      </div>

      {snapshot.effectivePlan ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">当前有效行程</CardTitle>
            {snapshot.effectivePlan.lastUpdatedAt ? (
              <CardDescription>
                更新于{' '}
                {format(new Date(snapshot.effectivePlan.lastUpdatedAt), 'yyyy-MM-dd HH:mm', {
                  locale: zhCN,
                })}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {snapshot.effectivePlan.headline ? (
              <p className="font-medium">{snapshot.effectivePlan.headline}</p>
            ) : null}
            {snapshot.effectivePlan.summary ? (
              <p className="text-muted-foreground">{snapshot.effectivePlan.summary}</p>
            ) : null}
            {snapshot.effectivePlan.versionId ? (
              <p className="text-xs text-muted-foreground">
                版本 {snapshot.effectivePlan.versionId}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {snapshot.uncertainties?.length ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">不确定项</CardTitle>
            <CardDescription>AI 尚未完全确认的判断</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {snapshot.uncertainties.map((item, index) => (
                <li key={`${item.label ?? 'u'}-${index}`} className="rounded-lg border px-3 py-2">
                  {item.label ? <p className="font-medium">{item.label}</p> : null}
                  {item.summary ? (
                    <p className="mt-0.5 text-muted-foreground">{item.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {snapshot.openDecisions?.length ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">开放决策</CardTitle>
            <CardDescription>{snapshot.openDecisions.length} 项</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {snapshot.openDecisions.map((d) => (
                <li key={d.problemId} className="rounded-lg border px-3 py-2">
                  <p className="font-medium">{d.headline}</p>
                  {d.impact ? <p className="mt-0.5 text-muted-foreground">{d.impact}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <JsonBlock title="旅行目标" data={snapshot.goal} />
        <JsonBlock title="约束合约" data={snapshot.contract} />
        <JsonBlock title="决策历史" data={snapshot.decisionHistory} />
      </div>
    </div>
  );
}
