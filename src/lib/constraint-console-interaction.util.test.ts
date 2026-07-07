import { describe, expect, it } from 'vitest';
import { Route, Leaf } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  CATALOG_HARD_INTERACTIONS,
  CONSTRAINT_INTERACTION_REGISTRY,
  resolveConstraintInteractionSpec,
  resolveSectionInteractionSpec,
  shouldShowImpactPreviewForEntry,
  shouldShowInlineSoftSlider,
  shouldShowListEditButton,
} from './constraint-console-interaction.util';
import { canShowConstraintEdit } from './constraint-console-partition.util';

function entry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id' | 'kind' | 'label' | 'icon'>): ConstraintListEntry {
  return { locked: false, ...partial };
}

describe('constraint-console-interaction.util', () => {
  it('registers 15 catalog hard + sections', () => {
    expect(CATALOG_HARD_INTERACTIONS).toHaveLength(15);
    expect(CONSTRAINT_INTERACTION_REGISTRY.length).toBeGreaterThan(30);
  });

  it('catalog hard uses modal_catalog + list edit', () => {
    const spec = resolveConstraintInteractionSpec(
      entry({ id: 'earliest_departure', kind: 'hard', label: '最早出发', icon: Route }),
    );
    expect(spec?.primarySurface).toBe('modal_catalog');
    expect(spec?.listEditButton).toBe(true);
    expect(spec?.showImpactPreview).toBe(true);
  });

  it('soft template uses inline slider without edit button', () => {
    const item = entry({ id: 'avoid_crowds', kind: 'soft', label: '避开人潮', icon: Leaf, sliderValue: 50 });
    expect(shouldShowInlineSoftSlider(item)).toBe(true);
    expect(shouldShowListEditButton(item)).toBe(false);
    expect(canShowConstraintEdit(item)).toBe(false);
  });

  it('enforce legacy hard shows impact preview', () => {
    const item = entry({ id: 'daily_drive', kind: 'hard', label: '驾驶', icon: Route });
    expect(shouldShowImpactPreviewForEntry(item)).toBe(true);
    expect(shouldShowListEditButton(item)).toBe(true);
  });

  it('official rules are detail readonly without edit', () => {
    const item = entry({
      id: 'c_official_is_froad_2wd',
      kind: 'external',
      label: 'F路',
      icon: Route,
      sourceType: 'OFFICIAL_RULE',
      readOnly: true,
    });
    expect(shouldShowListEditButton(item)).toBe(false);
    expect(resolveConstraintInteractionSpec(item)?.primarySurface).toBe('detail_readonly');
  });

  it('contract sections edit in detail panel only', () => {
    const automation = resolveSectionInteractionSpec('automation');
    expect(automation?.primarySurface).toBe('detail_contract');
    expect(automation?.listEditButton).toBe(false);
  });

  it('maps c_tpl api id to catalog interaction', () => {
    const spec = resolveConstraintInteractionSpec(
      entry({ id: 'c_tpl_earliest_departure', kind: 'hard', label: '最早', icon: Route }),
    );
    expect(spec?.primarySurface).toBe('modal_catalog');
  });
});
