import { useState } from 'react';
import { tripsApi } from '@/api/trips';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check } from 'lucide-react';

interface ShareTripDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTripDialog({ tripId, open, onOpenChange }: ShareTripDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<SharePermission>('VIEW');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateShare = async () => {
    setLoading(true);
    setError(null);
    setShareUrl(null);

    try {
      const shareData = {
        permission,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };
      
      const result = await tripsApi.createShare(tripId, shareData);
      
      // 构建完整的分享 URL
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      setShareUrl(fullUrl);
    } catch (err: any) {
      setError(err.message || '创建分享链接失败');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>分享行程</DialogTitle>
          <DialogDescription>
            {shareUrl
              ? '分享链接已生成，您可以复制链接分享给其他人'
              : '创建分享链接，设置权限和过期时间'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {shareUrl ? (
            // 显示分享链接
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
                <p className="font-medium">权限：{permission === 'VIEW' ? '仅查看' : '可编辑'}</p>
                {expiresAt && (
                  <p className="mt-1">
                    过期时间：{new Date(expiresAt).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // 分享设置表单
            <>
              <div className="space-y-2">
                <Label htmlFor="permission">分享权限</Label>
                <Select
                  value={permission}
                  onValueChange={(value) => setPermission(value as SharePermission)}
                >
                  <SelectTrigger id="permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW">仅查看</SelectItem>
                    <SelectItem value="EDIT">可编辑</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {permission === 'VIEW'
                    ? '查看者只能查看行程内容，不能进行修改'
                    : '编辑者可以查看和修改行程内容'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">过期时间（可选）</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  如果不设置过期时间，链接将永久有效
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

