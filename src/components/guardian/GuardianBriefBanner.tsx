import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { cn } from '@/lib/utils';
import {
  guardianBriefLines,
  isHardConstraintBlock,
} from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';

export interface GuardianBriefBannerProps {
  presentation: GuardianPersonaPresentation;
  className?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export function GuardianBriefBanner({
  presentation,
  className,
  onPrimaryAction,
  primaryActionLabel,
}: GuardianBriefBannerProps) {
  const lines = guardianBriefLines(presentation);
  const hardBlock = isHardConstraintBlock(presentation);
  const ctaLabel =
    primaryActionLabel ??
    (presentation.actions.user === 'CHOOSE'
      ? '做出选择'
      : presentation.actions.neptune === 'REPAIR'
        ? '查看替代方案'
        : presentation.actions.abu === 'BLOCK'
          ? '查看详情'
          : undefined);

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        hardBlock
          ? 'border-gate-reject-border bg-gate-reject/80'
          : 'border-amber-200/80 bg-amber-50/50',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <PersonaAvatar
          persona={presentation.leadSpeaker}
          size={32}
          withBackground
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {presentation.headline}
            </span>
            {hardBlock ? (
              <AlertTriangle className="h-3.5 w-3.5 text-gate-reject-foreground shrink-0" />
            ) : null}
          </div>
          <ul className="space-y-0.5">
            {lines.slice(0, 3).map((line, idx) => (
              <li key={idx} className="text-sm text-slate-700 leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </div>
        {ctaLabel && onPrimaryAction ? (
          <Button
            variant={hardBlock ? 'destructive' : 'outline'}
            size="sm"
            className="shrink-0 h-8 text-xs"
            onClick={onPrimaryAction}
          >
            {ctaLabel}
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
