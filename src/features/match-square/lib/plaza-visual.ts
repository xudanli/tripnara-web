import { cn } from '@/lib/utils';

/** Match Square · TripNARA Decision-first 视觉 token（Clarity / Quiet confidence） */
export const plazaLayout = {
  page: 'flex min-h-full flex-col bg-background text-foreground',
  content: 'mx-auto w-full max-w-4xl flex-1 space-y-2 px-4 py-3 md:px-6 md:py-4',
  header: 'border-b border-border/60 bg-background/90 backdrop-blur-sm',
  headerText: '[&_h1]:text-foreground [&_p]:text-muted-foreground',
  /** 子页表单区 — 与 DashboardSubpageHeader 同宽居中 */
  formContent: 'mx-auto w-full max-w-2xl',
  formShell: 'w-full flex-1 px-4 py-4 pb-10 md:px-6 md:py-5',
} as const;

export const plazaCard = {
  root: cn(
    'group relative overflow-hidden rounded-xl border border-border bg-card',
    'text-card-foreground shadow-sm',
    'transition-[box-shadow,border-color] duration-200',
    'hover:border-foreground/15 hover:shadow-md'
  ),
  inner: 'p-5',
  divider: 'my-4 h-px bg-border',
  personaRow: 'flex flex-wrap items-center gap-2 text-sm',
  personaTitle: 'font-medium text-foreground',
  personaMeta: 'text-muted-foreground',
  metaRow: 'flex items-start gap-2 text-sm text-muted-foreground',
  metaIcon: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80',
  quote:
    'rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-muted-foreground',
  actions: 'mt-2 flex gap-2',
} as const;

/** 契合度：复用 Gate 四态色彩语义，克制描边+浅底 */
export function compatibilityFitClass(percent: number): string {
  if (percent >= 90) {
    return 'border-[var(--gate-allow-border)] bg-[var(--gate-allow)] text-[var(--gate-allow-foreground)]';
  }
  if (percent >= 75) {
    return 'border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] text-[var(--gate-suggest-foreground)]';
  }
  return 'border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)] text-[var(--gate-confirm-foreground)]';
}

export const plazaBadge = {
  fit: 'inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums font-mono-brand',
  tag: 'rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground',
} as const;

export const plazaFilter = {
  label: 'self-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80',
  chip: 'cursor-pointer border-border/70 bg-background/90 text-muted-foreground hover:bg-muted/60',
  chipActive: 'border-foreground/25 bg-muted/80 text-foreground',
  popover: 'w-[min(calc(100vw-2rem),22rem)] space-y-3 p-3',
  popoverGroup: 'space-y-1.5',
} as const;

/** 广场顶栏 · 匹配视角 / 意向 / 操作 — 单一决策面 */
export const plazaToolbar = {
  shell: 'rounded-lg border border-border/70 bg-muted/15',
  row: 'flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5',
  divider: 'hidden h-3.5 w-px shrink-0 bg-border/60 sm:inline',
  hint: 'text-[10px] leading-snug text-muted-foreground/90',
  segment: 'flex min-w-0 items-center gap-1.5 text-xs text-foreground/90',
  segmentLabel:
    'shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/75',
} as const;

/** 广播 / 门控状态点 — 替代大号 Radio 图标 */
export function plazaGateStatusDot(active: boolean, paused = false): string {
  if (active) {
    return 'bg-[var(--gate-allow-foreground)] shadow-[0_0_0_2px_var(--gate-allow)]';
  }
  if (paused) {
    return 'bg-[var(--gate-confirm-foreground)] shadow-[0_0_0_2px_var(--gate-confirm)]';
  }
  return 'bg-muted-foreground/35';
}

/** 我的招募 · 帖状态徽章 */
export const plazaPostStatus = {
  active: {
    badge:
      'border-[var(--gate-allow-border)] bg-[var(--gate-allow)]/80 text-[var(--gate-allow-foreground)]',
    dot: 'bg-[var(--gate-allow-foreground)]',
  },
  hidden: {
    badge: 'border-border/70 bg-muted/30 text-muted-foreground',
    dot: 'bg-muted-foreground/45',
  },
  closed: {
    badge:
      'border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)]/70 text-[var(--gate-confirm-foreground)]',
    dot: 'bg-[var(--gate-confirm-foreground)]',
  },
} as const;

export const plazaBanner = {
  base: 'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
  confirm:
    'border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)] text-[var(--gate-confirm-foreground)]',
  suggest:
    'border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)] text-[var(--gate-suggest-foreground)]',
  reject:
    'border-[var(--gate-reject-border)] bg-[var(--gate-reject)] text-[var(--gate-reject-foreground)]',
  muted: 'border-border bg-muted/40 text-muted-foreground',
} as const;

export const plazaReview = {
  card: 'rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm',
  /** 详情 P0 概览 — 略紧密度、更柔描边 */
  overviewCard:
    'rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-sm md:p-5',
  sectionLabel: 'mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground',
  highlightIcon: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gate-allow-foreground)]',
  warningIcon: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gate-confirm-foreground)]',
  listItem: 'flex gap-2 text-sm text-foreground/90',
} as const;

/** 招募详情 Hero 字阶与间距 */
export const plazaOverview = {
  block: 'space-y-3',
  blockCompact: 'space-y-2',
  heroRow: 'flex items-start justify-between gap-4',
  title: 'text-xl font-semibold tracking-tight leading-tight text-foreground',
  meta: 'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground',
  metaSep: 'text-muted-foreground/35 select-none',
  metaEmphasis: 'font-medium tabular-nums text-foreground/75',
  divider: 'h-px bg-border/70',
  vision:
    'text-xs leading-relaxed text-muted-foreground',
} as const;

/** 标签 pill — 中性决策风，避免种草绿 */
export const plazaChip = {
  vibe: 'inline-flex items-center rounded-md border border-border/70 bg-muted/35 px-2 py-0.5 text-[11px] font-medium leading-none text-foreground/85',
  vibeAccent:
    'inline-flex items-center gap-1 rounded-md border border-[var(--gate-allow-border)] bg-[var(--gate-allow)]/60 px-2 py-0.5 text-[11px] font-medium leading-none text-[var(--gate-allow-foreground)]',
  overflow:
    'inline-flex items-center rounded-md border border-dashed border-border/80 bg-transparent px-2 py-0.5 text-[11px] text-muted-foreground',
  trust:
    'inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground',
  gate: 'rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] leading-snug text-foreground/85',
  puzzleFilled: 'border-border/80 bg-muted/35 text-foreground/90',
  puzzleOpen: 'border-dashed border-border/80 bg-background text-muted-foreground',
  puzzleHighlight:
    'border-[var(--gate-suggest-border)] bg-[var(--gate-suggest)]/70 text-[var(--gate-suggest-foreground)]',
} as const;

/** 详情 / 弹窗密度 */
export const plazaDetail = {
  pageStack: 'space-y-4',
  dialogStack: 'space-y-2.5',
  pageSection: 'rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
  dialogSection:
    'rounded-xl border border-border/80 bg-card p-3.5 text-card-foreground shadow-sm',
  dialogOverviewInner: 'space-y-2',
  dialogScroll: 'px-4 py-3',
  sectionBody: 'space-y-2',
} as const;

/** 列表 Card 字阶 — 轻于详情，重决策；偏紧凑以提升一屏可见条数 */
export const plazaListCard = {
  inner: 'space-y-2 p-3',
  routeTitle: 'text-sm font-semibold leading-snug tracking-tight text-foreground',
  visionPreview: 'line-clamp-1 text-xs leading-snug text-muted-foreground',
  trustBlock: 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug text-muted-foreground',
  footer: 'flex items-center justify-between gap-2 pt-0.5',
} as const;

export const plazaSkeleton = {
  root: cn(
    'relative overflow-hidden rounded-xl border border-border bg-card p-3',
    'before:pointer-events-none before:absolute before:inset-0',
    'before:-translate-x-full before:animate-[shimmer_1.8s_infinite]',
    'before:bg-gradient-to-r before:from-transparent before:via-muted/40 before:to-transparent'
  ),
  bone: 'bg-muted',
} as const;
