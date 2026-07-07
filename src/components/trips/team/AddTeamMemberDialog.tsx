import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TeamMember } from '@/types/optimization-v2';
import { resolveHttpErrorUserMessage } from '@/types/http-error';
import {
  buildPlaceholderMemberFromEmail,
  isValidEmail,
  resolveTeamMemberByEmail,
  type TeamMemberEmailResolveResult,
} from '@/lib/team-member-from-email';

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (member: TeamMember, email?: string) => void | Promise<void>;
  onInvite?: () => void;
  existingMemberUserIds?: string[];
  existingMemberEmails?: string[];
}

export default function AddTeamMemberDialog({
  open,
  onOpenChange,
  onAdd,
  onInvite,
  existingMemberUserIds = [],
}: AddTeamMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [lookupState, setLookupState] = useState<TeamMemberEmailResolveResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setLookupState(null);
    setSearching(false);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleLookup = async () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    setSearching(true);
    setLookupState(null);
    try {
      const result = await resolveTeamMemberByEmail(trimmed);
      setLookupState(result);
    } catch (err: unknown) {
      toast.error(resolveHttpErrorUserMessage(err, '查找用户失败'));
    } finally {
      setSearching(false);
    }
  };

  const handleAddResolved = async (member: TeamMember, preferencesLoaded: boolean) => {
    if (existingMemberUserIds.includes(member.userId)) {
      toast.error('该成员已在团队中');
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(member, email.trim());
      if (preferencesLoaded) {
        toast.success(`已添加 ${member.displayName}，偏好信息已同步`);
      } else {
        toast.success(`已添加 ${member.displayName}`);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(resolveHttpErrorUserMessage(err, '添加成员失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPlaceholder = async () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return;
    const member = buildPlaceholderMemberFromEmail(trimmed);
    setSubmitting(true);
    try {
      await onAdd(member, trimmed);
      toast.success(`已添加 ${member.displayName}（未注册账号，使用默认偏好）`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(resolveHttpErrorUserMessage(err, '添加成员失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const foundMember = lookupState?.status === 'found' ? lookupState.member : undefined;
  const isNotFound = lookupState?.status === 'not_found';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加成员</DialogTitle>
          <DialogDescription>
            输入同行者的注册邮箱，系统将尝试读取其旅行偏好
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="member-email">邮箱账号</Label>
            <div className="flex gap-2">
              <Input
                id="member-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLookupState(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleLookup();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={searching || !email.trim()}
                onClick={() => void handleLookup()}
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '查找'}
              </Button>
            </div>
          </div>

          {foundMember ? (
            <Alert className="border-gate-allow-border bg-gate-allow/80 dark:bg-gate-allow/20">
              <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground" />
              <AlertDescription className="text-sm">
                找到用户 <span className="font-medium">{foundMember.displayName}</span>
                {lookupState?.preferencesLoaded
                  ? '，偏好信息已读取'
                  : '，该用户暂无已学习的偏好记录'}
              </AlertDescription>
            </Alert>
          ) : null}

          {isNotFound ? (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm space-y-2">
                <p>无法读取该用户偏好信息：该邮箱尚未注册 TripNARA 账号。</p>
                <p className="text-xs text-muted-foreground">
                  建议发送邀请链接让对方注册后加入；也可先以占位成员加入（使用系统默认偏好）。
                </p>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
          {foundMember ? (
            <Button
              className="w-full gap-2"
              disabled={submitting}
              onClick={() => void handleAddResolved(foundMember, lookupState?.preferencesLoaded ?? false)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              确认添加
            </Button>
          ) : null}

          {isNotFound ? (
            <>
              {onInvite ? (
                <Button
                  type="button"
                  className="w-full"
                  variant="default"
                  onClick={() => {
                    onOpenChange(false);
                    onInvite();
                  }}
                >
                  发送邀请链接
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => void handleAddPlaceholder()}
              >
                仍添加为占位成员
              </Button>
            </>
          ) : null}

          {!foundMember && !isNotFound ? (
            <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
