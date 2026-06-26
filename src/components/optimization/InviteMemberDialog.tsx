/**
 * 邀请成员对话框
 *
 * 生成邀请链接、复制链接、查看已有邀请
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Copy, Link2, Loader2 } from 'lucide-react';
import { teamApi } from '@/api/optimization-v2';
import type { CreateTeamInviteRequest, TeamInviteItem } from '@/types/optimization-v2';

export interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  tripId?: string;
  onAddMember?: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  teamId,
  tripId,
  onAddMember,
}: InviteMemberDialogProps) {
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [invites, setInvites] = React.useState<TeamInviteItem[]>([]);
  const [_loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const loadInvites = React.useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await teamApi.listInvites(teamId);
      const list = res.invites ?? [];
      setInvites(list);
      if (list.length > 0) {
        setInviteUrl(list[0].inviteUrl);
      } else {
        setInviteUrl(null);
      }
    } catch {
      setInvites([]);
      setInviteUrl(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    if (open && teamId) {
      loadInvites();
    }
  }, [open, teamId, loadInvites]);

  const handleCreate = async () => {
    if (!teamId) return;
    setCreating(true);
    try {
      const req: CreateTeamInviteRequest = { expiresInDays: 7, maxUses: 0 };
      if (tripId) req.tripId = tripId;
      const res = await teamApi.createInvite(teamId, req);
      setInviteUrl(res.inviteUrl);
      setInvites((prev) => [
        { inviteToken: res.inviteToken, inviteUrl: res.inviteUrl, expiresAt: res.expiresAt },
        ...prev,
      ]);
      toast.success('邀请链接已生成');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || '生成链接失败');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success('已复制到剪贴板'),
      () => toast.error('复制失败')
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>邀请成员加入团队</DialogTitle>
          <DialogDescription>
            通过链接邀请同行者加入团队。加入后可查看行程、参与协商。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!inviteUrl ? (
            <Button
              className="w-full gap-2"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {creating ? '生成中...' : '生成邀请链接'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>邀请链接</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(inviteUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleCopy(inviteUrl)}>
                <Copy className="h-4 w-4 mr-2" />
                复制链接
              </Button>
            </div>
          )}

          {invites.length > 0 && invites.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">已有邀请</Label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {invites.slice(0, 3).map((inv) => (
                  <div
                    key={inv.inviteToken}
                    className="flex items-center justify-between gap-2 rounded border p-2 text-xs"
                  >
                    <span className="truncate flex-1">{inv.inviteUrl}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        setInviteUrl(inv.inviteUrl);
                        handleCopy(inv.inviteUrl);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onAddMember && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onAddMember();
                }}
              >
                <Users className="w-4 h-4" />
                手动添加成员
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
