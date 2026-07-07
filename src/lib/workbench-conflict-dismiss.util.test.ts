import { describe, expect, it, beforeEach } from 'vitest';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  dismissWorkbenchConflicts,
  filterVisibleWorkbenchConflicts,
  isWorkbenchConflictDeferrable,
  pruneDismissedWorkbenchConflicts,
  readDismissedWorkbenchConflicts,
  undoDismissWorkbenchConflict,
} from '@/lib/workbench-conflict-dismiss.util';

const TRIP_ID = 'trip-test-1';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage },
    writable: true,
  });
}

function makeConflict(
  overrides: Partial<PlanningConflictItem> & Pick<PlanningConflictItem, 'id'>,
): PlanningConflictItem {
  return {
    source: 'feasibility',
    priority: 'suggest_adjust',
    category: 'schedule',
    title: '测试冲突',
    message: '说明',
    categoryLabel: '日程',
    ...overrides,
  };
}

describe('workbench-conflict-dismiss.util', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
  });

  it('filters dismissed soft conflicts from visible list', () => {
    const items = [
      makeConflict({ id: 'c1', priority: 'suggest_adjust' }),
      makeConflict({ id: 'c2', priority: 'must_handle' }),
    ];
    dismissWorkbenchConflicts(TRIP_ID, [items[0]!], 0);
    const visible = filterVisibleWorkbenchConflicts(TRIP_ID, items);
    expect(visible.map((item) => item.id)).toEqual(['c2']);
  });

  it('does not dismiss must_handle conflicts', () => {
    const items = [makeConflict({ id: 'hard', priority: 'must_handle' })];
    const added = dismissWorkbenchConflicts(TRIP_ID, items, 0);
    expect(added).toHaveLength(0);
    expect(readDismissedWorkbenchConflicts(TRIP_ID)).toHaveLength(0);
  });

  it('supports undo dismiss', () => {
    const items = [makeConflict({ id: 'c1', semanticKey: 'sk1' })];
    dismissWorkbenchConflicts(TRIP_ID, items, 1);
    undoDismissWorkbenchConflict(TRIP_ID, 'c1');
    expect(filterVisibleWorkbenchConflicts(TRIP_ID, items)).toHaveLength(1);
  });

  it('prunes dismissals when semanticKey disappears after revalidate', () => {
    dismissWorkbenchConflicts(
      TRIP_ID,
      [makeConflict({ id: 'c1', semanticKey: 'old-key' })],
      0,
    );
    pruneDismissedWorkbenchConflicts(TRIP_ID, [
      makeConflict({ id: 'c2', semanticKey: 'new-key' }),
    ]);
    expect(readDismissedWorkbenchConflicts(TRIP_ID)).toHaveLength(0);
  });

  it('identifies deferrable priorities', () => {
    expect(isWorkbenchConflictDeferrable(makeConflict({ id: 'a', priority: 'suggest_adjust' }))).toBe(
      true,
    );
    expect(isWorkbenchConflictDeferrable(makeConflict({ id: 'b', priority: 'must_handle' }))).toBe(
      false,
    );
  });
});
