import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoginIllustration from '@/components/auth/LoginIllustration';
import Logo from '@/components/common/Logo';

type RegisterStep = 'email' | 'code' | 'register';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithEmail } = useAuth();
  const [step, setStep] = useState<RegisterStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 表单数据
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // 倒计时
  const [countdown, setCountdown] = useState(0);

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

  // 步骤1: 发送验证码
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // 前端邮箱格式验证
    if (!email) {
      setError(t('register.emailRequired'));
      return;
    }
    
    if (!validateEmail(email)) {
      setError(t('register.invalidEmail'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await authApi.sendVerificationCode(email);
      setSuccess(t('register.codeSent'));
      setStep('code');
      setCountdown(60); // 开始60秒倒计时
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('register.sendCodeFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 步骤2: 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 前端验证
    if (!email || !code) {
      setError(t('register.emailAndCodeRequired'));
      return;
    }
    
    if (!validateEmail(email)) {
      setError(t('register.invalidEmail'));
      return;
    }
    
    if (!/^\d{6}$/.test(code)) {
      setError(t('register.invalidCode'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await authApi.registerWithEmail(
        email,
        code,
        displayName || undefined
      );
      
      // 调试日志
      console.log('注册API响应:', result);
      console.log('accessToken:', result?.accessToken);
      console.log('user:', result?.user);
      
      // 保存用户信息和token
      await loginWithEmail(result);
      
      // 验证 token 是否已保存
      const savedToken = sessionStorage.getItem('accessToken');
      console.log('验证：sessionStorage 中的 accessToken:', savedToken ? '已保存' : '未保存');
      
      // 显示成功提示
      setSuccess(t('register.success'));
      
      // 跳转到首页
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('register.registerFailed');
      setError(errorMessage);
      
      // 根据错误类型提供不同提示
      if (errorMessage.includes('验证码') || errorMessage.includes('code')) {
        // 验证码相关错误，提供重新发送的选项
        setError(errorMessage + ' ' + t('register.resendCodeHint'));
      } else if (errorMessage.includes('已被注册') || errorMessage.includes('already registered')) {
        // 邮箱已注册，提示登录
        setError(errorMessage + ' ' + t('register.loginHint'));
        setTimeout(() => navigate('/login'), 2000);
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
      {/* Left side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="mb-4">
              <Logo variant="full" size={32} color="#000" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {t('register.title')}
            </h2>
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

          {/* Step 1: Email Input and Send Code */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm text-gray-700 mb-2 block">
                  {t('register.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('register.emailPlaceholder')}
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
                {loading ? t('register.sending') : t('register.sendCode')}
              </Button>
            </form>
          )}

          {/* Step 2: Code Input and Register */}
          {step === 'code' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm text-gray-700 mb-2 block">
                  {t('register.verificationCode')}
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder={t('register.codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full"
                  required
                  autoFocus
                  maxLength={6}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('register.codeHint')}
                </p>
                {countdown > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t('register.resendCountdown', { seconds: countdown })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {t('register.resendCode')}
                </button>
              </div>
              
              <div>
                <Label htmlFor="displayName" className="text-sm text-gray-700 mb-2 block">
                  {t('register.displayName')} ({t('register.optional')})
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('register.displayNamePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                  className="w-full"
                  maxLength={50}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gray-700 hover:bg-gray-800 text-white h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? t('register.registering') : t('register.submit')}
              </Button>
            </form>
          )}

          {/* Terms */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            {t('register.termsHint')}
          </p>

          {/* Link to Login */}
          <p className="mt-4 text-sm text-center text-gray-600">
            {t('register.haveAccount')}{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2">
        <LoginIllustration />
      </div>
    </div>
  );
}

