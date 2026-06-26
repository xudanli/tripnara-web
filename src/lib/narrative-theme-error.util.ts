import { NarrativeThemeApiError } from '@/api/narrative-engine';
import { NARRATIVE_THEME_ERROR_CODES } from '@/types/narrative-engine';

export function resolveNarrativeThemeErrorMessage(error: unknown): string {
  if (error instanceof NarrativeThemeApiError) {
    switch (error.code) {
      case NARRATIVE_THEME_ERROR_CODES.DISABLED:
        return '叙事主题功能暂未开放';
      case NARRATIVE_THEME_ERROR_CODES.TRIP_NOT_FOUND:
        return '行程不存在或无权访问';
      case NARRATIVE_THEME_ERROR_CODES.REGENERATE_LIMIT:
        return '换一批次数已达上限（最多 3 次）';
      case NARRATIVE_THEME_ERROR_CODES.GENERATION_FAILED:
        return '主题生成失败，请稍后重试';
      case NARRATIVE_THEME_ERROR_CODES.THEME_NOT_FOUND:
        return '所选主题已失效，请重新生成候选';
      case NARRATIVE_THEME_ERROR_CODES.GENERATION_EXPIRED:
        return '主题候选已过期，请重新填写';
      default:
        return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '叙事主题操作失败，请重试';
}

export function isNarrativeRegenerateLimitError(error: unknown): boolean {
  return (
    error instanceof NarrativeThemeApiError &&
    error.code === NARRATIVE_THEME_ERROR_CODES.REGENERATE_LIMIT
  );
}

export function isNarrativeFeatureDisabledError(error: unknown): boolean {
  return (
    error instanceof NarrativeThemeApiError &&
    error.code === NARRATIVE_THEME_ERROR_CODES.DISABLED
  );
}
