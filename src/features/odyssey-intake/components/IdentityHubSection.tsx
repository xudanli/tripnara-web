import { useEffect, useState } from 'react';
import {
  Briefcase,
  GraduationCap,
  IdCard,
  Link2,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMyVerifiedCredentials } from '@/features/match-square/hooks/useMyVerifiedCredentials';
import {
  useSendWorkEmailCode,
  useUploadProfessionBadge,
  useVerifyOdysseyEducation,
  useVerifyProfessionBadge,
  useVerifyProfessionOAuth,
  useVerifyWorkEmail,
} from '../hooks/useOdysseyCredentials';
import { identityHubFormFromCredentials } from '../lib/identity-hub-form-state';
import { sanitizeTrustAssetLine } from '@/lib/deprecated-trust';

interface IdentityHubSectionProps {
  completed: boolean;
  /** Premium intake 入网第二步：不依赖 quizComplete */
  intakeMode?: boolean;
  className?: string;
}

/** PRD 3.1.2 / 3.1.3 · Identity Hub — 学信网 / 企业邮箱 / 芝麻授信 */
export function IdentityHubSection({
  completed,
  intakeMode = false,
  className,
}: IdentityHubSectionProps) {
  const visible = intakeMode || completed;
  const { data: credentials, isLoading } = useMyVerifiedCredentials(visible);
  const verifyEducation = useVerifyOdysseyEducation();
  const verifyWorkEmail = useVerifyWorkEmail();
  const uploadBadge = useUploadProfessionBadge();
  const verifyBadge = useVerifyProfessionBadge();
  const verifyOAuth = useVerifyProfessionOAuth();
  const sendEmailCode = useSendWorkEmailCode();

  const [chsiCode, setChsiCode] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<'bachelor' | 'master' | 'doctorate'>('master');
  const [tierTag, setTierTag] = useState<'985_211' | 'qs_top50' | 'overseas' | 'general'>('985_211');
  const [professionChannel, setProfessionChannel] = useState<
    'work_email' | 'badge_ocr' | 'oauth_maimai' | 'oauth_linkedin'
  >('work_email');
  const [workEmail, setWorkEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgeToken, setBadgeToken] = useState<string | null>(null);
  const [oauthToken, setOauthToken] = useState('');

  useEffect(() => {
    if (!credentials) return;
    const form = identityHubFormFromCredentials(credentials);
    setDegreeLevel(form.degreeLevel);
    setTierTag(form.tierTag ?? '985_211');
  }, [credentials]);

  if (!visible) return null;

  const busy =
    verifyEducation.isPending ||
    verifyWorkEmail.isPending ||
    uploadBadge.isPending ||
    verifyBadge.isPending ||
    verifyOAuth.isPending ||
    sendEmailCode.isPending;

  const handleEducation = async () => {
    const code = chsiCode.trim();
    if (code.length < 8) {
      toast.error('请输入学信网在线验证码（报告页面获取）');
      return;
    }
    try {
      await verifyEducation.mutateAsync({
        verificationCode: code,
        degreeLevel,
        tierTag,
      });
      toast.success('学历授信成功 — 广场已同步脱敏标签');
      setChsiCode('');
    } catch {
      toast.error('学信网验证失败，请检查验证码是否有效');
    }
  };

  const handleSendEmailCode = async () => {
    const email = workEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的工作邮箱');
      return;
    }
    try {
      const res = await sendEmailCode.mutateAsync(email);
      if (res.devCode) {
        setDevCodeHint(res.devCode);
        setEmailOtp(res.devCode);
        toast.success(`验证码已发送（开发环境：${res.devCode}）`);
      } else {
        setDevCodeHint(null);
        toast.success('验证码已发送至企业邮箱');
      }
    } catch {
      toast.error('验证码发送失败');
    }
  };

  const handleVerifyWorkEmail = async () => {
    const email = workEmail.trim();
    if (!email || emailOtp.trim().length < 4) {
      toast.error('请完成企业邮箱验证');
      return;
    }
    try {
      await verifyWorkEmail.mutateAsync({ workEmail: email, code: emailOtp.trim() });
      toast.success('职业背书已激活 — 仅展示模糊化标签');
      setDevCodeHint(null);
    } catch {
      toast.error('职业验证失败');
    }
  };

  const handleBadgeUpload = async (file: File) => {
    setBadgeFile(file);
    try {
      const { imageToken } = await uploadBadge.mutateAsync(file);
      setBadgeToken(imageToken);
      toast.success('工牌已上传，请点击激活职业背书');
    } catch {
      toast.error('工牌上传失败');
      setBadgeFile(null);
      setBadgeToken(null);
    }
  };

  const handleVerifyBadge = async () => {
    if (!badgeToken) {
      toast.error('请先上传工牌');
      return;
    }
    try {
      await verifyBadge.mutateAsync(badgeToken);
      toast.success('工牌认证成功 — 原图已由服务端销毁');
      setBadgeFile(null);
      setBadgeToken(null);
    } catch {
      toast.error('工牌认证失败');
    }
  };

  const handleOAuth = async (provider: 'maimai' | 'linkedin') => {
    const token = oauthToken.trim();
    if (!token) {
      toast.message('OAuth 授权码占位', {
        description: '生产环境由脉脉/LinkedIn SDK 回调 authToken；开发可输入 stub token。',
      });
      return;
    }
    try {
      await verifyOAuth.mutateAsync({ provider, authToken: token });
      toast.success('职场平台授权成功');
      setOauthToken('');
    } catch {
      toast.error('职场平台授权失败');
    }
  };

  const handleProfession = async () => {
    if (professionChannel === 'work_email') {
      await handleVerifyWorkEmail();
      return;
    }
    if (professionChannel === 'badge_ocr') {
      await handleVerifyBadge();
      return;
    }
    await handleOAuth(professionChannel === 'oauth_maimai' ? 'maimai' : 'linkedin');
  };

  const trustAssetPreview = sanitizeTrustAssetLine(credentials?.headline?.trustAssetLine);

  return (
    <section className={cn('rounded-2xl border border-border bg-white p-5 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">身份验证 · Identity Hub</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            学历 / 职业材料仅用于身份核验与脱敏展示，不参与信用评分或推荐排序。
          </p>
        </div>
        {credentials?.education?.verified && credentials.profession?.verified && (
          <Badge variant="secondary" className="shrink-0">
            背书已激活
          </Badge>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        隐私底线：前端只展示「学历级别 + 院校档次 + 行业圈层」，绝不显示校名、公司全称、毕业年份或身份证号。
        未授信用户无法自定义社会背景标签。
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">加载背书状态…</p>
      ) : credentials?.headline?.identityHeadline ? (
        <div className="mt-4 space-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <p className="text-foreground">{credentials.headline.identityHeadline}</p>
          {trustAssetPreview && (
            <p className="text-xs text-muted-foreground">{trustAssetPreview}</p>
          )}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
            学信网一键认证
            {credentials?.education?.verified && (
              <Badge variant="outline" className="ml-auto text-[10px] text-emerald-600">
                已认证 ✓
              </Badge>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            登录学信网 → 在线验证报告 → 复制「在线验证码」，无需上传毕业证截图。
          </p>
          <div className="space-y-2">
            <Label className="text-xs">学信网在线验证码</Label>
            <Input
              value={chsiCode}
              onChange={(e) => setChsiCode(e.target.value)}
              placeholder="16 位验证码"
              className="h-9 font-mono"
              autoComplete="off"
            />
          </div>
          {import.meta.env.DEV && (
            <div className="space-y-2 rounded-md border border-dashed border-border p-2">
              <p className="text-[10px] text-muted-foreground">开发模拟 · 后端就绪后由 API 回填</p>
              <Select value={degreeLevel} onValueChange={(v) => setDegreeLevel(v as typeof degreeLevel)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelor">本科</SelectItem>
                  <SelectItem value="master">硕士</SelectItem>
                  <SelectItem value="doctorate">博士</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierTag} onValueChange={(v) => setTierTag(v as typeof tierTag)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="985_211">985/211</SelectItem>
                  <SelectItem value="qs_top50">QS Top 50</SelectItem>
                  <SelectItem value="overseas">海归</SelectItem>
                  <SelectItem value="general">普通本科及以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" className="w-full" onClick={handleEducation} disabled={busy}>
            {credentials?.education?.verified ? '更新学历授信' : '学信网一键认证'}
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
            工作资历授信
            {credentials?.profession?.verified && (
              <Badge variant="outline" className="ml-auto text-[10px] text-emerald-600">
                已认证 ✓
              </Badge>
            )}
          </div>

          <Tabs
            value={professionChannel}
            onValueChange={(v) => setProfessionChannel(v as typeof professionChannel)}
          >
            <TabsList className="grid h-8 w-full grid-cols-3">
              <TabsTrigger value="work_email" className="text-[10px] px-1">
                <Mail className="mr-0.5 h-3 w-3" aria-hidden />
                邮箱
              </TabsTrigger>
              <TabsTrigger value="badge_ocr" className="text-[10px] px-1">
                <IdCard className="mr-0.5 h-3 w-3" aria-hidden />
                工牌
              </TabsTrigger>
              <TabsTrigger value="oauth_maimai" className="text-[10px] px-1">
                <Link2 className="mr-0.5 h-3 w-3" aria-hidden />
                OAuth
              </TabsTrigger>
            </TabsList>

            <TabsContent value="work_email" className="mt-3 space-y-2">
              <Label className="text-xs">企业官方邮箱</Label>
              <Input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-9"
              />
              <div className="flex gap-2">
                <Input
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="6 位验证码"
                  className="h-9 font-mono"
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={busy || !workEmail.trim()}
                  onClick={handleSendEmailCode}
                >
                  发送
                </Button>
              </div>
              {devCodeHint && (
                <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  hybrid stub · devCode: {devCodeHint}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                验证通过后展示如「泛科技·产品总监(已认证)」，不含公司全称。
              </p>
            </TabsContent>

            <TabsContent value="badge_ocr" className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                上传工牌或名片 → OCR → 审核通过后<strong>立即销毁原图</strong>（仅保留模糊标签）。
              </p>
              <Input
                type="file"
                accept="image/*"
                className="h-9 text-xs"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleBadgeUpload(file);
                }}
              />
              {badgeFile && (
                <p className="text-[10px] text-muted-foreground">
                  已选：{badgeFile.name}
                  {badgeToken ? ` · token: ${badgeToken.slice(0, 12)}…` : ''}
                </p>
              )}
            </TabsContent>

            <TabsContent value="oauth_maimai" className="mt-3 space-y-2">
              <Input
                value={oauthToken}
                onChange={(e) => setOauthToken(e.target.value)}
                placeholder="OAuth authToken（开发 stub）"
                className="h-9 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => handleOAuth('maimai')}
              >
                脉脉一键授权
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => handleOAuth('linkedin')}
              >
                LinkedIn 授权
              </Button>
            </TabsContent>
          </Tabs>

          <Button size="sm" className="w-full" onClick={handleProfession} disabled={busy}>
            {credentials?.profession?.verified ? '更新职业验证' : '激活职业验证'}
          </Button>
        </div>
      </div>
    </section>
  );
}
