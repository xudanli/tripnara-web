import type { PlanningDecisionDiagnostic } from '@/dto/frontend-planning-decision-pack.types';
import { sanitizeSplitPlanTextForDisplay } from '@/lib/itinerary-split-note.util';

export type ProposalDiagnosticCategory =
  | 'time_overlap'
  | 'same_day_travel'
  | 'cross_day_travel'
  | 'other';

export interface ProposalDiagnosticDisplayItem {
  id: string;
  category: ProposalDiagnosticCategory;
  /** 主文案（去重后的有效描述） */
  primary: string;
  dayIndex?: number;
  severity?: PlanningDecisionDiagnostic['severity'];
  source?: PlanningDecisionDiagnostic['source'];
}

export interface ProposalDiagnosticGroup {
  category: ProposalDiagnosticCategory;
  label: string;
  items: ProposalDiagnosticDisplayItem[];
}

const CATEGORY_ORDER: ProposalDiagnosticCategory[] = [
  'time_overlap',
  'same_day_travel',
  'cross_day_travel',
  'other',
];

export const PROPOSAL_DIAGNOSTIC_CATEGORY_LABEL: Record<ProposalDiagnosticCategory, string> = {
  time_overlap: '时间重叠',
  same_day_travel: '同日交通',
  cross_day_travel: '跨天交通',
  other: '其他提醒',
};

const CATEGORY_TITLE_ALIASES = new Set([
  '同日交通偏紧',
  '跨天交通时间不足',
  '时间重叠',
  '行程冲突',
  '同日交通',
  '跨天交通',
]);

function normalizeText(value?: string | null): string {
  return sanitizeSplitPlanTextForDisplay(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function classifyProposalDiagnostic(
  diagnostic: Pick<PlanningDecisionDiagnostic, 'title' | 'message'>,
): ProposalDiagnosticCategory {
  const blob = `${diagnostic.title ?? ''} ${diagnostic.message ?? ''}`;
  if (/重叠|时间冲突|time\s*overlap/i.test(blob)) return 'time_overlap';
  if (/跨天交通|隔夜车程|跨日/i.test(blob)) return 'cross_day_travel';
  if (/同日交通|交通偏紧|缓冲|路上约需|车程|开始时间偏早|交通时间不足/i.test(blob)) {
    return 'same_day_travel';
  }
  return 'other';
}

function isCategoryTitle(title: string): boolean {
  const trimmed = title.trim();
  if (CATEGORY_TITLE_ALIASES.has(trimmed)) return true;
  return /^(同日交通|跨天交通|时间重叠)/.test(trimmed) && trimmed.length <= 12;
}

function extractDayIndex(text: string, explicit?: number): number | undefined {
  if (explicit != null) return explicit;
  const match = text.match(/第\s*(\d+)\s*天/);
  if (match) return Number(match[1]);
  return undefined;
}

/** 去掉分类词与前缀天后的核心事实，用于去重 */
export function proposalDiagnosticFingerprint(text: string): string {
  return normalizeText(text)
    .replace(/同日交通偏紧|跨天交通时间不足|行程冲突|时间重叠|必须处理|建议调整/g, '')
    .replace(/第\s*\d+\s*天/g, '')
    .replace(/[·•|/\\:;：，,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePrimary(diagnostic: PlanningDecisionDiagnostic): string {
  const title = sanitizeSplitPlanTextForDisplay(diagnostic.title);
  const message = sanitizeSplitPlanTextForDisplay(diagnostic.message);
  if (isCategoryTitle(title)) return message || title;
  if (message && normalizeText(title) === normalizeText(message)) return title;
  // title 已含完整事实时不再拼 message
  if (title && message && normalizeText(title).includes(normalizeText(message))) return title;
  if (title && message && !isCategoryTitle(title)) {
    // title 是短标签、message 是明细
    if (title.length <= 16 && message.length > title.length) return message;
  }
  return title || message;
}

/**
 * 将提案诊断按类别分组，并去掉「分类标题条目」与「明细条目」互重复。
 */
export function groupProposalDiagnosticsForDisplay(
  diagnostics: PlanningDecisionDiagnostic[],
): ProposalDiagnosticGroup[] {
  const byFingerprint = new Map<string, ProposalDiagnosticDisplayItem>();

  for (const diagnostic of diagnostics) {
    const category = classifyProposalDiagnostic(diagnostic);
    const primary = resolvePrimary(diagnostic).trim();
    if (!primary) continue;

    const dayIndex = extractDayIndex(primary, diagnostic.dayIndex);
    const fingerprint = `${category}::${proposalDiagnosticFingerprint(primary)}`;
    if (!fingerprint.endsWith('::') && fingerprint.length > category.length + 2) {
      const existing = byFingerprint.get(fingerprint);
      if (existing) {
        // 保留更长/更完整的主文案
        if (primary.length > existing.primary.length) {
          byFingerprint.set(fingerprint, {
            ...existing,
            primary,
            dayIndex: dayIndex ?? existing.dayIndex,
            severity: diagnostic.severity ?? existing.severity,
          });
        }
        continue;
      }
      // 若新条目被已有长文案覆盖，跳过
      let covered = false;
      for (const [key, item] of byFingerprint) {
        if (!key.startsWith(`${category}::`)) continue;
        const a = proposalDiagnosticFingerprint(item.primary);
        const b = proposalDiagnosticFingerprint(primary);
        if (!a || !b) continue;
        if (a.includes(b) && a.length >= b.length) {
          covered = true;
          break;
        }
        if (b.includes(a) && b.length > a.length) {
          byFingerprint.delete(key);
          break;
        }
      }
      if (covered) continue;
    }

    byFingerprint.set(fingerprint, {
      id: diagnostic.id,
      category,
      primary,
      dayIndex,
      severity: diagnostic.severity,
      source: diagnostic.source,
    });
  }

  const items = [...byFingerprint.values()];
  const groups: ProposalDiagnosticGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const groupItems = items
      .filter((item) => item.category === category)
      .sort((a, b) => (a.dayIndex ?? 99) - (b.dayIndex ?? 99));
    if (!groupItems.length) continue;
    groups.push({
      category,
      label: PROPOSAL_DIAGNOSTIC_CATEGORY_LABEL[category],
      items: groupItems,
    });
  }
  return groups;
}
