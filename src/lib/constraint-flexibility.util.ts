export type ConstraintFlexKey = 'budget' | 'time_range' | 'travelers' | 'transport';

export type ConstraintFlexibilityLevel = 'hard' | 'soft' | 'negotiable';

const STORAGE_KEY = 'tripnara:constraint-flexibility';

const CYCLE: ConstraintFlexibilityLevel[] = ['hard', 'soft', 'negotiable'];

export function constraintFlexibilityLabel(level: ConstraintFlexibilityLevel): string {
  switch (level) {
    case 'soft':
      return '软';
    case 'negotiable':
      return '可协商';
    default:
      return '硬';
  }
}

export function cycleConstraintFlexibilityLevel(
  current: ConstraintFlexibilityLevel,
): ConstraintFlexibilityLevel {
  const index = CYCLE.indexOf(current);
  return CYCLE[(index + 1) % CYCLE.length] ?? 'hard';
}

function readStore(): Record<string, Partial<Record<ConstraintFlexKey, ConstraintFlexibilityLevel>>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<Record<ConstraintFlexKey, ConstraintFlexibilityLevel>>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, Partial<Record<ConstraintFlexKey, ConstraintFlexibilityLevel>>>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function getConstraintFlexibilityLevel(
  tripId: string | null | undefined,
  key: ConstraintFlexKey,
): ConstraintFlexibilityLevel {
  if (!tripId) return 'hard';
  return readStore()[tripId]?.[key] ?? 'hard';
}

export function setConstraintFlexibilityLevel(
  tripId: string,
  key: ConstraintFlexKey,
  level: ConstraintFlexibilityLevel,
): void {
  const store = readStore();
  store[tripId] = { ...store[tripId], [key]: level };
  writeStore(store);
}

export function getConstraintFlexibilityMap(
  tripId: string | null | undefined,
): Partial<Record<ConstraintFlexKey, ConstraintFlexibilityLevel>> {
  if (!tripId) return {};
  return readStore()[tripId] ?? {};
}
