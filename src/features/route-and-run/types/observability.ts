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
