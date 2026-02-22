/**
 * 行程助手配置
 *
 * 快捷操作、紧急求助等可配置项。
 * 后端可通过 GET /agent/journey-assistant/trips/:tripId/quick-actions 返回动态配置覆盖默认值。
 */

import type { LucideIcon } from 'lucide-react';
import { Utensils, Coffee, ShoppingBag, Hospital } from 'lucide-react';

export interface QuickActionItem {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
}

/** 图标名称到组件的映射（用于后端返回 icon 字符串时） */
export const QUICK_ACTION_ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  shopping: ShoppingBag,
  hospital: Hospital,
  // 可扩展
};

/** 默认快捷操作（前端兜底，后端未实现时使用） */
export const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'food', label: '附近美食', prompt: '附近有什么好吃的', icon: Utensils },
  { id: 'coffee', label: '找咖啡', prompt: '附近有咖啡厅吗', icon: Coffee },
  { id: 'shopping', label: '购物', prompt: '附近有什么购物的地方', icon: ShoppingBag },
  { id: 'pharmacy', label: '找药店', prompt: '最近的药店在哪里', icon: Hospital },
];

/** 紧急求助是否显示（可后续由后端或用户设置控制） */
export const JOURNEY_ASSISTANT_CONFIG = {
  showEmergencyButton: true,
} as const;
