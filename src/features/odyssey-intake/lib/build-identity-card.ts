import type { MbtiQuadrant } from '@/types/odyssey-intake';
import type { OdysseyIdentityCard } from '@/types/odyssey-intake';
import type { ResolvedTravelPersona } from '@/types/odyssey-travel-persona';

const QUADRANT_CARD_THEMES: Record<
  MbtiQuadrant,
  { gradientFrom: string; gradientTo: string; accentColor: string }
> = {
  NT: { gradientFrom: '#1C2E24', gradientTo: '#0f1a14', accentColor: '#5E7D5B' },
  NF: { gradientFrom: '#D97746', gradientTo: '#f5e6d3', accentColor: '#fb923c' },
  SP: { gradientFrom: '#0A0A0A', gradientTo: '#0c1a3a', accentColor: '#88C0D0' },
  SJ: { gradientFrom: '#2C3539', gradientTo: '#5c4d3c', accentColor: '#a8a29e' },
};

export function buildIdentityCardFromPersona(persona: ResolvedTravelPersona): OdysseyIdentityCard {
  const theme = QUADRANT_CARD_THEMES[persona.quadrant as MbtiQuadrant];
  return {
    mbtiType: persona.mbtiType,
    title: persona.title,
    subtitle: persona.description,
    theme: {
      quadrant: persona.quadrant as MbtiQuadrant,
      gradientFrom: theme.gradientFrom,
      gradientTo: theme.gradientTo,
      accentColor: theme.accentColor,
    },
    radar: {
      financialFlexibility: persona.radar.financialFlexibility,
      planningRigidity: persona.radar.planningRigidity,
      ambiguityTolerance: persona.radar.ambiguityTolerance,
      energyCapacity: persona.radar.energyCapacity,
      socialDrive: persona.radar.socialDrive,
      meaningOrientation: persona.radar.meaningOrientation,
    },
  };
}
