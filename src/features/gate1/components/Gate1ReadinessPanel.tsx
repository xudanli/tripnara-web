import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  useGate1AdvisorOutputs,
  useSubmitReadinessFindingFeedbackWithRefresh,
} from '@/hooks/useGate1';
import {
  gate1ReadinessFeedbackLabel,
  gate1ReadinessStatusLabel,
  readinessStatusBadgeVariant,
} from '@/lib/gate1-display';
import { Gate1HumanAssistedBadge } from './Gate1HumanAssistedBadge';
import type { Gate1ReadinessAdvisorFeedback } from '@/types/gate1';

const READINESS_FEEDBACK_OPTIONS: Gate1ReadinessAdvisorFeedback[] = [
  'USEFUL',
  'KNOWN',
  'ERROR',
  'NOT_APPLICABLE',
];

interface Gate1ReadinessPanelProps {
  projectId: string;
  baselineReady: boolean;
}

export function Gate1ReadinessPanel({ projectId, baselineReady }: Gate1ReadinessPanelProps) {
  const { data, isLoading, isError, error } = useGate1AdvisorOutputs(projectId);
  const submitFeedback = useSubmitReadinessFindingFeedbackWithRefresh(projectId);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [closeFinding, setCloseFinding] = useState<Record<string, boolean>>({});

  if (!baselineReady) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          完成 Baseline 后，Near-Departure 或适用 Planning 订单可查看 Readiness 报告。
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

  const reports = data?.readiness?.filter((r) => r.status === 'PUBLISHED') ?? [];

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          暂无已发布 Readiness 报告。运营可在工作台上传并发布。
        </CardContent>
      </Card>
    );
  }

  const handleFeedback = async (findingId: string, feedback: Gate1ReadinessAdvisorFeedback) => {
    try {
      await submitFeedback.mutateAsync({
        findingId,
        body: {
          feedback,
          note: notes[findingId]?.trim() || undefined,
          closeFinding: closeFinding[findingId] ?? false,
        },
      });
      toast.success('反馈已记录');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '反馈失败');
    }
  };

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.version}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Readiness 报告
              <Gate1HumanAssistedBadge
                sourceType={report.sourceType}
                humanAssistedLabel={report.humanAssistedLabel}
                version={report.version}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.findings.map((f) => (
              <div key={f.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.title}</span>
                      <Badge variant={readinessStatusBadgeVariant(f.status)}>
                        {gate1ReadinessStatusLabel(f.status)}
                      </Badge>
                      {f.isIncremental && (
                        <Badge variant="outline">增量发现</Badge>
                      )}
                      {f.dimension && (
                        <Badge variant="secondary">{f.dimension}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {f.responsibleParty && <span>责任：{f.responsibleParty}</span>}
                      {f.dueAt && (
                        <span>截止：{new Date(f.dueAt).toLocaleString()}</span>
                      )}
                      {f.closedAt && (
                        <span>已关闭：{new Date(f.closedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {f.advisorFeedback && (
                    <Badge variant="outline">
                      {gate1ReadinessFeedbackLabel(f.advisorFeedback)}
                    </Badge>
                  )}
                </div>

                {!f.closedAt && (
                  <div className="space-y-2 border-t pt-3">
                    <Textarea
                      rows={2}
                      placeholder="反馈备注（可选）"
                      value={notes[f.id] ?? ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                    />
                    {f.status === 'RED' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`close-${f.id}`}
                          checked={closeFinding[f.id] ?? false}
                          onCheckedChange={(v) =>
                            setCloseFinding((prev) => ({ ...prev, [f.id]: v === true }))
                          }
                        />
                        <Label htmlFor={`close-${f.id}`} className="text-sm font-normal">
                          关闭此 RED finding（接受风险或已处理）
                        </Label>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {READINESS_FEEDBACK_OPTIONS.map((fb) => (
                        <Button
                          key={fb}
                          size="sm"
                          variant="outline"
                          disabled={submitFeedback.isPending}
                          onClick={() => void handleFeedback(f.id, fb)}
                        >
                          {gate1ReadinessFeedbackLabel(fb)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
