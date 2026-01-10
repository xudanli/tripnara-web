import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TrailDifficulty } from '@/types/trail';

export interface TrailFilterState {
  difficulty?: TrailDifficulty;
  distanceRange: [number, number];
  elevationRange: [number, number];
  timeRange: [number, number];
  loopType?: 'loop' | 'out-and-back' | 'point-to-point';
  riskTags: string[];
}

interface TrailFilterPanelProps {
  filters: TrailFilterState;
  onFiltersChange: (filters: TrailFilterState) => void;
  onReset: () => void;
  onApply: () => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '简单' },
  { value: 'moderate', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'expert', label: '专家' },
] as const;

const LOOP_TYPE_OPTIONS = [
  { value: 'loop', label: '环线' },
  { value: 'out-and-back', label: '往返' },
  { value: 'point-to-point', label: '穿越' },
] as const;

const RISK_TAG_OPTIONS = [
  { value: 'exposure', label: '暴露山脊' },
  { value: 'river_crossing', label: '涉水' },
  { value: 'snow', label: '雪地' },
  { value: 'rockfall', label: '落石' },
  { value: 'signal_blackout', label: '信号差' },
  { value: 'avalanche', label: '雪崩' },
] as const;

export function TrailFilterPanel({
  filters,
  onFiltersChange,
  onReset,
  onApply,
}: TrailFilterPanelProps) {
  const handleDifficultyChange = (value: string) => {
    onFiltersChange({
      ...filters,
      difficulty: value as TrailDifficulty,
    });
  };

  const handleLoopTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      loopType: value as 'loop' | 'out-and-back' | 'point-to-point',
    });
  };

  const handleRiskTagToggle = (tag: string) => {
    const newTags = filters.riskTags.includes(tag)
      ? filters.riskTags.filter((t) => t !== tag)
      : [...filters.riskTags, tag];
    onFiltersChange({
      ...filters,
      riskTags: newTags,
    });
  };

  return (
    <div className="space-y-6">
      {/* 难度 */}
      <div>
        <Label>难度</Label>
        <Select value={filters.difficulty || ''} onValueChange={handleDifficultyChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择难度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部</SelectItem>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 距离 */}
      <div>
        <Label>距离: {filters.distanceRange[0]} - {filters.distanceRange[1]} km</Label>
        <Slider
          value={filters.distanceRange}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, distanceRange: v as [number, number] })
          }
          min={0}
          max={100}
          step={1}
          className="mt-2"
        />
      </div>

      {/* 爬升 */}
      <div>
        <Label>爬升: {filters.elevationRange[0]} - {filters.elevationRange[1]} m</Label>
        <Slider
          value={filters.elevationRange}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, elevationRange: v as [number, number] })
          }
          min={0}
          max={5000}
          step={50}
          className="mt-2"
        />
      </div>

      {/* 耗时 */}
      <div>
        <Label>预计耗时: {filters.timeRange[0]} - {filters.timeRange[1]} 小时</Label>
        <Slider
          value={filters.timeRange}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, timeRange: v as [number, number] })
          }
          min={0}
          max={24}
          step={1}
          className="mt-2"
        />
      </div>

      {/* 路线类型 */}
      <div>
        <Label>路线类型</Label>
        <Select value={filters.loopType || ''} onValueChange={handleLoopTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部</SelectItem>
            {LOOP_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 风险标签 */}
      <div>
        <Label>风险标签</Label>
        <div className="mt-2 space-y-2">
          {RISK_TAG_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={filters.riskTags.includes(option.value)}
                onCheckedChange={() => handleRiskTagToggle(option.value)}
              />
              <label
                htmlFor={option.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-4">
        <Button className="flex-1" onClick={onApply}>
          应用筛选
        </Button>
        <Button variant="outline" onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  );
}

