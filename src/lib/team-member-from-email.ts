import { decisionStyleApi, planningAssistantApi } from '@/api/assistant';
import { userApi } from '@/api/user';
import type {
  ExperienceLevelType,
  FitnessLevelType,
  ObjectiveFunctionWeights,
  TeamMember,
} from '@/types/optimization-v2';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';

export type TeamMemberEmailResolveStatus = 'idle' | 'found' | 'not_found';

export interface TeamMemberEmailResolveResult {
  status: TeamMemberEmailResolveStatus;
  member?: TeamMember;
  preferencesLoaded: boolean;
  email: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function displayNameFromEmail(email: string): string {
  const local = email.trim().split('@')[0] ?? '成员';
  return local.replace(/[._-]+/g, ' ').trim() || local;
}

function mapPaceToFitness(pace?: string): FitnessLevelType {
  if (pace === 'intensive' || pace === 'FAST') return 'ADVANCED';
  if (pace === 'relaxed' || pace === 'LEISURE') return 'BEGINNER';
  return 'INTERMEDIATE';
}

function mapRiskToExperience(risk?: string): ExperienceLevelType {
  if (risk === 'LOW') return 'NOVICE';
  if (risk === 'HIGH') return 'EXPERIENCED';
  return 'SOME_EXPERIENCE';
}

function applyPreferenceHints(
  base: ObjectiveFunctionWeights,
  hints: {
    pace?: string;
    budget?: string;
    risk?: string;
  },
): ObjectiveFunctionWeights {
  const next = { ...base };
  if (hints.budget === 'LOW' || hints.budget === 'HIGH') {
    next.budgetOverrun = hints.budget === 'LOW' ? 0.12 : 0.04;
  }
  if (hints.pace === 'relaxed' || hints.pace === 'LEISURE') {
    next.pacingVariance = 0.08;
    next.timeSlack = 0.14;
  } else if (hints.pace === 'intensive' || hints.pace === 'FAST') {
    next.pacingVariance = 0.04;
    next.experienceDensity = 0.24;
  }
  if (hints.risk === 'LOW') {
    next.safety = 0.32;
    next.weatherRisk = 0.12;
  }
  return next;
}

async function loadMemberPreferences(userId: string): Promise<{
  personalWeights: ObjectiveFunctionWeights;
  fitnessLevel: FitnessLevelType;
  experienceLevel: ExperienceLevelType;
  loaded: boolean;
}> {
  let personalWeights = { ...DEFAULT_WEIGHTS };
  let fitnessLevel: FitnessLevelType = 'INTERMEDIATE';
  let experienceLevel: ExperienceLevelType = 'SOME_EXPERIENCE';
  let loaded = false;

  try {
    const style = await decisionStyleApi.getPreferences(userId);
    personalWeights = applyPreferenceHints(personalWeights, {
      pace: style.preferredPace,
      budget: style.budgetPreference,
      risk: style.riskTolerance,
    });
    fitnessLevel = mapPaceToFitness(style.preferredPace);
    experienceLevel = mapRiskToExperience(style.riskTolerance);
    loaded = true;
  } catch {
    // fall through
  }

  if (!loaded) {
    try {
      const summary = await planningAssistantApi.getUserPreferences(userId);
      const pace = summary.learnedPreferences?.activities?.pacePreference;
      personalWeights = applyPreferenceHints(personalWeights, { pace });
      fitnessLevel = mapPaceToFitness(pace);
      loaded = Boolean(summary.summary || summary.topPreferences?.length);
    } catch {
      // no preferences
    }
  }

  return { personalWeights, fitnessLevel, experienceLevel, loaded };
}

export async function resolveTeamMemberByEmail(email: string): Promise<TeamMemberEmailResolveResult> {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    return { status: 'idle', preferencesLoaded: false, email: normalized };
  }

  const lookup = await userApi.lookupByEmail(normalized);
  if (!lookup.found || !lookup.user?.id) {
    return { status: 'not_found', preferencesLoaded: false, email: normalized };
  }

  const prefs = await loadMemberPreferences(lookup.user.id);
  const member: TeamMember = {
    userId: lookup.user.id,
    displayName: lookup.user.displayName?.trim() || displayNameFromEmail(normalized),
    role: 'MEMBER',
    decisionWeight: 0.5,
    fitnessLevel: prefs.fitnessLevel,
    experienceLevel: prefs.experienceLevel,
    personalWeights: prefs.personalWeights,
  };

  return {
    status: 'found',
    member,
    preferencesLoaded: prefs.loaded,
    email: normalized,
  };
}

export function buildPlaceholderMemberFromEmail(email: string): TeamMember {
  const normalized = email.trim().toLowerCase();
  return {
    userId: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    displayName: displayNameFromEmail(normalized),
    role: 'MEMBER',
    decisionWeight: 0.5,
    fitnessLevel: 'INTERMEDIATE',
    experienceLevel: 'SOME_EXPERIENCE',
    personalWeights: { ...DEFAULT_WEIGHTS },
  };
}
