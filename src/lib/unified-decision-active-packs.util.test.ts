import { describe, expect, it } from 'vitest';
import {
  activePackLayerIds,
  destinationPackId,
  formatActivePacksSummary,
} from '@/lib/unified-decision-active-packs.util';

describe('unified-decision-active-packs.util', () => {
  it('formats layers for IS and NZ trips', () => {
    const isPacks = {
      layers: [{ packId: 'destination.global' }, { packId: 'destination.is' }],
    };
    expect(formatActivePacksSummary(isPacks)).toBe('destination.global · destination.is');
    expect(destinationPackId(isPacks)).toBe('destination.is');

    const nzPacks = {
      layers: [{ packId: 'destination.global' }, { packId: 'destination.nz' }],
    };
    expect(destinationPackId(nzPacks)).toBe('destination.nz');
  });

  it('falls back to packIds', () => {
    expect(activePackLayerIds({ packIds: ['is-core'] })).toEqual(['is-core']);
  });
});
