import type {
  PlanDiffChangeRow,
  PlanDiffScopeChip,
  PlanDiffTimelineTrack,
  PlanDiffView,
} from '@/lib/decision-space-plan-diff-view.util';

/** 设计稿 · 计划差异 Tab 占位（BFF 未返回时预览布局） */
export const PLAN_DIFF_TAB_FIXTURE: PlanDiffView = {
  optionLetter: 'A',
  optionTitle: '提前 20 分钟离开蓝湖',
  isDemo: true,
  isEmpty: false,
  changes: [
    {
      id: 'c1',
      label: '蓝湖结束时间',
      before: '10:45',
      after: '10:25',
      delta: '-20 分钟',
      deltaTone: 'good',
    },
    {
      id: 'c2',
      label: '出发时间',
      before: '10:50',
      after: '10:30',
      delta: '-20 分钟',
      deltaTone: 'good',
    },
    {
      id: 'c3',
      label: '抵达教堂',
      before: '11:37',
      after: '11:17',
      delta: '-20 分钟',
      deltaTone: 'good',
    },
    {
      id: 'c4',
      label: '交通缓冲',
      before: '-17 分钟',
      after: '+3 分钟',
      delta: '+20 分钟',
      deltaTone: 'good',
    },
  ],
  scopeChips: [
    { id: 's1', label: '修改 3 个时间点', tone: 'good' },
    { id: 's2', label: '重算 2 段路线', tone: 'good' },
    { id: 's3', label: '影响 1 位成员', tone: 'neutral' },
    { id: 's4', label: '预约不变', tone: 'neutral' },
    { id: 's5', label: '预算不变', tone: 'neutral' },
  ],
  unchangedItems: [
    '午餐预约保持 12:40',
    '后续地点不删改',
    '酒店与预算不受影响',
  ],
  timelines: [
    {
      variant: 'original',
      label: '原计划',
      nodes: [
        { id: 'o1', label: '蓝湖（结束）', time: '10:45', durationAfterMinutes: 5 },
        { id: 'o2', label: '出发', time: '10:50', durationAfterMinutes: 47 },
        { id: 'o3', label: '抵达教堂', time: '11:37', durationAfterMinutes: 63 },
        { id: 'o4', label: '午餐', time: '12:40' },
      ],
    },
    {
      variant: 'proposed',
      label: '新计划（方案 A）',
      nodes: [
        { id: 'n1', label: '蓝湖（结束）', time: '10:25', durationAfterMinutes: 5 },
        { id: 'n2', label: '出发', time: '10:30', durationAfterMinutes: 47 },
        { id: 'n3', label: '抵达教堂', time: '11:17', durationAfterMinutes: 83 },
        { id: 'n4', label: '午餐', time: '12:40' },
      ],
    },
  ],
  summaryLine: '总计节省 20 分钟缓冲，交通缓冲由 -17 分钟 → +3 分钟',
};

export type FeasibilityGateCheckStatus = 'pass' | 'warn' | 'fail';

export interface FeasibilityGateCheckView {
  id: string;
  label: string;
  status: FeasibilityGateCheckStatus;
}

export interface FeasibilityTabView {
  optionLetter: string;
  optionTitle: string;
  canWrite: boolean;
  headline?: string;
  gateChecks: FeasibilityGateCheckView[];
  validUntilLabel?: string;
  validityHint?: string;
  executionSummary: Array<{ id: string; label: string; value: string }>;
  finalConclusion: string;
  finalSubtext: string;
  isDemo?: boolean;
}

export const FEASIBILITY_TAB_FIXTURE: FeasibilityTabView = {
  optionLetter: 'A',
  optionTitle: '提前 20 分钟离开起点',
  canWrite: true,
  isDemo: true,
  gateChecks: [
    { id: 'time', label: '时间冲突', status: 'pass' },
    { id: 'hours', label: '营业时间', status: 'pass' },
    { id: 'booking', label: '预约影响', status: 'pass' },
    { id: 'driving', label: '驾驶与休息限制', status: 'pass' },
    { id: 'member', label: '成员硬约束', status: 'pass' },
    { id: 'freshness', label: '数据新鲜度', status: 'pass' },
  ],
  validUntilLabel: '今天 18:00',
  validityHint: '若道路耗时超过 52 分钟，将重新触发决策。',
  executionSummary: [
    { id: 'time', label: '更新时间点', value: '3 个' },
    { id: 'route', label: '重算路线段', value: '2 段' },
    { id: 'notify', label: '通知成员', value: '1 位' },
  ],
  finalConclusion: '最终结论：可执行',
  finalSubtext: '风险可控，满足所有约束与门禁条件。',
};

export interface MemberConsensusItemView {
  id: string;
  name: string;
  stance: 'support' | 'neutral' | 'concern';
  stanceLabel: string;
  summary: string;
  inferred?: boolean;
}

export interface MembersConsensusTabView {
  optionLetter: string;
  consensusLabel: string;
  consensusSummary: string;
  supportCount: number;
  totalCount: number;
  members: MemberConsensusItemView[];
  aiNote?: string;
  isDemo?: boolean;
}

export const MEMBERS_CONSENSUS_TAB_FIXTURE: MembersConsensusTabView = {
  optionLetter: 'A',
  consensusLabel: '倾向一致',
  consensusSummary: '1 位成员对提前出发无硬性反对；午餐预约为共同硬约束。',
  supportCount: 1,
  totalCount: 1,
  isDemo: true,
  members: [
    {
      id: 'm1',
      name: '成员 A',
      stance: 'support',
      stanceLabel: '可接受',
      summary: '可接受缩短蓝湖停留，优先保证午餐 12:40 与教堂到达。',
    },
  ],
  aiNote: 'AI 已合并成员偏好与硬约束；无需要全员投票的冲突项。',
};

export type { PlanDiffChangeRow, PlanDiffScopeChip, PlanDiffTimelineTrack, PlanDiffView };
