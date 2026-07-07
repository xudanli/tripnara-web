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

const GATE_STATUS_SURFACE = 'bg-card text-foreground border-border';
const GATE_STATUS_SUBTLE_SURFACE = 'bg-muted/30 text-foreground border-border/70';

/**
 * 将旧的状态映射到新的标准状态
 */
export function normalizeGateStatus(status: string): GateStatus {
  const upper = status.toUpperCase().trim();

  if (upper === 'PASSED' || upper === 'PASS' || upper === 'ALLOW') {
    return 'ALLOW';
  }

  if (upper === 'WARN' || upper === 'NEED_CONFIRM' || upper === 'NEED_CONFIRMATION') {
    return 'NEED_CONFIRM';
  }

  if (upper === 'BLOCKED' || upper === 'BLOCK' || upper === 'REJECT') {
    return 'REJECT';
  }

  if (upper === 'SUGGEST_REPLACE' || upper === 'REPLACE' || upper === 'ADJUST') {
    return 'SUGGEST_REPLACE';
  }

  return 'NEED_CONFIRM';
}

/** 裁决 Icon 语义色（仅 Icon / 小圆点） */
export function getGateStatusIconClass(status: GateStatus): string {
  switch (status) {
    case 'ALLOW':
      return 'text-success';
    case 'NEED_CONFIRM':
      return 'text-warning';
    case 'SUGGEST_REPLACE':
      return 'text-muted-foreground';
    case 'REJECT':
      return 'text-error';
  }
}

export function getGateStatusSubtleClasses(_status: GateStatus): string {
  return GATE_STATUS_SUBTLE_SURFACE;
}

export function getGateStatusClasses(_status: GateStatus): string {
  return GATE_STATUS_SURFACE;
}

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

export interface GateStatusConfig {
  status: GateStatus;
  icon: LucideIcon;
  label: string;
  labelEn: string;
  className: string;
  iconClassName: string;
}

export function getGateStatusConfig(status: GateStatus): GateStatusConfig {
  return {
    status,
    icon: getGateStatusIcon(status),
    label: getGateStatusLabel(status),
    labelEn: getGateStatusLabelEn(status),
    className: getGateStatusClasses(status),
    iconClassName: getGateStatusIconClass(status),
  };
}
