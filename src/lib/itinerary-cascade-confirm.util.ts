import type { CascadeImpact } from '@/types/trip';

export interface ItineraryRequiresConfirmation {
  message: string;
  warnings: Array<{ message?: string; type?: string; severity?: string }>;
  cascadeImpact?: CascadeImpact | null;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function normalizeCascadeImpact(raw: unknown): CascadeImpact | null {
  const o = asRecord(raw);
  if (!o) return null;

  const affectedItemsRaw = o.affectedItems ?? o.affected_items;
  const affectedItems = Array.isArray(affectedItemsRaw)
    ? affectedItemsRaw
        .map((item) => {
          const a = asRecord(item);
          if (!a) return null;
          const id = String(a.id ?? '').trim();
          const name = String(a.name ?? a.label ?? '').trim();
          if (!id && !name) return null;
          return {
            id: id || name,
            name: name || id,
            originalTime: String(a.originalTime ?? a.original_time ?? ''),
            suggestedTime: String(a.suggestedTime ?? a.suggested_time ?? ''),
            delayMinutes: Number(a.delayMinutes ?? a.delay_minutes ?? 0) || 0,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];

  const affectedCount = Number(o.affectedCount ?? o.affected_count ?? affectedItems.length) || 0;
  if (affectedCount <= 0 && affectedItems.length === 0) return null;

  return {
    affectedCount: affectedCount || affectedItems.length,
    affectedItems,
    autoAdjusted: Boolean(o.autoAdjusted ?? o.auto_adjusted),
  };
}

/** 后端 REQUIRES_CONFIRMATION 或 API 层抛出的结构化确认 */
export function parseItineraryRequiresConfirmation(
  err: unknown
): ItineraryRequiresConfirmation | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as Error & {
    code?: string;
    warnings?: unknown[];
    cascadeImpact?: unknown;
  };

  if (e.code !== 'REQUIRES_CONFIRMATION') return null;

  const warnings = Array.isArray(e.warnings)
    ? e.warnings
        .map((w) => {
          const o = asRecord(w);
          if (!o) return null;
          return {
            message: o.message != null ? String(o.message) : undefined,
            type: o.type != null ? String(o.type) : undefined,
            severity: o.severity != null ? String(o.severity) : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];

  return {
    message: e.message || '此修改将影响后续行程，请确认处理方式。',
    warnings,
    cascadeImpact: normalizeCascadeImpact(e.cascadeImpact),
  };
}

/** 旧版文案匹配（无结构化 cascadeImpact 时兜底） */
export function parseLegacyCascadeWarningMessage(message: string): ItineraryRequiresConfirmation | null {
  const text = message.trim();
  if (!text) return null;

  const isCascadeWarning =
    text.includes('影响后续') || text.includes('将顺延') || text.includes('级联');
  if (!isCascadeWarning) return null;

  const cascadeMatch = text.match(/(\d+)\s*个(行程项|活动)/);
  const count = cascadeMatch ? parseInt(cascadeMatch[1], 10) : 1;

  return {
    message: text,
    warnings: [],
    cascadeImpact: {
      affectedCount: count,
      affectedItems: [],
      autoAdjusted: false,
    },
  };
}

export function resolveItineraryRequiresConfirmation(err: unknown): ItineraryRequiresConfirmation | null {
  return parseItineraryRequiresConfirmation(err) ?? parseLegacyCascadeWarningMessage(
    err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  );
}
