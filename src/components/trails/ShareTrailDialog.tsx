import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeDirectionShareApi, toFullShareUrl } from '@/api/route-direction-share';
import { useAuth } from '@/hooks/useAuth';
import type { SharePermission } from '@/types/trip';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Check } from 'lucide-react';

interface ShareTrailDialogProps {
  routeDirectionId: number;
  trailName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTrailDialog({
  routeDirectionId,
  trailName,
  open,
  onOpenChange,
}: ShareTrailDialogProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<SharePermission>('VIEW');
  const [expiresAt, setExpiresAt] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateShare = async () => {
    if (!isAuthenticated || !sessionStorage.getItem('accessToken')) {
      setError('请先登录后再创建分享链接');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    setShareUrl(null);

    try {
      const result = await routeDirectionShareApi.createShare(routeDirectionId, {
        permission,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setShareUrl(toFullShareUrl(result.shareUrl));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '创建分享链接失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setExpiresAt('');
    setPermission('VIEW');
    onOpenChange(false);
  };

  const title = trailName ? `分享路线：${trailName}` : '分享徒步路线';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {shareUrl
              ? '分享链接已生成，接收方可按权限查看路线详情'
              : '创建带权限与过期时间的分享链接'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {shareUrl ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>分享链接</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    title="复制链接"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-medium">
                  权限：{permission === 'VIEW' ? '仅查看' : '可编辑'}
                </p>
                {expiresAt ? (
                  <p className="mt-1">
                    过期时间：{new Date(expiresAt).toLocaleString('zh-CN')}
                  </p>
                ) : (
                  <p className="mt-1 text-blue-700">未设置过期时间</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="trail-share-permission">分享权限</Label>
                <Select
                  value={permission}
                  onValueChange={(value) => setPermission(value as SharePermission)}
                >
                  <SelectTrigger id="trail-share-permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW">仅查看</SelectItem>
                    <SelectItem value="EDIT">可编辑</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {permission === 'VIEW'
                    ? '查看者只能浏览路线详情与地图'
                    : '编辑者可在登录后基于该路线创建徒步计划（后续能力由后端定义）'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trail-share-expires">过期时间（可选）</Label>
                <Input
                  id="trail-share-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  不设置则链接长期有效（由后端策略决定）
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {shareUrl ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                关闭
              </Button>
              <Button type="button" variant="outline" onClick={handleCopyLink}>
                {copied ? '已复制' : '复制链接'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                取消
              </Button>
              <Button type="button" onClick={handleCreateShare} disabled={loading}>
                {loading ? '创建中...' : '创建分享链接'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
