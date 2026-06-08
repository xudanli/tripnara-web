import { buildIdentityCardFromPersona } from './build-identity-card';
import { findMatches } from './matching';
import { resolveTravelPersonaPremium } from './persona-resolver';
import { computePremiumCognitiveScores } from './premium-stress-scoring';
import { rebuildQuestionsForScoring } from './normalize-premium-stress-questions';
import { parsePremiumSubmitPayload } from './reconcile-premium-card';
import {
  readStoredPremiumIntake,
  writeStoredPremiumIntake,
  type StoredPremiumIntake,
} from './premium-stress-storage';
import type {
  CompanionMatch,
  OdysseyOnboardingStatus,
  OdysseySubmitAndMatchResult,
  OdysseySubmitRequest,
  OdysseySubmitResult,
} from '@/types/odyssey-intake';
import type { TripIntentTag } from '@/types/odyssey-travel-persona';

function parsePremiumPayload(payload: OdysseySubmitRequest) {
  return parsePremiumSubmitPayload(payload);
}

function buildOnboarding(canMatch = false): OdysseyOnboardingStatus {
  return {
    quizComplete: true,
    trustVerified: false,
    cardReady: true,
    canMatch,
    nextStep: canMatch ? 'match' : 'trust_verify',
  };
}

function toCompanionMatches(stored: StoredPremiumIntake): CompanionMatch[] {
  const questions = rebuildQuestionsForScoring(stored.questionIds);
  const persona = resolveTravelPersonaPremium(stored.mbtiType, stored.stressAnswers, questions);
  const cognitiveScores = computePremiumCognitiveScores(
    stored.mbtiType,
    stored.stressAnswers,
    questions
  );

  return findMatches({
    completedAt: stored.completedAt,
    answers: {},
    cognitiveScores,
    persona,
    tripIntentTag: 'open_to_match' as TripIntentTag,
  }).map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    mbtiType: m.mbtiType,
    cardTitle: m.personaTitle,
    compatibilityScore: m.compatibilityScore,
    dimensionBreakdown: {
      eiFit: 0.7,
      tfFit: 0.7,
      energyFit: 0.7,
      ambiguityFit: 0.7,
    },
    destination: m.destination,
    dateRange: m.dateRange,
  }));
}

export const odysseyIntakeMockStore = {
  submit: (payload: OdysseySubmitRequest): OdysseySubmitResult => {
    const parsed = parsePremiumPayload(payload);
    if (!parsed) {
      throw new Error('Premium intake payload invalid');
    }

    const questions = rebuildQuestionsForScoring(parsed.questionIds);
    const persona = resolveTravelPersonaPremium(
      parsed.mbtiType,
      parsed.stressAnswers,
      questions
    );
    const card = buildIdentityCardFromPersona(persona);

    writeStoredPremiumIntake({
      mbtiType: parsed.mbtiType,
      stressAnswers: parsed.stressAnswers,
      questionIds: parsed.questionIds,
    });

    return {
      mbtiType: persona.mbtiType,
      card,
      onboarding: buildOnboarding(false),
    };
  },

  submitAndMatch: (payload: OdysseySubmitRequest): OdysseySubmitAndMatchResult => {
    const submitted = odysseyIntakeMockStore.submit(payload);
    const stored = readStoredPremiumIntake();
    const matches = stored ? toCompanionMatches(stored) : [];

    return {
      mbtiType: submitted.mbtiType,
      card: submitted.card,
      matches,
      onboarding: buildOnboarding(true),
    };
  },
};
