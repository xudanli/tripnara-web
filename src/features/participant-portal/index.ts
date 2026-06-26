export {
  ParticipantPortalShell,
} from './pages/ParticipantPortalShell';
export {
  ParticipantInviteShell,
  ParticipantInviteEntryPage,
} from './pages/ParticipantInviteShell';
export { default as InviteLandingPage } from './pages/InviteLandingPage';
export { default as ConsentPage } from './pages/ConsentPage';
export { default as ParticipantPreferencesPage } from './pages/ParticipantPreferencesPage';
export { default as ParticipantDashboardPage } from './pages/ParticipantDashboardPage';
export { default as ParticipantTrustSurfacePage } from './pages/ParticipantTrustSurfacePage';
export { default as ParticipantReadinessPage } from './pages/ParticipantReadinessPage';
export { default as ParticipantChangeNoticesPage } from './pages/ParticipantChangeNoticesPage';
export { default as ParticipantChangeNoticeDetailPage } from './pages/ParticipantChangeNoticeDetailPage';
export { default as ParticipantOutcomeFeedbackPage } from './pages/ParticipantOutcomeFeedbackPage';
export { default as ProposalFeedbackPage } from './pages/ProposalFeedbackPage';
export { default as ParticipantMyProjectsPage } from './pages/ParticipantMyProjectsPage';
export { default as ParticipantNotificationsPage } from './pages/ParticipantNotificationsPage';
export { ParticipantProjectsBanner } from './components/ParticipantProjectsBanner';
export { PrivateConstraintsMetaPanel } from './components/PrivateConstraintsMetaPanel';
export { ParticipantLoginHint, buildAcceptInviteBody } from './lib/participant-auth';
export { pollProjectFitParticipantPortal } from './lib/project-fit-portal-poll';
export { resolveParticipantPortalErrorGuide } from './lib/participant-portal-errors';
export { default as TerminalStatePage } from './pages/TerminalStatePage';

export { ParticipantMobileLayout } from './layout/ParticipantMobileLayout';
export {
  ParticipantProjectProvider,
  useParticipantProject,
  useParticipantConsentTracking,
} from './shell/ParticipantProjectProvider';
export {
  mapParticipantStatusToPhase,
  participantInvitePath,
  participantProjectPath,
  portalBasePath,
  portalPathForPhase,
  portalPhaseLabel,
  type PortalPhase,
} from './shell/participant-phase';
export {
  normalizeParticipantPortalHref,
  participantPortalHrefFromLink,
  participantPortalHrefFromToken,
} from './lib/participant-portal-link';
export { gate1ParticipantAdapter, GATE1_PARTICIPANT_SOURCE } from './adapters/gate1-participant-adapter';

export { VisibilityBadge, type FieldVisibility } from './components/VisibilityBadge';
export { PrimaryActionCard } from './components/PrimaryActionCard';
export { ProjectHeaderCard } from './components/ProjectHeaderCard';
export { CompletionProgressCard } from './components/CompletionProgressCard';
export { ParticipantHelpFooter } from './components/ParticipantHelpFooter';
export { ParticipantTabNav } from './components/ParticipantTabNav';
export { ParticipantNotificationsPanel } from './components/ParticipantNotificationsPanel';
export { ChangeSeverityBadge } from './components/ChangeSeverityBadge';
export { ChangeNoticeCard } from './components/ChangeNoticeCard';
export { ParticipantTrustSurfacePanel } from './components/ParticipantTrustSurfacePanel';
export { TrustCard, TrustCardList, ConfidenceBadge } from '@/components/decision-os';
