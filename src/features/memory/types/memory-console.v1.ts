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

export type MemoryConsoleV1Response = {
  revision: string;
  l0?: Record<string, unknown>;
  l1?: MemoryConsoleL1V1;
  l2?: MemoryConsoleL2EntryV1[];
  trip?: {
    trip_id: string;
    constraint_patches?: MemoryConsoleConstraintPatchV1[];
  };
};

export type PatchMemoryConsoleL1Body = Partial<MemoryConsoleL1V1> & {
  client_acknowledged?: boolean;
};

export type MemoryExportV1Response = Record<string, unknown>;
