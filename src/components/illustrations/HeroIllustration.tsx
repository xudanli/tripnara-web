import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
  color?: string;
  highlightColor?: string;
}

// Hero 插画 - 人物在电脑前思考，有灯泡和路线轨迹
export function HeroIllustration({ 
  className = '', 
  size = 500, 
  color = 'currentColor',
  highlightColor = '#DC2626' // 品牌酒红色
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Person with curly hair - facing left */}
      <circle cx="200" cy="150" r="40" />
      {/* Curly hair */}
      <path d="M 160 130 Q 165 110 170 120 Q 175 110 180 120 Q 185 110 190 120 Q 195 110 200 120 Q 205 110 210 120 Q 215 110 220 120 Q 225 110 230 130" />
      {/* Face features */}
      <circle cx="185" cy="145" r="4" fill={color} />
      <circle cx="215" cy="145" r="4" fill={color} />
      <path d="M 185 160 Q 200 168 215 160" strokeLinecap="round" />
      {/* Body */}
      <line x1="200" y1="190" x2="200" y2="280" strokeLinecap="round" />
      {/* Arms - pointing up */}
      <line x1="200" y1="220" x2="160" y2="200" strokeLinecap="round" />
      <line x1="200" y1="220" x2="240" y2="210" strokeLinecap="round" />
      {/* Raised finger */}
      <line x1="160" y1="200" x2="145" y2="175" strokeLinecap="round" strokeWidth="2.5" />
      <circle cx="145" cy="170" r="5" fill={color} />
      
      {/* Lightbulb - highlighted in brand color */}
      <circle cx="200" cy="80" r="25" fill={highlightColor} stroke={color} strokeWidth="2" opacity="0.9" />
      <rect x="192" y="105" width="16" height="10" rx="2" />
      {/* Radiating lines from bulb */}
      <line x1="175" y1="65" x2="155" y2="50" strokeWidth="1.5" />
      <line x1="225" y1="65" x2="245" y2="50" strokeWidth="1.5" />
      <line x1="180" y1="85" x2="165" y2="95" strokeWidth="1.5" />
      <line x1="220" y1="85" x2="235" y2="95" strokeWidth="1.5" />
      {/* Checkmark next to bulb */}
      <circle cx="240" cy="85" r="12" fill="none" stroke={color} strokeWidth="2" />
      <path d="M 235 85 L 238 88 L 245 80" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      
      {/* Laptop on desk */}
      <rect x="250" y="300" width="150" height="100" rx="5" />
      <rect x="265" y="315" width="120" height="75" rx="3" fill={color} />
      {/* Logo on screen */}
      <text x="325" y="360" textAnchor="middle" fontSize="32" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold">T</text>
      {/* Keyboard */}
      <rect x="260" y="405" width="130" height="10" rx="2" />
      <line x1="275" y1="405" x2="275" y2="415" />
      <line x1="300" y1="405" x2="300" y2="415" />
      <line x1="325" y1="405" x2="325" y2="415" />
      <line x1="350" y1="405" x2="350" y2="415" />
      <line x1="375" y1="405" x2="375" y2="415" />
      
      {/* Notebook/Notes */}
      <rect x="160" y="320" width="50" height="60" rx="3" />
      <line x1="170" y1="330" x2="200" y2="330" />
      <line x1="170" y1="340" x2="195" y2="340" />
      <line x1="170" y1="350" x2="200" y2="350" />
      <line x1="170" y1="360" x2="192" y2="360" />
      {/* Pen */}
      <line x1="215" y1="330" x2="225" y2="355" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M 225 355 L 222 360 L 228 360 Z" fill={color} />
      
      {/* Thought bubble with route/topography instead of satellite */}
      <path
        d="M 120 100 Q 80 80 40 120 Q 50 140 70 150 Q 60 160 80 180 Q 100 170 120 160 Q 140 170 160 180"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeDasharray="4,4"
        opacity="0.6"
      />
      {/* Topography lines in thought bubble */}
      <path
        d="M 60 110 Q 80 100 100 110 Q 120 105 140 115"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M 70 130 Q 90 120 110 130 Q 130 125 150 135"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      {/* Route points in thought bubble */}
      <circle cx="80" cy="120" r="4" fill={color} />
      <circle cx="120" cy="110" r="4" fill={color} />
      <circle cx="100" cy="150" r="4" fill={color} />
      {/* Map-like grid in thought bubble */}
      <line x1="50" y1="100" x2="50" y2="180" strokeWidth="0.5" opacity="0.3" />
      <line x1="90" y1="100" x2="90" y2="180" strokeWidth="0.5" opacity="0.3" />
      <line x1="130" y1="100" x2="130" y2="180" strokeWidth="0.5" opacity="0.3" />
      <line x1="170" y1="100" x2="170" y2="180" strokeWidth="0.5" opacity="0.3" />
      <line x1="40" y1="140" x2="180" y2="140" strokeWidth="0.5" opacity="0.3" />
      
      {/* Small creature on desk */}
      <circle cx="140" cy="380" r="18" />
      <circle cx="135" cy="375" r="2.5" fill={color} />
      <circle cx="145" cy="375" r="2.5" fill={color} />
      <path d="M 135 382 Q 140 385 145 382" strokeLinecap="round" />
      {/* Hood */}
      <path d="M 130 370 Q 140 365 150 370" />
      
      {/* Stars */}
      <path d="M 350 150 L 352 158 L 360 158 L 353 163 L 355 171 L 350 166 L 345 171 L 347 163 L 340 158 L 348 158 Z" opacity="0.5" />
      <path d="M 420 200 L 421 203 L 424 203 L 421.5 205 L 422 208 L 420 206 L 418 208 L 418.5 205 L 416 203 L 419 203 Z" />
    </svg>
  );
}

