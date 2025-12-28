import { useEffect } from 'react';
import { googleAuthService } from '@/services/googleAuth';
import { authApi } from '@/api/auth';

interface GoogleOneTapProps {
  onSuccess?: (authResponse: any) => void;
  onError?: (error: Error) => void;
  autoSelect?: boolean;
}

export default function GoogleOneTap({
  onSuccess,
  onError,
  autoSelect = true,
}: GoogleOneTapProps) {
  useEffect(() => {
    // 检查是否已经登录（从 sessionStorage 检查）
    const accessToken = sessionStorage.getItem('accessToken');
    if (accessToken) {
      return; // 已登录，不显示 One Tap
    }

    // 检查是否有 Google Client ID
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('Google Client ID not configured, skipping One Tap');
      return;
    }

    const handleOneTapLogin = async (idToken: string) => {
      try {
        const response = await authApi.loginWithIdToken(idToken);

        // 注意：accessToken 和 user 的存储由 useAuth hook 处理
        // 这里只传递完整的响应给 onSuccess
        onSuccess?.(response);
      } catch (error) {
        console.error('Google One Tap login failed:', error);
        onError?.(error as Error);
      }
    };

    const initializeOneTap = async () => {
      try {
        await googleAuthService.initializeOneTap(handleOneTapLogin, {
          autoSelect,
          cancelOnTapOutside: true,
        });

        // 延迟显示，避免与页面加载冲突
        setTimeout(() => {
          googleAuthService.promptOneTap().catch((err) => {
            console.warn('One Tap prompt failed:', err);
          });
        }, 1000);
      } catch (error) {
        // 静默失败，不影响页面显示
        console.warn('Failed to initialize One Tap:', error);
      }
    };

    initializeOneTap();
  }, [onSuccess, onError, autoSelect]);

  return null; // One Tap 不渲染任何 UI
}

