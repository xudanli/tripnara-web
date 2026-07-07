import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  PLAN_OBJECT_CHAIN_ORDER,
  PLAN_OBJECT_SCHEMA,
  type PlanObjectDayChainDto,
  type PlanObjectDto,
  type PlanObjectKind,
  type PlanObjectsResponse,
} from '@/types/plan-objects';
import type { FeasibilityIssueDto, FeasibilityProofAtomDto } from '@/types/trip-feasibility-report';

export const PLAN_OBJECT_EVIDENCE_SOURCE = 'plan-object-evaluator' as const;
export const PLAN_OBJECT_SEMANTIC_PREFIX = 'plan_object_';

const CHAIN_RANK = new Map<PlanObjectKind, number>(
  PLAN_OBJECT_CHAIN_ORDER.map((kind, index) => [kind, index]),
);

const PLAN_OBJECT_KIND_SET = new Set<string>(PLAN_OBJECT_CHAIN_ORDER);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

/** BFF 可能返回 `type`（curl 可见）或 `kind` */
export function normalizePlanObjectKind(raw: unknown): PlanObjectKind | undefined {
  const value = readString(raw)?.toUpperCase();
  if (!value) return undefined;
  if (PLAN_OBJECT_KIND_SET.has(value)) return value as PlanObjectKind;
  if (value === 'MEAL') return 'MEAL_WINDOW';
  return undefined;
}

function readObjectsArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function readDayObjects(record: Record<string, unknown>): unknown[] {
  for (const key of [
    'objects',
    'items',
    'chain',
    'entries',
    'planObjectChain',
    'plan_object_chain',
    'planObjects',
    'plan_objects',
  ]) {
    const arr = readObjectsArray(record[key]);
    if (arr.length) return arr;
  }
  return [];
}

function coerceDaysList(daysRaw: unknown): unknown[] {
  if (Array.isArray(daysRaw)) return daysRaw;
  if (daysRaw && typeof daysRaw === 'object') {
    return Object.entries(daysRaw as Record<string, unknown>)
      .map(([key, value]) => {
        const dayNum = Number(key);
        if (!Number.isFinite(dayNum)) return null;
        if (Array.isArray(value)) {
          return { dayNumber: dayNum, objects: value };
        }
        const rec = asRecord(value);
        if (rec) return { dayNumber: dayNum, ...rec };
        return null;
      })
      .filter((item): item is Record<string, unknown> => item != null);
  }
  return [];
}

/** 将 BFF plan-object 条目归一为前端 DTO（type → kind，name → label） */
export function normalizePlanObjectDto(
  raw: unknown,
  fallbackId?: string,
): PlanObjectDto | null {
  const record = asRecord(raw);
  if (!record) return null;

  const nested = asRecord(record.planObject ?? record.plan_object);
  const source = nested ?? record;

  const id =
    readString(source.id) ??
    readString(source.objectId ?? source.object_id) ??
    readString(source.planObjectId ?? source.plan_object_id) ??
    readString(source.uuid) ??
    fallbackId;

  if (!id) return null;

  const kind =
    normalizePlanObjectKind(source.kind) ??
    normalizePlanObjectKind(source.type) ??
    normalizePlanObjectKind(source.objectType ?? source.object_type);

  if (!kind) return null;

  const label =
    readString(source.label) ??
    readString(source.name) ??
    readString(source.title) ??
    readString(source.placeName ?? source.place_name) ??
    readString(source.displayName ?? source.display_name);

  const dayNumberRaw = source.dayNumber ?? source.day_number ?? source.day;
  const dayNumber =
    typeof dayNumberRaw === 'number' && Number.isFinite(dayNumberRaw)
      ? dayNumberRaw
      : Number(dayNumberRaw);

  const metadataBase =
    source.metadata && typeof source.metadata === 'object'
      ? (source.metadata as Record<string, unknown>)
      : undefined;
  const metadata =
    metadataBase || Number.isFinite(dayNumber)
      ? {
          ...(metadataBase ?? {}),
          ...(Number.isFinite(dayNumber) ? { dayNumber } : {}),
        }
      : undefined;

  return {
    id,
    kind,
    label,
    startAt: readString(source.startAt ?? source.start_at),
    endAt: readString(source.endAt ?? source.end_at),
    placeId: readString(source.placeId ?? source.place_id),
    itemId: readString(source.itemId ?? source.item_id),
    metadata,
  };
}

export function normalizePlanObjectDayChain(
  day: PlanObjectDayChainDto | Record<string, unknown>,
): PlanObjectDayChainDto {
  const record = asRecord(day) ?? (day as PlanObjectDayChainDto);
  const dayNumberRaw = record.dayNumber ?? record.day_number;
  const dayNumber =
    typeof dayNumberRaw === 'number' && Number.isFinite(dayNumberRaw)
      ? dayNumberRaw
      : Number(dayNumberRaw);

  const objectsRaw = readDayObjects(record);
  const dayNumberResolved = Number.isFinite(dayNumber) ? dayNumber : 0;
  const objects = objectsRaw
    .map((item, index) =>
      normalizePlanObjectDto(item, `day${dayNumberResolved}_obj${index}`),
    )
    .filter((item): item is PlanObjectDto => item != null);

  return {
    dayNumber: dayNumberResolved,
    tripDayId: readString(record.tripDayId ?? record.trip_day_id),
    objects: sortPlanObjectChain(objects),
  };
}

export function countPlanObjectChainObjects(days: PlanObjectDayChainDto[]): number {
  return days.reduce((sum, day) => sum + day.objects.length, 0);
}

function groupTopLevelObjects(objects: unknown[]): Map<number, PlanObjectDto[]> {
  const map = new Map<number, PlanObjectDto[]>();
  objects.forEach((raw, index) => {
    const rec = asRecord(raw);
    const dayNumRaw = rec?.dayNumber ?? rec?.day_number ?? rec?.day;
    const dayNumber =
      typeof dayNumRaw === 'number' && Number.isFinite(dayNumRaw)
        ? dayNumRaw
        : Number(dayNumRaw);
    const dto = normalizePlanObjectDto(raw, `top_obj_${index}`);
    if (!dto || !Number.isFinite(dayNumber)) return;
    const list = map.get(dayNumber) ?? [];
    list.push(dto);
    map.set(dayNumber, list);
  });
  return map;
}

/** 解析 GET /plan-objects 或 timeline planObjects 块（兼容多种 BFF 字段名） */
export function parsePlanObjectsResponsePayload(raw: unknown): PlanObjectsResponse {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? root;

  const daysRaw =
    data.days ?? data.dailyChains ?? data.daily_chains ?? data.byDay ?? data.by_day;

  let days = normalizePlanObjectsDays(coerceDaysList(daysRaw));

  const topRaw = data.objects ?? data.planObjects ?? data.plan_objects ?? data.entries;
  const topList = readObjectsArray(topRaw);
  if (topList.length) {
    const grouped = groupTopLevelObjects(topList);
    if (countPlanObjectChainObjects(days) === 0 && grouped.size > 0) {
      days = [...grouped.entries()]
        .sort(([a], [b]) => a - b)
        .map(([dayNumber, objects]) => ({
          dayNumber,
          objects: sortPlanObjectChain(objects),
        }));
    } else if (grouped.size > 0) {
      days = days.map((day) => {
        if (day.objects.length) return day;
        const fromTop = grouped.get(day.dayNumber);
        return fromTop?.length
          ? { ...day, objects: sortPlanObjectChain(fromTop) }
          : day;
      });
    }
  }

  return {
    schema: readString(data.schema) ?? PLAN_OBJECT_SCHEMA,
    tripId: readString(data.tripId ?? data.trip_id) ?? '',
    generatedAt: readString(data.generatedAt ?? data.generated_at),
    days,
  };
}

export function normalizePlanObjectsDays(days: unknown): PlanObjectDayChainDto[] {
  if (!Array.isArray(days)) return [];
  return days.map((day) => normalizePlanObjectDayChain(day as PlanObjectDayChainDto)).filter(
    (day) => day.dayNumber > 0 || day.objects.length > 0,
  );
}

export function isPlanObjectEvidenceSource(source: string | undefined | null): boolean {
  return source === PLAN_OBJECT_EVIDENCE_SOURCE;
}

export function isPlanObjectSemanticKey(key: string | undefined | null): boolean {
  return typeof key === 'string' && key.startsWith(PLAN_OBJECT_SEMANTIC_PREFIX);
}

export function proofsHavePlanObjectEvidence(
  proofs: FeasibilityProofAtomDto[] | undefined | null,
): boolean {
  return (proofs ?? []).some((proof) => isPlanObjectEvidenceSource(proof.evidenceSource));
}

export function isPlanObjectFeasibilityIssue(issue: FeasibilityIssueDto | undefined | null): boolean {
  if (!issue) return false;
  if (proofsHavePlanObjectEvidence(issue.proofs)) return true;
  return isPlanObjectSemanticKey(issue.id) || isPlanObjectSemanticKey(issue.decisionProblemId);
}

export function isPlanObjectPlanningConflict(
  conflict: Pick<PlanningConflictItem, 'semanticKey' | 'issue' | 'id'> | undefined | null,
): boolean {
  if (!conflict) return false;
  if (isPlanObjectSemanticKey(conflict.semanticKey) || isPlanObjectSemanticKey(conflict.id)) {
    return true;
  }
  return isPlanObjectFeasibilityIssue(conflict.issue ?? undefined);
}

export function isPlanObjectDecisionProblem(
  problem: Pick<DecisionProblemSummary, 'semanticKey' | 'id'> | undefined | null,
): boolean {
  if (!problem) return false;
  return isPlanObjectSemanticKey(problem.semanticKey) || isPlanObjectSemanticKey(problem.id);
}

export function sortPlanObjectChain(objects: PlanObjectDto[]): PlanObjectDto[] {
  return [...objects].sort((a, b) => {
    const rankA = CHAIN_RANK.get(a.kind) ?? 99;
    const rankB = CHAIN_RANK.get(b.kind) ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    const startA = a.startAt ?? '';
    const startB = b.startAt ?? '';
    return startA.localeCompare(startB);
  });
}

export function planObjectKindLabel(kind: PlanObjectKind): string {
  switch (kind) {
    case 'STAY':
      return '住宿';
    case 'TRANSFER':
      return '转场';
    case 'VISIT':
      return '游览';
    case 'MEAL_WINDOW':
      return '用餐';
    default:
      return kind;
  }
}
