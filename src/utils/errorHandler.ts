import type { ApiError } from '@/api/types';

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  const apiError = error as ApiError;
  if (apiError.message) {
    return apiError.message;
  }

  return 'An unexpected error occurred';
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

