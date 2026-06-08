import type { RecruitmentApplicationCard, RecruitmentPostCard, TeamSlot } from '@/types/match-square';
import { defaultTeamStatus } from './normalize-api-response';
import { enrichTeamSlotsWithMemberIdentity } from './team-puzzle';
import {
  buildCaptainProfileFromPost,
  generateConstraintSlotLabels,
  slotLabelMatchesViewer,
  type MatchEngineProfile,
} from './match-engine';
import { credentialsDisplayName, resolveCaptainCredentials } from './verified-credentials';

export type ViewerSlotProfile = {
  displayName?: string;
  personaTitle?: string;
  canDrive?: boolean;
  hasVehicle?: boolean;
  vehicleLabel?: string;
  likesPhoto?: boolean;
  mbtiType?: string;
  /** Match Engine v2 浏览者画像（用于拼图高亮） */
  matchProfile?: MatchEngineProfile | null;
};

const ROLE_PATTERNS: Array<{ pattern: RegExp; label: string; skillKey: keyof ViewerSlotProfile }> = [
  { pattern: /开车|驾驶|司机|驾照/i, label: '会开车的队员', skillKey: 'canDrive' },
  { pattern: /摄影|拍照|出片/i, label: '会拍照的队员', skillKey: 'likesPhoto' },
  { pattern: /女生|女性|同房/i, label: '消费观相近的同房女生', skillKey: 'personaTitle' },
  { pattern: /AA|分摊|预算/i, label: '能 AA 的队友', skillKey: 'personaTitle' },
  { pattern: /人文|历史|讲解/i, label: '人文讲解搭子', skillKey: 'personaTitle' },
];

function extractOpenRoleLabels(post: RecruitmentPostCard): string[] {
  const team = defaultTeamStatus(post);
  const leader = buildCaptainProfileFromPost(post, resolveCaptainCredentials(post));
  const constraintLabels = generateConstraintSlotLabels(leader, team.slotsRemaining);

  if (constraintLabels.length >= team.slotsRemaining) {
    return constraintLabels.slice(0, team.slotsRemaining);
  }

  const haystack = [post.preferences, post.captainMessage, post.vehicleInfo].filter(Boolean).join(' ');
  const found: string[] = [...constraintLabels];

  for (const { pattern, label } of ROLE_PATTERNS) {
    if (pattern.test(haystack) && !found.includes(label)) {
      found.push(label);
    }
  }

  while (found.length < team.slotsRemaining) {
    found.push(`契合 ${post.captainInteractionModeLabel} 的旅伴`);
  }

  return found.slice(0, team.slotsRemaining);
}

function slotMatchesViewer(
  label: string,
  viewer?: ViewerSlotProfile | null
): boolean {
  if (!viewer) return false;
  if (viewer.matchProfile && slotLabelMatchesViewer(label, viewer.matchProfile)) return true;
  if (/开车|驾驶|司机/.test(label) && viewer.canDrive) return true;
  if (/拍照|摄影|出片/.test(label) && viewer.likesPhoto) return true;
  if (/女生|同房/.test(label) && viewer.personaTitle?.includes('体验')) return true;
  if (/AA|预算/.test(label)) return true;
  if (viewer.mbtiType && label.includes(viewer.mbtiType)) return true;
  return false;
}

/** 3.7.1 — 优先使用 API teamPuzzle，否则客户端推断；filled 位用真实队员身份覆盖缺位文案 */
export function resolveTeamSlots(
  post: RecruitmentPostCard,
  viewer?: ViewerSlotProfile | null,
  approvedMembers?: RecruitmentApplicationCard[]
): TeamSlot[] {
  let slots: TeamSlot[];
  if (post.teamPuzzle?.slots?.length) {
    slots = post.teamPuzzle.slots.map((s) => ({
      ...s,
      highlightForViewer:
        s.highlightForViewer ?? (s.kind === 'open' ? slotMatchesViewer(s.label, viewer) : false),
    }));
  } else if (post.teamSlots?.length) {
    slots = post.teamSlots.map((s) => ({
      ...s,
      highlightForViewer: s.highlightForViewer ?? slotMatchesViewer(s.label, viewer),
    }));
  } else {
    slots = buildTeamSlots(post, viewer);
  }

  return enrichTeamSlotsWithMemberIdentity(slots, post, approvedMembers ?? []);
}

/** 3.7.1 — 约束满足拼图缺位（无 API 数据时的兜底） */
export function buildTeamSlots(
  post: RecruitmentPostCard,
  viewer?: ViewerSlotProfile | null
): TeamSlot[] {
  if (post.teamSlots?.length) {
    return post.teamSlots.map((s) => ({
      ...s,
      highlightForViewer: s.highlightForViewer ?? slotMatchesViewer(s.label, viewer),
    }));
  }

  const captainName =
    post.captainDisplayName ??
    credentialsDisplayName(resolveCaptainCredentials(post)) ??
    post.captainCardTitle.split(/型|者/)[0] ??
    '队长';
  const slots: TeamSlot[] = [
    {
      id: `${post.id}-captain`,
      kind: 'captain',
      label: `🧑‍✈️ 队长 · ${captainName}`,
      filledBy: post.captainCardTitle,
    },
  ];

  const openLabels = extractOpenRoleLabels(post);
  openLabels.forEach((label, i) => {
    slots.push({
      id: `${post.id}-open-${i}`,
      kind: 'open',
      label: `虚位以待 · ${label}`,
      highlightForViewer: slotMatchesViewer(label, viewer),
    });
  });

  return slots;
}

export function viewerProfileFromContext(input: {
  personaTitle?: string;
  mbtiType?: string;
  vehicleInfo?: string;
  displayName?: string;
  matchProfile?: MatchEngineProfile | null;
}): ViewerSlotProfile {
  const vehicle = input.vehicleInfo ?? '';
  return {
    displayName: input.displayName,
    personaTitle: input.personaTitle,
    mbtiType: input.mbtiType,
    matchProfile: input.matchProfile,
    canDrive: /开|驾|宝马|坦克|suv|车/i.test(vehicle) || input.mbtiType?.startsWith('E') === true,
    hasVehicle: Boolean(vehicle),
    vehicleLabel: vehicle || undefined,
    likesPhoto: /拍|摄影|体验|探索/.test(input.personaTitle ?? ''),
  };
}
