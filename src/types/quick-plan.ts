import type {
  ExperienceExplanationCard,
  ItineraryPresentationBundle,
  TravelUnderstandingCard,
} from '@/types/experience-fulfillment';
import type { DraftDay } from '@/types/trip';

export interface QuickPlanExistingRequest {
  destination?: string;
  days?: number;
  date_range?: { start_date: string; end_date: string };
  transport?: string;
  style?: string;
  intensity?: string;
  [key: string]: unknown;
}

export interface QuickPlanAssumption<T = unknown> {
  value: T;
  confidence: number;
  source: string;
}

export interface QuickPlanRequest {
  userInput: string;
  existingRequest?: QuickPlanExistingRequest;
}

export interface QuickPlanRisk {
  type: 'warning' | 'info';
  message: string;
  suggestedAction?: string;
}

export interface QuickPlanQuickAction {
  label: string;
  action: string;
  param: string;
}

export interface QuickPlanResponse {
  understanding: {
    destination: string;
    tripType: string;
    keyInterests: string[];
  };
  assumptions: {
    destination: QuickPlanAssumption<string>;
    days: QuickPlanAssumption<number>;
    date_range: QuickPlanAssumption<{ start_date?: string; end_date?: string } | null>;
    transport: QuickPlanAssumption<string>;
    style: QuickPlanAssumption<string>;
    intensity: QuickPlanAssumption<string>;
  };
  risks: QuickPlanRisk[];
  preview: {
    days: DraftDay[];
    summary: string;
    totalDistance?: number;
    estimatedCost?: number;
    itineraryPresentation?: ItineraryPresentationBundle;
  };
  modificationOptions: {
    canModify: string[];
    quickActions: QuickPlanQuickAction[];
  };
  metadata: {
    quickPlanId: string;
    overallConfidence: number;
    needsConfirmation: boolean;
    estimatedGenerationTime: number;
  };
  experienceUnderstanding?: TravelUnderstandingCard;
  experienceExplanation?: ExperienceExplanationCard;
  narrative?: Record<string, unknown>;
}

export interface ConfirmPlanRequest {
  quickPlanId: string;
  confirmations: {
    date_range?: { start_date: string; end_date: string };
    acceptLongDrive?: boolean;
    acceptBudget?: number;
    customModifications?: Record<string, unknown>;
  };
}

export interface ConfirmPlanResponse {
  draft: {
    days: DraftDay[];
    warnings: string[];
  };
  usedAssumptions: Record<string, unknown>;
  appliedModifications: Record<string, unknown>;
}
