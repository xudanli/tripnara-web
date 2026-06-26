import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import {
  useParticipantDashboard,
  useParticipantInvite,
  useParticipantWithdraw,
  useSaveParticipantPreferences,
  useSubmitParticipantConsent,
} from '@/hooks/useParticipantPortal';
import { gate1CohortLabel } from '@/lib/gate1-display';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';
import {
  trackGate1ConsentAccepted,
  trackGate1InvitationOpened,
  trackGate1PreferenceFormStarted,
  trackGate1PreferenceFormSubmitted,
} from '@/utils/gate1-analytics';
import type { ParticipantDashboard, ParticipantInviteLanding } from '@/types/participant-portal';
import { GATE1_PARTICIPANT_SOURCE } from '../adapters/gate1-participant-adapter';
import { resolveConsentCatalog } from '../lib/participant-consent';
import {
  mapParticipantStatusToPhase,
  type PortalPhase,
} from './participant-phase';

interface ParticipantProjectContextValue {
  token: string;
  source: typeof GATE1_PARTICIPANT_SOURCE;
  invite: ParticipantInviteLanding | undefined;
  dashboard: ParticipantDashboard | undefined;
  phase: PortalPhase;
  projectSubtitle: string;
  isLoading: boolean;
  isDashboardLoading: boolean;
  isError: boolean;
  errorGuide: ReturnType<typeof resolveParticipantPortalErrorGuide> | null;
  consentMutation: ReturnType<typeof useSubmitParticipantConsent>;
  preferencesMutation: ReturnType<typeof useSaveParticipantPreferences>;
  withdrawMutation: ReturnType<typeof useParticipantWithdraw>;
  markPreferenceFormStarted: () => void;
  trackPreferenceSubmitted: (options: { privateUsed: boolean }) => void;
  refetchInvite: () => Promise<void>;
}

const ParticipantProjectContext = createContext<ParticipantProjectContextValue | null>(null);

interface ParticipantProjectProviderProps {
  children: ReactNode;
  loadDashboard?: boolean;
}

export function ParticipantProjectProvider({
  children,
  loadDashboard = false,
}: ParticipantProjectProviderProps) {
  const { token = '' } = useParams<{ token: string }>();
  const {
    data: invite,
    isLoading,
    isError,
    error,
    refetch: refetchInviteQuery,
  } = useParticipantInvite(token || undefined);
  const phase = useMemo(
    () => (invite ? mapParticipantStatusToPhase(invite.participant.status) : 'joining'),
    [invite],
  );
  const shouldLoadDashboard = loadDashboard || phase === 'active';

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
  } = useParticipantDashboard(shouldLoadDashboard ? token : undefined);

  const consentMutation = useSubmitParticipantConsent();
  const preferencesMutation = useSaveParticipantPreferences(token);
  const withdrawMutation = useParticipantWithdraw(token);

  const openedTrackedRef = useRef(false);
  const formStartedRef = useRef(false);
  const formStartTimeRef = useRef(0);

  useEffect(() => {
    if (!invite || invite.expired || openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    trackGate1InvitationOpened({
      projectId: invite.project.id,
      participantId: invite.participant.id,
    });
  }, [invite]);

  const projectSubtitle = invite
    ? `${invite.project.destination} · ${gate1CohortLabel(invite.project.cohort)}`
    : '';

  const errorGuide = isError ? resolveParticipantPortalErrorGuide(error) : null;

  const value = useMemo<ParticipantProjectContextValue>(
    () => ({
      token,
      source: GATE1_PARTICIPANT_SOURCE,
      invite,
      dashboard,
      phase,
      projectSubtitle,
      isLoading,
      isDashboardLoading,
      isError,
      errorGuide,
      consentMutation,
      preferencesMutation,
      withdrawMutation,
      markPreferenceFormStarted: () => {
        if (!invite || formStartedRef.current) return;
        formStartedRef.current = true;
        formStartTimeRef.current = Date.now();
        trackGate1PreferenceFormStarted({
          projectId: invite.project.id,
          participantId: invite.participant.id,
        });
      },
      trackPreferenceSubmitted: ({ privateUsed }) => {
        if (!invite) return;
        trackGate1PreferenceFormSubmitted({
          projectId: invite.project.id,
          participantId: invite.participant.id,
          durationMs: formStartTimeRef.current ? Date.now() - formStartTimeRef.current : undefined,
          privateUsed,
        });
      },
      refetchInvite: async () => {
        await refetchInviteQuery();
      },
    }),
    [
      token,
      invite,
      dashboard,
      phase,
      projectSubtitle,
      isLoading,
      isDashboardLoading,
      isError,
      errorGuide,
      consentMutation,
      preferencesMutation,
      withdrawMutation,
      refetchInviteQuery,
    ],
  );

  return (
    <ParticipantProjectContext.Provider value={value}>
      {children}
    </ParticipantProjectContext.Provider>
  );
}

export function useParticipantProject(): ParticipantProjectContextValue {
  const ctx = useContext(ParticipantProjectContext);
  if (!ctx) {
    throw new Error('useParticipantProject must be used within ParticipantProjectProvider');
  }
  return ctx;
}

export function useParticipantConsentTracking() {
  const { invite, consentMutation } = useParticipantProject();

  const acceptConsent = async (
    inviteToken: string,
    consents: {
      BASE_SERVICE: boolean;
      HUMAN_ASSISTED: boolean;
      RESEARCH: boolean;
      ANONYMIZED_CASE: boolean;
    },
  ) => {
    const res = await consentMutation.mutateAsync({
      inviteToken,
      action: 'ACCEPT',
      consents,
    });
    if (invite) {
      const catalog = resolveConsentCatalog(invite);
      trackGate1ConsentAccepted({
        projectId: invite.project.id,
        participantId: invite.participant.id,
        consentVersion: catalog.version,
      });
    }
    return res;
  };

  const declineConsent = (inviteToken: string, declineReason?: string) =>
    consentMutation.mutateAsync({ inviteToken, action: 'DECLINE', declineReason });

  return { acceptConsent, declineConsent, isPending: consentMutation.isPending };
}
