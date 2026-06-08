import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PhysicalSurvivalQuizQuestion } from '@/types/match-square';
import { cn } from '@/lib/utils';

interface PhysicalSurvivalQuizPanelProps {
  questions: PhysicalSurvivalQuizQuestion[];
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
  className?: string;
}

/** §7.0.3 · Layer 0 户外生存题（Level 4+ 申请必答） */
export function PhysicalSurvivalQuizPanel({
  questions,
  answers,
  onChange,
  className,
}: PhysicalSurvivalQuizPanelProps) {
  if (!questions.length) return null;

  return (
    <div className={cn('space-y-3 rounded-md border border-amber-500/25 bg-amber-500/8 p-2.5', className)}>
      <div>
        <p className="text-xs font-medium text-amber-950 dark:text-amber-100">户外生存核验</p>
        <p className="mt-0.5 text-[11px] leading-snug text-amber-900/80 dark:text-amber-100/80">
          重装徒步剧本需完成下列题目；答错或未达标不会进入队长待审列表。
        </p>
      </div>

      {questions.map((question, index) => (
        <fieldset key={question.id} className="space-y-1.5">
          <legend className="text-xs leading-snug text-foreground">
            {index + 1}. {question.prompt}
          </legend>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onValueChange={(value) => onChange({ ...answers, [question.id]: value })}
            className="gap-1.5"
          >
            {question.options.map((option) => (
              <div key={option.value} className="flex items-start gap-2">
                <RadioGroupItem
                  value={option.value}
                  id={`${question.id}-${option.value}`}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`${question.id}-${option.value}`}
                  className="text-xs font-normal leading-snug text-muted-foreground"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      ))}
    </div>
  );
}
