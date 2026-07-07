/**
 * Guide-to-Plan 视觉 token 与布局 primitives
 * 对齐 TripNARA 视觉设计规范：清晰、克制、中性为主；gate / nara token，禁止 purple
 */

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 布局与表面样式 — 全模块统一引用 */
export const guideImportUi = {
  pageMax: 'max-w-5xl mx-auto w-full min-w-0',
  pagePx: 'px-4 sm:px-6 lg:px-8',
  pagePy: 'py-10 sm:py-12 lg:py-14',
  pagePyCompact: 'py-3 sm:py-4',
  headerPy: 'py-5',
  headerPyCompact: 'py-2',
  /** 主栏 + 侧栏；minmax(0,*) 避免 Grid 子项撑破容器 */
  gridMainSidebar:
    'grid w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)] gap-4 lg:gap-6 items-stretch min-h-0',
  /** 创建入口页 — 加宽侧栏，与左侧选项卡片顶对齐 */
  gridMainSidebarEntry:
    'grid w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-x-4 gap-y-6 lg:gap-x-8 items-start min-h-0',
  /** 出行条件表单侧栏（日期双列需更宽） */
  gridMainSidebarWide:
    'grid w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] gap-4 lg:gap-5 items-stretch min-h-0',
  /** 解析进度三栏（配合 scrollX 使用） */
  gridThreeCol: 'grid w-full gap-4 lg:grid-cols-3',
  /** 横向滚动容器：内容超出视口时显示滚动条 */
  scrollX: 'w-full min-w-0 overflow-x-auto overscroll-x-contain',
  stack: 'space-y-6',
  stackLg: 'space-y-10',
  stackCompact: 'space-y-4',
  entryPageMinH: 'min-h-[min(520px,calc(100vh-14rem))]',

  card: 'rounded-2xl border border-border bg-card',
  cardPad: 'p-6 sm:p-7',
  cardPadCompact: 'p-4 sm:p-5',
  cardInset: 'rounded-xl border border-border bg-muted/20',

  sidebar:
    'rounded-2xl border border-border bg-muted/30 p-6 space-y-4 h-full lg:sticky lg:top-4 flex flex-col',
  sidebarCompact:
    'rounded-2xl border border-border bg-muted/30 p-4 space-y-3 lg:sticky lg:top-4 flex flex-col',
  sidebarAccent:
    'rounded-2xl border border-border bg-card p-6 space-y-4 h-full lg:sticky lg:top-4 flex flex-col',
  sidebarAccentCompact:
    'rounded-2xl border border-border bg-card p-4 space-y-3 flex flex-col',

  pageTitle: 'text-xl sm:text-2xl font-semibold tracking-tight text-foreground',
  pageTitleCompact: 'text-lg font-semibold tracking-tight text-foreground leading-tight',
  pageSubtitle: 'text-sm text-muted-foreground leading-relaxed max-w-2xl',
  pageSubtitleCompact: 'text-xs text-muted-foreground leading-snug max-w-2xl line-clamp-2',
  stepTitle: 'text-xl sm:text-2xl font-semibold tracking-tight text-foreground',
  entryPageTitle: 'text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground',
  entryPageSubtitle: 'text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl',
  stepSubtitle: 'text-sm text-muted-foreground leading-relaxed max-w-2xl',
  sectionTitle: 'text-sm font-semibold text-foreground',
  sectionDesc: 'text-xs text-muted-foreground leading-relaxed',
  label: 'text-xs font-medium text-muted-foreground',
  footnote: 'text-[10px] text-muted-foreground leading-relaxed',

  primaryBtn: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  tipBox: 'rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-950/80 leading-relaxed',
  highlightSurface: 'rounded-xl border border-border/60 bg-muted/15',
  entryCardMinH: 'min-h-[108px]',

  /** 探索 / 攻略 创建流程 — 统一宽度与间距 */
  flowPageMax: 'max-w-6xl',
  flowPagePx: 'px-4 sm:px-6',
  flowHeaderPy: 'py-3',
  flowMainPy: 'py-4',
  flowMainPyRelaxed: 'py-6 sm:py-8',
  flowFooterPy: 'py-3 sm:py-4',
} as const;

interface GuideImportPageShellProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  compact?: boolean;
}

export function GuideImportPageShell({
  children,
  className,
  showHeader = false,
  onBack,
  title,
  subtitle,
  headerExtra,
  compact = false,
}: GuideImportPageShellProps) {
  const showTitleBlock = showHeader && (title || onBack);

  return (
    <div className={cn('flex flex-col min-h-full min-w-0 w-full bg-background', className)}>
      {showTitleBlock && (
        <header
          className={cn(
            'flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
            guideImportUi.flowPagePx,
            compact ? guideImportUi.headerPyCompact : guideImportUi.headerPy,
          )}
        >
          <div className={cn(guideImportUi.pageMax, 'flex items-center gap-2.5')}>
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('flex-shrink-0', compact ? 'h-9 w-9' : 'h-9 w-9 mt-0.5')}
                onClick={onBack}
                aria-label="返回上一步"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className={cn('flex-1 min-w-0', compact ? 'space-y-0.5' : 'space-y-1')}>
              {title && (
                <h1 className={compact ? guideImportUi.pageTitleCompact : guideImportUi.pageTitle}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className={compact ? guideImportUi.pageSubtitleCompact : guideImportUi.pageSubtitle}>
                  {subtitle}
                </p>
              )}
            </div>
            {headerExtra}
          </div>
        </header>
      )}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0 w-full overflow-x-auto overscroll-x-contain',
          guideImportUi.flowPagePx,
          compact ? guideImportUi.flowMainPy : guideImportUi.pagePy,
        )}
      >
        <div className={cn(guideImportUi.pageMax, 'flex-1 flex flex-col min-w-0')}>{children}</div>
      </main>
    </div>
  );
}

interface GuideImportCardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  compact?: boolean;
}

export function GuideImportCard({
  children,
  className,
  padding = true,
  compact = false,
}: GuideImportCardProps) {
  return (
    <div
      className={cn(
        guideImportUi.card,
        'min-w-0',
        padding && (compact ? guideImportUi.cardPadCompact : guideImportUi.cardPad),
        className,
      )}
    >
      {children}
    </div>
  );
}

interface GuideImportSidebarPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'accent';
  compact?: boolean;
}

export function GuideImportSidebarPanel({
  children,
  className,
  variant = 'default',
  compact = false,
}: GuideImportSidebarPanelProps) {
  return (
    <aside
      className={cn(
        'min-w-0',
        variant === 'accent'
          ? compact
            ? guideImportUi.sidebarAccentCompact
            : guideImportUi.sidebarAccent
          : compact
            ? guideImportUi.sidebarCompact
            : guideImportUi.sidebar,
        className,
      )}
    >
      {children}
    </aside>
  );
}

interface GuideImportScrollXProps {
  children: ReactNode;
  className?: string;
  /** 窄于视口时出现横向滚动条；传 `min-w-0` 则仅子元素自身溢出时滚动 */
  contentClassName?: string;
}

export function GuideImportScrollX({
  children,
  className,
  contentClassName = 'min-w-0 w-full',
}: GuideImportScrollXProps) {
  return (
    <div className={cn(guideImportUi.scrollX, className)}>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}

interface GuideImportTwoColumnProps {
  main: ReactNode;
  aside: ReactNode;
  /** 横跨双栏顶部（如导语），使 main / aside 下缘对齐 */
  header?: ReactNode;
  className?: string;
  /** 覆盖默认双栏 grid（如加宽侧栏） */
  gridClassName?: string;
  align?: 'stretch' | 'start';
  mainClassName?: string;
  /** 窄屏下双栏保持最小宽度并横向滚动 */
  scrollable?: boolean;
}

export function GuideImportTwoColumn({
  main,
  aside,
  header,
  className,
  gridClassName,
  align = 'stretch',
  mainClassName,
  scrollable = true,
}: GuideImportTwoColumnProps) {
  const grid = (
    <div className={cn('flex flex-col gap-4 min-w-0', className)}>
      {header}
      <div
        className={cn(
          gridClassName ?? guideImportUi.gridMainSidebar,
          align === 'start' && 'items-start',
        )}
      >
        <div className={cn('min-w-0', mainClassName ?? guideImportUi.stack)}>{main}</div>
        <div className="min-w-0">{aside}</div>
      </div>
    </div>
  );

  if (!scrollable) {
    return grid;
  }

  return (
    <GuideImportScrollX contentClassName="min-w-[720px] w-full xl:min-w-0">
      {grid}
    </GuideImportScrollX>
  );
}

interface GuideImportStepHeaderProps {
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  compact?: boolean;
}

export function GuideImportStepHeader({
  title,
  description,
  align = 'left',
  className,
  titleClassName,
  descriptionClassName,
  compact = false,
}: GuideImportStepHeaderProps) {
  return (
    <div
      className={cn(
        compact ? 'space-y-0.5' : 'space-y-2 sm:space-y-3',
        align === 'center' && 'text-center max-w-2xl mx-auto mb-2',
        className,
      )}
    >
      <h2
        className={cn(
          compact ? guideImportUi.pageTitleCompact : guideImportUi.stepTitle,
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            compact ? guideImportUi.pageSubtitleCompact : guideImportUi.stepSubtitle,
            descriptionClassName,
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

interface GuideImportSectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function GuideImportSectionHeader({
  title,
  description,
  className,
  compact = false,
}: GuideImportSectionHeaderProps) {
  return (
    <div className={cn(compact ? 'space-y-0.5 mb-2' : 'space-y-0.5 mb-3', className)}>
      <h3 className={guideImportUi.sectionTitle}>{title}</h3>
      {description && <p className={guideImportUi.sectionDesc}>{description}</p>}
    </div>
  );
}

interface GuideImportNumberedSectionProps {
  index: number;
  title: string;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'warning';
  compact?: boolean;
}

export function GuideImportNumberedSection({
  index,
  title,
  children,
  className,
  tone = 'default',
  compact = false,
}: GuideImportNumberedSectionProps) {
  return (
    <section
      className={cn(
        guideImportUi.card,
        'overflow-hidden p-0',
        tone === 'warning' && 'border-amber-200/70',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 border-b',
          compact ? 'px-3 py-2' : 'px-4 py-3 gap-3',
          tone === 'warning' ? 'border-amber-100 bg-amber-50/40' : 'border-border bg-muted/30',
        )}
      >
        <span
          className={cn(
            'rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0',
            compact ? 'w-6 h-6' : 'w-7 h-7',
            tone === 'warning' ? 'bg-amber-500 text-white' : 'bg-foreground text-background',
          )}
        >
          {index}
        </span>
        <h3 className={guideImportUi.sectionTitle}>{title}</h3>
      </div>
      <div className={compact ? 'p-3' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}

interface GuideImportFooterActionsProps {
  secondary?: ReactNode;
  primary: ReactNode;
  footnote?: string;
  className?: string;
  compact?: boolean;
  /** 窄侧栏下纵向堆叠，避免按钮互相遮挡 */
  layout?: 'inline' | 'stacked';
}

export function GuideImportFooterActions({
  secondary,
  primary,
  footnote,
  className,
  compact = false,
  layout = 'inline',
}: GuideImportFooterActionsProps) {
  if (layout === 'stacked') {
    return (
      <div className={cn('flex flex-col gap-2 w-full', className)}>
        <div className="w-full [&_button]:w-full">{primary}</div>
        {secondary && <div className="w-full [&_button]:w-full">{secondary}</div>}
        {footnote && <p className={cn(guideImportUi.footnote, 'text-center')}>{footnote}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between items-center',
        compact ? 'pt-0' : 'pt-1',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-h-11">{secondary}</div>
      <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto [&_button]:min-h-11">
        {primary}
        {footnote && (
          <p className={cn(guideImportUi.footnote, 'text-center sm:text-right')}>{footnote}</p>
        )}
      </div>
    </div>
  );
}

export function guideImportPrimaryButtonClass(extra?: string) {
  return cn(guideImportUi.primaryBtn, extra);
}
