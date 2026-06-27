import { describe, expect, it } from 'vitest';
import {
  buildLockedItineraryItemIdSet,
  collectItineraryItemRefsFromItinerary,
  collectSegmentLockKeys,
  findUnmatchedSegmentLockIds,
  isItemStructureLocked,
  normalizeSegmentLockId,
} from '@/lib/world-model-guards';

describe('world-model segment lock', () => {
  it('matches composite segment ids to endpoint items', () => {
    const locked = new Set(['item-a:item-b']);
    const items = [{ id: 'item-a' }, { id: 'item-b' }];
    const lockedItems = buildLockedItineraryItemIdSet(locked, items);
    expect(lockedItems.has('item-a')).toBe(true);
    expect(lockedItems.has('item-b')).toBe(true);
  });

  it('matches leg-prefixed composite ids', () => {
    const locked = new Set(['leg:item-a:item-b']);
    const items = [{ id: 'item-a' }, { id: 'item-b' }, { id: 'item-c' }];
    const lockedItems = buildLockedItineraryItemIdSet(locked, items);
    expect(lockedItems.has('item-a')).toBe(true);
    expect(lockedItems.has('item-b')).toBe(true);
    expect(lockedItems.has('item-c')).toBe(false);
  });

  it('collects metadata segment and leg ids', () => {
    const keys = collectSegmentLockKeys(
      { id: 'item-b', metadata: { leg_id: 'leg-42' } },
      'item-a',
    );
    expect(keys).toContain('leg-42');
    expect(keys).toContain('item-a:item-b');
  });

  it('collects from/to metadata edge ids', () => {
    const keys = collectSegmentLockKeys({
      id: 'item-b',
      metadata: { from_item_id: 'item-a', to_item_id: 'item-b' },
    });
    expect(keys).toContain('item-a:item-b');
    expect(keys).toContain('leg:item-a:item-b');
  });

  it('returns false when no locked segments', () => {
    expect(
      isItemStructureLocked(new Set(), { id: 'item-a' }, undefined),
    ).toBe(false);
  });

  it('extracts itinerary item refs from orchestration days', () => {
    const refs = collectItineraryItemRefsFromItinerary({
      days: [{ items: [{ id: 'item-a' }, { id: 'item-b', metadata: { leg_id: 'leg-1' } }] }],
    });
    expect(refs.map((ref) => ref.id)).toEqual(['item-a', 'item-b']);
  });

  it('reports unmatched lock ids for dev diagnostics', () => {
    const unmatched = findUnmatchedSegmentLockIds(
      new Set(['ghost-segment', 'item-a:item-b']),
      [{ id: 'item-a' }, { id: 'item-b' }],
    );
    expect(unmatched).toEqual(['ghost-segment']);
  });

  it('strips leg prefix when normalizing segment ids', () => {
    expect(normalizeSegmentLockId('leg:item-a:item-b')).toBe('item-a:item-b');
  });
});
