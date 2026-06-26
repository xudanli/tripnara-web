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

export type MemoryContractObs = {
  revision: string;
  loaded: boolean;
  layers: string[];
  constraint_sink?: MemoryContractConstraintSink;
};
