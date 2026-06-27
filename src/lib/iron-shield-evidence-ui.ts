export type IronShieldUiBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const META_LABEL_ZH: Record<string, string> = {
  source: '来源',
  confidence: '置信度',
  verified_at: '核验时间',
  updated_at: '更新时间',
  segment_id: '路段',
  day_index: '天数',
  severity: '严重度',
};

export function resolveIronShieldUiBadgeVariant(
  variant?: string | null,
): IronShieldUiBadgeVariant {
  const v = variant?.trim().toLowerCase();
  if (v === 'destructive' || v === 'danger') return 'destructive';
  if (v === 'secondary') return 'secondary';
  if (v === 'outline') return 'outline';
  if (v === 'default') return 'default';
  return 'outline';
}

export function formatIronShieldEvidenceMetaLabel(key: string): string {
  return META_LABEL_ZH[key] ?? key.replace(/_/g, ' ');
}

export function formatIronShieldEvidenceMetaValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatIronShieldEvidenceMetaValue(item)).filter(Boolean).join('、');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function normalizeIronShieldEvidenceCardMeta(
  meta: unknown,
): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
  const entries = Object.entries(meta as Record<string, unknown>).filter(
    ([, value]) => formatIronShieldEvidenceMetaValue(value).trim().length > 0,
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function listIronShieldEvidenceMetaEntries(
  meta: Record<string, unknown> | undefined,
  limit = 8,
): Array<{ key: string; label: string; value: string }> {
  if (!meta) return [];
  return Object.entries(meta)
    .map(([key, value]) => ({
      key,
      label: formatIronShieldEvidenceMetaLabel(key),
      value: formatIronShieldEvidenceMetaValue(value),
    }))
    .filter((entry) => entry.value.trim().length > 0)
    .slice(0, limit);
}
