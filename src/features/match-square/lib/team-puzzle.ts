import type {
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  TeamPuzzle,
  TeamSlot,
  VerifiedCredentials,
} from '@/types/match-square';
import { buildCaptainProfileFromPost, generateConstraintSlotLabels } from './match-engine';
import { isLikelyRealUserId, resolveApplicantCardTitle, resolveApplicantRealName } from './resolve-applicant-credentials';
import { credentialsDisplayName, resolveCaptainCredentials } from './verified-credentials';
import {
  formatMemberIdentityLabel,
  isPuzzleDeficitPersonaLabel,
} from './compact-puzzle-slot-label';

function parseFilledSlotLabel(label: string): { displayName: string; cardTitle: string } {
  const parts = label.replace(/^🧑‍✈️\s*/, '').split(' · ');
  if (parts.length >= 2) {
    return { displayName: parts[parts.length - 2].trim(), cardTitle: parts[parts.length - 1].trim() };
  }
  return { displayName: label.trim(), cardTitle: '旅伴' };
}

function pseudoAppFromFilledSlot(
  postId: string,
  slot: TeamSlot,
  index: number
): RecruitmentApplicationCard | null {
  if (
    !slot.occupantLabel &&
    !(slot.occupantUserId && isLikelyRealUserId(slot.occupantUserId))
  ) {
    return null;
  }

  const fromLabel = parseFilledSlotLabel(slot.label);
  const displayName = slot.occupantLabel ?? fromLabel.displayName;
  if (isPuzzleDeficitPersonaLabel(displayName) && !slot.occupantLabel) {
    return null;
  }
  const cardTitle = slot.roleLabel ?? slot.filledBy ?? fromLabel.cardTitle;
  const userId =
    slot.occupantUserId && isLikelyRealUserId(slot.occupantUserId)
      ? slot.occupantUserId
      : slot.id || `${postId}-filled-${index}`;

  return {
    id: slot.id || `${postId}-filled-${index}`,
    postId,
    status: 'approved',
    applicantUserId: userId,
    applicantDisplayName: displayName,
    applicantCardTitle: cardTitle,
    applicantMbtiType: 'INTJ',
    applicantInteractionMode: 'easy_companion',
    applicantInteractionModeLabel: slot.filledBy ?? cardTitle,
    applicantReputationStars: null,
    compatibilityPercent: 0,
    highlights: [],
    warnings: [],
    message: '',
    planningCommitmentAccepted: true,
    teamworkCommitmentAccepted: true,
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };
}

/** API filled 位带 occupantUserId 但申请列表未返回时 — 从 slot 元数据合成队员卡片 */
export function approvedMembersFromOccupiedPuzzleSlots(
  postId: string,
  slots: TeamSlot[]
): RecruitmentApplicationCard[] {
  return slots
    .filter(
      (slot) =>
        slot.kind === 'filled' &&
        slot.occupantUserId &&
        isLikelyRealUserId(slot.occupantUserId)
    )
    .map((slot, index) => {
      const parsed = parseFilledSlotLabel(slot.label);
      const displayName = slot.occupantLabel ?? parsed.displayName;
      const cardTitle = slot.roleLabel ?? parsed.cardTitle;
      return {
        id: slot.id || `${postId}-occupant-${index}`,
        postId,
        status: 'approved' as const,
        applicantUserId: slot.occupantUserId!,
        applicantDisplayName: displayName,
        applicantCardTitle: cardTitle,
        applicantMbtiType: 'INTJ',
        applicantInteractionMode: 'easy_companion',
        applicantInteractionModeLabel: slot.filledBy ?? cardTitle,
        applicantReputationStars: null,
        compatibilityPercent: 0,
        highlights: [],
        warnings: [],
        message: '',
        planningCommitmentAccepted: true,
        teamworkCommitmentAccepted: true,
        createdAt: new Date().toISOString(),
        decidedAt: new Date().toISOString(),
      };
    });
}

function dedupeApprovedApplications(
  apps: RecruitmentApplicationCard[]
): RecruitmentApplicationCard[] {
  const byKey = new Map<string, RecruitmentApplicationCard>();
  for (const app of apps) {
    const key = isLikelyRealUserId(app.applicantUserId)
      ? app.applicantUserId
      : `${app.applicantUserId}:${app.applicantDisplayName}`;
    const existing = byKey.get(key);
    if (
      !existing ||
      (isLikelyRealUserId(app.applicantUserId) && !isLikelyRealUserId(existing.applicantUserId))
    ) {
      byKey.set(key, app);
    }
  }
  return preferRealApprovedMembers([...byKey.values()]);
}

/** 优先真实申请记录，过滤拼图 AI 缺位伪队员 */
export function preferRealApprovedMembers(
  apps: RecruitmentApplicationCard[]
): RecruitmentApplicationCard[] {
  if (!apps.length) return apps;
  const real = apps.filter(
    (app) =>
      isLikelyRealUserId(app.applicantUserId) || app.applicantUserId === 'current-user'
  );
  const pool = real.length ? real : apps;
  const named = pool.filter((app) => !isPuzzleDeficitPersonaLabel(app.applicantDisplayName));
  return named.length ? named : pool;
}

function buildSyntheticViewerApplication(
  postId: string,
  options: {
    viewerPersonaLabel?: string;
    viewerMbtiType?: string;
    viewerCredentials?: VerifiedCredentials | null;
  }
): RecruitmentApplicationCard {
  const displayName = credentialsDisplayName(options.viewerCredentials) ?? '我';
  return {
    id: `${postId}-viewer-approved`,
    postId,
    status: 'approved',
    applicantUserId: 'current-user',
    applicantDisplayName: displayName,
    applicantCardTitle: options.viewerPersonaLabel ?? '旅伴',
    applicantMbtiType: options.viewerMbtiType ?? 'INTJ',
    applicantInteractionMode: 'easy_companion',
    applicantInteractionModeLabel: options.viewerPersonaLabel ?? '旅伴',
    applicantReputationStars: null,
    compatibilityPercent: 0,
    highlights: [],
    warnings: [],
    message: '',
    planningCommitmentAccepted: true,
    teamworkCommitmentAccepted: true,
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };
}

function puzzleAlreadyShowsApproved(
  slots: TeamSlot[],
  approved: RecruitmentApplicationCard[]
): boolean {
  if (!approved.length) return true;
  const filled = slots.filter((s) => s.kind === 'filled');
  if (filled.length < approved.length) return false;

  const filledLabels = filled.map((s) => s.label.trim());
  if (new Set(filledLabels).size < filled.length) {
    return false;
  }

  const assignment = assignApprovedMembersToFilledSlots(slots, '', approved);
  if (assignment.size < approved.length) return false;

  return [...assignment.entries()].every(([slotId, app]) => {
    const slot = filled.find((s) => s.id === slotId);
    if (!slot) return false;
    const identity = memberIdentityLabel(app);
    return slot.label === identity || slot.label.includes(app.applicantDisplayName);
  });
}

/** 将已通过申请与 filled 拼图位一一配对（避免多个 slot 命中同一人 / 共用缺位 AI 文案） */
export function assignApprovedMembersToFilledSlots(
  slots: TeamSlot[],
  _postId: string,
  approvedMembers: RecruitmentApplicationCard[]
): Map<string, RecruitmentApplicationCard> {
  const map = new Map<string, RecruitmentApplicationCard>();
  const assignedIds = new Set<string>();

  const tryAssign = (slot: TeamSlot, app: RecruitmentApplicationCard | null | undefined) => {
    if (!app || assignedIds.has(app.id)) return;
    map.set(slot.id, app);
    assignedIds.add(app.id);
  };

  const filled = [...slots.filter((s) => s.kind === 'filled')].sort(
    (a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)
  );
  const pool = () => approvedMembers.filter((a) => !assignedIds.has(a.id));

  for (const slot of filled) {
    if (slot.occupantUserId && isLikelyRealUserId(slot.occupantUserId)) {
      tryAssign(
        slot,
        approvedMembers.find((a) => a.applicantUserId === slot.occupantUserId)
      );
    }
  }

  for (const slot of filled) {
    if (map.has(slot.id)) continue;
    const remaining = pool();
    const byName = remaining.find(
      (app) =>
        (slot.occupantLabel && slot.occupantLabel === app.applicantDisplayName) ||
        (slot.occupantUserId && slot.occupantUserId === app.applicantUserId)
    );
    tryAssign(slot, byName);
  }

  for (const slot of filled) {
    if (map.has(slot.id)) continue;
    const remaining = pool();
    const byCard = remaining.find(
      (app) =>
        slot.label.includes(app.applicantDisplayName) ||
        (app.applicantCardTitle && slot.label.includes(app.applicantCardTitle))
    );
    tryAssign(slot, byCard);
  }

  for (const slot of filled) {
    if (map.has(slot.id)) continue;
    const remaining = pool();
    if (remaining[0]) tryAssign(slot, remaining[0]);
  }

  return map;
}

/** 详情页 — 将已通过队员写入 teamPuzzle（API 未推送 filled 位时的客户端兜底） */
export function mergeApprovedMembersIntoPost(
  post: RecruitmentPostCard,
  options: {
    myApplications?: RecruitmentApplicationCard[];
    /** 队长管理页 / 我的招募 — 全量已通过申请 */
    approvedApplications?: RecruitmentApplicationCard[];
    viewerPersonaLabel?: string;
    viewerMbtiType?: string;
    viewerCredentials?: VerifiedCredentials | null;
  } = {}
): RecruitmentPostCard {
  const existingSlots = post.teamPuzzle?.slots ?? post.teamSlots ?? [];
  const fromMyApps = (options.myApplications ?? []).filter(
    (app) => app.postId === post.id && app.status === 'approved'
  );
  const fromApprovedList = (options.approvedApplications ?? []).filter(
    (app) => app.postId === post.id && app.status === 'approved'
  );

  let approved = dedupeApprovedApplications([...fromMyApps, ...fromApprovedList]);

  approved = dedupeApprovedApplications([
    ...approved,
    ...approvedMembersFromOccupiedPuzzleSlots(post.id, existingSlots),
  ]);

  if (!fromApprovedList.length) {
    const fromPuzzle = existingSlots
      .filter((s) => s.kind === 'filled' && !s.roleLabel?.includes('队长'))
      .map((slot, index) => pseudoAppFromFilledSlot(post.id, slot, index))
      .filter((app): app is RecruitmentApplicationCard => app != null);
    approved = dedupeApprovedApplications([...fromPuzzle, ...approved]);
  }

  const viewerDisplayName = credentialsDisplayName(options.viewerCredentials) ?? '我';
  const viewerAlreadyListed = approved.some(
    (app) =>
      app.applicantUserId === 'current-user' ||
      app.applicantDisplayName === viewerDisplayName ||
      app.applicantDisplayName === '我'
  );

  if (post.viewerApplicationStatus === 'approved' && !viewerAlreadyListed) {
    approved = [
      ...approved,
      buildSyntheticViewerApplication(post.id, options),
    ];
  }

  if (!approved.length) return post;

  const filledCount = existingSlots.filter((s) => s.kind === 'filled').length;
  const teamFull =
    post.status === 'closed' ||
    (post.teamStatus?.slotsRemaining != null && post.teamStatus.slotsRemaining <= 0);

  if (teamFull && approved.length >= filledCount && filledCount > 0) {
    return applyTeamPuzzleToPost(post, approved);
  }

  if (teamFull && fromApprovedList.length > 0) {
    return applyTeamPuzzleToPost(post, approved);
  }

  if (puzzleAlreadyShowsApproved(existingSlots, approved)) return post;

  return applyTeamPuzzleToPost(post, approved);
}

function captainDisplayLabel(post: RecruitmentPostCard): string {
  return (
    post.captainDisplayName ??
    credentialsDisplayName(resolveCaptainCredentials(post)) ??
    post.captainCardTitle.split(/型|者/)[0] ??
    '队长'
  );
}

/** 详情页 header 已展示队长 — 拼图条去掉 captain 位及 occupantUserId 指向队长的 filled 位 */
export function filterCaptainPuzzleSlotsForDetail(
  slots: TeamSlot[],
  post?: RecruitmentPostCard
): TeamSlot[] {
  if (!post) return slots.filter((slot) => slot.kind !== 'captain');

  const captainUserId = post.captainUserId?.trim();
  const captainName = captainDisplayLabel(post);

  return slots.filter((slot) => {
    if (slot.kind === 'captain') return false;
    if (captainUserId && slot.occupantUserId === captainUserId) return false;

    const label = slot.label.trim();
    if (!captainName) return true;

    if (label === captainName) return false;
    if (label.startsWith(`队长 · ${captainName}`)) return false;
    if (label.startsWith(`${captainName} · 队长`)) return false;
    if (label === `队长 · ${captainName}`) return false;

    return true;
  });
}

export function captainIdentityLabel(post: RecruitmentPostCard): string {
  return formatMemberIdentityLabel({
    displayName: captainDisplayLabel(post),
    cardTitle: post.captainCardTitle,
    interactionModeLabel: post.captainInteractionModeLabel,
    asCaptain: true,
  });
}

export function memberIdentityLabel(app: RecruitmentApplicationCard): string {
  return formatMemberIdentityLabel({
    displayName: resolveApplicantRealName(app, app.applicantVerifiedCredentials),
    cardTitle: resolveApplicantCardTitle(app, app.applicantVerifiedCredentials),
    interactionModeLabel: app.applicantInteractionModeLabel,
  });
}

/** API teamPuzzle filled 位可能仍带缺位 AI 文案 — 用已通过申请覆盖展示标签 */
export function enrichTeamSlotsWithMemberIdentity(
  slots: TeamSlot[],
  post: RecruitmentPostCard,
  approvedMembers: RecruitmentApplicationCard[] = []
): TeamSlot[] {
  const members = preferRealApprovedMembers(approvedMembers);
  const assignment = assignApprovedMembersToFilledSlots(slots, post.id, members);

  return slots.map((slot) => {
    if (slot.kind === 'captain') {
      return {
        ...slot,
        label: captainIdentityLabel(post),
        occupantLabel: captainDisplayLabel(post),
        filledBy: post.captainCardTitle,
        roleLabel: post.captainCardTitle,
      };
    }

    if (slot.kind === 'filled') {
      const app = assignment.get(slot.id);
      if (app) {
        return {
          ...slot,
          label: memberIdentityLabel(app),
          occupantLabel: app.applicantDisplayName,
          occupantUserId: app.applicantUserId,
          roleLabel: app.applicantCardTitle,
          filledBy: app.applicantInteractionModeLabel,
        };
      }

      if (slot.occupantLabel) {
        return {
          ...slot,
          label: formatMemberIdentityLabel({
            displayName: slot.occupantLabel,
            cardTitle: slot.roleLabel,
            interactionModeLabel: slot.filledBy,
          }),
        };
      }
    }

    return slot;
  });
}

/** 根据已通过申请重建 teamPuzzle + teamStatus（mock 与 API 未推送时的客户端兜底） */
export function rebuildTeamPuzzle(
  post: RecruitmentPostCard,
  approved: RecruitmentApplicationCard[]
): { teamPuzzle: TeamPuzzle; teamStatus: RecruitmentPostCard['teamStatus'] } {
  const membersNeeded = post.teamStatus?.slotsNeeded ?? 1;

  const slots: TeamSlot[] = [
    {
      id: `${post.id}-captain`,
      kind: 'captain',
      label: captainIdentityLabel(post),
      filledBy: post.captainCardTitle,
      occupantLabel: captainDisplayLabel(post),
      roleLabel: post.captainCardTitle,
    },
  ];

  approved.forEach((app) => {
    slots.push({
      id: `${post.id}-member-${app.id}`,
      kind: 'filled',
      label: memberIdentityLabel(app),
      filledBy: app.applicantInteractionModeLabel,
      occupantLabel: app.applicantDisplayName,
      occupantUserId: app.applicantUserId,
      roleLabel: app.applicantCardTitle,
      slotIndex: app.targetSlotIndex ?? undefined,
    });
  });

  const slotsRemaining = Math.max(0, membersNeeded - approved.length);
  const leader = buildCaptainProfileFromPost(post, resolveCaptainCredentials(post));
  const openLabels = generateConstraintSlotLabels(leader, slotsRemaining);

  for (let i = 0; i < slotsRemaining; i++) {
    slots.push({
      id: `${post.id}-open-${i}`,
      kind: 'open',
      label: `虚位以待 · ${openLabels[i] ?? `旅伴拼图位 ${i + 1}`}`,
    });
  }

  const slotsFilled = 1 + approved.length;

  return {
    teamPuzzle: {
      progressLabel: slotsRemaining === 0 ? '车队已满员 🎉' : '车队拼图进度',
      slots,
    },
    teamStatus: {
      slotsFilled,
      slotsNeeded: membersNeeded,
      slotsRemaining,
    },
  };
}

/** 拼图已占位成员 → 申请卡片（用于点击打开信任名片） */
export function resolvePuzzleMemberApplication(
  slot: TeamSlot,
  postId: string,
  approvedMembers: RecruitmentApplicationCard[] = [],
  allSlots?: TeamSlot[]
): RecruitmentApplicationCard | null {
  if (slot.kind !== 'filled') return null;

  const members = preferRealApprovedMembers(approvedMembers);

  if (allSlots?.length && members.length) {
    const assigned = assignApprovedMembersToFilledSlots(allSlots, postId, members).get(
      slot.id
    );
    if (assigned) return assigned;
  }

  if (slot.occupantUserId && isLikelyRealUserId(slot.occupantUserId)) {
    const byId = members.find((app) => app.applicantUserId === slot.occupantUserId);
    if (byId) return byId;
  }

  if (slot.occupantLabel && !isPuzzleDeficitPersonaLabel(slot.occupantLabel)) {
    const byName = members.find(
      (app) => app.applicantDisplayName === slot.occupantLabel
    );
    if (byName) return byName;
  }

  const byLabel = members.find(
    (app) =>
      slot.label.includes(app.applicantDisplayName) ||
      (app.applicantCardTitle && slot.label.includes(app.applicantCardTitle))
  );
  if (byLabel) return byLabel;

  const byRole = members.find(
    (app) =>
      (slot.roleLabel &&
        (slot.roleLabel === app.applicantCardTitle ||
          slot.roleLabel.includes(app.applicantCardTitle) ||
          app.applicantCardTitle.includes(slot.roleLabel))) ||
      (slot.filledBy && slot.filledBy === app.applicantDisplayName)
  );
  if (byRole) return byRole;

  const parsed = parseFilledSlotLabel(slot.label);
  const displayName = slot.occupantLabel ?? parsed.displayName;
  const fuzzyMatch = members.find(
    (app) =>
      app.applicantDisplayName === displayName ||
      displayName.includes(app.applicantDisplayName) ||
      app.applicantDisplayName.includes(displayName) ||
      (app.applicantCardTitle &&
        (slot.label.includes(app.applicantCardTitle) ||
          parsed.cardTitle.includes(app.applicantCardTitle)))
  );
  if (fuzzyMatch) return fuzzyMatch;

  if (allSlots?.length && members.length) {
    const filledSlots = [...allSlots.filter((s) => s.kind === 'filled')].sort(
      (a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)
    );
    const slotIndex = filledSlots.findIndex((s) => s.id === slot.id);
    if (slotIndex >= 0) {
      const sortedApps = [...members].sort((a, b) => {
        const ai = a.targetSlotIndex ?? Number.MAX_SAFE_INTEGER;
        const bi = b.targetSlotIndex ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return (a.decidedAt ?? a.createdAt).localeCompare(b.decidedAt ?? b.createdAt);
      });
      if (slotIndex < sortedApps.length) {
        return sortedApps[slotIndex];
      }
    }
  }

  if (!slot.occupantUserId || !isLikelyRealUserId(slot.occupantUserId)) {
    return null;
  }

  const userId = slot.occupantUserId;
  const cardTitle = slot.filledBy ?? slot.roleLabel ?? parsed.cardTitle;

  return {
    id: slot.id,
    postId,
    status: 'approved',
    applicantUserId: userId,
    applicantDisplayName: displayName,
    applicantCardTitle: cardTitle,
    applicantMbtiType: 'INTJ',
    applicantInteractionMode: 'easy_companion',
    applicantInteractionModeLabel: cardTitle,
    applicantReputationStars: null,
    applicantVerifiedCredentials: null,
    compatibilityPercent: 0,
    highlights: [],
    warnings: [],
    message: '',
    planningCommitmentAccepted: true,
    teamworkCommitmentAccepted: true,
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };
}

/** 将拼图快照写回 post；满员时可选 closed */
export function applyTeamPuzzleToPost(
  post: RecruitmentPostCard,
  approved: RecruitmentApplicationCard[]
): RecruitmentPostCard {
  const { teamPuzzle, teamStatus } = rebuildTeamPuzzle(post, approved);
  const full = teamStatus.slotsRemaining === 0;
  return {
    ...post,
    teamPuzzle,
    teamSlots: teamPuzzle.slots,
    teamStatus,
    status: full ? 'closed' : post.status,
  };
}
