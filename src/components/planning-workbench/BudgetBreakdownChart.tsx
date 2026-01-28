/**
 * BudgetBreakdownChart - 预算分类占比图表组件
 * 
 * 以环形图展示预算各分类占比
 * 设计原则：克制原则 - 最多 5 个分类，避免过度设计
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/format';

export interface BudgetCategory {
  /** 分类名称 */
  name: string;
  /** 分类标识 */
  key: 'accommodation' | 'transportation' | 'food' | 'activities' | 'other';
  /** 金额 */
  value: number;
}

export interface BudgetBreakdownChartProps {
  /** 分类数据 */
  categories: BudgetCategory[];
  /** 总预算 */
  totalBudget: number;
  /** 货币单位 */
  currency?: string;
  /** 自定义类名 */
  className?: string;
  /** 图表大小 */
  size?: 'sm' | 'md' | 'lg';
}

// 分类配置：颜色使用 CSS 变量以支持主题
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  accommodation: { label: '住宿', color: 'hsl(var(--chart-1))' },
  transportation: { label: '交通', color: 'hsl(var(--chart-2))' },
  food: { label: '餐饮', color: 'hsl(var(--chart-3))' },
  activities: { label: '活动', color: 'hsl(var(--chart-4))' },
  other: { label: '其他', color: 'hsl(var(--chart-5))' },
};

// 尺寸配置
const SIZE_CONFIG = {
  sm: { width: 120, height: 120, innerRadius: 30, outerRadius: 50 },
  md: { width: 160, height: 160, innerRadius: 40, outerRadius: 70 },
  lg: { width: 200, height: 200, innerRadius: 50, outerRadius: 85 },
};

// 自定义 Tooltip
function CustomTooltip({ 
  active, 
  payload, 
  currency 
}: { 
  active?: boolean; 
  payload?: Array<{ payload: BudgetCategory & { percentage: number } }>; 
  currency: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const config = CATEGORY_CONFIG[data.key] || { label: data.name, color: '#888' };

  return (
    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        <span className="font-medium">{config.label}</span>
      </div>
      <div className="text-muted-foreground">
        {formatCurrency(data.value, currency)} ({data.percentage.toFixed(1)}%)
      </div>
    </div>
  );
}

export function BudgetBreakdownChart({
  categories,
  totalBudget,
  currency = 'CNY',
  className,
  size = 'md',
}: BudgetBreakdownChartProps) {
  const sizeConfig = SIZE_CONFIG[size];

  // 计算占比并过滤零值
  const chartData = useMemo(() => {
    const totalSpent = categories.reduce((sum, cat) => sum + cat.value, 0);
    
    return categories
      .filter(cat => cat.value > 0)
      .map(cat => ({
        ...cat,
        percentage: totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value); // 按金额降序
  }, [categories]);

  // 计算总支出
  const totalSpent = useMemo(() => 
    categories.reduce((sum, cat) => sum + cat.value, 0),
    [categories]
  );

  // 计算使用百分比
  const usagePercentage = useMemo(() => 
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    [totalSpent, totalBudget]
  );

  if (chartData.length === 0) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground', className)}>
        <p className="text-sm">暂无预算分配数据</p>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* 环形图 */}
      <div style={{ width: sizeConfig.width, height: sizeConfig.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={sizeConfig.innerRadius}
              outerRadius={sizeConfig.outerRadius}
              paddingAngle={2}
              dataKey="value"
              animationDuration={500}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell 
                  key={entry.key}
                  fill={CATEGORY_CONFIG[entry.key]?.color || '#888'}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* 中心文字 */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ 
            position: 'relative',
            marginTop: -sizeConfig.height,
            height: sizeConfig.height,
          }}
        >
          <span className="text-xs text-muted-foreground">总计</span>
          <span className="text-sm font-semibold">
            {formatCurrency(totalSpent, currency)}
          </span>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex-1 space-y-1.5">
        {chartData.map((item) => {
          const config = CATEGORY_CONFIG[item.key] || { label: item.name, color: '#888' };
          return (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(item.value, currency)}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}

        {/* 预算使用率 */}
        <div className="pt-2 mt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">预算使用率</span>
            <span className={cn(
              'font-semibold',
              usagePercentage >= 100 ? 'text-red-600' : 
              usagePercentage >= 80 ? 'text-amber-600' : 
              'text-green-600'
            )}>
              {usagePercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetBreakdownChart;
