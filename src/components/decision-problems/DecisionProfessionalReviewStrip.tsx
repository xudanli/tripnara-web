import { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonaSymbol } from '@/components/common/PersonaSymbol';
import {
  buildPersonaValidationDimensionsFromOption,
  buildPersonaValidationDimensions,
  type PersonaValidationDimension,
  type PersonaValidationStance,
} from '@/lib/persona-validation-dimensions.util';
import type { DecisionOption } from '@/types/decision-problem';
import type { PersonaAlert } from '@/types/trip';

const REVIEW_ROLE: Record<PersonaValidationDimension['persona'], string> = {
  ABU: '安全与可执行性',
  DR_DRE: '节奏与成员负担',
  NEPTUNE: '方案完整性',
};

const STANCE_LABEL: Record<PersonaValidationStance, string> = {
  ok: '通过',
  adjust: '有代价',
  oppose: '需关注',
};

const STANCE_CLASS: Record<PersonaValidationStance, string> = {
  ok: 'text-gate-allow-foreground',
  adjust: 'text-gate-confirm-foreground',
  oppose: 'text-gate-reject-foreground',
};

export interface DecisionProfessionalReviewStripProps {
  selectedOption?: DecisionOption | null;
  selectedOptionLetter?: string;
  personaAlerts?: PersonaAlert[];
  className?: string;
}

function ReviewRow({ dimension }: { dimension: PersonaValidationDimension }) {
  return (
    <div className="rounded-lg border border-border/55 bg-muted/10 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <PersonaSymbol persona={dimension.persona} size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-medium text-foreground">
              {REVIEW_ROLE[dimension.persona]}
            </p>
            <span className={cn('text-[11px] font-semibold', STANCE_CLASS[dimension.stance])}>
              {STANCE_LABEL[dimension.stance]}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {dimension.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

/** 决策执行空间 · 专业审查结论（非投票） */
export function DecisionProfessionalReviewStrip({
  selectedOption,
  selectedOptionLetter = 'A',
  personaAlerts,
  className,
}: DecisionProfessionalReviewStripProps) {
  const [expanded, setExpanded] = useState(false);

  const dimensions =
    selectedOption?.tradeoffs?.length
      ? buildPersonaValidationDimensionsFromOption(selectedOption, selectedOptionLetter)
      : buildPersonaValidationDimensions(personaAlerts, selectedOptionLetter);

  const allPass = dimensions.every((dimension) => dimension.stance === 'ok');
  const hasDivergence = dimensions.some((dimension) => dimension.stance !== 'ok');

  if (!dimensions.length) return null;

  if (allPass && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border border-gate-allow-border/50 bg-gate-allow/8 px-3 py-2 text-left',
          className,
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-gate-allow-foreground" />
        <span className="text-xs font-medium text-foreground">三项审查均已通过</span>
        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">AI 专业审查</p>
        {allPass ? (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(false)}
          >
            收起
          </button>
        ) : hasDivergence ? (
          <span className="text-[10px] text-gate-confirm-foreground">存在分歧，请展开查看</span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {dimensions.map((dimension) => (
          <ReviewRow key={dimension.key} dimension={dimension} />
        ))}
      </div>
    </section>
  );
}
