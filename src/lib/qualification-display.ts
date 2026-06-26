import type { QualificationType } from '@/types/identity-governance';

export const QUALIFICATION_TYPE_OPTIONS: Array<{ value: QualificationType; label: string }> = [
  { value: 'FIRST_AID', label: '急救 / 野外急救' },
  { value: 'OUTDOOR_GUIDE', label: '户外向导' },
  { value: 'SKI_INSTRUCTOR', label: '滑雪教练' },
  { value: 'DIVING_INSTRUCTOR', label: '潜水教练' },
  { value: 'MOUNTAINEERING', label: '登山 / 攀岩' },
  { value: 'WILDERNESS_FIRST_RESPONDER', label: '野外医疗响应' },
];

export function qualificationTypeLabel(type: QualificationType): string {
  return QUALIFICATION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '审核中',
  VERIFIED: '已验证',
  REJECTED: '未通过',
  EXPIRED: '已过期',
  REVOKED: '已撤销',
};

export function qualificationStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
