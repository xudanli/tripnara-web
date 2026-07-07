import { CheckCircle2, Circle, MessageCircle, Radio } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { ExecuteMemberStatusItem } from './ExecuteStatusSidebar';
import { executeSidebarUi } from './execute-sidebar-ui';
import { semanticGoodText, semanticWarnText } from '@/lib/semantic-ui-classes';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function MemberLevelIcon({ level }: { level: ExecuteMemberStatusItem['level'] }) {
  if (level === 'yellow' || level === 'orange' || level === 'red') {
    return <Circle className={cn('h-3.5 w-3.5 shrink-0', semanticWarnText)} aria-hidden />;
  }
  return <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', semanticGoodText)} aria-hidden />;
}

interface ExecuteMemberStatusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ExecuteMemberStatusItem[];
  onlineCount?: number;
  highlightUserId?: string | null;
  onOpenTeamChat?: () => void;
}

export function ExecuteMemberStatusSheet({
  open,
  onOpenChange,
  members,
  onlineCount,
  highlightUserId,
  onOpenTeamChat,
}: ExecuteMemberStatusSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
          <SheetTitle className="text-base">成员状态</SheetTitle>
          <SheetDescription className="text-left">
            {onlineCount ?? members.length} 人在线 · 行中体力与活动状态
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border">
          {members.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-xs text-muted-foreground">暂无成员状态数据</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  highlightUserId === member.userId && 'bg-muted/30',
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 border border-border">
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                    {initials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className={cn(executeSidebarUi.rowValue, 'mb-1')}>{member.displayName}</p>
                  <div className="flex items-center gap-1.5">
                    <MemberLevelIcon level={member.level} />
                    <p className={executeSidebarUi.rowMeta}>
                      {member.conditionLabel} · {member.activityLabel}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {onOpenTeamChat ? (
          <div className="shrink-0 border-t border-border px-4 py-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onOpenChange(false);
                onOpenTeamChat();
              }}
            >
              <Radio className="h-4 w-4" />
              团队对讲
            </Button>
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              需要邀请协作者或改权限？请点页面顶栏成员头像。
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
