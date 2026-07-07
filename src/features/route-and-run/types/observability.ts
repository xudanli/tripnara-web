/** route_and_run memory observability.layers 中协作记忆 digest 层名（调试 / replay 用） */
export const MEMORY_CONTRACT_DIGEST_LAYERS = {
  TRIP_DOMAIN_INFLUENCE: 'trip_domain_influence_digest',
  TRIP_WISH_CONSTRAINT: 'trip_wish_constraint_digest',
} as const;

/** observability.memory_contract.constraint_sink */
export type MemoryContractConstraintSink = {
  hydrated: boolean;
  applied_keys?: string[];
  patch_ids?: string[];
  overridden_by_request_keys?: string[];
};

/** observability.ledger_healing（V1.6） */
export type LedgerHealingObs = {
  status?: string;
  affected_node_ids?: string[];
  user_decision_by_node_id?: Record<string, string>;
};

export type MemoryContractObs = {
  revision: string;
  loaded: boolean;
  layers: string[];
  constraint_sink?: MemoryContractConstraintSink;
  /** V1.6.1 — 与 Memory Console decision_ledger_causality 同结构 */
  decision_ledger_causality?: Record<string, unknown>;
};
