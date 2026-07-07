/**
 * Dashboard — 创建行程入口
 */

import { useEffect, useState } from 'react';
import { LogoLoading } from '@/components/common/LogoLoading';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import { CreateTripEntryPicker } from '@/components/guide-import/CreateTripEntryPicker';
import { GuideImportPageShell } from '@/components/guide-import/guide-import-ui';
import { useFitnessPrompt } from '@/hooks/useFitnessPrompt';
import { FitnessPromptCard } from '@/components/fitness';
import { ParticipantProjectsBanner } from '@/features/participant-portal';

export default function DashboardPage() {
  const { isFirstTime, completeWelcome, dismiss } = useOnboarding();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { shouldShow, tryShowPrompt, onComplete, onDismiss, hasProfile, isLoading: fitnessLoading } =
    useFitnessPrompt();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isFirstTime) setShowWelcomeModal(true);
  }, [isFirstTime, loading]);

  useEffect(() => {
    if (loading || showWelcomeModal || fitnessLoading) return;
    if (!hasProfile) {
      const timer = setTimeout(() => tryShowPrompt('login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, showWelcomeModal, fitnessLoading, hasProfile, tryShowPrompt]);

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    completeWelcome(experienceType);
    setShowWelcomeModal(false);
  };

  if (loading) {
    return <LogoLoading size={48} fullScreen />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          dismiss();
        }}
        onComplete={handleWelcomeComplete}
      />

      <div className="px-4 sm:px-8 pt-3 max-w-5xl mx-auto w-full space-y-2">
        <ParticipantProjectsBanner compact />
        {shouldShow && (
          <FitnessPromptCard
            variant="banner"
            trigger="dashboard_prompt"
            onComplete={onComplete}
            onDismiss={onDismiss}
          />
        )}
      </div>

      <GuideImportPageShell className="flex-1 min-h-0">
        <CreateTripEntryPicker showPageTitle />
      </GuideImportPageShell>
    </div>
  );
}
