import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { inTripSplitApi } from '@/api/in-trip-split';
import { useInTripSplitSession } from '@/hooks/useInTripSplit';
import {
  SPLIT_UI_COPY,
  sharedNodeTypeLabel,
  splitSessionStatusLabel,
} from '@/lib/in-trip-split';

interface InTripSplitSessionSheetProps {
  tripId: string;
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  memberNameById?: Record<string, string>;
  onUpdated?: () => void;
}

export function InTripSplitSessionSheet({
  tripId,
  sessionId,
  open,
  onOpenChange,
  currentUserId,
  memberNameById = {},
  onUpdated,
}: InTripSplitSessionSheetProps) {
  const { detail, loading, error, reload } = useInTripSplitSession(
    open ? tripId : null,
    open ? sessionId : null,
  );
  const [shareText, setShareText] = useState('');
  const [shareGroupId, setShareGroupId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [reunionUpdating, setReunionUpdating] = useState(false);

  const myGroup = detail?.groups.find((g) =>
    currentUserId ? g.memberIds.includes(currentUserId) : false,
  );

  const handleShare = async () => {
    if (!tripId || !sessionId || !shareText.trim() || !shareGroupId) return;
    try {
      setSharing(true);
      await inTripSplitApi.shareExperience(tripId, sessionId, {
        groupId: shareGroupId,
        text: shareText.trim(),
      });
      toast.success('已分享给全团');
      setShareText('');
      await reload();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '分享失败');
    } finally {
      setSharing(false);
    }
  };

  const handleReunion = async (status: 'en_route' | 'arrived' | 'completed') => {
    if (!tripId || !sessionId) return;
    try {
      setReunionUpdating(true);
      await inTripSplitApi.updateReunion(tripId, sessionId, { status });
      toast.success('汇合状态已更新');
      await reload();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setReunionUpdating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{SPLIT_UI_COPY.proposeTitle}</SheetTitle>
          <SheetDescription>{SPLIT_UI_COPY.proposeDescription}</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        {error && <p className="text-sm text-destructive py-4">{error}</p>}

        {detail && !loading && (
          <div className="mt-4 space-y-4 pb-6">
            <Badge variant="outline">{splitSessionStatusLabel(detail.status)}</Badge>

            <div className="space-y-3">
              {detail.groups.map((group) => (
                <div key={group.groupId} className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.memberIds
                      .map((id) => memberNameById[id] ?? id.slice(0, 6))
                      .join('、')}
                  </p>
                  {group.route.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {group.route.map((r) => (
                        <li key={r.id}>· {r.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {detail.sharedNodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">汇合节点</p>
                {detail.sharedNodes.map((node) => (
                  <div key={node.nodeId} className="rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">{node.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {sharedNodeTypeLabel(node.type)}
                      {node.time ? ` · ${node.time}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {detail.experienceSharing && detail.experienceSharing.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">组内分享</p>
                {detail.experienceSharing.map((s, i) => (
                  <div key={`${s.groupId}-${i}`} className="text-sm rounded-md bg-muted/40 px-3 py-2">
                    {s.text}
                  </div>
                ))}
              </div>
            )}

            {detail.status === 'active' && (
              <>
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs">分享见闻</Label>
                  <select
                    className="w-full h-9 rounded-md border px-2 text-sm"
                    value={shareGroupId || myGroup?.groupId || ''}
                    onChange={(e) => setShareGroupId(e.target.value)}
                  >
                    {detail.groups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    placeholder={SPLIT_UI_COPY.sharePlaceholder}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={sharing || !shareText.trim()}
                    onClick={handleShare}
                  >
                    {sharing ? '发送中…' : '发送到全团'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reunionUpdating}
                    onClick={() => handleReunion('en_route')}
                  >
                    前往汇合
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reunionUpdating}
                    onClick={() => handleReunion('arrived')}
                  >
                    已到达
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={reunionUpdating}
                    onClick={() => handleReunion('completed')}
                  >
                    汇合完成
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
