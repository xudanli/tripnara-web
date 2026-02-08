/**
 * Airbnb Hook
 * 
 * 提供 Airbnb 搜索、详情查询、授权管理的 React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import {
  airbnbApi,
  type AirbnbSearchParams,
  type AirbnbSearchResponse,
  type AirbnbListingDetailsParams,
  type AirbnbListingDetails,
  type AirbnbAuthStatus,
} from '@/api/airbnb';

const CONNECTION_ID_KEY = 'airbnb_connection_id';

export interface UseAirbnbReturn {
  // 搜索相关
  searchResults: AirbnbSearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  search: (params: AirbnbSearchParams) => Promise<void>;

  // 详情相关
  listingDetails: AirbnbListingDetails | null;
  detailsLoading: boolean;
  detailsError: string | null;
  getListingDetails: (listingId: string, params?: AirbnbListingDetailsParams) => Promise<void>;

  // 授权相关
  authStatus: AirbnbAuthStatus | null;
  authLoading: boolean;
  authError: string | null;
  checkAuthStatus: () => Promise<void>;
  getAuthUrl: () => Promise<string | null>;
  verifyAuth: (connectionId?: string) => Promise<boolean>;
}

export function useAirbnb(): UseAirbnbReturn {
  // 搜索状态
  const [searchResults, setSearchResults] = useState<AirbnbSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 详情状态
  const [listingDetails, setListingDetails] = useState<AirbnbListingDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // 授权状态
  const [authStatus, setAuthStatus] = useState<AirbnbAuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * 搜索房源
   */
  const search = useCallback(async (params: AirbnbSearchParams) => {
    setSearchLoading(true);
    setSearchError(null);

    try {
      const results = await airbnbApi.search(params);
      setSearchResults(results);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '搜索失败';
      setSearchError(errorMessage);
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  /**
   * 获取房源详情
   */
  const getListingDetails = useCallback(async (
    listingId: string,
    params?: AirbnbListingDetailsParams
  ) => {
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const details = await airbnbApi.getListingDetails(listingId, params);
      setListingDetails(details);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '获取详情失败';
      setDetailsError(errorMessage);
      setListingDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  /**
   * 检查授权状态
   */
  const checkAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const status = await airbnbApi.getAuthStatus();
      setAuthStatus(status);
      
      // 如果已授权，保存 connectionId
      if (status.isAuthorized && status.connectionId) {
        localStorage.setItem(CONNECTION_ID_KEY, status.connectionId);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '检查授权状态失败';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * 获取授权 URL
   */
  const getAuthUrl = useCallback(async (): Promise<string | null> => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { authorizationUrl, connectionId } = await airbnbApi.getAuthUrl();
      
      // 保存 connectionId
      if (connectionId) {
        localStorage.setItem(CONNECTION_ID_KEY, connectionId);
      }

      return authorizationUrl;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '获取授权 URL 失败';
      setAuthError(errorMessage);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * 验证授权
   */
  const verifyAuth = useCallback(async (connectionId?: string): Promise<boolean> => {
    const idToVerify = connectionId || localStorage.getItem(CONNECTION_ID_KEY);
    if (!idToVerify) {
      setAuthError('未找到 connectionId');
      return false;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const result = await airbnbApi.verifyAuth(idToVerify);
      
      if (result.isAuthorized) {
        // 重新检查授权状态
        await checkAuthStatus();
      }
      
      return result.isAuthorized;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || '验证授权失败';
      setAuthError(errorMessage);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [checkAuthStatus]);

  // 初始化时检查授权状态
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // 搜索相关
    searchResults,
    searchLoading,
    searchError,
    search,

    // 详情相关
    listingDetails,
    detailsLoading,
    detailsError,
    getListingDetails,

    // 授权相关
    authStatus,
    authLoading,
    authError,
    checkAuthStatus,
    getAuthUrl,
    verifyAuth,
  };
}
