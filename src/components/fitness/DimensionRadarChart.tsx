/**
 * 能力维度雷达图组件
 * 使用纯 CSS + SVG 实现，无需额外图表库
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_FITNESS_PROFILE } from '@/constants/fitness';
import type { FitnessDimensions } from '@/types/fitness';

interface DimensionRadarChartProps {
  dimensions?: Partial<FitnessDimensions> | null;
  size?: number;
  className?: string;
  showLabels?: boolean;
  animated?: boolean;
}

interface DimensionConfig {
  key: keyof FitnessDimensions;
  label: string;
  emoji: string;
}

const DIMENSION_CONFIGS: DimensionConfig[] = [
  { key: 'climbingAbility', label: '爬升能力', emoji: '🧗' },
  { key: 'endurance', label: '耐力', emoji: '🏃' },
  { key: 'recoverySpeed', label: '恢复速度', emoji: '🔄' },
];

function resolveDimensions(dimensions?: Partial<FitnessDimensions> | null): FitnessDimensions {
  const fallback = DEFAULT_FITNESS_PROFILE.dimensions;
  return {
    climbingAbility: dimensions?.climbingAbility ?? fallback.climbingAbility,
    endurance: dimensions?.endurance ?? fallback.endurance,
    recoverySpeed: dimensions?.recoverySpeed ?? fallback.recoverySpeed,
  };
}

/**
 * 能力维度雷达图
 * 
 * @example
 * ```tsx
 * <DimensionRadarChart 
 *   dimensions={{ climbingAbility: 75, endurance: 70, recoverySpeed: 60 }}
 *   size={200}
 * />
 * ```
 */
export function DimensionRadarChart({ 
  dimensions, 
  size = 200, 
  className,
  showLabels = true,
  animated = true,
}: DimensionRadarChartProps) {
  const safeDimensions = useMemo(() => resolveDimensions(dimensions), [dimensions]);
  const center = size / 2;
  const radius = (size / 2) - 30; // 留出标签空间

  // 计算三角形顶点（等边三角形）
  const points = useMemo(() => {
    const angleStep = (2 * Math.PI) / 3;
    const startAngle = -Math.PI / 2; // 从顶部开始

    return DIMENSION_CONFIGS.map((config, index) => {
      const angle = startAngle + index * angleStep;
      const value = safeDimensions[config.key] / 100; // 归一化到 0-1
      
      return {
        ...config,
        angle,
        value,
        // 满分位置
        fullX: center + radius * Math.cos(angle),
        fullY: center + radius * Math.sin(angle),
        // 实际值位置
        valueX: center + radius * value * Math.cos(angle),
        valueY: center + radius * value * Math.sin(angle),
        // 标签位置（稍微外移）
        labelX: center + (radius + 25) * Math.cos(angle),
        labelY: center + (radius + 25) * Math.sin(angle),
      };
    });
  }, [safeDimensions, center, radius]);

  // 生成网格线
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPaths = gridLevels.map(level => {
    const gridPoints = points.map(p => {
      const x = center + radius * level * Math.cos(p.angle);
      const y = center + radius * level * Math.sin(p.angle);
      return `${x},${y}`;
    });
    return `M ${gridPoints.join(' L ')} Z`;
  });

  // 生成数据区域路径
  const dataPath = `M ${points.map(p => `${p.valueX},${p.valueY}`).join(' L ')} Z`;

  return (
    <div className={cn('relative inline-block', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 网格 */}
        {gridPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground/20"
          />
        ))}

        {/* 轴线 */}
        {points.map((point, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={point.fullX}
            y2={point.fullY}
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground/30"
          />
        ))}

        {/* 数据区域 */}
        <path
          d={dataPath}
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'text-primary',
            animated && 'transition-all duration-500 ease-out'
          )}
        />

        {/* 数据点 */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.valueX}
            cy={point.valueY}
            r="4"
            fill="currentColor"
            className={cn(
              'text-primary',
              animated && 'transition-all duration-500 ease-out'
            )}
          />
        ))}
      </svg>

      {/* 标签 */}
      {showLabels && points.map((point, index) => (
        <div
          key={index}
          className="absolute flex flex-col items-center text-center"
          style={{
            left: point.labelX,
            top: point.labelY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="text-lg">{point.emoji}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {point.label}
          </span>
          <span className="text-sm font-semibold">
            {safeDimensions[point.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
