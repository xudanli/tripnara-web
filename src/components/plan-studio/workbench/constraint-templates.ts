import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Camera,
  Car,
  Clock,
  Leaf,
  MapPin,
  Mountain,
  Route,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';

export type ConstraintTemplateKind = 'hard' | 'soft';

export interface ConstraintTemplate {
  id: string;
  kind: ConstraintTemplateKind;
  label: string;
  description: string;
  icon: LucideIcon;
  requiresSelfDrive?: boolean;
  /** 走原有聚焦弹窗，不进三栏控制台 */
  legacyKey?: ConstraintPendingKey;
}

export const CONSTRAINT_TEMPLATES: ConstraintTemplate[] = [
  {
    id: 'time_range',
    kind: 'hard',
    label: '总行程时长',
    description: '设置出发与返程日期，确定行程天数',
    icon: Clock,
  },
  {
    id: 'budget',
    kind: 'hard',
    label: '预算上限',
    description: '设定总预算门控，超支项将被标记',
    icon: Wallet,
  },
  {
    id: 'must_go',
    kind: 'hard',
    label: '必去地点',
    description: '锁定必须到访的 POI 或区域',
    icon: MapPin,
  },
  {
    id: 'daily_drive',
    kind: 'hard',
    label: '每日驾驶上限',
    description: '限制单日驾驶时长，保障舒适度',
    icon: Car,
    requiresSelfDrive: true,
  },
  {
    id: 'road_restrictions',
    kind: 'hard',
    label: '道路开放限制',
    description: 'F 路、季节性封路等通行约束',
    icon: Route,
    requiresSelfDrive: true,
  },
  {
    id: 'accommodation',
    kind: 'hard',
    label: '住宿标准',
    description: '最低星级或住宿品质要求',
    icon: Building2,
  },
  {
    id: 'travelers',
    kind: 'hard',
    label: '出行人数',
    description: '规划与预算按此人数计算',
    icon: Users,
    legacyKey: 'travelers',
  },
  {
    id: 'transport',
    kind: 'hard',
    label: '基础交通方式',
    description: '自驾、公共交通或混合出行',
    icon: Car,
    legacyKey: 'transport',
  },
  {
    id: 'attractions_over_shopping',
    kind: 'soft',
    label: '景点优于购物',
    description: '排程时优先安排观光体验',
    icon: Camera,
  },
  {
    id: 'avoid_early',
    kind: 'soft',
    label: '避免连续早起',
    description: '控制连续早出发的天数',
    icon: Clock,
  },
  {
    id: 'elderly_rest',
    kind: 'soft',
    label: '老人下午需休息',
    description: '15:00 前安排休息或低强度活动',
    icon: Users,
  },
  {
    id: 'budget_soft',
    kind: 'soft',
    label: '预算约束（软）',
    description: '尽量控制花费，必要时可适度超出',
    icon: Wallet,
  },
  {
    id: 'aurora_photo',
    kind: 'soft',
    label: '尽量拍摄极光',
    description: '在条件允许时优先安排极光观测',
    icon: Mountain,
  },
  {
    id: 'prefer_local_food',
    kind: 'soft',
    label: '优先当地美食',
    description: '排程时预留特色餐饮体验',
    icon: Utensils,
  },
  {
    id: 'avoid_crowds',
    kind: 'soft',
    label: '避开人潮',
    description: '倾向错峰或小众景点',
    icon: Leaf,
  },
];

export function getVisibleConstraintTemplates(
  trip: TripDetail | null | undefined,
): ConstraintTemplate[] {
  const selfDrive = isSelfDrivePlanningTrip(trip);
  return CONSTRAINT_TEMPLATES.filter((t) => !t.requiresSelfDrive || selfDrive);
}

export function splitConstraintTemplates(templates: ConstraintTemplate[]) {
  return {
    hard: templates.filter((t) => t.kind === 'hard'),
    soft: templates.filter((t) => t.kind === 'soft'),
  };
}

/** 模板 id → 控制台列表项 id（legacy 弹窗类除外） */
export function resolveTemplateSelection(
  template: ConstraintTemplate,
): { mode: 'console'; constraintId: string } | { mode: 'legacy'; key: ConstraintPendingKey } {
  if (template.legacyKey) {
    return { mode: 'legacy', key: template.legacyKey };
  }
  return { mode: 'console', constraintId: template.id };
}

export function isSoftConstraintTemplateId(id: string): boolean {
  return CONSTRAINT_TEMPLATES.some((t) => t.kind === 'soft' && t.id === id);
}

export function getSoftConstraintTemplate(id: string): ConstraintTemplate | undefined {
  return CONSTRAINT_TEMPLATES.find((t) => t.kind === 'soft' && t.id === id);
}

export function getHardConstraintTemplate(id: string): ConstraintTemplate | undefined {
  return CONSTRAINT_TEMPLATES.find((t) => t.kind === 'hard' && t.id === id);
}

export function listSoftConstraintTemplates(
  trip: TripDetail | null | undefined,
): ConstraintTemplate[] {
  return getVisibleConstraintTemplates(trip).filter((t) => t.kind === 'soft');
}
