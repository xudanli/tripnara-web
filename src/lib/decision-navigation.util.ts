import type { DecisionAction } from '@/types/unified-decision';

/** BFF action projection — navigationTarget（FE-SSOT-4） */
export interface DecisionNavigationTarget {
  command?: string;
  params?: Record<string, unknown>;
  /** BOOK_NOW / 官方预订 — 结构化外链（P0） */
  externalUrl?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 解析 navigationTarget（字符串 JSON 或对象） */
export function parseDecisionNavigationTarget(
  raw: unknown,
): DecisionNavigationTarget | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        return parseDecisionNavigationTarget(JSON.parse(trimmed));
      } catch {
        return { command: trimmed };
      }
    }
    return { command: trimmed };
  }
  const record = asRecord(raw);
  if (!record) return null;
  const params = asRecord(record.params) ?? undefined;
  const externalUrl =
    typeof record.externalUrl === 'string'
      ? record.externalUrl.trim()
      : typeof params?.externalUrl === 'string'
        ? params.externalUrl.trim()
        : undefined;
  return {
    command: typeof record.command === 'string' ? record.command : undefined,
    params,
    externalUrl: externalUrl || undefined,
  };
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s)\]】]+/i;

/** 从文案提取 URL（仅 BOOK_NOW 等无结构化字段时的临时降级） */
export function extractUrlFromDecisionActionText(action: DecisionAction): string | undefined {
  for (const field of [action.summary, action.description, action.title, action.label]) {
    const match = field?.match(URL_IN_TEXT_RE);
    if (match?.[0]) return match[0];
  }
  return undefined;
}

/** 优先 navigationTarget.params.externalUrl，其次 payload */
export function resolveDecisionActionExternalUrl(action: DecisionAction): string | undefined {
  const nav = parseDecisionNavigationTarget(action.navigationTarget);
  if (nav?.externalUrl) return nav.externalUrl;
  const payloadUrl = action.payload?.externalUrl;
  if (typeof payloadUrl === 'string' && payloadUrl.trim()) return payloadUrl.trim();
  const repairUrl = action.payload?.repairCommand;
  const repairRecord = asRecord(repairUrl);
  const repairParams = asRecord(repairRecord?.parameters);
  if (typeof repairParams?.externalUrl === 'string' && repairParams.externalUrl.trim()) {
    return repairParams.externalUrl.trim();
  }
  if (action.actionId?.toUpperCase().includes('BOOK_NOW') || action.kind === 'book_now') {
    return extractUrlFromDecisionActionText(action);
  }
  return undefined;
}

export function openDecisionActionExternalUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}
