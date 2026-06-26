import type { PipelineStage } from '@/types/trip';

export type PlanStudioPipelineAction =
  | { type: 'tab'; tab: 'schedule' | 'budget' | 'tasks' | 'coverage' }
  | { type: 'intent' }
  | { type: 'regenerate' }
  | { type: 'external'; path: string };

/** 规划工作台内：Pipeline 阶段 → 可执行跳转（与 dashboard PipelineSection 对齐，stage 6 走本页 Tab） */
export function getPlanStudioPipelineStageAction(
  stage: PipelineStage,
  tripId: string,
): PlanStudioPipelineAction | null {
  switch (stage.id) {
    case '1':
      return { type: 'intent' };
    case '2':
    case '3':
      return { type: 'tab', tab: 'schedule' };
    case '4':
      return { type: 'external', path: `/dashboard/trips/${tripId}/decision` };
    case '5':
      return { type: 'external', path: `/dashboard/trips/what-if?tripId=${encodeURIComponent(tripId)}` };
    case '6':
      return { type: 'tab', tab: 'tasks' };
    default:
      break;
  }

  const name = stage.name ?? '';
  if (name.includes('行前准备')) return { type: 'tab', tab: 'tasks' };
  if (name.includes('日程') || name.includes('方案') || name.includes('路线')) {
    return { type: 'tab', tab: 'schedule' };
  }
  if (name.includes('预算')) return { type: 'tab', tab: 'budget' };
  return null;
}

export function pipelineStageActionLabel(action: PlanStudioPipelineAction): string {
  switch (action.type) {
    case 'tab':
      if (action.tab === 'tasks') return '打开行前准备';
      if (action.tab === 'schedule') return '打开时间轴';
      if (action.tab === 'budget') return '打开预算管理';
      if (action.tab === 'coverage') return '打开路线覆盖';
      return '前往';
    case 'intent':
      return '调整约束';
    case 'regenerate':
      return '重新生成方案';
    case 'external':
      return '前往详情页';
  }
}
