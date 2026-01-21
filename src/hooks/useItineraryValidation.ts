/**
 * 行程项校验 Hook
 * 
 * 提供行程项校验相关的功能，包括：
 * - 预校验行程项
 * - 批量校验行程
 * - 处理校验结果和错误
 */

import { useState, useCallback } from 'react';
import { itineraryItemsApi } from '@/api/trips';
import type {
  CreateItineraryItemRequest,
  ValidateItineraryItemResponse,
  BatchValidateItineraryResponse,
  ValidationResult,
  TravelInfo,
  CascadeImpact,
} from '@/types/trip';

export interface UseItineraryValidationReturn {
  // 预校验
  validating: boolean;
  validateError: string | null;
  validate: (data: CreateItineraryItemRequest) => Promise<ValidateItineraryItemResponse | null>;
  
  // 批量校验
  batchValidating: boolean;
  batchValidateError: string | null;
  batchValidate: (tripId: string, dates?: string[]) => Promise<BatchValidateItineraryResponse | null>;
  
  // 重置错误
  resetErrors: () => void;
}

/**
 * 行程项校验 Hook
 */
export function useItineraryValidation(): UseItineraryValidationReturn {
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [batchValidating, setBatchValidating] = useState(false);
  const [batchValidateError, setBatchValidateError] = useState<string | null>(null);

  /**
   * 预校验行程项
   */
  const validate = useCallback(async (
    data: CreateItineraryItemRequest
  ): Promise<ValidateItineraryItemResponse | null> => {
    try {
      setValidating(true);
      setValidateError(null);
      
      const result = await itineraryItemsApi.validate(data);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '校验失败，请稍后重试';
      setValidateError(errorMessage);
      console.error('[Itinerary Validation] 预校验失败:', error);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  /**
   * 批量校验行程
   */
  const batchValidate = useCallback(async (
    tripId: string,
    dates?: string[]
  ): Promise<BatchValidateItineraryResponse | null> => {
    try {
      setBatchValidating(true);
      setBatchValidateError(null);
      
      const result = await itineraryItemsApi.batchValidate(tripId, dates ? { dates } : undefined);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '批量校验失败，请稍后重试';
      setBatchValidateError(errorMessage);
      console.error('[Itinerary Validation] 批量校验失败:', error);
      return null;
    } finally {
      setBatchValidating(false);
    }
  }, []);

  /**
   * 重置所有错误
   */
  const resetErrors = useCallback(() => {
    setValidateError(null);
    setBatchValidateError(null);
  }, []);

  return {
    validating,
    validateError,
    validate,
    batchValidating,
    batchValidateError,
    batchValidate,
    resetErrors,
  };
}

/**
 * 格式化校验错误消息
 */
export function formatValidationError(
  errors: ValidationResult[],
  warnings?: ValidationResult[]
): string {
  if (errors.length === 0 && (!warnings || warnings.length === 0)) {
    return '';
  }

  const errorMessages = errors.map(e => e.message);
  const warningMessages = warnings?.map(w => w.message) || [];

  const allMessages = [...errorMessages, ...warningMessages];
  
  if (allMessages.length === 1) {
    return allMessages[0];
  }

  return allMessages.join('\n');
}

/**
 * 获取校验建议的摘要
 */
export function getValidationSuggestionsSummary(
  errors: ValidationResult[],
  warnings?: ValidationResult[]
): string[] {
  const suggestions: string[] = [];
  
  [...errors, ...(warnings || [])].forEach(result => {
    if (result.suggestions && result.suggestions.length > 0) {
      result.suggestions.forEach(suggestion => {
        if (suggestion.description) {
          suggestions.push(suggestion.description);
        }
      });
    }
  });

  return suggestions;
}
