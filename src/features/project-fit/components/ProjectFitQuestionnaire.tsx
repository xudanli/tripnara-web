import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import type { FitAssessmentAnswer, FitQuestionDefinition } from '@/types/project-fit';
import { DEFAULT_FIT_QUESTIONS } from '@/types/project-fit';

type AnswerMap = Record<string, boolean | number | string | null>;

function toAnswerMap(answers: FitAssessmentAnswer[]): AnswerMap {
  const map: AnswerMap = {};
  for (const a of answers) map[a.questionKey] = a.answer;
  return map;
}

function fromAnswerMap(
  map: AnswerMap,
  questions: FitQuestionDefinition[]
): FitAssessmentAnswer[] {
  return questions.map((q) => ({
    questionKey: q.questionKey,
    answer: map[q.questionKey] ?? null,
    sensitivityLevel: q.sensitivityLevel,
  }));
}

interface ProjectFitQuestionnaireProps {
  questions?: FitQuestionDefinition[];
  initialAnswers?: FitAssessmentAnswer[];
  onChange?: (answers: FitAssessmentAnswer[]) => void;
}

export function ProjectFitQuestionnaire({
  questions = DEFAULT_FIT_QUESTIONS,
  initialAnswers = [],
  onChange,
}: ProjectFitQuestionnaireProps) {
  const [answers, setAnswers] = useState<AnswerMap>(() => toAnswerMap(initialAnswers));

  const update = (key: string, value: boolean | number | string | null) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    onChange?.(fromAnswerMap(next, questions));
  };

  const sorted = useMemo(() => questions, [questions]);

  return (
    <div className="space-y-6">
      {sorted.map((q) => (
        <div key={q.questionKey} className="space-y-2 rounded-lg border border-border p-4">
          <div>
            <Label className="text-sm font-medium">
              {q.label}
              {q.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            {q.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{q.description}</p>
            )}
          </div>

          {q.inputType === 'boolean' && (
            <div className="flex items-center gap-2">
              <Switch
                checked={answers[q.questionKey] === true}
                onCheckedChange={(checked) => update(q.questionKey, checked)}
              />
              <span className="text-sm text-muted-foreground">
                {answers[q.questionKey] === true ? '是' : '否'}
              </span>
            </div>
          )}

          {q.inputType === 'currency' && (
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="例如 6000"
              value={
                typeof answers[q.questionKey] === 'number'
                  ? (answers[q.questionKey] as number) / 100
                  : ''
              }
              onChange={(e) => {
                const yuan = Number.parseFloat(e.target.value);
                update(
                  q.questionKey,
                  Number.isFinite(yuan) ? Math.round(yuan * 100) : null
                );
              }}
            />
          )}

          {q.inputType === 'scale' && (
            <div className="space-y-2 px-1">
              <Slider
                min={q.scaleMin ?? 1}
                max={q.scaleMax ?? 5}
                step={1}
                value={[
                  typeof answers[q.questionKey] === 'number'
                    ? (answers[q.questionKey] as number)
                    : q.scaleMin ?? 1,
                ]}
                onValueChange={([v]) => update(q.questionKey, v)}
              />
              <p className="text-center text-sm tabular-nums text-muted-foreground">
                {String(answers[q.questionKey] ?? q.scaleMin ?? 1)}
              </p>
            </div>
          )}

          {q.inputType === 'number' && (
            <Input
              type="number"
              value={answers[q.questionKey] != null ? String(answers[q.questionKey]) : ''}
              onChange={(e) => {
                const n = Number.parseFloat(e.target.value);
                update(q.questionKey, Number.isFinite(n) ? n : null);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function buildAnswersFromQuestionnaire(
  answers: FitAssessmentAnswer[]
): FitAssessmentAnswer[] {
  return answers.filter((a) => a.answer != null);
}
