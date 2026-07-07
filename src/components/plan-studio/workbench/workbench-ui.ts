import { cn } from '@/lib/utils';
import { type PersonaType } from '@/lib/persona-icons';
import { personaSymbolCellClass } from '@/lib/persona-symbol.util';

/**
 * Planning Workbench 视觉 token
 * 原则：黑白灰结构 + success/warning/error 仅作 Icon/字色反馈
 * @see globals.css · --success / --warning / --error
 */

export const workbenchShell = 'bg-background';

export const workbenchColumnSurface = 'bg-muted/15';

export const workbenchPanelHeader =
  'shrink-0 border-b border-border bg-card px-3 py-2';

export const workbenchPanelTitle = 'text-sm font-semibold tracking-tight text-foreground';

export const workbenchCard =
  'rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

/** 无阴影卡片 · 用于协作中心等卡片叠放场景的外层容器 */
export const workbenchCardFlat =
  'rounded-xl border border-border/70 bg-card';

/** 卡片内嵌面板 · 仅描边 + 浅底，不用阴影 */
export const workbenchInsetPanel =
  'rounded-lg border border-border/60 bg-muted/12';

export const workbenchListItemBase =
  'rounded-lg border px-2.5 py-2 text-left text-xs transition-colors';

export const workbenchListItemSelected = cn(
  workbenchListItemBase,
  'border-border/80 bg-muted/20 ring-1 ring-inset ring-foreground/10',
);

export const workbenchListItemIdle = cn(
  workbenchListItemBase,
  'border-transparent bg-transparent hover:border-border/60 hover:bg-muted/20',
);

/** 决策队列 · 执法标签（仅 BLOCK 保留 reject 字色） */
export function workbenchQueueEnforcementBadgeClass(
  enforcement: string | null | undefined,
): string {
  const normalized = String(enforcement ?? '').trim().toUpperCase();
  if (normalized === 'BLOCK') {
    return 'border border-border/45 bg-muted/20 text-error';
  }
  return 'border border-border/60 bg-transparent text-muted-foreground';
}

/** 决策队列 · 天次标签 */
export const workbenchQueueDayLabel =
  'shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground';

export const workbenchZoneIcon = {
  hard: 'text-muted-foreground bg-muted/30 border-border/60',
  soft: 'text-muted-foreground bg-muted/25 border-border/60',
  external: 'text-muted-foreground bg-muted/20 border-border/60',
} as const;

/** 约束卡片 · danger 时左侧红线（不用整卡红框） */
export function workbenchConstraintConflictBorderClass(
  tone: 'default' | 'caution' | 'danger' | 'muted' = 'default',
  hasConflict?: boolean,
): string {
  if (tone === 'danger' || hasConflict) {
    return 'border-l-2 border-l-error pl-[calc(0.75rem-2px)]';
  }
  return '';
}

/** 约束卡片 · 统一中性底（不用左侧色条，danger 除外见 conflictBorder） */
export function workbenchConstraintCardToneClass(
  tone: 'default' | 'caution' | 'danger' | 'muted' = 'default',
): string {
  if (tone === 'muted') return 'opacity-65';
  return '';
}

/** 约束卡片 · 图标区语义色（替代左侧色条） */
export function workbenchConstraintIconToneClass(
  tone: 'default' | 'caution' | 'danger' | 'muted' = 'default',
): string {
  switch (tone) {
    case 'caution':
      return 'border-border/35 bg-muted/12 text-warning';
    case 'danger':
      return 'border-border/35 bg-muted/12 text-error';
    case 'muted':
      return 'border-border/35 bg-muted/12 text-muted-foreground/60';
    default:
      return 'border-border/40 bg-muted/15 text-muted-foreground/85';
  }
}

/** 约束列表项 · 统一卡片结构（扁平中性，hover 微抬） */
export const workbenchConstraintListItem = cn(
  'group relative flex w-full items-center gap-2.5 rounded-lg border border-border/45 bg-muted/8 px-3 py-2.5 transition-[background-color,border-color] hover:border-border/65 hover:bg-muted/18',
);

export const workbenchConstraintListItemIcon =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border';

export const workbenchConstraintListItemLabel =
  'block text-[11px] font-medium leading-snug text-foreground/90';

export const workbenchConstraintListItemValue =
  'mt-0.5 block text-xs font-semibold leading-snug text-foreground';

/** 待保存徽标 · 需确认语义，中性面 */
export const workbenchPendingSaveBadgeClass =
  'h-4 shrink-0 border-gate-confirm-border bg-card px-1 text-[9px] font-normal text-gate-confirm-foreground';

/** 工作台内联链接 */
export const workbenchLinkClass =
  'font-medium text-foreground underline-offset-2 hover:underline';

/** 工作台辅助图标 · 中性（产品面禁止冰川蓝） */
export const workbenchAccentIconClass = 'text-muted-foreground';

/** 工作台滚动容器 · hover/聚焦时才显示细滚动条 */
export const workbenchScrollable = 'scrollbar-auto-hide';

export const workbenchSegmentSelected =
  'border-primary bg-primary text-primary-foreground shadow-sm';

export const workbenchSegmentIdle =
  'border-border/70 bg-background text-muted-foreground hover:bg-muted/40';

export const workbenchPrimaryAction =
  'bg-primary text-primary-foreground hover:bg-primary/90';

export const workbenchInsightPanel = cn(workbenchCard, 'border-border/70 bg-muted/20');

export const workbenchConflictSurface =
  'rounded-xl border border-border/70 bg-muted/10 p-3';

export const workbenchEmptySurface =
  'rounded-xl border border-dashed border-border/70 bg-muted/15';

export const workbenchNlSurface =
  'rounded-xl border border-border/70 bg-muted/20 p-3';

export const workbenchCustomSoftSurface =
  'rounded-xl border border-border/50 bg-muted p-3';

/** 行程 Tab · 日选择器 */
export const workbenchDayTabSelected =
  'border-primary bg-primary text-primary-foreground font-medium shadow-sm';

export const workbenchDayTabIdle =
  'border-transparent bg-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/30 hover:text-foreground';

/** @deprecated 使用 workbenchDayTabConflictBorderClass */
export const workbenchDayTabConflict =
  'border-border/70';

export function workbenchDayTabConflictBorderClass(tone: 'hard' | 'soft'): string {
  return tone === 'hard'
    ? 'border-border/80'
    : 'border-border/80';
}

export function workbenchDayTabConflictIconClass(
  tone: 'hard' | 'soft',
  selected?: boolean,
): string {
  if (selected) return 'text-primary-foreground';
  return tone === 'hard' ? 'text-error' : 'text-warning';
}

export const workbenchDayTabAffected =
  'ring-1 ring-border/60';

/** 行程 Tab · 时间轴时刻（等宽数字 · 中性，避免与证据/metric 抢色） */
export const workbenchScheduleTimelineTime =
  'shrink-0 pt-0.5 font-mono-brand text-[11px] font-medium tabular-nums text-muted-foreground';

export const workbenchScheduleOvertime =
  'font-mono-brand text-[11px] font-medium tabular-nums text-error';

export const workbenchScheduleDayStrip =
  'rounded-xl border border-border/60 bg-muted/10 p-1';

export const workbenchScheduleConflictPanel =
  'flex min-h-0 flex-col bg-background';

export const workbenchFeasibilityBadge =
  'border border-border/60 bg-muted text-success hover:bg-muted';

export const workbenchMajorDayChip =
  'border-border/70 bg-muted text-foreground';

export const workbenchMinorDayChip =
  'border-border/70 bg-background text-muted-foreground';

export const workbenchSliderTrack = '[&_.bg-primary]:bg-foreground/80';

/** 硬核只读数据 · 冰川蓝 + 等宽数字 */
export const workbenchSecondaryMetric =
  'font-mono-brand tabular-nums text-muted-foreground';

/** 行程 Tab · 路线统计数值（中性 foreground，冰川蓝留给地图只读面） */
export const workbenchScheduleMetricValue = cn(
  'font-mono-brand tabular-nums text-foreground',
  'text-[11px] font-semibold',
);

export const workbenchHeaderShell =
  'shrink-0 border-b border-border bg-card/95 backdrop-blur-sm';

export const workbenchHeaderTitle = 'truncate text-base font-semibold tracking-tight sm:text-lg';

export const workbenchHeaderSubtitle = 'mt-0.5 truncate text-xs text-muted-foreground';

export const workbenchProgressTrack = 'h-1.5 overflow-hidden rounded-full bg-muted';

/** 顶栏右侧 · 模块切换（行程/预算/行前） */
export const workbenchHeaderModuleTabList =
  'inline-flex h-8 shrink-0 items-center rounded-lg border border-border/60 bg-muted/12 p-0.5';

export const workbenchHeaderModuleTabTrigger =
  'min-h-[44px] h-9 rounded-md border-b-2 border-transparent px-2.5 text-[11px] text-muted-foreground data-[state=active]:border-black data-[state=active]:bg-background data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/60';

/** 小屏工作台列导航 */
export const workbenchMobileColumnNavList =
  'flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/12 p-0.5';

export const workbenchMobileColumnNavTrigger =
  'inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md px-3 text-xs text-muted-foreground transition-colors';

export const workbenchTabList = 'h-8 bg-transparent p-0';

/** 填充式 Tab（顶栏 · 行程/预算/行前） */
export const workbenchTabTrigger =
  'h-7 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-muted/50 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/70';

export const workbenchTabTriggerCompact =
  'h-7 px-2.5 text-[11px] text-muted-foreground data-[state=active]:bg-primary data-[state=active]:font-medium data-[state=active]:text-primary-foreground';

/** 决策检查器 · 下划线 Tab（覆盖 ui/tabs 默认白底 pill） */
export const workbenchDecisionCheckerTabList =
  'h-auto gap-0 bg-transparent p-0 shadow-none';

export const workbenchDecisionCheckerTabTrigger =
  'h-7 rounded-none px-2.5 text-[11px] text-muted-foreground shadow-none data-[state=active]:!bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:!shadow-none border-b-2 border-transparent data-[state=active]:border-primary';

export const workbenchDecisionShell = 'flex h-full min-h-0 flex-col bg-background';

/** 行程诊断栏底部 · AI 助理紧凑入口（flat 浅灰底 + 左侧强调线） */
export const workbenchAiAssistantDockShell = cn(
  'mx-3 mb-3 mt-1 shrink-0 rounded-xl border border-border/70 border-l-[3px] border-l-foreground/20 bg-muted/20 p-3',
);

export const workbenchAiAssistantDockAvatar =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background';

export const workbenchAiAssistantDockInput =
  'h-8 flex-1 rounded-lg border border-border/60 bg-background text-xs';

/** 工作台左侧 · 行程规划上下文摘要 */
export const workbenchPlanningContextShell = cn(
  workbenchCard,
  'mb-3 border-border/55 bg-muted/10 p-2.5',
);

export const workbenchInsetSection = cn(workbenchCard, 'p-2.5');

export const workbenchEmptyHint = cn(
  workbenchEmptySurface,
  'px-3 py-4 text-xs leading-relaxed text-muted-foreground',
);

export const workbenchMapOverlay =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent';

export function workbenchSoftPriorityClass(priority: '高' | '中' | '低'): string {
  switch (priority) {
    case '高':
      return 'bg-muted/60 text-foreground border-border/70';
    case '中':
      return 'bg-muted text-foreground border-border/70';
    default:
      return 'bg-muted/40 text-muted-foreground border-border/50';
  }
}

export function workbenchPersonaStanceClass(
  stance: 'oppose' | 'suggest' | 'ok',
): string {
  const base = 'border border-border/70 bg-muted/20';
  switch (stance) {
    case 'oppose':
      return cn(base, 'text-error');
    case 'ok':
      return cn(base, 'text-success');
    default:
      return cn(base, 'text-warning');
  }
}

/** 分流横幅 · 中性描边 + 图标区分（禁止冰川蓝铺底） */
export function workbenchSplitBannerSurface(_tone?: 'info' | 'warning'): string {
  return 'rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
}

export function workbenchSplitBannerIconSurface(_tone?: 'info' | 'warning'): string {
  return 'border border-border/50 bg-muted/20 text-muted-foreground';
}

/** 分流时间线 · 整卡外框 */
export const workbenchSplitTimelineShell = cn(
  workbenchCard,
  'border-dashed border-border/60',
);

/** 分流时间线 · 指标条 */
export const workbenchSplitStatsBar =
  'grid grid-cols-3 gap-2 border-b border-border/50 bg-muted/10 px-4 py-2.5';

/** 分流时间线 · 分叉并行区（中性容器，背景区分交给各分支卡） */
export const workbenchSplitForkZone = cn(
  'relative my-2 rounded-xl border border-dashed border-border/50 bg-transparent px-2 py-3',
);

/** 日选择器 · 含分流预览的天 */
export const workbenchDayTabSplit =
  'border-dashed border-border/60 bg-muted/12 text-muted-foreground';

/** 分流 A/B 组 · 中性卡 + 字母/描边/实虚线区分（禁止饱和色块底） */
export type WorkbenchSplitBranchVariant = 'blue' | 'orange' | 'purple';

export type WorkbenchSplitBranchTone = 'a' | 'b';

export function resolveWorkbenchSplitBranchTone(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): WorkbenchSplitBranchTone {
  if (variant === 'orange') return 'b';
  if (variant === 'blue' || variant === 'purple') return 'a';
  return branchIndex % 2 === 0 ? 'a' : 'b';
}

function splitBranchToneClasses(tone: WorkbenchSplitBranchTone) {
  const cardBase =
    'rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
  return tone === 'a'
    ? {
        card: cn(cardBase, 'ring-1 ring-inset ring-border/25'),
        divider: 'border-border/45',
        badge: 'border-border/70 bg-muted/45 text-foreground',
        connector: 'border-border/55',
        themeText: 'text-foreground',
        checkIcon: 'text-muted-foreground',
        avatar: 'border-border/50 bg-muted/30 text-muted-foreground',
        letter: 'text-foreground',
      }
    : {
        card: cn(cardBase, 'border-dashed border-border/60'),
        divider: 'border-border/45 border-dashed',
        badge: 'border-border/60 bg-muted/30 text-foreground',
        connector: 'border-border/50',
        themeText: 'text-foreground',
        checkIcon: 'text-muted-foreground',
        avatar: 'border-border/45 bg-muted/20 text-muted-foreground',
        letter: 'text-foreground',
      };
}

export function workbenchSplitBranchTheme(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
) {
  return splitBranchToneClasses(resolveWorkbenchSplitBranchTone(branchIndex, variant));
}

export function workbenchSplitBranchCardClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  return workbenchSplitBranchTheme(branchIndex, variant).card;
}

export function workbenchSplitBranchBadgeClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  return workbenchSplitBranchTheme(branchIndex, variant).badge;
}

export function workbenchSplitBranchConnectorClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  return workbenchSplitBranchTheme(branchIndex, variant).connector;
}

export function workbenchSplitSegmentRiskClass(
  level: 'low' | 'medium' | 'high',
): string {
  if (level === 'high') {
    return 'border border-border/45 bg-muted/20 text-error';
  }
  if (level === 'medium') {
    return 'border border-border/45 bg-muted/20 text-warning';
  }
  return 'border border-border/60 bg-muted/20 text-muted-foreground';
}

export const workbenchSplitRejoinSurface =
  'rounded-xl border border-dashed border-border/55 bg-muted/10';

export const workbenchSplitForkDot =
  'border-border/55 bg-muted/25';

export const workbenchSplitForkSpine = 'border-border/45';

/** 分叉 → 分支卡 · 克制引出线（A 实线 / B 虚线，中性色） */
export function workbenchSplitForkArmLineClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  const tone = resolveWorkbenchSplitBranchTone(branchIndex, variant);
  return tone === 'a'
    ? 'h-px bg-border/55'
    : 'h-0 border-t border-dashed border-border/55';
}

export function workbenchSplitForkArmArrowClass(
  _branchIndex = 0,
  _variant?: WorkbenchSplitBranchVariant,
): string {
  const tone = resolveWorkbenchSplitBranchTone(_branchIndex, _variant);
  return tone === 'a' ? 'border-l-border/55' : 'border-l-border/45';
}

export function workbenchSplitGroupCardClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  return cn(workbenchCard, 'p-3', workbenchSplitBranchCardClass(branchIndex, variant));
}

/** 决策检查器 · Badge（证据链审计风：中性底 + 描边，仅 low/危险保留 reject 字色） */
export function workbenchDecisionCheckerBadgeClass(
  tone: 'danger' | 'success' | 'warning' | 'info' | 'neutral',
): string {
  const base = 'border bg-muted/20';
  switch (tone) {
    case 'danger':
      return cn(base, 'border-border/45 text-error');
    case 'success':
      return cn(base, 'border-border/45 text-success');
    case 'warning':
      return cn(base, 'border-border/45 text-warning');
    default:
      return cn(base, 'border-border/60 text-muted-foreground');
  }
}

export function workbenchDecisionCheckerMetricValueClass(
  tone?: 'good' | 'bad' | 'neutral',
): string {
  if (tone === 'good') return 'text-success';
  if (tone === 'bad') return 'text-error';
  return 'text-foreground';
}

export function workbenchDecisionCheckerSurfaceToneClass(
  tone?: 'good' | 'bad' | 'warning',
): string {
  const base = 'border-border/60 bg-muted/20';
  switch (tone) {
    case 'good':
      return cn(base, 'text-success');
    case 'bad':
      return cn(base, 'text-error');
    case 'warning':
      return cn(base, 'text-warning');
    default:
      return cn(base, 'text-foreground');
  }
}

export function workbenchDecisionCheckerReliabilityStatClass(
  level: 'high' | 'medium' | 'low',
): string {
  if (level === 'low') return 'text-error';
  return 'text-foreground';
}

export const workbenchDecisionCheckerAiBox = cn(
  'rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-xs leading-relaxed text-foreground',
);

export const workbenchDecisionCheckerStaleBanner =
  'rounded-lg border border-border/60 bg-muted/20 text-[11px] text-muted-foreground';

/** 工作台 · 待决策/提示条（中性，不用琥珀 gate-confirm 铺底） */
export const workbenchScheduleNoticeSurface =
  'border-b border-border/50 bg-muted/15';

export const workbenchDecisionCheckerBenefitItem = 'text-success';

/** 反事实 / 情景卡 · 克制中性卡 */
export function workbenchScenarioBorderClass(
  _variant: 'blue' | 'orange' | 'purple',
): string {
  return cn(workbenchCard, 'border-border/70 bg-card');
}

export const workbenchCollaboratorAvatarSurface = 'bg-muted text-muted-foreground';

export const workbenchPlanRevisionBadge =
  'border-border/60 bg-muted text-muted-foreground hover:bg-muted';

export const workbenchSplitGroupLabelBadge =
  'border-border/60 bg-muted/40 text-muted-foreground';

export const workbenchHighlightStarIcon =
  'fill-muted-foreground/50 text-muted-foreground/50';

/** 软约束已取舍 · 中性表面 + warning 字色（禁止琥珀铺底） */
export const workbenchSoftSacrificedSurface =
  'rounded-xl border border-border/60 bg-muted/15 p-3';

export const workbenchSoftSacrificedBadge =
  'border border-border/60 bg-muted/20 text-warning';

export const workbenchSoftSacrificedTitle = 'text-xs font-medium text-foreground';

/** 约束侧栏 · 冲突计数（仅字色，不用 destructive 底） */
export const workbenchConstraintConflictCountBadge =
  'h-5 cursor-pointer rounded-full border border-border/45 bg-muted/20 px-2 text-[10px] font-normal text-error hover:bg-muted/30';

/** ==================== 行前 Tab · 与行程/预算工作台统一 ==================== */

export const workbenchPreDepartureColumnShell = cn(
  workbenchCard,
  'flex min-h-[320px] flex-col',
);

export const workbenchPreDepartureColumnHeader =
  'flex items-start justify-between gap-2 border-b border-border/50 px-3 py-2.5';

export const workbenchPreDepartureColumnTitle =
  'text-sm font-semibold tracking-tight text-foreground';

export const workbenchPreDepartureColumnBody =
  'min-h-0 flex-1 overflow-auto px-3 py-2 scrollbar-auto-hide';

export const workbenchPreDepartureSummaryCard = cn(workbenchCard, 'px-3 py-2.5');

export const workbenchPreDepartureSidebarShell = cn(workbenchCard, 'p-4');

export const workbenchPreDepartureListItem = cn(
  workbenchCard,
  'border-border/55 bg-card/90 px-3 py-2.5',
);

export const workbenchPreDepartureIconCell =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/20';

export const workbenchPreDepartureAssigneeAvatar = cn(
  workbenchCollaboratorAvatarSurface,
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
);

export function workbenchPreDepartureMetricToneClass(
  tone: 'neutral' | 'danger' | 'warning' | 'success' = 'neutral',
): string {
  switch (tone) {
    case 'danger':
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-error');
    case 'warning':
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-warning');
    case 'success':
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-success');
    default:
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-muted-foreground');
  }
}

export function workbenchPreDepartureStatusPillClass(
  tone: 'danger' | 'warning' | 'success' | 'neutral',
): string {
  const base = 'rounded-full border px-2.5 py-0.5 text-[11px] font-medium bg-muted/20';
  switch (tone) {
    case 'danger':
      return cn(base, 'border-border/60 text-error');
    case 'warning':
      return cn(base, 'border-border/60 text-warning');
    case 'success':
      return cn(base, 'border-border/60 text-success');
    default:
      return cn(base, 'border-border/60 text-muted-foreground');
  }
}

export function workbenchPreDeparturePriorityBadgeClass(
  priority: 'high' | 'medium' | 'low',
): string {
  if (priority === 'high') return workbenchDecisionCheckerBadgeClass('danger');
  if (priority === 'medium') return workbenchDecisionCheckerBadgeClass('warning');
  return workbenchDecisionCheckerBadgeClass('neutral');
}

export function workbenchPreDepartureTaskStatusBadgeClass(
  status: 'completed' | 'blocked' | 'in_progress' | 'pending',
): string {
  switch (status) {
    case 'completed':
      return workbenchDecisionCheckerBadgeClass('success');
    case 'blocked':
      return workbenchDecisionCheckerBadgeClass('danger');
    case 'in_progress':
      return workbenchDecisionCheckerBadgeClass('info');
    default:
      return workbenchDecisionCheckerBadgeClass('neutral');
  }
}

export function workbenchPreDepartureBookingStatusBadgeClass(
  status: 'confirmed' | 'pending' | 'required' | 'not_needed',
): string {
  switch (status) {
    case 'confirmed':
      return cn(
        workbenchDecisionCheckerBadgeClass('success'),
        'border-border/40',
      );
    case 'pending':
      return workbenchDecisionCheckerBadgeClass('warning');
    case 'required':
      return workbenchDecisionCheckerBadgeClass('danger');
    default:
      return workbenchDecisionCheckerBadgeClass('neutral');
  }
}

export const workbenchPreDepartureBlockersShell = cn(
  workbenchCard,
  'border-border/50 p-4',
);

export const workbenchPreDepartureBlockerItem = cn(
  workbenchPreDepartureListItem,
  'bg-muted/10',
);

/** 行前抽屉 · 任务 / 打包清单 */
export const workbenchDrawerListItem = workbenchConstraintListItem;

export const workbenchDrawerListItemCompleted =
  'border-border/40 bg-muted/12 opacity-85';

export const workbenchDrawerSectionShell = cn(workbenchCard, 'overflow-hidden');

export const workbenchDrawerSectionHeader =
  'flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3';

export const workbenchDrawerSectionTitle =
  'text-sm font-semibold tracking-tight text-foreground';

export const workbenchDrawerSectionDesc = 'mt-0.5 text-xs text-muted-foreground';

export const workbenchDrawerSectionBody = 'px-4 py-3';

export const workbenchDrawerToolbarShell = cn(
  workbenchCard,
  'px-3 py-2.5',
);

export const workbenchPackingCategoryBadgeClass =
  'border-border/60 bg-muted/25 text-muted-foreground';

export function workbenchPackingPriorityBadgeClass(priority: string): string {
  if (priority === 'must') return workbenchPreDeparturePriorityBadgeClass('high');
  if (priority === 'should') return workbenchPreDeparturePriorityBadgeClass('medium');
  return workbenchPreDeparturePriorityBadgeClass('low');
}

export const workbenchDrawerStepIndex =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/20 text-xs font-semibold tabular-nums text-foreground';

/** @deprecated 使用 personaSymbolCellClass */
export function workbenchPersonaSymbolCellClass(persona: PersonaType | string): string {
  return personaSymbolCellClass(persona);
}

export const workbenchBudgetCategoryColors: Record<string, string> = {
  transportation: 'hsl(var(--muted-foreground) / 0.35)',
  accommodation: 'hsl(var(--muted-foreground) / 0.45)',
  food: 'hsl(var(--muted-foreground) / 0.55)',
  experience: 'hsl(var(--muted-foreground) / 0.65)',
  car_rental: 'hsl(var(--muted-foreground) / 0.50)',
  shopping: 'hsl(var(--muted-foreground) / 0.40)',
  reserve: 'hsl(var(--muted-foreground) / 0.60)',
  other: 'hsl(var(--muted-foreground) / 0.30)',
};

export const workbenchBudgetAllocationShell = cn(workbenchCard, '@container/budget-allocation h-full p-4');

export const workbenchBudgetAllocationTitle = workbenchPanelTitle;

/** 窄容器：环形图+图例并排，摘要整行；宽容器：三列 */
export const workbenchBudgetAllocationGrid =
  'mt-3 grid grid-cols-[112px_minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-x-3 gap-y-4 @min-[520px]/budget-allocation:grid-cols-[128px_minmax(148px,1fr)_minmax(118px,132px)] @min-[520px]/budget-allocation:grid-rows-1 @min-[520px]/budget-allocation:items-center @min-[520px]/budget-allocation:gap-x-4';

export const workbenchBudgetAllocationDonutCell =
  'relative mx-auto shrink-0 @min-[520px]/budget-allocation:mx-0';

export const workbenchBudgetAllocationLegendCell = 'min-w-0';

export const workbenchBudgetAllocationLegendRow =
  'grid grid-cols-[minmax(3.5rem,1fr)_auto] items-center gap-2 border-b border-border/40 py-1.5 last:border-0';

export const workbenchBudgetAllocationLegendDot = 'h-2 w-2 shrink-0 rounded-full';

export const workbenchBudgetAllocationLegendName =
  'whitespace-nowrap text-[11px] text-foreground';

export const workbenchBudgetAllocationLegendAmount = cn(
  workbenchSecondaryMetric,
  'text-[11px] font-semibold',
);

export const workbenchBudgetAllocationLegendPct =
  'ml-1.5 inline-block min-w-[2.25rem] text-right text-[10px] tabular-nums text-muted-foreground';

export const workbenchBudgetAllocationSummaryShell =
  'col-span-2 flex min-w-0 flex-col justify-center space-y-3 border-t border-border/60 pt-3 @min-[520px]/budget-allocation:col-span-1 @min-[520px]/budget-allocation:border-l @min-[520px]/budget-allocation:border-t-0 @min-[520px]/budget-allocation:pt-0 @min-[520px]/budget-allocation:pl-4';

export const workbenchBudgetAllocationSummaryHero = cn(
  workbenchSecondaryMetric,
  'text-lg font-bold leading-tight',
);

export const workbenchBudgetAllocationStructureBadge =
  'inline-flex items-center rounded-full border border-border/50 bg-muted px-2 py-0.5 text-[10px] font-medium text-success';

export const workbenchBudgetAllocationDonutTrack =
  'pointer-events-none absolute inset-2 rounded-full border-[8px] border-muted/50';

/** ==================== 探索景点 · 与行程工作台统一 ==================== */

/** 探索景点 · 三栏列底（白底，无灰铺底） */
export const workbenchAttractionExploreColumnSurface = 'bg-background';

/** 编排行程 · 三栏列底（与探索景点一致） */
export const workbenchArrangeItineraryColumnSurface = workbenchAttractionExploreColumnSurface;

export const workbenchAttractionExploreSearchShell = cn(
  'flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-0.5',
);

export const workbenchAttractionExploreSearchToggle = cn(
  'shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium transition-colors',
);

export const workbenchAttractionExploreSearchToggleOn =
  'border-primary/30 bg-primary/10 text-foreground';

export const workbenchAttractionExploreSearchToggleOff =
  'border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/15 hover:text-foreground';

export const workbenchAttractionExploreSectionTitle =
  'mb-2 text-[11px] font-semibold text-foreground';

export const workbenchAttractionExploreChipIdle = cn(
  'rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/20 hover:text-foreground',
);

export const workbenchAttractionExploreChipSelected = cn(
  workbenchAttractionExploreChipIdle,
  'border-primary/40 bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/20',
);

export const workbenchAttractionExploreContextCard = cn(
  workbenchCardFlat,
  'p-2.5',
);

export const workbenchAttractionExploreCard = cn(
  workbenchCard,
  'flex h-full flex-col overflow-hidden bg-card',
);

export const workbenchAttractionExploreEmptySurface = cn(
  workbenchCardFlat,
  'border-dashed border-border/70',
);

export const workbenchAttractionExploreIntentBar =
  'flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-auto-hide';

export const workbenchAttractionExploreAiBox = cn(
  workbenchCardFlat,
  'p-3',
);

export const workbenchAttractionExploreViewTabSelected = workbenchSegmentSelected;

export const workbenchAttractionExploreViewTabIdle = workbenchSegmentIdle;

export const workbenchAttractionExploreMapPreview = cn(
  workbenchCardFlat,
  'inline-flex h-8 items-center gap-1.5 px-2.5 transition-colors hover:bg-muted/10',
);

export const workbenchAttractionExploreCandidateItem = cn(
  'flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 hover:border-border/50 hover:bg-muted/15',
);

export const workbenchAttractionExploreSummaryBar = cn(
  workbenchCardFlat,
  'rounded-lg px-2 py-2',
);

/** 工作台子模式指示条（决策空间 / 约束抽屉） */
export const workbenchModeBarShell =
  'shrink-0 border-b border-border/70 bg-muted/25 px-4 py-2 sm:px-5';

export const workbenchModeBarBack =
  'inline-flex h-9 min-h-9 min-w-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted/40';

export const workbenchModeBarStepActive =
  'font-medium text-foreground underline underline-offset-4 decoration-border';

export const workbenchModeBarStepIdle = 'text-muted-foreground/60';
