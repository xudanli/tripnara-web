import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTrailOfflineDownload } from '@/hooks/useTrailOfflineDownload';
import { formatPackSize } from '@/lib/build-trail-offline-pack';

type TrailOfflineDownloadButtonProps = {
  routeDirectionId: number;
  /** 仅图标按钮（卡片角标） */
  iconOnly?: boolean;
  className?: string;
  onSuccess?: () => void;
};

export function TrailOfflineDownloadButton({
  routeDirectionId,
  iconOnly = false,
  className,
  onSuccess,
}: TrailOfflineDownloadButtonProps) {
  const { isDownloaded, downloading, download, remove } =
    useTrailOfflineDownload(routeDirectionId);

  const handleClick = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (downloading) return;

    try {
      if (isDownloaded) {
        await remove();
        toast.success('已删除离线包');
        onSuccess?.();
        return;
      }
      const result = await download();
      const pack = result?.record;
      toast.success(
        result?.fromCache
          ? `「${pack?.nameCN}」离线包已就绪（缓存）`
          : `「${pack?.nameCN}」已保存到本机（约 ${formatPackSize(pack?.sizeBytes ?? 0)}）`
      );
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message || '离线下载失败');
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={className}
        disabled={downloading}
        title={isDownloaded ? '删除离线包' : '离线下载'}
        onClick={handleClick}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isDownloaded ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isDownloaded ? 'secondary' : 'outline'}
      size="sm"
      className={className}
      disabled={downloading}
      onClick={handleClick}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isDownloaded ? (
        <Trash2 className="h-4 w-4 mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {downloading ? '下载中…' : isDownloaded ? '删除离线包' : '离线下载'}
    </Button>
  );
}
