import type { CreatePostRequest, RecruitmentPostCard, TeamPuzzle, TeamSlot } from '@/types/match-square';
import type { VibeLlmParseResult, VibeSlotDefinition } from '@/types/vibe-llm';
import { vibeLlmFromParse } from './to-card-view';

/** 从 Vibe LLM slot_definitions 构建初始 teamPuzzle */
export function buildTeamPuzzleFromVibeParse(
  postId: string,
  parse: VibeLlmParseResult,
  slotsNeeded: number,
  captainLabel = '队长'
): TeamPuzzle {
  const slots: TeamSlot[] = [
    {
      id: `${postId}-captain`,
      kind: 'captain',
      label: `🧑‍✈️ 队长 · ${captainLabel}`,
      filledBy: captainLabel,
    },
  ];

  const openSlots = parse.slot_definitions.slice(0, slotsNeeded);
  appendOpenSlots(slots, postId, openSlots, slotsNeeded);

  return {
    progressLabel: '车队拼图进度 · AI 定向补位',
    slots,
  };
}

function appendOpenSlots(
  slots: TeamSlot[],
  postId: string,
  definitions: VibeSlotDefinition[],
  slotsNeeded: number
) {
  for (let i = 0; i < slotsNeeded; i++) {
    const def = definitions[i];
    slots.push({
      id: `${postId}-vibe-open-${i}`,
      kind: 'open',
      label: def
        ? `🧩 建议补位 · ${def.expected_tag}`
        : `虚位以待 · 旅伴拼图位 ${i + 1}`,
      roleLabel: def ? `建议补位 · ${def.expected_tag}` : undefined,
      aiRationale: def?.reason,
    });
  }
}

export function applyVibeParseToPost(
  post: RecruitmentPostCard,
  parse: VibeLlmParseResult,
  vibeRawText?: string,
  options?: {
    parseSource?: 'rules' | 'llm';
    teamworkContractModelLabel?: string | null;
  }
): RecruitmentPostCard {
  const slotsNeeded = post.teamStatus?.slotsNeeded ?? parse.slot_definitions.length;
  const teamPuzzle = buildTeamPuzzleFromVibeParse(
    post.id,
    parse,
    slotsNeeded,
    post.captainDisplayName ?? post.captainCardTitle
  );

  return {
    ...post,
    vibeParse: parse,
    vibeRawText: vibeRawText ?? post.vibeRawText,
    vibeLlm: vibeLlmFromParse(
      parse,
      options?.parseSource ?? 'rules',
      vibeRawText,
      options?.teamworkContractModelLabel
    ),
    teamPuzzle,
    teamSlots: teamPuzzle.slots,
  };
}

/** POST /posts 响应与发布页 preview parse 对齐（后端 re-parse 不一致时的前端兜底） */
export function mergeCreatePostVibeSnapshot(
  card: RecruitmentPostCard,
  payload: CreatePostRequest
): RecruitmentPostCard {
  if (!payload.vibeParse) return card;

  const vision = payload.vibeFreeText?.trim() || payload.vibeRawText?.trim() || card.recruitmentVision;
  const parseSource = payload.parseSource ?? 'llm';

  return applyVibeParseToPost(card, payload.vibeParse, vision ?? undefined, {
    parseSource,
    teamworkContractModelLabel: payload.teamworkContractModelLabel,
  });
}
