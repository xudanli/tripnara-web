import type {
  ExplorationCandidatesStatus,
  ExplorationEntryVariant,
  MaterializationStatus,
  RouteCandidateView,
  RouteCompareDimension,
  ExplorationGenerationMode,
  SubmitPrincipleItem,
} from '@/features/exploration/api/types';

/** GET /travel-contexts/:contextId/views/exploration — projection payload */
export interface ExplorationViewData {
  scenarioId?: string;
  sessionId?: string;
  tripId?: string | null;
  researchProtocolId?: string | null;
  materializationStatus?: MaterializationStatus;
  assignedVariant?: ExplorationEntryVariant;
  lockedFields?: string[];
  candidatesStatus?: ExplorationCandidatesStatus;
  candidates?: RouteCandidateView[];
  generationVersion?: number;
  generationMode?: ExplorationGenerationMode;
  dimensions?: RouteCompareDimension[];
  compare?: {
    candidates?: RouteCandidateView[];
    dimensions?: RouteCompareDimension[];
    generationVersion?: number;
    generationMode?: ExplorationGenerationMode;
  };
  scenario?: {
    destinationCodes?: string[];
    dateRange?: { startDate: string; endDate: string };
    travelers?: Array<{ type: 'ADULT' | 'CHILD' | 'INFANT' }>;
    budget?: { currency: string; min?: number; max?: number };
    mobilityContext?: { vehicleType?: string };
    insuranceContext?: { coverageTier?: string };
    rentalContext?: {
      pickupLocation?: string;
      pickupTimeLocal?: string;
      afterHoursPickupConfirmed?: boolean;
    };
  };
  principles?: SubmitPrincipleItem[];
  selectedRouteId?: string | null;
  planExecutability?: Record<string, unknown>;
  ontologyConstraints?: Record<string, unknown>;
  ontologyIssueCount?: number;
  ontologyBlockerCount?: number;
  explorationArchive?: Record<string, unknown>;
}
