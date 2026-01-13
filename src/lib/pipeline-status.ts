/**
 * Pipeline 状态系统工具函数
 * 
 * 统一管理规划工作台的 Pipeline 状态：
 * - completed: 已完成 → ALLOW
 * - in-progress: 进行中 → NEED_CONFIRM
 * - risk: 有风险 → SUGGEST_REPLACE
 * - pending: 待处理 → REJECT (默认)
 */

import type { GateStatus } from './gate-status';
import {
  getGateStatusIcon,
  getGateStatusClasses,
} from './gate-status';

/**
 * Pipeline 阶段状态类型
 */
export type PipelineStageStatus = 'completed' | 'in-progress' | 'risk' | 'pending';

/**
 * 将 Pipeline 状态映射到决策状态
 * 
 * @param stageStatus Pipeline 阶段状态
 * @returns 对应的决策状态
 */
export function mapPipelineStatusToGateStatus(stageStatus: PipelineStageStatus): GateStatus {
  switch (stageStatus) {
    case 'completed':
      return 'ALLOW';
    case 'in-progress':
      return 'NEED_CONFIRM';
    case 'risk':
      return 'SUGGEST_REPLACE';
    case 'pending':
    default:
      return 'REJECT';
  }
}

/**
 * 获取 Pipeline 状态样式类名（使用设计 Token）
 * 
 * @param stageStatus Pipeline 阶段状态
 * @returns Tailwind 类名字符串
 */
export function getPipelineStatusClasses(stageStatus: PipelineStageStatus): string {
  const gateStatus = mapPipelineStatusToGateStatus(stageStatus);
  return getGateStatusClasses(gateStatus);
}

/**
 * 获取 Pipeline 状态图标组件
 * 
 * @param stageStatus Pipeline 阶段状态
 * @returns Lucide 图标组件
 */
export function getPipelineStatusIcon(stageStatus: PipelineStageStatus) {
  const gateStatus = mapPipelineStatusToGateStatus(stageStatus);
  return getGateStatusIcon(gateStatus);
}

/**
 * 获取 Pipeline 状态标签文本（中文）
 * 
 * @param stageStatus Pipeline 阶段状态
 * @returns 状态标签文本
 */
export function getPipelineStatusLabel(stageStatus: PipelineStageStatus): string {
  switch (stageStatus) {
    case 'completed':
      return '已完成';
    case 'in-progress':
      return '进行中';
    case 'risk':
      return '有风险';
    case 'pending':
    default:
      return '待处理';
  }
}

/**
 * 获取 Pipeline 进度条颜色类名
 * 
 * @param stageStatus Pipeline 阶段状态
 * @returns Tailwind 类名字符串（仅背景色）
 */
export function getPipelineProgressColor(stageStatus: PipelineStageStatus): string {
  const gateStatus = mapPipelineStatusToGateStatus(stageStatus);
  // 使用决策状态的背景色，但只取背景部分
  const classes = getGateStatusClasses(gateStatus);
  // 提取 bg- 开头的类名
  const bgClass = classes.split(' ').find(cls => cls.startsWith('bg-'));
  return bgClass || 'bg-gray-500';
}

/**
 * 获取 Pipeline 整体状态（基于多个阶段）
 * 
 * @param stages Pipeline 阶段列表
 * @returns 整体状态
 */
export function getOverallPipelineStatus(
  stages: Array<{ status: PipelineStageStatus }>
): GateStatus {
  const riskStages = stages.filter(s => s.status === 'risk').length;
  const inProgressStages = stages.filter(s => s.status === 'in-progress').length;
  const completedStages = stages.filter(s => s.status === 'completed').length;
  
  // 优先级：risk > in-progress > completed
  if (riskStages > 0) {
    return 'SUGGEST_REPLACE';
  }
  if (inProgressStages > 0) {
    return 'NEED_CONFIRM';
  }
  if (completedStages === stages.length) {
    return 'ALLOW';
  }
  return 'REJECT';
}
