import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
  size?: number;
  strokeColor?: string;
  highlightColor?: string;
}

// 酒红色（品牌色）
const BRAND_RED = '#DC2626';

/**
 * Welcome - 路线规划插画
 * 黑白线稿：地图、路线、指南针
 * 酒红点睛：关键路线节点
 */
export function WelcomeRouteIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 地图轮廓（黑白线稿） */}
      <path
        d="M30 50 L50 40 L80 45 L120 35 L160 50 L170 80 L150 120 L100 140 L60 130 L40 100 Z"
        stroke={strokeColor}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 路线（黑白） */}
      <path
        d="M50 40 L80 45 L120 35 L160 50"
        stroke={strokeColor}
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      
      {/* 关键节点（酒红点睛） */}
      <circle cx="50" cy="40" r="4" fill={highlightColor} />
      <circle cx="80" cy="45" r="4" fill={highlightColor} />
      <circle cx="120" cy="35" r="4" fill={highlightColor} />
      <circle cx="160" cy="50" r="4" fill={highlightColor} />
      
      {/* 指南针（黑白） */}
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="25" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="0" y1="-25" x2="0" y2="25" stroke={strokeColor} strokeWidth="2" />
        <line x1="-25" y1="0" x2="25" y2="0" stroke={strokeColor} strokeWidth="2" />
        <path d="M0 -25 L-8 -8 L0 0 L8 -8 Z" fill={highlightColor} />
        <text x="0" y="35" textAnchor="middle" fontSize="10" fill={strokeColor}>N</text>
      </g>
    </svg>
  );
}

/**
 * Empty Trips - 空行程插画
 * 黑白线稿：行李箱、地图
 * 酒红点睛：加号按钮
 */
export function EmptyTripsIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 行李箱（黑白线稿） */}
      <g transform="translate(60, 80)">
        <rect x="0" y="0" width="60" height="40" rx="4" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="15" y1="0" x2="15" y2="40" stroke={strokeColor} strokeWidth="2" />
        <line x1="45" y1="0" x2="45" y2="40" stroke={strokeColor} strokeWidth="2" />
        <rect x="5" y="10" width="8" height="8" rx="1" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <rect x="47" y="10" width="8" height="8" rx="1" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <line x1="0" y1="20" x2="60" y2="20" stroke={strokeColor} strokeWidth="1.5" />
      </g>
      
      {/* 地图（黑白） */}
      <g transform="translate(100, 50)">
        <path
          d="M0 0 L30 10 L50 5 L70 15 L80 40 L60 60 L30 70 L10 50 Z"
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="40" cy="30" r="3" fill={highlightColor} />
      </g>
      
      {/* 加号按钮（酒红点睛） */}
      <g transform="translate(150, 120)">
        <circle cx="0" cy="0" r="20" stroke={highlightColor} strokeWidth="2.5" fill="none" />
        <line x1="0" y1="-10" x2="0" y2="10" stroke={highlightColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="-10" y1="0" x2="10" y2="0" stroke={highlightColor} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Empty Places - 空地点插画
 * 黑白线稿：地点标记、搜索框
 * 酒红点睛：搜索图标
 */
export function EmptyPlacesIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 搜索框（黑白） */}
      <g transform="translate(30, 40)">
        <rect x="0" y="0" width="140" height="35" rx="6" stroke={strokeColor} strokeWidth="2" fill="none" />
        <circle cx="120" cy="17.5" r="8" stroke={highlightColor} strokeWidth="2" fill="none" />
        <line x1="125" y1="22.5" x2="135" y2="32.5" stroke={highlightColor} strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* 地点标记（黑白线稿） */}
      <g transform="translate(50, 100)">
        <path
          d="M0 -15 L8 0 L0 8 L-8 0 Z"
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="0" r="3" fill={strokeColor} />
      </g>
      
      <g transform="translate(100, 120)">
        <path
          d="M0 -15 L8 0 L0 8 L-8 0 Z"
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="0" r="3" fill={strokeColor} />
      </g>
      
      <g transform="translate(150, 100)">
        <path
          d="M0 -15 L8 0 L0 8 L-8 0 Z"
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="0" r="3" fill={strokeColor} />
      </g>
      
      {/* 连接线（黑白） */}
      <path
        d="M50 100 Q75 110 100 120 T150 100"
        stroke={strokeColor}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Empty Schedule - 空日程插画
 * 黑白线稿：时间轴、日历
 * 酒红点睛：当前日期
 */
export function EmptyScheduleIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 时间轴（黑白） */}
      <line x1="30" y1="100" x2="170" y2="100" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
      
      {/* 时间节点（黑白） */}
      <g transform="translate(50, 100)">
        <circle cx="0" cy="0" r="6" stroke={strokeColor} strokeWidth="2" fill="white" />
        <text x="0" y="-15" textAnchor="middle" fontSize="12" fill={strokeColor} fontWeight="500">Day 1</text>
      </g>
      
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="6" stroke={strokeColor} strokeWidth="2" fill="white" />
        <text x="0" y="-15" textAnchor="middle" fontSize="12" fill={strokeColor} fontWeight="500">Day 2</text>
      </g>
      
      {/* 当前日期（酒红点睛） */}
      <g transform="translate(150, 100)">
        <circle cx="0" cy="0" r="8" fill={highlightColor} />
        <circle cx="0" cy="0" r="6" fill="white" />
        <text x="0" y="-15" textAnchor="middle" fontSize="12" fill={highlightColor} fontWeight="600">Day 3</text>
      </g>
      
      {/* 日历（黑白） */}
      <g transform="translate(140, 140)">
        <rect x="0" y="0" width="40" height="35" rx="3" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="0" y1="12" x2="40" y2="12" stroke={strokeColor} strokeWidth="1.5" />
        <text x="20" y="8" textAnchor="middle" fontSize="8" fill={strokeColor}>JAN</text>
        <text x="20" y="28" textAnchor="middle" fontSize="14" fill={highlightColor} fontWeight="600">15</text>
      </g>
    </svg>
  );
}

/**
 * Empty Execute - 空执行插画
 * 黑白线稿：导航箭头、路线
 * 酒红点睛：下一步标记
 */
export function EmptyExecuteIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 路线（黑白） */}
      <path
        d="M30 150 Q60 120 90 100 T150 80"
        stroke={strokeColor}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 已完成的点（黑白） */}
      <circle cx="30" cy="150" r="5" fill={strokeColor} />
      <circle cx="90" cy="100" r="5" fill={strokeColor} />
      
      {/* 下一步（酒红点睛） */}
      <g transform="translate(150, 80)">
        <circle cx="0" cy="0" r="8" fill={highlightColor} />
        <circle cx="0" cy="0" r="5" fill="white" />
        <path
          d="M-6 -6 L6 0 L-6 6"
          fill={highlightColor}
        />
      </g>
      
      {/* 导航箭头（黑白） */}
      <g transform="translate(120, 90)">
        <path
          d="M0 0 L15 -10 L15 10 Z"
          fill={strokeColor}
        />
      </g>
    </svg>
  );
}

/**
 * Checklist Progress - 进度插画
 * 黑白线稿：清单、勾选
 * 酒红点睛：已完成项
 */
export function ChecklistProgressIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 清单项（黑白） */}
      <g transform="translate(40, 50)">
        <rect x="0" y="0" width="120" height="25" rx="4" stroke={strokeColor} strokeWidth="2" fill="none" />
        <circle cx="15" cy="12.5" r="6" stroke={strokeColor} strokeWidth="2" fill="none" />
        <text x="30" y="17" fontSize="12" fill={strokeColor}>Pick a style</text>
      </g>
      
      {/* 已完成项（酒红点睛） */}
      <g transform="translate(40, 85)">
        <rect x="0" y="0" width="120" height="25" rx="4" stroke={highlightColor} strokeWidth="2" fill="none" />
        <circle cx="15" cy="12.5" r="6" stroke={highlightColor} strokeWidth="2" fill={highlightColor} />
        <path d="M11 12.5 L13.5 15 L19 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="30" y="17" fontSize="12" fill={highlightColor} fontWeight="500">Add 3 places</text>
      </g>
      
      {/* 未完成项（黑白） */}
      <g transform="translate(40, 120)">
        <rect x="0" y="0" width="120" height="25" rx="4" stroke={strokeColor} strokeWidth="2" fill="none" />
        <circle cx="15" cy="12.5" r="6" stroke={strokeColor} strokeWidth="2" fill="none" />
        <text x="30" y="17" fontSize="12" fill={strokeColor}>Schedule 1 day</text>
      </g>
    </svg>
  );
}

/**
 * Empty Templates - 空模板插画
 * 黑白线稿：路线轨迹、模板卡片
 * 酒红点睛：关键节点
 */
export function EmptyTemplatesIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 模板卡片（黑白线稿） */}
      <g transform="translate(30, 50)">
        <rect x="0" y="0" width="140" height="100" rx="6" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="0" y1="30" x2="140" y2="30" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="15" y1="50" x2="125" y2="50" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="15" y1="70" x2="125" y2="70" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
      </g>
      
      {/* 路线轨迹（黑白） */}
      <path
        d="M 40 80 Q 70 60 100 70 T 160 80"
        stroke={strokeColor}
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      
      {/* 关键节点（酒红点睛） */}
      <circle cx="40" cy="80" r="4" fill={highlightColor} />
      <circle cx="100" cy="70" r="4" fill={highlightColor} />
      <circle cx="160" cy="80" r="4" fill={highlightColor} />
      
      {/* 指南针图标（黑白，右下角） */}
      <g transform="translate(140, 140)">
        <circle cx="0" cy="0" r="20" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="0" y1="-20" x2="0" y2="20" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="-20" y1="0" x2="20" y2="0" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="2" fill={highlightColor} />
        <text x="0" y="-28" textAnchor="middle" fontSize="8" fill={strokeColor} fontWeight="bold">N</text>
      </g>
    </svg>
  );
}

/**
 * Health Bar - 健康度插画
 * 黑白线稿：仪表盘、指标
 * 酒红点睛：健康值
 */
export function HealthBarIllustration({
  className = '',
  size = 200,
  strokeColor = '#1F2937',
  highlightColor = BRAND_RED,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('stroke-2', className)}
    >
      {/* 仪表盘（黑白） */}
      <g transform="translate(100, 100)">
        <path
          d="M-60 -40 A60 60 0 0 1 60 -40"
          stroke={strokeColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* 刻度（黑白） */}
        {[-40, -20, 0, 20, 40].map((angle, i) => {
          const x1 = -60 * Math.cos((angle * Math.PI) / 180);
          const y1 = -60 * Math.sin((angle * Math.PI) / 180);
          const x2 = -50 * Math.cos((angle * Math.PI) / 180);
          const y2 = -50 * Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* 指针（酒红点睛） */}
        <line
          x1="0"
          y1="0"
          x2="-40"
          y2="-30"
          stroke={highlightColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="5" fill={highlightColor} />
      </g>
      
      {/* 指标标签（黑白） */}
      <text x="100" y="180" textAnchor="middle" fontSize="14" fill={strokeColor} fontWeight="500">
        健康度: 85%
      </text>
    </svg>
  );
}


