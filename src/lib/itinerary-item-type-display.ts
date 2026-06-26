/**
 * 行程项类型 — 全站统一展示（编辑下拉、时间轴徽章、Agent 卡片等）
 * 枚举值供后端区分；label / shortLabel 供用户阅读。
 */
import type { LucideIcon } from 'lucide-react';
import { MapPin, Utensils, Coffee, Moon, Car } from 'lucide-react';
import type { ItineraryItemType } from '@/types/trip';

export interface ItineraryItemTypeDisplay {
  value: ItineraryItemType;
  /** 表单、说明文案 */
  label: string;
  /** 时间轴徽章等紧凑场景 */
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
}

export const ITINERARY_ITEM_TYPE_DISPLAY: Record<ItineraryItemType, ItineraryItemTypeDisplay> = {
  ACTIVITY: {
    value: 'ACTIVITY',
    label: '游玩活动',
    shortLabel: '游玩',
    description: '景点、博物馆、体验活动',
    icon: MapPin,
    emoji: '📍',
  },
  MEAL_ANCHOR: {
    value: 'MEAL_ANCHOR',
    label: '预约用餐',
    shortLabel: '正餐',
    description: '需订位的餐厅、重要正餐',
    icon: Utensils,
    emoji: '🍽️',
  },
  MEAL_FLOATING: {
    value: 'MEAL_FLOATING',
    label: '灵活用餐',
    shortLabel: '简餐',
    description: '小吃、咖啡、不设具体餐厅',
    icon: Coffee,
    emoji: '☕',
  },
  REST: {
    value: 'REST',
    label: '休息留白',
    shortLabel: '休息',
    description: '酒店休整、午睡、自由时间',
    icon: Moon,
    emoji: '🌙',
  },
  TRANSIT: {
    value: 'TRANSIT',
    label: '交通移动',
    shortLabel: '交通',
    description: '车程、航班、换乘',
    icon: Car,
    emoji: '🚗',
  },
};

export const ITINERARY_ITEM_TYPE_OPTIONS: ItineraryItemTypeDisplay[] = Object.values(
  ITINERARY_ITEM_TYPE_DISPLAY,
);

const ITINERARY_TYPE_SET = new Set<string>(ITINERARY_ITEM_TYPE_OPTIONS.map((o) => o.value));

export function isItineraryItemType(value: string | undefined | null): value is ItineraryItemType {
  if (!value?.trim()) return false;
  return ITINERARY_TYPE_SET.has(value.trim().toUpperCase());
}

export function getItineraryItemTypeDisplay(
  type: ItineraryItemType | string | undefined | null,
): ItineraryItemTypeDisplay {
  const key = (type ?? 'ACTIVITY').trim().toUpperCase();
  if (isItineraryItemType(key)) {
    return ITINERARY_ITEM_TYPE_DISPLAY[key];
  }
  return ITINERARY_ITEM_TYPE_DISPLAY.ACTIVITY;
}

export function getItineraryItemTypeLabel(
  type: ItineraryItemType | string | undefined | null,
): string {
  return getItineraryItemTypeDisplay(type).label;
}

export function getItineraryItemTypeShortLabel(
  type: ItineraryItemType | string | undefined | null,
): string {
  return getItineraryItemTypeDisplay(type).shortLabel;
}

/** 时间轴类型徽章：始终按行程项 type，不与地点 category 混用 */
export function getItineraryItemTimelineTypeBadge(item: { type?: string | null }): {
  emoji: string;
  label: string;
} {
  const display = getItineraryItemTypeDisplay(item.type);
  return { emoji: display.emoji, label: display.shortLabel };
}
