import { describe, expect, it } from 'vitest';
import {
  applyConfirmResultToPoi,
  countUnresolvedPois,
  formatEvidenceChain,
  getPoiResolutionBadge,
  getUnresolvedPoisBannerText,
  needsPoiConfirmation,
  normalizeResolvedPoi,
} from './helpers';
import type { ResolvedPoi } from '../types';

describe('poi-resolution helpers', () => {
  const verified: ResolvedPoi = {
    name: 'Blue Lagoon',
    canonicalName: 'Blue Lagoon',
    poiId: 'is.blue_lagoon',
    confidence: 0.98,
    resolved: true,
    status: 'MATCHED',
  };

  const ambiguous: ResolvedPoi = {
    name: 'Secret Canyon',
    status: 'AMBIGUOUS',
    confidence: 0.62,
  };

  const notFound: ResolvedPoi = {
    name: 'Unknown Place',
    status: 'NOT_FOUND',
  };

  it('detects confirmation-needed POIs', () => {
    expect(needsPoiConfirmation(verified)).toBe(false);
    expect(needsPoiConfirmation(ambiguous)).toBe(true);
    expect(needsPoiConfirmation({ ...ambiguous, status: 'NEEDS_CONFIRMATION' })).toBe(true);
  });

  it('maps resolution badges per PM spec', () => {
    expect(getPoiResolutionBadge(verified)).toEqual({
      label: '✓ 已验证 98%',
      tone: 'success',
    });
    expect(getPoiResolutionBadge(ambiguous)).toEqual({
      label: '⚠ 等待确认',
      tone: 'warning',
    });
    expect(getPoiResolutionBadge(notFound)).toEqual({
      label: '未解析',
      tone: 'muted',
      actionLabel: '手动选择',
    });
  });

  it('treats backend MATCHED payloads without resolved flag as verified', () => {
    const backendLike = normalizeResolvedPoi({
      name: 'Blue Lagoon',
      status: 'MATCHED',
      poiId: 'is.blue_lagoon',
      confidence: 0.99,
      matchedPoi: { poiId: 'is.blue_lagoon', canonicalName: 'Blue Lagoon' },
    });
    expect(backendLike).toMatchObject({
      name: 'Blue Lagoon',
      canonicalName: 'Blue Lagoon',
      poiId: 'is.blue_lagoon',
      resolved: true,
      status: 'MATCHED',
    });
    expect(getPoiResolutionBadge(backendLike!)).toEqual({
      label: '✓ 已验证 99%',
      tone: 'success',
    });
  });

  it('counts unresolved POIs', () => {
    expect(countUnresolvedPois([verified, ambiguous, notFound])).toBe(2);
    expect(countUnresolvedPois([verified])).toBe(0);
    expect(countUnresolvedPois(undefined)).toBe(0);
  });

  it('builds unresolved banner text', () => {
    expect(getUnresolvedPoisBannerText(2)).toContain('2 个地点尚未确认');
    expect(getUnresolvedPoisBannerText(0)).toBe('');
  });

  it('formats evidence chain steps', () => {
    expect(
      formatEvidenceChain([
        { type: 'AI_RECOGNITION', query: '蓝湖' },
        { type: 'ALIAS_MATCH', label: '蓝湖' },
        { type: 'OFFICIAL_POI', poiId: 'is.blue_lagoon', canonicalName: 'Blue Lagoon' },
      ]),
    ).toEqual([
      { title: 'AI 识别', subtitle: '蓝湖' },
      { title: '别名命中', subtitle: '蓝湖' },
      { title: '官方 POI', subtitle: 'is.blue_lagoon — Blue Lagoon' },
    ]);
  });

  it('applies confirm result to local POI state', () => {
    const updated = applyConfirmResultToPoi(ambiguous, {
      poiId: 'is.studlagil',
      canonicalName: 'Stuðlagil Canyon',
      confidence: 1,
      evidence: [{ type: 'HUMAN_CONFIRM', poiId: 'is.studlagil' }],
    });
    expect(updated.poiId).toBe('is.studlagil');
    expect(updated.resolved).toBe(true);
    expect(updated.status).toBe('MATCHED');
    expect(updated.method).toBe('HUMAN');
  });
});
