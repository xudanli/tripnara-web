import type {
  OdysseyCognitiveScores,
  OdysseyMatchCandidate,
  OdysseyTravelPersonaProfile,
} from '@/types/odyssey-travel-persona';
import { resolveMbtiAxes } from './mbti-resolver';

const MATCH_WEIGHTS = {
  ei: 0.3,
  tf: 0.3,
  energy: 0.2,
  ambiguity: 0.2,
} as const;

function eiFit(self: OdysseyCognitiveScores, other: OdysseyCognitiveScores): number {
  const selfAxes = resolveMbtiAxes(self);
  const otherAxes = resolveMbtiAxes(other);
  const selfExtreme = Math.abs(selfAxes.E - 50);
  const otherExtreme = Math.abs(otherAxes.E - 50);
  const complementary =
    (selfAxes.E >= 50 && otherAxes.E < 50) || (selfAxes.E < 50 && otherAxes.E >= 50);
  if (complementary) return 1;
  if (selfExtreme > 35 && otherExtreme > 35 && selfAxes.E >= 50 === otherAxes.E >= 50) return 0.3;
  return 0.6;
}

function tfFit(self: OdysseyCognitiveScores, other: OdysseyCognitiveScores): number {
  const selfAxes = resolveMbtiAxes(self);
  const otherAxes = resolveMbtiAxes(other);
  const selfT = selfAxes.T;
  const otherT = otherAxes.T;
  if ((selfT > 75 && otherT < 30) || (otherT > 75 && selfT < 30)) return 0.2;
  if (Math.abs(selfT - otherT) < 25) return 0.85;
  return 0.65;
}

function energyFit(self: OdysseyCognitiveScores, other: OdysseyCognitiveScores): number {
  const diff = Math.abs(self.energy_capacity - other.energy_capacity);
  return Math.max(0, 1 - diff / 6);
}

function ambiguityFit(self: OdysseyCognitiveScores, other: OdysseyCognitiveScores): number {
  const diff = Math.abs(self.ambiguity_tolerance - other.ambiguity_tolerance);
  return Math.max(0, 1 - diff / 6);
}

export function passesHardGates(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores
): boolean {
  const selfAxes = resolveMbtiAxes(self);
  const otherAxes = resolveMbtiAxes(other);

  if (self.financial_flexibility <= -2 && other.financial_flexibility >= 2) return false;
  if (self.financial_flexibility >= 2 && other.financial_flexibility <= -2) return false;

  const selfControl = selfAxes.J > 85 && selfAxes.P < 15;
  const otherChaos = otherAxes.P > 85 && otherAxes.J < 15;
  const otherControl = otherAxes.J > 85 && otherAxes.P < 15;
  const selfChaos = selfAxes.P > 85 && selfAxes.J < 15;
  if ((selfControl && otherChaos) || (otherControl && selfChaos)) return false;

  return true;
}

export function computeCompatibilityScore(
  self: OdysseyCognitiveScores,
  other: OdysseyCognitiveScores
): number {
  if (!passesHardGates(self, other)) return 0;
  const score =
    MATCH_WEIGHTS.ei * eiFit(self, other) +
    MATCH_WEIGHTS.tf * tfFit(self, other) +
    MATCH_WEIGHTS.energy * energyFit(self, other) +
    MATCH_WEIGHTS.ambiguity * ambiguityFit(self, other);
  return Math.round(score * 100);
}

/** Mock 候选池 — API 就绪后由后端替换 */
const MOCK_POOL: Array<{
  userId: string;
  displayName: string;
  scores: OdysseyCognitiveScores;
  personaTitle: string;
  mbtiType: string;
  destination: string;
  dateRange: string;
}> = [
  {
    userId: 'mock-1',
    displayName: '小林',
    mbtiType: 'INFJ',
    personaTitle: '神隐于世的宿命论朝圣者',
    destination: '冰岛',
    dateRange: '7.12 – 7.20',
    scores: {
      financial_flexibility: 0,
      planning_index: 2,
      compromise_index: 2,
      ambiguity_tolerance: -1,
      stress_anxiety_index: 0,
      energy_capacity: 0,
      travel_pace_specialist: 0,
      travel_pace_relaxed: 2,
      social_drive: 0,
      aesthetic_meaning: 2,
      aesthetic_sensory: 0,
      mbti_e_score: 0,
      mbti_i_score: 4,
      mbti_t_score: 0,
      mbti_f_score: 3,
      mbti_s_score: 0,
      mbti_n_score: 4,
      mbti_j_score: 4,
      mbti_p_score: 0,
    },
  },
  {
    userId: 'mock-2',
    displayName: '阿哲',
    mbtiType: 'ENTP',
    personaTitle: '特立独行的无证导游',
    destination: '冰岛',
    dateRange: '7.10 – 7.18',
    scores: {
      financial_flexibility: 2,
      planning_index: -1,
      compromise_index: 0,
      ambiguity_tolerance: 4,
      stress_anxiety_index: 0,
      energy_capacity: 2,
      travel_pace_specialist: 2,
      travel_pace_relaxed: 0,
      social_drive: 2,
      aesthetic_meaning: 2,
      aesthetic_sensory: 0,
      mbti_e_score: 4,
      mbti_i_score: 0,
      mbti_t_score: 2,
      mbti_f_score: 0,
      mbti_s_score: 0,
      mbti_n_score: 4,
      mbti_j_score: 0,
      mbti_p_score: 4,
    },
  },
  {
    userId: 'mock-3',
    displayName: 'Mia',
    mbtiType: 'ISFP',
    personaTitle: '落日收集者的私人美术馆',
    destination: '西藏阿里',
    dateRange: '8.01 – 8.10',
    scores: {
      financial_flexibility: -2,
      planning_index: 0,
      compromise_index: 0,
      ambiguity_tolerance: -2,
      stress_anxiety_index: 2,
      energy_capacity: -2,
      travel_pace_specialist: 0,
      travel_pace_relaxed: 2,
      social_drive: -2,
      aesthetic_meaning: 0,
      aesthetic_sensory: 4,
      mbti_e_score: 0,
      mbti_i_score: 4,
      mbti_t_score: 0,
      mbti_f_score: 0,
      mbti_s_score: 4,
      mbti_n_score: 0,
      mbti_j_score: 2,
      mbti_p_score: 0,
    },
  },
];

export function findMatches(profile: OdysseyTravelPersonaProfile): OdysseyMatchCandidate[] {
  const self = profile.cognitiveScores;
  return MOCK_POOL.map((candidate) => ({
    userId: candidate.userId,
    displayName: candidate.displayName,
    mbtiType: candidate.mbtiType as OdysseyMatchCandidate['mbtiType'],
    personaTitle: candidate.personaTitle,
    compatibilityScore: computeCompatibilityScore(self, candidate.scores),
    destination: candidate.destination,
    dateRange: candidate.dateRange,
    highlights: [
      candidate.mbtiType,
      `消费弹性 ${candidate.scores.financial_flexibility > 0 ? '偏灵活' : '偏节制'}`,
    ],
  }))
    .filter((m) => m.compatibilityScore > 0)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}
