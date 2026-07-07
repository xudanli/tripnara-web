import type { TravelContextViewName } from '@/travel-context/domain/travel-context.constants';

const VIEW_LABELS: Record<TravelContextViewName, string> = {
  overview: '行程概览',
  exploration: '探索方案',
  plan: '有效行程',
  decisions: '待你决定',
  monitoring: '监控告警',
  participants: '同行者',
  feasibility: '可行性检查',
  assistant: 'AI 助手',
};

export function resolveContextViewLabel(view: TravelContextViewName | string): string {
  return VIEW_LABELS[view as TravelContextViewName] ?? view;
}

export function formatContextDiffSummary(input: {
  fromRevision: number;
  toRevision: number;
  changedViews?: TravelContextViewName[];
}): string {
  const { fromRevision, toRevision, changedViews } = input;
  if (!changedViews?.length) {
    return `版本 v${fromRevision} → v${toRevision}`;
  }
  const labels = changedViews.map(resolveContextViewLabel).join('、');
  return `版本 v${fromRevision} → v${toRevision} · 更新了 ${labels}`;
}
