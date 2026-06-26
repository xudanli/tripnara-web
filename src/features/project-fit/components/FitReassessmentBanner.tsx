import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatReassessmentReasons } from '@/lib/normalize-fit-questionnaire';
import type { FitAssessmentStatusResponse } from '@/types/project-fit';

interface FitReassessmentBannerProps {
  status: FitAssessmentStatusResponse;
  onRestart?: () => void;
}

export function FitReassessmentBanner({ status, onRestart }: FitReassessmentBannerProps) {
  if (!status.needsReassessment || !status.assessment) return null;

  const reasons = formatReassessmentReasons(status.reasons);
  if (reasons.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">需要重新评估适合度</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {reasons.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            当前规则版本 v{status.currentRuleVersion}
            {status.assessment?.ruleSnapshotVersion != null &&
              ` · 上次评估基于 v${status.assessment.ruleSnapshotVersion}`}
          </p>
        </div>
      </div>
      {onRestart && (
        <Button size="sm" variant="outline" onClick={onRestart}>
          重新评估
        </Button>
      )}
    </div>
  );
}
