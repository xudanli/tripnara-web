import { useState, useEffect, useCallback } from 'react';
import { userApi, type UserProfile, type UserPreferences, UserProfileApiError } from '@/api/user';
import { useAuth } from './useAuth';

/**
 * 用户偏好 Hook
 * 提供获取和更新用户偏好的功能
 */
export const useUserPreferences = (autoFetch = true) => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  /**
   * 获取用户偏好
   */
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setError(null);
      setProfile(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getProfile();
      setProfile(data);
    } catch (err) {
      if (err instanceof UserProfileApiError) {
        if (err.code === 'UNAUTHORIZED') {
          setError('未认证，请重新登录');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : '获取用户偏好失败');
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * 更新用户偏好
   */
  const updateProfile = useCallback(async (preferences: UserPreferences) => {
    try {
      setUpdating(true);
      setUpdateError(null);
      const data = await userApi.updateProfile(preferences);
      setProfile(data);
      return data;
    } catch (err) {
      if (err instanceof UserProfileApiError) {
        if (err.code === 'UNAUTHORIZED') {
          setUpdateError('未认证，请重新登录');
        } else if (err.code === 'VALIDATION_ERROR') {
          setUpdateError(err.message);
        } else {
          setUpdateError(err.message);
        }
      } else {
        setUpdateError(err instanceof Error ? err.message : '更新用户偏好失败');
      }
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  /**
   * 重置错误状态
   */
  const clearError = useCallback(() => {
    setError(null);
    setUpdateError(null);
  }, []);

  /**
   * 自动获取用户偏好（如果已认证）
   */
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchProfile();
    }
  }, [autoFetch, isAuthenticated, fetchProfile]);

  return {
    profile,
    preferences: profile?.preferences ?? undefined, // 根据接口文档，preferences 可能是 undefined
    loading,
    updating,
    error,
    updateError,
    fetchProfile,
    updateProfile,
    clearError,
    hasPreferences: profile?.preferences !== undefined && profile?.preferences !== null,
  };
};

