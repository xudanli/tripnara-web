import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GapDisplayPreferences, GapType } from '@/api/trip-planner';
import { GAP_TYPE_OPTIONS } from '@/utils/gap-utils';

interface GapDisplayControlProps {
  preferences: GapDisplayPreferences;
  onPreferencesChange: (preferences: Partial<GapDisplayPreferences>) => void;
  tripId?: string;
  sessionId?: string;
}

export function GapDisplayControl({
  preferences,
  onPreferencesChange,
}: GapDisplayControlProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const handleToggleType = (type: GapType) => {
    const currentTypes = preferences.filterTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    onPreferencesChange({ filterTypes: newTypes });
  };

  const handleSelectAll = () => {
    onPreferencesChange({ filterTypes: GAP_TYPE_OPTIONS.map(o => o.value) });
  };

  const handleClearAll = () => {
    onPreferencesChange({ filterTypes: [] });
  };

  const selectedCount = preferences.filterTypes?.length || 0;
  const allSelected = selectedCount === GAP_TYPE_OPTIONS.length;

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
      {/* 收起/展开按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPreferencesChange({ collapsed: !preferences.collapsed })}
        className="h-8"
      >
        {preferences.collapsed ? (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            展开
          </>
        ) : (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            收起
          </>
        )}
      </Button>

      {/* 优先级过滤开关 */}
      <div className="flex items-center gap-2 px-2">
        <Checkbox
          id="show-only-critical"
          checked={preferences.showOnlyCritical}
          onCheckedChange={(checked) => 
            onPreferencesChange({ showOnlyCritical: checked === true })
          }
        />
        <label
          htmlFor="show-only-critical"
          className="text-sm cursor-pointer select-none"
        >
          只显示重要缺口
        </label>
      </div>

      {/* 类型过滤 */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-4 w-4 mr-1" />
            类型过滤
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-medium">选择类型</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleSelectAll}
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleClearAll}
                >
                  清空
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {GAP_TYPE_OPTIONS.map(option => {
                const isSelected = preferences.filterTypes?.includes(option.value) ?? false;
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleToggleType(option.value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleType(option.value)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {option.label}
                    </label>
                  </div>
                );
              })}
            </div>
            {selectedCount === 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                未选择任何类型，将显示所有缺口
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
