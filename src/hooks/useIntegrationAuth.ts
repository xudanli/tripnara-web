import { useState, useEffect, useCallback } from 'react';
import {
  integrationsApi,
  type IntegrationService,
  type IntegrationAuth,
  type AuthStatus,
  IntegrationApiError,
} from '@/api/integrations';
import { useAuth } from './useAuth';

/**
 * 集成授权 Hook
 * 提供获取和管理第三方集成授权的功能
 */
export const useIntegrationAuth = (
  service: IntegrationService,
  autoFetch = true
) => {
  const { isAuthenticated } = useAuth();
  const [auth, setAuth] = useState<IntegrationAuth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  /**
   * 获取授权状态
   */
  const fetchAuthStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setError(null);
      setAuth(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await integrationsApi.getAuthStatus(service);
      setAuth(data);
    } catch (err) {
      if (err instanceof IntegrationApiError) {
        if (err.code === 'UNAUTHORIZED') {
          setError('未认证，请重新登录');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : '获取授权状态失败');
      }
      // 如果获取失败，设置为未授权状态
      setAuth({
        service,
        status: 'unauthorized',
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, service]);

  /**
   * 启动授权流程
   */
  const authorize = useCallback(async () => {
    try {
      setAuthorizing(true);
      setError(null);

      // 获取授权 URL
      const { authUrl, status, state } = await integrationsApi.getAuthUrl(service);

      // 已授权或 authUrl 为空时，立即乐观更新，再刷新状态（仅在有 authorized 时覆盖）
      if (status === 'authorized' || !authUrl) {
        setAuth((prev) => (prev ? { ...prev, status: 'authorized' as const } : { service, status: 'authorized' }));
        try {
          const data = await integrationsApi.getAuthStatus(service);
          if (data.status === 'authorized') setAuth({ ...data, service });
        } catch {
          // 保持乐观状态
        }
        return;
      }

      // 打开授权页面
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authUrl,
        'oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        throw new Error('无法打开授权窗口，请检查浏览器弹窗设置');
      }

      // 监听授权窗口关闭
      return new Promise<void>((resolve, reject) => {
        const checkClosed = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // 立即乐观更新：用户关闭授权窗口，视为授权完成，确保 UI 马上显示「已连接」
            setAuth((prev) => (prev ? { ...prev, status: 'authorized' as const } : { service, status: 'authorized' }));
            try {
              await new Promise((r) => setTimeout(r, 1500));
              if (state) {
                try {
                  await integrationsApi.verifyAuth(service, undefined, state);
                } catch {
                  // verify 失败不阻塞，已做乐观更新
                }
              }
              // 后台刷新完整状态，仅在有 authorized 时覆盖
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  const data = await integrationsApi.getAuthStatus(service);
                  if (data.status === 'authorized') {
                    setAuth({ ...data, service });
                    break;
                  }
                } catch {
                  // 忽略单次失败，继续重试
                }
                if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          }
        }, 500);

        // 超时处理
        setTimeout(() => {
          clearInterval(checkClosed);
          if (!authWindow.closed) {
            authWindow.close();
            reject(new Error('授权超时，请重试'));
          }
        }, 300000); // 5分钟超时
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '授权失败';
      // 后端已授权时，auth/url 会返回「已经完成授权,无需再次授权」——视为成功，刷新状态
      if (message.includes('已经完成授权') || message.includes('无需再次授权')) {
        setError(null);
        await fetchAuthStatus();
        return;
      }
      if (err instanceof IntegrationApiError) {
        setError(err.message);
      } else {
        setError(message);
      }
      throw err;
    } finally {
      setAuthorizing(false);
    }
  }, [service, fetchAuthStatus]);

  /**
   * 撤销授权
   */
  const revoke = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await integrationsApi.revokeAuth(service);
      setAuth({
        service,
        status: 'unauthorized',
      });
    } catch (err) {
      if (err instanceof IntegrationApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : '撤销授权失败');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 自动获取授权状态
   */
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchAuthStatus();
    }
  }, [autoFetch, isAuthenticated, fetchAuthStatus]);

  return {
    auth,
    status: auth?.status || 'unauthorized',
    loading,
    error,
    authorizing,
    isAuthorized: auth?.status === 'authorized',
    fetchAuthStatus,
    authorize,
    revoke,
    clearError,
  };
};

/**
 * 批量获取所有集成授权状态的 Hook
 */
export const useAllIntegrationAuths = (autoFetch = true) => {
  const { isAuthenticated } = useAuth();
  const [auths, setAuths] = useState<IntegrationAuth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAuths = useCallback(async () => {
    if (!isAuthenticated) {
      setError(null);
      setAuths([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await integrationsApi.getAllAuthStatuses();
      setAuths(data);
    } catch (err) {
      if (err instanceof IntegrationApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : '获取授权状态失败');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchAllAuths();
    }
  }, [autoFetch, isAuthenticated, fetchAllAuths]);

  return {
    auths,
    loading,
    error,
    fetchAllAuths,
  };
};
