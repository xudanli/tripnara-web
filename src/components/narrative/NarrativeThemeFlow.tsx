import { useState } from 'react';
import { toast } from 'sonner';
import { useNarrativeThemeMutations } from '@/hooks/useNarrativeTheme';
import { resolveNarrativeThemeErrorMessage } from '@/lib/narrative-theme-error.util';
import type {
  GenerateCandidatesResult,
  NarrativeIntakeInput,
  ThemeCandidate,
} from '@/types/narrative-engine';
import { NarrativeThemeCandidateList } from './NarrativeThemeCandidateList';
import { NarrativeThemeIntakeForm } from './NarrativeThemeIntakeForm';

type FlowStep = 'intake' | 'candidates';

interface NarrativeThemeFlowProps {
  tripId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
  initialStep?: FlowStep;
}

export function NarrativeThemeFlow({
  tripId,
  onComplete,
  onSkip,
  className,
  initialStep = 'intake',
}: NarrativeThemeFlowProps) {
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [session, setSession] = useState<GenerateCandidatesResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<ThemeCandidate | null>(null);

  const { submitIntake, selectTheme, regenerateCandidates } = useNarrativeThemeMutations(tripId);

  const handleIntakeSubmit = async (intake: NarrativeIntakeInput) => {
    try {
      const result = await submitIntake.mutateAsync({
        intake,
        locale: 'zh-CN',
      });
      setSession(result);
      setSelectedCandidate(result.candidates[0] ?? null);
      setStep('candidates');
    } catch (error) {
      toast.error(resolveNarrativeThemeErrorMessage(error));
    }
  };

  const handleRegenerate = async () => {
    if (!session?.generationRequestId) return;
    try {
      const result = await regenerateCandidates.mutateAsync({
        generationRequestId: session.generationRequestId,
      });
      setSession(result);
      setSelectedCandidate(result.candidates[0] ?? null);
    } catch (error) {
      toast.error(resolveNarrativeThemeErrorMessage(error));
    }
  };

  const handleConfirm = async () => {
    if (!session || !selectedCandidate) return;
    try {
      await selectTheme.mutateAsync({
        themeId: selectedCandidate.id,
        generationRequestId: session.generationRequestId,
      });
      toast.success('旅行主题已选定');
      onComplete?.();
    } catch (error) {
      toast.error(resolveNarrativeThemeErrorMessage(error));
    }
  };

  if (step === 'intake') {
    return (
      <div className={className}>
        <NarrativeThemeIntakeForm
          onSubmit={handleIntakeSubmit}
          isSubmitting={submitIntake.isPending}
        />
        {onSkip && (
          <button
            type="button"
            className="mt-4 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={onSkip}
            disabled={submitIntake.isPending}
          >
            暂时跳过
          </button>
        )}
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={className}>
      <NarrativeThemeCandidateList
        session={session}
        selectedId={selectedCandidate?.id}
        onSelect={setSelectedCandidate}
        onRegenerate={handleRegenerate}
        onConfirm={handleConfirm}
        isRegenerating={regenerateCandidates.isPending}
        isConfirming={selectTheme.isPending}
      />
      {onSkip && (
        <button
          type="button"
          className="mt-4 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          onClick={onSkip}
          disabled={selectTheme.isPending || regenerateCandidates.isPending}
        >
          暂时跳过
        </button>
      )}
    </div>
  );
}
