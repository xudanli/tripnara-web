import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { usePremiumStressQuestions } from '@/hooks/useOdysseyIntake';
import { MbtiSelfSelectStep } from './MbtiSelfSelectStep';
import { PremiumStressTestFlow } from './PremiumStressTestFlow';
import { IdentityHubSection } from './IdentityHubSection';
import type { OdysseyAnswerPayload } from '@/types/odyssey-intake';
import type { MbtiType, PremiumStressAnswerChoice } from '@/types/odyssey-travel-persona';

type WizardStep = 'mbti' | 'credentials' | 'stress';

interface OdysseyIntakeWizardProps {
  onComplete: (payload: {
    mbtiType: MbtiType;
    answers: OdysseyAnswerPayload[];
    intakeVersion: 'premium_v2';
  }) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const STEP_LABELS: Record<WizardStep, string> = {
  mbti: '人格自选',
  credentials: '硬核背书',
  stress: '抗压测试',
};

export function OdysseyIntakeWizard({
  onComplete,
  onCancel,
  isSubmitting,
}: OdysseyIntakeWizardProps) {
  const [step, setStep] = useState<WizardStep>('mbti');
  const [mbtiType, setMbtiType] = useState<MbtiType | null>(null);
  const stressQuestionsQuery = usePremiumStressQuestions(step === 'stress');

  const stepIndex = step === 'mbti' ? 0 : step === 'credentials' ? 1 : 2;

  const buildPayload = (stressAnswers: Record<string, PremiumStressAnswerChoice>) => {
    if (!mbtiType) return;

    const sortedIds = [...(stressQuestionsQuery.data ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((q) => q.id);

    const answers: OdysseyAnswerPayload[] = sortedIds
      .filter((scenarioId) => stressAnswers[scenarioId] != null)
      .map((scenarioId) => ({
        scenarioId,
        optionId: stressAnswers[scenarioId]!,
      }));

    onComplete({
      mbtiType,
      answers,
      intakeVersion: 'premium_v2',
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      <div className="border-b border-border bg-background px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 'mbti') onCancel?.();
              else if (step === 'credentials') setStep('mbti');
              else setStep('credentials');
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="mb-2 flex gap-2">
              {(['mbti', 'credentials', 'stress'] as WizardStep[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Odyssey Premium · {STEP_LABELS[step]} · {stepIndex + 1}/3
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:px-8">
        <AnimatePresence mode="wait">
          {step === 'mbti' && (
            <motion.div
              key="mbti"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              <MbtiSelfSelectStep
                selected={mbtiType}
                onSelect={(type) => setMbtiType(type)}
              />
              <div className="mt-8 flex justify-end">
                <Button
                  disabled={!mbtiType}
                  onClick={() => setStep('credentials')}
                  className="min-w-[140px]"
                >
                  继续 · 硬核背书
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Step 2 · 硬核履约背书
                </p>
                <h1 className="mt-2 text-xl font-semibold text-foreground md:text-2xl">
                  学信网 + 企业邮箱 · 瞬间点亮硬信任微标
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  授信后可展示 [🎓 硕士(已认证)]、[💼 大厂产品总监] 等脱敏标签。可跳过，稍后在 Profile 完成。
                </p>
              </div>
              <IdentityHubSection completed={false} intakeMode className="shadow-sm" />
              <div className="mt-6 flex justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep('stress')}>
                  稍后再说
                </Button>
                <Button onClick={() => setStep('stress')} className="min-w-[140px]">
                  继续 · 抗压测试
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'stress' && (
            <motion.div
              key="stress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Step 3 · Premium Stress Test
                </p>
                <h1 className="mt-2 text-xl font-semibold text-foreground md:text-2xl">
                  行中共事与抗压风险测试
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  不测 E/I 或 S/N — 只提取你在高压协作下的真实决策底色
                </p>
              </div>

              {stressQuestionsQuery.isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center py-16">
                  <LogoLoading size={40} />
                  <p className="mt-4 text-sm text-muted-foreground">加载博弈题…</p>
                </div>
              ) : stressQuestionsQuery.isError || !stressQuestionsQuery.data?.length ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
                  <p className="text-sm text-muted-foreground">无法加载抗压测试题目</p>
                  <Button variant="outline" size="sm" onClick={() => stressQuestionsQuery.refetch()}>
                    重试
                  </Button>
                </div>
              ) : (
                <PremiumStressTestFlow
                  questions={stressQuestionsQuery.data}
                  onComplete={buildPayload}
                  onBack={() => setStep('credentials')}
                  isSubmitting={isSubmitting}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
