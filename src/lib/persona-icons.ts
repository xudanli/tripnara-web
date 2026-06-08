/**
 * 三人格图标系统工具函数
 * 
 * 符合 TripNARA 视觉设计原则：
 * - 三人格不是卡通人物，而是"专业守护者"的符号系统
 * - Abu：边界、盾、门、警戒 → Shield
 * - Dr.Dre：节奏、脉冲、呼吸、时间窗 → Activity
 * - Neptune：空间、轨迹、结构、修复 → RefreshCw
 */

import { Shield, Activity, RefreshCw, type LucideIcon } from 'lucide-react';

export type PersonaType = 'ABU' | 'DR_DRE' | 'NEPTUNE';

/** 品牌头像（public/images/personas） */
export const PERSONA_LOGO_SRC: Record<PersonaType, string> = {
  ABU: '/images/personas/abu-logo.svg',
  DR_DRE: '/images/personas/dr-dre-logo.svg',
  NEPTUNE: '/images/personas/neptune-logo.svg',
};

/** 行程健康度等 C 端短标签 */
export const PERSONA_ROLE_LABEL_ZH: Record<PersonaType, string> = {
  ABU: '安全',
  DR_DRE: '节奏',
  NEPTUNE: '完整',
};

/**
 * 标准化三人格类型
 */
export function normalizePersona(persona: PersonaType | string): PersonaType {
  const upper = persona.toUpperCase();
  if (upper === 'ABU') return 'ABU';
  if (upper === 'DR_DRE' || upper === 'DRDRE') return 'DR_DRE';
  if (upper === 'NEPTUNE') return 'NEPTUNE';
  return 'ABU'; // 默认
}

/**
 * 获取三人格图标组件
 * 
 * @param persona 三人格类型
 * @returns Lucide 图标组件
 */
export function getPersonaIcon(persona: PersonaType | string): LucideIcon {
  const normalized = normalizePersona(persona);
  
  switch (normalized) {
    case 'ABU':
      return Shield; // 边界、盾、门、警戒
    case 'DR_DRE':
      return Activity; // 节奏、脉冲、呼吸、时间窗
    case 'NEPTUNE':
      return RefreshCw; // 空间、轨迹、结构、修复
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
 * 获取三人格名称（中文）
 */
export function getPersonaName(persona: PersonaType | string): string {
  const normalized = normalizePersona(persona);
  
  switch (normalized) {
    case 'ABU':
      return 'Abu';
    case 'DR_DRE':
      return 'Dr.Dre';
    case 'NEPTUNE':
      return 'Neptune';
  }
}

export function getPersonaLogoSrc(persona: PersonaType | string): string {
  return PERSONA_LOGO_SRC[normalizePersona(persona)];
}

/** Guardian 合议 bullet → 三人格（前缀 Abu:/Dr.Dre:/Neptune:） */
export function personaFromCouncilBullet(line: string): PersonaType | null {
  const trimmed = line.trim();
  if (/^Abu\s*[:：]/i.test(trimmed)) return 'ABU';
  if (/^Dr\.?\s*Dre\s*[:：]/i.test(trimmed)) return 'DR_DRE';
  if (/^Neptune\s*[:：]/i.test(trimmed)) return 'NEPTUNE';
  return null;
}
