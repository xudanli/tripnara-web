import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PlanningHeaderAccent =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'attention'
  | 'info'
  | 'blocked'
  | 'danger';

const ACCENT_CLASS: Record<PlanningHeaderAccent, string> = {
  neutral: 'border-l-border/80 bg-gradient-to-r from-muted/30 to-transparent',
  success: 'border-l-gate-allow-border bg-gradient-to-r from-gate-allow/15 via-gate-allow/5 to-transparent',
  warning: 'border-l-gate-confirm-border bg-gradient-to-r from-gate-confirm/12 via-gate-confirm/5 to-transparent',
  attention: 'border-l-gate-suggest-border bg-gradient-to-r from-gate-suggest/12 via-gate-suggest/5 to-transparent',
  info: 'border-l-border/70 bg-gradient-to-r from-muted/20 via-muted/8 to-transparent',
  blocked: 'border-l-gate-confirm-border bg-gradient-to-r from-gate-confirm/12 via-gate-confirm/5 to-transparent',
  danger: 'border-l-gate-reject-border bg-gradient-to-r from-gate-reject/12 via-gate-reject/5 to-transparent',
};

const ICON_TONE_CLASS: Record<PlanningHeaderAccent, string> = {
  neutral: 'bg-muted/70 text-muted-foreground ring-border/60',
  success: 'bg-muted/20 text-success ring-gate-allow-border/50',
  warning: 'bg-muted/15 text-warning ring-gate-confirm-border/50',
  attention: 'bg-muted/15 text-foreground ring-gate-suggest-border/50',
  info: 'bg-muted/50 text-muted-foreground ring-border/55',
  blocked: 'bg-muted/15 text-warning ring-gate-confirm-border/50',
  danger: 'bg-muted/15 text-error ring-gate-reject-border/50',
};

export function PlanningHeaderShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03] backdrop-blur-[2px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PlanningHeaderSection({
  accent,
  children,
  className,
  id,
}: {
  accent: PlanningHeaderAccent;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-l-[3px] transition-colors duration-200',
        ACCENT_CLASS[accent],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PlanningHeaderDivider() {
  return (
    <div
      className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent"
      aria-hidden
    />
  );
}

export function PlanningHeaderRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-[40px] items-center gap-2.5 px-3.5 py-2', className)}>
      {children}
    </div>
  );
}

export function PlanningHeaderIcon({
  icon: Icon,
  accent = 'neutral',
  spin,
}: {
  icon: LucideIcon;
  accent?: PlanningHeaderAccent;
  spin?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
        ICON_TONE_CLASS[accent],
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} aria-hidden />
    </span>
  );
}

export function PlanningHeaderCopy({
  kicker,
  title,
  children,
  className,
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90">
        {kicker}
      </p>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function PlanningMetaChip({
  icon: Icon,
  children,
  tone = 'neutral',
}: {
  icon?: LucideIcon;
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[11rem] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        tone === 'success' &&
          'border-border/60 bg-muted/10 text-success',
        tone === 'muted' && 'border-border/60 bg-background/70 text-muted-foreground',
        tone === 'neutral' && 'border-border/50 bg-muted/35 text-foreground/80',
      )}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PlanningSectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground shadow-sm">
      {children}
    </span>
  );
}

export function PlanningScoreBadge({ score, label = '可执行' }: { score: number; label?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center leading-none">
      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 px-1.5 text-sm font-semibold tabular-nums text-foreground shadow-sm">
        {score}
      </span>
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function PlanningExpandToggle({
  expanded,
  onClick,
  labelExpand = '展开',
  labelCollapse = '收起',
}: {
  expanded: boolean;
  onClick: () => void;
  labelExpand?: string;
  labelCollapse?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      aria-expanded={expanded}
      aria-label={expanded ? labelCollapse : labelExpand}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 16 16"
        className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
        aria-hidden
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function PlanningDetailsPanel({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="overflow-hidden">
        <div className="space-y-2 border-t border-border/40 bg-background/40 px-3 py-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export function resolveConstraintsAccent(summary: {
  needsReconfirm: boolean;
  isUserConfirmed: boolean;
  pendingCount: number;
}): PlanningHeaderAccent {
  if (summary.needsReconfirm) return 'warning';
  if (summary.isUserConfirmed) return 'success';
  if (summary.pendingCount > 0) return 'attention';
  return 'neutral';
}

export function resolveStripAccent(tone: 'error' | 'blocked' | 'compare' | 'running' | 'info'): PlanningHeaderAccent {
  switch (tone) {
    case 'error':
      return 'danger';
    case 'blocked':
      return 'blocked';
    case 'compare':
      return 'attention';
    case 'running':
      return 'neutral';
    default:
      return 'info';
  }
}
