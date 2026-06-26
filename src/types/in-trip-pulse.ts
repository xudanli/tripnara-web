import type { ThermometerLevel } from '@/types/in-trip-execution';

export type PhysicalLevel = 'energetic' | 'normal' | 'fatigued' | 'exhausted';
export type EmotionalLevel = 'joyful' | 'stable' | 'low' | 'irritable';
export type SpendingLevel = 'surplus' | 'normal' | 'tight' | 'overspent';
export type SocialLevel = 'harmonious' | 'normal' | 'subtle' | 'tense';
export type DecisionFatigueLevel = 'fresh' | 'normal' | 'fatigued' | 'depleted';

export interface MemberStateVector {
  tripId: string;
  userId: string;
  dayNumber: number;
  physicalLevel: PhysicalLevel;
  emotionalLevel: EmotionalLevel;
  spendingLevel: SpendingLevel;
  socialLevel: SocialLevel;
  decisionFatigue: DecisionFatigueLevel;
  confidenceScore: number;
  signals?: Record<string, unknown>;
  computedAt: string;
}

export interface TeamThermometerMemberCard {
  userId: string;
  displayName: string;
  level: ThermometerLevel;
}

export interface TeamThermometerData {
  tripId: string;
  dayNumber: number;
  level: ThermometerLevel;
  score: number;
  factors: Array<{ key: string; message: string; weight: number }>;
  memberCards: TeamThermometerMemberCard[];
  visible: boolean;
  computedAt: string;
}

export interface PulseInterventionAction {
  id: string;
  label: string;
  actionType: string;
}

export interface PulseIntervention {
  id: string;
  level: number;
  ruleId: string;
  framing: string;
  messageZh: string;
  actions: PulseInterventionAction[];
  status: 'pending' | 'acknowledged' | 'dismissed';
  privateChannelAvailable: boolean;
  createdAt: string;
}

export type InterventionAckAction = 'acknowledge' | 'dismiss';

export interface MoodCheckInput {
  score: number;
  source?: string;
}

export interface MicroFeedbackInput {
  score: number;
  context?: string;
  activityId?: string;
}

export interface MotionSignalInput {
  steps: number;
  avgSpeed?: number;
  restMinutes?: number;
}
