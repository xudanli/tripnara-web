import { getPersonaIcon, normalizePersona, type PersonaType } from '@/lib/persona-icons';
import { personaSymbolCellClass } from '@/lib/persona-symbol.util';
import { cn } from '@/lib/utils';

export interface PersonaSymbolProps {
  persona: PersonaType | string;
  size?: 24 | 28 | 32;
  className?: string;
}

/** 三人格符号 · Shield / Activity / RefreshCw + gate 语义色 */
export function PersonaSymbol({ persona, size = 32, className }: PersonaSymbolProps) {
  const normalized = normalizePersona(persona);
  const Icon = getPersonaIcon(normalized);
  const cellClass =
    size === 24 ? 'h-6 w-6' : size === 28 ? 'h-7 w-7' : 'h-8 w-8';
  const iconClass =
    size === 24 ? 'h-3 w-3' : size === 28 ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg border',
        cellClass,
        personaSymbolCellClass(normalized),
        className,
      )}
      aria-hidden
    >
      <Icon className={iconClass} />
    </span>
  );
}
