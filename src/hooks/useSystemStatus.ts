import { useState, useEffect } from 'react';
import { systemApi } from '@/api/system';
import type { SystemStatus } from '@/api/system';

/**
 * 系统状态 Hook
 * 用于获取和管理系统各功能模块的状态
 */
export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemApi.getStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || '获取系统状态失败');
      console.error('Failed to fetch system status:', err);
      // 如果获取失败，设置默认值（假设所有功能可用）
      setStatus({
        ocrProvider: 'unavailable',
        poiProvider: 'unavailable',
        asrProvider: 'unavailable',
        ttsProvider: 'unavailable',
        llmProvider: 'unavailable',
        rateLimit: {
          enabled: false,
          remaining: null,
          resetAt: null,
        },
        features: {
          vision: {
            enabled: true,
            maxFileSize: 6291456,
            supportedFormats: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
          },
          voice: {
            enabled: true,
            asrEnabled: true,
            ttsEnabled: true,
          },
          whatIf: {
            enabled: true,
            maxSamples: 1000,
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  /**
   * 检查 Provider 是否可用
   */
  const isProviderAvailable = (provider: string): boolean => {
    if (!status) return false;
    return provider !== 'unavailable';
  };

  /**
   * 检查功能是否启用
   */
  const isFeatureEnabled = (feature: keyof SystemStatus['features']): boolean => {
    if (!status) return false;
    return status.features[feature].enabled;
  };

  /**
   * 检查视觉识别功能是否可用
   */
  const isVisionAvailable = (): boolean => {
    return isFeatureEnabled('vision') && isProviderAvailable(status?.ocrProvider || '');
  };

  /**
   * 检查语音功能是否可用
   */
  const isVoiceAvailable = (): boolean => {
    return (
      isFeatureEnabled('voice') &&
      isProviderAvailable(status?.asrProvider || '') &&
      isProviderAvailable(status?.ttsProvider || '')
    );
  };

  /**
   * 检查 LLM 功能是否可用
   */
  const isLLMAvailable = (): boolean => {
    return isProviderAvailable(status?.llmProvider || '');
  };

  /**
   * 检查 POI 功能是否可用
   */
  const isPOIAvailable = (): boolean => {
    return isProviderAvailable(status?.poiProvider || '');
  };

  /**
   * 检查 What-If 功能是否可用
   */
  const isWhatIfAvailable = (): boolean => {
    return isFeatureEnabled('whatIf') && isLLMAvailable();
  };

  /**
   * 获取视觉识别功能配置
   */
  const getVisionConfig = () => {
    return status?.features.vision;
  };

  /**
   * 获取语音功能配置
   */
  const getVoiceConfig = () => {
    return status?.features.voice;
  };

  /**
   * 获取 What-If 功能配置
   */
  const getWhatIfConfig = () => {
    return status?.features.whatIf;
  };

  /**
   * 检查文件是否符合视觉识别要求
   */
  const validateVisionFile = (file: File): { valid: boolean; error?: string } => {
    const config = getVisionConfig();
    if (!config || !config.enabled) {
      return { valid: false, error: '视觉识别功能未启用' };
    }

    if (file.size > config.maxFileSize) {
      return {
        valid: false,
        error: `文件大小超过限制（最大 ${(config.maxFileSize / 1024 / 1024).toFixed(2)} MB）`,
      };
    }

    if (!config.supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件格式，支持的格式：${config.supportedFormats.join(', ')}`,
      };
    }

    return { valid: true };
  };

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    isProviderAvailable,
    isFeatureEnabled,
    isVisionAvailable,
    isVoiceAvailable,
    isLLMAvailable,
    isPOIAvailable,
    isWhatIfAvailable,
    getVisionConfig,
    getVoiceConfig,
    getWhatIfConfig,
    validateVisionFile,
  };
};

