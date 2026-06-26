import type {
  TravelRuntimeGraph,
  TravelRuntimeGraphEdge,
  TravelRuntimeGraphNode,
  TravelRuntimeGraphTrigger,
} from '@/types/travel-runtime-graph';
import type { RouteAndRunResponse } from '@/api/agent';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeEntityRef(raw: unknown): TravelRuntimeGraphNode['entityRef'] | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const kind = pickStr(o, 'kind');
  const id = pickStr(o, 'id');
  const label = pickStr(o, 'label');
  if (!kind && !id && !label) return undefined;
  return { kind, id, label };
}

function normalizeTrigger(raw: unknown): TravelRuntimeGraphTrigger | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const label = pickStr(o, 'label', 'name', 'title');
  const message = pickStr(o, 'message', 'summary', 'description');
  const factType = pickStr(o, 'factType', 'fact_type', 'kind', 'type');
  const id = pickStr(o, 'id');
  const kind = pickStr(o, 'kind', 'type');
  if (!label && !message && !factType && !id) return undefined;
  return {
    ...(id ? { id } : {}),
    ...(kind ? { kind } : {}),
    ...(label ? { label } : {}),
    ...(factType ? { factType } : {}),
    ...(message ? { message } : {}),
  };
}

function normalizeNode(raw: unknown): TravelRuntimeGraphNode | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = pickStr(o, 'id', 'node_id', 'nodeId');
  if (!id) return null;
  const entityRef = normalizeEntityRef(o.entityRef ?? o.entity_ref);
  const label =
    pickStr(o, 'label', 'name', 'title') ?? entityRef?.label ?? id;
  const metadata =
    asRecord(o.metadata) ??
    (Object.keys(o).length > 0 ? { ...o } : undefined);

  return {
    id,
    kind: pickStr(o, 'kind', 'type', 'node_kind', 'nodeKind'),
    label,
    status: pickStr(o, 'status', 'state'),
    ...(entityRef ? { entityRef } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function normalizeEdge(raw: unknown): TravelRuntimeGraphEdge | null {
  const o = asRecord(raw);
  if (!o) return null;
  const from =
    pickStr(o, 'from', 'source', 'source_id', 'sourceId', 'from_id', 'fromId') ?? '';
  const to =
    pickStr(o, 'to', 'target', 'target_id', 'targetId', 'to_id', 'toId') ?? '';
  if (!from || !to) return null;
  const weightRaw = o.weight ?? o.hop ?? o.propagation_hop;
  const weight =
    typeof weightRaw === 'number' && Number.isFinite(weightRaw) ? weightRaw : undefined;

  return {
    ...(pickStr(o, 'id', 'edge_id', 'edgeId') ? { id: pickStr(o, 'id', 'edge_id', 'edgeId') } : {}),
    from,
    to,
    kind: pickStr(o, 'kind', 'type', 'relation', 'edge_kind', 'edgeKind'),
    label: pickStr(o, 'label', 'name', 'title'),
    ...(weight != null ? { weight } : {}),
  };
}

export function normalizeTravelRuntimeGraph(raw: unknown): TravelRuntimeGraph | null {
  const o = asRecord(raw);
  if (!o) return null;

  const nodesRaw = o.nodes ?? o.node_list ?? o.nodeList;
  const edgesRaw = o.edges ?? o.edge_list ?? o.edgeList ?? o.links;

  const nodes = Array.isArray(nodesRaw)
    ? nodesRaw.map(normalizeNode).filter((n): n is TravelRuntimeGraphNode => n != null)
    : [];
  const edges = Array.isArray(edgesRaw)
    ? edgesRaw.map(normalizeEdge).filter((e): e is TravelRuntimeGraphEdge => e != null)
    : [];

  const trigger = normalizeTrigger(o.trigger ?? o.root_trigger ?? o.rootTrigger);
  const summary = pickStr(o, 'summary', 'description');
  const version = pickStr(o, 'version', 'schema', 'schema_version', 'schemaVersion');

  if (nodes.length === 0 && edges.length === 0 && !trigger && !summary) return null;

  return {
    ...(version ? { version } : {}),
    ...(trigger ? { trigger } : {}),
    nodes,
    edges,
    ...(summary ? { summary } : {}),
    ...(asRecord(o.metadata) ? { metadata: asRecord(o.metadata) } : {}),
  };
}

export function pickTravelRuntimeGraphFromExplain(explain: unknown): TravelRuntimeGraph | null {
  if (!explain || typeof explain !== 'object') return null;
  const o = explain as Record<string, unknown>;
  return (
    normalizeTravelRuntimeGraph(o.travel_runtime_graph ?? o.travelRuntimeGraph) ??
    normalizeTravelRuntimeGraph(o.runtime_graph ?? o.runtimeGraph)
  );
}

export function pickTravelRuntimeGraphFromRouteRun(
  response: RouteAndRunResponse
): TravelRuntimeGraph | null {
  const fromExplain = pickTravelRuntimeGraphFromExplain(response.explain);
  if (fromExplain) return fromExplain;

  const payload = response.result?.payload;
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  return (
    normalizeTravelRuntimeGraph(p.travel_runtime_graph ?? p.travelRuntimeGraph) ??
    normalizeTravelRuntimeGraph(p.runtime_graph ?? p.runtimeGraph)
  );
}

export function hasTravelRuntimeGraphContent(graph: TravelRuntimeGraph | null | undefined): boolean {
  if (!graph) return false;
  return (
    Boolean(graph.trigger) ||
    Boolean(graph.summary?.trim()) ||
    graph.nodes.length > 0 ||
    graph.edges.length > 0
  );
}

export function resolveTravelRuntimeNodeLabel(
  nodeId: string,
  nodes: TravelRuntimeGraphNode[]
): string {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.label ?? node?.entityRef?.label ?? nodeId;
}

export const TRAVEL_RUNTIME_GRAPH_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_TRAVEL_RUNTIME_GRAPH_MOCK === 'true';

export function getTravelRuntimeGraphMock(): TravelRuntimeGraph {
  return {
    version: 'tripnara.travel_runtime_graph@v1',
    summary: 'F-road 封闭触发 POI 可达性与当日 buffer 传播（mock）',
    trigger: {
      id: 'trigger-road-1',
      kind: 'FACT',
      factType: 'ROAD',
      label: 'F-road 临时封闭',
      message: '高地路段封闭，下游 POI 与当日节奏受影响',
    },
    nodes: [
      {
        id: 'fact-road-1',
        kind: 'FACT',
        label: 'F-road 封闭',
        status: 'ACTIVE',
      },
      {
        id: 'poi-1',
        kind: 'POI',
        label: '斯卡夫塔山',
        status: 'AFFECTED',
        entityRef: { kind: 'POI', id: 'poi-1', label: '斯卡夫塔山' },
      },
      {
        id: 'day-3',
        kind: 'DAY',
        label: '第 3 天',
        status: 'ABSORBED',
      },
    ],
    edges: [
      { from: 'fact-road-1', to: 'poi-1', kind: 'CASCADE', weight: 1 },
      { from: 'poi-1', to: 'day-3', kind: 'SCHEDULE', weight: 2 },
    ],
  };
}

export function resolveTravelRuntimeGraphForDev(
  graph: TravelRuntimeGraph | null
): TravelRuntimeGraph | null {
  if (graph && hasTravelRuntimeGraphContent(graph)) return graph;
  if (!TRAVEL_RUNTIME_GRAPH_MOCK_ENABLED) return null;
  return getTravelRuntimeGraphMock();
}
