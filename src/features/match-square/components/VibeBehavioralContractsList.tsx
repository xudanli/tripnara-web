import { cn } from '@/lib/utils';

export type VibeBehavioralContractItem = {
  title: string;
  clauses: string[];
};

interface VibeBehavioralContractsListProps {
  contracts: VibeBehavioralContractItem[];
  /** @deprecated 使用 variant */
  compact?: boolean;
  variant?: 'default' | 'apply';
  className?: string;
}

function clauseItems(clauses: string[]): string[] {
  const flat: string[] = [];
  for (const clause of clauses) {
    const parts = clause
      .split(/\n+|(?:\s*[·•]\s*)|(?:\s*;\s*)/)
      .map((s) => s.trim())
      .filter(Boolean);
    flat.push(...(parts.length ? parts : [clause.trim()]));
  }
  return flat;
}

/** Vibe 行为契约 · title + clauses 列表 */
export function VibeBehavioralContractsList({
  contracts,
  compact = false,
  variant = compact ? 'apply' : 'default',
  className,
}: VibeBehavioralContractsListProps) {
  if (!contracts.length) return null;

  const isApply = variant === 'apply';

  return (
    <ul
      className={cn(
        isApply ? 'space-y-1.5' : 'space-y-3 text-sm leading-relaxed',
        className
      )}
    >
      {contracts.map((contract) => {
        const items = clauseItems(contract.clauses);
        return (
          <li
            key={contract.title}
            className={
              isApply
                ? 'rounded border border-border/60 bg-background/95 px-2 py-1.5'
                : 'border-l-2 border-[var(--gate-confirm-border)] pl-3 text-muted-foreground'
            }
          >
            <p className="text-xs font-medium leading-snug text-foreground">{contract.title}</p>
            <ul className="mt-1 space-y-0.5">
              {items.map((item) => (
                <li
                  key={`${contract.title}-${item}`}
                  className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground"
                >
                  {isApply && (
                    <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
