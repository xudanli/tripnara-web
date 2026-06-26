import { Button } from '@/components/ui/button';

interface ParticipantHelpFooterProps {
  onWithdraw?: () => void;
  withdrawPending?: boolean;
}

export function ParticipantHelpFooter({ onWithdraw, withdrawPending }: ParticipantHelpFooterProps) {
  return (
    <div className="space-y-2 border-t pt-4 text-center">
      <p className="text-xs text-muted-foreground">
        如有隐私疑问或邀请异常，请联系您的旅行顾问或组织者。
      </p>
      {onWithdraw ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          disabled={withdrawPending}
          onClick={onWithdraw}
        >
          退出项目 / 撤回授权
        </Button>
      ) : null}
    </div>
  );
}
