/**
 * Memory Console REST API（JWT Bearer via apiClient）
 */
import apiClient from '@/api/client';
import type {
  MemoryConsoleV1Response,
  MemoryExportV1Response,
  PatchMemoryConsoleL1Body,
} from '@/features/memory/types/memory-console.v1';

const BASE = '/agent/memory/v1';

export const memoryConsoleApi = {
  getConsole: async (tripId?: string | null): Promise<MemoryConsoleV1Response> => {
    const { data } = await apiClient.get<MemoryConsoleV1Response>(`${BASE}/console`, {
      params: tripId ? { trip_id: tripId } : undefined,
    });
    return data;
  },

  patchL1: async (body: PatchMemoryConsoleL1Body): Promise<MemoryConsoleV1Response> => {
    const { data } = await apiClient.patch<MemoryConsoleV1Response>(`${BASE}/console/l1`, body);
    return data;
  },

  deleteL1: async (): Promise<void> => {
    await apiClient.delete(`${BASE}/console/l1`);
  },

  deleteL0Field: async (fieldKey: string): Promise<MemoryConsoleV1Response> => {
    const { data } = await apiClient.delete<MemoryConsoleV1Response>(
      `${BASE}/console/l0/${encodeURIComponent(fieldKey)}`
    );
    return data;
  },

  deleteL2Decision: async (decisionId: string): Promise<MemoryConsoleV1Response> => {
    const { data } = await apiClient.delete<MemoryConsoleV1Response>(
      `${BASE}/console/l2/${encodeURIComponent(decisionId)}`
    );
    return data;
  },

  deleteTripConstraintPatch: async (tripId: string, patchId: string): Promise<MemoryConsoleV1Response> => {
    const { data } = await apiClient.delete<MemoryConsoleV1Response>(
      `${BASE}/console/trip/${encodeURIComponent(tripId)}/constraints/${encodeURIComponent(patchId)}`
    );
    return data;
  },

  exportGdpr: async (): Promise<MemoryExportV1Response> => {
    const { data } = await apiClient.get<MemoryExportV1Response>(`${BASE}/export`);
    return data;
  },
};
