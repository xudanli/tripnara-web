import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PremiumStressQuestion } from '../constants/premium-stress-test';
import type { PremiumStressAnswerChoice } from '@/types/odyssey-travel-persona';

interface PremiumStressTestFlowProps {
  questions: PremiumStressQuestion[];
  onComplete: (answers: Record<string, PremiumStressAnswerChoice>) => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

export function PremiumStressTestFlow({
  questions,
  onComplete,
  onBack,
  isSubmitting,
}: PremiumStressTestFlowProps) {
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, PremiumStressAnswerChoice>>>({});

  const question = sortedQuestions[step];
  if (!question) return null;

  const progress = ((step + 1) / sortedQuestions.length) * 100;
  const selected = answers[question.id];
  const allAnswered = sortedQuestions.every((q) => answers[q.id] != null);

  const selectOption = (choice: PremiumStressAnswerChoice) => {
    const next = { ...answers, [question.id]: choice };
    setAnswers(next);
    if (step < sortedQuestions.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 280);
    }
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onBack?.();
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    const payload = {} as Record<string, PremiumStressAnswerChoice>;
    for (const q of sortedQuestions) {
      payload[q.id] = answers[q.id]!;
    }
    onComplete(payload);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>
            博弈题 {step + 1} / {sortedQuestions.length}
          </span>
          <span>行中决策画像</span>
        </div>
        <Progress value={progress} className="h-1 bg-muted" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={cn(
            'relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 p-5 md:p-6',
            `bg-gradient-to-br ${question.wallpaperGradient}`
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">{question.title}</p>
          <h2 className="mt-4 text-lg font-medium leading-relaxed text-white md:text-xl">
            {question.scenario}
          </h2>

          <div className="mt-8 flex flex-col gap-3">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => selectOption(option.id)}
                className={cn(
                  'rounded-xl border px-4 py-4 text-left transition-all',
                  selected === option.id
                    ? 'border-white/50 bg-white/15 shadow-lg'
                    : 'border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/10'
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                  {option.tag}
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-white/90">{option.label}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          上一步
        </Button>
        {step === sortedQuestions.length - 1 && allAnswered && (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1">
            生成旅行身份名片
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
