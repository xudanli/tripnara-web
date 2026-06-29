import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchColumnSurface,
  workbenchHeaderShell,
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchSecondaryMetric,
  workbenchTabTriggerCompact,
} from '@/components/plan-studio/workbench/workbench-ui';

/**
 * 全程地图视觉 token
 * 原则：Decision-first · 中性 chrome + gate/nara 语义色；地图层可用功能色
 * @see workbench-ui.ts · 视觉设计师规范
 */

export {
  workbenchCard,
  workbenchColumnSurface,
  workbenchHeaderShell,
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchTabTriggerCompact,
};

/** 页面根容器 */
export const journeyMapPageShell = 'flex h-full min-h-0 flex-1 flex-col bg-background';

/** Mapbox 底图 · 淡色极简，突出路线与 POI 语义色 */
export const journeyMapBaseStyle = 'mapbox://styles/mapbox/light-v11';

/** 三栏工作区（侧栏 card · 地图 muted 底 · Inspector card） */
export const journeyMapWorkspace = cn(
  'flex min-h-0 flex-1 overflow-hidden',
  workbenchColumnSurface,
);

/** 侧栏 / Inspector 面板壳 */
export const journeyMapPanelShell = cn(
  'flex shrink-0 flex-col bg-card',
);

export const journeyMapPanelShellLeft = cn(journeyMapPanelShell, 'w-[336px] border-r border-border/70');

export const journeyMapPanelShellRight = cn(journeyMapPanelShell, 'w-[340px] border-l border-border/70');

export const journeyMapPanelCollapsedRail = cn(
  'flex w-11 shrink-0 flex-col border-border/70 bg-card',
);

/** 侧栏顶栏（行程标题） */
export const journeyMapSidebarHeader = cn(
  'border-b border-border/60 bg-card px-3 pb-2.5 pt-3',
);

export const journeyMapSidebarTitle = 'truncate text-[15px] font-semibold leading-snug tracking-tight text-foreground';

export const journeyMapSidebarSubtitle = 'mt-1 text-[11px] text-muted-foreground';

/** 区块标题（行程日程 / 统计等） */
export const journeyMapSection = 'space-y-0';

export const journeyMapSectionDivider = 'border-t border-border/50 pt-3.5 first:border-t-0 first:pt-0';

export const journeyMapSectionHeading = 'flex items-center gap-1.5';

export const journeyMapSectionHeadingIcon = 'h-3.5 w-3.5 text-muted-foreground/80';

export const journeyMapSectionHeadingTitle = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

/** 图层 / 筛选 pill · 选中 */
export const journeyMapFilterChipActive = cn(
  'border-foreground/20 bg-muted font-medium text-foreground shadow-sm',
);

/** 图层 / 筛选 pill · 默认 */
export const journeyMapFilterChipIdle = cn(
  'border-border/70 bg-background text-muted-foreground hover:bg-muted/40',
);

/** 成员分组行 · 选中 */
export const journeyMapMemberRowSelected = cn(
  'border-foreground/15 bg-muted/60 ring-1 ring-foreground/8',
);

/** 成员分组行 · 默认 */
export const journeyMapMemberRowIdle = cn(
  'border-transparent hover:bg-muted/40',
);

/** 活动强度（Gate 谨慎态） */
export const journeyMapIntensityBadge = cn(
  'border-gate-confirm-border bg-gate-confirm/25 text-gate-confirm-foreground hover:bg-gate-confirm/25',
);

/** 决策视图标识（中性） */
export const journeyMapAiBadge = cn(
  'border-border/70 bg-muted text-muted-foreground hover:bg-muted',
);

export const journeyMapFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2';

/** 收起侧栏 · 日序快捷点 */
export const journeyMapDayQuickPick = cn(
  'flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[10px] font-semibold tabular-nums transition-colors hover:bg-muted/50',
  journeyMapFocusRing,
);

export const journeyMapDayQuickPickSelected = cn(
  journeyMapDayQuickPick,
  'border-foreground/15 bg-foreground text-background shadow-sm',
);

/** 侧栏日程 · 列表容器 */
export const journeyMapScheduleList = 'relative pl-0';

/** 侧栏日程 · 单行 */
export const journeyMapScheduleRow = cn(
  'relative flex w-full items-stretch border-b border-border/40 text-left transition-colors last:border-b-0',
  journeyMapFocusRing,
);

/** 侧栏日程 · 选中整行 */
export const journeyMapScheduleRowSelected = cn(
  'relative flex w-full items-center text-left transition-colors',
  'rounded-lg border border-foreground/12 bg-muted/50 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  'dark:border-foreground/18 dark:bg-muted/35',
  journeyMapFocusRing,
);

export const journeyMapScheduleRail = 'relative z-[1] flex w-[4.25rem] shrink-0 items-center justify-center px-1';

/** 选中 Day · 四角圆角 pill */
export const journeyMapScheduleDayPillSelected = cn(
  'inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1',
);

export const journeyMapScheduleDayMarker = cn(
  'flex min-h-[2.5rem] w-full items-center gap-1 px-0.5 py-1.5',
);

export const journeyMapSidebarDaySelected = cn(
  'border-foreground/15 bg-muted/60 dark:border-foreground/20 dark:bg-muted/40',
);

/** 成员筛选卡片 · 选中 */
export const journeyMapMemberCardSelected = cn(
  'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8 dark:border-foreground/20 dark:bg-muted/35',
);

export const journeyMapMemberCardIdle = cn(
  'border-border/60 hover:border-border hover:bg-muted/25',
);

/** 行程统计格 · 硬核数据用冰川蓝数字 */
export const journeyMapStatCell = cn(
  workbenchCard,
  'rounded-xl border-border/60 bg-muted/10 px-3 py-2.5',
);

export const journeyMapStatLabel = 'text-[10px] text-muted-foreground';

export const journeyMapStatValue = cn(
  workbenchSecondaryMetric,
  'mt-0.5 text-sm font-semibold leading-tight text-nara-glacier-foreground',
);

/** 数据 feed 行 */
export const journeyMapDataFeedRow = 'flex items-center justify-between gap-3 text-[11px]';

export const journeyMapDataFeedLabel = 'text-foreground/85';

export const journeyMapDataFeedTimeFresh = 'shrink-0 tabular-nums text-muted-foreground';

export const journeyMapDataFeedTimeStale = 'shrink-0 tabular-nums text-gate-confirm-foreground';

/** 侧栏底栏 */
export const journeyMapSidebarFooter = cn(
  'flex items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-3 py-2.5',
);

/** 地图上下文条 */
export const journeyMapContextBar = cn(
  workbenchCard,
  'pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,20rem)] truncate border-border/60 bg-background/95 px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm',
);

/** 地图图例 */
export const journeyMapLegend = cn(
  workbenchCard,
  'pointer-events-none absolute bottom-4 right-14 z-10 max-h-[min(50vh,320px)] overflow-hidden border-border/60 bg-background/95 px-3 py-2 text-[10px] shadow-sm backdrop-blur-sm',
);

export const journeyMapLegendTitle = 'mb-1.5 text-[10px] font-semibold text-foreground';

export const journeyMapLegendSubtitle = 'mb-1 text-[9px] font-medium text-muted-foreground';

/** 状态横幅 */
export const journeyMapStatusBanner = cn(
  'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-xs',
);

export const journeyMapStatusBannerWarn = cn(
  journeyMapStatusBanner,
  'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground',
);

export const journeyMapStatusBannerInfo = cn(
  journeyMapStatusBanner,
  'border-border/60 bg-muted/30 text-muted-foreground',
);

/** Inspector 空态 */
export const journeyMapInspectorEmpty = cn(
  'flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center',
);

export const journeyMapInspectorEmptyIcon = 'h-8 w-8 text-muted-foreground/35';

/** 分流组卡 · 中性结构（左线区分，禁止饱和色块） */
export const journeyMapDiversionCard = cn(
  workbenchCard,
  'rounded-lg border-border/60 bg-muted/10 p-3',
);

export const journeyMapDiversionCardLineA = 'border-l-2 border-l-nara-glacier-border/70 pl-2.5';

export const journeyMapDiversionCardLineB = 'border-l-2 border-l-gate-confirm-border/70 pl-2.5';

/** 移动端 FAB */
export const journeyMapMobileFab = cn(
  'pointer-events-auto h-11 min-w-[5.5rem] gap-2 rounded-full border border-border/70 bg-background/95 px-4 shadow-md backdrop-blur-sm',
  journeyMapFocusRing,
);

export const journeyMapMobileFabActive = cn(
  journeyMapMobileFab,
  'border-foreground/20 bg-muted font-medium text-foreground',
);

/** 地图标记 · 功能色（仅地图层） */
export const JOURNEY_MAP_MARKER_COLORS: Record<string, string> = {
  activity: '#334155',
  diversion: '#c2410c',
  accommodation: '#475569',
  transport: '#64748b',
  meeting: '#0f766e',
  risk: '#dc2626',
};
