import type { RouteAndRunResponse } from '@/api/agent';
import type {
  SchemaOrgDiscoveryEntity,
  SchemaOrgDiscoveryPayload,
} from '@/types/schema-org-discovery';

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

function normalizeJsonLd(raw: unknown): SchemaOrgDiscoveryPayload['jsonLd'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  if (Array.isArray(raw)) {
    const items = raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    return items.length > 0 ? items : undefined;
  }
  return raw as Record<string, unknown>;
}

function normalizeEntity(raw: unknown): SchemaOrgDiscoveryEntity | null {
  const o = asRecord(raw);
  if (!o) return null;

  const type =
    pickStr(o, 'type', '@type', 'schemaType', 'schema_type') ??
    (Array.isArray(o['@type']) ? String(o['@type'][0]) : undefined);
  if (!type) return null;

  const jsonLd =
    normalizeJsonLd(o.jsonLd ?? o.json_ld) ??
    (o['@context'] || o['@type'] ? (o as Record<string, unknown>) : undefined);

  return {
    ...(pickStr(o, 'id') ? { id: pickStr(o, 'id') } : {}),
    type,
    name: pickStr(o, 'name', 'title', 'label'),
    url: pickStr(o, 'url', 'sameAs', 'same_as'),
    source: pickStr(o, 'source', 'provider', 'origin'),
    ...(jsonLd && typeof jsonLd === 'object' && !Array.isArray(jsonLd) ? { jsonLd } : {}),
  };
}

export function normalizeSchemaOrgDiscovery(raw: unknown): SchemaOrgDiscoveryPayload | null {
  const o = asRecord(raw);
  if (!o) return null;

  const entitiesRaw = o.entities ?? o.items ?? o.discovered_entities ?? o.discoveredEntities;
  const entities = Array.isArray(entitiesRaw)
    ? entitiesRaw.map(normalizeEntity).filter((e): e is SchemaOrgDiscoveryEntity => e != null)
    : [];

  const jsonLd = normalizeJsonLd(o.jsonLd ?? o.json_ld ?? o.graph ?? o['@graph']);
  const summary = pickStr(o, 'summary', 'description');
  const schema = pickStr(o, 'schema', 'version', 'schema_version', 'schemaVersion');
  const discoveredAt = pickStr(o, 'discoveredAt', 'discovered_at', 'generatedAt', 'generated_at');

  if (entities.length === 0 && !jsonLd && !summary) return null;

  return {
    ...(schema ? { schema } : {}),
    ...(summary ? { summary } : {}),
    ...(discoveredAt ? { discoveredAt } : {}),
    ...(entities.length > 0 ? { entities } : {}),
    ...(jsonLd ? { jsonLd } : {}),
    ...(asRecord(o.metadata) ? { metadata: asRecord(o.metadata) } : {}),
  };
}

export function pickSchemaOrgDiscoveryFromExplain(explain: unknown): SchemaOrgDiscoveryPayload | null {
  if (!explain || typeof explain !== 'object') return null;
  const o = explain as Record<string, unknown>;
  return normalizeSchemaOrgDiscovery(o.schema_org_discovery ?? o.schemaOrgDiscovery);
}

export function pickSchemaOrgDiscoveryFromRouteRun(
  response: RouteAndRunResponse
): SchemaOrgDiscoveryPayload | null {
  const payload = response.result?.payload;
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    const fromPayload = normalizeSchemaOrgDiscovery(
      p.schema_org_discovery ?? p.schemaOrgDiscovery
    );
    if (fromPayload) return fromPayload;
  }

  return pickSchemaOrgDiscoveryFromExplain(response.explain);
}

export function hasSchemaOrgDiscoveryContent(
  data: SchemaOrgDiscoveryPayload | null | undefined
): boolean {
  if (!data) return false;
  return (
    Boolean(data.summary?.trim()) ||
    (data.entities?.length ?? 0) > 0 ||
    Boolean(data.jsonLd)
  );
}

export function buildSchemaOrgExportJson(data: SchemaOrgDiscoveryPayload): string {
  if (data.jsonLd) {
    return JSON.stringify(data.jsonLd, null, 2);
  }
  if (data.entities?.length) {
    const graph = data.entities
      .map((e) => e.jsonLd ?? { '@type': e.type, name: e.name, url: e.url })
      .filter(Boolean);
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

export const SCHEMA_ORG_DISCOVERY_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_SCHEMA_ORG_DISCOVERY_MOCK === 'true';

export function getSchemaOrgDiscoveryMock(): SchemaOrgDiscoveryPayload {
  return {
    schema: 'tripnara.schema_org_discovery@v1',
    summary: '从行程 POI 投影 Schema.org 实体（mock）',
    discoveredAt: new Date().toISOString(),
    entities: [
      {
        id: 'poi-1',
        type: 'TouristAttraction',
        name: '斯卡夫塔山',
        source: 'itinerary.poi',
        jsonLd: {
          '@type': 'TouristAttraction',
          name: '斯卡夫塔山',
          address: { '@type': 'PostalAddress', addressCountry: 'IS' },
        },
      },
      {
        id: 'trip-1',
        type: 'Trip',
        name: '冰岛南岸 7 日',
        source: 'trip.summary',
        jsonLd: {
          '@type': 'Trip',
          name: '冰岛南岸 7 日',
          itinerary: { '@type': 'ItemList', numberOfItems: 12 },
        },
      },
    ],
  };
}

export function resolveSchemaOrgDiscoveryForDev(
  data: SchemaOrgDiscoveryPayload | null
): SchemaOrgDiscoveryPayload | null {
  if (data && hasSchemaOrgDiscoveryContent(data)) return data;
  if (!SCHEMA_ORG_DISCOVERY_MOCK_ENABLED) return null;
  return getSchemaOrgDiscoveryMock();
}
