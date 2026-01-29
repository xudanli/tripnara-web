import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, Package, X } from 'lucide-react';

interface ReadinessDrawerActionsProps {
  onRefresh: () => void;
  onGeneratePackingList: () => void;
  onClose: () => void;
  refreshing: boolean;
  generatingPackingList: boolean;
}

export default function ReadinessDrawerActions({
  onRefresh,
  onGeneratePackingList,
  onClose,
  refreshing,
  generatingPackingList,
}: ReadinessDrawerActionsProps) {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-1"
        >
          {refreshing ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              <span>刷新中...</span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>刷新</span>
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onGeneratePackingList}
          disabled={generatingPackingList}
          className="flex-1"
        >
          {generatingPackingList ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <Package className="mr-2 h-4 w-4" />
              <span>生成打包清单</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
