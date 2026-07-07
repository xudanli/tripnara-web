import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DecisionOutcomeValidationPanel } from '@/components/decision-problems/DecisionOutcomeValidationPanel';
import { DecisionExecutionStatusPanel } from '@/components/decision-problems/DecisionExecutionStatusPanel';
import { useDecisionOutcomeValidation } from '@/hooks/useDecisionOutcomeValidation';
import { useDecisionExecutionResume } from '@/hooks/useDecisionExecutionResume';
import { decisionProblemsApi } from '@/api/decision-problems';
import { notifyDecisionValidationRefresh } from '@/lib/plan-studio-loop-events';
import type { DecisionRecordDetail } from '@/types/decision-problem';

export interface DecisionRecordDrawerProps {
  tripId: string;
  decisionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** execution 终态且 shouldRefreshItinerary 时刷新行程 */
  onExecutionSettled?: () => void | Promise<void>;
}

/** 决策记录详情 + 执行态续 poll + prediction vs actual 验证 */
export function DecisionRecordDrawer({
  tripId,
  decisionId,
  open,
  onOpenChange,
  onExecutionSettled,
}: DecisionRecordDrawerProps) {
  const [record, setRecord] = useState<DecisionRecordDetail | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const handleTerminal = useCallback(
    async (status: import('@/types/decision-problem').DecisionExecutionStatusResponse) => {
      if (tripId && decisionId) {
        notifyDecisionValidationRefresh(tripId, { decisionId });
      }
      void onExecutionSettled?.();
      if (status.status && tripId && decisionId) {
        try {
          const data = await decisionProblemsApi.getDecision(tripId, decisionId);
          setRecord(data);
        } catch {
          /* ignore refresh errors */
        }
      }
    },
    [tripId, decisionId, onExecutionSettled],
  );

  const executionResume = useDecisionExecutionResume({
    tripId,
    decisionId,
    enabled: open && Boolean(decisionId),
    onTerminal: (status) => void handleTerminal(status),
  });

  const validationQuery = useDecisionOutcomeValidation({
    tripId,
    decisionId,
    enabled: open && Boolean(decisionId) && executionResume.isTerminal,
  });

  const loadRecord = useCallback(async () => {
    if (!tripId || !decisionId) return;
    try {
      setRecordLoading(true);
      setRecordError(null);
      const data = await decisionProblemsApi.getDecision(tripId, decisionId);
      setRecord(data);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : '加载决策记录失败');
    } finally {
      setRecordLoading(false);
    }
  }, [tripId, decisionId]);

  useEffect(() => {
    if (!open || !decisionId) {
      setRecord(null);
      return;
    }
    void loadRecord();
  }, [open, decisionId, loadRecord]);

  const displayValidation =
    validationQuery.validation ??
    (record?.lastOutcomeValidation
      ? {
          ...record.lastOutcomeValidation,
          id: record.lastOutcomeValidation.id ?? '',
          decisionId: decisionId ?? '',
          tripId,
          expectedOutcomes: [],
          observedOutcomes: [],
          verdict: record.lastOutcomeValidation.verdict ?? record.validationStatus ?? 'PENDING',
        }
      : null);

  const showExecutionPanel =
    Boolean(executionResume.status) ||
    executionResume.polling ||
    Boolean(executionResume.error);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>决策记录</SheetTitle>
          <SheetDescription>
            {record?.selectedOptionId
              ? `已选方案 ${record.selectedOptionId}`
              : '查看决策执行与效果验证'}
          </SheetDescription>
        </SheetHeader>

        {recordLoading && !record ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中…
          </div>
        ) : recordError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {recordError}
          </div>
        ) : (
          <div className="mt-4 space-y-6 pb-8">
            {showExecutionPanel ? (
              <DecisionExecutionStatusPanel
                status={executionResume.status}
                polling={executionResume.polling}
                variant={executionResume.variant}
                effectiveDecisionId={decisionId}
                onRefreshEvidence={() => void loadRecord()}
                onViewItineraryChanges={() => onOpenChange(false)}
              />
            ) : null}

            {executionResume.error ? (
              <p className="text-xs text-destructive">{executionResume.error}</p>
            ) : null}

            {record ? (
              <section className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm space-y-2">
                <p>
                  状态：<span className="font-medium">{record.status}</span>
                  {record.validationStatus ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      验证 {record.validationStatus}
                    </span>
                  ) : null}
                </p>
                {record.reason ? <p className="text-muted-foreground">备注：{record.reason}</p> : null}
                {record.decidedAt ? (
                  <p className="text-xs text-muted-foreground">
                    决定时间 · {new Date(record.decidedAt).toLocaleString('zh-CN')}
                  </p>
                ) : null}
              </section>
            ) : null}

            {executionResume.isTerminal || !showExecutionPanel ? (
              <DecisionOutcomeValidationPanel
                validation={displayValidation}
                loading={validationQuery.loading}
                error={validationQuery.error}
                onRefresh={() => void validationQuery.reload()}
              />
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
