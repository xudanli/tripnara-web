import type { ReputationFacts } from '@/types/identity-governance';

export const REPUTATION_FACT_LABELS: Array<{
  key: keyof ReputationFacts;
  label: string;
  description?: string;
}> = [
  { key: 'projectsCompleted', label: '已完成项目', description: '成功履约并结束' },
  { key: 'projectsCancelledByProvider', label: '提供方取消', description: '由领队/机构主动取消' },
  { key: 'memberWithdrawals', label: '成员退出', description: '已批准成员主动退出' },
  { key: 'complaintsConfirmed', label: '投诉成立', description: '经平台核实' },
  { key: 'paymentDisputesUnresolved', label: '未解决支付争议', description: '商业项目相关' },
  { key: 'planBExecuted', label: 'Plan B 执行', description: '行程调整预案被启用' },
  { key: 'safetyIncidentsConfirmed', label: '安全事件', description: '经核实安全相关事件' },
];

export function formatReputationFactValue(
  key: keyof ReputationFacts,
  facts: ReputationFacts
): string {
  const value = facts[key];
  if (key === 'lastProjectCompletedAt') {
    if (!value || typeof value !== 'string') return '—';
    try {
      return new Date(value).toLocaleDateString('zh-CN');
    } catch {
      return value;
    }
  }
  return String(value ?? 0);
}
