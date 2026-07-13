import type {
  DecisionReplayResponse,
  TemplateBackflowPreview,
} from '@/types/active-trip-decision-replay';
import { getActiveTripInstantiateContext, getPendingRollbackProposal } from './active-trip-context-store';
import { getAuthorizedVaultMilestones } from './vault-authorization-store';

export function buildDecisionReplayMock(tripId: string): DecisionReplayResponse {
  const ctx = getActiveTripInstantiateContext(tripId);
  const rollback = getPendingRollbackProposal(tripId);
  const vaultSigned = getAuthorizedVaultMilestones(tripId);
  const post = ctx?.postSnapshot;
  const sealedAt = ctx?.instantiatedAt ?? new Date().toISOString();

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
    `成团策略 ${ctx?.plan.strategy ?? '—'}。` +
    (vaultSigned.length ? ` Vault 已签署 ${vaultSigned.length} 个里程碑。` : ' Vault 授权仍待队员完成。');

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
          : '未绑定路线模板，决策回放仅含成团与 Vault 事件。',
      },
      {
        persona: 'neptune',
        titleZh: 'Neptune · 世界模型',
        bodyZh: post?.trekkingOrchestration?.displayHeadline
          ? `World Model 锚点：${post.trekkingOrchestration.displayHeadline}。情境卡片 ${ctx?.plan.contextualCardIds?.length ?? 0} 张已挂载行中工具箱。`
          : '情境卡片由 vibe 芯片驱动，行中按需深链工具路由。',
      },
    ],
    flywheelAuditReport: null,
  };
}

export function buildTemplateBackflowPreviewMock(tripId: string): TemplateBackflowPreview {
  const ctx = getActiveTripInstantiateContext(tripId);
  const post = ctx?.postSnapshot;

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
    taskCompletionRate: undefined,
  };
}
