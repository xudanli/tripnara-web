/**
 * Gate 1 API 统一导出
 * Swagger 标签：gate1 · gate1-participant · gate1-advisor · gate1-ops · gate1-metrics
 * @see docs/api/gate1-frontend-integration.md
 */

import { gate1ParticipantApi } from './gate1-participant';
import { participantPortalApi } from './participant-portal';
import { gate1ProjectsApi } from './gate1-projects';
import { gate1AdvisorApi } from './gate1-advisor';
import { gate1OpsApi } from './gate1-ops';
import { gate1MetricsApi } from './gate1-metrics';

export {
  Gate1ApiError,
  buildGate1ParticipantInviteUrl,
  gate1Get,
  gate1Post,
  gate1Put,
  gate1Patch,
  isGate1ApiError,
} from './gate1-common';

export { gate1ParticipantApi } from './gate1-participant';
export {
  participantPortalApi,
  buildParticipantInviteUrl,
  buildParticipantDashboardPath,
} from './participant-portal';
export { gate1ProjectsApi } from './gate1-projects';
export { gate1AdvisorApi } from './gate1-advisor';
export { gate1OpsApi } from './gate1-ops';
export { gate1MetricsApi } from './gate1-metrics';

/** 聚合入口，便于 `import { gate1Api } from '@/api/gate1'` */
export const gate1Api = {
  participant: gate1ParticipantApi,
  participantPortal: participantPortalApi,
  projects: gate1ProjectsApi,
  advisor: gate1AdvisorApi,
  ops: gate1OpsApi,
  metrics: gate1MetricsApi,
} as const;
