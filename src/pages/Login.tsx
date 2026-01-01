import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import SocialSignInButton from '@/components/auth/SocialSignInButton';
import GoogleAccountButton from '@/components/auth/GoogleAccountButton';
import LoginIllustration from '@/components/auth/LoginIllustration';

type LoginStep = 'email' | 'code';

// 包装组件：根据是否有已登录账号来决定显示哪个按钮
function GoogleLoginSection({
  onSuccess,
  onError,
}: {
  onSuccess: (authResponse: any) => void;
  onError: (err: Error) => void;
}) {
  const [showAccountButton, setShowAccountButton] = useState(false);

  return (
    <>
      <GoogleAccountButton
        onSuccess={onSuccess}
        onError={onError}
        onVisibilityChange={setShowAccountButton}
      />
      {/* 只有在没有显示账号按钮时才显示普通登录按钮 */}
      {!showAccountButton && (
        <SocialSignInButton
          provider="google"
          onSuccess={onSuccess}
          onError={onError}
          mode="code"
        />
      )}
    </>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [invitationCode, setInvitationCode] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 邮箱格式验证
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGoogleSuccess = async (authResponse: any) => {
    try {
      setLoading(true);
      setError(null);

      await loginWithGoogle(authResponse);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err: Error) => {
    const errorMessage = err.message.includes('Network')
      ? '无法连接到服务器。请确保后端服务正在运行，或稍后重试。'
      : err.message;
    setError(errorMessage);
    setLoading(false);
  };

  // 步骤1: 发送验证码
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // 前端邮箱格式验证
    if (!email) {
      setError(t('login.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('login.invalidEmail'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.sendVerificationCode(email);
      setSuccess(t('login.codeSent'));
      setStep('code');
      setCountdown(60); // 开始60秒倒计时
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('login.sendCodeFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 步骤2: 使用验证码登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 前端验证
    if (!email || !code) {
      setError(t('login.emailAndCodeRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('login.invalidEmail'));
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(t('login.invalidCode'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await authApi.loginWithEmailCode(email, code);
      
      // 调试日志
      console.log('登录API响应:', result);
      console.log('accessToken:', result?.accessToken);
      console.log('user:', result?.user);

      // 保存用户信息和token
      await loginWithEmail(result);
      
      // 验证 token 是否已保存
      const savedToken = sessionStorage.getItem('accessToken');
      console.log('验证：sessionStorage 中的 accessToken:', savedToken ? '已保存' : '未保存');

      // 显示成功提示
      setSuccess(t('login.success'));

      // 跳转到首页
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('login.loginFailed');

      // 根据错误类型提供不同提示
      if (errorMessage.includes('验证码') || errorMessage.includes('code')) {
        // 验证码相关错误，提供重新发送的选项
        setError(errorMessage + ' ' + t('login.resendCodeHint'));
      } else if (errorMessage.includes('未注册') || errorMessage.includes('not registered')) {
        // 邮箱未注册，提示注册
        setError(errorMessage + ' ' + t('login.registerHint'));
        setTimeout(() => navigate('/register'), 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <h1 className="text-2xl font-bold">TripNARA</h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {t('login.joinTitle')}
            </h2>
            {/* Optional: Uncomment to show alternative title */}
            {/* <h2 className="text-2xl font-semibold text-gray-900">
              {t('login.startPlanning')}
            </h2> */}
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Invitation Code */}
          <div className="mb-6">
            <Label htmlFor="invitation-code" className="text-sm text-gray-700 mb-2 block">
              {t('login.invitationCode')}
            </Label>
            <Input
              id="invitation-code"
              type="text"
              placeholder={t('login.invitationCodePlaceholder')}
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <GoogleLoginSection
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
            <SocialSignInButton
              provider="apple"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">{t('login.or')}</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Step 1: Email Input and Send Code */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm text-gray-700 mb-2 block">
                  {t('login.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gray-700 hover:bg-gray-800 text-white h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? t('login.sending') : t('login.sendCode')}
              </Button>
            </form>
          )}

          {/* Step 2: Code Input and Login */}
          {step === 'code' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm text-gray-700 mb-2 block">
                  {t('login.verificationCode')}
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder={t('login.codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full"
                  required
                  autoFocus
                  maxLength={6}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('login.codeHint')}
                </p>
                {countdown > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t('login.resendCountdown', { seconds: countdown })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {t('login.resendCode')}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-700 hover:bg-gray-800 text-white h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? t('login.loggingIn') : t('login.submit')}
              </Button>

              {/* Back to email step */}
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 mt-2"
              >
                {t('login.changeEmail')}
              </button>
            </form>
          )}

          {/* Terms */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            <Trans
              i18nKey="login.terms"
              components={[
                <a
                  key="terms"
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                />,
                <a
                  key="privacy"
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                />,
              ]}
              values={{
                terms: t('login.termsOfService'),
                privacy: t('login.privacyPolicy'),
              }}
            />
          </p>

          {/* Link to Register */}
          <p className="mt-4 text-sm text-center text-gray-600">
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {t('login.registerLink')}
            </Link>
          </p>

          {/* Social Links */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Discord"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Twitter/X"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2">
        <LoginIllustration />
      </div>
    </div>
  );
}
