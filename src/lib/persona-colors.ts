/**
 * 三人格颜色系统工具函数
 * 
 * 统一管理 TripNARA 的三人格颜色：
 * - Abu: 静谧蓝/冰川白（安全守护者）
 * - Dr.Dre: 森林绿/柔棕（节奏设计师）
 * - Neptune: 修复绿（结构修复者）
 */

export type PersonaType = 'ABU' | 'DR_DRE' | 'NEPTUNE' | 'abu' | 'drdre' | 'neptune';

/**
 * 标准化三人格类型（统一为大写）
 */
function normalizePersona(persona: PersonaType | string): 'ABU' | 'DR_DRE' | 'NEPTUNE' {
  const upper = persona.toUpperCase();
  if (upper === 'ABU') return 'ABU';
  if (upper === 'DR_DRE' || upper === 'DRDRE') return 'DR_DRE';
  if (upper === 'NEPTUNE') return 'NEPTUNE';
  return 'ABU'; // 默认
}

/**
 * 获取三人格颜色类名（使用设计 Token）
 * 
 * @param persona 三人格类型
 * @returns Tailwind 类名字符串
 */
export function getPersonaColorClasses(persona: PersonaType | string): string {
  const normalized = normalizePersona(persona);
  
  switch (normalized) {
    case 'ABU':
      return 'bg-persona-abu/10 border-persona-abu-accent/30 text-persona-abu-foreground';
    case 'DR_DRE':
      return 'bg-persona-dre/10 border-persona-dre-accent/30 text-persona-dre-foreground';
    case 'NEPTUNE':
      return 'bg-persona-neptune/10 border-persona-neptune-accent/30 text-persona-neptune-foreground';
  }
}

/**
 * 获取三人格图标颜色类名
 * 
 * @param persona 三人格类型
 * @returns Tailwind 类名字符串（仅颜色）
 */
export function getPersonaIconColorClasses(persona: PersonaType | string): string {
  const normalized = normalizePersona(persona);
  
  switch (normalized) {
    case 'ABU':
      return 'text-persona-abu-foreground';
    case 'DR_DRE':
      return 'text-persona-dre-foreground';
    case 'NEPTUNE':
      return 'text-persona-neptune-foreground';
  }
}

/**
 * 获取三人格背景颜色类名
 * 
 * @param persona 三人格类型
 * @returns Tailwind 类名字符串（仅背景）
 */
export function getPersonaBackgroundClasses(persona: PersonaType | string): string {
  const normalized = normalizePersona(persona);
  
  switch (normalized) {
    case 'ABU':
      return 'bg-persona-abu/10';
    case 'DR_DRE':
      return 'bg-persona-dre/10';
    case 'NEPTUNE':
      return 'bg-persona-neptune/10';
  }
}
