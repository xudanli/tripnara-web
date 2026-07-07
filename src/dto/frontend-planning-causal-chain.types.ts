/** tripnara.planning_causal_chain@v1 — 决策因果链 SSOT */

export type PlanningCausalChainSeverity = 'info' | 'warn' | 'risk';

export type PlanningCausalChainNodeSource =
  | 'proposal'
  | 'validation'
  | 'readiness'
  | 'decision_checker'
  | 'world_context'
  | 'option_preview'
  | (string & {});

export type PlanningCausalChainBasisSource = 'mixed' | 'proposal' | 'readiness' | 'decision_checker' | (string & {});

export interface PlanningCausalChainNode {
  id: string;
  order: number;
  severity: PlanningCausalChainSeverity;
  description: string;
  entityLabel?: string;
  itemId?: string;
  netImpactMinutes?: number;
  source?: PlanningCausalChainNodeSource;
}

export interface PlanningCausalChain {
  schema: 'tripnara.planning_causal_chain@v1' | (string & {});
  tripId: string;
  proposalId?: string;
  /** problem 模式绑定；可与 proposalId 并存 */
  problemId?: string;
  generatedAt?: string;
  basisUpdatedAt?: string;
  basisSource?: PlanningCausalChainBasisSource;
  /** BFF 刷新路径，problem 模式含 ?problemId= */
  refreshUrl?: string;
  nodes: PlanningCausalChainNode[];
}

/** 竖链节点圆点 / 文案色（产品语义色） */
export const CAUSAL_CHAIN_SEVERITY_COLORS: Record<
  PlanningCausalChainSeverity,
  { dotClass: string; textClass: string }
> = {
  info: {
    dotClass: 'bg-gate-allow',
    textClass: 'text-foreground',
  },
  warn: {
    dotClass: 'bg-primary/70',
    textClass: 'text-foreground',
  },
  risk: {
    dotClass: 'bg-gate-reject',
    textClass: 'text-gate-reject-foreground',
  },
};

/** 「刷新依据 · 3 分钟前」 */
export function formatCausalChainBasisAge(basisUpdatedAt: string | undefined, now = Date.now()): string | null {
  if (!basisUpdatedAt) return null;
  const parsed = Date.parse(basisUpdatedAt);
  if (!Number.isFinite(parsed)) return null;

  const diffMs = Math.max(0, now - parsed);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function sortCausalChainNodes(nodes: PlanningCausalChainNode[]): PlanningCausalChainNode[] {
  return [...nodes].sort((a, b) => a.order - b.order);
}

/** decision-checker impact.cascade[] → 竖链节点（无 BFF / readiness 时客户端兜底） */
export function planningCausalChainNodesFromCheckerCascade(
  cascade: ReadonlyArray<{
    id: string;
    title: string;
    description: string;
    status: 'affected' | 'at_risk' | 'ok';
    order: number;
  }> | null | undefined,
): PlanningCausalChainNode[] {
  if (!cascade?.length) return [];

  return sortCausalChainNodes(
    cascade.map((node) => ({
      id: node.id,
      order: node.order,
      severity: checkerCascadeStatusToSeverity(node.status),
      description: node.description.trim() || node.title,
      source: 'decision_checker' as const,
    })),
  );
}

function checkerCascadeStatusToSeverity(
  status: 'affected' | 'at_risk' | 'ok',
): PlanningCausalChainSeverity {
  if (status === 'at_risk') return 'risk';
  if (status === 'affected') return 'warn';
  return 'info';
}
