import type {
  ConsultationDashboardPayload,
  ConsultationDaySegment,
  ConsultationMapNode,
} from '@/types/consultation-dashboard';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** 从 route_and_run payload 解析 consultation_dashboard（容错未知字段） */
export function parseConsultationDashboard(
  payload: Record<string, unknown> | undefined
): ConsultationDashboardPayload | undefined {
  if (!payload) return undefined;
  const uiDisplay = isRecord(payload['ui_display']) ? payload['ui_display'] : undefined;
  const raw =
    payload.consultation_dashboard ??
    payload.consultationDashboard ??
    uiDisplay?.consultation_dashboard ??
    uiDisplay?.consultationDashboard;
  const root = isRecord(raw) ? raw : undefined;
  if (!root) return undefined;

  const tripSummary = isRecord(root.trip_summary) ? root.trip_summary : undefined;

  const headline =
    (typeof root.headline === 'string' && root.headline.trim()) ||
    (typeof tripSummary?.headline === 'string' && tripSummary.headline.trim()) ||
    undefined;
  const subheadline =
    (typeof root.subheadline === 'string' && root.subheadline.trim()) ||
    (typeof tripSummary?.subheadline === 'string' && tripSummary.subheadline.trim()) ||
    undefined;

  const score_dimensions = Array.isArray(root.score_dimensions)
    ? root.score_dimensions
        .map((row) => {
          if (!isRecord(row)) return undefined;
          const label = String(row.label ?? '').trim();
          if (!label) return undefined;
          return {
            label,
            score_label:
              typeof row.score_label === 'string'
                ? row.score_label
                : typeof row.score === 'string'
                  ? row.score
                  : undefined,
            level: typeof row.level === 'string' ? row.level : undefined,
            value: num(row.value ?? row.score_numeric),
          };
        })
        .filter(Boolean)
    : undefined;

  const summary_cards = Array.isArray(root.summary_cards)
    ? root.summary_cards
        .map((row) => {
          if (!isRecord(row)) return undefined;
          const title = String(row.title ?? row.label ?? '').trim();
          const body = String(row.body ?? row.text ?? row.value ?? '').trim();
          if (!title && !body) return undefined;
          return {
            title: title || '—',
            body: body || '—',
            tone: typeof row.tone === 'string' ? row.tone : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  let map: ConsultationDashboardPayload['map'];
  const mapRaw = root.map;
  if (isRecord(mapRaw)) {
    let path_coordinates: [number, number][] | undefined;
    const pc = mapRaw.path_coordinates ?? mapRaw.pathCoordinates;
    if (Array.isArray(pc)) {
      const pairs: [number, number][] = [];
      for (const p of pc) {
        if (Array.isArray(p) && p.length >= 2) {
          const lng = num(p[0]);
          const lat = num(p[1]);
          if (lng !== undefined && lat !== undefined) pairs.push([lng, lat]);
        }
      }
      if (pairs.length > 0) path_coordinates = pairs;
    }
    const nodesRaw = mapRaw.nodes;
    const nodes = Array.isArray(nodesRaw)
      ? nodesRaw
          .map((n) => {
            if (!isRecord(n)) return undefined;
            const lng = num(n.lng ?? n.lon ?? n.longitude);
            const lat = num(n.lat ?? n.latitude);
            if (lng === undefined || lat === undefined) return undefined;
            return {
              lng,
              lat,
              label: typeof n.label === 'string' ? n.label : typeof n.name === 'string' ? n.name : undefined,
              kind: typeof n.kind === 'string' ? n.kind : typeof n.type === 'string' ? n.type : undefined,
            };
          })
          .filter(Boolean)
      : undefined;
    const c = mapRaw.center;
    const center =
      isRecord(c) && num(c.lng) !== undefined && num(c.lat) !== undefined
        ? { lng: num(c.lng)!, lat: num(c.lat)! }
        : undefined;
    const typedNodes =
      nodes && nodes.length ? (nodes.filter(Boolean) as ConsultationMapNode[]) : undefined;
    map = {
      ...(path_coordinates ? { path_coordinates } : {}),
      ...(typedNodes?.length ? { nodes: typedNodes } : {}),
      ...(center ? { center } : {}),
      ...(num(mapRaw.zoom) !== undefined ? { zoom: num(mapRaw.zoom) } : {}),
    };
    if (!map.path_coordinates && (!map.nodes || map.nodes.length === 0) && !map.center) {
      map = Object.keys(map).length ? map : undefined;
    }
  }

  const risks = Array.isArray(root.risks)
    ? root.risks
        .map((r) => {
          if (!isRecord(r)) return undefined;
          const title = String(r.title ?? r.name ?? '').trim();
          if (!title) return undefined;
          return {
            title,
            level: typeof r.level === 'string' ? r.level : undefined,
            summary: typeof r.summary === 'string' ? r.summary : undefined,
            details: Array.isArray(r.details)
              ? r.details.map((x) => String(x)).filter(Boolean)
              : Array.isArray(r.problems)
                ? r.problems.map((x) => String(x)).filter(Boolean)
                : undefined,
            suggestions: Array.isArray(r.suggestions)
              ? r.suggestions.map((x) => String(x)).filter(Boolean)
              : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  const risk_analysis = Array.isArray(root.risk_analysis) ? root.risk_analysis : undefined;
  const risksMerged =
    risks && risks.length
      ? risks
      : risk_analysis && Array.isArray(risk_analysis)
        ? risk_analysis
            .map((r) => {
              if (!isRecord(r)) return undefined;
              const title = String(r.title ?? r.summary ?? '').trim();
              if (!title) return undefined;
              return {
                title,
                level: typeof r.level === 'string' ? r.level : typeof r.severity === 'string' ? r.severity : undefined,
                summary: typeof r.summary === 'string' ? r.summary : undefined,
                details: Array.isArray(r.details) ? r.details.map((x) => String(x)) : undefined,
                suggestions: Array.isArray(r.suggestions) ? r.suggestions.map((x) => String(x)) : undefined,
              };
            })
            .filter(Boolean)
        : undefined;

  const daily_plan = Array.isArray(root.daily_plan)
    ? root.daily_plan
        .map((day, idx) => {
          if (!isRecord(day)) return undefined;
          const segmentsRaw = day.segments;
          const segments = Array.isArray(segmentsRaw)
            ? segmentsRaw
                .map((s) => {
                  if (!isRecord(s)) return undefined;
                  const label = String(s.label ?? s.title ?? s.activity ?? '').trim();
                  if (!label) return undefined;
                  return {
                    time:
                      typeof s.time === 'string'
                        ? s.time
                        : typeof s.start_time === 'string'
                          ? s.start_time
                          : undefined,
                    label,
                    detail: typeof s.detail === 'string' ? s.detail : typeof s.note === 'string' ? s.note : undefined,
                    risk: Boolean(s.risk ?? s.is_risk ?? s.warning),
                  };
                })
                .filter(Boolean)
            : undefined;
          const title = String(day.title ?? day.day_title ?? '').trim();
          const subtitle = String(day.subtitle ?? '').trim();
          return {
            day_index: num(day.day_index ?? day.day ?? idx + 1),
            title: title || undefined,
            subtitle: subtitle || undefined,
            segments:
              segments && segments.length ? (segments.filter(Boolean) as ConsultationDaySegment[]) : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  let budget: ConsultationDashboardPayload['budget'];
  const budgetRaw = root.budget ?? root.budget_breakdown;
  if (isRecord(budgetRaw)) {
    const br = Array.isArray(budgetRaw.breakdown) ? budgetRaw.breakdown : undefined;
    const breakdown = br
      ? br
          .map((b) => {
            if (!isRecord(b)) return undefined;
            const label = String(b.label ?? b.category ?? b.name ?? '').trim();
            if (!label) return undefined;
            let share = num(b.share ?? b.pct ?? b.percentage);
            if (share !== undefined && share > 1.0001) share = share / 100;
            return {
              label,
              share,
              amount: num(b.amount ?? b.value),
            };
          })
          .filter(Boolean)
      : undefined;
    budget = {
      currency: typeof budgetRaw.currency === 'string' ? budgetRaw.currency : undefined,
      total_range_label:
        typeof budgetRaw.total_range_label === 'string'
          ? budgetRaw.total_range_label
          : typeof budgetRaw.total_label === 'string'
            ? budgetRaw.total_label
            : undefined,
      ...(breakdown && breakdown.length
        ? {
            breakdown: breakdown as NonNullable<ConsultationDashboardPayload['budget']>['breakdown'],
          }
        : {}),
    };
    if (!budget.breakdown?.length && !budget.total_range_label && !budget.currency) budget = undefined;
  }

  const booking_deadlines = Array.isArray(root.booking_deadlines)
    ? root.booking_deadlines
        .map((b) => {
          if (!isRecord(b)) return undefined;
          const item = String(b.item ?? b.title ?? b.name ?? '').trim();
          const deadline = String(b.deadline ?? b.by ?? b.when ?? '').trim();
          if (!item || !deadline) return undefined;
          return {
            item,
            deadline,
            urgency: typeof b.urgency === 'string' ? b.urgency : undefined,
            cta_label: typeof b.cta_label === 'string' ? b.cta_label : undefined,
            cta_url: typeof b.cta_url === 'string' ? b.cta_url : undefined,
          };
        })
        .filter(Boolean)
    : Array.isArray(root.booking_alerts)
      ? root.booking_alerts
          .map((b) => {
            if (!isRecord(b)) return undefined;
            const item = String(b.item ?? b.title ?? '').trim();
            const deadline = String(b.deadline ?? b.alert ?? '').trim();
            if (!item || !deadline) return undefined;
            return {
              item,
              deadline,
              urgency: typeof b.urgency === 'string' ? b.urgency : undefined,
            };
          })
          .filter(Boolean)
      : undefined;

  const primary_cta_label =
    typeof root.primary_cta_label === 'string'
      ? root.primary_cta_label.trim()
      : typeof root.primaryCtaLabel === 'string'
        ? root.primaryCtaLabel.trim()
        : undefined;

  const dashboard_origin_raw =
    typeof root.dashboard_origin === 'string'
      ? root.dashboard_origin.trim()
      : typeof root.dashboardOrigin === 'string'
        ? root.dashboardOrigin.trim()
        : undefined;

  const out: ConsultationDashboardPayload = {
    ...(dashboard_origin_raw ? { dashboard_origin: dashboard_origin_raw } : {}),
    ...(headline ? { headline } : {}),
    ...(subheadline ? { subheadline } : {}),
    ...(score_dimensions && score_dimensions.length ? { score_dimensions } : {}),
    ...(summary_cards && summary_cards.length ? { summary_cards } : {}),
    ...(map && Object.keys(map).length ? { map } : {}),
    ...(risksMerged && risksMerged.length ? { risks: risksMerged as ConsultationDashboardPayload['risks'] } : {}),
    ...(daily_plan && daily_plan.length ? { daily_plan: daily_plan as ConsultationDashboardPayload['daily_plan'] } : {}),
    ...(budget ? { budget } : {}),
    ...(booking_deadlines && booking_deadlines.length
      ? { booking_deadlines: booking_deadlines as ConsultationDashboardPayload['booking_deadlines'] }
      : {}),
    ...(primary_cta_label ? { primary_cta_label } : {}),
  };

  if (!consultationDashboardHasRenderableContent(out)) return undefined;
  return out;
}

export function consultationDashboardHasRenderableContent(d: ConsultationDashboardPayload): boolean {
  return Boolean(
    d.headline ||
      d.subheadline ||
      (d.score_dimensions && d.score_dimensions.length > 0) ||
      (d.summary_cards && d.summary_cards.length > 0) ||
      (d.map &&
        (d.map.path_coordinates?.length ||
          (d.map.nodes && d.map.nodes.length > 0) ||
          d.map.center)) ||
      (d.risks && d.risks.length > 0) ||
      (d.daily_plan && d.daily_plan.some((day) => day.segments?.length || day.title)) ||
      (d.budget && (d.budget.breakdown?.length || d.budget.total_range_label)) ||
      (d.booking_deadlines && d.booking_deadlines.length > 0) ||
      d.primary_cta_label
  );
}
