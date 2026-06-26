import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { Gate1ExperimentStatus } from '@/types/gate1';

const BASELINE_GATE_STATUSES: Gate1ExperimentStatus[] = ['DRAFT'];

interface Gate1BaselineGateBannerProps {
  experimentStatus: Gate1ExperimentStatus;
  baselineConfirmed?: boolean;
  onGoBaseline?: () => void;
}

/** AC-01：Baseline 未确认时不可查看/发布 Intervention */
export function Gate1BaselineGateBanner({
  experimentStatus,
  baselineConfirmed,
  onGoBaseline,
}: Gate1BaselineGateBannerProps) {
  const blocked =
    BASELINE_GATE_STATUSES.includes(experimentStatus) || baselineConfirmed === false;

  if (!blocked) return null;

  return (
    <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>需先完成 Baseline</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          在 TripNARA 介入前，顾问须记录原有方案与已知问题。未完成 Baseline 前，运营不可向顾问发布冲突报告或候选方案。
        </span>
        {onGoBaseline && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={onGoBaseline}>
            前往 Baseline
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
