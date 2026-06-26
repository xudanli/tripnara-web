import { LogoLoading } from '@/components/common/LogoLoading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGate1AdvisorOutputs } from '@/hooks/useGate1';
import { Gate1HumanAssistedBadge } from './Gate1HumanAssistedBadge';
import { Gate1ConflictFindingRow } from './Gate1ConflictFindingRow';

interface Gate1ConflictsPanelProps {
  projectId: string;
  baselineReady: boolean;
}

export function Gate1ConflictsPanel({ projectId, baselineReady }: Gate1ConflictsPanelProps) {
  const { data, isLoading, isError, error } = useGate1AdvisorOutputs(projectId);

  if (!baselineReady) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          完成 Baseline 确认后，冲突报告将在此展示。
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : '加载失败'}
        </CardContent>
      </Card>
    );
  }

  const conflicts = data?.conflicts?.filter((c) => c.status === 'PUBLISHED') ?? [];
  const blockerCount = conflicts.reduce(
    (sum, report) => sum + report.findings.filter((f) => f.severity === 'BLOCKER').length,
    0,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            冲突中心
            {blockerCount > 0 && (
              <Badge variant="destructive">{blockerCount} 项阻塞</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflicts.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无已发布冲突报告</p>
          )}
          {conflicts.map((report) => (
            <div key={report.version} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Gate1HumanAssistedBadge
                  sourceType={report.sourceType}
                  humanAssistedLabel={report.humanAssistedLabel}
                  version={report.version}
                />
                {report.publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.publishedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {report.findings.map((f) => (
                  <Gate1ConflictFindingRow key={f.id} projectId={projectId} finding={f} />
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
