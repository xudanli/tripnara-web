import type { HikePlanPrepData } from '@/types/hike-plan';
import type { ChecklistItem, PrepChecklist, PrepPermit, PrepTransport } from '@/types/trail';
import {
  defaultPrepChecklist,
  defaultPrepPermits,
  defaultPrepTransport,
} from '@/services/hike-plan-local-store';
import { ensureUniquePermitIds } from '@/lib/prep-permits-ui';

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeChecklistItem(
  raw: Record<string, unknown>,
  index: number,
  categoryId: string
): ChecklistItem {
  const nameCN = pickString(raw.nameCN);
  const name = pickString(raw.name) ?? nameCN ?? '未命名项';
  return {
    id: pickString(raw.id, raw.itemId) ?? `${categoryId}-item-${index}`,
    name,
    nameCN,
    required: Boolean(raw.required ?? raw.isRequired ?? false),
    checked: Boolean(raw.checked ?? raw.isChecked ?? raw.done ?? false),
    reason: pickString(raw.reason, raw.reasonZh, raw.note, raw.noteZh),
  };
}

function isFlatChecklistRow(row: Record<string, unknown>): boolean {
  if (Array.isArray(row.items)) return false;
  return Boolean(
    pickString(row.name, row.nameCN) ?? row.required ?? row.checked
  );
}

function groupFlatChecklistRows(rows: Record<string, unknown>[]): PrepChecklist[] {
  const groups = new Map<string, ChecklistItem[]>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cat = pickString(row.category, row.categoryId, row.group) ?? 'gear';
    const items = groups.get(cat) ?? [];
    items.push(normalizeChecklistItem(row, i, cat));
    groups.set(cat, items);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({
    id: category,
    category,
    items,
  }));
}

function normalizeNestedChecklist(list: PrepChecklist[]): PrepChecklist[] {
  return list.map((cat, idx) => {
    const catId = cat.id ?? cat.category ?? `cat-${idx}`;
    const rawItems = Array.isArray(cat.items) ? cat.items : [];
    return {
      id: catId,
      category: String(cat.category ?? 'gear'),
      items: rawItems.map((item, i) =>
        normalizeChecklistItem(item as unknown as Record<string, unknown>, i, catId)
      ),
    };
  });
}

function coerceChecklistFromApi(raw?: unknown): PrepChecklist[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const rows = raw as Record<string, unknown>[];
  if (rows.every(isFlatChecklistRow)) {
    return groupFlatChecklistRows(rows);
  }

  const nested = normalizeNestedChecklist(raw as PrepChecklist[]);
  const totalItems = nested.reduce((n, c) => n + c.items.length, 0);
  if (totalItems === 0 && rows.length > 0) {
    return groupFlatChecklistRows(rows);
  }
  return nested;
}

function normalizePermit(raw: Record<string, unknown>, index: number): PrepPermit {
  const titleZh = pickString(raw.titleZh);
  const nameCN = pickString(raw.nameCN) ?? titleZh;
  const name = pickString(raw.name) ?? nameCN ?? titleZh ?? '许可';
  return {
    id: pickString(raw.id, raw.permitId) ?? `permit-${index}`,
    name,
    nameCN,
    titleZh,
    required: Boolean(raw.required ?? raw.isRequired ?? true),
    obtained: Boolean(raw.obtained ?? raw.isObtained ?? false),
    bookingUrl: pickString(raw.bookingUrl, raw.url, raw.link),
    capacity: typeof raw.capacity === 'number' ? raw.capacity : undefined,
    deadline: pickString(raw.deadline, raw.deadlineZh),
    cost: typeof raw.cost === 'number' ? raw.cost : undefined,
  };
}

function coercePermitsFromApi(raw?: unknown): PrepPermit[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const list = (raw as Record<string, unknown>[]).map((p, i) => normalizePermit(p, i));
  return ensureUniquePermitIds(list);
}

function normalizeTransport(raw?: PrepTransport | null): PrepTransport | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const base = defaultPrepTransport();
  const r = raw as PrepTransport & Record<string, unknown>;
  const toObj = (r.toTrailhead ?? {}) as Record<string, unknown>;
  const fromObj = (r.fromTrailhead ?? {}) as Record<string, unknown>;

  return {
    type: (r.type as PrepTransport['type']) ?? base.type,
    toTrailhead: {
      method: pickString(toObj.method) ?? base.toTrailhead.method,
      details: pickString(toObj.details, toObj.noteZh),
      parkingLocation: toObj.parkingLocation as PrepTransport['toTrailhead']['parkingLocation'],
      estimatedDuration:
        typeof toObj.estimatedDuration === 'number'
          ? toObj.estimatedDuration
          : undefined,
    },
    fromTrailhead: {
      method: pickString(fromObj.method) ?? base.fromTrailhead.method,
      details: pickString(fromObj.details, fromObj.noteZh),
      lastDeparture: pickString(fromObj.lastDeparture),
      suggestedDepartTime: pickString(fromObj.suggestedDepartTime),
    },
  };
}

function readPrepFlags(prep: Partial<HikePlanPrepData>): {
  checklistComplete: boolean;
  permitsComplete: boolean;
  offlineReady: boolean;
} {
  return {
    checklistComplete: Boolean(
      prep.checklistComplete ?? prep.checklistCompleted
    ),
    permitsComplete: Boolean(prep.permitsComplete ?? prep.permitsObtained),
    offlineReady: Boolean(
      prep.offlineReady ?? prep.offlinePackDownloaded
    ),
  };
}

export type NormalizeHikePlanPrepOptions = {
  /** 仅当 checklist/permits 全空时使用前端默认模板 */
  useDefaultsWhenEmpty?: boolean;
};

/** 对齐 GET/PATCH prep；兼容旧扁平数据迁移后的新结构 */
export function normalizeHikePlanPrep(
  prep: Partial<HikePlanPrepData> | null | undefined,
  hikePlanId: string,
  options?: NormalizeHikePlanPrepOptions
): HikePlanPrepData & {
  checklistComplete: boolean;
  permitsComplete: boolean;
  offlineReady: boolean;
} {
  const useDefaults = options?.useDefaultsWhenEmpty !== false;

  let checklist = coerceChecklistFromApi(prep?.checklist);
  let permits = coercePermitsFromApi(prep?.permits);

  if (useDefaults && checklist.every((c) => c.items.length === 0)) {
    checklist = defaultPrepChecklist();
  }
  if (useDefaults && permits.length === 0) {
    permits = defaultPrepPermits();
  }

  const flags = readPrepFlags(prep ?? {});

  return {
    hikePlanId: prep?.hikePlanId ?? hikePlanId,
    checklist,
    permits,
    transport: normalizeTransport(prep?.transport) ?? defaultPrepTransport(),
    ...flags,
  };
}
