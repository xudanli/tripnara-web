import {
  buildPersonaValidationDimensions,
  buildPersonaValidationDimensionsFromOption,
  type PersonaValidationDimension,
  type PersonaValidationStance,
} from '@/lib/persona-validation-dimensions.util';
import { getPersonaName } from '@/lib/persona-icons';
import type { DecisionOption } from '@/types/decision-problem';
import type { Collaborator, PersonaAlert } from '@/types/trip';

export type TeamStanceLevel = 'strong_support' | 'support' | 'acceptable' | 'concern';

export interface TeamStanceCardView {
  id: string;
  kind: 'persona' | 'member';
  name: string;
  persona?: PersonaValidationDimension['persona'];
  level: TeamStanceLevel;
  levelLabel: string;
  quote: string;
  members?: Array<{
    collaborator: Collaborator;
    level: TeamStanceLevel;
    levelLabel: string;
  }>;
}

const LEVEL_LABEL: Record<TeamStanceLevel, string> = {
  strong_support: '强烈支持',
  support: '支持',
  acceptable: '可以接受',
  concern: '有顾虑',
};

function stanceToPersonaLevel(stance: PersonaValidationStance): TeamStanceLevel {
  if (stance === 'oppose') return 'concern';
  if (stance === 'adjust') return 'acceptable';
  return 'strong_support';
}

function stanceToMemberLevel(stance: PersonaValidationStance): TeamStanceLevel {
  if (stance === 'oppose') return 'concern';
  if (stance === 'adjust') return 'acceptable';
  return 'support';
}

function shortenPersonaQuote(dimension: PersonaValidationDimension): string {
  const raw = dimension.summary?.trim() ?? '';
  if (raw.length <= 28) return raw;
  const firstSentence = raw.split(/[。！？.!?]/).find((part) => part.trim())?.trim();
  if (firstSentence && firstSentence.length <= 28) return `${firstSentence}。`;
  return `${raw.slice(0, 26)}…`;
}

export function buildPersonaTeamStanceCards(input: {
  selectedOption?: DecisionOption | null;
  selectedOptionLetter?: string;
  personaAlerts?: PersonaAlert[];
}): TeamStanceCardView[] {
  const letter = input.selectedOptionLetter ?? 'A';
  const fromOption = buildPersonaValidationDimensionsFromOption(input.selectedOption, letter);
  const hasTradeoffs = Boolean(input.selectedOption?.tradeoffs?.length);
  const dimensions = hasTradeoffs
    ? fromOption
    : buildPersonaValidationDimensions(input.personaAlerts, letter);

  return dimensions.map((dimension) => {
    const level = stanceToPersonaLevel(dimension.stance);
    return {
      id: `persona-${dimension.persona}`,
      kind: 'persona',
      name: getPersonaName(dimension.persona),
      persona: dimension.persona,
      level,
      levelLabel: LEVEL_LABEL[level],
      quote: shortenPersonaQuote(dimension),
    };
  });
}


export function buildMemberTeamStanceCard(input: {
  collaborators: Collaborator[];
  selectedOption?: DecisionOption | null;
  selectedOptionLetter?: string;
}): TeamStanceCardView | null {
  const humans = input.collaborators;
  if (humans.length <= 1) return null;

  const comfortRow = input.selectedOption?.tradeoffs?.find(
    (row) => row.dimension === 'COMFORT' || row.dimension === 'POI_COVERAGE',
  );
  const groupQuote =
    comfortRow?.explanation?.trim() ||
    (comfortRow?.direction === 'IMPROVE'
      ? '住宿与体验条件更好。'
      : '需关注行程节奏与预算平衡。');

  const members = humans.slice(0, 4).map((collaborator, index) => {
    const stance: PersonaValidationStance =
      comfortRow?.direction === 'WORSEN' && index % 2 === 1
        ? 'adjust'
        : comfortRow?.direction === 'WORSEN'
          ? 'oppose'
          : index % 2 === 0
            ? 'ok'
            : 'adjust';
    const level = stanceToMemberLevel(stance);
    return {
      collaborator,
      level,
      levelLabel: LEVEL_LABEL[level],
    };
  });

  return {
    id: 'team-members',
    kind: 'member',
    name: '团队成员',
    level: members[0]?.level ?? 'support',
    levelLabel: `${members.length} 人`,
    quote: groupQuote,
    members,
  };
}

export function buildTeamStanceCards(input: {
  collaborators: Collaborator[];
  selectedOption?: DecisionOption | null;
  selectedOptionLetter?: string;
  personaAlerts?: PersonaAlert[];
}): TeamStanceCardView[] {
  const personas = buildPersonaTeamStanceCards(input);
  const memberCard = buildMemberTeamStanceCard(input);
  return memberCard ? [...personas, memberCard] : personas;
}
