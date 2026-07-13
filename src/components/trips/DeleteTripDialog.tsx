import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface DeleteTripDialogImpact {
  totalDays?: number;
  totalItems?: number;
}

export interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  /** 展示用名称，默认使用 destination */
  tripLabel?: string;
  impact?: DeleteTripDialogImpact;
  deleting?: boolean;
  onConfirm: (confirmText: string) => void | Promise<void>;
}

const IMPACT_ITEMS = [
  '全部行程安排、时间轴与行程项',
  '预算记录、约束条件与决策日志',
  '协作者权限、分享链接、收藏与点赞',
  '上传的文件与行程附件',
  'AI 自动化配置与活动记录',
] as const;

export function DeleteTripDialog({
  open,
  onOpenChange,
  destination,
  tripLabel,
  impact,
  deleting = false,
  onConfirm,
}: DeleteTripDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const displayName = tripLabel?.trim() || destination;
  const confirmOk = confirmText.trim().toUpperCase() === destination.trim().toUpperCase();

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const handleConfirm = () => {
    if (!confirmOk || deleting) return;
    void onConfirm(confirmText.trim());
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除行程</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p>
              您即将删除行程 <strong className="text-foreground">{displayName}</strong>
              {tripLabel && tripLabel !== destination ? (
                <span className="text-muted-foreground">（{destination}）</span>
              ) : null}
              。此操作<strong className="text-foreground">不可恢复</strong>，请谨慎操作。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border border-gate-reject-border bg-gate-reject/10 px-3 py-2.5',
              'flex gap-2.5 text-sm text-muted-foreground',
            )}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gate-reject-foreground" />
            <p className="leading-relaxed">
              删除后，该行程的所有数据将从系统中永久移除，团队成员将无法再访问，且无法通过任何方式恢复。
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">将一并删除的内容包括：</p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
              {impact?.totalDays != null && impact.totalDays > 0 ? (
                <li>
                  {impact.totalDays} 天行程安排
                  {impact.totalItems != null && impact.totalItems > 0
                    ? `、${impact.totalItems} 个行程项`
                    : ''}
                </li>
              ) : impact?.totalItems != null && impact.totalItems > 0 ? (
                <li>{impact.totalItems} 个行程项</li>
              ) : null}
              {IMPACT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <Label htmlFor="delete-trip-confirm-text" className="text-sm font-medium">
              请输入目的地国家代码{' '}
              <strong className="text-foreground">{destination}</strong> 以确认删除：
            </Label>
            <Input
              id="delete-trip-confirm-text"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={destination}
              className="uppercase"
              disabled={deleting}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmOk && !deleting) handleConfirm();
              }}
            />
            {confirmText && !confirmOk ? (
              <p className="text-sm text-gate-reject-foreground">
                确认文字不匹配，请输入「{destination}」
              </p>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={deleting || !confirmOk}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                删除中…
              </>
            ) : (
              '确认删除'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
