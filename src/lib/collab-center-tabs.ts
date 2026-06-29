/** 团队协作中心子 Tab */
export const COLLAB_CENTER_TABS = [
  { value: 'members', label: '成员与角色' },
  { value: 'decisions', label: '协作决策' },
  { value: 'persona', label: '团队画像' },
  { value: 'wishes', label: '私密想法' },
  { value: 'tasks', label: '任务分工' },
] as const;

export type CollabCenterTab = (typeof COLLAB_CENTER_TABS)[number]['value'];

const COLLAB_TAB_SET = new Set<string>(COLLAB_CENTER_TABS.map((t) => t.value));

export function resolveCollabCenterTab(param: string | null): CollabCenterTab {
  if (param && COLLAB_TAB_SET.has(param)) {
    return param as CollabCenterTab;
  }
  return 'members';
}

export function collabCenterTabLabel(tab: CollabCenterTab): string {
  return COLLAB_CENTER_TABS.find((t) => t.value === tab)?.label ?? tab;
}
