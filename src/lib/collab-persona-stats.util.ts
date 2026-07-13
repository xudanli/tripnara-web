import type { FrictionMatrixPair, FrictionRadarData } from '@/types/trip-decision-profiling';
import { aggregateFrictionByDomain } from '@/lib/collab-friction-domains';

export interface PersonaBannerStats {
  teamSync: number;
  teamSyncLabel: string;
  frictionScore: number;
  frictionLabel: string;
  budgetOverlapPct: number;
  budgetLabel: string;
  paceSyncPct: number;
  paceLabel: string;
}

function bandLabelForScore(score: number, highGood = true): string {
  if (highGood) {
    if (score >= 75) return '良好';
    if (score >= 55) return '中等';
    return '待对齐';
  }
  if (score <= 35) return '较低';
  if (score <= 55) return '中等摩擦';
  return '较高摩擦';
}

export function personaStatLabelTone(label: string): string {
  if (/良好|较高|较低摩擦/.test(label) && !/中等/.test(label)) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (/中等|待对齐|较高摩擦/.test(label)) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-muted-foreground';
}

/** 顶栏四指标 + AI 摘要数据源 */
export function buildPersonaBannerStats(
  friction: FrictionRadarData | null | undefined,
): PersonaBannerStats {
  const compat = friction?.compatibility;
  const teamSync = compat ? Math.round(compat.overallScore) : 0;

  const domainRows = aggregateFrictionByDomain(friction?.frictionMatrix ?? []);
  const frictionScore =
    domainRows.length > 0
      ? Math.round(domainRows.reduce((sum, row) => sum + row.score, 0) / domainRows.length)
      : compat
        ? Math.max(0, Math.round(100 - compat.overallScore * 0.45))
        : 0;

  const budgetOverlapPct = compat ? Math.round(compat.budgetOverlapPct) : 0;
  const paceSyncPct = compat ? Math.round(compat.paceSyncPct) : 0;

  return {
    teamSync,
    teamSyncLabel: compat?.bandLabel ?? bandLabelForScore(teamSync),
    frictionScore,
    frictionLabel: bandLabelForScore(frictionScore, false),
    budgetOverlapPct,
    budgetLabel: bandLabelForScore(budgetOverlapPct),
    paceSyncPct,
    paceLabel: paceSyncPct >= 75 ? '较高' : bandLabelForScore(paceSyncPct),
  };
}

export interface PersonaAiSummaryView {
  text: string;
  prefix?: string;
  highlights?: string[];
  suffix?: string;
}

export function buildPersonaAiSummaryView(
  friction: FrictionRadarData | null | undefined,
  teamCompletionRate: number,
): PersonaAiSummaryView {
  if (!friction?.compatibility) {
    return {
      text: '完成 Travel Style 与 Money DNA 调查后，AI 将生成团队合拍度、摩擦预警与分摊建议。',
    };
  }

  if (teamCompletionRate < 50) {
    return {
      text: `已有 ${Math.round(teamCompletionRate)}% 成员完成调查。建议邀请全员完成测评，以解锁完整摩擦矩阵与分摊共识。`,
    };
  }

  const { overallScore, budgetOverlapPct, paceSyncPct } = friction.compatibility;
  const alertDomains = [
    ...new Set(friction.highRiskAlerts.slice(0, 2).map((alert) => alert.domainLabel)),
  ];

  if (overallScore >= 65 && alertDomains.length >= 1) {
    const frictionTopics =
      alertDomains.length >= 2
        ? `${alertDomains[0]}和${alertDomains[1]}`
        : alertDomains[0] === '预算'
          ? '预算敏感度和住宿标准'
          : `${alertDomains[0]}相关偏好`;

    return {
      text: `整体来看，你们是风格互补、节奏较为同步的团队，合拍度良好。${frictionTopics}是当前主要摩擦来源，建议优先在预算上达成共识，并在住宿标准上开展协商，以提升决策效率与旅行体验。`,
      prefix: '整体来看，你们是风格互补、节奏较为同步的团队，合拍度良好。',
      highlights:
        alertDomains.length >= 2
          ? [alertDomains[0] === '预算' ? '预算敏感度' : alertDomains[0], alertDomains[1]]
          : ['预算敏感度', '住宿标准'],
      suffix:
        '是当前主要摩擦来源，建议优先在预算上达成共识，并在住宿标准上开展协商，以提升决策效率与旅行体验。',
    };
  }

  const parts = [
    `团队整体合拍度 ${Math.round(overallScore)}/100，节奏同步 ${paceSyncPct}%。`,
    budgetOverlapPct < 60
      ? `预算重合 ${budgetOverlapPct}%，建议在协作决策中对齐消费预期。`
      : `预算重合 ${budgetOverlapPct}%，消费预期相对一致。`,
    friction.highRiskAlerts.length > 0
      ? `检测到 ${friction.highRiskAlerts.length} 个高风险摩擦点，建议优先处理。`
      : null,
  ].filter(Boolean);

  return { text: parts.join('') };
}

export function buildPersonaAiSummary(
  friction: FrictionRadarData | null | undefined,
  teamCompletionRate: number,
): string {
  return buildPersonaAiSummaryView(friction, teamCompletionRate).text;
}
