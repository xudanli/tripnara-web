export interface TripMetadataSizeEntry {
  key: string;
  bytes: number;
  label: string;
}

export interface TripMetadataSizeReport {
  totalBytes: number;
  limitBytes: number;
  overLimit: boolean;
  entries: TripMetadataSizeEntry[];
}

const DEFAULT_METADATA_LIMIT_BYTES = 65_536;

/** 常见 metadata 顶层键的中文说明（便于排查体积） */
const METADATA_KEY_LABELS: Record<string, string> = {
  itineraryPresentation: '日程展示/灵感卡',
  experienceUnderstanding: '旅行理解卡',
  experienceExplanation: '体验解释',
  experienceOutcomeGraph: '行中体验反馈',
  generationProgress: '生成进度',
  generation_progress: '生成进度',
  feasibilityReportSnapshot: '可执行性报告快照',
  feasibilityMonteCarloSnapshot: '可执行性蒙特卡洛模拟快照',
  readinessCausalPreAnalysis: '准备度因果预分析快照',
  readinessGuardianNegotiation: '三人格博弈协商快照',
  plans: '规划方案列表缓存',
  constraint_sink_patch_ids: '约束修补记录',
  collaborativeTaskFlywheel: '协作任务飞轮',
  collaborative_task_flywheel: '协作任务飞轮',
  dayThemes: '每日主题',
  matchSquareInstantiation: '模板实例',
  planningWorkbenchState: '规划工作台状态',
  worldModelGuards: '世界模型守卫',
  revision: '修订序号',
  maxDailyDrivingHours: '每日驾驶上限',
  dailyDrivingLimitHours: '每日驾驶上限',
  accommodationStandard: '住宿标准',
};

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

function labelForMetadataKey(key: string): string {
  return METADATA_KEY_LABELS[key] ?? key;
}

/** 分析 Trip.metadata 各顶层键的 JSON 序列化体积（与后端校验方式接近） */
export function analyzeTripMetadataSize(
  metadata: Record<string, unknown> | null | undefined,
  limitBytes = DEFAULT_METADATA_LIMIT_BYTES,
): TripMetadataSizeReport {
  const entries: TripMetadataSizeEntry[] = [];
  if (!metadata || typeof metadata !== 'object') {
    return { totalBytes: 0, limitBytes, overLimit: false, entries };
  }

  for (const [key, value] of Object.entries(metadata)) {
    try {
      const serialized = JSON.stringify(value);
      entries.push({
        key,
        bytes: utf8ByteLength(serialized),
        label: labelForMetadataKey(key),
      });
    } catch {
      entries.push({
        key,
        bytes: 0,
        label: `${labelForMetadataKey(key)}（无法序列化）`,
      });
    }
  }

  entries.sort((a, b) => b.bytes - a.bytes);

  const totalBytes = utf8ByteLength(JSON.stringify(metadata));

  return {
    totalBytes,
    limitBytes,
    overLimit: totalBytes > limitBytes,
    entries,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** 生成给用户看的 metadata 体积说明（用于保存失败提示） */
export function formatTripMetadataSizeHint(
  metadata: Record<string, unknown> | null | undefined,
  options?: { topN?: number; limitBytes?: number },
): string | null {
  const report = analyzeTripMetadataSize(metadata, options?.limitBytes);
  if (report.totalBytes === 0) return null;

  const top = report.entries.slice(0, options?.topN ?? 4);
  const lines = [
    `当前行程元数据约 ${formatBytes(report.totalBytes)}（上限 ${formatBytes(report.limitBytes)}）`,
  ];

  if (top.length > 0) {
    lines.push(
      '占用较大的字段（多为后端分析缓存，不应长期留在 metadata）：',
      ...top.map((entry, index) => {
        const pct = report.totalBytes > 0 ? Math.round((entry.bytes / report.totalBytes) * 100) : 0;
        return `${index + 1}. ${entry.label}（${entry.key}）≈ ${formatBytes(entry.bytes)}，${pct}%`;
      }),
    );
  }

  const cacheHeavy = top.some((e) =>
    ['readinessCausalPreAnalysis', 'plans', 'readinessGuardianNegotiation', 'feasibilityMonteCarloSnapshot'].includes(
      e.key,
    ),
  );
  if (cacheHeavy) {
    lines.push(
      '上述缓存合计约占 metadata 九成以上；需后端迁移到独立存储或清理后，才能继续保存驾驶上限等小字段。',
    );
  } else {
    lines.push('需后端清理或迁移上述大字段后，才能继续保存驾驶上限等 metadata 约束。');
  }

  return lines.join('\n');
}
