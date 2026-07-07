/**
 * TripNARA 统一设计 Token
 *
 * 产品语义色：gate-allow · gate-confirm · gate-reject（中性面 + 字色）
 * 主 CTA：primary（黑）
 * 信息区：中性灰（禁止品牌蓝产品面）
 */

/** GateStatus 四态（对齐 globals.css gate-*） */
export const gateStatusTokens = {
  BLOCK: {
    border: 'border-gate-reject-border',
    text: 'text-gate-reject-foreground',
    bg: 'bg-gate-reject',
    icon: 'text-gate-reject-foreground',
  },
  WARN: {
    border: 'border-gate-confirm-border',
    text: 'text-gate-confirm-foreground',
    bg: 'bg-gate-confirm',
    icon: 'text-gate-confirm-foreground',
  },
  PASS: {
    border: 'border-gate-allow-border',
    text: 'text-gate-allow-foreground',
    bg: 'bg-gate-allow',
    icon: 'text-gate-allow-foreground',
  },
} as const;

/** 信息性颜色 · 中性结构 + 灰字 */
export const infoTokens = {
  date: 'text-muted-foreground',
  link: 'text-foreground underline-offset-4 hover:underline',
  transport: {
    bg: 'bg-muted/15',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
} as const;

export const neutralTokens = {
  buttonBg: 'bg-gray-50',
  buttonBorder: 'border-gray-200',
  cardBorder: 'border-gray-200',
  cardBg: 'bg-white',
  statCardBg: 'bg-gray-50',
} as const;

export const cardVariants = {
  standard: 'border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow',
  drawer: 'border border-gray-200 bg-white',
  evidence: 'border border-gray-200 bg-white rounded-lg',
  stat: 'bg-gray-50 border border-gray-200 rounded-lg',
} as const;

export const buttonVariants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100',
  tag: 'bg-muted/15 text-muted-foreground border border-border rounded-full px-2 py-1',
  ghost: 'hover:bg-gray-100',
} as const;

export const typographyTokens = {
  score: 'text-xl font-bold',
  scoreDenominator: 'text-xs text-gray-500',
  statNumber: 'text-base font-semibold',
  statLabel: 'text-xs text-gray-600',
  date: 'text-sm text-muted-foreground',
  label: 'text-xs text-gray-600',
} as const;

export const spacingTokens = {
  drawerPadding: 'px-4',
  drawerPaddingTop: 'pt-4',
  drawerPaddingBottom: 'pb-4',
  drawerPaddingBottomSmall: 'pb-3',
  drawerGap: 'gap-3',
  drawerGapSmall: 'gap-2',
} as const;

export const gateStatusBannerTokens = {
  BLOCK: 'border-l-4 border-gate-reject-border bg-gate-reject text-gate-reject-foreground',
  WARN: 'border-l-4 border-gate-confirm-border bg-gate-confirm text-gate-confirm-foreground',
  PASS: 'border-l-4 border-gate-allow-border bg-gate-allow text-gate-allow-foreground',
} as const;
