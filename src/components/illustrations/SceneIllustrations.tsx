interface IllustrationProps {
  className?: string;
  size?: number;
  color?: string;
  highlightColor?: string;
}

// 保存内容的场景插画 - 各种内容类型被收集到容器中
export function ContentCollection({ 
  className = '', 
  size = 400, 
  color = 'currentColor',
  highlightColor = '#FFEB3B'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Browser window on left */}
      <rect x="20" y="80" width="80" height="60" rx="4" />
      <rect x="25" y="85" width="70" height="8" rx="2" fill={color} />
      <circle cx="95" cy="89" r="3" />
      <line x1="30" y1="100" x2="90" y2="100" />
      <line x1="30" y1="110" x2="70" y2="110" />
      <line x1="30" y1="120" x2="80" y2="120" />
      
      {/* Hand holding phone on right */}
      <rect x="300" y="100" width="50" height="80" rx="6" />
      <circle cx="325" cy="140" r="15" />
      <path d="M 300 100 Q 280 105 275 120 L 280 130 Q 285 125 290 120" strokeLinecap="round" />
      
      {/* Content icons floating down */}
      {/* Book */}
      <rect x="150" y="50" width="30" height="20" />
      <line x1="155" y1="55" x2="175" y2="55" />
      <line x1="155" y1="60" x2="170" y2="60" />
      <line x1="155" y1="65" x2="175" y2="65" />
      
      {/* Picture frame */}
      <rect x="220" y="70" width="35" height="25" />
      <line x1="225" y1="80" x2="250" y2="80" />
      <line x1="225" y1="85" x2="245" y2="85" />
      
      {/* Globe */}
      <circle cx="180" cy="120" r="12" />
      <path d="M 180 108 Q 185 115 180 122 Q 175 115 180 108" />
      <line x1="168" y1="120" x2="192" y2="120" />
      
      {/* Folder */}
      <path d="M 240 100 L 240 115 L 270 115 L 270 105 L 260 95 L 240 95 Z" />
      
      {/* Document */}
      <rect x="160" y="140" width="25" height="30" />
      <line x1="165" y1="148" x2="180" y2="148" />
      <line x1="165" y1="155" x2="178" y2="155" />
      <line x1="165" y1="162" x2="182" y2="162" />
      
      {/* Cloud upload */}
      <ellipse cx="200" cy="180" rx="15" ry="10" />
      <ellipse cx="210" cy="178" rx="12" ry="8" />
      <path d="M 200 188 L 200 200 M 195 195 L 200 200 L 205 195" strokeLinecap="round" />
      
      {/* Play button */}
      <path d="M 250 160 L 250 175 L 262 167.5 Z" fill={color} />
      
      {/* Audio waveform */}
      <line x1="280" y1="140" x2="280" y2="155" strokeWidth="3" />
      <line x1="290" y1="145" x2="290" y2="160" strokeWidth="3" />
      <line x1="300" y1="135" x2="300" y2="165" strokeWidth="3" />
      
      {/* Microphone */}
      <rect x="190" y="200" width="8" height="20" />
      <line x1="188" y1="220" x2="200" y2="220" />
      <line x1="194" y1="200" x2="194" y2="195" strokeLinecap="round" />
      
      {/* Container at bottom */}
      <path
        d="M 120 280 Q 100 300 120 320 L 280 320 Q 300 300 280 280"
        fill={highlightColor}
        stroke={color}
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M 120 280 Q 100 300 120 320 L 280 320 Q 300 300 280 280"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      
      {/* Items in container */}
      <rect x="150" y="295" width="15" height="20" />
      <line x1="153" y1="300" x2="162" y2="300" />
      <line x1="153" y1="305" x2="160" y2="305" />
      
      <circle cx="200" cy="305" r="8" />
      <path d="M 200 297 Q 203 300 200 303 Q 197 300 200 297" />
      
      <rect x="230" y="295" width="30" height="25" />
    </svg>
  );
}

// 学习洞察的场景插画 - 人物在思考，有灯泡和笔记本电脑
export function LearningInsights({ 
  className = '', 
  size = 400, 
  color = 'currentColor',
  highlightColor = '#FFEB3B'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Person with curly hair */}
      <circle cx="200" cy="120" r="35" />
      {/* Curly hair */}
      <path d="M 165 100 Q 170 85 175 95 Q 180 85 185 95 Q 190 85 195 95 Q 200 85 205 95 Q 210 85 215 95 Q 220 85 225 95 Q 230 85 235 100" />
      {/* Face features */}
      <circle cx="190" cy="115" r="3" fill={color} />
      <circle cx="210" cy="115" r="3" fill={color} />
      <path d="M 190 125 Q 200 130 210 125" strokeLinecap="round" />
      {/* Body */}
      <line x1="200" y1="155" x2="200" y2="220" strokeLinecap="round" />
      {/* Arms */}
      <line x1="200" y1="175" x2="170" y2="190" strokeLinecap="round" />
      <line x1="200" y1="175" x2="230" y2="190" strokeLinecap="round" />
      {/* Raised finger */}
      <line x1="170" y1="190" x2="160" y2="175" strokeLinecap="round" />
      <circle cx="160" cy="170" r="4" fill={color} />
      
      {/* Lightbulb - highlighted in yellow */}
      <circle cx="200" cy="60" r="20" fill={highlightColor} stroke={color} strokeWidth="2" />
      <rect x="195" y="80" width="10" height="8" rx="2" />
      {/* Radiating lines */}
      <line x1="180" y1="50" x2="165" y2="40" strokeWidth="1.5" />
      <line x1="220" y1="50" x2="235" y2="40" strokeWidth="1.5" />
      <line x1="185" y1="65" x2="175" y2="75" strokeWidth="1.5" />
      <line x1="215" y1="65" x2="225" y2="75" strokeWidth="1.5" />
      
      {/* Laptop on desk */}
      <rect x="140" y="240" width="120" height="80" rx="4" />
      <rect x="150" y="250" width="100" height="60" rx="2" fill={color} />
      {/* Logo on screen */}
      <text x="200" y="285" textAnchor="middle" fontSize="24" fill="white" fontFamily="Arial">T</text>
      {/* Keyboard */}
      <rect x="145" y="325" width="110" height="8" rx="2" />
      <line x1="155" y1="325" x2="155" y2="333" />
      <line x1="175" y1="325" x2="175" y2="333" />
      <line x1="195" y1="325" x2="195" y2="333" />
      <line x1="215" y1="325" x2="215" y2="333" />
      <line x1="235" y1="325" x2="235" y2="333" />
      <line x1="255" y1="325" x2="255" y2="333" />
      
      {/* Notebook */}
      <rect x="100" y="250" width="30" height="40" rx="2" />
      <line x1="105" y1="255" x2="125" y2="255" />
      <line x1="105" y1="262" x2="120" y2="262" />
      <line x1="105" y1="269" x2="125" y2="269" />
      <line x1="105" y1="276" x2="118" y2="276" />
      {/* Pen */}
      <line x1="135" y1="255" x2="140" y2="270" strokeLinecap="round" strokeWidth="2" />
      <path d="M 140 270 L 138 273 L 142 273 Z" fill={color} />
      
      {/* Thought bubble */}
      <circle cx="280" cy="100" r="50" strokeDasharray="4,4" />
      <circle cx="300" cy="80" r="20" strokeDasharray="4,4" />
      <circle cx="315" cy="60" r="12" strokeDasharray="4,4" />
      {/* Content in thought bubble */}
      <circle cx="280" cy="100" r="8" fill="none" />
      <rect x="275" y="110" width="20" height="15" rx="2" />
      <line x1="278" y1="115" x2="290" y2="115" />
      <line x1="278" y1="120" x2="288" y2="120" />
      
      {/* Small creature */}
      <circle cx="120" cy="180" r="15" />
      <circle cx="115" cy="177" r="2" fill={color} />
      <circle cx="125" cy="177" r="2" fill={color} />
      <path d="M 115 182 Q 120 185 125 182" strokeLinecap="round" />
      {/* Hood */}
      <path d="M 110 172 Q 120 168 130 172" />
      
      {/* Bird with net */}
      <circle cx="300" cy="200" r="8" />
      <path d="M 300 192 L 300 185" strokeLinecap="round" />
      <path d="M 295 195 L 305 195" strokeLinecap="round" />
      <line x1="310" y1="200" x2="325" y2="190" strokeLinecap="round" />
      <path d="M 320 185 L 330 185 L 328 195 L 322 195 Z" />
      
      {/* Stars */}
      <path d="M 100 140 L 102 147 L 109 147 L 103 151 L 105 158 L 100 154 L 95 158 L 97 151 L 91 147 L 98 147 Z" />
      <path d="M 320 250 L 321 253 L 324 253 L 321.5 255 L 322 258 L 320 256 L 318 258 L 318.5 255 L 316 253 L 319 253 Z" />
    </svg>
  );
}

// 浏览器插件场景
export function BrowserExtension({ 
  className = '', 
  size = 300, 
  color = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Browser window */}
      <rect x="20" y="40" width="260" height="200" rx="4" />
      {/* Address bar */}
      <rect x="30" y="50" width="200" height="25" rx="2" />
      <circle cx="235" cy="62.5" r="8" />
      <line x1="245" y1="62.5" x2="265" y2="62.5" strokeLinecap="round" />
      {/* Tabs */}
      <rect x="30" y="80" width="60" height="20" rx="2 2 0 0" />
      <rect x="95" y="80" width="60" height="20" rx="2 2 0 0" />
      {/* Content */}
      <rect x="40" y="110" width="220" height="15" rx="2" />
      <rect x="40" y="135" width="180" height="15" rx="2" />
      <rect x="40" y="160" width="200" height="15" rx="2" />
      
      {/* Extension icon/button */}
      <circle cx="250" cy="150" r="20" fill={color} opacity="0.1" />
      <circle cx="250" cy="150" r="20" stroke={color} />
      <path d="M 240 145 L 245 150 L 240 155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 255 145 L 260 150 L 255 155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// 移动应用场景
export function MobileApp({ 
  className = '', 
  size = 300, 
  color = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Phone outline */}
      <rect x="100" y="40" width="100" height="200" rx="12" />
      {/* Screen */}
      <rect x="110" y="60" width="80" height="160" rx="4" />
      {/* Content on screen */}
      <circle cx="150" cy="100" r="20" />
      <rect x="120" y="130" width="60" height="8" rx="2" />
      <rect x="125" y="145" width="50" height="8" rx="2" />
      {/* App icons */}
      <rect x="120" y="170" width="25" height="25" rx="4" />
      <rect x="155" y="170" width="25" height="25" rx="4" />
      <rect x="120" y="205" width="25" height="25" rx="4" />
      <rect x="155" y="205" width="25" height="25" rx="4" />
      {/* Home indicator */}
      <rect x="135" y="235" width="30" height="4" rx="2" fill={color} />
    </svg>
  );
}

// 路线规划场景
export function RoutePlanning({ 
  className = '', 
  size = 400, 
  color = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      stroke={color}
      strokeWidth="2"
      className={className}
    >
      {/* Map background */}
      <rect x="20" y="20" width="360" height="360" rx="8" fill="#f5f5f5" />
      
      {/* Route path */}
      <path
        d="M 80 100 Q 150 80 220 120 Q 290 160 320 240"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="8,4"
      />
      
      {/* Points along route */}
      <circle cx="80" cy="100" r="8" fill={color} />
      <circle cx="150" cy="80" r="6" fill={color} />
      <circle cx="220" cy="120" r="6" fill={color} />
      <circle cx="290" cy="160" r="6" fill={color} />
      <circle cx="320" cy="240" r="8" fill={color} />
      
      {/* Labels */}
      <text x="80" y="85" textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">A</text>
      <text x="320" y="225" textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">B</text>
      
      {/* Compass */}
      <circle cx="340" cy="60" r="30" />
      <text x="340" y="50" textAnchor="middle" fontSize="14" fill={color} fontWeight="bold">N</text>
      <line x1="340" y1="60" x2="340" y2="30" strokeLinecap="round" />
      <circle cx="340" cy="60" r="4" fill={color} />
    </svg>
  );
}

