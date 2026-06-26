import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReadinessDrawerActionsProps {
  onRefresh: () => void;
  onGeneratePackingList: () => void;
  refreshing: boolean;
  generatingPackingList: boolean;
}

export default function ReadinessDrawerActions({
  onRefresh,
  onGeneratePackingList,
  refreshing,
  generatingPackingList,
}: ReadinessDrawerActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 pb-3 pt-1 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 h-9 px-3 text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
        >
          {refreshing ? (
            <>
              <Spinner className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">
                {t('dashboard.readiness.page.drawer.actions.refreshing', '检查中…')}
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">
                {t('dashboard.readiness.page.drawer.actions.recheck', '重新检查')}
              </span>
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={onGeneratePackingList}
          disabled={generatingPackingList}
          className="flex-1 h-9 bg-black hover:bg-black/90 text-white shadow-sm"
        >
          {generatingPackingList ? (
            <>
              <Spinner className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {t('dashboard.readiness.page.drawer.actions.generating', '生成中…')}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {t('dashboard.readiness.page.drawer.actions.generatePackingList', '生成打包清单')}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
