import { useRef, useEffect, useState } from 'react';
import { googleAuthService } from '@/services/googleAuth';
import { authApi } from '@/api/auth';
import { useTranslation } from 'react-i18next';
import type { AuthResponse } from '@/api/auth';

interface SocialSignInButtonProps {
  provider: 'google' | 'apple';
  onSuccess?: (authResponse: AuthResponse) => void;
  onError?: (error: Error) => void;
  mode?: 'code' | 'id-token';
}

export default function SocialSignInButton({
  provider,
  onSuccess,
  onError,
  mode = 'code',
}: SocialSignInButtonProps) {
  const { i18n, t } = useTranslation();
  const codeClientRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (provider !== 'google') return;

    const handleGoogleLogin = async (credentialOrCode: string) => {
      try {
        let response;
        if (mode === 'code') {
          response = await authApi.loginWithCode(credentialOrCode);
        } else {
          response = await authApi.loginWithIdToken(credentialOrCode);
        }
        onSuccess?.(response);
      } catch (error: any) {
        console.error('Google login failed:', error);
        const errorMessage =
          error?.message ||
          error?.response?.data?.message ||
          '登录失败，请重试';
        onError?.(new Error(errorMessage));
      }
    };

    const initializeGoogleButton = async () => {
      if (mode === 'code') {
        try {
          codeClientRef.current = await googleAuthService.initializeCodeClient(
            handleGoogleLogin,
            {
              uxMode: 'popup',
              selectAccount: true,
            }
          );

          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize Code Client:', error);
        }
      }
    };

    initializeGoogleButton();

    return () => {
      codeClientRef.current = null;
      setIsInitialized(false);
    };
  }, [provider, mode, onSuccess, onError, i18n.language]);

  const handleGoogleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (codeClientRef.current) {
      codeClientRef.current.requestCode();
    } else {
      console.error('Google Code Client not initialized');
      onError?.(new Error('Google登录尚未初始化'));
    }
  };

  if (provider === 'apple') {
    const handleAppleClick = () => {
      const error = new Error('Apple Sign In is not yet implemented');
      onError?.(error);
      console.warn('Apple Sign In is not yet implemented');
    };

    return (
      <button
        onClick={handleAppleClick}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-md border border-black hover:bg-gray-900 transition-colors font-medium text-sm"
        type="button"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        {t('login.continueWithApple')}
      </button>
    );
  }

  // Google button
  return (
    <button
      onClick={handleGoogleClick}
      disabled={!isInitialized}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
    >
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
      {t('login.continueWithGoogle')}
    </button>
  );
}
