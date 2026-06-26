import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';

interface TerminalStatePageProps {
  variant: 'withdrawn' | 'declined';
}

export default function TerminalStatePage({ variant }: TerminalStatePageProps) {
  const { invite } = useParticipantProject();
  const isWithdrawn = variant === 'withdrawn';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isWithdrawn ? '已退出项目' : '已拒绝参与'}</CardTitle>
        <CardDescription>
          {isWithdrawn
            ? '您已撤回授权，后续将不再处理您的私密数据或非必要提醒。'
            : '您已拒绝本次邀请，如需重新加入请联系邀请方。'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {invite ? (
          <p>
            项目：{invite.project.title}
            {isWithdrawn ? ' · 业务必须保留的记录将按隐私政策处理。' : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
