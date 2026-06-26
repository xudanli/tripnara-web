/**
 * @deprecated 使用 Gate1ConflictsPanel + Gate1CandidatesPanel
 */
import { Gate1CandidatesPanel } from './Gate1CandidatesPanel';
import { Gate1ConflictsPanel } from './Gate1ConflictsPanel';
import { Gate1SanitizedConstraintsCard } from './Gate1SanitizedConstraintsCard';
import { useGate1AdvisorOutputs } from '@/hooks/useGate1';
import { LogoLoading } from '@/components/common/LogoLoading';

interface Gate1AdvisorOutputsPanelProps {
  projectId: string;
  baselineReady: boolean;
}

export function Gate1AdvisorOutputsPanel({
  projectId,
  baselineReady,
}: Gate1AdvisorOutputsPanelProps) {
  const { data, isLoading } = useGate1AdvisorOutputs(projectId);

  if (isLoading && baselineReady) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.sanitized && data.sanitized.length > 0 && (
        <Gate1SanitizedConstraintsCard constraints={data.sanitized} />
      )}
      <Gate1ConflictsPanel projectId={projectId} baselineReady={baselineReady} />
      <Gate1CandidatesPanel projectId={projectId} baselineReady={baselineReady} />
    </div>
  );
}
