/**
 * 决策日志格式迁移工具
 * 
 * 用于在新旧格式之间转换决策日志，支持向后兼容
 */

import type { DecisionLogEntry, DecisionLogItem, OrchestrationStep, SubAgentType, GuardianType } from '@/api/agent';

/**
 * 将新格式转换为旧格式（兼容现有代码）
 */
export function toLegacyFormat(entry: DecisionLogEntry): DecisionLogItem {
  // 将 step 从字符串转换为数字（基于步骤顺序）
  const stepMap: Record<OrchestrationStep, number> = {
    'INTAKE': 1,
    'RESEARCH': 2,
    'GATE_EVAL': 3,
    'PLAN_GEN': 4,
    'VERIFY': 5,
    'REPAIR': 6,
    'NARRATE': 7,
    'DONE': 8,
    'FAILED': 9,
  };

  return {
    step: stepMap[entry.step] || 0,
    chosen_action: entry.outputs_summary || entry.actor,
    reason_code: entry.inputs_summary,
    confidence: entry.metadata?.cost_est_usd ? 1 - (entry.metadata.cost_est_usd / 100) : undefined,
    facts: {
      actor: entry.actor,
      evidence_refs: entry.evidence_refs,
      ...entry.metadata,
    },
    policy_id: entry.metadata?.guardian,
  };
}

/**
 * 将旧格式转换为新格式（迁移工具）
 */
export function fromLegacyFormat(
  legacyEntry: DecisionLogItem,
  requestId: string
): DecisionLogEntry {
  // 将数字步骤转换为字符串步骤
  const stepMap: Record<number, OrchestrationStep> = {
    1: 'INTAKE',
    2: 'RESEARCH',
    3: 'GATE_EVAL',
    4: 'PLAN_GEN',
    5: 'VERIFY',
    6: 'REPAIR',
    7: 'NARRATE',
    8: 'DONE',
    9: 'FAILED',
  };

  const step = stepMap[legacyEntry.step] || 'INTAKE';
  
  // 尝试从 facts 中提取信息
  const facts = legacyEntry.facts || {};
  const actor = (facts.actor as SubAgentType) || 'Orchestrator';
  const evidenceRefs = (facts.evidence_refs as string[]) || [];
  const guardian = (facts.policy_id as GuardianType) || (legacyEntry.policy_id as GuardianType);

  return {
    request_id: requestId,
    step,
    actor,
    inputs_summary: legacyEntry.reason_code || legacyEntry.chosen_action || '',
    outputs_summary: legacyEntry.chosen_action || '',
    evidence_refs: evidenceRefs,
    timestamp: new Date().toISOString(),
    metadata: {
      ...facts,
      guardian,
      confidence: legacyEntry.confidence,
    },
  };
}

/**
 * 批量转换为旧格式
 */
export function batchToLegacyFormat(entries: DecisionLogEntry[]): DecisionLogItem[] {
  return entries.map(toLegacyFormat);
}

/**
 * 批量转换为新格式
 */
export function batchFromLegacyFormat(
  legacyEntries: DecisionLogItem[],
  requestId: string
): DecisionLogEntry[] {
  return legacyEntries.map(entry => fromLegacyFormat(entry, requestId));
}

/**
 * 自动检测格式并统一转换为新格式
 */
export function normalizeToNewFormat(
  entry: DecisionLogEntry | DecisionLogItem,
  requestId: string
): DecisionLogEntry {
  // 检查是否是新格式（有 request_id 和 step 是字符串）
  if ('request_id' in entry && typeof entry.step === 'string') {
    return entry as DecisionLogEntry;
  }
  
  // 否则是旧格式，转换
  return fromLegacyFormat(entry as DecisionLogItem, requestId);
}

/**
 * 批量规范化
 */
export function batchNormalizeToNewFormat(
  entries: (DecisionLogEntry | DecisionLogItem)[],
  requestId: string
): DecisionLogEntry[] {
  return entries.map(entry => normalizeToNewFormat(entry, requestId));
}
