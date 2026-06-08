import { useState } from 'react';
import { Loader2, FileOutput } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { TemplateBackflowPreview } from '@/types/active-trip-decision-replay';
import type { ActiveTripViewerRole } from '@/types/active-trip-dashboard';
import { activeTripSubResourceApi } from '@/api/active-trip-subresources';
import { getTemplateBackflowCommitted } from '../lib/active-trip-context-store';

type TemplateBackflowPreviewPanelProps = {
  preview: TemplateBackflowPreview;
  tripId: string;
  viewerRole: ActiveTripViewerRole;
  className?: string;
};

/** 行后模板回流预览 + 队长 commit */
export function TemplateBackflowPreviewPanel({
  preview,
  tripId,
  viewerRole,
  className,
}: TemplateBackflowPreviewPanelProps) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [committed, setCommitted] = useState(() => getTemplateBackflowCommitted(tripId));

  if (!preview.canBackflow) return null;

  const handleCommit = async () => {
    setPending(true);
    try {
      const result = await activeTripSubResourceApi.commitTemplateBackflow(tripId, {
        note: note.trim() || undefined,
        skipIfExists: true,
      });
      if (result.alreadyCommitted) {
        toast.message('已提交过模板回流');
      } else {
        toast.success('模板范例已提交');
      }
      setCommitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('FORBIDDEN')) {
        toast.error('仅队长可提交模板回流');
      } else {
        toast.error('提交失败');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className={cn(
        'rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3.5 text-sm',
        className
      )}
      aria-label="模板回流预览"
    >
      <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
        <FileOutput className="h-4 w-4 text-muted-foreground" aria-hidden />
        模板回流预览
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{preview.previewTitleZh}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {preview.suggestedCatalogId && (
          <Badge variant="outline" className="text-[10px] font-normal">
            catalog · {preview.suggestedCatalogId}
          </Badge>
        )}
        {preview.anonymizedCrewSize != null && (
          <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
            匿名车队 {preview.anonymizedCrewSize} 人
          </Badge>
        )}
        {preview.taskCompletionRate != null && (
          <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
            任务完成率 {Math.round(preview.taskCompletionRate * 100)}%
          </Badge>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        {preview.derivedFields.itinerary_summary && (
          <div>
            <dt className="text-muted-foreground">itinerary_summary</dt>
            <dd className="mt-0.5 text-foreground">{preview.derivedFields.itinerary_summary}</dd>
          </div>
        )}
        {preview.derivedFields.captain_message && (
          <div>
            <dt className="text-muted-foreground">captain_message</dt>
            <dd className="mt-0.5 text-foreground">{preview.derivedFields.captain_message}</dd>
          </div>
        )}
      </dl>

      {viewerRole === 'captain' && !committed && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="提交备注（可选）"
            rows={2}
            className="text-sm"
          />
          <Button size="sm" disabled={pending} onClick={() => void handleCommit()}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            提交模板范例
          </Button>
        </div>
      )}

      {committed && (
        <p className="mt-2 text-xs text-muted-foreground">模板范例已提交（幂等）</p>
      )}
    </section>
  );
}
