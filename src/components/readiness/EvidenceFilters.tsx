/**
 * 证据过滤和排序控件组件
 * 
 * 符合 TripNARA 设计哲学：
 * - Clarity over Charm（清晰优先于讨喜）
 * - Evidence is the aesthetic（证据就是美学）
 * - Decision is a UI primitive（决策是 UI 原语）
 * 
 * 视觉原则：
 * - 使用设计 Token（cardVariants、buttonVariants）
 * - 克制使用颜色（主靠层级、描边、icon、标签）
 * - 信息层级清晰（过滤 → 排序 → 分组）
 */

import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/utils/design-tokens';
import type { EvidenceType } from '@/types/trip';

export interface EvidenceFiltersState {
  priority?: 'all' | 'high' | 'medium_and_high';
  type?: EvidenceType;
  day?: number;
  sortBy?: 'time' | 'importance' | 'relevance' | 'freshness' | 'quality';
  groupBy?: 'none' | 'importance' | 'type' | 'day';
}

interface EvidenceFiltersProps {
  filters: EvidenceFiltersState;
  onFiltersChange: (filters: EvidenceFiltersState) => void;
  availableDays?: number[]; // 可用的天数列表
  className?: string;
}

export default function EvidenceFilters({
  filters,
  onFiltersChange,
  availableDays,
  className,
}: EvidenceFiltersProps) {
  const { t } = useTranslation();

  // 更新单个过滤器
  const updateFilter = <K extends keyof EvidenceFiltersState>(
    key: K,
    value: EvidenceFiltersState[K] | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // 清除所有过滤器
  const clearFilters = () => {
    onFiltersChange({});
  };

  // 检查是否有活动的过滤器
  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof EvidenceFiltersState] !== undefined
  );

  return (
    <div className={cn('p-3 rounded-lg border', cardVariants.evidence, className)}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* 优先级过滤 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) =>
              updateFilter('priority', value === 'all' ? undefined : (value as 'high' | 'medium_and_high'))
            }
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder={t('dashboard.readiness.evidence.filters.priority', { defaultValue: '优先级' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('dashboard.readiness.evidence.filters.priorityAll', { defaultValue: '全部' })}
              </SelectItem>
              <SelectItem value="high">
                {t('dashboard.readiness.evidence.filters.priorityHigh', { defaultValue: '高优先级' })}
              </SelectItem>
              <SelectItem value="medium_and_high">
                {t('dashboard.readiness.evidence.filters.priorityMediumAndHigh', {
                  defaultValue: '中高优先级',
                })}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 类型过滤 */}
        <Select
          value={filters.type || 'all'}
          onValueChange={(value) => updateFilter('type', value === 'all' ? undefined : (value as EvidenceType))}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder={t('dashboard.readiness.evidence.filters.type', { defaultValue: '类型' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('dashboard.readiness.evidence.filters.typeAll', { defaultValue: '全部类型' })}
            </SelectItem>
            <SelectItem value="opening_hours">
              {t('dashboard.readiness.evidence.filters.typeOpeningHours', { defaultValue: '营业时间' })}
            </SelectItem>
            <SelectItem value="road_closure">
              {t('dashboard.readiness.evidence.filters.typeRoadClosure', { defaultValue: '道路封闭' })}
            </SelectItem>
            <SelectItem value="weather">
              {t('dashboard.readiness.evidence.filters.typeWeather', { defaultValue: '天气' })}
            </SelectItem>
            <SelectItem value="booking">
              {t('dashboard.readiness.evidence.filters.typeBooking', { defaultValue: '预订' })}
            </SelectItem>
            <SelectItem value="other">
              {t('dashboard.readiness.evidence.filters.typeOther', { defaultValue: '其他' })}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* 天数过滤 */}
        {availableDays && availableDays.length > 0 && (
          <Select
            value={filters.day?.toString() || 'all'}
            onValueChange={(value) => updateFilter('day', value === 'all' ? undefined : parseInt(value, 10))}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder={t('dashboard.readiness.evidence.filters.day', { defaultValue: '天数' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('dashboard.readiness.evidence.filters.dayAll', { defaultValue: '全部天数' })}
              </SelectItem>
              {availableDays.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {t('dashboard.readiness.evidence.filters.dayNumber', {
                    day,
                    defaultValue: '第 {{day}} 天',
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 排序方式 */}
        <Select
          value={filters.sortBy || 'time'}
          onValueChange={(value) => updateFilter('sortBy', value as EvidenceFiltersState['sortBy'])}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder={t('dashboard.readiness.evidence.filters.sortBy', { defaultValue: '排序' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">
              {t('dashboard.readiness.evidence.filters.sortByTime', { defaultValue: '按时间' })}
            </SelectItem>
            <SelectItem value="importance">
              {t('dashboard.readiness.evidence.filters.sortByImportance', { defaultValue: '按重要性' })}
            </SelectItem>
            <SelectItem value="relevance">
              {t('dashboard.readiness.evidence.filters.sortByRelevance', { defaultValue: '按相关性' })}
            </SelectItem>
            <SelectItem value="freshness">
              {t('dashboard.readiness.evidence.filters.sortByFreshness', { defaultValue: '按新鲜度' })}
            </SelectItem>
            <SelectItem value="quality">
              {t('dashboard.readiness.evidence.filters.sortByQuality', { defaultValue: '按质量' })}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* 清除过滤器按钮 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            {t('dashboard.readiness.evidence.filters.clear', { defaultValue: '清除' })}
          </Button>
        )}

        {/* 活动过滤器标签 */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.priority && filters.priority !== 'all' && (
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                {filters.priority === 'high'
                  ? t('dashboard.readiness.evidence.filters.priorityHigh', { defaultValue: '高优先级' })
                  : t('dashboard.readiness.evidence.filters.priorityMediumAndHigh', {
                      defaultValue: '中高优先级',
                    })}
              </Badge>
            )}
            {filters.type && (
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                {filters.type}
              </Badge>
            )}
            {filters.day && (
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                {t('dashboard.readiness.evidence.filters.dayNumber', {
                  day: filters.day,
                  defaultValue: '第 {{day}} 天',
                })}
              </Badge>
            )}
            {filters.sortBy && filters.sortBy !== 'time' && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                {t(`dashboard.readiness.evidence.filters.sortBy${filters.sortBy.charAt(0).toUpperCase() + filters.sortBy.slice(1)}`, {
                  defaultValue: filters.sortBy,
                })}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
