import { describe, expect, it } from 'vitest';
import {
  listTepFlexibilityPresetsForKind,
  resolveTepFlexibilityItemKind,
  shouldShowTepFlexibilityEditor,
} from '@/lib/tep-flexibility-item.util';

describe('tep-flexibility-item.util', () => {
  it('resolves item kinds from type and display role', () => {
    expect(
      resolveTepFlexibilityItemKind({ itemType: 'ACTIVITY', displayRole: 'normal' }),
    ).toBe('activity');
    expect(
      resolveTepFlexibilityItemKind({ itemType: 'ACTIVITY', displayRole: 'hotel' }),
    ).toBe('accommodation');
    expect(resolveTepFlexibilityItemKind({ itemType: 'TRANSIT' })).toBe('transit');
    expect(resolveTepFlexibilityItemKind({ itemType: 'MEAL_ANCHOR' })).toBe('meal');
  });

  it('hides editor for transit segments', () => {
    expect(shouldShowTepFlexibilityEditor('transit')).toBe(false);
    expect(shouldShowTepFlexibilityEditor('activity')).toBe(true);
  });

  it('filters presets by item kind', () => {
    expect(listTepFlexibilityPresetsForKind('meal').map((o) => o.value)).toEqual([
      'mandatory_fixed',
      'mandatory_movable',
      'optional_replaceable',
    ]);
    expect(listTepFlexibilityPresetsForKind('activity').length).toBe(4);
  });
});
