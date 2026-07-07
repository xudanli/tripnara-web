/** GET /api/agent/memory/v1/console 响应（与 fixtures/agent/memory-console.console.v1.json 对齐） */

export type MemoryConsoleL1V1 = {
  pace_preference?: string;
  budget_preference?: string;
  accommodation_preference?: string;
  travel_mode_preference?: string;
  client_acknowledged?: boolean;
  [key: string]: unknown;
};

export type MemoryConsoleL2EntryV1 = {
  id: string;
  summary_zh: string;
  source_layer?: string;
  created_at?: string;
};

export type MemoryConsoleConstraintPatchV1 = {
  patch_id: string;
  summary_zh: string;
  applied_keys?: string[];
  created_at?: string;
};

export type MemoryConsoleDecisionLedgerLinkV1 = {
  ledger_node_id: string;
  decision_id: string;
  problem_id?: string;
  decided_at?: string;
  status?: string;
  source: 'trip_metadata' | 'ledger_caused_by' | 'merged';
};

export type MemoryConsoleDecisionLedgerCausalityV1 = {
  revision: 'v1';
  trip_id: string;
  ledger_node_to_decision_id: Record<string, string>;
  links: MemoryConsoleDecisionLedgerLinkV1[];
  decision_records_count: number;
  ledger_snapshot_version?: number;
};

export type MemoryConsoleV1Response = {
  revision: string;
  user_id?: string;
  l0?: Record<string, unknown>;
  l1?: MemoryConsoleL1V1;
  l2?: MemoryConsoleL2EntryV1[];
  l2_recent?: MemoryConsoleL2EntryV1[];
  trip_constraints?: unknown;
  trip?: {
    trip_id: string;
    constraint_patches?: MemoryConsoleConstraintPatchV1[];
  };
  decision_ledger_causality?: MemoryConsoleDecisionLedgerCausalityV1;
  meta?: {
    l2_total_count?: number;
    feature_flags?: {
      constraint_sink?: boolean;
      memory_console?: boolean;
      decision_semantics?: boolean;
    };
  };
};

export type PatchMemoryConsoleL1Body = Partial<MemoryConsoleL1V1> & {
  client_acknowledged?: boolean;
};

export type MemoryExportV1Response = Record<string, unknown>;
