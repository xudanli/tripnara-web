import { useEffect, useRef } from 'react';
import { googleAuthService } from '@/services/googleAuth';
import { authApi } from '@/api/auth';
import { useTranslation } from 'react-i18next';

import type { AuthResponse } from '@/api/auth';

interface GoogleSignInButtonProps {
  onSuccess?: (authResponse: AuthResponse) => void;
  onError?: (error: Error) => void;
  mode?: 'code' | 'id-token'; // 方案1: code, 方案2: id-token
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  mode = 'code',
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!buttonRef.current) return;

    let codeClient: any = null;
    let customButton: HTMLDivElement | null = null;

    const handleGoogleLogin = async (credentialOrCode: string) => {
      try {
        let response;
        if (mode === 'code') {
          // 方案 1: Code Model
          response = await authApi.loginWithCode(credentialOrCode);
        } else {
          // 方案 2: ID Token Model
          response = await authApi.loginWithIdToken(credentialOrCode);
        }

        // 注意：accessToken 和 user 的存储由 useAuth hook 处理
        // 这里只传递完整的响应给 onSuccess
        onSuccess?.(response);
      } catch (error: any) {
        console.error('Google login failed:', error);
        const errorMessage = error?.message || 
                           error?.response?.data?.message || 
                           '登录失败，请重试';
        onError?.(new Error(errorMessage));
      }
    };

    const initializeButton = async () => {
      // 清空容器，避免重复渲染
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }

      if (mode === 'code') {
        // 方案 1: 使用 Code Client
        try {
          codeClient = await googleAuthService.initializeCodeClient(
            handleGoogleLogin,
            {
              uxMode: 'popup',
              selectAccount: true,
            }
          );

          if (codeClient && buttonRef.current) {
            // 创建一个自定义按钮，点击时触发 code client
            customButton = document.createElement('div');
            customButton.style.cssText = `
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 12px 24px;
              background: #fff;
              border: 1px solid #dadce0;
              border-radius: 4px;
              cursor: pointer;
              font-family: 'Google Sans', Roboto, sans-serif;
              font-size: 14px;
              font-weight: 500;
              color: #3c4043;
              transition: background-color 0.2s;
            `;
            customButton.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.585-5.04-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.708c-.18-.54-.282-1.117-.282-1.708 0-.591.102-1.168.282-1.708V4.95H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.05l3.003-2.342z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.95L3.96 7.292C4.67 5.167 6.653 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            `;
            
            const handleMouseEnter = () => {
              if (customButton) customButton.style.backgroundColor = '#f8f9fa';
            };
            const handleMouseLeave = () => {
              if (customButton) customButton.style.backgroundColor = '#fff';
            };
            const handleClick = (e: MouseEvent) => {
              e.preventDefault();
              if (codeClient) codeClient.requestCode();
            };
            
            customButton.addEventListener('mouseenter', handleMouseEnter);
            customButton.addEventListener('mouseleave', handleMouseLeave);
            customButton.addEventListener('click', handleClick);
            
            buttonRef.current.appendChild(customButton);
          }
        } catch (error) {
          console.error('Failed to initialize Code Client:', error);
        }
      } else {
        // 方案 2: 使用 ID Token (通过 GIS 按钮)
        if (buttonRef.current) {
          try {
            await googleAuthService.renderButton(buttonRef.current, handleGoogleLogin, {
              locale: i18n.language,
            });
          } catch (error) {
            console.error('Failed to render Google button:', error);
          }
        }
      }
    };

    initializeButton();

    // 清理函数
    return () => {
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
      customButton = null;
      codeClient = null;
    };
  }, [mode, onSuccess, onError, i18n.language]);

  return (
    <div
      ref={buttonRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    />
  );
}

