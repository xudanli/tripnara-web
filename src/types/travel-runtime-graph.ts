/** route_and_run explain.travel_runtime_graph — Travel Runtime 调试视图 */

export interface TravelRuntimeGraphEntityRef {
  kind?: string;
  id?: string;
  label?: string;
}

export interface TravelRuntimeGraphNode {
  id: string;
  kind?: string;
  label?: string;
  status?: string;
  entityRef?: TravelRuntimeGraphEntityRef;
  metadata?: Record<string, unknown>;
}

export interface TravelRuntimeGraphEdge {
  id?: string;
  from: string;
  to: string;
  kind?: string;
  label?: string;
  weight?: number;
}

export interface TravelRuntimeGraphTrigger {
  id?: string;
  kind?: string;
  label?: string;
  factType?: string;
  message?: string;
}

export interface TravelRuntimeGraph {
  version?: string;
  trigger?: TravelRuntimeGraphTrigger;
  nodes: TravelRuntimeGraphNode[];
  edges: TravelRuntimeGraphEdge[];
  summary?: string;
  metadata?: Record<string, unknown>;
}
