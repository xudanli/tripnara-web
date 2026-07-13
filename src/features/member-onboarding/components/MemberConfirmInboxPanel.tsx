import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useMemberConfirmInbox } from '@/hooks/useMemberTripPhase';
import {
  CONFIRM_SCOPE_LABELS,
  type MemberConfirmInboxItem,
} from '@/types/trip-confirm-inbox';

interface MemberConfirmInboxPanelProps {
  inviteCode?: string;
  tripId?: string;
  className?: string;
}

function scopeBadgeVariant(scope: MemberConfirmInboxItem['confirmScope']) {
  if (scope === 'ALL_MEMBERS') return 'destructive' as const;
  if (scope === 'PAYER_AND_MEMBERS' || scope === 'PAYER') return 'default' as const;
  return 'secondary' as const;
}

function filterPendingItems(items: MemberConfirmInboxItem[]): MemberConfirmInboxItem[] {
  return items.filter((item) => item.status === 'PENDING');
}

export function MemberConfirmInboxPanel({
  inviteCode,
  tripId,
  className,
}: MemberConfirmInboxPanelProps) {
  const { data, isLoading, isError } = useMemberConfirmInbox({
    inviteCode,
    tripId,
    enabled: Boolean(inviteCode || tripId),
  });

  const visible = filterPendingItems(data?.items ?? []);

  if (isLoading) {
    return (
      <div className={className}>
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isError || visible.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          待你确认
          <Badge variant="secondary">{visible.length}</Badge>
        </CardTitle>
        <CardDescription>
          仅展示需要本人确认的事项；预算批准由付款人单独处理。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant={scopeBadgeVariant(item.confirmScope)} className="text-[10px]">
                  {CONFIRM_SCOPE_LABELS[item.confirmScope]}
                </Badge>
              </div>
              {item.summary ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
              ) : null}
            </div>
            {item.actionHref ? (
              <Button asChild size="sm" variant="outline" className="flex-shrink-0 h-8">
                <Link to={item.actionHref}>
                  去确认
                  <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
