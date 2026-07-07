import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import {
  getPersonaName,
  PERSONA_ROLE_LABEL_ZH,
  type PersonaType,
} from '@/lib/persona-icons';

export type TripPersonaHealthRowProps = {
  persona: PersonaType;
  statusLabel: string;
  statusTone?: 'success' | 'info' | 'warning';
  interactive?: boolean;
  expanded?: boolean;
  hasDetails?: boolean;
  onClick?: () => void;
};

const STATUS_TONE_CLASS: Record<NonNullable<TripPersonaHealthRowProps['statusTone']>, string> = {
  success: 'text-success dark:text-success',
  info: 'text-muted-foreground',
  warning: 'text-error dark:text-error',
};

export function TripPersonaHealthRow({
  persona,
  statusLabel,
  statusTone = 'success',
  interactive = false,
  expanded = false,
  hasDetails = false,
  onClick,
}: TripPersonaHealthRowProps) {
  const content = (
    <>
      <PersonaAvatar persona={persona} size={40} withBackground />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{getPersonaName(persona)}</p>
        <p className="text-xs text-muted-foreground">{PERSONA_ROLE_LABEL_ZH[persona]}</p>
      </div>
      <span
        className={cn(
          'text-xs font-medium shrink-0',
          STATUS_TONE_CLASS[statusTone]
        )}
      >
        {statusLabel}
      </span>
      {hasDetails ? (
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={cn(
          'flex items-center gap-3 w-full text-left rounded-md px-1 py-1 -mx-1',
          'hover:bg-muted/50 transition-colors',
        )}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{content}</div>;
}
