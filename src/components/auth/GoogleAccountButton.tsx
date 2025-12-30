import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { googleAuthService } from '@/services/googleAuth';
import { authApi } from '@/api/auth';
import type { AuthResponse } from '@/api/auth';

interface GoogleAccountInfo {
  name: string;
  email: string;
  picture: string;
}

interface GoogleAccountButtonProps {
  onSuccess?: (authResponse: AuthResponse) => void;
  onError?: (error: Error) => void;
  onVisibilityChange?: (visible: boolean) => void;
}

// 解码JWT Token获取用户信息
function decodeJWT(token: string): GoogleAccountInfo | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      name: payload.name || payload.email?.split('@')[0] || 'User',
      email: payload.email || '',
      picture: payload.picture || '',
    };
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export default function GoogleAccountButton({
  onSuccess,
  onError,
  onVisibilityChange,
}: GoogleAccountButtonProps) {
  const { t } = useTranslation();
  const [accountInfo, setAccountInfo] = useState<GoogleAccountInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const initializedRef = useRef(false);
  const oneTapInitializedRef = useRef(false);

  useEffect(() => {
    // 检查localStorage中是否有之前保存的账号信息
    const storedAccount = localStorage.getItem('googleAccountInfo');
    if (storedAccount) {
      try {
        const account = JSON.parse(storedAccount);
        setAccountInfo(account);
        setIsVisible(true);
        initializedRef.current = true;
        onVisibilityChange?.(true);
        return;
      } catch (error) {
        console.error('Failed to parse stored account info:', error);
        localStorage.removeItem('googleAccountInfo');
      }
    }

    // 如果没有存储的账号信息，尝试使用One Tap检测
    const detectAccount = async () => {
      if (initializedRef.current || oneTapInitializedRef.current) return;
      oneTapInitializedRef.current = true;
      
      try {
        const handleOneTapResponse = async (idToken: string) => {
          const decoded = decodeJWT(idToken);
          if (decoded && !initializedRef.current) {
            initializedRef.current = true;
            // 保存账号信息到localStorage
            localStorage.setItem('googleAccountInfo', JSON.stringify(decoded));
            setAccountInfo(decoded);
            setIsVisible(true);
            onVisibilityChange?.(true);
            
            // 如果用户点击了One Tap，直接登录
            try {
              const response = await authApi.loginWithIdToken(idToken);
              onSuccess?.(response);
            } catch (error: any) {
              console.error('Auto login failed:', error);
              // 不显示错误，让用户手动点击按钮
            }
          }
        };

        await googleAuthService.initializeOneTap(handleOneTapResponse, {
          autoSelect: false,
          cancelOnTapOutside: true,
        });

        // 尝试显示One Tap（如果用户之前登录过，会显示）
        try {
          await googleAuthService.promptOneTap();
          // One Tap显示了，等待用户选择或取消
          // 如果2秒内没有响应，认为没有可用账号
          setTimeout(() => {
            if (!initializedRef.current && !isVisible) {
              initializedRef.current = true;
              onVisibilityChange?.(false);
            }
          }, 2000);
        } catch (err) {
          // One Tap不可用或没有账号
          initializedRef.current = true;
          onVisibilityChange?.(false);
        }
      } catch (error) {
        console.warn('Failed to detect Google account:', error);
        initializedRef.current = true;
        onVisibilityChange?.(false);
      }
    };

    detectAccount();
  }, [onSuccess, onVisibilityChange, isVisible]);

  const handleClick = async () => {
    if (!accountInfo) return;

    try {
      // 使用Code Client来登录
      const handleLogin = async (code: string) => {
        try {
          const response = await authApi.loginWithCode(code);
          // 登录成功后，更新保存的账号信息
          if (response.user) {
            const updatedAccount: GoogleAccountInfo = {
              name: response.user.displayName || response.user.email?.split('@')[0] || 'User',
              email: response.user.email || '',
              picture: response.user.avatarUrl || '',
            };
            localStorage.setItem('googleAccountInfo', JSON.stringify(updatedAccount));
            setAccountInfo(updatedAccount);
          }
          onSuccess?.(response);
        } catch (error: any) {
          const errorMessage =
            error?.message || error?.response?.data?.message || '登录失败';
          onError?.(new Error(errorMessage));
        }
      };

      const codeClient = await googleAuthService.initializeCodeClient(
        handleLogin,
        {
          uxMode: 'popup',
          selectAccount: false, // 不显示账号选择，直接使用已检测到的账号
        }
      );

      if (codeClient) {
        codeClient.requestCode();
      }
    } catch (error) {
      console.error('Failed to login:', error);
      onError?.(error as Error);
    }
  };

  if (!isVisible || !accountInfo) {
    return null; // 不显示，回退到普通登录按钮
  }

  // 生成头像背景色（基于邮箱）
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const initial = accountInfo.name.charAt(0).toUpperCase();

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-left"
      type="button"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        {accountInfo.picture ? (
          <img
            src={accountInfo.picture}
            alt={accountInfo.name}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${getAvatarColor(
              accountInfo.email
            )}`}
          >
            {initial}
          </div>
        )}

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {t('login.loginWithAccount', {
              account: accountInfo.name,
              defaultValue: `用${accountInfo.name}的身份登录`,
            })}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {accountInfo.email}
          </div>
        </div>
      </div>

      {/* Google Logo */}
      <div className="flex-shrink-0 ml-3">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.585-5.04-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.96 10.708c-.18-.54-.282-1.117-.282-1.708 0-.591.102-1.168.282-1.708V4.95H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.05l3.003-2.342z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.95L3.96 7.292C4.67 5.167 6.653 3.58 9 3.58z"
          />
        </svg>
      </div>
    </button>
  );
}
