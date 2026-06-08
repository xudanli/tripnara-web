import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { cn } from '@/lib/utils';
import {
  getPersonaName,
  PERSONA_ROLE_LABEL_ZH,
  type PersonaType,
} from '@/lib/persona-icons';

export type TripPersonaHealthRowProps = {
  persona: PersonaType;
  statusLabel: string;
  statusTone?: 'success' | 'info' | 'warning';
};

const STATUS_TONE_CLASS: Record<NonNullable<TripPersonaHealthRowProps['statusTone']>, string> = {
  success: 'text-green-700 dark:text-green-400',
  info: 'text-amber-800 dark:text-amber-300',
  warning: 'text-red-700 dark:text-red-400',
};

export function TripPersonaHealthRow({
  persona,
  statusLabel,
  statusTone = 'success',
}: TripPersonaHealthRowProps) {
  return (
    <div className="flex items-center gap-3">
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
    </div>
  );
}
