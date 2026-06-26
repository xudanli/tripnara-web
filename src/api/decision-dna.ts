/**
 * Decision DNA · 用户 consent
 * GET/PUT /users/me/decision-dna/consent
 */

import apiClient from './client';
import { unwrapApiData } from '@/lib/api-response';
import type {
  DecisionDnaConsentStatus,
  UpdateDecisionDnaConsentRequest,
} from '@/types/decision-os';

export const decisionDnaApi = {
  getConsent: async (): Promise<DecisionDnaConsentStatus> => {
    const response = await apiClient.get('/users/me/decision-dna/consent');
    return unwrapApiData<DecisionDnaConsentStatus>(response.data);
  },

  updateConsent: async (
    body: UpdateDecisionDnaConsentRequest,
  ): Promise<DecisionDnaConsentStatus> => {
    const response = await apiClient.put('/users/me/decision-dna/consent', body);
    return unwrapApiData<DecisionDnaConsentStatus>(response.data);
  },
};
