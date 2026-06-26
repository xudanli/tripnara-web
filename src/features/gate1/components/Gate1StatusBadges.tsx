import { Badge } from '@/components/ui/badge';
import { gate1CohortLabel, gate1ExperimentStatusLabel } from '@/lib/gate1-display';
import type { Gate1Cohort, Gate1ExperimentStatus } from '@/types/gate1';

export function Gate1CohortBadge({ cohort }: { cohort: Gate1Cohort }) {
  return (
    <Badge variant="outline" className="font-normal">
      {gate1CohortLabel(cohort)}
    </Badge>
  );
}

export function Gate1StatusBadge({ status }: { status: Gate1ExperimentStatus }) {
  const variant =
    status === 'COMPLETED'
      ? 'default'
      : status === 'WITHDRAWN'
        ? 'destructive'
        : status === 'ADVISOR_DECIDING' || status === 'ANALYZING'
          ? 'secondary'
          : 'outline';

  return (
    <Badge variant={variant} className="font-normal">
      {gate1ExperimentStatusLabel(status)}
    </Badge>
  );
}
