import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PersonaSymbol } from '@/components/common/PersonaSymbol';
import type {
  PersonaValidationDimension,
  PersonaValidationStance,
} from '@/lib/persona-validation-dimensions.util';

const STANCE_TONE: Record<PersonaValidationStance, 'good' | 'neutral' | 'bad'> = {
  ok: 'good',
  adjust: 'neutral',
  oppose: 'bad',
};

const STANCE_CLASS: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'text-gate-allow-foreground',
  neutral: 'text-gate-confirm-foreground',
  bad: 'text-gate-reject-foreground',
};

export interface DecisionPersonaValidationStripProps {
  dimensions: PersonaValidationDimension[];
  sourceHint?: string;
  footerAction?: ReactNode;
  className?: string;
  compact?: boolean;
  /** 展示三人格符号（非拟人头像） */
  showPersonaSymbols?: boolean;
}

/** 决策闭环卡 · 可行性 / 节奏 / 体验保留 */
export function DecisionPersonaValidationStrip({
  dimensions,
  sourceHint,
  footerAction,
  className,
  compact = false,
  showPersonaSymbols = false,
}: DecisionPersonaValidationStripProps) {
  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        验证维度
        {sourceHint ? (
          <span className="ml-1 normal-case font-normal text-muted-foreground/80">
            · {sourceHint}
          </span>
        ) : null}
      </p>
      <div className={cn('grid grid-cols-3', compact ? 'gap-1' : 'gap-2')}>
        {dimensions.map((dimension) => (
          <div
            key={dimension.key}
            className={cn(
              'rounded-md border border-border/60 bg-muted/15',
              compact ? 'px-1.5 py-1' : 'rounded-lg px-2 py-1.5',
            )}
          >
            {showPersonaSymbols ? (
              <PersonaSymbol persona={dimension.persona} size={24} className="mb-1" />
            ) : null}
            <p className="text-[10px] text-muted-foreground">{dimension.label}</p>
            <p
              className={cn(
                'font-semibold leading-tight',
                compact ? 'mt-0 text-[10px]' : 'mt-0.5 text-xs',
                STANCE_CLASS[STANCE_TONE[dimension.stance]],
              )}
            >
              {dimension.stanceLabel}
            </p>
          </div>
        ))}
      </div>
      {footerAction}
    </div>
  );
}
