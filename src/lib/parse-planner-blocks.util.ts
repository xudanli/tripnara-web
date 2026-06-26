import type { WhyRecommendedBlock } from '@/types/experience-fulfillment';
import type { PlannerResponseBlock } from '@/types/trip';

/** 从 plannerResponseBlocks 中提取 why_recommended 块 */
export function parseWhyRecommended(
  blocks: PlannerResponseBlock[] | undefined | null,
): WhyRecommendedBlock | undefined {
  if (!blocks?.length) return undefined;
  const found = blocks.find((b) => b.type === 'why_recommended');
  if (!found || !Array.isArray(found.bullets)) return undefined;
  return found as WhyRecommendedBlock;
}

/** 是否包含 summary_card 块 */
export function hasSummaryCard(blocks: PlannerResponseBlock[] | undefined | null): boolean {
  return Boolean(blocks?.some((b) => b.type === 'summary_card'));
}
