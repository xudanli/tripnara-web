import type {
  CompilePhase,
  CtreCompileProgressView,
  CtreCompileStatus,
  CtreCounterProgress,
} from './types';

export const CTRE_PHASE_LABEL_ZH: Record<CompilePhase, string> = {
  LEXICAL: '词法分析',
  CANONICALIZATION: 'POI 标准化',
  GRAPH_CONSTRUCTION: '行程图构建',
  ROUTE_RESOLUTION: '路线解析',
  SEMANTIC: '语义标注',
  LINKING: '依赖关联',
  VALIDATION: '编译校验',
  OPTIMIZATION: '编译优化',
};

const COUNTER_ROWS = [
  ['POI', '兴趣点'],
  ['Route', '路线'],
  ['Booking', '预订'],
  ['Constraint', '约束'],
  ['Dependency', '依赖'],
] as const;

export type CtreCounterRow = {
  key: (typeof COUNTER_ROWS)[number][0];
  label: string;
  done: number;
  total: number;
};

export function getCtrePhaseLabel(phase: CompilePhase): string {
  return CTRE_PHASE_LABEL_ZH[phase] ?? phase;
}

export function getCtreCounterRows(
  counters: CtreCompileProgressView['counters'],
): CtreCounterRow[] {
  return COUNTER_ROWS.map(([key, label]) => ({
    key,
    label,
    done: counters[key]?.done ?? 0,
    total: counters[key]?.total ?? 0,
  })).filter((row) => row.total != null && row.total > 0);
}

export function formatCtreHeadline(p: CtreCompileProgressView): string {
  const parts = getCtreCounterRows(p.counters).map((r) => `${r.label} ${r.done}/${r.total}`);
  const suffix = parts.length ? `（${parts.join(' · ')}）` : '';
  const repair = p.trigger === 'repair' ? '(修复后)' : '';
  return `CTRE 编译${repair}：${p.status} score=${p.score}${suffix}`;
}

export function counterIcon(done: number, total: number): 'ok' | 'warn' | 'pending' {
  if (total <= 0) return 'pending';
  if (done >= total) return 'ok';
  if (done > 0) return 'warn';
  return 'warn';
}

export function getCtreStatusBadge(status: CtreCompileStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'success':
      return {
        label: '编译完成',
        className: 'border-gate-allow-border/40 bg-gate-allow-foreground/10 text-gate-allow-foreground dark:text-gate-allow-foreground',
      };
    case 'partial':
      return {
        label: '部分完成',
        className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      };
    case 'failed':
      return {
        label: '编译失败',
        className: 'border-gate-reject-border/40 bg-gate-reject-foreground/10 text-gate-reject-foreground dark:text-gate-reject-foreground',
      };
    default:
      return {
        label: status,
        className: 'border-border bg-muted text-muted-foreground',
      };
  }
}

export function getCtreTriggerLabel(trigger: CtreCompileProgressView['trigger']): string {
  return trigger === 'repair' ? '修复后重编译' : '方案生成';
}

export function formatAffectedDays(indices: number[] | undefined): string | null {
  if (!indices?.length) return null;
  return `受影响天数：Day ${indices.map((i) => i + 1).join(', ')}`;
}

export function truncateCompileId(compileId: string, visible = 8): string {
  const trimmed = compileId.trim();
  if (trimmed.length <= visible + 1) return trimmed;
  return `${trimmed.slice(0, visible)}…`;
}

/** 后端 snake_case / 缺字段容错 */
export function normalizeCtreCompileProgress(raw: unknown): CtreCompileProgressView | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const compileId = String(obj.compileId ?? obj.compile_id ?? '').trim();
  if (!compileId) return null;

  const status = String(obj.status ?? 'partial') as CtreCompileStatus;
  const trigger = String(obj.trigger ?? 'plan_gen') as CtreCompileProgressView['trigger'];

  const normalizeCounter = (c: unknown): CtreCounterProgress | undefined => {
    if (!c || typeof c !== 'object') return undefined;
    const row = c as Record<string, unknown>;
    const done = Number(row.done ?? 0);
    const total = Number(row.total ?? 0);
    if (!Number.isFinite(done) || !Number.isFinite(total)) return undefined;
    return { done, total };
  };

  const countersRaw = (obj.counters ?? {}) as Record<string, unknown>;
  const counters: CtreCompileProgressView['counters'] = {};
  for (const key of ['POI', 'Route', 'Booking', 'Constraint', 'Dependency'] as const) {
    const normalized = normalizeCounter(countersRaw[key]);
    if (normalized) counters[key] = normalized;
  }

  const phasesRaw = Array.isArray(obj.phases) ? obj.phases : [];
  const phases = phasesRaw
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const phaseObj = p as Record<string, unknown>;
      const phase = String(phaseObj.phase ?? '') as CompilePhase;
      if (!phase) return null;
      return {
        phase,
        status: String(phaseObj.status ?? 'pending') as CtreCompileProgressView['phases'][0]['status'],
        summary: typeof phaseObj.summary === 'string' ? phaseObj.summary : undefined,
        durationMs:
          typeof phaseObj.durationMs === 'number'
            ? phaseObj.durationMs
            : typeof phaseObj.duration_ms === 'number'
              ? phaseObj.duration_ms
              : undefined,
        counters: phaseObj.counters as Record<string, CtreCounterProgress> | undefined,
      };
    })
    .filter(Boolean) as CtreCompileProgressView['phases'];

  const incrementalRaw = obj.incremental;
  let incremental: CtreCompileProgressView['incremental'] | undefined;
  if (incrementalRaw && typeof incrementalRaw === 'object') {
    const inc = incrementalRaw as Record<string, unknown>;
    incremental = {
      affectedDayIndices: Array.isArray(inc.affectedDayIndices)
        ? inc.affectedDayIndices.map(Number).filter(Number.isFinite)
        : Array.isArray(inc.affected_day_indices)
          ? inc.affected_day_indices.map(Number).filter(Number.isFinite)
          : [],
      previousCompileId:
        typeof inc.previousCompileId === 'string'
          ? inc.previousCompileId
          : typeof inc.previous_compile_id === 'string'
            ? inc.previous_compile_id
            : undefined,
      merged: Boolean(inc.merged),
    };
  }

  return {
    schemaId: 'tripnara.ctre_compile_progress@v0',
    engine: 'CTRE',
    compileId,
    status: status === 'success' || status === 'failed' ? status : 'partial',
    score: Number(obj.score ?? 0),
    trigger: trigger === 'repair' ? 'repair' : 'plan_gen',
    incremental,
    phases,
    counters,
    updatedAt: String(obj.updatedAt ?? obj.updated_at ?? new Date().toISOString()),
  };
}
