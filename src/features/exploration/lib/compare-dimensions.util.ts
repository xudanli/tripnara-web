import { resolveRouteLookupKey } from './route-map.util';
import { toApiRouteId } from './route-id.util';
import type { RouteCompareDimension } from '../api/types';
import type { CompareRouteCard } from '../types';

export interface CompareDimensionCell {
  level: string;
  note?: string;
}

export interface CompareDimensionsCandidateSource {
  routeId: string;
  strategyId?: string;
  compare?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface CompareDimensionDefinition {
  key: string;
  label: string;
  higherIsBetter?: boolean;
}

const DIMENSION_META_KEYS = new Set([
  'key',
  'label',
  'title',
  'id',
  'values',
  'cells',
  'valuesByRoute',
  'byRoute',
  'routes',
  'higherIsBetter',
]);

const COMPARE_OBJECT_META_KEYS = new Set(['dimensions', 'rows', 'cells', 'labels']);

function isDimensionLikeMap(value: Record<string, unknown>): boolean {
  return Object.values(value).some((entry) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return false;
    if (isCompareCell(entry)) return true;
    const record = entry as Record<string, unknown>;
    if (record.values != null || record.cells != null) return true;
    return Object.keys(record).some(
      (key) => key.startsWith('route_') || key.includes('|') || key.includes('-route_'),
    );
  });
}

function normalizeCompareMatrix(raw: Record<string, unknown>): RouteCompareDimension[] | undefined {
  const rows = raw.rows;
  if (!Array.isArray(rows)) return undefined;

  const flatCells: Record<string, CompareDimensionCell> = {
    ...normalizeValuesMap(raw.cells),
  };
  for (const [key, value] of Object.entries(raw)) {
    if (COMPARE_OBJECT_META_KEYS.has(key)) continue;
    const cell = coerceCompareCell(value);
    if (cell) flatCells[key] = cell;
  }

  const parsedRows = rows
    .map((row, index) => {
      const normalized = normalizeDimensionRow(row, `dimension-${index}`);
      if (!normalized) return undefined;

      for (const [cellKey, cellValue] of Object.entries(flatCells)) {
        const cell = coerceCompareCell(cellValue);
        if (!cell) continue;

        const pipeParts = cellKey.split('|');
        if (pipeParts.length === 2) {
          const [dimKey, routeKey] = pipeParts;
          if (dimKey === normalized.key) {
            normalized.values[routeKey] = cell;
            continue;
          }
        }

        if (cellKey.startsWith(`${normalized.key}-`) || cellKey.startsWith(`route_${normalized.key}-`)) {
          normalized.values[cellKey] = cell;
        }
      }

      return Object.keys(normalized.values).length ? normalized : undefined;
    })
    .filter((row): row is RouteCompareDimension => row != null);

  return parsedRows.length ? parsedRows : undefined;
}

const COMPARE_PAYLOAD_META_KEYS = new Set([
  'candidates',
  'generationVersion',
  'generationMode',
  'action',
  'compare',
  'compareMatrix',
  'compareDimensions',
  'dimensions',
]);

function coerceCompareCell(value: unknown): CompareDimensionCell | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const level = row.level ?? row.value ?? row.text ?? row.score;
  if (typeof level !== 'string' || !level.trim()) return undefined;
  const note = row.note ?? row.description ?? row.detail;
  return {
    level: level.trim(),
    note: typeof note === 'string' ? note : undefined,
  };
}

function isCompareCell(value: unknown): value is CompareDimensionCell {
  return coerceCompareCell(value) != null;
}

function formatMetricValue(value: unknown): CompareDimensionCell | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) {
      return { level: `${Math.round(value * 100)}%` };
    }
    return { level: String(Math.round(value * 10) / 10) };
  }
  if (typeof value === 'string' && value.trim()) {
    return { level: value.trim() };
  }
  return coerceCompareCell(value);
}

function candidateRouteKeys(candidate: CompareDimensionsCandidateSource): string[] {
  const keys = new Set<string>();
  if (candidate.routeId) keys.add(candidate.routeId);
  if (candidate.strategyId) {
    keys.add(candidate.strategyId);
    keys.add(toApiRouteId(candidate.strategyId));
  }
  keys.add(resolveRouteLookupKey(candidate.routeId || candidate.strategyId || ''));
  return [...keys];
}

function assignCellForRouteKeys(
  bucket: Record<string, CompareDimensionCell>,
  dimensionKey: string,
  routeKeys: Iterable<string>,
  cell: CompareDimensionCell,
): void {
  for (const routeKey of routeKeys) {
    bucket[routeKey] = cell;
    const strategyId = resolveRouteLookupKey(routeKey);
    bucket[`route_${dimensionKey}-${strategyId}`] = cell;
    bucket[`route_${dimensionKey}-${routeKey}`] = cell;
  }
}

/** 后端 dimensions 仅含 key/label/higherIsBetter，数值在 candidates[].metrics */
export function parseDimensionDefinitions(raw: unknown): CompareDimensionDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? row.id ?? '').trim();
    if (!key) return [];
    const label = String(row.label ?? row.title ?? key).trim() || key;
    const higherIsBetter =
      typeof row.higherIsBetter === 'boolean' ? row.higherIsBetter : undefined;
    return [{ key, label, higherIsBetter }];
  });
}

export function buildCompareDimensionsFromDefinitionsAndMetrics(
  definitions: CompareDimensionDefinition[],
  candidates: CompareDimensionsCandidateSource[] | undefined,
): RouteCompareDimension[] | undefined {
  if (!definitions.length || !candidates?.length) return undefined;

  const rows: RouteCompareDimension[] = [];

  for (const definition of definitions) {
    const values: Record<string, CompareDimensionCell> = {};
    for (const candidate of candidates) {
      const metricValue = candidate.metrics?.[definition.key];
      const cell = formatMetricValue(metricValue);
      if (!cell) continue;
      assignCellForRouteKeys(values, definition.key, candidateRouteKeys(candidate), cell);
    }
    rows.push({ key: definition.key, label: definition.label, values });
  }

  return rows.length ? rows : undefined;
}

function buildCompareDimensionsFromCandidateMetrics(
  candidates: CompareDimensionsCandidateSource[] | undefined,
): RouteCompareDimension[] | undefined {
  if (!candidates?.length) return undefined;

  const dimensionKeys = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.metrics) continue;
    for (const key of Object.keys(candidate.metrics)) dimensionKeys.add(key);
  }
  if (!dimensionKeys.size) return undefined;

  const definitions = [...dimensionKeys].map((key) => ({ key, label: key }));
  return buildCompareDimensionsFromDefinitionsAndMetrics(definitions, candidates);
}

function inferDimensionKeyFromRow(row: Record<string, unknown>): string | undefined {
  for (const entryKey of Object.keys(row)) {
    const composite = entryKey.match(/^route_([^-]+)-/);
    if (composite?.[1]) return composite[1];
    const dashed = entryKey.match(/^([^-]+)-route_/);
    if (dashed?.[1]) return dashed[1];
  }
  return undefined;
}

function routeDimensionKeys(route: CompareRouteCard): string[] {
  const keys = new Set<string>();
  if (route.apiRouteId) keys.add(route.apiRouteId);
  keys.add(route.id);
  keys.add(toApiRouteId(route.id));
  keys.add(resolveRouteLookupKey(route.apiRouteId ?? route.id));
  return [...keys];
}

function buildDimensionLookupKeys(dimensionKey: string, route: CompareRouteCard): string[] {
  const keys = new Set<string>();
  for (const routeKey of routeDimensionKeys(route)) {
    keys.add(routeKey);
    const strategyId = resolveRouteLookupKey(routeKey);
    keys.add(strategyId);
    keys.add(`route_${dimensionKey}-${strategyId}`);
    keys.add(`route_${dimensionKey}-${routeKey}`);
    keys.add(`${dimensionKey}-${strategyId}`);
    keys.add(`${dimensionKey}-${routeKey}`);
  }
  return [...keys];
}

function readCellFromMap(
  map: Record<string, CompareDimensionCell> | undefined,
  dimensionKey: string,
  route: CompareRouteCard,
): CompareDimensionCell | undefined {
  if (!map) return undefined;
  for (const key of buildDimensionLookupKeys(dimensionKey, route)) {
    const cell = coerceCompareCell(map[key]);
    if (cell) return cell;
  }
  return undefined;
}

/** 从 API dimensions.values 或 composite 键中查找单元格 */
export function getCompareDimensionValue(
  dimension: RouteCompareDimension,
  route: CompareRouteCard,
): CompareDimensionCell | undefined {
  const fromValues = readCellFromMap(dimension.values, dimension.key, route);
  if (fromValues) return fromValues;

  const row = dimension as RouteCompareDimension & Record<string, unknown>;
  for (const key of buildDimensionLookupKeys(dimension.key, route)) {
    const cell = coerceCompareCell(row[key]);
    if (cell) return cell;
  }

  return undefined;
}

function normalizeValuesMap(raw: unknown): Record<string, CompareDimensionCell> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const values: Record<string, CompareDimensionCell> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const cell = coerceCompareCell(value);
    if (cell) values[key] = cell;
  }
  return values;
}

function normalizeDimensionRow(raw: unknown, fallbackKey?: string): RouteCompareDimension | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  let key = String(row.key ?? row.id ?? '').trim();
  if (!key) key = inferDimensionKeyFromRow(row) ?? '';
  if (!key && fallbackKey) key = fallbackKey;
  if (!key) return undefined;
  const label = String(row.label ?? row.title ?? key).trim() || key;

  const values: Record<string, CompareDimensionCell> = {
    ...normalizeValuesMap(row.values),
    ...normalizeValuesMap(row.cells),
    ...normalizeValuesMap(row.valuesByRoute),
    ...normalizeValuesMap(row.byRoute),
    ...normalizeValuesMap(row.routes),
  };

  for (const [entryKey, value] of Object.entries(row)) {
    if (DIMENSION_META_KEYS.has(entryKey)) continue;
    const cell = coerceCompareCell(value);
    if (cell) {
      values[entryKey] = cell;
      continue;
    }
    Object.assign(values, normalizeValuesMap(value));
  }

  if (!Object.keys(values).length) return undefined;
  return { key, label, values };
}

/** 将 API 多种 dimensions 结构归一化为 RouteCompareDimension[] */
export function normalizeApiCompareDimensions(raw: unknown): RouteCompareDimension[] | undefined {
  if (!raw) return undefined;

  if (Array.isArray(raw)) {
    const rows = raw
      .map((item, index) => normalizeDimensionRow(item, `dimension-${index}`))
      .filter((row): row is RouteCompareDimension => row != null);
    return rows.length ? rows : undefined;
  }

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.rows)) {
      const matrixRows = normalizeCompareMatrix(record);
      if (matrixRows?.length) return matrixRows;
      return normalizeApiCompareDimensions(record.rows);
    }

    const rows = Object.entries(record)
      .map(([key, value]) => {
        const cell = coerceCompareCell(value);
        if (cell) {
          return {
            key,
            label: key,
            values: { [key]: cell },
          } satisfies RouteCompareDimension;
        }
        const normalized = normalizeDimensionRow({ key, ...(value as object) });
        if (normalized) return normalized;
        return {
          key,
          label: key,
          values: normalizeValuesMap(value),
        } satisfies RouteCompareDimension;
      })
      .filter((row) => Object.keys(row.values ?? {}).length > 0);
    return rows.length ? rows : undefined;
  }

  return undefined;
}

/** 从 compare 响应 payload 中提取 dimensions 原始结构 */
export function extractCompareDimensionsRaw(
  payload: unknown,
): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const data = payload as Record<string, unknown>;

  if (data.dimensions != null) return data.dimensions;
  if (data.compareDimensions != null) return data.compareDimensions;

  const compare = data.compare;
  if (compare && typeof compare === 'object' && !Array.isArray(compare)) {
    const compareRecord = compare as Record<string, unknown>;
    if (compareRecord.dimensions != null) return compareRecord.dimensions;
    if (compareRecord.rows != null) return compareRecord;
    if (isDimensionLikeMap(compareRecord)) return compareRecord;
  }

  const matrix = data.compareMatrix;
  if (matrix && typeof matrix === 'object' && !Array.isArray(matrix)) {
    const matrixRecord = matrix as Record<string, unknown>;
    if (matrixRecord.dimensions != null) return matrixRecord.dimensions;
    if (matrixRecord.rows != null) return matrixRecord;
    if (isDimensionLikeMap(matrixRecord)) return matrixRecord;
  }

  const dimensionMap = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !COMPARE_PAYLOAD_META_KEYS.has(key) &&
        value != null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        isDimensionLikeMap(value as Record<string, unknown>),
    ),
  );
  if (Object.keys(dimensionMap).length > 0) return dimensionMap;

  return undefined;
}

/** 候选路线上的 compare 字段合成维度表（仍为 API 数据） */
export function buildCompareDimensionsFromCandidates(
  candidates: CompareDimensionsCandidateSource[] | undefined,
): RouteCompareDimension[] | undefined {
  if (!candidates?.length) return undefined;

  const dimensionMeta = new Map<string, string>();
  const valuesByDimension = new Map<string, Record<string, CompareDimensionCell>>();

  for (const candidate of candidates) {
    if (!candidate.compare) continue;
    const routeKeys = new Set<string>();
    if (candidate.routeId) routeKeys.add(candidate.routeId);
    if (candidate.strategyId) {
      routeKeys.add(candidate.strategyId);
      routeKeys.add(toApiRouteId(candidate.strategyId));
    }
    routeKeys.add(resolveRouteLookupKey(candidate.routeId || candidate.strategyId || ''));

    for (const [dimensionKey, rawCell] of Object.entries(candidate.compare)) {
      const cell = coerceCompareCell(rawCell);
      if (!cell) continue;
      if (!dimensionMeta.has(dimensionKey)) {
        const label =
          typeof (rawCell as Record<string, unknown>)?.label === 'string'
            ? String((rawCell as Record<string, unknown>).label)
            : dimensionKey;
        dimensionMeta.set(dimensionKey, label);
      }
      const bucket = valuesByDimension.get(dimensionKey) ?? {};
      for (const routeKey of routeKeys) {
        bucket[routeKey] = cell;
        const strategyId = resolveRouteLookupKey(routeKey);
        bucket[`route_${dimensionKey}-${strategyId}`] = cell;
        bucket[`route_${dimensionKey}-${routeKey}`] = cell;
      }
      valuesByDimension.set(dimensionKey, bucket);
    }
  }

  if (!dimensionMeta.size) return undefined;
  return [...dimensionMeta.entries()].map(([key, label]) => ({
    key,
    label,
    values: valuesByDimension.get(key) ?? {},
  }));
}

/** 解析 compare payload → 维度行（definitions + metrics / compare cells） */
export function resolveCompareDimensionsFromPayload(
  payload: unknown,
  candidates?: CompareDimensionsCandidateSource[],
): RouteCompareDimension[] {
  const raw = extractCompareDimensionsRaw(payload);
  const normalized = normalizeApiCompareDimensions(raw);
  if (normalized?.length) {
    return normalized.map((dimension) => ({
      ...dimension,
      values: dimension.values ?? {},
    }));
  }

  const definitions = parseDimensionDefinitions(raw);
  const fromDefinitionsAndMetrics = buildCompareDimensionsFromDefinitionsAndMetrics(
    definitions,
    candidates,
  );
  if (fromDefinitionsAndMetrics?.length) {
    return fromDefinitionsAndMetrics.map((dimension) => ({
      ...dimension,
      values: dimension.values ?? {},
    }));
  }

  const fromMetrics = buildCompareDimensionsFromCandidateMetrics(candidates);
  if (fromMetrics?.length) {
    return fromMetrics.map((dimension) => ({
      ...dimension,
      values: dimension.values ?? {},
    }));
  }

  const fromCandidates = buildCompareDimensionsFromCandidates(candidates);
  if (fromCandidates?.length) {
    return fromCandidates.map((dimension) => ({
      ...dimension,
      values: dimension.values ?? {},
    }));
  }

  return [];
}

/** @deprecated 使用 resolveCompareDimensionsFromPayload */
export function resolveCompareDimensions(apiDimensions: unknown): RouteCompareDimension[] {
  return resolveCompareDimensionsFromPayload({ dimensions: apiDimensions });
}

export function formatCompareCellNote(note?: string): string | undefined {
  const trimmed = note?.trim();
  return trimmed || undefined;
}
