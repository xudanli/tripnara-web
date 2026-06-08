/**
 * `result.payload.flight_inventory_snapshot` — 航班传感器摘录（与住宿结构化卡片不同，多为审计/新鲜度 + 正文引用）。
 * 字段以后端为准；此处做宽松解析供 UI 展示。
 *
 * 报价卡片权威数据源：`legs[].sample_offers[]`（勿仅用 leg.departure_date）。
 */

/** 单段航程（Flight MCP / Amadeus 常见 snake_case） */
export interface FlightSampleOfferSegment {
  departure_airport?: string;
  arrival_airport?: string;
  departure_at?: string;
  arrival_at?: string;
  flight_number?: string;
  carrier_code?: string;
  cabin?: string;
  [key: string]: unknown;
}

/** leg 下的一条样例报价：卡片主数据源 */
export interface FlightSampleOffer {
  rank?: number | string;
  price_total?: number | string;
  currency?: string;
  duration?: string;
  /** MCP 解析不完整时的兜底文案 */
  summary_line?: string;
  segments?: FlightSampleOfferSegment[];
  [key: string]: unknown;
}

export interface FlightInventoryLeg {
  origin?: string;
  destination?: string;
  origin_code?: string;
  destination_code?: string;
  departure_date?: string;
  return_date?: string;
  cabin?: string;
  airline?: string;
  duration?: string;
  stops?: number | string;
  price_hint?: string;
  summary?: string;
  /** leg 级兜底（无 sample_offers 或仅需一行摘要时） */
  summary_line?: string;
  /** 按报价遍历渲染卡片；优先于此字段而非仅 departure_date */
  sample_offers?: FlightSampleOffer[];
  [key: string]: unknown;
}

export interface FlightInventorySnapshot {
  legs?: FlightInventoryLeg[];
  /** 模型/编排写入提示词的摘录行，多为报价或航线摘要 */
  sample_lines?: string[];
  retrieved_at?: string;
  source?: string;
  freshness_note?: string;
  [key: string]: unknown;
}

function asNonEmptyString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function coerceSampleOffers(raw: unknown): FlightSampleOffer[] | undefined {
  const arr =
    raw ??
    undefined;
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const out: FlightSampleOffer[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const offer = item as Record<string, unknown>;
    const segmentsRaw = offer.segments ?? offer.Segments;
    const segments =
      Array.isArray(segmentsRaw) && segmentsRaw.length > 0
        ? (segmentsRaw.filter(
            (s) => s && typeof s === 'object' && !Array.isArray(s)
          ) as FlightSampleOfferSegment[])
        : undefined;
    out.push({
      ...offer,
      ...(segments ? { segments } : {}),
      summary_line:
        asNonEmptyString(offer.summary_line) ??
        asNonEmptyString(offer.summaryLine) ??
        asNonEmptyString(offer.line),
    });
  }
  return out.length > 0 ? out : undefined;
}

function normalizeLeg(raw: unknown, _index: number): FlightInventoryLeg | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const sample_offers =
    coerceSampleOffers(o.sample_offers ?? o.sampleOffers) ??
    coerceSampleOffers(o.offers);
  const summary_line_leg =
    asNonEmptyString(o.summary_line) ?? asNonEmptyString(o.summaryLine);
  const summary =
    asNonEmptyString(o.summary) ??
    asNonEmptyString(o.line) ??
    asNonEmptyString(o.description);
  const origin =
    asNonEmptyString(o.origin) ??
    asNonEmptyString(o.from) ??
    asNonEmptyString(o.departure_airport) ??
    asNonEmptyString(o.origin_airport);
  const destination =
    asNonEmptyString(o.destination) ??
    asNonEmptyString(o.to) ??
    asNonEmptyString(o.arrival_airport) ??
    asNonEmptyString(o.destination_airport);
  const base: FlightInventoryLeg = {
    ...o,
    ...(sample_offers ? { sample_offers } : {}),
    ...(summary_line_leg ? { summary_line: summary_line_leg } : {}),
    ...(summary ? { summary } : {}),
    ...(origin ? { origin } : {}),
    ...(destination ? { destination } : {}),
  };

  if (
    !summary &&
    !origin &&
    !destination &&
    !asNonEmptyString(o.airline) &&
    !sample_offers?.length &&
    !summary_line_leg
  ) {
    return Object.keys(o).length ? ({ ...o } as FlightInventoryLeg) : undefined;
  }
  return base;
}

function normalizeLegs(raw: unknown): FlightInventoryLeg[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const legs = raw
    .map((item, i) => normalizeLeg(item, i))
    .filter(Boolean) as FlightInventoryLeg[];
  return legs.length > 0 ? legs : undefined;
}

function normalizeSampleLines(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const lines = raw
    .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

function normalizeSnapshot(raw: Record<string, unknown>): FlightInventorySnapshot | undefined {
  const legs = normalizeLegs(raw.legs ?? raw.flight_legs ?? raw.flightLegs);
  const sample_lines = normalizeSampleLines(raw.sample_lines ?? raw.sampleLines ?? raw.lines);
  if ((!legs || legs.length === 0) && (!sample_lines || sample_lines.length === 0)) {
    return undefined;
  }
  return {
    ...raw,
    ...(legs ? { legs } : {}),
    ...(sample_lines ? { sample_lines } : {}),
  };
}

function pickSnapshot(root: Record<string, unknown> | undefined): FlightInventorySnapshot | undefined {
  if (!root) return undefined;
  const raw =
    root.flight_inventory_snapshot ??
    root.flightInventorySnapshot ??
    root.flight_inventory ??
    root.flightInventory;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return normalizeSnapshot(raw as Record<string, unknown>);
}

/** 从 route_and_run 成功体的 payload / result 解析航班摘录（snake_case / camelCase）。 */
export function extractFlightInventorySnapshotFromRouteRun(
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): FlightInventorySnapshot | undefined {
  return (
    pickSnapshot(payloadRecord) ??
    pickSnapshot(
      resultRecord?.payload && typeof resultRecord.payload === 'object' && !Array.isArray(resultRecord.payload)
        ? (resultRecord.payload as Record<string, unknown>)
        : undefined
    ) ??
    pickSnapshot(resultRecord)
  );
}
