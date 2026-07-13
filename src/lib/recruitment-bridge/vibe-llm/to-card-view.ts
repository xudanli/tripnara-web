import type { VibeLlmCardBlock } from '@/types/match-square';
import type { VibeLlmParseResult } from '@/types/vibe-llm';
import { filterExperienceChips } from '../filter-experience-chips';
import { hardGatesToPreferences } from './rule-parser';
import { buildVibeHardGatesPreviewLines, resolveTeamworkContractModelLabel } from './teamwork-labels';

/** 客户端 parse → 列表 Card vibeLlm 区块（mock / 预览） */
export function vibeLlmFromParse(
  parse: VibeLlmParseResult,
  parseSource: 'rules' | 'llm' = 'rules',
  visionText?: string | null,
  teamworkContractModelLabel?: string | null
): VibeLlmCardBlock {
  const hardGatesSummary = buildVibeHardGatesPreviewLines(parse.hard_gates);
  const fallbackSummary = hardGatesToPreferences(parse.hard_gates).split(' · ').filter(Boolean);

  return {
    chips: parse.vibe_chips.map((label, i) => ({
      id: label.replace(/[^\w\u4e00-\u9fff]/g, '').slice(0, 32) || `chip_${i}`,
      label,
    })),
    visionText: visionText?.trim() || null,
    contractHint: parse.contract_hint ?? null,
    teamworkContractModel: parse.teamwork_contract_model,
    teamworkContractModelLabel:
      teamworkContractModelLabel ?? resolveTeamworkContractModelLabel(parse.teamwork_contract_model),
    hardGatesSummary: hardGatesSummary.length ? hardGatesSummary : fallbackSummary,
    behavioralContracts: parse.behavior_contracts.map((c) => ({
      title: c.tag,
      clauses: [c.clause],
    })),
    parseSource,
  };
}

export function resolveVibeChipLabels(post: {
  vibeLlm?: VibeLlmCardBlock | null;
  vibeParse?: VibeLlmParseResult | null;
}): string[] {
  if (post.vibeLlm?.chips?.length) {
    return filterExperienceChips(post.vibeLlm.chips).map((c) => c.label);
  }
  return (post.vibeParse?.vibe_chips ?? []).filter((label) => {
    const compact = label.replace(/\s/g, '');
    return !/^(💰|预算范围|预算|费用|¥|\d+[wW万]\s*\+?\s*\/\s*人)/.test(compact);
  });
}

export function resolveBehavioralContracts(post: {
  vibeLlm?: VibeLlmCardBlock | null;
  vibeParse?: VibeLlmParseResult | null;
}): Array<{ title: string; clauses: string[] }> {
  if (post.vibeLlm?.behavioralContracts?.length) {
    return post.vibeLlm.behavioralContracts;
  }
  return (
    post.vibeParse?.behavior_contracts?.map((c) => ({
      title: c.tag,
      clauses: [c.clause],
    })) ?? []
  );
}
