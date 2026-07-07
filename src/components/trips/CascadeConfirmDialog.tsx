import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { ItineraryRequiresConfirmation } from '@/lib/itinerary-cascade-confirm.util';
import { useTranslation } from 'react-i18next';

export interface CascadeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmation: ItineraryRequiresConfirmation | null;
  loading?: boolean;
  onConfirmAuto: () => void;
  onConfirmNone: () => void;
}

export default function CascadeConfirmDialog({
  open,
  onOpenChange,
  confirmation,
  loading = false,
  onConfirmAuto,
  onConfirmNone,
}: CascadeConfirmDialogProps) {
  const { t } = useTranslation();
  if (!confirmation) return null;

  const { message, warnings, cascadeImpact } = confirmation;
  const affectedCount = cascadeImpact?.affectedCount ?? 0;
  const affectedItems = cascadeImpact?.affectedItems ?? [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('itinerary.cascadeConfirm.title', { defaultValue: '确认时间调整' })}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              {affectedCount > 0 ? (
                <p>
                  {t('itinerary.cascadeConfirm.affectedSummary', {
                    defaultValue: '此修改将影响后续 {{count}} 个行程项。',
                    count: affectedCount,
                  })}
                </p>
              ) : null}

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                {message.replace(/确认继续[？?]?/g, '').trim()}
              </div>

              {warnings.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {warnings.map((w, i) => (
                    <li key={i}>{w.message ?? w.type ?? '警告'}</li>
                  ))}
                </ul>
              ) : null}

              {affectedItems.length > 0 ? (
                <div className="rounded-md border bg-muted/30 p-2">
                  <p className="mb-1.5 text-xs font-medium text-foreground">
                    {t('itinerary.cascadeConfirm.affectedItems', { defaultValue: '受影响行程' })}
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {affectedItems.map((item) => (
                      <li key={item.id} className="flex flex-col gap-0.5 border-b border-border/40 pb-1 last:border-0">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.delayMinutes > 0 ? (
                          <span className="text-muted-foreground">
                            {t('itinerary.cascadeConfirm.delay', {
                              defaultValue: '顺延 {{minutes}} 分钟',
                              minutes: item.delayMinutes,
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p>
                {t('itinerary.cascadeConfirm.chooseMode', {
                  defaultValue: '请选择处理方式：',
                })}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="mt-0" disabled={loading}>
            {t('common.cancel', { defaultValue: '取消' })}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="border-border text-muted-foreground hover:bg-muted/15"
            onClick={onConfirmNone}
          >
            {t('itinerary.cascadeConfirm.none', { defaultValue: '只调整当前项' })}
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirmAuto}>
            {loading
              ? t('common.saving', { defaultValue: '保存中…' })
              : t('itinerary.cascadeConfirm.auto', { defaultValue: '级联调整后续' })}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
