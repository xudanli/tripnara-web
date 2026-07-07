import type {
  AutomationAuthorizationView,
  AutomationGroupSummary,
} from '@/api/automation-authorization.types';
import type {
  TravelStatusAiCompletedWork,
  TravelStatusAutomation,
} from '@/api/travel-status.types';
import type { TripConstraintsContract } from '@/types/trip-constraints';
import type { AutomationAuthorizationScope } from '@/api/automation-authorization.types';
import { normalizeAutomation } from '@/lib/travel-status-normalize.util';
import {
  AUTOMATION_AUTHORIZATION_VIEW_SCHEMA_ID,
  EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT,
  sortCatalogGroupsByCanonicalOrder,
} from '@/lib/trip-automation-authorization.util';

function normalizeAiCompletedWork(raw: unknown): TravelStatusAiCompletedWork {
  if (!raw || typeof raw !== 'object') return { items: [] };
  const obj = raw as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? obj.items : [];
  return { items: items as TravelStatusAiCompletedWork['items'] };
}

function normalizeAutomationWithOrderedCatalog(raw: unknown): TravelStatusAutomation {
  const automation = normalizeAutomation(raw);
  const groups = sortCatalogGroupsByCanonicalOrder(automation.catalog.groups);
  return {
    ...automation,
    catalog: {
      ...automation.catalog,
      groups,
    },
  };
}

/** GET /trips/:tripId/automation-authorization 响应归一化 */
export function normalizeAutomationAuthorizationView(raw: unknown): AutomationAuthorizationView {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的 automation-authorization 响应');
  }

  const obj = raw as Record<string, unknown>;
  const travelStatusRaw =
    obj.travelStatus && typeof obj.travelStatus === 'object'
      ? (obj.travelStatus as Record<string, unknown>)
      : {};

  const automation = normalizeAutomationWithOrderedCatalog(travelStatusRaw.automation);

  return {
    schemaId: typeof obj.schemaId === 'string' ? obj.schemaId : undefined,
    tripId: typeof obj.tripId === 'string' ? obj.tripId : '',
    scope: (obj.scope === 'USER_TEMPLATE' ? 'USER_TEMPLATE' : 'TRIP') as AutomationAuthorizationScope,
    constraintsVersion:
      typeof obj.constraintsVersion === 'number' ? obj.constraintsVersion : 0,
    automationPaused: obj.automationPaused === true,
    contract: (obj.contract as TripConstraintsContract) ?? {},
    travelStatus: {
      automation,
      aiCompletedWork: normalizeAiCompletedWork(travelStatusRaw.aiCompletedWork),
    },
    userTemplate:
      obj.userTemplate && typeof obj.userTemplate === 'object'
        ? (obj.userTemplate as AutomationAuthorizationView['userTemplate'])
        : null,
  };
}

export function isAutomationAuthorizationViewReady(
  view?: AutomationAuthorizationView | null,
): boolean {
  return (
    view?.schemaId === AUTOMATION_AUTHORIZATION_VIEW_SCHEMA_ID &&
    view.travelStatus?.automation?.catalog?.groups?.length === EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT
  );
}

export function isAutomationCatalogReady(
  automation?: TravelStatusAutomation | null,
): boolean {
  return (
    (automation?.catalog?.groups?.length ?? 0) === EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT
  );
}

export { AUTOMATION_AUTHORIZATION_VIEW_SCHEMA_ID, EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT };
