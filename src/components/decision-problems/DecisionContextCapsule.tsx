import { cn } from '@/lib/utils';
import {
  decisionContextFactKindLabel,
  type DecisionContextFact,
} from '@/lib/decision-context-capsule.util';

const KIND_CLASS: Record<DecisionContextFact['kind'], string> = {
  confirmed: 'border-border/50 bg-muted/10 text-foreground',
  predicted: 'border-border/50 bg-muted/15 text-foreground',
  unconfirmed: 'border-dashed border-border/60 bg-background text-muted-foreground',
};

export interface DecisionContextCapsuleProps {
  facts: DecisionContextFact[];
  /** metrics：设计稿决策依据指标网格 */
  layout?: 'chips' | 'metrics';
  className?: string;
}

/** 决策执行空间 · 最小上下文切片 */
export function DecisionContextCapsule({
  facts,
  layout = 'metrics',
  className,
}: DecisionContextCapsuleProps) {
  if (!facts.length) return null;

  if (layout === 'metrics') {
    return (
      <section className={cn('rounded-xl border border-border/60 bg-card/60 px-3 py-2.5', className)}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          本次决策依据
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          只展示与该问题相关的判断依据
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5"
              title={decisionContextFactKindLabel(fact.kind)}
            >
              {fact.label ? (
                <p className="text-[9px] text-muted-foreground">{fact.label}</p>
              ) : null}
              <p className="text-[11px] font-medium leading-snug text-foreground">{fact.text}</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/60 px-3 py-2.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        本次决策依据
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {facts.map((fact) => (
          <li
            key={fact.id}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-snug',
              KIND_CLASS[fact.kind],
            )}
            title={decisionContextFactKindLabel(fact.kind)}
          >
            {fact.kind !== 'confirmed' ? (
              <span className="shrink-0 text-[9px] font-medium text-muted-foreground">
                {decisionContextFactKindLabel(fact.kind)}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{fact.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
