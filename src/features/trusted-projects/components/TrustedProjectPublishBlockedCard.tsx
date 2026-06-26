import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ACCOUNT_GOVERNANCE_SETTINGS_PATH } from '@/lib/trusted-projects-routes';

type TrustedProjectPublishBlockedCardProps = {
  reason: string;
  className?: string;
};

export function TrustedProjectPublishBlockedCard({
  reason,
  className,
}: TrustedProjectPublishBlockedCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />
          暂无发布权限
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="default" size="sm">
          <Link to="/dashboard/account/professional/apply">申请专业认证</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={ACCOUNT_GOVERNANCE_SETTINGS_PATH}>账号治理</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
