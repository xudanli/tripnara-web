import type {
  DecisionReplayResponse,
  TemplateBackflowPreview,
} from '@/types/active-trip-decision-replay';
import { getActiveTripInstantiateContext, getPendingRollbackProposal } from './active-trip-context-store';
import { getAuthorizedVaultMilestones } from './vault-authorization-store';
import { getStoredCollaborativeTaskFlywheel } from '@/features/match-square/lib/decision-engine/collaborative-task-flywheel-mock';

export function buildDecisionReplayMock(tripId: string): DecisionReplayResponse {
  const ctx = getActiveTripInstantiateContext(tripId);
  const flywheel = getStoredCollaborativeTaskFlywheel(tripId);
  const rollback = getPendingRollbackProposal(tripId);
  const vaultSigned = getAuthorizedVaultMilestones(tripId);
  const post = ctx?.postSnapshot;
  const sealedAt = ctx?.instantiatedAt ?? flywheel?.dispatchedAt ?? new Date().toISOString();

  const timeline: DecisionReplayResponse['timeline'] = [
    {
      id: 'evt-instantiate',
      at: sealedAt,
      labelZh: post
        ? `成团 sealed · ${post.destination}（${ctx?.plan.strategy ?? 'instantiate'}）`
        : 'Active Trip 实例化',
      kind: 'instantiate',
    },
  ];

  for (const task of flywheel?.tasks ?? []) {
    for (const log of task.behaviorLog ?? []) {
      timeline.push({
        id: `evt-${task.id}-${log.at}`,
        at: log.at,
        labelZh: `${task.title} · ${log.action === 'confirm' ? '已确认' : log.action === 'rollback' ? '已回滚' : '超时'}`,
        kind: log.action === 'confirm' ? 'task_confirmed' : 'task_rollback',
      });
    }
  }

  if (rollback) {
    timeline.push({
      id: `evt-rollback-${rollback.proposalId}`,
      at: rollback.createdAt,
      labelZh: `Rollback 提案：${rollback.reasonZh.slice(0, 48)}…`,
      kind: 'rollback_proposal',
    });
  }

  for (const mid of vaultSigned) {
    timeline.push({
      id: `evt-vault-${mid}`,
      at: new Date().toISOString(),
      labelZh: `Vault 里程碑已授权 · ${mid}`,
      kind: 'vault_authorize',
    });
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));

  const destination = post?.destination ?? '本次行程';
  const abuNarrative =
    `Abu 复盘：你们在 ${destination} 的 Active Trip 已完成决策链点火。` +
    `成团策略 ${ctx?.plan.strategy ?? '—'}，协同任务 ${flywheel?.tasks.length ?? 0} 条。` +
    (vaultSigned.length ? ` Vault 已签署 ${vaultSigned.length} 个里程碑。` : ' Vault 授权仍待队员完成。');

  const firstApp = ctx?.approvedApplications?.[0];
  const confirmedTasks = (flywheel?.tasks ?? []).filter((t) => t.status === 'confirmed').length;
  const flywheelAuditReport =
    flywheel && flywheel.tasks.length > 0
      ? {
          snapshotId: `mock-audit-${tripId.slice(0, 8)}`,
          applicationId: firstApp?.id ?? 'mock-application',
          tripId,
          match: confirmedTasks >= Math.ceil(flywheel.tasks.length / 2),
          predictionFingerprint: `pred-${ctx?.plan.strategy ?? 'flywheel'}-${flywheel.tasks.length}`,
          observationFingerprint: `obs-${confirmedTasks}-${flywheel.tasks.length}`,
          comparablePredictionFp: `cmp-pred-${tripId.slice(0, 8)}`,
          comparableObservationFp: `cmp-obs-${confirmedTasks}`,
          signals: {
            noisePredictionValidated: confirmedTasks > 0,
            roleAnchorObserved: Boolean(firstApp?.applicantMbtiType),
          },
          assertions: [
            {
              id: 'task_completion_rate',
              passed: confirmedTasks > 0,
              message:
                confirmedTasks > 0
                  ? `协同任务确认率 ${Math.round((confirmedTasks / flywheel.tasks.length) * 100)}% 与行前预测一致`
                  : '尚无已确认协同任务，观测样本不足',
            },
            {
              id: 'flywheel_dispatched',
              passed: true,
              message: `飞轮已于 ${new Date(flywheel.dispatchedAt).toLocaleString('zh-CN')} 派发 ${flywheel.tasks.length} 条任务`,
            },
          ],
          note: 'Mock · 对应后端 collab_flywheel_audit_snapshots 只读对撞',
        }
      : null;

  return {
    tripId,
    timeline,
    abuNarrative,
    personaSections: [
      {
        persona: 'abu',
        titleZh: 'Abu · 首席叙事官',
        bodyZh: abuNarrative,
      },
      {
        persona: 'drDre',
        titleZh: 'Dr.Dre · 约束编排',
        bodyZh: post?.routeTemplateCatalogId
          ? `路线模板 ${post.routeTemplateCatalogId} 的里程碑顺序与 Vault 锁态已写入决策日志；全托管队长 rollback 权限=${post.planningStyle === 'full_managed'}.`
          : '未绑定路线模板，决策回放仅含拼团与任务飞轮事件。',
      },
      {
        persona: 'neptune',
        titleZh: 'Neptune · 世界模型',
        bodyZh: post?.trekkingOrchestration?.displayHeadline
          ? `World Model 锚点：${post.trekkingOrchestration.displayHeadline}。情境卡片 ${ctx?.plan.contextualCardIds?.length ?? 0} 张已挂载行中工具箱。`
          : '情境卡片由 vibe 芯片驱动，行中按需深链工具路由。',
      },
    ],
    flywheelAuditReport,
  };
}

export function buildTemplateBackflowPreviewMock(tripId: string): TemplateBackflowPreview {
  const ctx = getActiveTripInstantiateContext(tripId);
  const post = ctx?.postSnapshot;

  const flywheel = getStoredCollaborativeTaskFlywheel(tripId);
  const tasks = flywheel?.tasks ?? [];
  const confirmed = tasks.filter((t) => t.status === 'confirmed').length;
  const crewSize =
    (ctx?.approvedApplications.length ?? 0) + (ctx?.postSnapshot ? 1 : 0);

  return {
    tripId,
    canBackflow: Boolean(post?.routeTemplateCatalogId || post?.trekkingOrchestration),
    suggestedCatalogId: post?.routeTemplateCatalogId ?? null,
    previewTitleZh: post
      ? `${post.destination} · 行后模板范例（预览，不写 DB）`
      : '行后模板回流预览',
    derivedFields: {
      itinerary_summary:
        post?.itinerarySummary ||
        post?.recruitmentVision?.slice(0, 120) ||
        undefined,
      captain_message: post?.captainMessage ?? undefined,
    },
    anonymizedCrewSize: crewSize || undefined,
    taskCompletionRate: tasks.length ? confirmed / tasks.length : undefined,
  };
}
