import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { PreMatchDecisionBrief, PreMatchNoiseDriver } from '@/types/collaborative-task-flywheel';
import type { TrekkingEventStreamMilestone } from '@/types/trekking-vibe-orchestration';
import { SCENE_TASK_TEMPLATES, SYNTHETIC_MILESTONES } from './scene-task-templates.config';
import { SCENE_ROLE_LABELS } from './task-role-dispatch-matrix.config';

export type PreMatchDecisionInput = {
  post: Pick<
    RecruitmentPostCard,
    | 'captainMbtiType'
    | 'planningStyle'
    | 'teamworkStyle'
    | 'trekkingOrchestration'
    | 'routeTemplateCatalogId'
    | 'vibeLlm'
    | 'vibeParse'
    | 'recruitmentVision'
    | 'teamworkMatchBlocked'
  >;
  application: Pick<
    RecruitmentApplicationCard,
    | 'applicantMbtiType'
    | 'applicantInteractionMode'
    | 'compatibilityPercent'
    | 'warnings'
    | 'teamworkCommitmentAccepted'
    | 'applicantDisplayName'
  >;
};

const HIGH_CONTROL_MBTI = new Set(['INTJ', 'ENTJ', 'ESTJ', 'ISTJ']);
const FOLLOWER_MBTI = new Set(['ISFP', 'INFP', 'ISFJ', 'ESFP']);
const ANXIETY_MBTI = new Set(['INFP', 'ISFP', 'ENFP']);

function captainControlScore(post: PreMatchDecisionInput['post']): number {
  let score = 0;
  const style = post.planningStyle ?? post.teamworkStyle;
  if (style === 'full_managed') score += 0.45;
  if (style === 'co_planning') score += 0.25;
  if (HIGH_CONTROL_MBTI.has(post.captainMbtiType)) score += 0.35;
  return Math.min(1, score);
}

function applicantAnxietyScore(application: PreMatchDecisionInput['application']): number {
  let score = 0;
  if (ANXIETY_MBTI.has(application.applicantMbtiType)) score += 0.35;
  if (application.applicantInteractionMode === 'easy_companion') score += 0.2;
  const blob = (application.warnings ?? []).join(' ');
  if (/焦虑|不安|担心|紧张/i.test(blob)) score += 0.35;
  if (!application.teamworkCommitmentAccepted) score += 0.1;
  return Math.min(1, score);
}

function resolveMilestones(post: PreMatchDecisionInput['post']): TrekkingEventStreamMilestone[] {
  const fromPlan = post.trekkingOrchestration?.eventStreamMilestones ?? [];
  const profile = post.trekkingOrchestration?.worldModel?.profile;
  const blob = [
    post.recruitmentVision ?? '',
    ...(post.vibeLlm?.chips?.map((c) => c.label) ?? []),
    ...(post.vibeParse?.vibe_chips ?? []),
    post.routeTemplateCatalogId ?? '',
  ].join(' ');

  const milestones = [...fromPlan];
  const ids = new Set(milestones.map((m) => m.id));

  if (
    profile === 'heavy_offline_dem' ||
    /Laugavegur|兰格维格|Landmannalaugar|DEM|内陆.*断网/i.test(blob) ||
    post.routeTemplateCatalogId === 'is_laugavegur_55km_heavy_4d'
  ) {
    if (!ids.has(SYNTHETIC_MILESTONES.dem_blind_nav.id)) {
      milestones.push(SYNTHETIC_MILESTONES.dem_blind_nav);
    }
  }

  if (
    /涉水|融水|ford|Fjórðungakvísl|冰川河/i.test(blob) ||
    post.routeTemplateCatalogId === 'is_laugavegur_55km_heavy_4d'
  ) {
    if (!ids.has(SYNTHETIC_MILESTONES.glacier_river_ford.id)) {
      milestones.push(SYNTHETIC_MILESTONES.glacier_river_ford);
    }
  }

  return milestones;
}

function hasMilestone(milestones: TrekkingEventStreamMilestone[], id: string): boolean {
  return milestones.some((m) => m.id === id);
}

function hardMetricsPass(input: PreMatchDecisionInput): boolean {
  if (input.post.teamworkMatchBlocked) return false;
  if (input.application.compatibilityPercent < 55) return false;
  return true;
}

/** 纯函数 CSP 噪音预演 + 角色锚定 + 对冲任务 */
export function buildPreMatchDecisionBrief(input: PreMatchDecisionInput): PreMatchDecisionBrief {
  const milestones = resolveMilestones(input.post);
  const drivers: PreMatchNoiseDriver[] = [];
  let noise = 4;

  const cControl = captainControlScore(input.post);
  const anxiety = applicantAnxietyScore(input.application);
  const follower = FOLLOWER_MBTI.has(input.application.applicantMbtiType);

  if (hasMilestone(milestones, 'dem_blind_nav')) {
    const delta = Math.round(6 + cControl * 8 + anxiety * 6);
    noise += delta;
    drivers.push({
      milestoneId: 'dem_blind_nav',
      label: SYNTHETIC_MILESTONES.dem_blind_nav.label,
      factor: `dem_blind_nav × ${cControl >= 0.5 ? '指挥官风格' : '计划硬度'}${anxiety >= 0.35 ? ' × 高焦虑' : ''}`,
    });
  }

  if (hasMilestone(milestones, 'glacier_river_ford') && follower) {
    noise += 4;
    drivers.push({
      milestoneId: 'glacier_river_ford',
      label: SYNTHETIC_MILESTONES.glacier_river_ford.label,
      factor: '强涉水段 × 体验型跟从偏好',
    });
  }

  if (cControl >= 0.5 && follower && input.application.applicantInteractionMode === 'easy_companion') {
    noise += 3;
    drivers.push({
      label: '组队风格',
      factor: '高 control 队长 × 轻松陪伴型队员',
    });
  }

  noise = Math.min(100, Math.max(0, noise));

  const metricsPass = hardMetricsPass(input);
  let roleAnchor: string | null = null;
  let roleLabel: string | null = null;
  const mitigating: string[] = [];

  if (
    hasMilestone(milestones, 'dem_blind_nav') &&
    anxiety >= 0.3 &&
    cControl >= 0.45
  ) {
    roleAnchor = 'blind_box_follower';
    roleLabel = SCENE_ROLE_LABELS.blind_box_follower;
  }

  if (noise >= 15 && roleAnchor === 'blind_box_follower') {
    mitigating.push('pre_trip_safety_blueprint');
  }

  if (hasMilestone(milestones, 'dem_blind_nav')) {
    mitigating.push('satellite_dem_offline_verify');
  }

  const uniqueMitigating = [...new Set(mitigating)];

  const mitigatingLabels = uniqueMitigating
    .map((id) => SCENE_TASK_TEMPLATES[id]?.title)
    .filter(Boolean);

  let narrativeLine = '';
  if (metricsPass && noise >= 8) {
    narrativeLine =
      `🤖 TripNARA 决策引擎提示：该申请人综合硬指标${metricsPass ? '通过' : '未通过'}。` +
      (drivers.length
        ? `但在行中遭遇『${drivers[0]?.label ?? '关键里程碑'}』里程碑时，与你的${cControl >= 0.5 ? '指挥官' : '组队'}风格可能产生 **${noise}%** 的协作噪音。`
        : `行中协作噪音预测约 **${noise}%**。`) +
      (roleLabel
        ? ` AI 决策建议：若吸纳该成员，建议将其角色锚定为 **[${roleLabel}]**` +
          (mitigatingLabels.length
            ? `，并在行程模块中前置锁死 **[${mitigatingLabels.join(' / ')}]** 以对冲行中焦虑。`
            : '。')
        : ' AI 建议：关注行中协同节奏，必要时前置协同任务。');
  } else if (metricsPass) {
    narrativeLine =
      `🤖 TripNARA 决策引擎提示：硬指标通过，行中协作噪音较低（约 ${noise}%），可按常规拼图槽位审批。`;
  } else {
    narrativeLine =
      '🤖 TripNARA 决策引擎提示：硬指标未完全通过，请结合拼图槽位与 Hard Gate 独立判断。';
  }

  return {
    hardMetricsPass: metricsPass,
    inTripCollaborationNoisePercent: noise,
    noiseDrivers: drivers,
    suggestedSceneRoleAnchor: roleAnchor,
    suggestedSceneRoleLabel: roleLabel,
    mitigatingTaskTemplateIds: uniqueMitigating,
    narrativeLine,
  };
}
