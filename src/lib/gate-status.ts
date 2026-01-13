/**
 * 决策状态系统工具函数
 * 
 * 统一管理 TripNARA 的四态裁决系统：
 * - ALLOW: 通过
 * - NEED_CONFIRM: 需确认
 * - SUGGEST_REPLACE: 建议替换
 * - REJECT: 拒绝
 */

import { CheckCircle2, AlertCircle, ArrowRight, XCircle, type LucideIcon } from 'lucide-react';

/**
 * 标准决策状态类型
 */
export type GateStatus = 'ALLOW' | 'NEED_CONFIRM' | 'SUGGEST_REPLACE' | 'REJECT';

/**
 * 旧的状态类型（需要映射到新状态）
 */
export type LegacyGateStatus = 'PASSED' | 'PASS' | 'WARN' | 'BLOCKED' | 'BLOCK' | 'ADJUST' | 'REPLACE';

/**
 * 将旧的状态映射到新的标准状态
 * 
 * @param status 旧的状态字符串
 * @returns 标准化的 GateStatus
 */
export function normalizeGateStatus(status: string): GateStatus {
  const upper = status.toUpperCase().trim();
  
  // 映射到 ALLOW
  if (upper === 'PASSED' || upper === 'PASS' || upper === 'ALLOW') {
    return 'ALLOW';
  }
  
  // 映射到 NEED_CONFIRM
  if (upper === 'WARN' || upper === 'NEED_CONFIRM' || upper === 'NEED_CONFIRMATION') {
    return 'NEED_CONFIRM';
  }
  
  // 映射到 REJECT
  if (upper === 'BLOCKED' || upper === 'BLOCK' || upper === 'REJECT') {
    return 'REJECT';
  }
  
  // 映射到 SUGGEST_REPLACE
  if (upper === 'SUGGEST_REPLACE' || upper === 'REPLACE' || upper === 'ADJUST') {
    return 'SUGGEST_REPLACE';
  }
  
  // 默认返回 NEED_CONFIRM（最安全的选择）
  return 'NEED_CONFIRM';
}

/**
 * 获取状态样式类名（使用设计 Token）
 * 
 * @param status 决策状态
 * @returns Tailwind 类名字符串
 */
export function getGateStatusClasses(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return 'bg-gate-allow text-gate-allow-foreground border-gate-allow-border';
    case 'NEED_CONFIRM':
      return 'bg-gate-confirm text-gate-confirm-foreground border-gate-confirm-border';
    case 'SUGGEST_REPLACE':
      return 'bg-gate-suggest text-gate-suggest-foreground border-gate-suggest-border';
    case 'REJECT':
      return 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border';
  }
}

/**
 * 获取状态图标组件
 * 
 * @param status 决策状态
 * @returns Lucide 图标组件
 */
export function getGateStatusIcon(status: GateStatus): LucideIcon {
  switch (status) {
    case 'ALLOW':
      return CheckCircle2;
    case 'NEED_CONFIRM':
      return AlertCircle;
    case 'SUGGEST_REPLACE':
      return ArrowRight;
    case 'REJECT':
      return XCircle;
  }
}

/**
 * 获取状态标签文本（中文）
 * 
 * @param status 决策状态
 * @returns 状态标签文本
 */
export function getGateStatusLabel(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return '通过';
    case 'NEED_CONFIRM':
      return '需确认';
    case 'SUGGEST_REPLACE':
      return '建议替换';
    case 'REJECT':
      return '拒绝';
  }
}

/**
 * 获取状态标签文本（英文）
 * 
 * @param status 决策状态
 * @returns 状态标签文本（英文）
 */
export function getGateStatusLabelEn(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return 'Allow';
    case 'NEED_CONFIRM':
      return 'Need Confirm';
    case 'SUGGEST_REPLACE':
      return 'Suggest Replace';
    case 'REJECT':
      return 'Reject';
  }
}

/**
 * 状态配置对象（包含所有信息）
 */
export interface GateStatusConfig {
  status: GateStatus;
  icon: LucideIcon;
  label: string;
  labelEn: string;
  className: string;
}

/**
 * 获取完整的状态配置
 * 
 * @param status 决策状态
 * @returns 完整的状态配置对象
 */
export function getGateStatusConfig(status: GateStatus): GateStatusConfig {
  return {
    status,
    icon: getGateStatusIcon(status),
    label: getGateStatusLabel(status),
    labelEn: getGateStatusLabelEn(status),
    className: getGateStatusClasses(status),
  };
}
