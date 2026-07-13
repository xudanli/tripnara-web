/** 团队协作中心子 Tab */
export const COLLAB_CENTER_TABS = [
  { value: 'members', label: '团队与需求' },
  { value: 'invites', label: '成员邀请' },
  { value: 'decisions', label: '协作决策' },
  { value: 'persona', label: '团队画像' },
  { value: 'wishes', label: '私密想法' },
  { value: 'tasks', label: '任务分工' },
] as const;

/** Tab 职责说明（P0：避免需求问卷 vs 决策画像混淆） */
export const COLLAB_TAB_SCOPE_COPY = {
  members:
    '本页聚焦行前需求问卷：收集愿望、限制、节奏与预算等可执行信息，并追踪填写进度与团队需求差异。',
  persona:
    '本页聚焦决策协作画像：基于 Travel Style / Money DNA 测评，分析合拍度、摩擦与分摊共识，与行前需求问卷相互独立。',
} as const;

export interface CollabCenterTabDef {
  value: CollabCenterTab;
  label: string;
}

/** 顾问制：需求画像 + 角色邀请 + 投票（不含画像问卷 / 私密想法 / 领域协商） */
export const ADVISOR_LED_COLLAB_TABS: readonly CollabCenterTabDef[] = [
  { value: 'members', label: '团队与需求' },
  { value: 'invites', label: '角色邀请' },
  { value: 'decisions', label: '团队投票' },
];

export type CollabCenterTab = (typeof COLLAB_CENTER_TABS)[number]['value'];

const COLLAB_TAB_SET = new Set<string>(COLLAB_CENTER_TABS.map((t) => t.value));

export function resolveCollabCenterTab(param: string | null): CollabCenterTab {
  if (param && COLLAB_TAB_SET.has(param)) {
    return param as CollabCenterTab;
  }
  return 'members';
}

export function collabCenterTabLabel(tab: CollabCenterTab): string {
  return (
    COLLAB_CENTER_TABS.find((t) => t.value === tab)?.label ??
    ADVISOR_LED_COLLAB_TABS.find((t) => t.value === tab)?.label ??
    tab
  );
}
