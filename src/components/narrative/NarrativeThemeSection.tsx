/**
 * Plan Studio · 叙事主题入口（横幅 + 弹窗）
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Pencil, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useNarrativeTheme, useNarrativeThemeMutations } from '@/hooks/useNarrativeTheme';
import { isNarrativeThemeV1Enabled } from '@/lib/narrative-feature';
import {
  NARRATIVE_ARC_LABELS,
  stripThemeTitleQuotes,
} from '@/lib/narrative-engine-display.util';
import {
  isNarrativeFeatureDisabledError,
  resolveNarrativeThemeErrorMessage,
} from '@/lib/narrative-theme-error.util';
import { cn } from '@/lib/utils';
import { NarrativeThemeDialog } from './NarrativeThemeDialog';

interface NarrativeThemeSectionProps {
  tripId: string;
  /** 从创建流程进入时自动弹出一次 */
  promptOnCreate?: boolean;
  className?: string;
}

export function NarrativeThemeSection({
  tripId,
  promptOnCreate = false,
  className,
}: NarrativeThemeSectionProps) {
  const enabled = isNarrativeThemeV1Enabled();
  const { data, isLoading, isError, error, refetch } = useNarrativeTheme(tripId, enabled);
  const { clearTheme } = useNarrativeThemeMutations(tripId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const autoPromptedRef = useRef(false);

  useEffect(() => {
    if (
      !enabled ||
      !promptOnCreate ||
      autoPromptedRef.current ||
      isLoading ||
      isError
    ) {
      return;
    }
    if (!data?.theme) {
      autoPromptedRef.current = true;
      setDialogOpen(true);
    }
  }, [enabled, promptOnCreate, isLoading, isError, data?.theme]);

  if (!enabled) {
    return null;
  }

  if (isError && isNarrativeFeatureDisabledError(error)) {
    return null;
  }

  const theme = data?.theme;

  const handleClear = async () => {
    try {
      await clearTheme.mutateAsync();
      toast.success('已移除旅行主题');
      refetch();
    } catch (err) {
      toast.error(resolveNarrativeThemeErrorMessage(err));
    }
  };

  return (
    <div className={cn('px-6 pb-2', className)}>
      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            加载叙事主题…
          </CardContent>
        </Card>
      ) : theme ? (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {stripThemeTitleQuotes(theme.title)}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {NARRATIVE_ARC_LABELS[theme.arcTemplate]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pl-6 sm:pl-0">{theme.tagline}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDialogOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                更换
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                disabled={clearTheme.isPending}
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-300/80 bg-white">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                为这次旅行选一个叙事主题
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                可选步骤：帮助后续文案与节奏更贴近你的状态，不影响路线安全裁决
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              开始选择
            </Button>
          </CardContent>
        </Card>
      )}

      <NarrativeThemeDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={() => refetch()}
      />
    </div>
  );
}
