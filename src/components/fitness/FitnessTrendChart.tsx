/**
 * 体能趋势图表组件
 * 使用 SVG 绘制简单的趋势可视化
 * 
 * @module components/fitness/FitnessTrendChart
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TrendType } from '@/types/fitness-analytics';

interface FitnessTrendChartProps {
  trend: TrendType;
  slope: number;
  dataPoints: number;
  height?: number;
  className?: string;
}

function generateTrendPoints(
  trend: TrendType,
  slope: number,
  count: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const baseY = 50;
  const variance = 15;
  
  let effectiveSlope = 0;
  switch (trend) {
    case 'IMPROVING':
      effectiveSlope = Math.abs(slope) * 100 || 0.3;
      break;
    case 'DECLINING':
      effectiveSlope = -(Math.abs(slope) * 100 || 0.3);
      break;
    case 'STABLE':
      effectiveSlope = 0;
      break;
    default:
      effectiveSlope = 0;
  }
  
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 100;
    const trendY = baseY - (effectiveSlope * (i / count) * 40);
    const randomOffset = (Math.random() - 0.5) * variance;
    const y = Math.max(10, Math.min(90, trendY + randomOffset));
    points.push({ x, y });
  }
  
  return points;
}

function generatePath(points: { x: number; y: number }[], width: number, height: number): string {
  if (points.length === 0) return '';
  
  const scaledPoints = points.map(p => ({
    x: (p.x / 100) * width,
    y: (p.y / 100) * height,
  }));
  
  let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;
  
  for (let i = 1; i < scaledPoints.length; i++) {
    const prev = scaledPoints[i - 1];
    const curr = scaledPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
  }
  
  return path;
}

function generateAreaPath(
  points: { x: number; y: number }[],
  width: number,
  height: number
): string {
  if (points.length === 0) return '';
  
  const linePath = generatePath(points, width, height);
  const scaledPoints = points.map(p => ({
    x: (p.x / 100) * width,
    y: (p.y / 100) * height,
  }));
  
  return `${linePath} L ${scaledPoints[scaledPoints.length - 1].x} ${height} L ${scaledPoints[0].x} ${height} Z`;
}

function getTrendColors(trend: TrendType) {
  switch (trend) {
    case 'IMPROVING':
      return { stroke: '#16a34a', fill: 'url(#gradient-improving)' };
    case 'DECLINING':
      return { stroke: '#ea580c', fill: 'url(#gradient-declining)' };
    case 'STABLE':
      return { stroke: '#2563eb', fill: 'url(#gradient-stable)' };
    default:
      return { stroke: '#6b7280', fill: 'url(#gradient-default)' };
  }
}

export function FitnessTrendChart({
  trend,
  slope,
  dataPoints,
  height = 120,
  className,
}: FitnessTrendChartProps) {
  const width = 300;
  const pointCount = Math.max(8, Math.min(dataPoints, 20));
  
  const points = useMemo(
    () => generateTrendPoints(trend, slope, pointCount),
    [trend, slope, pointCount]
  );
  
  const colors = getTrendColors(trend);
  const linePath = generatePath(points, width, height);
  const areaPath = generateAreaPath(points, width, height);
  
  const dotPositions = useMemo(() => {
    return points.map(p => ({
      cx: (p.x / 100) * width,
      cy: (p.y / 100) * height,
    }));
  }, [points, width, height]);

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gradient-improving" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(22, 163, 74, 0.3)" />
            <stop offset="100%" stopColor="rgba(22, 163, 74, 0.05)" />
          </linearGradient>
          <linearGradient id="gradient-declining" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(234, 88, 12, 0.3)" />
            <stop offset="100%" stopColor="rgba(234, 88, 12, 0.05)" />
          </linearGradient>
          <linearGradient id="gradient-stable" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.3)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.05)" />
          </linearGradient>
          <linearGradient id="gradient-default" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(107, 114, 128, 0.3)" />
            <stop offset="100%" stopColor="rgba(107, 114, 128, 0.05)" />
          </linearGradient>
        </defs>

        <g className="opacity-20">
          {[25, 50, 75].map(y => (
            <line
              key={y}
              x1={0}
              y1={(y / 100) * height}
              x2={width}
              y2={(y / 100) * height}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        <path d={areaPath} fill={colors.fill} className="transition-all duration-500" />
        <path
          d={linePath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />

        {dotPositions.map((pos, index) => (
          <circle
            key={index}
            cx={pos.cx}
            cy={pos.cy}
            r={3}
            fill="white"
            stroke={colors.stroke}
            strokeWidth={2}
            className="transition-all duration-300"
          />
        ))}
      </svg>
      
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
        <span>较早</span>
        <span>最近</span>
      </div>
    </div>
  );
}

export default FitnessTrendChart;
