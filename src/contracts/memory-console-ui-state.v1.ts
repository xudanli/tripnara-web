/**
 * Memory Console UI 状态映射（v1）
 * 可与后端 `deriveMemoryConsoleUiStateV1` 对齐；前端 port。
 */
import type { MemoryConsoleV1Response } from '@/features/memory/types/memory-console.v1';
import type { MemoryContractConstraintSink } from '@/features/route-and-run/types/observability';

export const MEMORY_CONSOLE_UI_DEFAULT_ZH = {
  page_title: '我的旅行记忆',
  section_l1_title: '长期偏好',
  section_l1_edit: '编辑',
  section_l1_clear: '清空',
  section_l1_clear_confirm:
    '这将清空 AI 记住的长期旅行偏好，不会影响当前对话。',
  section_l0_title: '基础资料',
  section_l0_delete_field: '删除',
  section_l2_title: '近期决策',
  section_l2_readonly_hint: '来自近期规划会话摘要',
  section_l2_delete: '删除',
  section_l2_delete_confirm: '删除后，AI 将不再参考这条路线决策记录。',
  section_l2_deleted_toast: '已删除',
  section_trip_patches_title: '本行程偏好更新',
  section_trip_patches_delete_confirm:
    '删除后，后续规划将不再自动应用这条偏好更新。',
  section_export_title: '导出数据',
  section_export_button: '导出 JSON',
  section_decision_ledger_causality_title: '决策账本关联',
  section_decision_ledger_link_row: 'Ledger 节点 → 用户决策',
  gate_sink_anchor_label: '依据：对话偏好',
  gate_sink_hydrate_hint: '记忆约束已注入本次规划',
  gate_sink_override_hint: '本次请求覆盖了部分记忆偏好',
  drawer_memory_tab: '记忆依据',
  applied_key_labels: {
    destination: '目的地',
    pace: '节奏',
    guardian_debate_intent_hint: '门控意图',
    budget: '预算',
    accommodation: '住宿',
    travel_mode: '出行方式',
  } as Record<string, string>,
} as const;

export type MemoryConsoleSectionId =
  | 'l1'
  | 'l0'
  | 'l2'
  | 'trip_patches'
  | 'decision_ledger_causality'
  | 'export';

export type MemoryConsoleUiSection = {
  id: MemoryConsoleSectionId;
  title_zh: string;
  visible: boolean;
  badge_count?: number;
};

export type MemoryConsoleUiStateV1 = {
  sections: MemoryConsoleUiSection[];
  trip_patches_count: number;
  has_l1: boolean;
  has_l0: boolean;
  has_l2: boolean;
};

export type ConstraintSinkUiAnchorV1 = {
  label_zh: string;
  applied_keys: string[];
  patch_ids: string[];
  overridden_by_request_keys: string[];
  drawer_tab: 'memory';
  hydrate_hint_zh?: string;
  override_hint_zh?: string;
};

const L0_FIELD_LABELS: Record<string, string> = {
  nationality: '国籍',
  residency_country: '居住国',
  dietary_restrictions: '饮食禁忌',
  preferred_attraction_types: '景点类型偏好',
  tags: '旅行者标签',
};

export function l0FieldLabelZh(key: string): string {
  return L0_FIELD_LABELS[key] ?? key;
}

export function appliedKeyLabelZh(key: string): string {
  return MEMORY_CONSOLE_UI_DEFAULT_ZH.applied_key_labels[key] ?? key;
}

export function deriveMemoryConsoleUiStateV1(
  payload: MemoryConsoleV1Response | null | undefined
): MemoryConsoleUiStateV1 {
  const l1 = payload?.l1;
  const l0 = payload?.l0;
  const l2 = payload?.l2 ?? payload?.l2_recent ?? [];
  const tripPatches = payload?.trip?.constraint_patches ?? [];
  const tripId = payload?.trip?.trip_id ?? payload?.decision_ledger_causality?.trip_id;
  const ledgerLinks = payload?.decision_ledger_causality?.links ?? [];

  const hasL1 = Boolean(l1 && Object.keys(l1).filter((k) => k !== 'client_acknowledged').length > 0);
  const hasL0 = Boolean(l0 && Object.keys(l0).length > 0);
  const hasL2 = l2.length > 0;
  const showTripPatches = Boolean(tripId && tripPatches.length >= 0);
  const showLedgerCausality = ledgerLinks.length > 0;

  const sections: MemoryConsoleUiSection[] = [
    {
      id: 'l1',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l1_title,
      visible: true,
    },
    {
      id: 'l0',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l0_title,
      visible: true,
    },
    {
      id: 'l2',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_title,
      visible: true,
      badge_count: l2.length || undefined,
    },
    {
      id: 'trip_patches',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_trip_patches_title,
      visible: showTripPatches,
      badge_count: tripPatches.length || undefined,
    },
    {
      id: 'decision_ledger_causality',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_decision_ledger_causality_title,
      visible: showLedgerCausality,
      badge_count: ledgerLinks.length || undefined,
    },
    {
      id: 'export',
      title_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.section_export_title,
      visible: true,
    },
  ];

  return {
    sections: sections.filter((s) => s.visible),
    trip_patches_count: tripPatches.length,
    has_l1: hasL1,
    has_l0: hasL0,
    has_l2: hasL2,
  };
}

export function deriveConstraintSinkUiAnchorV1(
  sink: MemoryContractConstraintSink | null | undefined
): ConstraintSinkUiAnchorV1 | null {
  if (!sink?.hydrated) return null;
  const appliedKeys = sink.applied_keys ?? [];
  const patchIds = sink.patch_ids ?? [];
  const overridden = sink.overridden_by_request_keys ?? [];
  if (appliedKeys.length === 0 && patchIds.length === 0 && overridden.length === 0) {
    return null;
  }

  return {
    label_zh: MEMORY_CONSOLE_UI_DEFAULT_ZH.gate_sink_anchor_label,
    applied_keys: appliedKeys,
    patch_ids: patchIds,
    overridden_by_request_keys: overridden,
    drawer_tab: 'memory',
    hydrate_hint_zh:
      appliedKeys.length > 0 ? MEMORY_CONSOLE_UI_DEFAULT_ZH.gate_sink_hydrate_hint : undefined,
    override_hint_zh:
      overridden.length > 0 ? MEMORY_CONSOLE_UI_DEFAULT_ZH.gate_sink_override_hint : undefined,
  };
}
