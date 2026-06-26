import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGate1Constraints } from '@/hooks/useGate1';
import { gate1MissingInfoReasonLabel } from '@/lib/gate1-display';
import { Gate1SanitizedConstraintsCard } from './Gate1SanitizedConstraintsCard';

interface Gate1ConstraintsPanelProps {
  projectId: string;
}

export function Gate1ConstraintsPanel({ projectId }: Gate1ConstraintsPanelProps) {
  const { data, isLoading, isError, error } = useGate1Constraints(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LogoLoading size={28} />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Gate1SanitizedConstraintsCard constraints={data.sanitizedConstraints} />

      {(data.privateConstraintCount > 0 || data.sanitizedPendingReview > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">私密约束状态</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">已收集 {data.privateConstraintCount} 条（仅数量）</Badge>
            {data.sanitizedPendingReview > 0 && (
              <Badge variant="outline">待审核 {data.sanitizedPendingReview}</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {data.missingInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">缺失信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.missingInfo.map((item) => (
              <div
                key={item.participantId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.displayName}</p>
                  <p className="text-muted-foreground">{item.role}</p>
                </div>
                <Badge variant="outline">{gate1MissingInfoReasonLabel(item.reason)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
