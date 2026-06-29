import { cn } from '@/lib/utils';

/**
 * Planning Workbench 视觉 token
 * 原则：中性底 + gate 四态语义色；禁止紫色装饰与 Tailwind 彩虹堆叠
 * 品牌辅助色：nara-lava / nara-glacier / nara-tundra
 * @see globals.css · gate-* · nara-*
 */

export const workbenchShell = 'bg-background';

export const workbenchColumnSurface = 'bg-muted/15';

export const workbenchPanelHeader =
  'shrink-0 border-b border-border bg-card px-3 py-2';

export const workbenchPanelTitle = 'text-sm font-semibold tracking-tight text-foreground';

export const workbenchCard =
  'rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export const workbenchListItemBase =
  'rounded-lg border px-2.5 py-2 text-left text-xs transition-colors';

export const workbenchListItemSelected = cn(
  workbenchListItemBase,
  'border-border bg-muted/60 text-foreground shadow-sm',
);

export const workbenchListItemIdle = cn(
  workbenchListItemBase,
  'border-transparent bg-card hover:border-border/70 hover:bg-muted/30',
);

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
    return 'border-l-2 border-l-gate-reject-foreground pl-[calc(0.75rem-2px)]';
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
      return 'border-gate-confirm-border/35 bg-gate-confirm/8 text-gate-confirm-foreground';
    case 'danger':
      return 'border-gate-reject-border/35 bg-gate-reject/8 text-gate-reject-foreground';
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
  'block text-[10px] font-medium tracking-wide text-muted-foreground';

export const workbenchConstraintListItemValue =
  'mt-0.5 block text-xs font-semibold leading-snug text-foreground';

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
  'rounded-xl border border-border/70 bg-muted/30 p-3';

export const workbenchEmptySurface =
  'rounded-xl border border-dashed border-border/70 bg-muted/15';

export const workbenchNlSurface =
  'rounded-xl border border-border/70 bg-muted/20 p-3';

export const workbenchCustomSoftSurface =
  'rounded-xl border border-nara-tundra-border/50 bg-nara-tundra-muted p-3';

/** 行程 Tab · 日选择器（Quiet confidence：中性底 + 细描边，不用 primary 色块） */
export const workbenchDayTabSelected =
  'border-border/80 bg-card text-foreground font-medium shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-foreground/10';

export const workbenchDayTabIdle =
  'border-transparent bg-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/30 hover:text-foreground';

export const workbenchDayTabConflict =
  'ring-1 ring-gate-reject-border/35';

export const workbenchDayTabAffected =
  'border-gate-suggest-border/40 bg-gate-suggest/8';

/** 行程 Tab · 时间轴时刻（冰川蓝 + 等宽数字） */
export const workbenchScheduleTimelineTime =
  'shrink-0 pt-0.5 font-mono-brand text-[11px] font-medium tabular-nums text-nara-glacier-foreground';

export const workbenchScheduleOvertime =
  'font-mono-brand text-[11px] font-medium tabular-nums text-gate-reject-foreground';

export const workbenchScheduleDayStrip =
  'rounded-xl border border-border/60 bg-muted/10 p-1';

export const workbenchScheduleConflictPanel =
  'flex min-h-0 flex-col bg-muted/15';

export const workbenchFeasibilityBadge =
  'border border-nara-tundra-border/60 bg-nara-tundra-muted text-nara-tundra-foreground hover:bg-nara-tundra-muted';

export const workbenchMajorDayChip =
  'border-border/70 bg-muted text-foreground';

export const workbenchMinorDayChip =
  'border-border/70 bg-background text-muted-foreground';

export const workbenchSliderTrack = '[&_.bg-primary]:bg-foreground/80';

/** 硬核只读数据 · 冰川蓝 + 等宽数字 */
export const workbenchSecondaryMetric =
  'font-mono-brand tabular-nums text-nara-glacier-foreground';

/** 行程 Tab · 路线统计数值 */
export const workbenchScheduleMetricValue = cn(
  workbenchSecondaryMetric,
  'text-[11px] font-semibold',
);

export const workbenchHeaderShell =
  'shrink-0 border-b border-border bg-card/95 backdrop-blur-sm';

export const workbenchHeaderTitle = 'truncate text-base font-semibold tracking-tight sm:text-lg';

export const workbenchHeaderSubtitle = 'mt-0.5 truncate text-xs text-muted-foreground';

export const workbenchProgressTrack = 'h-1.5 overflow-hidden rounded-full bg-muted';

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
  switch (stance) {
    case 'oppose':
      return 'border-gate-reject-border bg-gate-reject/30 text-gate-reject-foreground';
    case 'ok':
      return 'border-gate-allow-border bg-gate-allow/25 text-gate-allow-foreground';
    default:
      return 'border-gate-confirm-border bg-gate-confirm/30 text-gate-confirm-foreground';
  }
}

/** 分流横幅 · gate-suggest 冰川蓝（SUGGEST_REPLACE / 分流语义） */
export function workbenchSplitBannerSurface(tone?: 'info' | 'warning'): string {
  return tone === 'warning'
    ? 'rounded-xl border border-gate-suggest-border/55 bg-gate-suggest/16 shadow-[0_1px_3px_rgba(15,23,42,0.05)]'
    : 'rounded-xl border border-gate-suggest-border/45 bg-gate-suggest/12';
}

export function workbenchSplitBannerIconSurface(tone?: 'info' | 'warning'): string {
  return tone === 'warning'
    ? 'bg-nara-glacier-muted text-nara-glacier-foreground'
    : 'bg-gate-suggest/25 text-gate-suggest-foreground';
}

/** 分流时间线 · 整卡外框 */
export const workbenchSplitTimelineShell = cn(
  workbenchCard,
  'border-gate-suggest-border/45 bg-gradient-to-b from-gate-suggest/10 via-card to-card',
);

/** 分流时间线 · 指标条 */
export const workbenchSplitStatsBar =
  'grid grid-cols-3 gap-2 border-b border-gate-suggest-border/30 bg-gate-suggest/10 px-4 py-2.5';

/** 分流时间线 · 分叉并行区（中性容器，背景区分交给各分支卡） */
export const workbenchSplitForkZone = cn(
  'relative my-2 rounded-xl border border-border/45 bg-transparent px-2 py-3',
);

/** 日选择器 · 含分流预览的天 */
export const workbenchDayTabSplit =
  'border-gate-suggest-border/50 bg-gate-suggest/12 text-gate-suggest-foreground';

/** 分流 A/B 组 · A=冰川蓝 / B=琥珀暖色，整卡底色区分并行路径 */
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
  return tone === 'a'
    ? {
        card: 'border-nara-glacier-border/70 bg-gate-suggest/55 shadow-sm ring-1 ring-inset ring-nara-glacier-border/20',
        divider: 'border-nara-glacier-border/40',
        badge:
          'border-nara-glacier-border/55 bg-gate-suggest/70 text-gate-suggest-foreground',
        connector: 'border-nara-glacier-border/55',
        themeText: 'text-gate-suggest-foreground',
        checkIcon: 'text-gate-suggest-foreground/80',
        avatar:
          'border-nara-glacier-border/50 bg-gate-suggest/65 text-gate-suggest-foreground',
        letter: 'text-gate-suggest-foreground',
      }
    : {
        card: 'border-gate-confirm-border/75 bg-gate-confirm/60 shadow-sm ring-1 ring-inset ring-gate-confirm-border/25',
        divider: 'border-gate-confirm-border/45',
        badge:
          'border-gate-confirm-border/60 bg-gate-confirm/80 text-gate-confirm-foreground',
        connector: 'border-gate-confirm-border/55',
        themeText: 'text-gate-confirm-foreground',
        checkIcon: 'text-gate-confirm-foreground/80',
        avatar:
          'border-gate-confirm-border/50 bg-gate-confirm/75 text-gate-confirm-foreground',
        letter: 'text-gate-confirm-foreground',
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
    return 'border-gate-reject-border/60 bg-gate-reject/15 text-gate-reject-foreground';
  }
  if (level === 'medium') {
    return 'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground';
  }
  return 'border-gate-allow-border/60 bg-gate-allow/15 text-gate-allow-foreground';
}

export const workbenchSplitRejoinSurface =
  'rounded-xl border border-gate-suggest-border/45 bg-gate-suggest/12';

export const workbenchSplitForkDot =
  'border-gate-suggest-border/50 bg-gate-suggest/15';

export const workbenchSplitForkSpine = 'border-border/45';

/** 分叉 → 分支卡 · 克制引出线（A 实线 / B 虚线，中性色） */
export function workbenchSplitForkArmLineClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  const tone = resolveWorkbenchSplitBranchTone(branchIndex, variant);
  return tone === 'a'
    ? 'h-px bg-nara-glacier-border/55'
    : 'h-0 border-t border-dashed border-gate-confirm-border/55';
}

export function workbenchSplitForkArmArrowClass(
  _branchIndex = 0,
  _variant?: WorkbenchSplitBranchVariant,
): string {
  const tone = resolveWorkbenchSplitBranchTone(_branchIndex, _variant);
  return tone === 'a' ? 'border-l-nara-glacier-border/55' : 'border-l-gate-confirm-border/55';
}

export function workbenchSplitGroupCardClass(
  branchIndex = 0,
  variant?: WorkbenchSplitBranchVariant,
): string {
  return cn(workbenchCard, 'p-3', workbenchSplitBranchCardClass(branchIndex, variant));
}

/** 决策检查器 · Badge tone → gate 四态 */
export function workbenchDecisionCheckerBadgeClass(
  tone: 'danger' | 'success' | 'warning' | 'info' | 'neutral',
): string {
  switch (tone) {
    case 'danger':
      return 'bg-gate-reject/25 text-gate-reject-foreground';
    case 'success':
      return 'bg-gate-allow/25 text-gate-allow-foreground';
    case 'warning':
      return 'bg-gate-confirm/25 text-gate-confirm-foreground';
    case 'info':
      return 'bg-nara-glacier-muted text-nara-glacier-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function workbenchDecisionCheckerMetricValueClass(
  tone?: 'good' | 'bad' | 'neutral',
): string {
  if (tone === 'good') return 'text-gate-allow-foreground';
  if (tone === 'bad') return 'text-gate-reject-foreground';
  return 'text-foreground';
}

export function workbenchDecisionCheckerSurfaceToneClass(
  tone?: 'good' | 'bad' | 'warning',
): string {
  switch (tone) {
    case 'good':
      return 'border-gate-allow-border/60 bg-gate-allow/10 text-gate-allow-foreground';
    case 'bad':
      return 'border-gate-reject-border/60 bg-gate-reject/10 text-gate-reject-foreground';
    case 'warning':
      return 'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground';
    default:
      return 'border-border/60 bg-muted/20 text-foreground';
  }
}

export function workbenchDecisionCheckerReliabilityStatClass(
  level: 'high' | 'medium' | 'low',
): string {
  switch (level) {
    case 'high':
      return 'text-gate-allow-foreground';
    case 'medium':
      return 'text-gate-confirm-foreground';
    default:
      return 'text-gate-reject-foreground';
  }
}

export const workbenchDecisionCheckerAiBox = cn(
  'rounded-xl border border-nara-glacier-border/60 bg-nara-glacier-muted px-3 py-2.5 text-xs leading-relaxed text-foreground',
);

export const workbenchDecisionCheckerStaleBanner =
  'rounded-lg border border-gate-confirm-border/60 bg-gate-confirm/10 text-[11px] text-gate-confirm-foreground';

export const workbenchDecisionCheckerBenefitItem = 'text-gate-allow-foreground';

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
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-gate-reject-foreground');
    case 'warning':
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-gate-confirm-foreground');
    case 'success':
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-nara-tundra-foreground');
    default:
      return cn(workbenchSecondaryMetric, 'text-xl font-semibold text-nara-glacier-foreground');
  }
}

export function workbenchPreDepartureStatusPillClass(
  tone: 'danger' | 'warning' | 'success' | 'neutral',
): string {
  const base = 'rounded-full px-2.5 py-0.5 text-[11px] font-medium';
  switch (tone) {
    case 'danger':
      return cn(base, 'border border-gate-reject-border/60 bg-gate-reject/15 text-gate-reject-foreground');
    case 'warning':
      return cn(base, 'border border-gate-confirm-border/60 bg-gate-confirm/12 text-gate-confirm-foreground');
    case 'success':
      return cn(
        base,
        'border border-nara-tundra-border/50 bg-nara-tundra-muted text-nara-tundra-foreground',
      );
    default:
      return cn(base, 'border border-border/60 bg-muted/30 text-muted-foreground');
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
        'border-nara-tundra-border/40',
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
  'border-gate-reject-border/50 p-4',
);

export const workbenchPreDepartureBlockerItem = cn(
  workbenchPreDepartureListItem,
  'bg-gate-reject/5',
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

/** 预算分配概览 · 分类色（克制中性色谱，禁止 purple 装饰） */
export const workbenchBudgetCategoryColors: Record<string, string> = {
  transportation: 'var(--nara-glacier)',
  accommodation: 'var(--nara-glacier-foreground)',
  food: 'hsl(var(--chart-5))',
  experience: 'var(--nara-tundra)',
  car_rental: 'hsl(var(--chart-4))',
  shopping: 'hsl(var(--chart-2))',
  reserve: 'hsl(var(--chart-3))',
  other: 'hsl(var(--muted-foreground) / 0.55)',
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
  'inline-flex items-center rounded-full border border-nara-tundra-border/50 bg-nara-tundra-muted px-2 py-0.5 text-[10px] font-medium text-nara-tundra-foreground';

export const workbenchBudgetAllocationDonutTrack =
  'pointer-events-none absolute inset-2 rounded-full border-[8px] border-muted/50';
