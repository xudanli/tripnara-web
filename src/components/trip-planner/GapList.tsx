import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  X,
  Clock,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GapDisplayPreferences, ResponseItineraryGap, GapType } from '@/api/trip-planner';
import { getGapTypeLabel } from '@/utils/gap-utils';

interface GapListProps {
  gaps: ResponseItineraryGap[];
  preferences: GapDisplayPreferences;
  selectedGaps: string[];
  onSelectGaps: (gapIds: string[]) => void;
  onIgnoreGap: (gapId: string, gapType: GapType) => Promise<void>;
  onIgnoreGapsBatch: (gapIds: string[]) => Promise<void>;
  onUnignoreGap: (gapId: string) => Promise<void>;
  onUnignoreGapsBatch: (gapIds: string[]) => Promise<void>;
  tripId?: string;
}

export function GapList({
  gaps,
  preferences,
  selectedGaps,
  onSelectGaps,
  onIgnoreGap,
  onIgnoreGapsBatch,
  onUnignoreGap,
  onUnignoreGapsBatch,
}: GapListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // 应用用户偏好过滤（前端双重保险）
  const filteredGaps = useMemo(() => {
    let result = gaps;

    // 优先级过滤
    if (preferences.showOnlyCritical) {
      result = result.filter(g => g.severity === 'CRITICAL');
    }

    // 类型过滤
    if (preferences.filterTypes && preferences.filterTypes.length > 0) {
      result = result.filter(g => preferences.filterTypes.includes(g.type));
    }

    return result;
  }, [gaps, preferences]);

  const handleToggleSelect = (gapId: string) => {
    if (selectedGaps.includes(gapId)) {
      onSelectGaps(selectedGaps.filter(id => id !== gapId));
    } else {
      onSelectGaps([...selectedGaps, gapId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedGaps.length === filteredGaps.length) {
      onSelectGaps([]);
    } else {
      onSelectGaps(filteredGaps.map(g => g.id));
    }
  };

  const handleIgnoreGap = async (gapId: string, gapType: GapType) => {
    setLoading(gapId);
    try {
      await onIgnoreGap(gapId, gapType);
      toast.success('缺口已忽略');
      onSelectGaps(selectedGaps.filter(id => id !== gapId));
    } catch (error: any) {
      toast.error(error.message || '忽略失败');
    } finally {
      setLoading(null);
    }
  };

  const handleIgnoreBatch = async () => {
    if (selectedGaps.length === 0) return;
    
    setLoading('batch');
    try {
      await onIgnoreGapsBatch(selectedGaps);
      toast.success(`成功忽略 ${selectedGaps.length} 个缺口`);
      onSelectGaps([]);
    } catch (error: any) {
      toast.error(error.message || '批量忽略失败');
    } finally {
      setLoading(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'SUGGESTED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'OPTIONAL':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '重要';
      case 'SUGGESTED':
        return '建议';
      case 'OPTIONAL':
        return '可选';
      default:
        return severity;
    }
  };

  if (preferences.collapsed) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg border">
        有 {filteredGaps.length} 个待完善项（已收起）
      </div>
    );
  }

  if (filteredGaps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg border text-center">
        暂无待完善的缺口
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 批量操作栏 */}
      {selectedGaps.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-800">
            已选择 {selectedGaps.length} 个缺口
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleIgnoreBatch}
              disabled={loading === 'batch'}
              className="h-7 text-xs"
            >
              {loading === 'batch' ? '处理中...' : `忽略选中 (${selectedGaps.length})`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectGaps([])}
              className="h-7 text-xs"
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* 全选控制 */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedGaps.length === filteredGaps.length && filteredGaps.length > 0}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          全选 ({filteredGaps.length})
        </span>
      </div>

      {/* 缺口列表 */}
      <div className="space-y-2">
        {filteredGaps.map(gap => {
          const isSelected = selectedGaps.includes(gap.id);
          const isLoading = loading === gap.id;

          return (
            <Card
              key={gap.id}
              className={cn(
                'transition-all',
                isSelected && 'ring-2 ring-blue-500',
                getSeverityColor(gap.severity)
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* 多选框 */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSelect(gap.id)}
                    className="mt-1"
                  />

                  {/* 缺口内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getGapTypeLabel(gap.type)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', getSeverityColor(gap.severity))}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {getSeverityLabel(gap.severity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        第 {gap.dayNumber} 天
                      </span>
                      {gap.timeSlot && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {gap.timeSlot.start} - {gap.timeSlot.end}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1">{gap.description}</p>
                    {gap.context && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {gap.context.beforeItem && (
                          <div>前一项: {gap.context.beforeItem}</div>
                        )}
                        {gap.context.afterItem && (
                          <div>后一项: {gap.context.afterItem}</div>
                        )}
                        {gap.context.nearbyLocation && (
                          <div>附近: {gap.context.nearbyLocation}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 忽略按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleIgnoreGap(gap.id, gap.type)}
                    disabled={isLoading}
                    className="h-7 text-xs"
                  >
                    {isLoading ? (
                      '处理中...'
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        忽略
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
