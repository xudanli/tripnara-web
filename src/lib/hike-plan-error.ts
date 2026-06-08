import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { HikePlanAuthRequiredError, isHikePlanAuthError } from '@/lib/hike-plan-storage';

export function handleHikePlanError(
  err: unknown,
  navigate?: NavigateFunction
): boolean {
  if (err instanceof HikePlanAuthRequiredError || isHikePlanAuthError(err)) {
    toast.error(err instanceof Error ? err.message : '请先登录后再使用云端徒步计划');
    navigate?.('/login');
    return true;
  }
  return false;
}
