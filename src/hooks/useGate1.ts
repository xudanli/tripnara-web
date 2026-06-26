import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gate1AdvisorApi } from '@/api/gate1-advisor';
import { gate1MetricsApi } from '@/api/gate1-metrics';
import { gate1OpsApi } from '@/api/gate1-ops';
import { gate1RuntimeOpsApi } from '@/api/gate1-runtime-ops';
import { gate1ParticipantApi } from '@/api/gate1-participant';
import { gate1ProjectsApi } from '@/api/gate1-projects';
import { useAuth } from '@/hooks/useAuth';
import type {
  CreateGate1AdvisorStrategyRequest,
  CreateGate1CandidateRequest,
  CreateGate1ConflictReportRequest,
  CreateGate1InvitationRequest,
  CreateGate1PlanBRequest,
  CreateGate1ProjectRequest,
  CreateGate1ReadinessReportRequest,
  CreateGate1SanitizedConstraintRequest,
  CreateGate1TravelEventRequest,
  CreateGate1WorkLogRequest,
  Gate1AdvisorProjectListQuery,
  Gate1Cohort,
  Gate1ConflictFindingActionRequest,
  Gate1ConflictFindingFeedbackRequest,
  Gate1ConsentRequest,
  Gate1ParticipantFeedbackRequest,
  Gate1PlanBOutcomeRequest,
  Gate1PlanBPreDecisionRequest,
  Gate1PreferencesRequest,
  Gate1ReadinessFindingActionRequest,
  Gate1ReadinessFindingFeedbackRequest,
  PatchGate1ProjectStatusRequest,
  PublishGate1OutputRequest,
  ReviewGate1SanitizedConstraintRequest,
  SubmitGate1BaselineRequest,
  SubmitGate1DecisionRequest,
  SubmitGate1OutcomeRequest,
} from '@/types/gate1';

export const GATE1_PROJECTS_KEY = ['gate1', 'projects'] as const;

export function gate1ProjectKey(projectId: string) {
  return ['gate1', 'project', projectId] as const;
}

export function gate1BaselineKey(projectId: string) {
  return ['gate1', 'baseline', projectId] as const;
}

export function gate1ParticipantsProgressKey(projectId: string) {
  return ['gate1', 'participants', projectId] as const;
}

export function gate1AdvisorOutputsKey(projectId: string) {
  return ['gate1', 'advisor-outputs', projectId] as const;
}

export function gate1DecisionKey(projectId: string) {
  return ['gate1', 'decision', projectId] as const;
}

export function gate1OutcomeKey(projectId: string) {
  return ['gate1', 'outcome', projectId] as const;
}

export function gate1OpsQueueKey() {
  return ['gate1', 'ops', 'queue'] as const;
}

export function gate1MetricsKey(cohort?: Gate1Cohort) {
  return ['gate1', 'metrics', cohort ?? 'default'] as const;
}

export const GATE1_ADVISOR_DASHBOARD_KEY = ['gate1', 'advisor', 'dashboard'] as const;

export function gate1AdvisorProjectsKey(query?: Gate1AdvisorProjectListQuery) {
  return ['gate1', 'advisor', 'projects', query ?? {}] as const;
}

export function gate1OverviewKey(projectId: string) {
  return ['gate1', 'advisor', 'overview', projectId] as const;
}

export function gate1TrustSurfaceKey(projectId: string) {
  return ['gate1', 'advisor', 'trust-surface', projectId] as const;
}

export function gate1AuditTimelineKey(projectId: string) {
  return ['gate1', 'advisor', 'audit-timeline', projectId] as const;
}

export function gate1RuntimeWorkspaceKey(projectId: string) {
  return ['gate1', 'advisor', 'runtime-workspace', projectId] as const;
}

export function gate1RuntimeFlagsKey() {
  return ['gate1', 'ops', 'runtime', 'flags'] as const;
}

export function gate1RuntimeMetricsKey(reconcile?: boolean) {
  return ['gate1', 'ops', 'runtime', 'metrics', reconcile ?? false] as const;
}

export function gate1RuntimeAcceptanceKey() {
  return ['gate1', 'ops', 'runtime', 'acceptance'] as const;
}

export function gate1RuntimeReconcileKey(projectId: string) {
  return ['gate1', 'ops', 'runtime', 'reconcile', projectId] as const;
}

export function gate1RuntimeProjectionKey(projectId: string) {
  return ['gate1', 'ops', 'runtime', 'projection', projectId] as const;
}

export const gate1RuntimeSloKey = ['gate1', 'ops', 'runtime', 'slo'] as const;

export function gate1RuntimeSloContingencyKey(limit = 20) {
  return ['gate1', 'ops', 'runtime', 'slo', 'contingency', limit] as const;
}

export function gate1RuntimeSloDecisionDnaKey(limit = 20) {
  return ['gate1', 'ops', 'runtime', 'slo', 'decision-dna', limit] as const;
}

export const gate1RuntimeSloContextRecallKey = [
  'gate1',
  'ops',
  'runtime',
  'slo',
  'context-recall',
] as const;

export function gate1RuntimeSloMemoryStateKey(limit = 20) {
  return ['gate1', 'ops', 'runtime', 'slo', 'memory-state', limit] as const;
}

export function gate1ConstraintsKey(projectId: string) {
  return ['gate1', 'advisor', 'constraints', projectId] as const;
}

export function gate1InvitationKey(token: string) {
  return ['gate1', 'invitation', token] as const;
}

function invalidateAdvisorSurface(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: GATE1_ADVISOR_DASHBOARD_KEY });
  void queryClient.invalidateQueries({ queryKey: ['gate1', 'advisor', 'projects'] });
  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: gate1OverviewKey(projectId) });
    void queryClient.invalidateQueries({ queryKey: gate1TrustSurfaceKey(projectId) });
    void queryClient.invalidateQueries({ queryKey: gate1ConstraintsKey(projectId) });
  }
}

function invalidateProject(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: gate1ProjectKey(projectId) });
  void queryClient.invalidateQueries({ queryKey: GATE1_PROJECTS_KEY });
  invalidateAdvisorSurface(queryClient, projectId);
}

export function useGate1Projects() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: GATE1_PROJECTS_KEY,
    queryFn: () => gate1ProjectsApi.list(),
    enabled: isAuthenticated,
    staleTime: 20_000,
  });
}

export function useGate1AdvisorDashboard() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: GATE1_ADVISOR_DASHBOARD_KEY,
    queryFn: () => gate1AdvisorApi.getDashboard(),
    enabled: isAuthenticated,
    staleTime: 20_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1AdvisorProjectList(query?: Gate1AdvisorProjectListQuery) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1AdvisorProjectsKey(query),
    queryFn: () => gate1AdvisorApi.listProjects(query),
    enabled: isAuthenticated,
    staleTime: 20_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1ProjectOverview(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1OverviewKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getOverview(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1TrustSurface(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1TrustSurfaceKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getTrustSurface(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1AuditTimeline(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1AuditTimelineKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getAuditTimeline(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1RuntimeWorkspace(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1RuntimeWorkspaceKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getRuntimeWorkspace(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1RuntimeFlags() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeFlagsKey(),
    queryFn: () => gate1RuntimeOpsApi.getFlags(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1RuntimeMetrics(reconcile?: boolean) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeMetricsKey(reconcile),
    queryFn: () => gate1RuntimeOpsApi.getMetrics(reconcile),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1RuntimeAcceptance() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeAcceptanceKey(),
    queryFn: () => gate1RuntimeOpsApi.getAcceptance(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useGate1RuntimeReconcile(projectId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeReconcileKey(projectId ?? ''),
    queryFn: () => gate1RuntimeOpsApi.reconcileProject(projectId!),
    enabled: isAuthenticated && Boolean(projectId),
    staleTime: 0,
    retry: false,
  });
}

export function useGate1RuntimeProjection(projectId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeProjectionKey(projectId ?? ''),
    queryFn: () => gate1RuntimeOpsApi.getProjectProjection(projectId!),
    enabled: isAuthenticated && Boolean(projectId),
    staleTime: 0,
    retry: false,
  });
}

export function useDecisionOsSlo() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeSloKey,
    queryFn: () => gate1RuntimeOpsApi.getSlo(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });
}

export function useDecisionOsSloContingencyRecent(limit = 20) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeSloContingencyKey(limit),
    queryFn: () => gate1RuntimeOpsApi.getSloContingencyRecent(limit),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });
}

export function useDecisionOsSloDecisionDnaRecent(limit = 20) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeSloDecisionDnaKey(limit),
    queryFn: () => gate1RuntimeOpsApi.getSloDecisionDnaRecent(limit),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });
}

export function useDecisionOsSloContextRecallBaseline() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeSloContextRecallKey,
    queryFn: () => gate1RuntimeOpsApi.getSloContextRecallBaseline(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
}

export function useDecisionOsSloMemoryStateRecent(limit = 20) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1RuntimeSloMemoryStateKey(limit),
    queryFn: () => gate1RuntimeOpsApi.getSloMemoryStateRecent(limit),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGate1Constraints(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1ConstraintsKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getConstraints(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function gate1CompareKey(projectId: string, a?: string, b?: string) {
  return ['gate1', 'compare', projectId, a ?? '', b ?? ''] as const;
}

export function useGate1CompareCandidates(
  projectId: string | undefined,
  candidateAId?: string,
  candidateBId?: string,
) {
  return useQuery({
    queryKey: gate1CompareKey(projectId ?? '', candidateAId, candidateBId),
    queryFn: () => gate1AdvisorApi.compareCandidates(projectId!, candidateAId!, candidateBId!),
    enabled: Boolean(projectId && candidateAId && candidateBId && candidateAId !== candidateBId),
    staleTime: 60_000,
  });
}

export function useGate1Project(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1ProjectKey(projectId ?? ''),
    queryFn: () => gate1ProjectsApi.getById(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useGate1Baseline(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1BaselineKey(projectId ?? ''),
    queryFn: () => gate1ProjectsApi.getBaseline(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useGate1ParticipantsProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1ParticipantsProgressKey(projectId ?? ''),
    queryFn: () => gate1ProjectsApi.getParticipantsProgress(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });
}

export function useGate1AdvisorOutputs(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1AdvisorOutputsKey(projectId ?? ''),
    queryFn: async () => {
      const [conflicts, candidates, sanitized, readiness, planB] = await Promise.all([
        gate1AdvisorApi.getConflicts(projectId!),
        gate1AdvisorApi.getCandidates(projectId!),
        gate1AdvisorApi.getSanitizedConstraints(projectId!),
        gate1AdvisorApi.getReadiness(projectId!),
        gate1AdvisorApi.getPlanB(projectId!),
      ]);
      return { conflicts, candidates, sanitized, readiness, planB };
    },
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useGate1Decision(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1DecisionKey(projectId ?? ''),
    queryFn: () => gate1AdvisorApi.getDecision(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useGate1Outcome(projectId: string | undefined) {
  return useQuery({
    queryKey: gate1OutcomeKey(projectId ?? ''),
    queryFn: () => gate1ProjectsApi.getOutcome(projectId!),
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function useGate1OpsQueue() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gate1OpsQueueKey(),
    queryFn: () => gate1OpsApi.getQueue(),
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
}

export function useGate1Metrics(cohort?: Gate1Cohort) {
  return useQuery({
    queryKey: gate1MetricsKey(cohort),
    queryFn: () => gate1MetricsApi.getMetrics(cohort),
    staleTime: 30_000,
  });
}

export function useGate1Invitation(token: string | undefined) {
  return useQuery({
    queryKey: gate1InvitationKey(token ?? ''),
    queryFn: () => gate1ParticipantApi.getInvitation(token!),
    enabled: Boolean(token),
    staleTime: 0,
    retry: false,
  });
}

export function useCreateGate1Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGate1ProjectRequest) => gate1ProjectsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GATE1_PROJECTS_KEY });
    },
  });
}

export function useSubmitGate1Baseline(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitGate1BaselineRequest) =>
      gate1ProjectsApi.submitBaseline(projectId, body),
    onSuccess: () => {
      invalidateProject(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: gate1BaselineKey(projectId) });
    },
  });
}

export function useCreateGate1Invitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGate1InvitationRequest) =>
      gate1ProjectsApi.createInvitation(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1ParticipantsProgressKey(projectId) });
    },
  });
}

export function useSubmitGate1Decision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitGate1DecisionRequest) =>
      gate1AdvisorApi.submitDecision(projectId, body),
    onSuccess: () => {
      invalidateProject(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: gate1DecisionKey(projectId) });
    },
  });
}

export function useSubmitGate1Outcome(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitGate1OutcomeRequest) =>
      gate1ProjectsApi.submitOutcome(projectId, body),
    onSuccess: () => {
      invalidateProject(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: gate1OutcomeKey(projectId) });
    },
  });
}

export function useGate1ParticipantConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Gate1ConsentRequest) => gate1ParticipantApi.submitConsent(body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gate1InvitationKey(variables.inviteToken),
      });
    },
  });
}

export function useGate1ParticipantPreferences(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Gate1PreferencesRequest) =>
      gate1ParticipantApi.savePreferences(token, body),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: gate1InvitationKey(token) });
    },
  });
}

export function useGate1ParticipantWithdraw(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gate1ParticipantApi.withdraw(token),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: gate1InvitationKey(token) });
    },
  });
}

export function useGate1ParticipantFeedback(token: string) {
  return useMutation({
    mutationFn: (body: Gate1ParticipantFeedbackRequest) =>
      gate1ParticipantApi.submitFeedback(token, body),
  });
}

export function usePublishGate1ConflictReport(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      version,
      body,
    }: {
      version: number;
      body: PublishGate1OutputRequest;
    }) => gate1OpsApi.publishConflictReport(projectId, version, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
      void queryClient.invalidateQueries({ queryKey: gate1OpsQueueKey() });
    },
  });
}

export function useCreateGate1ConflictDraft(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGate1ConflictReportRequest) =>
      gate1OpsApi.createConflictReport(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1OpsQueueKey() });
    },
  });
}

export function useCreateGate1CandidateDraft(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateGate1CandidateRequest) =>
      gate1OpsApi.createCandidate(projectId, body),
  });
}

export function usePublishGate1Candidate(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      body,
    }: {
      candidateId: string;
      body: PublishGate1OutputRequest;
    }) => gate1OpsApi.publishCandidate(projectId, candidateId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
    },
  });
}

export function useCreateGate1SanitizedConstraint(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateGate1SanitizedConstraintRequest) =>
      gate1OpsApi.createSanitizedConstraint(projectId, body),
  });
}

export function useReviewGate1SanitizedConstraint(projectId: string) {
  return useMutation({
    mutationFn: ({
      constraintId,
      body,
    }: {
      constraintId: string;
      body: ReviewGate1SanitizedConstraintRequest;
    }) => gate1OpsApi.reviewSanitizedConstraint(projectId, constraintId, body),
  });
}

export function useSubmitConflictFindingFeedback() {
  return useMutation({
    mutationFn: ({
      findingId,
      body,
    }: {
      findingId: string;
      body: Gate1ConflictFindingFeedbackRequest;
    }) => gate1AdvisorApi.submitConflictFindingFeedback(findingId, body),
  });
}

export function useSubmitReadinessFindingFeedback() {
  return useMutation({
    mutationFn: ({
      findingId,
      body,
    }: {
      findingId: string;
      body: Gate1ReadinessFindingFeedbackRequest;
    }) => gate1AdvisorApi.submitReadinessFindingFeedback(findingId, body),
  });
}

export function useCreateGate1ReadinessDraft(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateGate1ReadinessReportRequest) =>
      gate1OpsApi.createReadinessReport(projectId, body),
  });
}

export function usePublishGate1Readiness(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      version,
      body,
    }: {
      version: number;
      body: PublishGate1OutputRequest;
    }) => gate1OpsApi.publishReadinessReport(projectId, version, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
    },
  });
}

export function useCreateGate1PlanBDraft(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateGate1PlanBRequest) => gate1OpsApi.createPlanB(projectId, body),
  });
}

export function usePublishGate1PlanB(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planBId,
      body,
    }: {
      planBId: string;
      body: PublishGate1OutputRequest;
    }) => gate1OpsApi.publishPlanB(projectId, planBId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
    },
  });
}

export function useCreateGate1TravelEvent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGate1TravelEventRequest) =>
      gate1ProjectsApi.createTravelEvent(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1OutcomeKey(projectId) });
    },
  });
}

export function useCreateGate1WorkLog(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateGate1WorkLogRequest) =>
      gate1ProjectsApi.createWorkLog(projectId, body),
  });
}

export function useSubmitPlanBPreDecision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planBId,
      body,
    }: {
      planBId: string;
      body: Gate1PlanBPreDecisionRequest;
    }) => gate1AdvisorApi.submitPlanBPreDecision(planBId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
    },
  });
}

export function useSubmitPlanBOutcome(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planBId,
      body,
    }: {
      planBId: string;
      body: Gate1PlanBOutcomeRequest;
    }) => gate1AdvisorApi.submitPlanBOutcome(projectId, planBId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
      void queryClient.invalidateQueries({ queryKey: gate1OutcomeKey(projectId) });
    },
  });
}

export function useSubmitReadinessFindingFeedbackWithRefresh(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      findingId,
      body,
    }: {
      findingId: string;
      body: Gate1ReadinessFindingFeedbackRequest;
    }) => gate1AdvisorApi.submitReadinessFindingFeedback(findingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
    },
  });
}

export function useRemindGate1Participant(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) =>
      gate1AdvisorApi.remindParticipant(projectId, participantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1ParticipantsProgressKey(projectId) });
    },
  });
}

export function useSubmitConflictFindingAction(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      findingId,
      body,
    }: {
      findingId: string;
      body: Gate1ConflictFindingActionRequest;
    }) => gate1AdvisorApi.submitConflictFindingAction(findingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
      invalidateAdvisorSurface(queryClient, projectId);
    },
  });
}

export function useCreateAdvisorStrategy(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGate1AdvisorStrategyRequest) =>
      gate1AdvisorApi.createStrategy(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gate1AdvisorOutputsKey(projectId) });
      invalidateAdvisorSurface(queryClient, projectId);
    },
  });
}

export function usePatchGate1ProjectStatus(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchGate1ProjectStatusRequest) =>
      gate1ProjectsApi.patchStatus(projectId, body),
    onSuccess: () => {
      invalidateProject(queryClient, projectId);
    },
  });
}
