import { useMutation, useQueryClient } from '@tanstack/react-query';
import { odysseyIntakeApi } from '@/api/odyssey-intake';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { odysseyCredentialsMockStore } from '@/features/odyssey-intake/lib/credentials-mock-store';
import { mergeCredentialsSources } from '@/features/odyssey-intake/lib/credentials-loader';
import { CURRENT_USER_ID } from '@/features/match-square/lib/mock-data';
import type {
  OdysseyOAuthProvider,
  OdysseyVerifyEducationRequest,
} from '@/types/odyssey-intake';
import { CREDENTIALS_QUERY_KEY } from '@/features/match-square/hooks/useMyVerifiedCredentials';

function syncCredentialsCaches(
  qc: ReturnType<typeof useQueryClient>,
  data: Awaited<ReturnType<typeof odysseyCredentialsMockStore.get>>
) {
  if (!data) return;
  qc.setQueryData(CREDENTIALS_QUERY_KEY, data);
  qc.invalidateQueries({
    queryKey: ['match-square', 'user-credentials', CURRENT_USER_ID],
    refetchType: 'all',
  });
  qc.invalidateQueries({
    queryKey: ['match-square', 'user-credentials'],
    refetchType: 'inactive',
  });
}

async function mergeAfterVerify(
  result: Awaited<ReturnType<typeof odysseyIntakeApi.verifyEducation>>
) {
  const local = await odysseyCredentialsMockStore.get();
  return mergeCredentialsSources(result, local) ?? result;
}

export function useVerifyOdysseyEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OdysseyVerifyEducationRequest) =>
      mergeAfterVerify(await odysseyIntakeApi.verifyEducation(payload)),
    onSuccess: (data) => syncCredentialsCaches(qc, data),
  });
}

export function useSendWorkEmailCode() {
  return useMutation({
    mutationFn: (workEmail: string) => odysseyIntakeApi.sendWorkEmailCode(workEmail),
  });
}

export function useVerifyWorkEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { workEmail: string; code: string }) =>
      mergeAfterVerify(await odysseyIntakeApi.verifyWorkEmail(payload)),
    onSuccess: (data) => syncCredentialsCaches(qc, data),
  });
}

export function useUploadProfessionBadge() {
  return useMutation({
    mutationFn: (file: File) => odysseyIntakeApi.uploadProfessionBadge(file),
  });
}

export function useVerifyProfessionBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageToken: string) =>
      mergeAfterVerify(await odysseyIntakeApi.verifyProfessionBadge({ imageToken })),
    onSuccess: (data) => syncCredentialsCaches(qc, data),
  });
}

export function useVerifyProfessionOAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { provider: OdysseyOAuthProvider; authToken: string }) =>
      mergeAfterVerify(await odysseyIntakeApi.verifyProfessionOAuth(payload)),
    onSuccess: (data) => syncCredentialsCaches(qc, data),
  });
}

/** @deprecated 芝麻信用已下线 — 请勿在新代码中调用 */
export function useVerifyOdysseyZhima() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creditScore: number) => {
      try {
        await odysseyIntakeApi.verifyTrust({
          provider: 'zhima_credit',
          authToken: 'placeholder_auth_token',
          creditScore,
        });
        const fresh = await odysseyIntakeApi.getMyCredentials();
        const local = await odysseyCredentialsMockStore.verifyZhima(creditScore);
        return mergeCredentialsSources(fresh, local) ?? local;
      } catch (error) {
        if (!isApiNotReadyError(error)) throw error;
      }
      return odysseyCredentialsMockStore.verifyZhima(creditScore);
    },
    onSuccess: (data) => syncCredentialsCaches(qc, data),
  });
}

/** @deprecated 使用 useSendWorkEmailCode */
export const useSendWorkEmailOtp = useSendWorkEmailCode;

/** @deprecated 使用 useVerifyWorkEmail */
export function useVerifyOdysseyProfession() {
  const verify = useVerifyWorkEmail();
  return verify;
}
