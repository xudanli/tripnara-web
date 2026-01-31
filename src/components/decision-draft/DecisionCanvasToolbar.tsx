/**
 * 决策画布工具栏组件
 * 提供搜索、过滤、布局等功能
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, LayoutGrid, Network, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionStep, GateStatus } from '@/types/decision-draft';
import { normalizeGateStatus } from '@/lib/gate-status';

export type LayoutType = 'grid' | 'hierarchical' | 'force';

export interface DecisionCanvasToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: GateStatus | 'all';
  onStatusFilterChange: (status: GateStatus | 'all') => void;
  typeFilter: string | 'all';
  onTypeFilterChange: (type: string | 'all') => void;
  layoutType: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  filteredCount: number;
  totalCount: number;
  className?: string;
}

export default function DecisionCanvasToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  layoutType,
  onLayoutChange,
  filteredCount,
  totalCount,
  className,
}: DecisionCanvasToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      {/* 搜索和主要操作 */}
      <div className="flex items-center gap-2">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索决策节点..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 布局切换 */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={layoutType === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onLayoutChange('grid')}
            className="h-8"
            title="网格布局"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={layoutType === 'hierarchical' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onLayoutChange('hierarchical')}
            className="h-8"
            title="层次布局"
          >
            <Network className="w-4 h-4" />
          </Button>
        </div>

        {/* 过滤按钮 */}
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          过滤
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Badge variant="secondary" className="ml-2">
              {[statusFilter !== 'all' ? 1 : 0, typeFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* 过滤面板 */}
      {showFilters && (
        <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
          {/* 状态过滤 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">状态：</label>
            <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as GateStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="ALLOW">通过</SelectItem>
                <SelectItem value="NEED_CONFIRM">需确认</SelectItem>
                <SelectItem value="SUGGEST_REPLACE">建议替换</SelectItem>
                <SelectItem value="REJECT">拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 类型过滤 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">类型：</label>
            <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="transport-decision">交通决策</SelectItem>
                <SelectItem value="accommodation-decision">住宿决策</SelectItem>
                <SelectItem value="poi-selection">POI选择</SelectItem>
                <SelectItem value="budget-decision">预算决策</SelectItem>
                <SelectItem value="safety-decision">安全决策</SelectItem>
                <SelectItem value="pace-decision">节奏决策</SelectItem>
                <SelectItem value="timing-decision">时间决策</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 清除过滤 */}
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onStatusFilterChange('all');
                onTypeFilterChange('all');
              }}
            >
              <X className="w-4 h-4 mr-1" />
              清除
            </Button>
          )}

          {/* 结果统计 */}
          <div className="ml-auto text-sm text-muted-foreground">
            显示 {filteredCount} / {totalCount} 个节点
          </div>
        </div>
      )}
    </div>
  );
}
