import { decisionOptionLabel } from '@/lib/decision-problem-display.util';
import type { DecisionOption } from '@/types/decision-problem';
import type {
  CausalStoryChainNode,
  CausalStoryRecommendedOption,
} from '@/types/causal-trace';

const TECHNICAL_SNAKE_TOKEN = /^[a-z][a-z0-9_]*$/i;

export function isTechnicalOptionToken(text: string | undefined | null): boolean {
  const token = text?.trim();
  if (!token) return false;
  if (TECHNICAL_SNAKE_TOKEN.test(token) && token.includes('_')) return true;
  return /^[A-Z][A-Z0-9_]+$/.test(token);
}

export function isTechnicalCausalOptionReference(
  text: string | undefined | null,
  optionId?: string | null,
): boolean {
  const value = text?.trim();
  if (!value) return false;
  const id = optionId?.trim();
  if (id) {
    if (value === id) return true;
    if (value === `选择 ${id}` || value === `选择${id}`) return true;
    if (value === `方案 ${id}` || value === `方案${id}`) return true;
  }
  if (/^选择\s+[a-z][a-z0-9_]*$/i.test(value)) return true;
  if (/^方案\s+[a-z][a-z0-9_]*$/i.test(value)) return true;
  return isTechnicalOptionToken(value);
}

export function findProblemOptionForCausalOptionId(
  optionId: string,
  options: DecisionOption[],
): { option: DecisionOption; index: number } | null {
  const normalized = optionId.trim();
  if (!normalized || !options.length) return null;

  const directIndex = options.findIndex((row) => row.id === normalized);
  if (directIndex >= 0) {
    return { option: options[directIndex]!, index: directIndex };
  }

  const commandIndex = options.findIndex(
    (row) => row.repairCommand?.commandType?.trim() === normalized,
  );
  if (commandIndex >= 0) {
    return { option: options[commandIndex]!, index: commandIndex };
  }

  const typeIndex = options.findIndex(
    (row) => row.type?.trim().toLowerCase() === normalized.toLowerCase(),
  );
  if (typeIndex >= 0) {
    return { option: options[typeIndex]!, index: typeIndex };
  }

  if (isTechnicalOptionToken(normalized)) {
    return { option: options[0]!, index: 0 };
  }

  return null;
}

export interface CausalStoryRecommendedOptionDisplay {
  letter: string;
  title: string;
  headline: string;
}

export function resolveCausalStoryRecommendedOptionDisplay(input: {
  recommendedOption: CausalStoryRecommendedOption;
  problemOptions?: DecisionOption[];
}): CausalStoryRecommendedOptionDisplay | null {
  const optionId = input.recommendedOption.optionId?.trim();
  if (!optionId) return null;

  const matched = input.problemOptions?.length
    ? findProblemOptionForCausalOptionId(optionId, input.problemOptions)
    : null;

  const letter = matched
    ? String.fromCharCode(65 + matched.index)
    : 'A';

  const summary = input.recommendedOption.summary?.trim() ?? '';
  const titleFromOption = matched ? decisionOptionLabel(matched.option) : '';
  const titleFromSummary =
    summary && !isTechnicalCausalOptionReference(summary, optionId) ? summary : '';

  const title = titleFromOption || titleFromSummary;
  if (!title) return null;

  return {
    letter,
    title,
    headline: /^方案\s*[A-ZＡ-Ｚ]/i.test(title)
      ? title
      : `方案 ${letter} · ${title}`,
  };
}

export function resolveCausalStoryRecommendedSummary(input: {
  recommendedOption: CausalStoryRecommendedOption;
  problemOptions?: DecisionOption[];
}): string {
  const resolved = resolveCausalStoryRecommendedOptionDisplay(input);
  if (resolved) return resolved.headline;

  const summary = input.recommendedOption.summary?.trim();
  if (summary && !isTechnicalCausalOptionReference(summary, input.recommendedOption.optionId)) {
    return summary;
  }

  return '推荐方案';
}

export function isCausalChainOptionIdNode(
  node: CausalStoryChainNode,
  optionId?: string | null,
): boolean {
  const id = optionId?.trim();
  if (!id) return false;
  const desc = (node.description || node.title).trim();
  if (!desc) return false;
  if (isTechnicalCausalOptionReference(desc, id)) return true;
  const nodeType = node.type?.trim().toUpperCase();
  if (
    (nodeType === 'OPTION' ||
      nodeType === 'RECOMMENDATION' ||
      nodeType === 'INTERVENTION') &&
    desc.includes(id)
  ) {
    return true;
  }
  return false;
}
