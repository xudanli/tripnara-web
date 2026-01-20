/**
 * 排版系统工具函数
 * 
 * 根据体验设计文档 v1.0，提供明确的字号、行高、字重映射
 */

import { cn } from './utils';

/**
 * 排版配置
 * 完全匹配体验设计文档 v1.0 的规范
 */
export const typography = {
  h1: {
    className: 'text-2xl md:text-[32px] leading-[1.2] font-semibold',
    desktop: 'text-[32px]',
    mobile: 'text-2xl', // 24px
    lineHeight: 1.2,
    fontWeight: 600,
  },
  h2: {
    className: 'text-lg md:text-2xl leading-[1.3] font-semibold',
    desktop: 'text-2xl', // 24px
    mobile: 'text-lg', // 18px
    lineHeight: 1.3,
    fontWeight: 600,
  },
  h3: {
    className: 'text-base md:text-lg leading-[1.4] font-medium',
    desktop: 'text-lg', // 18px
    mobile: 'text-base', // 16px
    lineHeight: 1.4,
    fontWeight: 500,
  },
  body: {
    className: 'text-sm md:text-base leading-[1.6] font-normal',
    desktop: 'text-base', // 16px
    mobile: 'text-sm', // 14px
    lineHeight: 1.6,
    fontWeight: 400,
    color: 'text-[#333333]',
  },
  caption: {
    className: 'text-xs leading-[1.4] font-normal text-muted-foreground',
    fontSize: 'text-xs', // 12px
    lineHeight: 1.4,
    fontWeight: 400,
    color: 'text-[#999999]',
  },
} as const;

/**
 * 获取标题样式类名
 */
export function getHeadingClass(level: 1 | 2 | 3, className?: string): string {
  const config = typography[`h${level}` as keyof typeof typography];
  return cn(config.className, className);
}

/**
 * 获取正文样式类名
 */
export function getBodyClass(className?: string): string {
  return cn(typography.body.className, className);
}

/**
 * 获取辅助文本样式类名
 */
export function getCaptionClass(className?: string): string {
  return cn(typography.caption.className, className);
}

/**
 * 根据文本长度获取建议行高
 * 
 * 文档规则：
 * - <30字: 1.2-1.3
 * - 30-50字: 1.4-1.5
 * - >50字: 1.5-1.6
 */
export function getSuggestedLineHeight(textLength: number): number {
  if (textLength < 30) return 1.25; // 1.2-1.3 的中值
  if (textLength <= 50) return 1.45; // 1.4-1.5 的中值
  return 1.55; // 1.5-1.6 的中值
}
