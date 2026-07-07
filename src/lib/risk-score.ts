/**
 * 风险评分工具函数
 * 
 * 根据体验设计文档 v1.0，实现6级风险评分颜色映射：
 * - 0-30: 绿色（低风险）
 * - 31-45: 浅绿-黄绿（中低风险）
 * - 46-60: 黄色（中等风险）
 * - 61-75: 橙黄（中高风险）
 * - 76-90: 橙色（高风险）
 * - 91-100: 红色（极高风险）
 */

export type RiskScoreLevel = 
  | 'very-low'      // 0-30
  | 'low-medium'    // 31-45
  | 'medium'        // 46-60
  | 'medium-high'   // 61-75
  | 'high'          // 76-90
  | 'very-high';    // 91-100

export interface RiskScoreConfig {
  level: RiskScoreLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: 'check' | 'alert-triangle';
  min: number;
  max: number;
}

/**
 * 根据风险评分（0-100）获取风险等级
 */
export function getRiskScoreLevel(score: number): RiskScoreLevel {
  if (score <= 30) return 'very-low';
  if (score <= 45) return 'low-medium';
  if (score <= 60) return 'medium';
  if (score <= 75) return 'medium-high';
  if (score <= 90) return 'high';
  return 'very-high';
}

/**
 * 获取风险评分配置
 */
export function getRiskScoreConfig(score: number): RiskScoreConfig {
  const level = getRiskScoreLevel(score);
  return RISK_SCORE_CONFIGS[level];
}

/**
 * 风险评分配置表
 * 颜色值基于体验设计文档 v1.0 的规范
 */
/**
 * 风险评分配置表
 * 颜色值完全匹配体验设计文档 v1.0 的规范
 * 
 * 端点色对齐 gate token：
 * - 0-45: gate-allow（绿）
 * - 91-100: gate-reject（红）
 */
export const RISK_SCORE_CONFIGS: Record<RiskScoreLevel, RiskScoreConfig> = {
  'very-low': {
    level: 'very-low',
    label: '低风险',
    color: 'text-success',
    bgColor: 'bg-muted',
    borderColor: 'border-gate-allow-border',
    icon: 'check',
    min: 0,
    max: 30,
  },
  'low-medium': {
    level: 'low-medium',
    label: '中低风险',
    color: 'text-success',
    bgColor: 'bg-muted',
    borderColor: 'border-gate-allow-border',
    icon: 'check',
    min: 31,
    max: 45,
  },
  'medium': {
    level: 'medium',
    label: '中等风险',
    color: 'text-warning',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: 'alert-triangle',
    min: 46,
    max: 60,
  },
  'medium-high': {
    level: 'medium-high',
    label: '中高风险',
    color: 'text-warning',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: 'alert-triangle',
    min: 61,
    max: 75,
  },
  'high': {
    level: 'high',
    label: '高风险',
    color: 'text-error',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: 'alert-triangle',
    min: 76,
    max: 90,
  },
  'very-high': {
    level: 'very-high',
    label: '极高风险',
    color: 'text-error',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: 'alert-triangle',
    min: 91,
    max: 100,
  },
};

/**
 * 获取风险评分的 Tailwind CSS 类名
 */
export function getRiskScoreColorClasses(score: number): string {
  const config = getRiskScoreConfig(score);
  return `${config.bgColor} ${config.color} ${config.borderColor}`;
}

/**
 * 获取风险评分的背景色类名
 */
export function getRiskScoreBgClass(score: number): string {
  return getRiskScoreConfig(score).bgColor;
}

/**
 * 获取风险评分的文字颜色类名
 */
export function getRiskScoreTextClass(score: number): string {
  return getRiskScoreConfig(score).color;
}

/**
 * 获取风险评分的边框颜色类名
 */
export function getRiskScoreBorderClass(score: number): string {
  return getRiskScoreConfig(score).borderColor;
}

/**
 * 格式化风险评分显示（带单位）
 */
export function formatRiskScore(score: number): string {
  return `${score}%`;
}

/**
 * 获取风险评分的含义描述
 */
export function getRiskScoreMeaning(score: number): string {
  const level = getRiskScoreLevel(score);
  const meanings: Record<RiskScoreLevel, string> = {
    'very-low': '安全，建议进行',
    'low-medium': '基本安全，可考虑',
    'medium': '需要注意，做好准备',
    'medium-high': '风险可控但明显，需谨慎',
    'high': '风险高，需充分准备',
    'very-high': '严重风险，不推荐',
  };
  return meanings[level];
}
