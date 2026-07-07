import type { KeyboardEvent } from 'react';

export interface WorkbenchDayTabState {
  hasConflict: boolean;
  hasDecision: boolean;
  hasSplit: boolean;
  isSelected: boolean;
}

export function buildWorkbenchDayTabAriaLabel(
  dayNumber: number,
  state: WorkbenchDayTabState,
): string {
  const parts = [`第 ${dayNumber} 天`];
  if (state.hasConflict) parts.push('有冲突');
  if (state.hasDecision) parts.push('有待决策');
  if (state.hasSplit) parts.push('有分流');
  if (state.isSelected) parts.push('已选中');
  return parts.join('，');
}

export function handleWorkbenchDayTabListKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  dayCount: number,
  selectedDay: number,
  onSelectDay: (dayIndex: number) => void,
): void {
  if (dayCount <= 0) return;

  let next = selectedDay;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = Math.min(dayCount - 1, selectedDay + 1);
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      next = Math.max(0, selectedDay - 1);
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = dayCount - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  if (next !== selectedDay) {
    onSelectDay(next);
    const tab = document.getElementById(`workbench-day-tab-${next}`);
    tab?.focus();
  }
}
