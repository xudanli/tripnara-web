import type { ItineraryItemType } from '@/types/trip';
import type { ItinerarySpecialDisplayRole } from '@/lib/itinerary-special-display';
import { TEP_FLEXIBILITY_PRESET_OPTIONS } from '@/lib/tep-item-note.util';
import type { TepFlexibilityPreset } from '@/types/tep-item-note';

export type TepFlexibilityItemKind =
  | 'activity'
  | 'accommodation'
  | 'meal'
  | 'transit'
  | 'rest';

export function resolveTepFlexibilityItemKind(input: {
  itemType?: ItineraryItemType | string | null;
  displayRole?: ItinerarySpecialDisplayRole | null;
  costCategory?: string | null;
}): TepFlexibilityItemKind | null {
  if (input.displayRole === 'hotel' || input.costCategory === 'ACCOMMODATION') {
    return 'accommodation';
  }
  if (input.itemType === 'TRANSIT') return 'transit';
  if (input.itemType === 'REST') return 'rest';
  if (input.itemType === 'MEAL_ANCHOR' || input.itemType === 'MEAL_FLOATING') {
    return 'meal';
  }
  if (input.itemType === 'ACTIVITY') return 'activity';
  return null;
}

export function shouldShowTepFlexibilityEditor(
  kind: TepFlexibilityItemKind | null,
): kind is TepFlexibilityItemKind {
  return kind != null && kind !== 'transit';
}

const MEAL_PRESET_OPTIONS = TEP_FLEXIBILITY_PRESET_OPTIONS.filter((opt) =>
  ['mandatory_fixed', 'mandatory_movable', 'optional_replaceable'].includes(opt.value),
);

const REST_PRESET_OPTIONS = TEP_FLEXIBILITY_PRESET_OPTIONS.filter((opt) =>
  ['recommended_removable', 'optional_replaceable'].includes(opt.value),
);

export function listTepFlexibilityPresetsForKind(
  kind: TepFlexibilityItemKind,
): Array<(typeof TEP_FLEXIBILITY_PRESET_OPTIONS)[number]> {
  switch (kind) {
    case 'meal':
      return MEAL_PRESET_OPTIONS;
    case 'rest':
      return REST_PRESET_OPTIONS;
    case 'activity':
    default:
      return TEP_FLEXIBILITY_PRESET_OPTIONS;
  }
}

export function defaultTepFlexPresetForKind(
  kind: TepFlexibilityItemKind,
): TepFlexibilityPreset | 'none' {
  switch (kind) {
    case 'accommodation':
      return 'mandatory_fixed';
    case 'meal':
      return 'mandatory_movable';
    case 'rest':
      return 'recommended_removable';
    case 'activity':
    default:
      return 'none';
  }
}
