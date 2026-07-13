import { useCallback, useEffect, useRef, useState } from 'react';
import { constraintConsoleApi } from '@/api/constraint-console';
import { TripConstraintsApiError } from '@/api/trip-constraints';
import { isPreviewImpactRecoverableServerError } from '@/lib/constraint-impact-preview-fallback.util';
import type { ConstraintEditorDraft, ConstraintImpactPreview } from '@/components/plan-studio/workbench/constraint-console-types';

function formatPreviewImpactError(err: unknown): string {
  if (err instanceof TripConstraintsApiError) {
    if (isPreviewImpactRecoverableServerError(err)) {
      return '预览计算暂时失败，已尝试使用验证快照；若仍无结果请保存后完整检查';
    }
    return err.message;
  }
  const message = err instanceof Error ? err.message : '预览计算失败';
  if (/reading 'find'/i.test(message)) {
    return '预览服务内部错误，请稍后重试或保存后运行完整检查';
  }
  return message;
}

export type ConstraintPreviewSource = 'idle' | 'bff' | 'assessment' | 'unavailable' | 'error';

export interface UseConstraintImpactPreviewOptions {
  tripId: string;
  draft: ConstraintEditorDraft | null;
  trip?: import('@/types/trip').TripDetail | null;
  debounceMs?: number;
  constraintsVersion?: number;
  assessments?: import('@/types/frontend-constraint-assessment-api.types').UnifiedConstraintAssessmentBundle | null;
  feasibilityScore?: number | null;
  apiConstraint?: import('@/types/trip-constraints').TripConstraint | null;
}

export interface UseConstraintImpactPreviewResult {
  preview: ConstraintImpactPreview | null;
  loading: boolean;
  source: ConstraintPreviewSource;
  error: string | null;
  retry: () => void;
}

export function useConstraintImpactPreview({
  tripId,
  draft,
  trip,
  debounceMs = 400,
  constraintsVersion,
  assessments,
  feasibilityScore,
  apiConstraint,
}: UseConstraintImpactPreviewOptions): UseConstraintImpactPreviewResult {
  const [preview, setPreview] = useState<ConstraintImpactPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<ConstraintPreviewSource>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!draft) {
      setPreview(null);
      setLoading(false);
      setSource('idle');
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await constraintConsoleApi.previewImpact(
            tripId,
            {
              constraintId: draft.id,
              draft,
            },
            { constraintsVersion, trip, assessments, feasibilityScore, apiConstraint },
          );
          if (requestIdRef.current !== requestId) return;
          if (result) {
            setPreview(result.preview);
            setSource(result.source);
            setError(null);
          } else {
            setPreview(null);
            setSource('unavailable');
            setError('预览服务暂不可用，请确认后端已启用 preview-impact 接口');
          }
        } catch (err) {
          if (requestIdRef.current !== requestId) return;
          setPreview(null);
          setSource('error');
          setError(formatPreviewImpactError(err));
        } finally {
          if (requestIdRef.current === requestId) setLoading(false);
        }
      })();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [tripId, draft, trip, debounceMs, retryToken, constraintsVersion, assessments, feasibilityScore, apiConstraint]);

  return { preview, loading, source, error, retry };
}
