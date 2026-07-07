/**
 * 语义 UI 类名 · 黑白灰结构 + success/warning/error 仅作反馈
 * 供 *-ui.ts、util、组件共享，避免散落 Tailwind 默认色阶
 */

const semanticNeutralSurface = 'border-border bg-card text-card-foreground';

/** 通过 / 成功 / 低风险 · 中性面 + success 字色 */
export const semanticGoodSurface = semanticNeutralSurface;

/** 拒绝 / 危险 / 阻断 · 中性面 + error 字色 */
export const semanticBadSurface = semanticNeutralSurface;

/** 客观数据 / 信息 / 建议替换 · 纯中性 */
export const semanticInfoSurface = semanticNeutralSurface;

/** 需确认 · 中性面 + warning 字色 */
export const semanticWarnSurface = semanticNeutralSurface;

/** 成员标签轮转：全中性描边 */
export const semanticMemberTagClasses = [
  'border-border bg-muted text-foreground',
  'border-border/80 bg-muted/80 text-foreground',
  'border-border/60 bg-muted/60 text-foreground',
  'border-border bg-card text-foreground',
] as const;

export const semanticGoodText = 'text-success';
export const semanticBadText = 'text-error';
export const semanticInfoText = 'text-muted-foreground';
export const semanticWarnText = 'text-warning';

export const semanticGoodBg = 'bg-card';
export const semanticBadBg = 'bg-card';
export const semanticInfoBg = 'bg-muted';

export const semanticGoodBorder = 'border-border';
export const semanticBadBorder = 'border-border';
export const semanticInfoBorder = 'border-border';

/** 产品信息区 · 中性 inset（禁止冰川蓝铺底） */
export const productInfoPanelClass =
  'rounded-lg border border-border bg-muted/15 text-foreground';

export const productInfoInsetClass = 'border border-border bg-muted/15';

export const productInfoIconClass = 'text-muted-foreground';

export const productInfoMutedTextClass = 'text-muted-foreground';
