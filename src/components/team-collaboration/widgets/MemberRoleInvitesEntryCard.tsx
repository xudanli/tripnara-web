import { useMemo, useState } from 'react';
import { Copy, Link2, Loader2, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { tripMemberInvitesApi } from '@/api/trip-member-invites';
import { resolveTripMemberInviteCodes } from '@/lib/trip-member-invite-codes.util';
import type { TripDetail } from '@/types/trip';
import type { AdvisorTripMemberInviteCode } from '@/types/advisor-trip-create';
import { workbenchCard, workbenchPanelTitle } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface MemberRoleInvitesEntryCardProps {
  trip: TripDetail;
  onOpenInvites?: () => void;
  onTripRefetch?: () => void | Promise<void>;
  /** 空态单行：标题+操作，不展开链接列表说明 */
  compact?: boolean;
  className?: string;
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  } catch {
    toast.error('复制失败，请手动复制');
  }
}

/** 行前需求问卷邀请入口（顾问角色邀请 / 自由行同行成员邀请） */
export function MemberRoleInvitesEntryCard({
  trip,
  onOpenInvites,
  onTripRefetch,
  compact = false,
  className,
}: MemberRoleInvitesEntryCardProps) {
  const meta = (trip as { metadata?: Record<string, unknown> | null }).metadata;
  const fromTrip = useMemo(
    () => resolveTripMemberInviteCodes(trip.id, meta),
    [trip.id, meta],
  );
  const [extra, setExtra] = useState<AdvisorTripMemberInviteCode[]>([]);
  const [generating, setGenerating] = useState(false);
  const inviteCodes = useMemo(() => {
    const map = new Map<string, AdvisorTripMemberInviteCode>();
    for (const item of [...fromTrip, ...extra]) map.set(item.inviteCode, item);
    return [...map.values()];
  }, [fromTrip, extra]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await tripMemberInvitesApi.createForTrip(trip.id, {
        count: 1,
        labelPrefix: '同行成员',
      });
      setExtra((prev) => [...prev, ...result.created]);
      toast.success('已生成邀请链接');
      await onTripRefetch?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className={cn(workbenchCard, compact ? 'p-2.5' : 'p-3', className)}>
      <div
        className={cn(
          'flex gap-2',
          compact
            ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
            : 'flex-col sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="min-w-0">
          <h3 className={workbenchPanelTitle}>行前需求 · 成员邀请</h3>
          {compact ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {inviteCodes.length > 0
                ? `已有 ${inviteCodes.length} 条邀请链接，生成后可复制发给同行成员`
                : '生成邀请链接后复制发给同行成员，填写进度将显示在此'}
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              将邀请链接发送给出行成员；接受邀请后需完成偏好问卷，进度在下方查看。
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            disabled={generating}
            onClick={() => void handleGenerate()}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            生成链接
          </Button>
          {onOpenInvites ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={onOpenInvites}
            >
              <UserPlus className="h-3.5 w-3.5" />
              管理全部
            </Button>
          ) : null}
        </div>
      </div>

      {compact ? null : inviteCodes.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">
          还没有邀请链接。点击「生成链接」后复制发给同行成员。
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {inviteCodes.slice(0, 4).map((item) => (
            <li
              key={item.inviteCode}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/10 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <code className="text-[10px] text-muted-foreground">{item.inviteCode}</code>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={() => void copyText(item.inviteUrl, '邀请链接')}
                >
                  <Link2 className="h-3 w-3" />
                  复制链接
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={() => void copyText(item.inviteCode, '邀请码')}
                >
                  <Copy className="h-3 w-3" />
                  码
                </Button>
              </div>
            </li>
          ))}
          {inviteCodes.length > 4 && onOpenInvites ? (
            <li>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[10px] text-primary"
                onClick={onOpenInvites}
              >
                还有 {inviteCodes.length - 4} 条邀请，查看全部
              </Button>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
