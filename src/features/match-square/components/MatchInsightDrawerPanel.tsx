import { CheckCircle2, AlertTriangle, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { MatchInsightDrawer } from '@/types/match-square';
import { plazaReview } from '../lib/plaza-visual';

interface MatchInsightDrawerPanelProps {
  drawer: MatchInsightDrawer;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  compatibilityPercent?: number | null;
  className?: string;
}

function drawerIcon(status: MatchInsightDrawer['lines'][0]['status']) {
  switch (status) {
    case 'ok':
      return CheckCircle2;
    case 'warn':
      return AlertTriangle;
    default:
      return Minus;
  }
}

function drawerClass(status: MatchInsightDrawer['lines'][0]['status']): string {
  switch (status) {
    case 'ok':
      return 'text-[var(--gate-allow-foreground)]';
    case 'warn':
      return 'text-[var(--gate-confirm-foreground)]';
    default:
      return 'text-muted-foreground';
  }
}

/** 决策翻译 — 映射 `matchInsightDrawer`，默认折叠 */
export function MatchInsightDrawerPanel({
  drawer,
  open,
  onOpenChange,
  compatibilityPercent,
  className,
}: MatchInsightDrawerPanelProps) {
  if (!drawer.lines?.length) return null;

  const okLabel = drawer.lines.find((l) => l.status === 'ok')?.label;
  const warnLabel = drawer.lines.find((l) => l.status === 'warn')?.label;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <section className={cn(plazaReview.card, 'space-y-3')} aria-label="决策翻译">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">决策翻译</h2>
              {compatibilityPercent != null && (
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs tabular-nums font-mono-brand text-muted-foreground">
                  {compatibilityPercent}%
                </span>
              )}
            </div>
            {(okLabel || warnLabel) && !open && (
              <p className="text-xs text-muted-foreground">
                {okLabel && <span className="text-[var(--gate-allow-foreground)]">{okLabel}</span>}
                {okLabel && warnLabel && <span> · </span>}
                {warnLabel && (
                  <span className="text-[var(--gate-confirm-foreground)]">需留意：{warnLabel}</span>
                )}
              </p>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          <p className="text-sm font-medium text-foreground">{drawer.headline}</p>
          <ul className="space-y-3">
            {drawer.lines.map((item) => {
              const Icon = drawerIcon(item.status);
              return (
                <li key={item.label} className="flex gap-2 text-sm leading-relaxed">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', drawerClass(item.status))} />
                  <div>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <p className="mt-0.5 text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
