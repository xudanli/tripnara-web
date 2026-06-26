import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyRuleTemplateToListing, projectFitApi } from '@/api/project-fit';
import { trustedProjectsApi } from '@/api/trusted-projects';
import type {
  ApplyRuleTemplateRequest,
  ClarifyApplicationRequest,
  FitAssessmentAnswer,
  FitDocumentType,
  FitQuestionnairePhase,
  FitReportRole,
  LeaderApplicationDecisionRequest,
  ManagedApplicationsQuery,
  MineApplicationsQuery,
  SubmitProjectFitAppealRequest,
  UpdateFitConfigRequest,
} from '@/types/project-fit';

export function mineApplicationsQueryKey(query?: MineApplicationsQuery) {
  return ['project-fit', 'applications', 'mine', query] as const;
}

export function managedApplicationsQueryKey(query?: ManagedApplicationsQuery) {
  return ['project-fit', 'applications', 'managed', query] as const;
}

export function ruleTemplatesQueryKey(organizationId?: string) {
  return ['project-fit', 'rule-templates', organizationId ?? 'platform'] as const;
}

export function fitDocumentsQueryKey(assessmentId: string) {
  return ['project-fit', 'assessment', assessmentId, 'documents'] as const;
}

export function eligibilityRulesQueryKey(listingId: string) {
  return ['trusted-projects', listingId, 'eligibility-rules'] as const;
}

export function fitQuestionnaireQueryKey(listingId: string, phase: FitQuestionnairePhase) {
  return ['trusted-projects', listingId, 'fit-questionnaire', phase] as const;
}

export function fitAssessmentStatusQueryKey(listingId: string) {
  return ['trusted-projects', listingId, 'fit-assessment-status'] as const;
}

export function fitConfigQueryKey(listingId: string) {
  return ['trusted-projects', listingId, 'fit-config'] as const;
}

export function reviewQueueQueryKey(listingId: string) {
  return ['trusted-projects', listingId, 'review-queue'] as const;
}

export function fitAssessmentQueryKey(assessmentId: string) {
  return ['project-fit', 'assessment', assessmentId] as const;
}

export function fitReportQueryKey(assessmentId: string, role: FitReportRole) {
  return ['project-fit', 'report', assessmentId, role] as const;
}

export function projectFitApplicationQueryKey(applicationId: string) {
  return ['project-fit', 'application', applicationId] as const;
}

export function useMyProjectFitApplications(query?: MineApplicationsQuery) {
  return useQuery({
    queryKey: mineApplicationsQueryKey(query),
    queryFn: () => projectFitApi.listMyApplications(query),
    staleTime: 15_000,
  });
}

export function useManagedProjectFitApplications(query?: ManagedApplicationsQuery) {
  return useQuery({
    queryKey: managedApplicationsQueryKey(query),
    queryFn: () => projectFitApi.listManagedApplications(query),
    staleTime: 15_000,
  });
}

export function useRuleTemplates(organizationId?: string) {
  return useQuery({
    queryKey: ruleTemplatesQueryKey(organizationId),
    queryFn: () => projectFitApi.listRuleTemplates(organizationId),
    staleTime: 60_000,
  });
}

export function useApplyRuleTemplate(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyRuleTemplateRequest) => applyRuleTemplateToListing(listingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eligibilityRulesQueryKey(listingId) });
      void queryClient.invalidateQueries({ queryKey: fitConfigQueryKey(listingId) });
      void queryClient.invalidateQueries({ queryKey: fitAssessmentStatusQueryKey(listingId) });
      void queryClient.invalidateQueries({ queryKey: ['trusted-projects', listingId, 'fit-questionnaire'] });
    },
  });
}

export function useFitAssessmentDocuments(assessmentId: string | undefined) {
  return useQuery({
    queryKey: fitDocumentsQueryKey(assessmentId ?? ''),
    queryFn: () => projectFitApi.listAssessmentDocuments(assessmentId!),
    enabled: Boolean(assessmentId),
    staleTime: 10_000,
  });
}

export function useUploadFitDocument(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      file: File;
      documentType: FitDocumentType;
      linkedQuestionKey?: string;
    }) =>
      projectFitApi.uploadAssessmentDocument(
        assessmentId,
        params.file,
        params.documentType,
        { linkedQuestionKey: params.linkedQuestionKey }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fitDocumentsQueryKey(assessmentId) });
    },
  });
}

export function useMarkDepositPaid(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectFitApi.markDepositPaid(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectFitApplicationQueryKey(applicationId),
      });
      void queryClient.invalidateQueries({ queryKey: ['project-fit', 'applications'] });
    },
  });
}

export function useEligibilityRules(listingId: string | undefined) {
  return useQuery({
    queryKey: eligibilityRulesQueryKey(listingId ?? ''),
    queryFn: () => trustedProjectsApi.getEligibilityRules(listingId!),
    enabled: Boolean(listingId),
    staleTime: 60_000,
  });
}

export function useFitQuestionnaire(
  listingId: string | undefined,
  phase: FitQuestionnairePhase = 'full'
) {
  return useQuery({
    queryKey: fitQuestionnaireQueryKey(listingId ?? '', phase),
    queryFn: () => trustedProjectsApi.getFitQuestionnaire(listingId!, phase),
    enabled: Boolean(listingId),
    staleTime: 60_000,
  });
}

export function useFitAssessmentStatus(listingId: string | undefined) {
  return useQuery({
    queryKey: fitAssessmentStatusQueryKey(listingId ?? ''),
    queryFn: () => trustedProjectsApi.getFitAssessmentStatus(listingId!),
    enabled: Boolean(listingId),
    staleTime: 30_000,
  });
}

export function useFitConfig(listingId: string | undefined) {
  return useQuery({
    queryKey: fitConfigQueryKey(listingId ?? ''),
    queryFn: () => trustedProjectsApi.getFitConfig(listingId!),
    enabled: Boolean(listingId),
    staleTime: 60_000,
  });
}

export function useUpdateFitConfig(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFitConfigRequest) =>
      trustedProjectsApi.updateFitConfig(listingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fitConfigQueryKey(listingId) });
      void queryClient.invalidateQueries({ queryKey: eligibilityRulesQueryKey(listingId) });
      void queryClient.invalidateQueries({ queryKey: ['trusted-projects', listingId, 'fit-questionnaire'] });
      void queryClient.invalidateQueries({ queryKey: fitAssessmentStatusQueryKey(listingId) });
    },
  });
}

export function useApplicationReviewQueue(listingId: string | undefined) {
  return useQuery({
    queryKey: reviewQueueQueryKey(listingId ?? ''),
    queryFn: () => trustedProjectsApi.getApplicationReviewQueue(listingId!),
    enabled: Boolean(listingId),
    staleTime: 15_000,
  });
}

export function useFitAssessmentReport(
  assessmentId: string | undefined,
  role: FitReportRole = 'applicant'
) {
  return useQuery({
    queryKey: fitReportQueryKey(assessmentId ?? '', role),
    queryFn: () => projectFitApi.getAssessmentReport(assessmentId!, role),
    enabled: Boolean(assessmentId),
    staleTime: 30_000,
  });
}

export function useProjectFitApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: projectFitApplicationQueryKey(applicationId ?? ''),
    queryFn: () => projectFitApi.getApplication(applicationId!),
    enabled: Boolean(applicationId),
    staleTime: 15_000,
  });
}

export function useStartFitAssessment(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => trustedProjectsApi.startFitAssessment(listingId),
    onSuccess: (data) => {
      queryClient.setQueryData(fitAssessmentQueryKey(data.id), data);
      void queryClient.invalidateQueries({ queryKey: fitAssessmentStatusQueryKey(listingId) });
    },
  });
}

export function useSaveFitAnswers(assessmentId: string) {
  return useMutation({
    mutationFn: (answers: FitAssessmentAnswer[]) =>
      projectFitApi.saveAssessmentAnswers(assessmentId, answers),
  });
}

export function useEvaluateFitAssessment(assessmentId: string, listingId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectFitApi.evaluateAssessment(assessmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: fitReportQueryKey(assessmentId, 'applicant'),
      });
      if (listingId) {
        void queryClient.invalidateQueries({ queryKey: fitAssessmentStatusQueryKey(listingId) });
      }
    },
  });
}

export function useSubmitApplicationWithFit(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { fitAssessmentId: string; message?: string }) =>
      trustedProjectsApi.submitApplicationWithFit(listingId, {
        fitAssessmentId: params.fitAssessmentId,
        message: params.message,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey(listingId) });
    },
  });
}

export function useLeaderApplicationDecision(applicationId: string, listingId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LeaderApplicationDecisionRequest) =>
      projectFitApi.submitLeaderDecision(applicationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectFitApplicationQueryKey(applicationId),
      });
      if (listingId) {
        void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey(listingId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['project-fit', 'applications'] });
    },
  });
}

export function useConfirmProjectFitApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectFitApi.confirmApplication(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectFitApplicationQueryKey(applicationId),
      });
      void queryClient.invalidateQueries({ queryKey: ['project-fit', 'applications'] });
    },
  });
}

export function useClarifyProjectFitApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClarifyApplicationRequest) =>
      projectFitApi.clarifyApplication(applicationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectFitApplicationQueryKey(applicationId),
      });
    },
  });
}

export function useSubmitProjectFitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitProjectFitAppealRequest) => projectFitApi.submitAppeal(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-fit', 'appeals', 'mine'] });
    },
  });
}

export function useMyProjectFitAppeals() {
  return useQuery({
    queryKey: ['project-fit', 'appeals', 'mine'] as const,
    queryFn: () => projectFitApi.listMyAppeals(),
    staleTime: 60_000,
  });
}
