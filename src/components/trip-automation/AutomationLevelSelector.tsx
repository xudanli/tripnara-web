import { Lock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AUTOMATION_UI_LEVELS,
  type AutomationUiLevel,
} from '@/lib/trip-automation-authorization.util';
import {
  tripAutomationLevelBadgeClass,
  tripAutomationLevelCard,
  tripAutomationLevelCardSelected,
  tripAutomationSectionCard,
} from './trip-automation-ui';

interface AutomationLevelSelectorProps {
  value: AutomationUiLevel;
  onChange: (level: AutomationUiLevel) => void;
  className?: string;
}

export default function AutomationLevelSelector({
  value,
  onChange,
  className,
}: AutomationLevelSelectorProps) {
  const current = AUTOMATION_UI_LEVELS.find((row) => row.id === value) ?? AUTOMATION_UI_LEVELS[1];

  return (
    <section className={cn(tripAutomationSectionCard, className)}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="border-b border-border/50 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            当前自治级别
          </p>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/15">
              <Shield className="h-5 w-5 text-foreground" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {current.title}
                </h2>
                {current.recommended ? (
                  <span className={tripAutomationLevelBadgeClass(true)}>推荐</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {current.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
          {AUTOMATION_UI_LEVELS.map((level) => {
            const selected = value === level.id;
            const disabled = level.locked;

            return (
              <button
                key={level.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(level.id)}
                className={cn(
                  tripAutomationLevelCard,
                  'text-left',
                  selected && tripAutomationLevelCardSelected,
                  disabled && 'cursor-not-allowed opacity-55',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{level.title}</span>
                  {level.recommended ? (
                    <span className={tripAutomationLevelBadgeClass(true)}>推荐</span>
                  ) : null}
                  {level.locked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {level.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
