/**
 * 航班传感器摘录：按 `flight_inventory_snapshot.legs[].sample_offers[]` 渲染报价卡片。
 * MCP 不完整时用 `summary_line`（offer 或 leg 级）兜底。
 */

import { Plane } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  FlightInventoryLeg,
  FlightInventorySnapshot,
  FlightSampleOffer,
  FlightSampleOfferSegment,
} from '@/lib/agent-flight-inventory-payload';

function formatShortWhen(iso?: string): string {
  if (!iso || typeof iso !== 'string') return '—';
  const t = iso.trim();
  if (!t) return '—';
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    // fall through
  }
  return t;
}

function formatPrice(total: unknown, currency: unknown): string {
  const c =
    typeof currency === 'string' && currency.trim()
      ? currency.trim().toUpperCase()
      : '';
  if (typeof total === 'number' && Number.isFinite(total)) {
    return c ? `${c} ${total.toLocaleString()}` : String(total);
  }
  if (total !== undefined && total !== null && String(total).trim()) {
    const s = String(total).trim();
    return c ? `${c} ${s}` : s;
  }
  return '—';
}

function segmentAirports(seg: FlightSampleOfferSegment): string {
  const dep =
    seg.departure_airport ??
    (seg['departureAirport'] as string | undefined) ??
    (seg['departure_airport_iata'] as string | undefined);
  const arr =
    seg.arrival_airport ??
    (seg['arrivalAirport'] as string | undefined) ??
    (seg['arrival_airport_iata'] as string | undefined);
  if (dep && arr) return `${dep} → ${arr}`;
  return dep || arr || '';
}

function segmentMeta(seg: FlightSampleOfferSegment): string {
  const parts: string[] = [];
  const carrier = seg.carrier_code ?? (seg['carrierCode'] as string | undefined);
  const fn = seg.flight_number ?? (seg['flightNumber'] as string | undefined);
  if (carrier && fn) parts.push(`${carrier}${fn}`);
  else if (fn) parts.push(String(fn));
  else if (carrier) parts.push(carrier);
  if (seg.cabin) parts.push(String(seg.cabin));
  return parts.join(' · ');
}

function legSectionTitle(leg: FlightInventoryLeg, legIndex: number): string {
  const sl = typeof leg.summary_line === 'string' ? leg.summary_line.trim() : '';
  if (sl) return sl;
  const route =
    leg.origin_code && leg.destination_code
      ? `${leg.origin_code} → ${leg.destination_code}`
      : leg.origin && leg.destination
        ? `${leg.origin} → ${leg.destination}`
        : '';
  if (route) return route;
  if (typeof leg.departure_date === 'string' && leg.departure_date.trim()) {
    return `出发 ${leg.departure_date.trim()}`;
  }
  return `航段 ${legIndex + 1}`;
}

function pickOffers(leg: FlightInventoryLeg): FlightSampleOffer[] {
  const raw = leg.sample_offers;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.filter((o) => o && typeof o === 'object' && !Array.isArray(o)) as FlightSampleOffer[];
}

function offerSegments(offer: FlightSampleOffer): FlightSampleOfferSegment[] {
  const segs = offer.segments;
  if (!Array.isArray(segs) || segs.length === 0) return [];
  return segs.filter((s) => s && typeof s === 'object' && !Array.isArray(s)) as FlightSampleOfferSegment[];
}

export interface FlightInventorySnapshotPanelProps {
  snapshot: FlightInventorySnapshot;
  className?: string;
}

export function FlightInventorySnapshotPanel({ snapshot, className }: FlightInventorySnapshotPanelProps) {
  const legs = snapshot.legs ?? [];
  const lines = snapshot.sample_lines ?? [];
  const retrieved =
    typeof snapshot.retrieved_at === 'string'
      ? snapshot.retrieved_at
      : typeof snapshot['retrievedAt'] === 'string'
        ? snapshot['retrievedAt']
        : undefined;
  const source =
    typeof snapshot.source === 'string'
      ? snapshot.source
      : typeof snapshot['source_channel'] === 'string'
        ? snapshot['source_channel']
        : undefined;
  const freshness =
    typeof snapshot.freshness_note === 'string'
      ? snapshot.freshness_note
      : typeof snapshot['freshnessNote'] === 'string'
        ? snapshot['freshnessNote']
        : typeof snapshot['as_of'] === 'string'
          ? snapshot['as_of']
          : undefined;

  const hasLegContent = legs.some(
    (leg) =>
      pickOffers(leg).length > 0 ||
      (typeof leg.summary_line === 'string' && leg.summary_line.trim()) ||
      (typeof leg.departure_date === 'string' && leg.departure_date.trim())
  );

  if (!hasLegContent && lines.length === 0) return null;

  return (
    <section
      className={cn(
        'mt-3 space-y-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-3 shadow-sm',
        className
      )}
      aria-label="航班检索摘录"
    >
      <div className="flex items-start gap-2">
        <Plane className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug text-foreground">实时航班摘录</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            以下为传感器快照（按报价 sample_offers）；正文解读为准。
            {retrieved ? ` · 抓取 ${String(retrieved)}` : ''}
            {source ? ` · ${String(source)}` : ''}
          </p>
          {freshness ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{String(freshness)}</p>
          ) : null}
        </div>
      </div>

      {legs.length > 0 ? (
        <div className="space-y-4">
          {legs.map((leg, legIdx) => {
            const offers = pickOffers(leg);
            const sectionTitle = legSectionTitle(leg, legIdx);

            return (
              <div key={`flight-leg-${legIdx}`} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionTitle}
                </p>

                {offers.length > 0 ? (
                  offers.map((offer, offerIdx) => {
                    const rank = offer.rank ?? offer['rank_index'];
                    const priceTotal = offer.price_total ?? offer['priceTotal'] ?? offer['total_price'];
                    const currency = offer.currency ?? offer['currency_code'];
                    const duration =
                      typeof offer.duration === 'string'
                        ? offer.duration
                        : typeof offer['duration_text'] === 'string'
                          ? offer['duration_text']
                          : undefined;
                    const summaryLine =
                      typeof offer.summary_line === 'string' && offer.summary_line.trim()
                        ? offer.summary_line.trim()
                        : undefined;
                    const segs = offerSegments(offer);
                    const showSummaryFallback = Boolean(summaryLine) && segs.length === 0;

                    return (
                      <Card
                        key={`offer-${legIdx}-${offerIdx}`}
                        className="border-l-4 border-l-border bg-background/80 shadow-none"
                      >
                        <CardContent className="space-y-2 px-3 py-2.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {rank !== undefined && rank !== null && String(rank).trim() !== '' ? (
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  #{String(rank)}
                                </Badge>
                              ) : null}
                              <span className="text-base font-semibold tabular-nums text-foreground">
                                {formatPrice(priceTotal, currency)}
                              </span>
                            </div>
                            {duration ? (
                              <span className="text-[12px] text-muted-foreground">{duration}</span>
                            ) : null}
                          </div>

                          {showSummaryFallback ? (
                            <p className="text-[12px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                              {summaryLine}
                            </p>
                          ) : null}

                          {segs.length > 0 ? (
                            <ul className="space-y-2 border-t border-border/60 pt-2">
                              {segs.map((seg, si) => {
                                const routeLine = segmentAirports(seg);
                                const depAt =
                                  seg.departure_at ??
                                  (seg['departureAt'] as string | undefined) ??
                                  (seg['departure_time'] as string | undefined);
                                const arrAt =
                                  seg.arrival_at ??
                                  (seg['arrivalAt'] as string | undefined) ??
                                  (seg['arrival_time'] as string | undefined);
                                const meta = segmentMeta(seg);
                                return (
                                  <li
                                    key={`seg-${legIdx}-${offerIdx}-${si}`}
                                    className="text-[12px] leading-snug text-foreground"
                                  >
                                    {routeLine ? (
                                      <span className="font-medium">{routeLine}</span>
                                    ) : null}
                                    <div className="mt-0.5 text-muted-foreground">
                                      {depAt || arrAt ? (
                                        <span>
                                          {formatShortWhen(depAt)} — {formatShortWhen(arrAt)}
                                        </span>
                                      ) : null}
                                      {meta ? (
                                        <span className={depAt || arrAt ? ' · ' : ''}>{meta}</span>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : !showSummaryFallback && summaryLine ? (
                            <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                              {summaryLine}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border border-dashed border-border/80 bg-muted/15 shadow-none">
                    <CardContent className="px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                      {typeof leg.summary_line === 'string' && leg.summary_line.trim() ? (
                        <p className="whitespace-pre-wrap">{leg.summary_line.trim()}</p>
                      ) : leg.departure_date ? (
                        <p>
                          仅有日期信息（{leg.departure_date}）。请确认后端已写入{' '}
                          <code className="rounded bg-muted px-1 font-mono text-[11px]">sample_offers</code>{' '}
                          以展示报价与航段。
                        </p>
                      ) : (
                        <p>本航段暂无 sample_offers。</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {lines.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-foreground marker:text-muted-foreground/80">
          {lines.map((line, i) => (
            <li key={`flight-line-${i}`} className="whitespace-pre-wrap">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
