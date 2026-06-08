/**
 * 三人格门禁澄清卡：合议要点 + 单选（不展示诉求复述 / 可行性红框，后端 metadata 仍保留）
 */

import { useState } from 'react';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { parseGuardianDebateSections } from '@/lib/route-run-clarification';
import { resolveClarificationChoices } from '@/lib/clarification-options';
import { personaFromCouncilBullet } from '@/lib/persona-icons';

export type GuardianDebateClarificationCardProps = {
  question: ClarificationQuestion;
  onSubmit: (answer: ClarificationAnswer) => void;
  disabled?: boolean;
  className?: string;
};

export function GuardianDebateClarificationCard({
  question,
  onSubmit,
  disabled,
  className,
}: GuardianDebateClarificationCardProps) {
  const sections = parseGuardianDebateSections(question);
  const choices = resolveClarificationChoices(question);
  const [selected, setSelected] = useState<string>();

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border border-amber-200/90 bg-amber-50/20 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/15',
        className
      )}
    >
      {sections.councilBullets.length > 0 ? (
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">合议对照（针对上述诉求）</p>
          <ul className="space-y-2 text-sm text-foreground/90">
            {sections.councilBullets.map((line) => {
              const persona = personaFromCouncilBullet(line);
              return (
                <li key={line} className="flex items-start gap-2 leading-relaxed">
                  {persona ? (
                    <PersonaAvatar persona={persona} size={28} withBackground className="mt-0.5" />
                  ) : null}
                  <span className="min-w-0 flex-1">{line}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : question.question.trim() ? (
        <section className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">合议说明</p>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {question.question.trim()}
          </p>
        </section>
      ) : null}

      <div className="space-y-2" role="radiogroup" aria-label="请选择一项">
        {choices.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={selected === opt.value ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className="h-auto w-full justify-start whitespace-normal py-2 text-left text-xs leading-snug"
            onClick={() => setSelected(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={disabled || !selected}
        onClick={() => {
          if (!selected) return;
          onSubmit({ questionId: question.id, value: selected });
        }}
      >
        确认并继续
      </Button>
    </div>
  );
}
