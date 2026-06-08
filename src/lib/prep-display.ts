import type { ChecklistItem, PrepPermit } from '@/types/trail';

export function prepItemLabel(item: ChecklistItem): string {
  return item.nameCN?.trim() || item.name;
}

export function prepPermitLabel(permit: PrepPermit): string {
  return permit.titleZh?.trim() || permit.nameCN?.trim() || permit.name?.trim() || '许可';
}

/** 准备页 checklist 分组标题 */
export const PREP_CATEGORY_LABELS: Record<string, string> = {
  gear: '装备',
  essential: '必需品',
  clothing: '衣物',
  safety: '安全',
  navigation: '导航',
  food: '食物',
  shelter: '庇护',
  documents: '证件',
  other: '其他',
};

export function prepCategoryLabel(category: string): string {
  return PREP_CATEGORY_LABELS[category] ?? category;
}
