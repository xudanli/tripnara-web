interface IllustrationProps {
  className?: string;
  size?: number;
  color?: string;
  highlightColor?: string;
}

/**
 * Nara 智能体插画 - 专业、克制的智能助手形象
 * 设计原则：黑白线稿 + 酒红点睛，保持理性专业，不卡通
 * 符合 TripNARA "决策感"和"可靠感"的设计原则
 */
export function NaraAgentIcon({ 
  className = '', 
  size = 24, 
  color = 'currentColor',
  highlightColor = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 核心 - 圆形，代表智能核心 */}
      <circle cx="60" cy="60" r="25" />
      
      {/* 内部结构 - 代表决策系统 */}
      <circle cx="60" cy="60" r="15" strokeWidth="1.5" opacity="0.5" />
      
      {/* 中心点 - 代表决策中心 */}
      <circle cx="60" cy="60" r="4" fill={highlightColor} />
      
      {/* 连接节点 - 代表智能连接 */}
      <circle cx="60" cy="40" r="3" fill={color} opacity="0.6" />
      <circle cx="60" cy="80" r="3" fill={color} opacity="0.6" />
      <circle cx="40" cy="60" r="3" fill={color} opacity="0.6" />
      <circle cx="80" cy="60" r="3" fill={color} opacity="0.6" />
      
      {/* 连接线 - 代表智能网络 */}
      <line x1="60" y1="40" x2="60" y2="56" strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="64" x2="60" y2="80" strokeWidth="1.5" opacity="0.4" />
      <line x1="40" y1="60" x2="56" y2="60" strokeWidth="1.5" opacity="0.4" />
      <line x1="64" y1="60" x2="80" y2="60" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

/**
 * Nara 智能体插画 - 思考状态（带动态效果）
 * 设计原则：专业、克制，通过脉冲效果表达"处理中"状态
 */
export function NaraAgentThinking({ 
  className = '', 
  size = 24, 
  color = 'currentColor',
  highlightColor = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 核心 - 圆形，代表智能核心 */}
      <circle cx="60" cy="60" r="25" />
      
      {/* 内部结构 - 代表决策系统 */}
      <circle cx="60" cy="60" r="15" strokeWidth="1.5" opacity="0.5" />
      
      {/* 中心点 - 脉冲效果（通过 CSS 动画实现） */}
      <circle cx="60" cy="60" r="8" fill={highlightColor} opacity="0.1" className="animate-ping" />
      <circle cx="60" cy="60" r="6" fill={highlightColor} opacity="0.2" />
      <circle cx="60" cy="60" r="4" fill={highlightColor} />
      
      {/* 处理节点 - 代表正在处理 */}
      <circle cx="60" cy="40" r="3" fill={color} opacity="0.6" className="animate-pulse" />
      <circle cx="60" cy="80" r="3" fill={color} opacity="0.6" className="animate-pulse" />
      <circle cx="40" cy="60" r="3" fill={color} opacity="0.6" className="animate-pulse" />
      <circle cx="80" cy="60" r="3" fill={color} opacity="0.6" className="animate-pulse" />
      
      {/* 连接线 - 代表智能网络 */}
      <line x1="60" y1="40" x2="60" y2="56" strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="64" x2="60" y2="80" strokeWidth="1.5" opacity="0.4" />
      <line x1="40" y1="60" x2="56" y2="60" strokeWidth="1.5" opacity="0.4" />
      <line x1="64" y1="60" x2="80" y2="60" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

/**
 * Nara 智能体插画 - 对话状态
 * 设计原则：专业、可靠，通过对话气泡表达"正在交流"状态
 */
export function NaraAgentChatting({ 
  className = '', 
  size = 24, 
  color = 'currentColor',
  highlightColor = 'currentColor'
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 核心 - 圆形，代表智能核心 */}
      <circle cx="60" cy="60" r="25" />
      
      {/* 内部结构 - 代表决策系统 */}
      <circle cx="60" cy="60" r="15" strokeWidth="1.5" opacity="0.5" />
      
      {/* 中心点 - 代表决策中心 */}
      <circle cx="60" cy="60" r="4" fill={highlightColor} />
      
      {/* 连接节点 - 代表智能连接 */}
      <circle cx="60" cy="40" r="3" fill={color} opacity="0.6" />
      <circle cx="60" cy="80" r="3" fill={color} opacity="0.6" />
      <circle cx="40" cy="60" r="3" fill={color} opacity="0.6" />
      <circle cx="80" cy="60" r="3" fill={color} opacity="0.6" />
      
      {/* 连接线 - 代表智能网络 */}
      <line x1="60" y1="40" x2="60" y2="56" strokeWidth="1.5" opacity="0.4" />
      <line x1="60" y1="64" x2="60" y2="80" strokeWidth="1.5" opacity="0.4" />
      <line x1="40" y1="60" x2="56" y2="60" strokeWidth="1.5" opacity="0.4" />
      <line x1="64" y1="60" x2="80" y2="60" strokeWidth="1.5" opacity="0.4" />
      
      {/* 对话气泡 - 代表正在交流 */}
      <path 
        d="M 25 30 Q 15 25 10 30 Q 15 35 25 30" 
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path 
        d="M 95 30 Q 105 25 110 30 Q 105 35 95 30" 
        strokeWidth="1.5"
        opacity="0.3"
      />
    </svg>
  );
}
