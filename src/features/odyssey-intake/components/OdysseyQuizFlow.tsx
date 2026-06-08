import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { OdysseyAnswerPayload, OdysseyQuestion } from '@/types/odyssey-intake';

interface OdysseyQuizFlowProps {
  questions: OdysseyQuestion[];
  onComplete: (answers: OdysseyAnswerPayload[]) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function OdysseyQuizFlow({
  questions,
  onComplete,
  onCancel,
  isSubmitting,
}: OdysseyQuizFlowProps) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C'>>({});

  const question = sorted[step];
  if (!question) return null;

  const progress = ((step + 1) / sorted.length) * 100;
  const selected = answers[question.id];
  const allAnswered = sorted.every((q) => answers[q.id] != null);

  const selectOption = (choice: 'A' | 'B' | 'C') => {
    const next = { ...answers, [question.id]: choice };
    setAnswers(next);
    if (step < sorted.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 280);
    }
  };

  const buildPayload = (): OdysseyAnswerPayload[] =>
    sorted.map((q) => ({
      scenarioId: q.id,
      optionId: answers[q.id]!,
    }));

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onCancel?.();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-neutral-950 text-white">
      <div className="border-b border-white/10 px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-white/50">
              <span>
                情景 {step + 1} / {sorted.length}
              </span>
              <span>约 90 秒</span>
            </div>
            <Progress value={progress} className="h-1 bg-white/10" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative flex flex-1 flex-col"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={question.wallpaper.url}
              className="pointer-events-none absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${question.wallpaper.url})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-black/55" />

          <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 md:px-8">
            <motion.p
              className="text-xs uppercase tracking-[0.25em] text-white/50"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {question.title}
            </motion.p>
            <motion.h1
              className="mt-4 text-xl font-medium leading-relaxed md:text-2xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {question.scenario}
            </motion.h1>

            <div className="mt-8 flex flex-col gap-3">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => selectOption(option.id)}
                  className={cn(
                    'rounded-xl border px-4 py-4 text-left text-sm leading-relaxed transition',
                    'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10',
                    selected === option.id && 'border-white/50 bg-white/15 ring-1 ring-white/30'
                  )}
                >
                  <span className="mr-2 font-medium text-white/50">{option.id}.</span>
                  {option.label}
                </button>
              ))}
            </div>

            {step > 0 && (
              <div className="mt-6">
                <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  上一题
                </Button>
              </div>
            )}

            {step === sorted.length - 1 && selected && !isSubmitting && (
              <div className="mt-auto pt-8">
                <Button
                  className="w-full bg-white text-neutral-900 hover:bg-white/90"
                  disabled={!allAnswered}
                  onClick={() => onComplete(buildPayload())}
                >
                  生成旅行身份名片
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
