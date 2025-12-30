import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
  color?: string;
}

// 简洁的人物插画 - 坐着挥手
export function PersonSitting({ className = '', size = 200, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Head */}
      <circle cx="100" cy="50" r="20" />
      {/* Body */}
      <line x1="100" y1="70" x2="100" y2="120" strokeLinecap="round" />
      {/* Arms - waving */}
      <line x1="100" y1="85" x2="75" y2="100" strokeLinecap="round" />
      <line x1="100" y1="85" x2="125" y2="95" strokeLinecap="round" />
      {/* Legs - sitting */}
      <line x1="100" y1="120" x2="85" y2="150" strokeLinecap="round" />
      <line x1="100" y1="120" x2="115" y2="150" strokeLinecap="round" />
      {/* Hair - wavy */}
      <path d="M 80 45 Q 85 35 90 40 Q 95 35 100 40 Q 105 35 110 40 Q 115 35 120 45" strokeLinecap="round" />
    </svg>
  );
}

// 简洁的人物插画 - 站立思考
export function PersonThinking({ className = '', size = 200, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Head */}
      <circle cx="100" cy="50" r="20" />
      {/* Body */}
      <line x1="100" y1="70" x2="100" y2="130" strokeLinecap="round" />
      {/* Arms - thinking pose */}
      <line x1="100" y1="90" x2="80" y2="100" strokeLinecap="round" />
      <line x1="100" y1="90" x2="120" y2="85" strokeLinecap="round" />
      {/* Hand to chin */}
      <circle cx="120" cy="85" r="5" />
      {/* Legs */}
      <line x1="100" y1="130" x2="85" y2="170" strokeLinecap="round" />
      <line x1="100" y1="130" x2="115" y2="170" strokeLinecap="round" />
      {/* Thought bubble */}
      <circle cx="140" cy="60" r="8" fill="none" />
      <circle cx="150" cy="50" r="5" fill="none" />
      <circle cx="155" cy="40" r="3" fill="none" />
    </svg>
  );
}

// 简洁的眼镜图标
export function Glasses({ className = '', size = 60, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Left lens */}
      <circle cx="20" cy="30" r="12" />
      {/* Right lens */}
      <circle cx="40" cy="30" r="12" />
      {/* Bridge */}
      <line x1="32" y1="30" x2="28" y2="30" strokeLinecap="round" />
      {/* Temples */}
      <line x1="8" y1="30" x2="0" y2="30" strokeLinecap="round" />
      <line x1="52" y1="30" x2="60" y2="30" strokeLinecap="round" />
    </svg>
  );
}

// 双层眼镜图标
export function DoubleGlasses({ className = '', size = 60, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Left lens - outer */}
      <circle cx="20" cy="30" r="12" />
      {/* Left lens - inner */}
      <circle cx="20" cy="30" r="8" />
      {/* Right lens - outer */}
      <circle cx="40" cy="30" r="12" />
      {/* Right lens - inner */}
      <circle cx="40" cy="30" r="8" />
      {/* Bridge */}
      <line x1="32" y1="30" x2="28" y2="30" strokeLinecap="round" />
      {/* Temples */}
      <line x1="8" y1="30" x2="0" y2="30" strokeLinecap="round" />
      <line x1="52" y1="30" x2="60" y2="30" strokeLinecap="round" />
    </svg>
  );
}

// 望远镜图标
export function Telescope({ className = '', size = 60, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Main tube */}
      <rect x="10" y="25" width="35" height="8" rx="2" />
      {/* Lens */}
      <circle cx="45" cy="29" r="6" />
      {/* Eyepiece */}
      <circle cx="10" cy="29" r="4" />
      {/* Star */}
      <path
        d="M 50 15 L 52 19 L 56 19 L 53 22 L 54 26 L 50 23 L 46 26 L 47 22 L 44 19 L 48 19 Z"
        fill={color}
      />
    </svg>
  );
}

// 简洁的山脉图标
export function Mountains({ className = '', size = 200, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Mountain peaks */}
      <path d="M 0 150 L 50 80 L 100 120 L 150 60 L 200 100 L 200 150 Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 简洁的路线/路径图标
export function Route({ className = '', size = 200, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Curved path */}
      <path
        d="M 20 180 Q 60 120 100 100 T 180 20"
        strokeLinecap="round"
        fill="none"
      />
      {/* Points along path */}
      <circle cx="20" cy="180" r="4" fill={color} />
      <circle cx="100" cy="100" r="4" fill={color} />
      <circle cx="180" cy="20" r="4" fill={color} />
    </svg>
  );
}

// 简洁的指南针图标
export function Compass({ className = '', size = 80, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Outer circle */}
      <circle cx="40" cy="40" r="30" />
      {/* N */}
      <text x="40" y="15" textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">N</text>
      {/* S */}
      <text x="40" y="70" textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">S</text>
      {/* Needle */}
      <line x1="40" y1="40" x2="40" y2="15" strokeLinecap="round" />
      <line x1="40" y1="40" x2="40" y2="65" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="40" cy="40" r="3" fill={color} />
    </svg>
  );
}

// 简洁的星星图标
export function Star({ className = '', size = 40, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      <path
        d="M 20 2 L 24 14 L 38 14 L 27 22 L 31 34 L 20 26 L 9 34 L 13 22 L 2 14 L 16 14 Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 简洁的月亮图标
export function Moon({ className = '', size = 40, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      <path
        d="M 30 20 A 10 10 0 0 1 20 30 A 10 10 0 0 0 30 20 Z"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 简洁的植物/叶子图标
export function Plant({ className = '', size = 100, color = 'currentColor' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Stem */}
      <line x1="50" y1="0" x2="50" y2="100" strokeLinecap="round" />
      {/* Leaves */}
      <path d="M 50 20 Q 35 25 35 35" strokeLinecap="round" />
      <path d="M 50 30 Q 65 35 65 45" strokeLinecap="round" />
      <path d="M 50 50 Q 35 55 35 65" strokeLinecap="round" />
      <path d="M 50 60 Q 65 65 65 75" strokeLinecap="round" />
    </svg>
  );
}

