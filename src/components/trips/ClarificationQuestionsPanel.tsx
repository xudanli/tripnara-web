import * as React from 'react';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClarificationQuestionCard } from '@/components/trips/ClarificationQuestionCard';

export interface ClarificationQuestionsPanelProps {
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  onAnswerChange: (answers: ClarificationAnswer[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

function getAnswerValue(
  answers: ClarificationAnswer[],
  questionId: string
): ClarificationAnswer['value'] {
  return answers.find((a) => a.questionId === questionId)?.value ?? null;
}

function upsertAnswer(
  answers: ClarificationAnswer[],
  questionId: string,
  value: ClarificationAnswer['value']
) {
  const idx = answers.findIndex((a) => a.questionId === questionId);
  if (idx === -1) return [...answers, { questionId, value }];
  const next = answers.slice();
  next[idx] = { questionId, value };
  return next;
}

function isAnswered(q: ClarificationQuestion, v: ClarificationAnswer['value']) {
  if (!q.required) return true;
  if (v == null) return false;
  if (q.type === 'multi_choice') return Array.isArray(v) && v.length > 0;
  if (q.type === 'number') return typeof v === 'number' && Number.isFinite(v);
  return String(v).trim().length > 0;
}

export function ClarificationQuestionsPanel({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onCancel,
  disabled,
  className,
}: ClarificationQuestionsPanelProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = React.useCallback(() => {
    const nextErrors: Record<string, string> = {};
    for (const q of questions) {
      const v = getAnswerValue(answers, q.id);
      if (!isAnswered(q, v)) {
        nextErrors[q.id] = '此问题为必填项';
        continue;
      }

      if (v == null || q.validation == null) continue;

      if (q.type === 'text' && typeof v === 'string' && q.validation.pattern) {
        try {
          const re = new RegExp(q.validation.pattern);
          if (!re.test(v)) nextErrors[q.id] = '格式不正确';
        } catch {
          // If backend provides an invalid regex string, skip.
        }
      }

      if (q.type === 'number' && typeof v === 'number') {
        if (typeof q.validation.min === 'number' && v < q.validation.min) nextErrors[q.id] = `不能小于 ${q.validation.min}`;
        if (typeof q.validation.max === 'number' && v > q.validation.max) nextErrors[q.id] = `不能大于 ${q.validation.max}`;
      }

      if (q.type === 'date' && typeof v === 'string') {
        const ms = Date.parse(v);
        if (Number.isFinite(ms)) {
          if (typeof q.validation.min === 'number' && ms < q.validation.min) nextErrors[q.id] = '日期过早';
          if (typeof q.validation.max === 'number' && ms > q.validation.max) nextErrors[q.id] = '日期过晚';
        }
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [answers, questions]);

  const allRequiredAnswered = React.useMemo(() => {
    return questions.every((q) => isAnswered(q, getAnswerValue(answers, q.id)));
  }, [answers, questions]);

  return (
    <Card className={cn('border-yellow-200 bg-yellow-50/30', className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-lg text-yellow-900">需要澄清的问题</CardTitle>
            <CardDescription className="mt-1">
              为了更好地创建您的行程，请回答以下问题：
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q) => (
          <ClarificationQuestionCard
            key={q.id}
            question={q}
            value={getAnswerValue(answers, q.id)}
            onChange={(v) => onAnswerChange(upsertAnswer(answers, q.id, v))}
            error={errors[q.id]}
            disabled={disabled}
          />
        ))}

        <div className="flex justify-end gap-3 pt-2">
          {onCancel ? (
            <Button variant="outline" onClick={onCancel} disabled={disabled}>
              取消
            </Button>
          ) : null}
          <Button
            onClick={() => {
              if (!validate()) return;
              onSubmit();
            }}
            disabled={disabled || !allRequiredAnswered}
          >
            提交
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

