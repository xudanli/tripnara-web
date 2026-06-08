import type { MbtiQuadrant } from '@/types/odyssey-travel-persona';

export interface PersonaTheme {
  gradient: string;
  accent: string;
  shimmer: string;
  label: string;
}

/** PRD 模块三：四象限动态配色 */
export const PERSONA_QUADRANT_THEMES: Record<MbtiQuadrant, PersonaTheme> = {
  NT: {
    gradient: 'from-[#1C2E24] via-[#0f1a14] to-[#1a2e22]',
    accent: '#4ade80',
    shimmer: 'rgba(74, 222, 128, 0.35)',
    label: '理性主义',
  },
  NF: {
    gradient: 'from-[#D97746]/90 via-[#f5e6d3] to-[#D97746]/70',
    accent: '#fb923c',
    shimmer: 'rgba(251, 146, 60, 0.4)',
    label: '理想主义',
  },
  SP: {
    gradient: 'from-[#0A0A0A] via-[#111827] to-[#0c1a3a]',
    accent: '#38bdf8',
    shimmer: 'rgba(56, 189, 248, 0.4)',
    label: '感官探索',
  },
  SJ: {
    gradient: 'from-[#2C3539] via-[#3d4a42] to-[#5c4d3c]',
    accent: '#a8a29e',
    shimmer: 'rgba(168, 162, 158, 0.35)',
    label: '秩序严谨',
  },
};
