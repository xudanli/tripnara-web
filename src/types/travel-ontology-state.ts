/** result.payload.travelOntologyState — 行程本体执行态（L1 动词 + 实体摘要） */

export interface TravelOntologyVerb {
  id: string;
  label: string;
  kind?: string;
  status?: string;
  riskLevel?: string;
}

export interface TravelOntologyEntitySummary {
  id?: string;
  label: string;
  kind?: string;
  status?: string;
}

export interface TravelOntologyState {
  summary?: string;
  verbs?: TravelOntologyVerb[];
  flights?: TravelOntologyEntitySummary[];
  hotels?: TravelOntologyEntitySummary[];
  activities?: TravelOntologyEntitySummary[];
  /** 待用户确认的动词数量 */
  pendingConfirmCount?: number;
}
