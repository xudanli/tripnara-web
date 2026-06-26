import type { Gate1OutcomeStatus } from '@/types/gate1';

export function gate1OutcomeStatusLabel(status: Gate1OutcomeStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return '已提交';
    case 'PENDING':
      return '待提交';
    default:
      return status;
  }
}

export function gate1RuntimeReadModelSourceLabel(
  source: 'gate1' | 'projection_hybrid' | 'projection_fallback',
): string {
  switch (source) {
    case 'gate1':
      return 'Gate1 表';
    case 'projection_hybrid':
      return '投影混合（对账一致）';
    case 'projection_fallback':
      return '投影回退（对账失败）';
    default:
      return source;
  }
}
