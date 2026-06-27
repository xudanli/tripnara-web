import { describe, expect, it } from 'vitest';
import {
  formatIronShieldEvidenceMetaLabel,
  formatIronShieldEvidenceMetaValue,
  listIronShieldEvidenceMetaEntries,
  normalizeIronShieldEvidenceCardMeta,
  resolveIronShieldUiBadgeVariant,
} from '@/lib/iron-shield-evidence-ui';

describe('iron-shield-evidence-ui', () => {
  it('maps badge_variant aliases to shadcn variants', () => {
    expect(resolveIronShieldUiBadgeVariant('destructive')).toBe('destructive');
    expect(resolveIronShieldUiBadgeVariant('danger')).toBe('destructive');
    expect(resolveIronShieldUiBadgeVariant('secondary')).toBe('secondary');
    expect(resolveIronShieldUiBadgeVariant(undefined)).toBe('outline');
  });

  it('formats meta labels and values for display', () => {
    expect(formatIronShieldEvidenceMetaLabel('verified_at')).toBe('核验时间');
    expect(formatIronShieldEvidenceMetaValue(['A', 'B'])).toBe('A、B');
    expect(formatIronShieldEvidenceMetaValue({ nested: true })).toBe('{"nested":true}');
  });

  it('normalizes card meta and drops empty entries', () => {
    expect(normalizeIronShieldEvidenceCardMeta(null)).toBeUndefined();
    expect(
      normalizeIronShieldEvidenceCardMeta({
        source: 'PHYSICAL',
        confidence: 0.92,
        empty: '',
      }),
    ).toEqual({
      source: 'PHYSICAL',
      confidence: 0.92,
    });
  });

  it('lists meta entries with zh labels', () => {
    const entries = listIronShieldEvidenceMetaEntries({
      source: 'INTAKE',
      segment_id: 'seg-1',
    });
    expect(entries).toEqual([
      { key: 'source', label: '来源', value: 'INTAKE' },
      { key: 'segment_id', label: '路段', value: 'seg-1' },
    ]);
  });
});
