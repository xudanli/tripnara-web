/**
 * TripNARA 统一设计 Token
 * 
 * 符合 TripNARA 设计哲学：
 * - Clarity over Charm（清晰优先于讨喜）
 * - Evidence is the aesthetic（证据就是美学）
 * - Decision is a UI primitive（决策是 UI 原语）
 * - Quiet confidence（安静的自信）
 * 
 * 原则：
 * - 四态色彩要克制：主靠层级、描边、icon、标签，避免情绪化大红大绿
 * - 颜色承担全部信息（必须靠层级、布局与标签系统）
 * - One system, many surfaces（一个系统，多端一致）
 */

/**
 * GateStatus 颜色 Token（四态裁决）
 * 
 * 符合 TripNARA "克制"原则：主靠层级、描边、icon、标签
 * ❌ 禁止：bg-red-500（纯红色背景）
 * ✅ 使用：bg-red-50（极浅背景）+ border-red-600（描边）+ text-red-700（文字）
 */
export const gateStatusTokens = {
  BLOCK: {
    border: 'border-red-600',      // #dc2626（描边）
    text: 'text-red-700',          // #b91c1c（文字）
    bg: 'bg-red-50',               // #fef2f2（背景，极浅）
    icon: 'text-red-600',          // #dc2626（图标）
  },
  WARN: {
    border: 'border-amber-600',     // #d97706
    text: 'text-amber-700',         // #b45309
    bg: 'bg-amber-50',              // #fffbeb
    icon: 'text-amber-600',         // #d97706
  },
  PASS: {
    border: 'border-green-600',    // #16a34a
    text: 'text-green-700',         // #15803d
    bg: 'bg-green-50',              // #f0fdf4
    icon: 'text-green-600',         // #16a34a
  },
} as const;

/**
 * 信息性颜色 Token（蓝色）
 * 
 * 用于：日期、链接、交通标签等信息性内容
 * 语义：信息性、可操作、中性
 */
export const infoTokens = {
  date: 'text-blue-600',           // #2563eb（日期）
  link: 'text-blue-600',           // #2563eb（链接）
  transport: {
    bg: 'bg-blue-50',              // #eff6ff（交通标签背景）
    text: 'text-blue-700',         // #1e40af（交通标签文字）
    border: 'border-blue-200',     // #bfdbfe（交通标签边框）
  },
} as const;

/**
 * 中性颜色 Token（灰色）
 * 
 * 用于：按钮、边框、背景等中性内容
 * 语义：中性、辅助、次要
 */
export const neutralTokens = {
  buttonBg: 'bg-gray-50',          // #f9fafb（按钮背景）
  buttonBorder: 'border-gray-200',  // #e5e7eb（按钮边框）
  cardBorder: 'border-gray-200',    // #e5e7eb（卡片边框）
  cardBg: 'bg-white',              // #ffffff（卡片背景）
  statCardBg: 'bg-gray-50',        // #f9fafb（统计卡片背景）
} as const;

/**
 * 卡片样式 Token
 * 
 * 不同场景使用不同的卡片样式：
 * - standard: 主内容区（有阴影）
 * - drawer: 抽屉内容（无阴影，轻量）
 * - evidence: 证据卡片（只有边框）
 * - stat: 统计卡片（浅灰背景）
 */
export const cardVariants = {
  standard: 'border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow',
  drawer: 'border border-gray-200 bg-white', // 无阴影，保持轻量
  evidence: 'border border-gray-200 bg-white rounded-lg', // 只有边框，无阴影
  stat: 'bg-gray-50 border border-gray-200 rounded-lg', // 浅灰背景
} as const;

/**
 * 按钮样式 Token
 * 
 * 不同场景使用不同的按钮样式：
 * - primary: 主要操作（蓝色）
 * - secondary: 次要操作（灰色）
 * - tag: 标签按钮（浅蓝背景）
 * - ghost: 关闭按钮（透明）
 */
export const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100',
  tag: 'bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-1',
  ghost: 'hover:bg-gray-100',
} as const;

/**
 * Typography Token
 * 
 * 统一的文字样式：
 * - score: 分数（最大、最粗）
 * - statNumber: 统计数字（中等、半粗）
 * - label: 标签文字（最小、灰色）
 * - date: 日期（中等、蓝色）
 */
export const typographyTokens = {
  score: 'text-xl font-bold',              // 20px，粗体（分数）
  scoreDenominator: 'text-xs text-gray-500', // 12px，灰色（分数分母）
  statNumber: 'text-base font-semibold',   // 16px，半粗体（统计数字）
  statLabel: 'text-xs text-gray-600',      // 12px，灰色（统计标签）
  date: 'text-sm text-blue-600',          // 14px，蓝色（日期）
  label: 'text-xs text-gray-600',         // 12px，灰色（标签）
} as const;

/**
 * 间距 Token
 * 
 * 统一的间距规范：
 * - drawerPadding: 抽屉水平内边距（16px）
 * - drawerPaddingTop: 抽屉顶部内边距（16px）
 * - drawerPaddingBottom: 抽屉底部内边距（16px）
 * - drawerPaddingBottomSmall: 抽屉中间内边距（12px）
 * - drawerGap: 元素间距（12px）
 * - drawerGapSmall: 按钮间距（8px）
 */
export const spacingTokens = {
  drawerPadding: 'px-4',              // 16px（水平内边距）
  drawerPaddingTop: 'pt-4',           // 16px（顶部内边距）
  drawerPaddingBottom: 'pb-4',        // 16px（底部内边距）
  drawerPaddingBottomSmall: 'pb-3',   // 12px（中间内边距）
  drawerGap: 'gap-3',                 // 12px（元素间距）
  drawerGapSmall: 'gap-2',            // 8px（按钮间距）
} as const;

/**
 * GateStatus 横幅样式 Token
 * 
 * 统一的横幅样式：
 * - 使用左侧边框（border-l-4）
 * - 使用浅色背景（bg-50）
 * - 使用深色文字（text-700）
 * ❌ 禁止：纯色背景（bg-red-500）
 */
export const gateStatusBannerTokens = {
  BLOCK: 'border-l-4 border-red-600 bg-red-50 text-red-700',
  WARN: 'border-l-4 border-amber-600 bg-amber-50 text-amber-700',
  PASS: 'border-l-4 border-green-600 bg-green-50 text-green-700',
} as const;
