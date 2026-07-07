import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  BookOpen,
  Clock3,
  CloudSun,
  MapPin,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type {
  DecisionCheckerEvidenceKind,
  DecisionCheckerImpactDto,
  DecisionCheckerLabeledTone,
} from '@/types/decision-checker';

export interface DecisionCheckerImpactPreviewRow {
  id: string;
  label: string;
  value: string;
  tone?: DecisionCheckerLabeledTone;
  icon: LucideIcon;
}

export function formatRepairPlanDisplayTitle(title: string, optionLetter = 'A'): string {
  const trimmed = title.trim();
  if (/^方案\s*[A-ZＡ-Ｚ]/i.test(trimmed)) return trimmed;
  return `方案 ${optionLetter}：${trimmed}`;
}

export const EVIDENCE_KIND_LABEL: Record<DecisionCheckerEvidenceKind, string> = {
  route_engine: '路线引擎',
  historical_model: '历史模型',
  weather_road: '天气路况',
  inventory: '库存',
  opening_hours: '营业时间',
  persona_trace: '偏好轨迹',
  destination_knowledge: '目的地知识',
  other: '其他',
};

export function resolveEvidenceKindIcon(
  kind: DecisionCheckerEvidenceKind | string,
): LucideIcon {
  switch (kind) {
    case 'route_engine':
      return MapPin;
    case 'historical_model':
      return Clock3;
    case 'weather_road':
      return CloudSun;
    case 'opening_hours':
    case 'inventory':
      return Shield;
    case 'destination_knowledge':
      return BookOpen;
    default:
      return Sparkles;
  }
}

/** 概览 Tab · 影响摘要预览（最多 4 行） */
export function buildDecisionCheckerImpactPreviewRows(
  impact: DecisionCheckerImpactDto,
): DecisionCheckerImpactPreviewRow[] {
  const rows: DecisionCheckerImpactPreviewRow[] = [];
  const { summary, cascade } = impact;

  const pushRow = (
    id: string,
    label: string,
    value: string | undefined,
    icon: LucideIcon,
    tone?: DecisionCheckerLabeledTone,
  ) => {
    if (!value?.trim()) return;
    rows.push({ id, label, value: value.trim(), icon, tone });
  };

  for (const node of cascade) {
    if (rows.length >= 4) break;
    const value =
      node.status === 'ok'
        ? '正常'
        : node.status === 'at_risk'
          ? '有风险'
          : node.description?.trim() || '受影响';
    pushRow(`cascade-${node.id}`, node.title, value, ArrowRightLeft, node.status === 'ok' ? 'good' : 'warning');
  }

  pushRow(
    'budget',
    summary.budgetImpact?.label ?? '预算影响',
    summary.budgetImpact?.value,
    Wallet,
    summary.budgetImpact?.tone,
  );
  pushRow(
    'experience',
    summary.experienceCompletion?.label ?? '核心体验保留',
    summary.experienceCompletion?.value,
    Sparkles,
    summary.experienceCompletion?.tone,
  );
  pushRow(
    'days',
    summary.affectedDays?.label ?? '影响天数',
    summary.affectedDays?.value,
    MapPin,
    summary.affectedDays?.tone,
  );
  pushRow(
    'members',
    summary.affectedMembers?.label ?? '影响成员',
    summary.affectedMembers?.value,
    Shield,
    summary.affectedMembers?.tone,
  );

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.label}:${row.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}
