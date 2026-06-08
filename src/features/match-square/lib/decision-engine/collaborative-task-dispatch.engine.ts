import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type {
  CollaborativeTaskFlywheelMetadata,
  CollaborativeTaskView,
  PreMatchDecisionBrief,
} from '@/types/collaborative-task-flywheel';
import { SCENE_TASK_TEMPLATES, SYNTHETIC_MILESTONES } from './scene-task-templates.config';
import { TASK_ROLE_DISPATCH_MATRIX } from './task-role-dispatch-matrix.config';
import { buildPreMatchDecisionBrief } from './pre-match-decision.engine';

export type TaskDispatchCrewMember = {
  userId: string;
  displayName: string;
  mbtiType: string;
  slotIndex: number;
  isCaptain: boolean;
  roleAnchor?: string | null;
};

export type CollaborativeTaskDispatchInput = {
  post: RecruitmentPostCard;
  crew: TaskDispatchCrewMember[];
  decisionBriefsByUserId?: Record<string, PreMatchDecisionBrief>;
};

const MAX_TASKS = 6;

function toolchainIds(post: RecruitmentPostCard): Set<string> {
  const ids = new Set<string>();
  for (const item of post.trekkingOrchestration?.toolchain ?? []) {
    ids.add(item.id);
  }
  if ((post.trekkingOrchestration?.sharedGearDeficits?.length ?? 0) > 0) {
    ids.add('shared_gear_checklist');
  }
  return ids;
}

function resolveMilestoneIds(post: RecruitmentPostCard): Set<string> {
  const ids = new Set<string>();
  for (const m of post.trekkingOrchestration?.eventStreamMilestones ?? []) {
    ids.add(m.id);
  }
  const profile = post.trekkingOrchestration?.worldModel?.profile;
  const blob = [
    post.recruitmentVision ?? '',
    post.routeTemplateCatalogId ?? '',
  ].join(' ');
  if (
    profile === 'heavy_offline_dem' ||
    post.routeTemplateCatalogId === 'is_laugavegur_55km_heavy_4d' ||
    /Laugavegur|兰格维格|DEM/i.test(blob)
  ) {
    ids.add(SYNTHETIC_MILESTONES.dem_blind_nav.id);
  }
  if (
    post.routeTemplateCatalogId === 'is_laugavegur_55km_heavy_4d' ||
    /涉水|ford|融水/i.test(blob)
  ) {
    ids.add(SYNTHETIC_MILESTONES.glacier_river_ford.id);
  }
  return ids;
}

function captainControlScore(post: RecruitmentPostCard): number {
  const style = post.planningStyle ?? post.teamworkStyle;
  let score = style === 'full_managed' ? 0.7 : style === 'co_planning' ? 0.45 : 0.2;
  if (/INTJ|ENTJ|ESTJ|ISTJ/.test(post.captainMbtiType)) score += 0.2;
  return Math.min(1, score);
}

function pickAssignee(
  rule: (typeof TASK_ROLE_DISPATCH_MATRIX)[number],
  post: RecruitmentPostCard,
  crew: TaskDispatchCrewMember[],
  brief?: PreMatchDecisionBrief | null
): TaskDispatchCrewMember | null {
  if (rule.requiresRoleAnchor && brief?.suggestedSceneRoleAnchor) {
    const anchored = crew.find((m) => m.roleAnchor === brief.suggestedSceneRoleAnchor);
    if (anchored) return anchored;
  }

  if (rule.preferCaptain) {
    const captain = crew.find((m) => m.isCaptain);
    if (captain && (!rule.preferHighControl || captainControlScore(post) >= 0.45)) {
      return captain;
    }
  }

  if (rule.preferCoPlanning) {
    const style = post.planningStyle ?? post.teamworkStyle;
    if (style === 'co_planning') {
      const nonCaptain = crew.find((m) => !m.isCaptain);
      if (nonCaptain) return nonCaptain;
    }
  }

  if (rule.preferMbti?.length) {
    for (const type of rule.preferMbti) {
      const hit = crew.find((m) => m.mbtiType === type);
      if (hit) return hit;
    }
  }

  if (rule.preferSlotIndex != null) {
    return crew.find((m) => m.slotIndex === rule.preferSlotIndex) ?? crew[rule.preferSlotIndex] ?? null;
  }

  return crew.find((m) => !m.isCaptain) ?? crew[0] ?? null;
}

function shouldDispatchRule(
  rule: (typeof TASK_ROLE_DISPATCH_MATRIX)[number],
  milestones: Set<string>,
  tools: Set<string>,
  brief?: PreMatchDecisionBrief | null
): boolean {
  if (rule.triggerMilestoneId && !milestones.has(rule.triggerMilestoneId)) return false;
  if (rule.triggerToolchainId && !tools.has(rule.triggerToolchainId)) return false;
  if (rule.minNoisePercent != null) {
    const noise = brief?.inTripCollaborationNoisePercent ?? 0;
    if (noise < rule.minNoisePercent) return false;
  }
  if (rule.requiresRoleAnchor && brief?.suggestedSceneRoleAnchor !== rule.requiresRoleAnchor) {
    return false;
  }
  return true;
}

function toTaskView(
  templateId: string,
  assignee: TaskDispatchCrewMember | null,
  index: number
): CollaborativeTaskView {
  const template = SCENE_TASK_TEMPLATES[templateId];
  return {
    id: `ctask-${templateId}-${index}`,
    templateId,
    title: template?.title ?? templateId,
    description: template?.description,
    milestoneId: template?.milestoneId ?? null,
    assigneeUserId: assignee?.userId ?? null,
    assigneeLabel: assignee?.displayName ?? null,
    status: 'pending',
    behaviorLog: [],
  };
}

/** 纯函数 · 成团后协同任务派发（≤6 条，按 vibe 去重） */
export function dispatchCollaborativeTasks(
  input: CollaborativeTaskDispatchInput
): CollaborativeTaskView[] {
  const milestones = resolveMilestoneIds(input.post);
  const tools = toolchainIds(input.post);
  const dispatched = new Map<string, CollaborativeTaskView>();
  let index = 0;

  for (const rule of TASK_ROLE_DISPATCH_MATRIX) {
    if (dispatched.size >= MAX_TASKS) break;

    const briefSource = input.crew.find((m) => !m.isCaptain);
    const brief =
      briefSource && input.decisionBriefsByUserId
        ? input.decisionBriefsByUserId[briefSource.userId]
        : null;

    if (!shouldDispatchRule(rule, milestones, tools, brief)) continue;
    if (dispatched.has(rule.templateId)) continue;

    const assignee = pickAssignee(rule, input.post, input.crew, brief);
    dispatched.set(rule.templateId, toTaskView(rule.templateId, assignee, index++));
  }

  return [...dispatched.values()];
}

export function buildCollaborativeTaskFlywheel(
  post: RecruitmentPostCard,
  approvedApplications: RecruitmentApplicationCard[]
): CollaborativeTaskFlywheelMetadata {
  const decisionBriefsByUserId: Record<string, PreMatchDecisionBrief> = {};
  for (const app of approvedApplications) {
    decisionBriefsByUserId[app.applicantUserId] = buildPreMatchDecisionBrief({ post, application: app });
  }

  const crew: TaskDispatchCrewMember[] = [
    {
      userId: post.captainUserId,
      displayName: post.captainDisplayName ?? '队长',
      mbtiType: post.captainMbtiType,
      slotIndex: 0,
      isCaptain: true,
    },
    ...approvedApplications.map((app, i) => ({
      userId: app.applicantUserId,
      displayName: app.applicantDisplayName,
      mbtiType: app.applicantMbtiType,
      slotIndex: i + 1,
      isCaptain: false,
      roleAnchor: decisionBriefsByUserId[app.applicantUserId]?.suggestedSceneRoleAnchor ?? null,
    })),
  ];

  const tasks = dispatchCollaborativeTasks({
    post,
    crew,
    decisionBriefsByUserId,
  });

  return {
    version: 'collaborative_task_flywheel_v1',
    recruitmentPostId: post.id,
    tasks,
    dispatchedAt: new Date().toISOString(),
  };
}

export function buildCollaborativeTaskPreview(
  post: RecruitmentPostCard,
  approvedApplications: RecruitmentApplicationCard[] = []
): CollaborativeTaskView[] {
  return buildCollaborativeTaskFlywheel(post, approvedApplications).tasks;
}
