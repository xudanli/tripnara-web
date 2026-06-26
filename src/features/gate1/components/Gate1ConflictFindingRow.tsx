import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitConflictFindingAction } from '@/hooks/useGate1';
import {
  gate1ConflictActionLabel,
  gate1ConflictFeedbackLabel,
} from '@/lib/gate1-display';
import type { Gate1ConflictFinding, Gate1ConflictFindingActionType } from '@/types/gate1';

interface Gate1ConflictFindingRowProps {
  projectId: string;
  finding: Gate1ConflictFinding;
}

export function Gate1ConflictFindingRow({ projectId, finding }: Gate1ConflictFindingRowProps) {
  const submitAction = useSubmitConflictFindingAction(projectId);
  const [expanded, setExpanded] = useState<Gate1ConflictFindingActionType | null>(null);
  const [reason, setReason] = useState('');
  const [resolutionStrategy, setResolutionStrategy] = useState('');

  const handleAction = async (action: Gate1ConflictFindingActionType) => {
    if (action === 'DISMISS' && !reason.trim()) {
      toast.error('驳回须填写原因');
      return;
    }
    if (action === 'RESOLVE' && !resolutionStrategy.trim()) {
      toast.error('请填写解决策略');
      return;
    }

    try {
      await submitAction.mutateAsync({
        findingId: finding.id,
        body: {
          action,
          reason: reason.trim() || undefined,
          resolutionStrategy: resolutionStrategy.trim() || undefined,
        },
      });
      toast.success(gate1ConflictActionLabel(action));
      setExpanded(null);
      setReason('');
      setResolutionStrategy('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const statusLabel = finding.advisorFeedback
    ? gate1ConflictFeedbackLabel(finding.advisorFeedback)
    : null;

  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{finding.title}</span>
        <Badge
          variant={
            finding.severity === 'BLOCKER' || finding.severity === 'HIGH'
              ? 'destructive'
              : 'outline'
          }
        >
          {finding.severity}
        </Badge>
        <Badge variant="secondary">{finding.baselineStatus}</Badge>
        {finding.confidence && <Badge variant="outline">置信 {finding.confidence}</Badge>}
        {statusLabel && <Badge variant="default">已反馈 · {statusLabel}</Badge>}
      </div>
      <p className="mt-1 text-muted-foreground">{finding.description}</p>
      {finding.resolutionDirection && (
        <p className="mt-2 text-xs text-muted-foreground">
          解决方向：{finding.resolutionDirection}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(['CONFIRM', 'DISMISS', 'RESOLVE'] as const).map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={expanded === action ? 'default' : 'outline'}
            disabled={submitAction.isPending}
            onClick={() => setExpanded(expanded === action ? null : action)}
          >
            {gate1ConflictActionLabel(action)}
          </Button>
        ))}
      </div>

      {expanded === 'DISMISS' && (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
          <Label htmlFor={`dismiss-${finding.id}`}>驳回原因 *</Label>
          <Textarea
            id={`dismiss-${finding.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="说明为何该冲突不成立或无需处理"
          />
          <Button
            size="sm"
            disabled={submitAction.isPending}
            onClick={() => void handleAction('DISMISS')}
          >
            提交驳回
          </Button>
        </div>
      )}

      {expanded === 'RESOLVE' && (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
          <Label htmlFor={`resolve-${finding.id}`}>解决策略 *</Label>
          <Textarea
            id={`resolve-${finding.id}`}
            value={resolutionStrategy}
            onChange={(e) => setResolutionStrategy(e.target.value)}
            rows={2}
            placeholder="分流、调时、替代方案等"
          />
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="补充说明（可选）"
          />
          <Button
            size="sm"
            disabled={submitAction.isPending}
            onClick={() => void handleAction('RESOLVE')}
          >
            标记已解决
          </Button>
        </div>
      )}

      {expanded === 'CONFIRM' && (
        <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/30 p-3">
          <p className="flex-1 text-xs text-muted-foreground">
            确认该冲突成立，将纳入方案权衡与决策记录。
          </p>
          <Button
            size="sm"
            disabled={submitAction.isPending}
            onClick={() => void handleAction('CONFIRM')}
          >
            确认
          </Button>
        </div>
      )}
    </li>
  );
}
