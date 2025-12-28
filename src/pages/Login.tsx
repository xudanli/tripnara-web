import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (authResponse: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // loginWithGoogle 会处理完整的 AuthResponse，包括存储 token 和用户信息
      await loginWithGoogle(authResponse);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err: Error) => {
    // 如果是网络错误，提供更友好的提示
    const errorMessage = err.message.includes('Network') 
      ? '无法连接到服务器。请确保后端服务正在运行，或稍后重试。'
      : err.message;
    setError(errorMessage);
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          {t('login.title')}
        </h1>

        <p
          style={{
            fontSize: '0.9rem',
            color: '#666',
            textAlign: 'center',
            marginBottom: '2rem',
            lineHeight: '1.6',
          }}
        >
          {t('login.googleDescription', {
            defaultValue: '使用 Google 登录，自动保存路线决策记录\n无需密码，跨设备同步你的路线',
          })}
        </p>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <GoogleSignInButton
            mode="code"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '2rem 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
          <span style={{ padding: '0 1rem', color: '#999', fontSize: '0.9rem' }}>
            {t('login.or', { defaultValue: '或' })}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
        </div>

        <p
          style={{
            fontSize: '0.85rem',
            color: '#999',
            textAlign: 'center',
            lineHeight: '1.6',
          }}
        >
          {t('login.fallbackNote', {
            defaultValue: '未来将支持 Email OTP / Magic Link 作为备选登录方式',
          })}
        </p>
      </div>
    </div>
  );
}

