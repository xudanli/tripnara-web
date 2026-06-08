import { useMemo } from 'react';
import { useOdysseyProfileCard } from '@/hooks/useOdysseyProfileCard';
import { tripIntentLabel } from '@/features/odyssey-intake/lib/trip-intent';
import { computePremiumCognitiveScores } from '@/features/odyssey-intake/lib/premium-stress-scoring';
import { MBTI_QUADRANT_LABELS } from '../lib/constants';
import { estimateScoresFromMbti } from '../lib/estimate-captain-scores';
import {
  buildViewerProfileFromContext,
  loadStoredPremiumStressAnswers,
  type MatchEngineProfile,
  type MatchTripWindow,
} from '../lib/match-engine';
import { viewerProfileFromContext } from '../lib/slot-filling';
import type { MbtiQuadrant, MbtiType } from '@/types/odyssey-travel-persona';
import { useMyVerifiedCredentials } from './useMyVerifiedCredentials';

const TRAVEL_INTENT_KEY = 'match-square-travel-intent';

function readMemberTripFromIntent(): MatchTripWindow | null {
  try {
    const raw = localStorage.getItem(TRAVEL_INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as {
      active?: boolean;
      destinationScope?: string;
      destinationHint?: string;
      startDate?: string;
      endDate?: string;
    };
    if (!intent.active || !intent.startDate || !intent.endDate) return null;
    return {
      destination: intent.destinationScope ?? intent.destinationHint ?? '',
      startDate: intent.startDate,
      endDate: intent.endDate,
    };
  } catch {
    return null;
  }
}

/** 广场「双层状态」：长期人格 + 本次出行意图 + Match Engine 特征向量 */
export function usePlazaMatchContext() {
  const { cardView, selectedTripIntentTag, ui, completed } = useOdysseyProfileCard();

  const mbtiType = cardView?.profile?.mbtiType ?? '';
  const quadrant =
    (cardView?.profile?.card?.theme?.quadrant as MbtiQuadrant | undefined) ?? undefined;
  const personaTitle = cardView?.profile?.card?.title;
  const personaLabel =
    personaTitle ?? (quadrant ? MBTI_QUADRANT_LABELS[quadrant] : undefined);
  const tripIntent = tripIntentLabel(selectedTripIntentTag, ui.tripIntentTagOptions);

  const premiumStressAnswers = useMemo(() => loadStoredPremiumStressAnswers(), [completed]);

  const viewerScores = useMemo(() => {
    if (!mbtiType) return null;
    if (premiumStressAnswers && Object.keys(premiumStressAnswers).length > 0) {
      return computePremiumCognitiveScores(mbtiType as MbtiType, premiumStressAnswers);
    }
    return estimateScoresFromMbti(mbtiType);
  }, [mbtiType, premiumStressAnswers]);

  const memberTrip = useMemo(() => readMemberTripFromIntent(), []);

  const { data: myCredentials } = useMyVerifiedCredentials(completed);

  const viewerCredentials = useMemo(() => {
    if (!completed) return null;
    return myCredentials ?? null;
  }, [completed, myCredentials]);

  const viewerMatchProfile = useMemo((): MatchEngineProfile | null => {
    if (!mbtiType) return null;
    return buildViewerProfileFromContext({
      mbtiType,
      credentials: viewerCredentials,
      cognitiveScores: viewerScores ?? undefined,
      trip: memberTrip,
    });
  }, [mbtiType, viewerCredentials, viewerScores, memberTrip]);

  const viewerProfile = useMemo(
    () =>
      viewerProfileFromContext({
        personaTitle,
        mbtiType,
        matchProfile: viewerMatchProfile,
      }),
    [personaTitle, mbtiType, viewerMatchProfile]
  );

  return {
    completed,
    personaLabel,
    quadrant,
    tripIntent,
    viewerMbtiType: mbtiType,
    viewerScores,
    viewerProfile,
    viewerCredentials,
    viewerMatchProfile,
    memberTrip,
    credentialsLoading: completed && myCredentials === undefined,
  };
}
