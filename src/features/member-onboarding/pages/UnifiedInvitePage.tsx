/**
 * 统一邀请入口 /invite/:token
 * 解析 trip_member · team · gate1 并跳转或展示接受页
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import {
  useAcceptTripMemberInvite,
  useResolveInvite,
  useTripMemberInviteContext,
} from '@/hooks/useInviteResolver';
import { roleSlotLabel } from '@/lib/trip-member-roles.util';
import type { InviteKind } from '@/types/invite-resolver';

function redirectForKind(kind: InviteKind, token: string, targetPath: string, navigate: ReturnType<typeof useNavigate>) {
  if (kind === 'gate1_participant') {
    navigate(targetPath, { replace: true });
    return true;
  }
  if (kind === 'team') {
    // 后端 targetPath 为 /invite/:token；团队接受页仍走 join-team
    navigate(`/join-team/${encodeURIComponent(token)}`, { replace: true });
    return true;
  }
  return false;
}

export default function UnifiedInvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: resolved, isLoading: resolving, error: resolveError } = useResolveInvite(token);
  const { data: tripCtx } = useTripMemberInviteContext(
    resolved?.kind === 'trip_member' ? token : undefined,
  );
  const acceptInvite = useAcceptTripMemberInvite(token);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!resolved) return;
    if (redirectForKind(resolved.kind, token, resolved.targetPath, navigate)) return;
  }, [resolved, token, navigate]);

  const handleAcceptTripMember = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    setAccepting(true);
    try {
      const result = await acceptInvite.mutateAsync();
      toast.success(result.alreadyAccepted ? '你已是本行程成员' : '邀请已接受');
      if (tripCtx?.onboardingCompleted) {
        navigate(`/member/${encodeURIComponent(token)}/home`, { replace: true });
      } else {
        navigate(`/member/${encodeURIComponent(token)}/onboarding/role`, { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '接受邀请失败');
    } finally {
      setAccepting(false);
    }
  };

  if (resolving) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (resolveError || !resolved) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>邀请无效</CardTitle>
            <CardDescription>
              {resolveError instanceof Error ? resolveError.message : '链接可能已过期，请联系顾问重新发送。'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (resolved.kind !== 'trip_member') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const preview = resolved.preview;
  const expired = preview?.expired ?? tripCtx?.expired;
  const roleLabel =
    roleSlotLabel(tripCtx?.roleSlot) ?? preview?.label ?? tripCtx?.label ?? tripCtx?.roleHint;

  if (expired) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>邀请已过期</CardTitle>
            <CardDescription>请联系顾问重新发送邀请（有效期 14 天）。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tripCtx?.onboardingCompleted) {
    navigate(`/member/${encodeURIComponent(token)}/home`, { replace: true });
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {roleLabel
              ? `邀请你作为${roleLabel}`
              : preview?.title ?? tripCtx?.tripName ?? '加入行程'}
          </CardTitle>
          <CardDescription>
            接受后需完成 10 步偏好采集（约 8–12 分钟）。无需填写总预算或编排行程。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview?.destination ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {preview.destination}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={accepting || acceptInvite.isPending}
            onClick={() => void handleAcceptTripMember()}
          >
            {accepting || acceptInvite.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中…
              </>
            ) : isAuthenticated ? (
              '接受邀请并开始'
            ) : (
              '登录并接受邀请'
            )}
          </Button>
          {!isAuthenticated ? (
            <p className="text-center text-xs text-muted-foreground">
              <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`} className="underline">
                登录 / 注册
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
