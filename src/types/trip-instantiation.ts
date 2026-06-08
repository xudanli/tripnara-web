import type {
  CollaborativeTaskFlywheelMetadata,
  CollaborativeTaskView,
} from '@/types/collaborative-task-flywheel';

/** §3.12 · 成团转 Active Trip */

export type TripInstantiationStrategy =
  | 'route_template_v1'
  | 'vibe_contextual_cards'
  | 'generic_plaza_trip';

export type TripInstantiationPlan = {
  strategy: TripInstantiationStrategy;
  canInstantiate: boolean;
  blockReason?: string | null;
  contextualCardIds?: string[];
};

/** GET /match-square/posts/:id/instantiation/preview */
export type TripInstantiationPreview = {
  canInstantiate: boolean;
  blockReason?: string | null;
  plan: TripInstantiationPlan;
  existingResult?: TripInstantiationResult | null;
  /** §3.13 · 成团前协同任务预览 */
  collaborativeTaskPreview?: CollaborativeTaskView[];
};

/** POST /match-square/posts/:id/instantiate-trip */
export type InstantiateTripRequest = {
  skipIfExists?: boolean;
};

export type TripInstantiationResult = {
  success: boolean;
  message?: string | null;
  tripId?: string | null;
  activeTripPath?: string | null;
  plan?: TripInstantiationPlan | null;
  instantiatedAt?: string | null;
  /** §3.13 · 写入 Trip.metadata.collaborativeTaskFlywheel */
  collaborativeTaskFlywheel?: CollaborativeTaskFlywheelMetadata | null;
};
