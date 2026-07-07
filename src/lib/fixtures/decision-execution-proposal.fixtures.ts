import type { DecisionContextFact } from '@/lib/decision-context-capsule.util';
import type { DecisionProposalOptionView } from '@/lib/decision-proposal-option-view.util';

/** 设计稿 · 第 1 天蓝湖→教堂缓冲不足场景（开发预览） */
export const DECISION_EXECUTION_PROPOSAL_FIXTURE = {
  whatHappened:
    '第 1 天：蓝湖结束 → 教堂 路程预估偏短（约 68.6 km）→ 预计需 47 分钟，出发缓冲仅剩 30 分钟。',
  basisFacts: [
    { id: 'road', label: '道路预计耗时', text: '47 分钟', kind: 'predicted' as const },
    { id: 'buffer', label: '预计缓冲', text: '30 分钟', kind: 'confirmed' as const },
    { id: 'stay', label: '渲染时段', text: '2 小时', kind: 'confirmed' as const },
    { id: 'church', label: '教堂预定', text: '无预定', kind: 'confirmed' as const },
    { id: 'lunch', label: '午餐预定', text: '12:40', kind: 'confirmed' as const },
    { id: 'valid', label: '数据有效期', text: '今日 18:00', kind: 'confirmed' as const },
  ] satisfies DecisionContextFact[],
  basisHint: '（以下因素均已纳入模型综合评估）',
  options: [
    {
      id: 'opt-a',
      badge: '方案 A',
      letter: 'A',
      tone: 'recommended',
      recommended: true,
      kindLabel: '提前出发',
      title: '提前 20 分钟离开蓝湖',
      description: '将蓝湖停留缩短 20 分钟，重算路线后保守到达。',
      outcomeItems: [
        { text: '经调整交通缓冲后，预计到达教堂时间安全', tone: 'good' },
        { text: '午餐预定不受影响', tone: 'good' },
        { text: '交通缓冲余量提升至 +17 分钟', tone: 'good' },
      ],
      costItems: [
        { text: '蓝湖停留由 1 小时 40 分缩短至 1 小时 20 分', tone: 'caution' },
      ],
      dataBasis: [
        { iconKey: 'time', label: '修改 3 个时间点' },
        { iconKey: 'route', label: '重算 2 段路线' },
        { iconKey: 'member', label: '影响 1 名成员' },
      ],
      outcomes: [],
      costs: [],
      impactScope: {},
    },
    {
      id: 'opt-b',
      badge: '方案 B',
      letter: 'B',
      tone: 'neutral',
      kindLabel: '压缩行程',
      title: '压缩行程整体缩短 17 分钟',
      description: '保持蓝湖停留不变，压缩行程中其他停留时段。',
      outcomeItems: [
        { text: '到达预定时间保持不变', tone: 'good' },
        { text: '午餐仍保持 11:52', tone: 'good' },
        { text: '下午缓冲由 31 分钟变为 14 分钟', tone: 'good' },
      ],
      costItems: [
        { text: '风险前移至午餐前时段', tone: 'caution' },
        { text: '压缩后体验偏紧', tone: 'caution' },
      ],
      dataBasis: [
        { iconKey: 'time', label: '修改 3 个时间点' },
        { iconKey: 'member', label: '影响 1 名成员' },
        { iconKey: 'no_route', label: '不重算路线' },
      ],
      outcomes: [],
      costs: [],
      impactScope: {},
    },
    {
      id: 'opt-c',
      badge: '方案 C',
      letter: 'C',
      tone: 'risky',
      kindLabel: '保持原计划',
      title: '取消当前计划',
      description: '不做调整，将风险后移至后续时段。',
      outcomeItems: [
        { text: '不做任何调整', tone: 'good' },
        { text: '预计 18:36 到达教堂', tone: 'good' },
        { text: 'AI 模型监测到交通延误风险', tone: 'good' },
      ],
      costItems: [
        { text: '午餐可能无法按时', tone: 'risk' },
        { text: '后续行程将累积延误风险', tone: 'risk' },
      ],
      dataBasis: [
        { iconKey: 'time', label: '修改 1 个时间点' },
        { iconKey: 'no_route', label: '不重算路线' },
        { iconKey: 'risk', label: '风险较高' },
      ],
      outcomes: [],
      costs: [],
      impactScope: {},
    },
  ] satisfies DecisionProposalOptionView[],
};
