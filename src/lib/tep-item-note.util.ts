import { stripTimelineDisplayRoleFromNote, mergeTimelineDisplayRoleIntoNote } from '@/lib/itinerary-special-display';
import type { ItinerarySpecialDisplayRole } from '@/lib/itinerary-special-display';
import {
  TEP_NOTE_VERSION,
  type ItineraryItemNoteJson,
  type ItineraryItemTepNamespace,
  type TepFlexibility,
  type TepFlexibilityPreset,
  type TepImportance,
} from '@/types/tep-item-note';

export const TEP_FLEXIBILITY_PRESET_OPTIONS: Array<{
  value: TepFlexibilityPreset;
  label: string;
  importance: TepImportance;
  flexibility: TepFlexibility;
}> = [
  { value: 'mandatory_fixed', label: '必去 · 固定预约', importance: 'MANDATORY', flexibility: 'FIXED' },
  { value: 'mandatory_movable', label: '必去 · 时间可挪', importance: 'MANDATORY', flexibility: 'MOVABLE' },
  { value: 'recommended_removable', label: '推荐 · 可删', importance: 'RECOMMENDED', flexibility: 'REMOVABLE' },
  { value: 'optional_replaceable', label: '可选 · 可替换', importance: 'OPTIONAL', flexibility: 'REPLACEABLE' },
];

export interface TepFlexFormValues {
  preset: TepFlexibilityPreset | 'none';
  weatherSensitive: boolean;
  latestArrival?: string;
}

export function buildTepItemNote(input: {
  userNote?: string;
  importance?: TepImportance;
  flexibility?: TepFlexibility;
  weatherSensitive?: boolean;
  weatherFallbackPoiId?: string;
  latestArrival?: string;
}): string {
  const tep: ItineraryItemTepNamespace = {
    schemaVersion: TEP_NOTE_VERSION,
    ...(input.importance ? { importance: input.importance } : {}),
    ...(input.flexibility ? { flexibility: input.flexibility } : {}),
    ...(input.weatherSensitive ? { weatherSensitive: true } : {}),
    ...(input.weatherFallbackPoiId ? { weatherFallbackPoiId: input.weatherFallbackPoiId } : {}),
    ...(input.latestArrival ? { latestArrival: input.latestArrival } : {}),
  };

  const payload: ItineraryItemNoteJson = { _tep: tep };
  if (input.userNote?.trim()) payload.userNote = input.userNote.trim();
  return JSON.stringify(payload);
}

export function parseTepItemNoteForForm(note?: string | null): {
  userNote: string;
  tep: Partial<ItineraryItemTepNamespace>;
  degraded?: boolean;
} {
  if (!note?.trim()) return { userNote: '', tep: {} };
  const trimmed = note.trim();
  if (!trimmed.startsWith('{')) {
    return { userNote: stripTimelineDisplayRoleFromNote(trimmed), tep: {} };
  }
  try {
    const raw = JSON.parse(trimmed) as ItineraryItemNoteJson;
    const userNote = stripTimelineDisplayRoleFromNote(raw.userNote ?? '');
    return { userNote, tep: raw._tep ?? {} };
  } catch {
    return { userNote: stripTimelineDisplayRoleFromNote(trimmed), tep: {}, degraded: true };
  }
}

export function resolveTepFlexPresetFromTep(
  tep: Partial<ItineraryItemTepNamespace>,
): TepFlexFormValues['preset'] {
  const match = TEP_FLEXIBILITY_PRESET_OPTIONS.find(
    (opt) => opt.importance === tep.importance && opt.flexibility === tep.flexibility,
  );
  if (match) return match.value;
  if (tep.importance || tep.flexibility) return 'custom';
  return 'none';
}

export function mapPresetToTepFields(preset: TepFlexibilityPreset): {
  importance: TepImportance;
  flexibility: TepFlexibility;
} {
  const opt = TEP_FLEXIBILITY_PRESET_OPTIONS.find((o) => o.value === preset);
  if (!opt) {
    return { importance: 'RECOMMENDED', flexibility: 'REMOVABLE' };
  }
  return { importance: opt.importance, flexibility: opt.flexibility };
}

export function buildItineraryItemNoteForSave(input: {
  userNote?: string;
  displayRole?: ItinerarySpecialDisplayRole;
  tepForm?: TepFlexFormValues | null;
  tepEnabled?: boolean;
}): string | undefined {
  const plainWithRole = mergeTimelineDisplayRoleIntoNote(input.userNote, input.displayRole ?? 'normal');
  const visibleNote = stripTimelineDisplayRoleFromNote(plainWithRole);

  if (!input.tepEnabled || !input.tepForm || input.tepForm.preset === 'none') {
    return plainWithRole?.trim() || undefined;
  }

  const { importance, flexibility } =
    input.tepForm.preset === 'custom'
      ? { importance: undefined, flexibility: undefined }
      : mapPresetToTepFields(input.tepForm.preset);

  const existing = parseTepItemNoteForForm(plainWithRole);

  return buildTepItemNote({
    userNote: visibleNote || undefined,
    importance: importance ?? (existing.tep.importance as TepImportance | undefined),
    flexibility: flexibility ?? (existing.tep.flexibility as TepFlexibility | undefined),
    weatherSensitive: input.tepForm.weatherSensitive,
    latestArrival: input.tepForm.latestArrival?.trim() || undefined,
  });
}

export function readTepFlexFormFromNote(note?: string | null): TepFlexFormValues {
  const parsed = parseTepItemNoteForForm(note);
  return {
    preset: resolveTepFlexPresetFromTep(parsed.tep),
    weatherSensitive: parsed.tep.weatherSensitive === true,
    latestArrival: parsed.tep.latestArrival,
  };
}
