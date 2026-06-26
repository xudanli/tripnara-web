/** route_and_run payload.schema_org_discovery — Schema.org 发现层（SEO / 外部分摄入） */

export interface SchemaOrgDiscoveryEntity {
  id?: string;
  /** Schema.org @type，如 TouristAttraction / Trip */
  type: string;
  name?: string;
  url?: string;
  source?: string;
  /** 单实体 JSON-LD 片段 */
  jsonLd?: Record<string, unknown>;
}

export interface SchemaOrgDiscoveryPayload {
  schema?: string;
  summary?: string;
  discoveredAt?: string;
  entities?: SchemaOrgDiscoveryEntity[];
  /** 页面级 JSON-LD（可为单对象或 @graph 数组） */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}
