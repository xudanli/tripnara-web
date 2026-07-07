import { normalizeCtreCompileProgress } from './helpers';
import type {
  CtreKernelVerifyRepairLoop,
  CtreKernelVerifyRepairRoundDetail,
  KernelVerifyIssueSummary,
  KernelVerifyRepairTerminatedReason,
  WorkbenchCtreUiOutput,
} from './types';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRepairBlock(raw: unknown): CtreKernelVerifyRepairRoundDetail['repair'] | undefined {
  const repairRaw = readRecord(raw);
  if (!repairRaw) return undefined;
  return {
    applied: repairRaw.applied === true,
    skipped: repairRaw.skipped === true,
    reason: typeof repairRaw.reason === 'string' ? repairRaw.reason : undefined,
    segmentsUpdated: num(repairRaw.segmentsUpdated ?? repairRaw.segments_updated),
    itemsApplied: num(repairRaw.itemsApplied ?? repairRaw.items_applied),
  };
}

function normalizeIssue(raw: unknown): KernelVerifyIssueSummary | null {
  const obj = readRecord(raw);
  if (!obj) return null;
  const cls = String(obj.class ?? obj.issueClass ?? 'ADVISORY').toUpperCase();
  const issueClass =
    cls === 'FATAL' || cls === 'CONFLICT' || cls === 'ADVISORY' ? cls : 'ADVISORY';
  const code = String(obj.code ?? '').trim();
  if (!code) return null;
  return {
    code,
    class: issueClass,
    message: String(obj.message ?? ''),
  };
}

function normalizeRoundDetail(raw: unknown): CtreKernelVerifyRepairRoundDetail | null {
  const obj = readRecord(raw);
  if (!obj) return null;
  const verifyRaw = readRecord(obj.verify) ?? {};
  const issuesRaw = Array.isArray(verifyRaw.issues) ? verifyRaw.issues : [];
  const issues = issuesRaw.map(normalizeIssue).filter(Boolean) as KernelVerifyIssueSummary[];

  const repairRaw = readRecord(obj.repair);
  const recompileRaw = readRecord(obj.recompile);

  return {
    round: num(obj.round),
    verify: {
      issueCount: num(verifyRaw.issueCount ?? verifyRaw.issue_count),
      fatalCount: num(verifyRaw.fatalCount ?? verifyRaw.fatal_count),
      conflictCount: num(verifyRaw.conflictCount ?? verifyRaw.conflict_count),
      advisoryCount: num(verifyRaw.advisoryCount ?? verifyRaw.advisory_count),
      issues: issues.length ? issues : undefined,
    },
    repair: repairRaw
      ? {
          applied: repairRaw.applied === true,
          skipped: repairRaw.skipped === true,
          reason: typeof repairRaw.reason === 'string' ? repairRaw.reason : undefined,
          segmentsUpdated: num(repairRaw.segmentsUpdated ?? repairRaw.segments_updated),
          itemsApplied: num(repairRaw.itemsApplied ?? repairRaw.items_applied),
        }
      : undefined,
    recompile: recompileRaw
      ? {
          skipped: recompileRaw.skipped === true,
          status: (recompileRaw.status as CtreKernelVerifyRepairRoundDetail['recompile'])?.status,
          score: num(recompileRaw.score) || undefined,
          incrementalMerged:
            recompileRaw.incrementalMerged === true || recompileRaw.incremental_merged === true,
          affectedDayIndices: Array.isArray(recompileRaw.affectedDayIndices)
            ? recompileRaw.affectedDayIndices.map(Number).filter(Number.isFinite)
            : Array.isArray(recompileRaw.affected_day_indices)
              ? recompileRaw.affected_day_indices.map(Number).filter(Number.isFinite)
              : undefined,
        }
      : undefined,
  };
}

function normalizeVerifyCounts(raw: unknown): {
  issueCount?: number;
  fatalCount?: number;
  conflictCount?: number;
} | undefined {
  const obj = readRecord(raw);
  if (!obj) return undefined;
  return {
    issueCount: num(obj.issueCount ?? obj.issue_count),
    fatalCount: num(obj.fatalCount ?? obj.fatal_count),
    conflictCount: num(obj.conflictCount ?? obj.conflict_count),
  };
}

export function normalizeWorkbenchCtreUi(raw: unknown): WorkbenchCtreUiOutput | null {
  const obj = readRecord(raw);
  if (!obj) return null;

  const loopRaw = readRecord(obj.kernelVerifyRepairLoop ?? obj.kernel_verify_repair_loop);
  let kernelVerifyRepairLoop: CtreKernelVerifyRepairLoop | undefined;

  if (loopRaw) {
    const roundDetailsRaw = loopRaw.roundDetails ?? loopRaw.round_details;
    const roundDetails = Array.isArray(roundDetailsRaw)
      ? (roundDetailsRaw.map(normalizeRoundDetail).filter(Boolean) as CtreKernelVerifyRepairRoundDetail[])
      : undefined;

    kernelVerifyRepairLoop = {
      terminatedReason: (loopRaw.terminatedReason ??
        loopRaw.terminated_reason) as KernelVerifyRepairTerminatedReason,
      repairCount: num(loopRaw.repairCount ?? loopRaw.repair_count) || undefined,
      maxRepairs: num(loopRaw.maxRepairs ?? loopRaw.max_repairs) || undefined,
      rounds: num(loopRaw.rounds) || roundDetails?.length || undefined,
      finalVerify: normalizeVerifyCounts(loopRaw.finalVerify ?? loopRaw.final_verify),
      roundDetails,
    };
  }

  const progress = normalizeCtreCompileProgress(obj.progress) ?? undefined;
  const segmentRaw = readRecord(obj.segmentEnrichment ?? obj.segment_enrichment);

  return {
    skipped: obj.skipped === true,
    reason: typeof obj.reason === 'string' ? obj.reason : undefined,
    progress,
    verifySsotApplied: obj.verifySsotApplied === true || obj.verify_ssot_applied === true,
    segmentEnrichment: segmentRaw
      ? {
          segmentsUpdated: num(segmentRaw.segmentsUpdated ?? segmentRaw.segments_updated),
          poiTagsApplied: num(segmentRaw.poiTagsApplied ?? segmentRaw.poi_tags_applied),
          routeTemplatesTagged: num(
            segmentRaw.routeTemplatesTagged ?? segmentRaw.route_templates_tagged,
          ),
        }
      : undefined,
    kernelVerifyRepairLoop,
    kernelVerify: normalizeVerifyCounts(obj.kernelVerify ?? obj.kernel_verify),
    kernelRepair: normalizeRepairBlock(obj.kernelRepair ?? obj.kernel_repair),
    kernelReVerify: normalizeVerifyCounts(obj.kernelReVerify ?? obj.kernel_re_verify),
  };
}

/** roundDetails 为空时从 kernelVerify / kernelRepair / kernelReVerify 降级单轮摘要 */
export function resolveWorkbenchVerifyRepairRoundDetails(
  ctre: WorkbenchCtreUiOutput,
): CtreKernelVerifyRepairRoundDetail[] {
  const fromLoop = ctre.kernelVerifyRepairLoop?.roundDetails;
  if (fromLoop?.length) return fromLoop;

  const verify = ctre.kernelVerify;
  if (!verify && !ctre.kernelRepair && !ctre.kernelReVerify) return [];

  const rounds: CtreKernelVerifyRepairRoundDetail[] = [];
  if (verify) {
    rounds.push({
      round: 0,
      verify: {
        issueCount: verify.issueCount ?? 0,
        fatalCount: verify.fatalCount ?? 0,
        conflictCount: verify.conflictCount ?? 0,
        advisoryCount: 0,
      },
      repair: ctre.kernelRepair,
    });
  }
  if (ctre.kernelReVerify) {
    rounds.push({
      round: 1,
      verify: {
        issueCount: ctre.kernelReVerify.issueCount ?? 0,
        fatalCount: ctre.kernelReVerify.fatalCount ?? 0,
        conflictCount: ctre.kernelReVerify.conflictCount ?? 0,
        advisoryCount: 0,
      },
    });
  }
  return rounds;
}

export const KERNEL_VERIFY_REPAIR_TERMINATED_LABEL_ZH: Record<
  KernelVerifyRepairTerminatedReason,
  string
> = {
  clean: '验证通过',
  fatal: '存在致命问题，不可自动修复',
  max_iterations: '已达修复上限，仍有冲突',
  repair_not_applied: '检测到问题但修复未生效',
  repair_disabled: 'VERIFY 已跑，REPAIR 未开启',
  verify_skipped: 'Kernel VERIFY 跳过',
};

export function getKernelVerifyRepairTerminatedLabel(
  reason: KernelVerifyRepairTerminatedReason | string | undefined,
): string {
  if (!reason) return '—';
  return (
    KERNEL_VERIFY_REPAIR_TERMINATED_LABEL_ZH[reason as KernelVerifyRepairTerminatedReason] ?? reason
  );
}

export function formatVerifyRoundHeadline(round: CtreKernelVerifyRepairRoundDetail): string {
  const v = round.verify;
  const parts: string[] = [];
  if (v.fatalCount > 0) parts.push(`${v.fatalCount} fatal`);
  if (v.conflictCount > 0) parts.push(`${v.conflictCount} conflict`);
  if (v.advisoryCount > 0) parts.push(`${v.advisoryCount} advisory`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : v.issueCount === 0 ? ' ✓ clean' : '';

  return round.round === 0
    ? `VERIFY · ${v.issueCount} 项${suffix}`
    : `RE-VERIFY · ${v.issueCount} 项${suffix}`;
}

export function formatVerifyRoundRepairLine(
  repair: CtreKernelVerifyRepairRoundDetail['repair'],
): string | null {
  if (!repair) return null;
  if (repair.applied) {
    return `REPAIR ✓ 更新 ${repair.segmentsUpdated ?? 0} 段 / ${repair.itemsApplied ?? 0} POI`;
  }
  if (repair.skipped) {
    return `REPAIR 跳过${repair.reason ? ` (${repair.reason})` : ''}`;
  }
  return null;
}

export function formatVerifyRoundRecompileLine(
  recompile: CtreKernelVerifyRepairRoundDetail['recompile'],
): string | null {
  if (!recompile || recompile.skipped) return null;
  const status = recompile.status ?? 'partial';
  let line = `CTRE ${status} score=${recompile.score ?? '—'}`;
  if (recompile.incrementalMerged) line += ' · 增量合并';
  if (recompile.affectedDayIndices?.length) {
    line += ` · Day ${recompile.affectedDayIndices.map((i) => i + 1).join(', ')}`;
  }
  return line;
}

export function getKernelIssueClassBadgeClass(issueClass: KernelVerifyIssueSummary['class']): string {
  switch (issueClass) {
    case 'FATAL':
      return 'border-gate-reject-border/40 bg-gate-reject-foreground/10 text-gate-reject-foreground dark:text-gate-reject-foreground';
    case 'CONFLICT':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

/** 从 execute async task status 提取 Workbench CTRE（勿用于 route_and_run SSE） */
export function extractWorkbenchCtreFromTaskStatus(task: {
  ctre?: unknown;
  result?: { uiOutput?: { ctre?: unknown } };
}): WorkbenchCtreUiOutput | null {
  const raw = task.ctre ?? task.result?.uiOutput?.ctre;
  return normalizeWorkbenchCtreUi(raw);
}

export function shouldShowWorkbenchVerifyRepairPanel(ctre: WorkbenchCtreUiOutput | null): boolean {
  if (!ctre || ctre.skipped) return false;
  return Boolean(
    ctre.progress ||
      ctre.kernelVerifyRepairLoop ||
      ctre.kernelVerify ||
      resolveWorkbenchVerifyRepairRoundDetails(ctre).length,
  );
}

export function isWorkbenchVerifyRepairBlocking(ctre: WorkbenchCtreUiOutput): boolean {
  const fatal = ctre.kernelVerifyRepairLoop?.finalVerify?.fatalCount ?? ctre.kernelVerify?.fatalCount;
  return (fatal ?? 0) > 0;
}

export function isWorkbenchVerifyRepairWarning(ctre: WorkbenchCtreUiOutput): boolean {
  return ctre.kernelVerifyRepairLoop?.terminatedReason === 'max_iterations';
}
