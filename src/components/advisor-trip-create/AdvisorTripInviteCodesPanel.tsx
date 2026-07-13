import { useState } from 'react';
import { Copy, CheckCircle2, Link2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdvisorTripMemberInviteCode } from '@/types/advisor-trip-create';
import { cn } from '@/lib/utils';

interface AdvisorTripInviteCodesPanelProps {
  inviteCodes: AdvisorTripMemberInviteCode[];
  tripId?: string;
  onContinue?: () => void;
  continueLabel?: string;
  /** post-create：创建成功页；manage：协作中心查看/重发 */
  variant?: 'post-create' | 'manage';
  /** 是否可生成新的同行成员邀请（自由行） */
  allowGenerate?: boolean;
  generating?: boolean;
  onGenerate?: (count?: number) => void | Promise<void>;
  title?: string;
  description?: string;
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

export function AdvisorTripInviteCodesPanel({
  inviteCodes,
  tripId,
  onContinue,
  continueLabel = '进入规划工作台',
  variant = 'post-create',
  allowGenerate = false,
  generating = false,
  onGenerate,
  title,
  description,
  className,
}: AdvisorTripInviteCodesPanelProps) {
  const isManage = variant === 'manage';
  const [count, setCount] = useState(1);

  const resolvedTitle =
    title ??
    (isManage ? (
      '成员邀请链接'
    ) : (
      <>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        行程已创建
      </>
    ));

  const resolvedDescription =
    description ??
    (isManage
      ? '将邀请链接发送给出行同伴；对方接受后需完成行前偏好问卷。邀请码通常 14 天内有效。'
      : '已为各未绑定账号的干系人生成邀请码（14 天有效）。请按角色将链接或邀请码发送给对应人员。');

  if (isManage && inviteCodes.length === 0 && !allowGenerate) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{resolvedTitle}</CardTitle>
          <CardDescription>
            暂无待发送的邀请码。创建时若干系人已绑定账号则不会生成；已加入成员可在「团队与需求」查看偏好进度。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">{resolvedTitle}</CardTitle>
            <CardDescription>
              {resolvedDescription}
              {tripId ? ` 行程 ID：${tripId}` : null}
            </CardDescription>
          </div>
          {allowGenerate && onGenerate ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                数量
                <select
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={generating}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                disabled={generating}
                onClick={() => void onGenerate(count)}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                生成邀请链接
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {inviteCodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center">
              <Link2 className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="mt-2 text-xs font-medium text-foreground">还没有邀请链接</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                生成后即可复制链接发送给同行成员，对方填写行前需求问卷。
              </p>
              {allowGenerate && onGenerate ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 h-8 gap-1.5"
                  disabled={generating}
                  onClick={() => void onGenerate(1)}
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  生成第一条邀请链接
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>对象</TableHead>
                  <TableHead>邀请码</TableHead>
                  <TableHead className="hidden sm:table-cell">有效期</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inviteCodes.map((item) => (
                  <TableRow key={item.inviteCode}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-xs">{item.inviteCode}</code>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {item.expiresAt
                        ? new Date(item.expiresAt).toLocaleDateString()
                        : '14 天内有效'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => void copyText(item.inviteCode, '邀请码')}
                        >
                          <Copy className="h-3 w-3" />
                          码
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => void copyText(item.inviteUrl, '邀请链接')}
                        >
                          <Copy className="h-3 w-3" />
                          链
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {onContinue ? (
        <Button type="button" onClick={onContinue}>
          {continueLabel}
        </Button>
      ) : null}
    </div>
  );
}
