import { useState } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateGate1Invitation, useGate1ParticipantsProgress, useRemindGate1Participant } from '@/hooks/useGate1';
import { gate1ParticipantStatusLabel } from '@/lib/gate1-display';
import { trackGate1InvitationSent } from '@/utils/gate1-analytics';
import { Badge } from '@/components/ui/badge';

interface Gate1ParticipantInvitePanelProps {
  projectId: string;
}

export function Gate1ParticipantInvitePanel({ projectId }: Gate1ParticipantInvitePanelProps) {
  const { data: progress, isLoading } = useGate1ParticipantsProgress(projectId);
  const createInvitation = useCreateGate1Invitation(projectId);
  const remindParticipant = useRemindGate1Participant(projectId);
  const [displayName, setDisplayName] = useState('');
  const [contactHint, setContactHint] = useState('');
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!displayName.trim()) {
      toast.error('请输入成员昵称');
      return;
    }
    try {
      const res = await createInvitation.mutateAsync({
        displayName: displayName.trim(),
        contactHint: contactHint.trim() || undefined,
        expiresInDays: 14,
      });
      setLastInviteUrl(res.fullInviteUrl);
      trackGate1InvitationSent({
        projectId,
        participantId: res.participant.id,
      });
      toast.success('邀请已创建');
      setDisplayName('');
      setContactHint('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建邀请失败');
    }
  };

  const copyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">邀请成员</CardTitle>
          <CardDescription>
            每名成员独立链接。顾问仅可见进度与状态，不可见未授权私密内容。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">昵称 *</Label>
              <Input
                id="invite-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="成员 A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-contact">联系方式提示（可选）</Label>
              <Input
                id="invite-contact"
                value={contactHint}
                onChange={(e) => setContactHint(e.target.value)}
                placeholder="微信昵称"
              />
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => void handleInvite()}
            disabled={createInvitation.isPending}
          >
            <UserPlus className="h-4 w-4" />
            生成邀请链接
          </Button>
          {lastInviteUrl && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center">
              <code className="flex-1 break-all text-xs">{lastInviteUrl}</code>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void copyInvite(lastInviteUrl)}>
                <Copy className="h-3.5 w-3.5" />
                复制
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            成员进度
            {progress != null && (
              <Badge variant="secondary">
                完成率 {Math.round((progress.completionRate ?? 0) * 100)}%
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">加载中…</p>}
          {!isLoading && (progress?.participants?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">尚未邀请成员</p>
          )}
          {(progress?.participants?.length ?? 0) > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress!.participants.map((p) => (
                  <TableRow key={p.id ?? p.displayName}>
                    <TableCell>{p.displayName}</TableCell>
                    <TableCell>{gate1ParticipantStatusLabel(p.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {p.id && p.status !== 'SUBMITTED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={remindParticipant.isPending}
                          onClick={() => {
                            void remindParticipant.mutateAsync(p.id!).then((res) => {
                              if (res.sent) toast.success('催办已发送');
                              else toast.info(res.reason ?? '本次未发送');
                            }).catch((e) => {
                              toast.error(e instanceof Error ? e.message : '催办失败');
                            });
                          }}
                        >
                          催办
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
