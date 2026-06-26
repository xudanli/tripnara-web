/**
 * route_and_run narration 主动提示层：
 * - narration.tips 中带 [主动提示] 的条目
 * - narration.research_ui_hints（scope: proactive:*）
 */

import type { RouteAndRunResponse, OrchestrationResult } from '@/api/agent';
import { normalizeCascadeUiHints } from '@/lib/readiness-cascade.util';
import type { CascadeUiHint } from '@/types/readiness-cascade';

const PROACTIVE_TIP_PREFIX = '[主动提示]';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

export function isProactiveNarrationTip(tip: string): boolean {
  return tip.trim().startsWith(PROACTIVE_TIP_PREFIX);
}

export function stripProactiveTipPrefix(tip: string): string {
  return tip.trim().replace(/^\[主动提示\]\s*/, '').trim();
}

export interface ProactiveResearchUiHint {
  scope: string;
  message: string;
  title?: string;
}

export interface ProactiveNarrationBundle {
  tips: string[];
  researchHints: ProactiveResearchUiHint[];
  /** research_ui_hints 中与 cascade 同形的卡片 */
  cascadeHints: CascadeUiHint[];
}

function isProactiveScope(scope: unknown): boolean {
  const s = String(scope ?? '').trim().toLowerCase();
  if (!s) return false;
  return s.startsWith('proactive') || s.includes('proactive:');
}

function normalizeResearchUiHint(raw: unknown): ProactiveResearchUiHint | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const scope = String(o.scope ?? o.scope_id ?? o.scopeId ?? '').trim();
  if (!isProactiveScope(scope)) return null;

  const message = String(o.message ?? o.summary ?? o.text ?? o.body ?? '').trim();
  if (!message) return null;

  const titleRaw = o.title ?? o.headline ?? o.label;
  const title = titleRaw != null ? String(titleRaw).trim() : undefined;

  return { scope, message, ...(title ? { title } : {}) };
}

function collectNarrationRecords(
  payload: unknown,
  orchestrationResult?: OrchestrationResult | null
): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const push = (raw: unknown) => {
    const r = asRecord(raw);
    if (r) records.push(r);
  };

  const p = asRecord(payload);
  push(p?.narration);

  const orch = asRecord(orchestrationResult ?? p?.orchestrationResult);
  const state = asRecord(orch?.state);
  push(state?.narration);

  return records;
}

function extractProactiveTipsFromRecords(records: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const n of records) {
    const tipsRaw = n.tips;
    if (!Array.isArray(tipsRaw)) continue;
    for (const raw of tipsRaw) {
      if (typeof raw !== 'string') continue;
      if (!isProactiveNarrationTip(raw)) continue;
      const text = stripProactiveTipPrefix(raw);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
    }
  }

  return out;
}

function extractResearchHintsFromRecords(records: Record<string, unknown>[]): {
  simple: ProactiveResearchUiHint[];
  cascade: CascadeUiHint[];
} {
  const simpleSeen = new Set<string>();
  const cascadeSeen = new Set<string>();
  const simple: ProactiveResearchUiHint[] = [];
  const cascade: CascadeUiHint[] = [];

  for (const n of records) {
    const rawHints = n.research_ui_hints ?? n.researchUiHints;
    if (!Array.isArray(rawHints)) continue;

    for (const item of rawHints) {
      const o = asRecord(item);
      if (!o) continue;
      const scope = String(o.scope ?? o.scope_id ?? o.scopeId ?? '').trim();
      if (!isProactiveScope(scope)) continue;

      const cascadeHint = normalizeCascadeUiHints([item])[0];
      const hasCascadeShape =
        cascadeHint &&
        (o.risk_level != null ||
          o.riskLevel != null ||
          o.recommendation != null ||
          o.entity_kind != null ||
          o.entityKind != null);

      if (hasCascadeShape && cascadeHint) {
        if (cascadeSeen.has(cascadeHint.id)) continue;
        cascadeSeen.add(cascadeHint.id);
        cascade.push(cascadeHint);
        continue;
      }

      const hint = normalizeResearchUiHint(item);
      if (!hint) continue;
      const key = `${hint.scope}|${hint.message}`;
      if (simpleSeen.has(key)) continue;
      simpleSeen.add(key);
      simple.push(hint);
    }
  }

  return { simple, cascade };
}

export function pickProactiveNarrationFromSources(
  payload: unknown,
  orchestrationResult?: OrchestrationResult | null
): ProactiveNarrationBundle {
  const records = collectNarrationRecords(payload, orchestrationResult);
  const tips = extractProactiveTipsFromRecords(records);
  const { simple, cascade } = extractResearchHintsFromRecords(records);
  return { tips, researchHints: simple, cascadeHints: cascade };
}

export function pickProactiveNarrationFromRouteRun(
  response: RouteAndRunResponse
): ProactiveNarrationBundle {
  const payload = response.result?.payload;
  const orch =
    payload && typeof payload === 'object'
      ? ((payload as Record<string, unknown>).orchestrationResult as OrchestrationResult | undefined)
      : undefined;
  return pickProactiveNarrationFromSources(payload, orch ?? null);
}

export function hasProactiveNarrationContent(bundle: ProactiveNarrationBundle | null | undefined): boolean {
  if (!bundle) return false;
  return (
    bundle.tips.length > 0 ||
    bundle.researchHints.length > 0 ||
    bundle.cascadeHints.length > 0
  );
}
