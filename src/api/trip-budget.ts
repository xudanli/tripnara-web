import apiClient from './client';
import { tripsApi, itineraryItemsApi } from './trips';
import type {
  PutBudgetStructureRequest,
  PutPaymentRuleRequest,
  PutTripBudgetIntentRequest,
  TripBudgetIntent,
  TripBudgetProfile,
  BudgetStructure,
  WalletBalances,
  TravelWallet,
  CreateLedgerEntryRequest,
  LedgerEntry,
  LedgerListResponse,
} from '@/types/trip-budget';
import {
  buildBudgetStructure,
  computeStructureVsActual,
  costSummaryToBreakdown,
  intentFromConstraint,
  loadBudgetStructureLocal,
  saveBudgetStructureLocal,
  sumAllocations,
  validateStructureSum,
} from '@/lib/trip-budget-structure';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw Object.assign(new Error(err.error?.message ?? '请求失败'), {
      code: err.error?.code,
      details: err.error?.details,
    });
  }
  return response.data.data;
}

function isNotFound(err: unknown): boolean {
  return (
    (err as { response?: { status?: number } })?.response?.status === 404 ||
    (err as { code?: string })?.code === 'NOT_FOUND'
  );
}

async function buildProfileFromFallback(tripId: string): Promise<TripBudgetProfile> {
  let intent: TripBudgetIntent | null = null;
  let currency = 'CNY';

  try {
    const constraintRes = await tripsApi.getBudgetConstraint(tripId);
    const c = constraintRes.budgetConstraint;
    currency = c.currency ?? 'CNY';
    intent = intentFromConstraint(c.total, currency);
    if (intent) intent.source = 'user';
  } catch {
    try {
      const trip = await tripsApi.getById(tripId);
      const total = trip.totalBudget ?? trip.budgetConfig?.totalBudget;
      currency = trip.budgetConfig?.currency ?? 'CNY';
      intent = intentFromConstraint(total, currency);
    } catch {
      /* noop */
    }
  }

  const structure = loadBudgetStructureLocal(tripId);

  let actuals: TripBudgetProfile['actuals'];
  try {
    const summary = await itineraryItemsApi.getCostSummary(tripId);
    actuals = {
      totalEstimated: summary.totalEstimated,
      totalActual: summary.totalActual,
      currency: summary.currency ?? currency,
      categoryBreakdown: costSummaryToBreakdown(summary),
      unpaidCount: summary.totalUnpaid ?? 0,
      budgetUsagePercent: intent?.total
        ? (summary.totalEstimated / intent.total) * 100
        : summary.budgetUsagePercent,
    };
  } catch {
    actuals = undefined;
  }

  let structureVsActual;
  if (structure && actuals) {
    try {
      const summary = await itineraryItemsApi.getCostSummary(tripId);
      structureVsActual = computeStructureVsActual(structure, summary);
    } catch {
      structureVsActual = undefined;
    }
  }

  return {
    tripId,
    intent,
    structure,
    actuals,
    structureVsActual,
    updatedAt: new Date().toISOString(),
  };
}

export const tripBudgetApi = {
  /**
   * GET /trips/:tripId/budget/profile
   * 404 时回退 constraint + localStorage + cost-summary
   */
  getProfile: async (
    tripId: string,
    options?: { includeActuals?: boolean },
  ): Promise<TripBudgetProfile> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<TripBudgetProfile>>(
        `/trips/${tripId}/budget/profile`,
        { params: { include: 'actuals,wallet,value' } },
      );
      const profile = handleResponse(response);
      if (profile.structure) saveBudgetStructureLocal(tripId, profile.structure);
      return profile;
    } catch (err) {
      if (!isNotFound(err)) {
        console.warn('[tripBudgetApi] profile fallback:', err);
      }
      return buildProfileFromFallback(tripId);
    }
  },

  /**
   * PUT /trips/:tripId/budget/intent
   * 回退 POST /trips/:id/budget/constraint
   */
  putIntent: async (tripId: string, body: PutTripBudgetIntentRequest): Promise<TripBudgetIntent> => {
    const localStructure = loadBudgetStructureLocal(tripId);
    if (localStructure && sumAllocations(localStructure.allocations) > body.total + 1) {
      const err = Object.assign(new Error('分类结构总和超过新总预算'), {
        code: 'STRUCTURE_OVERFLOW',
        details: {
          structureTotal: sumAllocations(localStructure.allocations),
          newTotal: body.total,
        },
      });
      throw err;
    }

    try {
      const response = await apiClient.put<ApiResponseWrapper<TripBudgetIntent>>(
        `/trips/${tripId}/budget/intent`,
        body,
      );
      return handleResponse(response);
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }

    await tripsApi.setBudgetConstraint(tripId, {
      total: body.total,
      currency: body.currency ?? 'CNY',
      dailyBudget: body.dailyBudget ?? undefined,
    });

    const intent: TripBudgetIntent = {
      total: body.total,
      currency: body.currency ?? 'CNY',
      dailyBudget: body.dailyBudget ?? undefined,
      source: 'user',
      setAt: new Date().toISOString(),
    };
    return intent;
  },

  /**
   * PUT /trips/:tripId/budget/structure
   * 回退 localStorage
   */
  putStructure: async (
    tripId: string,
    body: PutBudgetStructureRequest,
    intentTotal: number,
  ): Promise<BudgetStructure> => {
    const structure = buildBudgetStructure(body.mode, body, intentTotal);
    if (!validateStructureSum(structure.allocations, intentTotal)) {
      throw new Error('分类分配总和必须等于总预算');
    }

    try {
      const response = await apiClient.put<ApiResponseWrapper<BudgetStructure>>(
        `/trips/${tripId}/budget/structure`,
        body,
      );
      const saved = handleResponse(response);
      saveBudgetStructureLocal(tripId, saved);
      return saved;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }

    saveBudgetStructureLocal(tripId, structure);
    return structure;
  },

  putWalletRule: async (tripId: string, body: PutPaymentRuleRequest): Promise<TravelWallet> => {
    const response = await apiClient.put<ApiResponseWrapper<TravelWallet>>(
      `/trips/${tripId}/budget/wallet/rule`,
      body,
    );
    return handleResponse(response);
  },

  getWalletBalances: async (tripId: string): Promise<WalletBalances> => {
    const response = await apiClient.get<ApiResponseWrapper<WalletBalances>>(
      `/trips/${tripId}/budget/wallet/balances`,
    );
    return handleResponse(response);
  },

  postLedgerEntry: async (tripId: string, body: CreateLedgerEntryRequest): Promise<LedgerEntry> => {
    const response = await apiClient.post<ApiResponseWrapper<LedgerEntry>>(
      `/trips/${tripId}/budget/wallet/ledger`,
      body,
    );
    return handleResponse(response);
  },

  getLedgerEntries: async (
    tripId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<LedgerListResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<LedgerListResponse>>(
        `/trips/${tripId}/budget/wallet/ledger`,
        { params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 } },
      );
      return handleResponse(response);
    } catch (err) {
      if (isNotFound(err)) {
        return { items: [], total: 0, limit: params?.limit ?? 50, offset: 0 };
      }
      throw err;
    }
  },
};
