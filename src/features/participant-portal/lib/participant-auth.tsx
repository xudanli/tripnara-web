import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ParticipantLoginHintProps {
  returnPath: string;
}

/** 邀请页：提示登录以便绑定账号 */
export function ParticipantLoginHint({ returnPath }: ParticipantLoginHintProps) {
  const { isAuthenticated, user } = useAuth();
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`;

  if (isAuthenticated && user) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        已登录为 {user.displayName ?? user.email ?? user.id.slice(0, 8)}，接受邀请将绑定此账号
      </p>
    );
  }

  return (
    <p className="text-center text-xs text-muted-foreground">
      已有账号？{' '}
      <Link to={loginHref} className="font-medium text-primary hover:underline">
        登录后绑定
      </Link>
    </p>
  );
}

/** 构建 accept 请求体：登录态自动附带 userId / contactEmail */
export function buildAcceptInviteBody(
  user: { id: string; email: string | null } | null,
  options?: { confirmMismatch?: boolean },
) {
  return {
    ...(user?.id ? { userId: user.id } : {}),
    ...(user?.email ? { contactEmail: user.email } : {}),
    ...(options?.confirmMismatch ? { confirmMismatch: true } : {}),
  };
}
