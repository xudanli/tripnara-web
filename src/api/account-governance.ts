/**
 * 账号治理 API
 * 对接 GET /identity/account/overview（兼容旧 /account/capabilities）
 * @see docs/api/identity-governance-api.md
 */

import apiClient from './client';
import { identityGovernanceApi, isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import { unwrapApiData } from '@/lib/api-response';
import { buildMockAccountCapabilities } from '@/lib/account-governance-mock';
import { finalizeAccountCapabilities } from '@/lib/account-governance';
import {
  normalizeAccountCapabilities,
  normalizeAccountOverview,
} from '@/lib/normalize-account-governance';
import type { AccountCapabilities } from '@/types/account-governance';
import type { User } from './user';

const LEGACY_PATH = '/account/capabilities';

export class AccountGovernanceApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AccountGovernanceApiError';
  }
}

function normalizeOverviewPayload(raw: unknown, userId?: string): AccountCapabilities | null {
  return normalizeAccountOverview(raw, userId) ?? normalizeAccountCapabilities(raw, userId);
}

export const accountGovernanceApi = {
  getCapabilities: async (user?: User | null): Promise<AccountCapabilities> => {
    const fallbackUserId = user?.id ?? '';

    try {
      const overview = await identityGovernanceApi.getAccountOverview();
      const normalized = normalizeOverviewPayload(overview, fallbackUserId);
      if (normalized) return finalizeAccountCapabilities(normalized);
      throw new AccountGovernanceApiError('INVALID_RESPONSE', '账号概览响应格式无效');
    } catch (error) {
      if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
        try {
          const response = await apiClient.get(LEGACY_PATH);
          const legacy = normalizeOverviewPayload(
            unwrapApiData(response.data),
            fallbackUserId
          );
          if (legacy) return finalizeAccountCapabilities(legacy);
        } catch {
          /* fall through to mock */
        }
        return finalizeAccountCapabilities(buildMockAccountCapabilities(user));
      }
      if (error instanceof AccountGovernanceApiError) throw error;
      throw new AccountGovernanceApiError(
        'REQUEST_ERROR',
        error instanceof Error ? error.message : '获取账号能力失败'
      );
    }
  },
};
