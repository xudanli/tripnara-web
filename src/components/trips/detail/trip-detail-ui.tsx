import { cn } from '@/lib/utils';

/** Trip Detail 页面级 UI token — 对齐视觉设计师规范（primary 黑 + gate 四态 + 中性灰阶） */
export const tripDetailUi = {
  pageBg: 'bg-muted/30',
  card: 'rounded-xl border border-border bg-card shadow-sm',
  cardHeader: 'px-4 py-3 border-b border-border/60',
  cardBody: 'p-4',
  statCard: 'rounded-xl border border-border bg-card p-4 shadow-sm',
  sidebar: 'w-full xl:w-[280px] shrink-0 space-y-4',
  mainColumn: 'flex-1 min-w-0 space-y-4',
  /** 主 CTA — 仅 black primary */
  primaryBtn: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm',
  tabActive: 'border-b-2 border-foreground text-foreground font-medium',
  /** gate 四态标签 */
  tagAllow: 'border-gate-allow-border bg-gate-allow/15 text-gate-allow-foreground',
  tagConfirm: 'border-gate-confirm-border bg-gate-confirm/15 text-gate-confirm-foreground',
  tagSuggest: 'border-gate-suggest-border bg-gate-suggest/15 text-gate-suggest-foreground',
  tagReject: 'border-gate-reject-border bg-gate-reject/15 text-gate-reject-foreground',
  /** 已验证 / 可行 — gate-allow 小面积 */
  tagVerified: 'border-border bg-muted/15 text-gate-allow-foreground',
  /** 只读 metric */
  metricValue: 'font-mono-brand text-muted-foreground',
  iconMuted: 'text-muted-foreground',
  imagePlaceholder: 'bg-muted',
  selectedRing: 'ring-2 ring-border bg-muted/25',
  listItemActive: 'bg-muted/40 -mx-4 px-4 rounded-lg',
  linkInline: 'h-auto p-0 text-foreground underline-offset-4 hover:underline text-xs',
} as const;

export function TripDetailSection({
  title,
  action,
  children,
  className,
  headerClassName,
  bodyClassName,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(tripDetailUi.card, className)}>
      {title ? (
        <div
          className={cn(
            tripDetailUi.cardHeader,
            'flex items-center justify-between gap-2',
            headerClassName,
          )}
        >
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {action}
        </div>
      ) : null}
      <div className={cn(tripDetailUi.cardBody, bodyClassName)}>{children}</div>
    </section>
  );
}

export function TripDetailStatCard({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(tripDetailUi.statCard, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
        </div>
        {icon ? <div className={cn('shrink-0', tripDetailUi.iconMuted)}>{icon}</div> : null}
      </div>
    </div>
  );
}

export function TripDetailTwoColumn({
  main,
  sidebar,
  className,
  mainClassName,
  sidebarClassName,
}: {
  main: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
  mainClassName?: string;
  sidebarClassName?: string;
}) {
  return (
    <div className={cn('flex flex-col xl:flex-row gap-4', className)}>
      <div className={cn(tripDetailUi.mainColumn, mainClassName)}>{main}</div>
      {sidebar ? <aside className={cn(tripDetailUi.sidebar, sidebarClassName)}>{sidebar}</aside> : null}
    </div>
  );
}
