import { normalizePersona, type PersonaType } from '@/lib/persona-icons';

/** 三人格符号单元格 · 专业守护者（非拟人头像） */
export function personaSymbolCellClass(persona: PersonaType | string): string {
  switch (normalizePersona(persona)) {
    case 'DR_DRE':
      return 'border-border/35 bg-muted/8 text-warning';
    case 'NEPTUNE':
      return 'border-gate-suggest-border/35 bg-gate-suggest/8 text-gate-suggest-foreground';
    default:
      return 'border-border/35 bg-muted/8 text-error';
  }
}
