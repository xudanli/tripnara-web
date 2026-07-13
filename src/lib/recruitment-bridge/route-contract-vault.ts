import type { PlanningStyle } from '@/types/match-square';
import type { RouteContractLockPlan } from '@/types/route-template-intent';
import type { RouteTemplateCatalogEntry } from './route-template-intent/route-template-intent-bindings.config';
import { getCatalogEntryById } from './route-template-plaza-bridge';

function formatLockAmount(cents: number, currency?: string): string {
  const major = cents / 100;
  const cur = currency ?? 'CNY';
  if (cur === 'CNY') return `¥${major.toLocaleString('zh-CN')}`;
  return `${major.toLocaleString('zh-CN')} ${cur}`;
}

export function buildRouteContractLockPlan(
  catalogId: string,
  planningStyle: PlanningStyle = 'co_planning'
): RouteContractLockPlan | null {
  const entry = getCatalogEntryById(catalogId);
  if (!entry?.routeContractLockEnabled || !entry.vaultMilestones?.length) return null;

  const captainCanRollback = planningStyle === 'full_managed';
  const rollbackHint = captainCanRollback
    ? '全托管队长可在极端情况下发布路线 rollback（需全队二次确认）。'
    : '本队非全托管基因 — 严格按模板里程碑节奏，队长无权单方面改线。';

  return {
    templateTitle: entry.titleZh,
    catalogId: entry.catalogId,
    enabled: true,
    milestones: entry.vaultMilestones,
    captainCanRollback,
    rollbackHint,
    contractSummary:
      '全员确认加入 = 签署 MBTI 契约 + 授权路线模板里程碑；对应节点资金将由 Trip Vault 智能托管锁死。',
  };
}

export function sumVaultMilestoneCents(milestones: RouteContractLockPlan['milestones']): number {
  return milestones.reduce((sum, m) => sum + (m.lockAmountCents ?? 0), 0);
}

export function formatVaultMilestoneAmount(
  milestone: RouteContractLockPlan['milestones'][number]
): string | null {
  if (milestone.lockAmountCents == null) return null;
  return formatLockAmount(milestone.lockAmountCents, milestone.currency);
}

export function routeContractAppliesToCatalog(entry: RouteTemplateCatalogEntry | undefined): boolean {
  return Boolean(entry?.routeContractLockEnabled && entry.vaultMilestones?.length);
}
