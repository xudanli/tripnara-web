import { BadgeCheck, Mail, Phone, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TrustProfileVerification } from '@/types/identity-governance';

interface VerificationBadgesProps {
  verification: TrustProfileVerification;
}

export function VerificationBadges({ verification }: VerificationBadgesProps) {
  const items = [
    { ok: verification.emailVerified, label: '邮箱', icon: Mail },
    { ok: verification.phoneVerified, label: '手机', icon: Phone },
    { ok: verification.realNameVerified, label: '实名', icon: UserCheck },
    { ok: verification.ageVerified, label: '年龄', icon: BadgeCheck },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ ok, label, icon: Icon }) => (
        <Badge key={label} variant={ok ? 'default' : 'outline'} className="gap-1">
          <Icon className="h-3 w-3" />
          {label}
          {ok ? '已验证' : '未验证'}
        </Badge>
      ))}
    </div>
  );
}
