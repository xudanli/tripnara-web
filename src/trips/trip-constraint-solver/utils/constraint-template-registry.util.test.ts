import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  exportConstraintTemplateCatalog,
  getConstraintTemplateRegistryEntry,
} from './constraint-template-registry.util';
import {
  CATALOG_HARD_TEMPLATE_IDS,
  CATALOG_SOFT_TEMPLATE_IDS,
} from '@/lib/constraint-catalog-template-ids';

const SNAPSHOT_PATH = join(
  import.meta.dirname,
  '../schemas/constraint-template-registry.json',
);

describe('constraint-template-registry.util', () => {
  it('exports 31 catalog templates (16 HARD + 15 SOFT)', () => {
    const catalog = exportConstraintTemplateCatalog();
    expect(catalog.templateCount).toBe(31);
    expect(catalog.hardCount).toBe(16);
    expect(catalog.softCount).toBe(15);
    expect(catalog.templates).toHaveLength(31);
  });

  it('maps minimize_hotel_changes to lodging_continuity with priority 8', () => {
    const entry = getConstraintTemplateRegistryEntry('minimize_hotel_changes');
    expect(entry).toMatchObject({
      constraintId: 'c_tpl_minimize_hotel_changes',
      defaultName: '少换酒店',
      type: 'SOFT',
      sectionKey: 'soft_prefer',
      defaultPriority: 8,
      defaultIntensity: 85,
      solverRuleKind: 'lodging_continuity',
      legacyPatchOnly: false,
      canonicalWeightKey: 'fewer_hotel_changes',
    });
  });

  it('maps budget_soft to budget_deviation canonical weight', () => {
    const entry = getConstraintTemplateRegistryEntry('budget_soft');
    expect(entry?.solverRuleKind).toBe('budget');
    expect(entry?.canonicalWeightKey).toBe('budget_deviation');
  });

  it('aligns frontend catalog POST ids with registry', () => {
    const catalog = exportConstraintTemplateCatalog();
    const hardIds = catalog.templates.filter((t) => t.type === 'HARD').map((t) => t.templateId);
    const softIds = catalog.templates.filter((t) => t.type === 'SOFT').map((t) => t.templateId);
    expect([...CATALOG_HARD_TEMPLATE_IDS]).toEqual(hardIds);
    expect([...CATALOG_SOFT_TEMPLATE_IDS]).toEqual(softIds);
  });

  it('matches committed JSON snapshot (CI drift guard)', () => {
    const exported = exportConstraintTemplateCatalog();
    const onDisk = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    expect(exported).toEqual(onDisk);
  });

  it('snapshot entries satisfy structural invariants', () => {
    const catalog = exportConstraintTemplateCatalog();
    const ids = new Set<string>();
    for (const entry of catalog.templates) {
      expect(entry.constraintId).toBe(`c_tpl_${entry.templateId}`);
      expect(ids.has(entry.templateId)).toBe(false);
      ids.add(entry.templateId);
      if (entry.type === 'HARD') {
        expect(entry.category).toBeTruthy();
        expect(entry.legacyPatchOnly).toBe(false);
      }
      if (entry.type === 'SOFT') {
        expect(entry.defaultPriority).toBeGreaterThan(0);
        expect(entry.defaultIntensity).toBeGreaterThan(0);
        expect(entry.sectionKey).toBe('soft_prefer');
      }
    }
  });
});
