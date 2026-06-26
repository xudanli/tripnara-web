/** 行程点展示名：中文界面优先 nameCN */
export function placeDisplayName(
  place: { nameCN?: string | null; nameEN?: string | null; name?: string | null } | null | undefined,
  isZh: boolean,
): string {
  if (!place) return '';
  if (isZh) {
    return (place.nameCN || place.name || place.nameEN || '').trim();
  }
  return (place.nameEN || place.name || place.nameCN || '').trim();
}

/** 从行程重建「第N天 · 地点」列表（中文名） */
export function buildTripInvolvesLines(
  trip: {
    TripDay?: Array<{
      ItineraryItem?: Array<{
        Place?: { nameCN?: string | null; nameEN?: string | null; name?: string | null } | null;
      }>;
    }>;
  } | null | undefined,
  isZh: boolean,
): string[] {
  if (!trip?.TripDay?.length) return [];
  const lines: string[] = [];
  trip.TripDay.forEach((day, dayIndex) => {
    day.ItineraryItem?.forEach((item) => {
      const label = placeDisplayName(item.Place, isZh);
      if (!label) return;
      lines.push(isZh ? `第${dayIndex + 1}天 · ${label}` : `Day ${dayIndex + 1}: ${label}`);
    });
  });
  return lines;
}

export function taskCheckKey(parentKey: string, taskIndex: number): string {
  return `${parentKey}::task::${taskIndex}`;
}

export function isTaskCheckKey(id: string): boolean {
  return id.includes('::task::');
}

export function parentKeyFromTaskKey(taskKey: string): string {
  return taskKey.split('::task::')[0] ?? taskKey;
}
