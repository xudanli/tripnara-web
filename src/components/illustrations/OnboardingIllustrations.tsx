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

/**
 * Discover Box - 发现/探索插画（手绘风格）
 * 黑白线稿：人物、盒子、内容
 * 酒红点睛：星星、装饰元素
 */
export function DiscoverBoxIllustration({
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
      {/* 盒子（黑白线稿，手绘感） */}
      <g transform="translate(80, 100)">
        {/* 盒子主体 */}
        <path
          d="M0 0 L40 0 L40 30 L0 30 Z"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 盒子开口（半圆形） */}
        <path
          d="M0 0 Q20 -8 40 0"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* 盒子内对角线填充 */}
        <g opacity="0.3">
          <line x1="5" y1="15" x2="35" y2="15" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="5" y1="22" x2="35" y2="22" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="5" y1="8" x2="35" y2="8" stroke={strokeColor} strokeWidth="1.5" />
        </g>
      </g>
      
      {/* 简笔画人物（黑白） */}
      <g transform="translate(100, 60)">
        {/* 头部 */}
        <circle cx="0" cy="0" r="8" stroke={strokeColor} strokeWidth="2" fill="none" />
        {/* 头发 */}
        <path
          d="M-8 -5 Q-10 -10 -8 -12 Q-6 -14 -4 -12 Q-2 -10 0 -12 Q2 -10 4 -12 Q6 -14 8 -12 Q10 -10 8 -5"
          stroke={strokeColor}
          strokeWidth="2"
          fill={strokeColor}
        />
        {/* 眼睛（向下看） */}
        <circle cx="-3" cy="2" r="1.5" fill={strokeColor} />
        <circle cx="3" cy="2" r="1.5" fill={strokeColor} />
        {/* 鼻子和嘴巴 */}
        <path d="M0 4 L0 5" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-2 7 Q0 8 2 7" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        {/* 身体 */}
        <rect x="-6" y="10" width="12" height="18" rx="2" stroke={strokeColor} strokeWidth="2" fill="none" />
        {/* 手臂（扶着盒子） */}
        <path
          d="M-6 15 Q-15 18 -18 22"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 15 Q15 18 18 22"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* 酒红装饰元素 */}
      {/* 星星（右上） */}
      <g transform="translate(140, 50)">
        <path
          d="M0 -6 L2 0 L0 6 L-2 0 M-6 0 L2 0 M0 6 L0 -6"
          stroke={highlightColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* 另一个星星 */}
      <g transform="translate(155, 65)">
        <path
          d="M0 -4 L1.5 0 L0 4 L-1.5 0 M-4 0 L1.5 0 M0 4 L0 -4"
          stroke={highlightColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* 虚线装饰（右上） */}
      <g transform="translate(130, 45)" opacity="0.6">
        <line x1="0" y1="0" x2="12" y2="-8" stroke={highlightColor} strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
        <line x1="12" y1="-8" x2="20" y2="-12" stroke={highlightColor} strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </g>
      
      {/* 虚线装饰（右下） */}
      <g transform="translate(125, 135)" opacity="0.6">
        <line x1="0" y1="0" x2="15" y2="5" stroke={highlightColor} strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
        <line x1="15" y1="5" x2="25" y2="8" stroke={highlightColor} strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </g>
      
      {/* 螺旋装饰（左下） */}
      <g transform="translate(50, 140)">
        <path
          d="M0 0 Q5 -5 10 0 Q15 5 10 10 Q5 15 0 10"
          stroke={highlightColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Empty Risk - 空风险插画
 * 黑白线稿：盾牌、检查标记
 * 酒红点睛：安全标识
 */
export function EmptyRiskIllustration({
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
      {/* 盾牌（黑白线稿） */}
      <g transform="translate(100, 80)">
        <path
          d="M0 -30 L-25 -10 L-25 20 L0 40 L25 20 L25 -10 Z"
          stroke={strokeColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 盾牌内部装饰线 */}
        <path
          d="M0 -20 L-15 -5 L-15 15 L0 30 L15 15 L15 -5 Z"
          stroke={strokeColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* 检查标记（酒红点睛） */}
      <g transform="translate(100, 100)">
        <circle cx="0" cy="0" r="12" fill={highlightColor} opacity="0.1" />
        <path
          d="M-6 -2 L-2 2 L6 -6"
          stroke={highlightColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* 安全标识（小图标） */}
      <g transform="translate(100, 140)">
        <circle cx="0" cy="0" r="8" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <circle cx="0" cy="0" r="3" fill={highlightColor} />
      </g>
    </svg>
  );
}

/**
 * Empty Insights - 空复盘插画
 * 黑白线稿：图表、文档
 * 酒红点睛：关键数据点
 */
export function EmptyInsightsIllustration({
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
      {/* 图表背景（黑白线稿） */}
      <g transform="translate(50, 60)">
        <rect x="0" y="0" width="100" height="80" rx="4" stroke={strokeColor} strokeWidth="2" fill="none" />
        {/* 网格线 */}
        <line x1="0" y1="20" x2="100" y2="20" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="0" y1="40" x2="100" y2="40" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="0" y1="60" x2="100" y2="60" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 2" />
      </g>
      
      {/* 柱状图（黑白） */}
      <g transform="translate(60, 140)">
        <rect x="0" y="0" width="12" height="30" rx="2" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <rect x="20" y="-10" width="12" height="40" rx="2" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <rect x="40" y="-20" width="12" height="50" rx="2" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <rect x="60" y="-5" width="12" height="35" rx="2" stroke={strokeColor} strokeWidth="1.5" fill="none" />
      </g>
      
      {/* 关键数据点（酒红点睛） */}
      <circle cx="116" cy="100" r="4" fill={highlightColor} />
      <circle cx="136" cy="90" r="4" fill={highlightColor} />
      
      {/* 文档图标（黑白） */}
      <g transform="translate(150, 50)">
        <path
          d="M0 0 L20 0 L20 25 L0 25 Z"
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="5" y1="8" x2="15" y2="8" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="5" y1="13" x2="15" y2="13" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="5" y1="18" x2="12" y2="18" stroke={strokeColor} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * Readiness - 准备度插画
 * 黑白线稿：行李箱、准备清单
 * 酒红点睛：准备状态标记
 */
export function ReadinessIllustration({
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
      <g transform="translate(70, 60)">
        <rect x="0" y="0" width="60" height="50" rx="6" stroke={strokeColor} strokeWidth="2.5" fill="none" />
        <line x1="20" y1="0" x2="20" y2="50" stroke={strokeColor} strokeWidth="2" />
        <line x1="40" y1="0" x2="40" y2="50" stroke={strokeColor} strokeWidth="2" />
        <rect x="8" y="12" width="8" height="8" rx="1.5" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <rect x="44" y="12" width="8" height="8" rx="1.5" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        <line x1="0" y1="25" x2="60" y2="25" stroke={strokeColor} strokeWidth="2" />
        <line x1="0" y1="38" x2="60" y2="38" stroke={strokeColor} strokeWidth="2" />
      </g>
      
      {/* 准备清单（黑白） */}
      <g transform="translate(50, 130)">
        <rect x="0" y="0" width="100" height="50" rx="4" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="15" y1="12" x2="25" y2="12" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="25" x2="30" y2="25" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="38" x2="35" y2="38" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* 准备状态标记（酒红点睛） */}
      <circle cx="40" cy="137" r="5" fill={highlightColor} />
      <path
        d="M37 137 L39 139 L43 135"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * All Clear - 一切正常插画
 * 黑白线稿：对勾、背景装饰
 * 酒红点睛：对勾标记
 */
export function AllClearIllustration({
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
      {/* 圆形背景（黑白线稿） */}
      <circle cx="100" cy="100" r="50" stroke={strokeColor} strokeWidth="2.5" fill="none" />
      
      {/* 对勾（酒红点睛） */}
      <path
        d="M75 100 L90 115 L125 80"
        stroke={highlightColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 装饰线条（黑白） */}
      <g opacity="0.3">
        <circle cx="100" cy="100" r="60" stroke={strokeColor} strokeWidth="1" fill="none" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="70" stroke={strokeColor} strokeWidth="1" fill="none" strokeDasharray="3 3" />
      </g>
    </svg>
  );
}

export function IdeasContainerIllustration({
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
      {/* 容器（手绘感，不规则线条） */}
      <g transform="translate(60, 90)">
        <path
          d="M0 5 Q-3 0 0 0 Q3 0 5 2 Q8 0 15 1 Q20 0 25 3 Q30 0 40 2 Q45 0 50 5 L50 45 Q45 50 40 48 Q35 50 30 48 Q25 50 20 48 Q15 50 10 48 Q5 50 0 45 Z"
          stroke={strokeColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 容器上的星星装饰 */}
        <g transform="translate(12, 2)">
          <path
            d="M0 -2 L0.8 0 L0 2 L-0.8 0 M-2 0 L0.8 0 M0 2 L0 -2"
            stroke={strokeColor}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
      
      {/* 纸张（黑白，重叠） */}
      <g transform="translate(70, 100)" opacity="0.8">
        <rect x="0" y="0" width="20" height="28" rx="1" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="3" y1="8" x2="17" y2="8" stroke={strokeColor} strokeWidth="1" />
        <line x1="3" y1="12" x2="17" y2="12" stroke={strokeColor} strokeWidth="1" />
        <line x1="3" y1="16" x2="12" y2="16" stroke={strokeColor} strokeWidth="1" />
      </g>
      
      <g transform="translate(85, 98)" opacity="0.9">
        <rect x="0" y="0" width="20" height="28" rx="1" stroke={strokeColor} strokeWidth="2" fill="none" />
        <line x1="3" y1="8" x2="17" y2="8" stroke={strokeColor} strokeWidth="1" />
        <line x1="3" y1="12" x2="17" y2="12" stroke={strokeColor} strokeWidth="1" />
        <line x1="3" y1="16" x2="15" y2="16" stroke={strokeColor} strokeWidth="1" />
      </g>
      
      {/* 小物件（半圆形） */}
      <g transform="translate(95, 108)">
        <path
          d="M0 0 Q4 0 6 3 Q8 6 0 6 Q-2 3 0 0"
          stroke={strokeColor}
          strokeWidth="2"
          fill={strokeColor}
        />
      </g>
      
      {/* 灯泡（酒红填充） */}
      <g transform="translate(120, 105)">
        {/* 灯泡主体 */}
        <circle cx="0" cy="0" r="12" stroke={strokeColor} strokeWidth="2.5" fill={highlightColor} opacity="0.9" />
        {/* 灯泡内部 */}
        <path
          d="M-4 -4 L4 -4 L6 0 L4 4 L-4 4 L-6 0 Z"
          stroke={strokeColor}
          strokeWidth="1.5"
          fill="none"
        />
        {/* 光线（向上） */}
        <line x1="0" y1="-12" x2="0" y2="-20" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        <line x1="-4" y1="-15" x2="-6" y2="-22" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="-15" x2="6" y2="-22" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* 灯泡底部 */}
        <rect x="-3" y="8" width="6" height="4" rx="1" stroke={strokeColor} strokeWidth="2" fill="none" />
      </g>
      
      {/* 铅笔（黑白） */}
      <g transform="translate(105, 120)">
        {/* 铅笔主体 */}
        <rect x="0" y="0" width="15" height="3" rx="1" stroke={strokeColor} strokeWidth="2" fill="none" />
        {/* 铅笔尖 */}
        <path d="M15 1.5 L20 0 L20 3 L15 1.5" stroke={strokeColor} strokeWidth="2" fill={strokeColor} />
        {/* 铅笔纹理 */}
        <line x1="3" y1="0.5" x2="3" y2="2.5" stroke={strokeColor} strokeWidth="1" />
        <line x1="7" y1="0.5" x2="7" y2="2.5" stroke={strokeColor} strokeWidth="1" />
        <line x1="11" y1="0.5" x2="11" y2="2.5" stroke={strokeColor} strokeWidth="1" />
      </g>
      
      {/* 装饰圆圈（酒红色，浮动） */}
      <circle cx="45" cy="110" r="4" stroke={highlightColor} strokeWidth="2" fill="none" opacity="0.8" />
      <circle cx="155" cy="130" r="5" stroke={highlightColor} strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}

